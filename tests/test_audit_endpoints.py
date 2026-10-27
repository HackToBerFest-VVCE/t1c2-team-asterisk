"""
Comprehensive Functional Audit Test Suite for FARMPRICE AI
Validates real database and service integration across every module.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_audit_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "snowflake" in data
    assert data["snowflake"]["status"] == "healthy"

def test_audit_crops_endpoints():
    res = client.get("/api/crops")
    assert res.status_code == 200
    crops = res.json()
    assert len(crops) >= 6
    crop_id = crops[0]["crop_id"]
    
    # Variety endpoint
    res_v = client.get(f"/api/crops/{crop_id}/varieties")
    assert res_v.status_code == 200

def test_audit_mandis_endpoint():
    res = client.get("/api/mandis")
    assert res.status_code == 200
    mandis = res.json()
    assert len(mandis) >= 8

def test_audit_daily_prices():
    res = client.get("/api/daily-prices")
    assert res.status_code == 200
    data = res.json()
    assert "records" in data
    assert "total_records" in data
    assert data["total_records"] > 0

    # Filtered test
    res_f = client.get("/api/daily-prices?state=Karnataka&district=Hassan")
    assert res_f.status_code == 200
    data_f = res_f.json()
    assert len(data_f["records"]) > 0

def test_audit_market_comparison():
    payload = {
        "crop_id": "CROP_TOMATO",
        "quantity": 50.0,
        "unit": "quintals",
        "origin_latitude": 13.0033,
        "origin_longitude": 76.1004,
        "selling_date": "2026-10-24"
    }
    res = client.post("/api/market-comparison", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "mandis" in data
    assert "best_mandi_name" in data
    assert len(data["mandis"]) > 0

def test_audit_net_return_calculator():
    payload = {
        "crop_id": "CROP_TOMATO",
        "quantity": 50.0,
        "unit": "quintals",
        "applicable_price_per_q": 2100.0,
        "distance_km": 25.0,
        "transport_rate_per_km_per_q": 0.85,
        "loading_unloading_per_q": 8.0,
        "market_cess_percent": 1.5
    }
    res = client.post("/api/calculate-net-return", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "gross_sale_value" in data
    assert "costs" in data
    assert "estimated_net_return" in data
    assert data["estimated_net_return"] > 0

def test_audit_market_trends():
    res = client.get("/api/market-trends?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN")
    assert res.status_code == 200
    data = res.json()
    assert "trend_signal" in data
    assert "chart_data" in data
    assert len(data["chart_data"]) > 0

def test_audit_trend_signal_detection():
    res = client.get("/api/market-trends/detect-trend?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN")
    assert res.status_code == 200
    data = res.json()
    assert "classification" in data
    assert data["classification"] in ["RISING", "FALLING", "STABLE"]

def test_audit_forecasting():
    payload = {
        "crop_id": "CROP_TOMATO",
        "mandi_id": "MND_HASSAN",
        "horizon_days": 14
    }
    res = client.post("/api/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "forecast_points" in data
    assert "metrics" in data
    assert len(data["forecast_points"]) == 14

def test_audit_weather_endpoints():
    # Current weather
    res_w = client.get("/api/weather/current?latitude=13.0033&longitude=76.1004&location_name=Hassan")
    assert res_w.status_code == 200
    data_w = res_w.json()
    assert "current" in data_w
    assert "daily" in data_w

    # Forecast
    res_f = client.get("/api/weather/forecast?latitude=13.0033&longitude=76.1004")
    assert res_f.status_code == 200
    data_f = res_f.json()
    assert "daily" in data_f

    # Weather impact
    res_wi = client.get("/api/weather/impact?district=Hassan")
    assert res_wi.status_code == 200

    # Geocoding reverse
    res_r = client.get("/api/weather/reverse-geocode?latitude=13.0033&longitude=76.1004")
    assert res_r.status_code == 200
    assert "district" in res_r.json()

    # Location search
    res_s = client.get("/api/weather/location-search?q=Hassan")
    assert res_s.status_code == 200
    assert len(res_s.json()) > 0

def test_audit_crop_recommendations():
    # General recommendations
    res = client.get("/api/recommendations?district=Hassan")
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    top = data["recommendations"][0]
    assert "crop_name" in top
    assert "composite_rank_score" in top
    assert "profit_data" in top

    # Category filtered
    res_cat = client.get("/api/recommendations?district=Hassan&category=Vegetables")
    assert res_cat.status_code == 200
    data_cat = res_cat.json()
    assert len(data_cat["recommendations"]) > 0
    for r in data_cat["recommendations"]:
        assert r["category"].lower() == "vegetables"

def test_audit_mandi_prices():
    res = client.get("/api/mandi-prices?state=Karnataka")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert "total_records" in data
    assert data["total_records"] > 0
    assert len(data["records"]) > 0

def test_audit_location_resolver():
    res = client.get("/api/location/resolve?query=Hassan")
    assert res.status_code == 200
    assert "latitude" in res.json()

def test_audit_auth_and_user():
    # Public login
    res_t = client.post("/api/auth/public-login", json={"name": "Chethan P", "phone": "9876543210", "district": "Hassan"})
    assert res_t.status_code == 200
    token = res_t.json()["token"]

    # Profile fetch
    headers = {"Authorization": f"Bearer {token}"}
    res_p = client.get("/api/user/profile?user_id=usr_chethan", headers=headers)
    assert res_p.status_code == 200
    assert res_p.json()["data"]["user_id"] == "usr_chethan"

def test_removed_features_endpoints_return_404():
    """Verify that removed marketplace, procurement, and admin endpoints return 404 Not Found."""
    assert client.get("/api/marketplace/farmer/listings").status_code == 404
    assert client.get("/api/marketplace/yards").status_code == 404
    assert client.get("/api/admin/metrics").status_code == 404
    assert client.get("/api/admin/sync-status").status_code == 404
