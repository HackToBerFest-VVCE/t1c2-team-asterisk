import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_current_weather_live_or_cached():
    """
    Verify real weather data endpoint:
    - Accurate coordinates for Hassan, Karnataka (13.0033, 76.1004)
    - Valid temperature, humidity, wind, condition, and WMO codes
    - Proper provider attribution ('Open-Meteo')
    - Valid observation timestamp and freshness indicator
    """
    res = client.get("/api/weather/current?latitude=13.0033&longitude=76.1004&location_name=Hassan")
    assert res.status_code == 200
    data = res.json()
    
    assert data["provider"] == "Open-Meteo"
    assert "source" in data
    assert data["latitude"] == pytest.approx(13.0033, abs=0.01)
    assert data["longitude"] == pytest.approx(76.1004, abs=0.01)
    assert "observation_time" in data
    assert "current" in data
    
    curr = data["current"]
    assert "temperature_celsius" in curr
    assert curr["temperature_celsius"] is not None
    assert "humidity_percent" in curr
    assert 0 <= curr["humidity_percent"] <= 100
    assert "wind_kmh" in curr
    assert curr["wind_kmh"] >= 0
    assert "condition" in curr
    assert "rain_chance_percent" in curr
    assert "weather_code" in curr
    assert "severity" in curr

def test_weather_caching_and_freshness():
    """
    Verify that repeated requests hit the in-memory cache and prevent excessive external API calls.
    """
    res1 = client.get("/api/weather/current?latitude=13.0033&longitude=76.1004")
    assert res1.status_code == 200
    
    res2 = client.get("/api/weather/current?latitude=13.0033&longitude=76.1004")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2.get("is_cached") is True
    assert data2.get("cache_status") in ["FRESH", "HIT", "STALE_REVALIDATED"]

def test_forecast_daily_and_hourly():
    """
    Verify 7-day daily forecast, 24-hour timeline, and crop-specific agricultural guidance.
    """
    res = client.get("/api/weather/forecast?latitude=13.0033&longitude=76.1004&crop_name=Tomato")
    assert res.status_code == 200
    data = res.json()
    
    assert "daily" in data
    assert len(data["daily"]) >= 5  # Expect 7-day forecast
    day1 = data["daily"][0]
    assert "date" in day1
    assert "temperature_max_celsius" in day1
    assert "temperature_min_celsius" in day1
    assert "precipitation_probability_max" in day1
    assert "condition" in day1
    
    assert "hourly" in data
    assert len(data["hourly"]) >= 12  # Expect 24 hours
    hour1 = data["hourly"][0]
    assert "time" in hour1
    assert "temperature_celsius" in hour1
    
    assert "crop_advisory" in data or "agricultural_intelligence" in data
    advisory = data.get("crop_advisory") or data.get("agricultural_intelligence")
    assert "harvest_suitability" in advisory
    assert "next_24h_rain_probability" in advisory
    assert "cumulative_7d_rainfall_mm" in advisory
    assert "drying_advisory" in advisory
    assert "storage_advisory" in advisory
    assert "transport_logistics_advisory" in advisory
    assert "causation_disclaimer" in advisory
    assert "not be interpreted as proof" in advisory["causation_disclaimer"].lower()

def test_location_search_forward_geocoding():
    """
    Verify autocomplete and forward geocoding for villages, towns, and postal PIN codes.
    """
    # Search by town name
    res = client.get("/api/weather/location-search?q=Hassan")
    assert res.status_code == 200
    results = res.json()
    assert isinstance(results, list)
    assert len(results) > 0
    match = next((r for r in results if "hassan" in r["name"].lower()), None)
    assert match is not None
    assert "latitude" in match
    assert "longitude" in match
    
    # Search by Karnataka PIN code (e.g. 573201 for Hassan)
    res_pin = client.get("/api/weather/location-search?q=573201")
    assert res_pin.status_code == 200
    pin_results = res_pin.json()
    assert isinstance(pin_results, list)
    assert len(pin_results) > 0
    assert pin_results[0]["pincode"] == "573201"

def test_reverse_geocoding():
    """
    Verify coordinate resolution (browser Geolocation API coordinates) into readable address.
    """
    res = client.get("/api/weather/reverse-geocode?latitude=13.0033&longitude=76.1004")
    assert res.status_code == 200
    data = res.json()
    
    assert data["district"] == "Hassan"
    assert data["state"] == "Karnataka"
    assert "formatted_address" in data
    assert data["is_detected"] is True

def test_preferred_farm_location_lifecycle():
    """
    Verify farmer preferred location persistence (save preferred location and retrieve on subsequent visits).
    """
    payload = {
        "location_name": "Channarayapatna Farm, Hassan",
        "village_town": "Channarayapatna",
        "district": "Hassan",
        "state": "Karnataka",
        "pincode": "573116",
        "latitude": 12.9067,
        "longitude": 76.3912,
        "is_gps_detected": True
    }
    
    # Save preferred location
    put_res = client.put("/api/weather/preferred-location", json=payload)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["status"] == "SUCCESS"
    
    # Retrieve preferred location
    get_res = client.get("/api/weather/preferred-location")
    assert get_res.status_code == 200
    saved = get_res.json()
    assert saved["has_saved_location"] is True
    assert saved["location_name"] == "Channarayapatna Farm, Hassan"
    assert saved["latitude"] == pytest.approx(12.9067, abs=0.001)
    assert saved["longitude"] == pytest.approx(76.3912, abs=0.001)

def test_weather_invalid_coordinates_validation():
    """
    Verify that out-of-range coordinates are rejected with HTTP 422 Unprocessable Entity.
    """
    # Latitude > 90
    res = client.get("/api/weather/current?latitude=999.0&longitude=76.1004")
    assert res.status_code == 422
    
    # Longitude > 180
    res2 = client.get("/api/weather/current?latitude=13.0033&longitude=999.0")
    assert res2.status_code == 422

def test_legacy_weather_backwards_compatibility():
    """
    Ensure legacy `/api/weather` endpoint preserves compatibility for topbar and existing components.
    """
    res = client.get("/api/weather?latitude=13.0033&longitude=76.1004&location_name=Hassan%2C%20Karnataka")
    assert res.status_code == 200
    data = res.json()
    assert "temperature_celsius" in data or "current" in data
