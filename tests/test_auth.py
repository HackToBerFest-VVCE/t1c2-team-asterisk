import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_public_farmer_login():
    """Verify Public Farmer Login returns public role, user profile, and session token."""
    payload = {
        "name": "Ramesh Gowda",
        "phone": "9845012345",
        "district": "Mandya",
        "is_guest": False
    }
    response = client.post("/api/auth/public-login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["role"] == "public"
    assert data["name"] == "Ramesh Gowda"
    assert data["district"] == "Mandya"
    assert "token" in data
    assert data["token"].startswith("pub_")

def test_public_guest_login():
    """Verify 1-Click Guest Farmer Login."""
    payload = {"is_guest": True}
    response = client.post("/api/auth/public-login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["role"] == "public"
    assert data["name"] == "Guest Farmer"

def test_auth_me_session_validation():
    """Verify /api/auth/me validates public farmer token accurately."""
    # 1. Unauthenticated
    res_anon = client.get("/api/auth/me")
    assert res_anon.status_code == 200
    assert res_anon.json()["is_authenticated"] is False

    # 2. Farmer authenticated
    res_login = client.post("/api/auth/public-login", json={"name": "Chethan P", "phone": "9876543210", "district": "Hassan"})
    token = res_login.json()["token"]

    res_auth = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert data["is_authenticated"] is True
    assert data["role"] == "public"

def test_removed_auth_routes_return_404():
    """Verify that obsolete admin and yard login endpoints return 404."""
    assert client.post("/api/auth/admin-login", json={"username": "admin", "password": "123"}).status_code == 404
    assert client.post("/api/auth/yard-login", json={"username": "yard", "password": "123"}).status_code == 404
