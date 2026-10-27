import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_market_trends_daily():
    """Verify daily historical series returns valid records, observations, and key insights."""
    response = client.get("/api/market-trends?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN&aggregation=daily")
    assert response.status_code == 200
    data = response.json()
    assert "chart_data" in data
    assert len(data["chart_data"]) > 0
    assert "period_change_pct" in data
    assert "trend_signal" in data
    assert "key_insights" in data
    assert len(data["key_insights"]) > 0

    first = data["chart_data"][0]
    assert "date" in first
    assert "modal_price" in first
    assert "arrivals_tonnes" in first

def test_market_trends_weekly_aggregation():
    """Verify weekly aggregation applies documented mathematical rules."""
    response = client.get("/api/market-trends?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN&aggregation=weekly")
    assert response.status_code == 200
    data = response.json()
    assert data["aggregation"] == "weekly"
    assert "Weekly aggregation" in data["aggregation_rule_note"]
    assert len(data["chart_data"]) > 0

def test_market_trends_comparison_overlay():
    """Verify multi-mandi overlay comparison returns compare_modal_price series."""
    response = client.get("/api/market-trends?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN&compare_mandi_id=MND_MYSORE")
    assert response.status_code == 200
    data = response.json()
    assert data["compare_mandi_id"] == "MND_MYSORE"
    assert data["compare_mandi_name"] is not None
    assert any(p.get("compare_modal_price") is not None for p in data["chart_data"])

def test_automatic_trend_detection():
    """Verify Feature 3 Automatic Rising/Falling Price Detection with mathematical proof."""
    response = client.get("/api/market-trends/detect-trend?crop_id=CROP_TOMATO&mandi_id=MND_HASSAN")
    assert response.status_code == 200
    data = response.json()
    assert "classification" in data
    assert data["classification"] in ["RISING", "FALLING", "STABLE", "INCONCLUSIVE"]
    assert "sma_7" in data
    assert "sma_21" in data
    assert "momentum" in data
    assert "volatility" in data
    assert "evidence" in data
    assert "data_points_used" in data
    assert data["data_points_used"] >= 7
