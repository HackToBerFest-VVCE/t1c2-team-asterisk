import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_and_update_profile():
    """Verify profile retrieval and persistence."""
    res_get = client.get("/api/user/profile")
    assert res_get.status_code == 200
    data = res_get.json()["data"]
    assert "full_name" in data
    assert "district" in data

    update_payload = {
        "full_name": "Chethan Patel",
        "email": "chethan.p@farmer.ai",
        "phone": "+91 98450 99999",
        "preferred_language": "en",
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Belur Hobli"
    }
    res_put = client.put("/api/user/profile", json=update_payload)
    assert res_put.status_code == 200
    updated = res_put.json()["data"]
    assert updated["full_name"] == "Chethan Patel"
    assert updated["village_or_town"] == "Belur Hobli"
    assert updated["avatar_initials"] == "CP"

def test_get_and_update_preferences():
    """Verify appearance, accessibility, and application default preferences persistence."""
    res_get = client.get("/api/user/preferences")
    assert res_get.status_code == 200
    prefs = res_get.json()["data"]
    assert "theme" in prefs
    assert "accent_color" in prefs

    update_payload = {
        "theme": "dark",
        "accent_color": "#059669",
        "dashboard_density": "compact",
        "reduced_motion": True,
        "font_size": "large",
        "high_contrast": True,
        "default_crop_id": "CROP_ONION",
        "default_mandi_id": "MND_CRPATNA",
        "default_quantity": 75.0,
        "default_quantity_unit": "quintals",
        "default_chart_range": "6months",
        "max_recommendation_distance_km": 200.0,
        "analytics_consent": True
    }
    res_put = client.put("/api/user/preferences", json=update_payload)
    assert res_put.status_code == 200
    updated = res_put.json()["data"]
    assert updated["theme"] == "dark"
    assert updated["accent_color"] == "#059669"
    assert updated["dashboard_density"] == "compact"
    assert updated["reduced_motion"] == 1
    assert updated["default_crop_id"] == "CROP_ONION"

def test_get_and_update_notifications():
    """Verify notification toggles and delivery channel configuration."""
    res_get = client.get("/api/user/notifications")
    assert res_get.status_code == 200
    assert "service_status" in res_get.json()

    update_payload = {
        "price_rise_alerts": True,
        "price_fall_alerts": True,
        "selected_crop_alerts": False,
        "favorite_mandi_updates": True,
        "data_refresh_alerts": True,
        "weekly_market_summary": True,
        "alert_threshold_pct": 7.5,
        "preferred_delivery_channel": "in_app",
        "quiet_hours_start": "23:00",
        "quiet_hours_end": "05:00"
    }
    res_put = client.put("/api/user/notifications", json=update_payload)
    assert res_put.status_code == 200
    updated = res_put.json()["data"]
    assert updated["alert_threshold_pct"] == 7.5
    assert updated["data_refresh_alerts"] == 1

def test_active_sessions_and_termination():
    """Verify device sessions inspection and termination of other devices."""
    res = client.get("/api/user/sessions")
    assert res.status_code == 200
    data = res.json()
    assert "sessions" in data
    assert data["total_active"] >= 1

    term_res = client.post("/api/user/sessions/terminate-others")
    assert term_res.status_code == 200
    assert "terminated_count" in term_res.json()

def test_feedback_submission():
    """Verify real user feedback submission endpoint."""
    payload = {
        "category": "calculator",
        "subject": "Transportation rates to Hassan APMC",
        "message": "Freight rate of 0.85/km/q matches local mini-truck quotes in Hassan district accurately.",
        "contact_email": "farmer.test@example.com"
    }
    res = client.post("/api/user/feedback", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RECEIVED"
    assert "feedback_id" in data

def test_system_about_and_telemetry():
    """Verify live system about report and real Snowflake health check."""
    res = client.get("/api/user/system-about")
    assert res.status_code == 200
    data = res.json()
    assert data["project_name"] == "FARMPRICE AI"
    assert "tech_stack" in data
    assert "data_sources" in data
    assert "system_health" in data
    assert data["system_health"]["warehouse_status"] == "healthy"
