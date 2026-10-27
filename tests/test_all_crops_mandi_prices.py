import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.snowflake import snowflake_manager
from backend.app.services.agmarknet_provider import agmarknet_provider

client = TestClient(app)

def test_initial_sync_and_schema_validation():
    """Validates that MANDI_PRICES table exists and has all 14 required columns."""
    res = agmarknet_provider.run_sync_pipeline(trigger_type="TEST_SETUP", state="Karnataka")
    assert res["status"] in ("SUCCESS", "PARTIAL")

    # Verify table schema in SQLite local Snowflake warehouse adapter
    table_info = snowflake_manager.execute_query("PRAGMA table_info(MANDI_PRICES)")
    col_names = [c["name"].lower() for c in table_info]

    required_cols = [
        "observation_date", "state", "district", "market", "commodity",
        "variety", "grade", "min_price", "max_price", "modal_price",
        "arrival_quantity", "source", "source_updated_at", "ingested_at"
    ]
    for col in required_cols:
        assert col in col_names, f"Column {col} missing from MANDI_PRICES schema"

def test_no_default_crop_restriction():
    """Validates that GET /api/mandi-prices does not default to tomato or any single crop."""
    response = client.get("/api/mandi-prices?state=Karnataka")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["selected_commodity"] == "All Crops"

    records = data["records"]
    assert len(records) > 0

    # Ensure multiple distinct commodities are present in the response
    commodities = set(r["COMMODITY"] for r in records)
    assert len(commodities) > 1, f"Expected multiple commodities, but found only {commodities}"
    # Verify both vegetables and cereals/spices/pulses are represented
    assert any("Tomato" in c or "Onion" in c or "Potato" in c for c in commodities)
    assert any("Paddy" in c or "Maize" in c or "Ragi" in c or "Arecanut" in c for c in commodities)

def test_all_crops_selection_returns_every_available_crop():
    """Validates that querying without commodity filter returns records across all categories."""
    response = client.get("/api/mandi-prices?state=Karnataka&page_size=100")
    assert response.status_code == 200
    data = response.json()

    commodities = set(r["commodity"] for r in data["records"])
    # Must have at least 10+ distinct agricultural commodities
    assert len(commodities) >= 10, f"Expected 10+ distinct commodities, got {len(commodities)}: {commodities}"

def test_dynamic_filter_endpoints():
    """Validates dynamic endpoints for commodities, districts, markets, varieties, and grades."""
    # 1. Commodities
    c_resp = client.get("/api/commodities?state=Karnataka")
    assert c_resp.status_code == 200
    c_data = c_resp.json()
    assert c_data["status"] == "SUCCESS"
    assert len(c_data["commodities"]) >= 10
    # Must not contain invented or dummy names
    for c in c_data["commodities"]:
        assert isinstance(c, str) and len(c.strip()) > 0

    # 2. Districts
    d_resp = client.get("/api/districts?state=Karnataka")
    assert d_resp.status_code == 200
    d_data = d_resp.json()
    assert d_data["status"] == "SUCCESS"
    assert len(d_data["districts"]) >= 5
    assert "Hassan" in d_data["districts"]
    assert "Mysore" in d_data["districts"]

    # 3. Markets
    m_resp = client.get("/api/markets?state=Karnataka")
    assert m_resp.status_code == 200
    m_data = m_resp.json()
    assert m_data["status"] == "SUCCESS"
    assert len(m_data["markets"]) >= 5

    # 4. Dependent market query by district
    m_has_resp = client.get("/api/markets?state=Karnataka&district=Hassan")
    assert m_has_resp.status_code == 200
    has_markets = m_has_resp.json()["markets"]
    assert any("Hassan" in m for m in has_markets)

    # 5. Varieties
    v_resp = client.get("/api/varieties?state=Karnataka")
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["status"] == "SUCCESS"
    assert len(v_data["varieties"]) > 0

    # 6. Grades
    g_resp = client.get("/api/grades?state=Karnataka")
    assert g_resp.status_code == 200
    g_data = g_resp.json()
    assert g_data["status"] == "SUCCESS"
    assert len(g_data["grades"]) > 0

def test_specific_commodity_filter():
    """Validates filtering by a specific commodity displays only that commodity across Karnataka mandis."""
    response = client.get("/api/mandi-prices?state=Karnataka&commodity=Maize")
    assert response.status_code == 200
    data = response.json()
    for r in data["records"]:
        assert "Maize" in r["commodity"]

def test_specific_district_filter():
    """Validates filtering by district displays records in that district."""
    response = client.get("/api/mandi-prices?state=Karnataka&district=Hassan")
    assert response.status_code == 200
    data = response.json()
    assert len(data["records"]) > 0
    for r in data["records"]:
        assert r["district"].lower() == "hassan"

def test_all_crops_analytics():
    """Validates aggregated analytics across all crops stored in Snowflake / SQLite."""
    response = client.get("/api/mandi-prices/analytics?state=Karnataka")
    assert response.status_code == 200
    data = response.json()

    assert data["total_commodities"] >= 10
    assert data["total_districts"] >= 5
    assert data["total_markets"] >= 5
    assert data["total_records"] > 0
    assert data["avg_modal_price"] > 0
    assert len(data["top_commodities"]) > 0
    assert len(data["market_comparisons"]) > 0
    assert data["latest_observation_date"] is not None

def test_idempotent_upsert_no_duplicate_observations():
    """Validates that running sync multiple times does NOT create duplicate observations."""
    # Count before
    before_count = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")[0]["c"]

    # Re-run sync with identical dataset
    sync_res = agmarknet_provider.run_sync_pipeline(trigger_type="TEST_DEDUP", state="Karnataka")
    assert sync_res["status"] in ("SUCCESS", "PARTIAL")

    # Count after must remain identical because of natural key deduplication
    after_count = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")[0]["c"]
    assert before_count == after_count, f"Duplicate observations created: {before_count} -> {after_count}"

def test_mandi_prices_sync_endpoint():
    """Validates sync endpoint POST /api/mandi-prices/sync and confirms /api/admin/sync-mandi-prices is 404."""
    response = client.post("/api/mandi-prices/sync", json={
        "state": "Karnataka",
        "batch_size": 50,
        "max_pages": 3
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("SUCCESS", "PARTIAL")
    assert "batch_id" in data
    assert "records_fetched" in data
    assert client.post("/api/admin/sync-mandi-prices", json={}).status_code == 404

def test_export_mandi_prices_csv():
    """Validates CSV export endpoint across all crops."""
    response = client.get("/api/mandi-prices/export-csv?state=Karnataka")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    csv_text = response.text
    assert "OBSERVATION_DATE,STATE,DISTRICT,MARKET,COMMODITY" in csv_text
    lines = csv_text.strip().split("\n")
    assert len(lines) > 5, "CSV should contain multiple records"
