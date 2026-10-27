import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_daily_prices_basic():
    """Verify daily prices endpoint returns valid records with verified AGMARKNET schema."""
    response = client.get("/api/daily-prices")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert "total_records" in data
    assert "freshness_timestamp" in data
    assert data["total_records"] > 0
    
    first = data["records"][0]
    assert "crop_name" in first
    assert "mandi_name" in first
    assert "modal_price_per_q" in first
    assert "price_unit" in first
    assert first["price_unit"] == "₹ / Quintal"
    assert "observation_date" in first
    assert "data_quality_status" in first

def test_daily_prices_filters():
    """Verify filter by crop and district."""
    response = client.get("/api/daily-prices?crop_id=CROP_TOMATO&district=Hassan")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] > 0
    for r in data["records"]:
        assert r["crop_name"] == "Tomato"
        assert r["district"] == "Hassan"

def test_daily_prices_search_autocomplete():
    """Verify free-text search across commodity and mandi names."""
    response = client.get("/api/daily-prices?search_query=Hassan")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] > 0
    assert any("Hassan" in r["mandi_name"] for r in data["records"])

def test_daily_prices_csv_export():
    """Verify CSV export contains appropriate headers and mime type."""
    response = client.get("/api/daily-prices/export-csv?crop_id=CROP_TOMATO")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.content.decode("utf-8")
    assert "Date,Mandi Name,District,State,Commodity,Variety" in content
    assert "Tomato" in content
