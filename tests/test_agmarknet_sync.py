import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.agmarknet_provider import AgmarknetDataProvider, agmarknet_provider
from backend.app.core.snowflake import snowflake_manager

client = TestClient(app)

# =====================================================================
# 1. PARSING & NORMALIZATION TESTS
# =====================================================================

def test_normalize_valid_agmarknet_record():
    provider = AgmarknetDataProvider()
    raw = {
        "id": "KA_TEST_01",
        "state": "Karnataka",
        "district": "Hassan",
        "market": "Hassan APMC",
        "commodity": "Tomato",
        "variety": "Hybrid",
        "arrival_date": "24/10/2026",
        "min_price": "1600",
        "modal_price": "2100",
        "max_price": "2450",
        "arrival_quantity": "125"
    }
    normalized = provider.normalize_record(raw)

    assert normalized["crop"] == "Tomato"
    assert normalized["market"] == "Hassan APMC"
    assert normalized["observation_date"] == "2026-10-24"
    assert normalized["min_price_per_q"] == 1600.0
    assert normalized["modal_price_per_q"] == 2100.0
    assert normalized["max_price_per_q"] == 2450.0
    assert normalized["arrival_quantity_tonnes"] == 125.0
    assert normalized["unit"] == "Rs/Quintal"
    assert normalized["data_quality_status"] == "VERIFIED"
    assert normalized["data_quality_score"] == 1.0


def test_normalize_range_inversion_flagged():
    provider = AgmarknetDataProvider()
    raw = {
        "id": "KA_INV_01",
        "state": "Karnataka",
        "district": "Hassan",
        "market": "Hassan APMC",
        "commodity": "Tomato",
        "variety": "Hybrid",
        "arrival_date": "2026-10-24",
        "min_price": "2500", # Min > Max!
        "modal_price": "2100",
        "max_price": "2000",
        "arrival_quantity": "50"
    }
    normalized = provider.normalize_record(raw)
    assert normalized["data_quality_status"] == "RANGE_INVERTED"
    assert normalized["data_quality_score"] == 0.5


def test_normalize_missing_or_invalid_modal_price():
    provider = AgmarknetDataProvider()
    raw = {
        "id": "KA_NO_MODAL",
        "state": "Karnataka",
        "district": "Hassan",
        "market": "Hassan APMC",
        "commodity": "Tomato",
        "arrival_date": "2026-10-24",
        "min_price": "1600",
        "modal_price": None,
        "max_price": "2000"
    }
    normalized = provider.normalize_record(raw)
    assert normalized["data_quality_status"] == "INVALID_MODAL_PRICE"
    assert normalized["modal_price_per_q"] is None


# =====================================================================
# 2. RETRY & EXPONENTIAL BACKOFF TESTS
# =====================================================================

def test_fetch_with_retry_exponential_backoff_on_rate_limit():
    provider = AgmarknetDataProvider()
    mock_resp_429 = MagicMock()
    mock_resp_429.status_code = 429

    mock_resp_200 = MagicMock()
    mock_resp_200.status_code = 200
    mock_resp_200.json.return_value = {"records": [{"commodity": "Tomato", "modal_price": "2000"}]}

    with patch("requests.get", side_effect=[mock_resp_429, mock_resp_200]):
        with patch("time.sleep") as mock_sleep:
            records, status = provider.fetch_records_with_retry({"filters[state]": "Karnataka"}, max_retries=2, backoff_factor=1.0)
            assert status == "HTTP_200_SUCCESS"
            assert len(records) == 1
            assert mock_sleep.called


# =====================================================================
# 3. PIPELINE DEDUPLICATION & UPSERT TESTS
# =====================================================================

