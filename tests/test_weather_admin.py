import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_weather_impact_analysis():
    """Verify Weather Impact Analysis with harvest index, transport risk, and causation disclaimer."""
    response = client.get("/api/weather/impact?crop_name=Tomato&district=Hassan")
    assert response.status_code == 200
    data = response.json()
    assert "weather_observation" in data
    assert "harvest_condition" in data
    assert "active_alerts" in data
    assert "logistics_impacts" in data
    assert "supply_impacts" in data
    assert "causation_disclaimer" in data
    assert "weather alone caused" in data["causation_disclaimer"].lower()

def test_admin_monitoring_removed():
    """Verify that administrative monitoring endpoints are completely removed."""
    assert client.get("/api/admin/metrics").status_code == 404
    assert client.get("/api/admin/data-quality").status_code == 404
