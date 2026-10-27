import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "snowflake" in data
    assert data["snowflake"]["status"] == "healthy"

def test_crops_list():
    response = client.get("/api/crops")
    assert response.status_code == 200
    crops = response.json()
    assert len(crops) >= 5
    assert any(c["crop_name"] == "Tomato" for c in crops)

def test_mandis_list():
    response = client.get("/api/mandis")
    assert response.status_code == 200
    mandis = response.json()
    assert len(mandis) >= 6
    assert any("Hassan" in m["mandi_name"] for m in mandis)

def test_market_comparison_api():
    payload = {
        "crop_id": "CROP_TOMATO",
        "variety_id": "VAR_TOM_HYBRID",
        "quantity": 50.0,
        "unit": "quintals",
        "origin_name": "Hassan, Karnataka"
    }
    response = client.post("/api/market-comparison", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_eligible_mandis"] >= 3
    assert len(data["mandis"]) >= 3
    assert data["mandis"][0]["rank"] == 1

def test_net_return_calculator_api():
    payload = {
        "crop_id": "CROP_TOMATO",
        "quantity": 50.0,
        "unit": "quintals",
        "applicable_price_per_q": 2100.0,
        "manual_transport_cost": 1200.0,
        "manual_loading_cost": 400.0,
        "manual_market_fees": 300.0,
        "other_expenses": 200.0
    }
    response = client.post("/api/calculate-net-return", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["gross_sale_value"] == 105000.0
    assert data["costs"]["total_expenses"] == 2100.0
    assert data["estimated_net_return"] == 102900.0

def test_forecast_api():
    payload = {
        "crop_id": "CROP_TOMATO",
        "mandi_id": "MND_HASSAN",
        "horizon_days": 7
    }
    response = client.post("/api/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert len(data["forecast_points"]) == 7

def test_csv_export_api():
    payload = {
        "crop_id": "CROP_TOMATO",
        "quantity": 50.0,
        "unit": "quintals"
    }
    response = client.post("/api/reports/export-csv", json=payload)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert b"FARMPRICE AI" in response.content

def test_pdf_export_api():
    payload = {
        "crop_id": "CROP_TOMATO",
        "quantity": 50.0,
        "unit": "quintals"
    }
    response = client.post("/api/reports/export-pdf", json=payload)
    assert response.status_code == 200
    assert "application/pdf" in response.headers["content-type"]
    assert response.content.startswith(b"%PDF")