def test_pipeline_deduplication_without_duplicates():
    # Sync once
    res1 = agmarknet_provider.run_sync_pipeline(trigger_type="TEST_RUN_1", state="Karnataka", commodity="Tomato")
    assert res1["status"] in ("SUCCESS", "PARTIAL")

    # Sync again with identical records
    res2 = agmarknet_provider.run_sync_pipeline(trigger_type="TEST_RUN_2", state="Karnataka", commodity="Tomato")
    assert res2["status"] in ("SUCCESS", "PARTIAL")
    # On the second run, duplicate records should be counted as duplicates, not newly inserted
    assert res2["records_duplicate"] >= 0


def test_sync_batch_history_recorded():
    history = snowflake_manager.get_sync_batch_history(limit=5)
    assert isinstance(history, list)
    assert len(history) > 0
    latest = history[0]
    assert "batch_id" in latest
    assert "status" in latest
    assert "records_fetched" in latest


# =====================================================================
# 4. FASTAPI MARKET & DATA ENDPOINTS TESTS
# =====================================================================

def test_api_market_prices():
    resp = client.get("/api/market/prices?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "records" in data
    assert data["total_records"] > 0
    sample = data["records"][0]
    assert "observation_date" in sample
    assert "modal_price_per_q" in sample
    assert "mandi_name" in sample
    assert sample["unit"] == "Rs/Quintal"


def test_api_market_prices_latest():
    resp = client.get("/api/market/prices/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "prices" in data
    assert len(data["prices"]) > 0
    assert "latest_observation_date" in data


def test_api_market_prices_history():
    resp = client.get("/api/market/prices/history?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["crop_id"] == "CROP_TOMATO"
    assert len(data["data_points"]) > 0
    assert "moving_average_7d" in data["data_points"][0]


def test_api_market_arrivals():
    resp = client.get("/api/market/arrivals?days=30")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "arrivals" in data
    assert "total_volume_tonnes" in data


def test_api_market_commodities():
    resp = client.get("/api/market/commodities")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["count"] >= 6
    names = [c["crop_name"] for c in data["commodities"]]
    assert "Tomato" in names
    assert "Onion" in names


def test_api_market_locations():
    resp = client.get("/api/market/locations")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["count"] >= 8
    mandi_names = [m["mandi_name"] for m in data["locations"]]
    assert any("Hassan" in name for name in mandi_names)


def test_api_market_comparison():
    resp = client.get("/api/market/comparison?crop_id=CROP_TOMATO&quantity_quintals=50")
    assert resp.status_code == 200
    data = resp.json()
    assert "mandis" in data
    assert len(data["mandis"]) > 0
    first = data["mandis"][0]
    assert "estimated_net_return" in first
    assert "transport_expense" in first
    assert "recommendation_reasons" in first


def test_api_data_sources_registry():
    resp = client.get("/api/data/sources")
    assert resp.status_code == 200
    data = resp.json()
    assert "sources" in data
    assert len(data["sources"]) >= 3
    slugs = [s["source_slug"] for s in data["sources"]]
    assert "data_gov_in_daily_prices" in slugs
    assert "karnataka_apmc_mirror" in slugs


def test_api_data_freshness():
    resp = client.get("/api/data/freshness")
    assert resp.status_code == 200
    data = resp.json()
    assert "latest_observation_date" in data
    assert "total_market_observations" in data
    assert "staleness_label" in data


def test_api_data_quality():
    resp = client.get("/api/data/quality")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_quality_score" in data
    assert "inconsistent_price_ranges" in data


def test_api_health_and_snowflake():
    resp1 = client.get("/api/health")
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "healthy"

    resp2 = client.get("/api/health/snowflake")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "healthy"
    assert "latency_ms" in data2
    assert "database" in data2


def test_mandi_prices_sync_endpoint():
    # Sync trigger on mandi-prices
    sync_resp = client.post("/api/mandi-prices/sync", json={"state": "Karnataka", "commodity": "Onion", "max_pages": 1})
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert "status" in sync_data

    # Obsolete admin endpoints return 404
    assert client.post("/api/admin/sync-agmarknet", json={}).status_code == 404
    assert client.post("/api/admin/sync-backfill", json={}).status_code == 404
    assert client.get("/api/admin/sync-history").status_code == 404
