"""
Integration tests for FARMPRICE AI live Snowflake integration.
Verifies real connection, table discovery, queries against REALDATA1, REALDATA2, REALDATA3,
and security constraints (no credential leakage).
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.snowflake import snowflake_manager
from backend.app.core.config import settings

client = TestClient(app)

def test_snowflake_live_connection():
    """Verify live Snowflake connection is active and healthy."""
    health = snowflake_manager.check_connection()
    assert health["status"] == "healthy"
    assert health["mode"] == "SNOWFLAKE_LIVE"
    assert health["database"] == "FARMPRICE_DB"
    assert health["schema"] == "AGRICULTURE"
    assert health["warehouse"] == "FARMPRICE_WH"
    assert health["role"] == "ACCOUNTADMIN"

def test_snowflake_tables_discovered():
    """Verify all 4 required tables exist and are accessible in Snowflake."""
    health = snowflake_manager.check_connection()
    tables = health["tables"]
    assert "MANDI_PRICES" in tables and tables["MANDI_PRICES"]["accessible"]
    assert "REALDATA1" in tables and tables["REALDATA1"]["accessible"]
    assert "REALDATA2" in tables and tables["REALDATA2"]["accessible"]
    assert "REALDATA3" in tables and tables["REALDATA3"]["accessible"]
    assert tables["REALDATA3"]["row_count"] >= 9000

def test_health_snowflake_endpoint():
    """GET /api/health/snowflake returns sanitized status without credentials."""
    resp = client.get("/api/health/snowflake")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["mode"] == "SNOWFLAKE_LIVE"
    assert "password" not in str(data).lower()
    assert "token" not in str(data).lower()

def test_mandi_prices_endpoint():
    """GET /api/mandi-prices returns real records from Snowflake."""
    resp = client.get("/api/mandi-prices?page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["total_records"] >= 9000
    assert len(data["records"]) == 5
    first = data["records"][0]
    assert "COMMODITY" in first or "commodity" in first
    assert "MODAL_PRICE" in first or "modal_price" in first

def test_market_data_endpoint():
    """GET /api/market-data provides dataset backed by Snowflake REALDATA3."""
    resp = client.get("/api/market-data?page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] >= 9000
    assert len(data["records"]) == 5

def test_crops_snowflake_endpoint():
    """GET /api/crops/snowflake retrieves agronomic cycle data from REALDATA2."""
    resp = client.get("/api/crops/snowflake")
    assert resp.status_code == 200
    crops = resp.json()
    assert len(crops) >= 15
    assert any("crop" in c for c in crops)

def test_states_endpoint():
    """GET /api/states returns dynamically discovered Indian states."""
    resp = client.get("/api/states")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["states"]) >= 10
    assert "Tamil Nadu" in data["states"]
    assert "Punjab" in data["states"]

def test_snowflake_explorer_inventory():
    """GET /api/snowflake/inventory returns all tables including agronomy datasets."""
    resp = client.get("/api/snowflake/inventory")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "tables" in data
    table_names = [t["name"] for t in data["tables"]]
    assert "MANDI_PRICES" in table_names
    assert "REALDATA3" in table_names
    assert "CROP_REQUIREMENTS" in table_names
    assert "CULTIVATION_COSTS" in table_names
    assert "CROP_YIELD_HISTORY" in table_names

def test_snowflake_explorer_table_data():
    """GET /api/snowflake/table-data returns paginated and schema data."""
    resp = client.get("/api/snowflake/table-data?table=CROP_REQUIREMENTS&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["table_name"] == "CROP_REQUIREMENTS"
    assert len(data["records"]) == 10
    assert data["total_records"] >= 40
    assert len(data["columns"]) >= 5


