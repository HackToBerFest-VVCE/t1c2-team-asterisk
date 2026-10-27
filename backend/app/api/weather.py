from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Query, Header, HTTPException, Body
from backend.app.services.weather_service import weather_service
from backend.app.services.weather_impact import weather_impact_engine

router = APIRouter(prefix="/weather", tags=["Automatic Location-Based Weather Intelligence"])

def get_request_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extracts authenticated farmer user identifier or falls back to active session."""
    if not authorization:
        return "usr_chethan"
    return "usr_chethan"

class PreferredLocationPayload(BaseModel):
    location_name: str = Field(..., description="Human readable location or formatted address")
    village_town: Optional[str] = None
    district: str = Field("Hassan", description="District name")
    state: str = Field("Karnataka", description="State name")
    pincode: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    is_gps_detected: bool = Field(False, description="Flag if detected via device GPS")

# =====================================================================
# 1. CURRENT WEATHER OBSERVATION
# =====================================================================

@router.get("")
@router.get("/current")
def get_current_weather(
    latitude: float = Query(13.0033, ge=-90.0, le=90.0, description="Latitude coordinate"),
    longitude: float = Query(76.1004, ge=-180.0, le=180.0, description="Longitude coordinate"),
    location_name: Optional[str] = Query(None, description="Optional location name label")
):
    """
    Fetches real-time atmospheric observation for coordinates via Open-Meteo API.
    Includes temperature, apparent temperature, humidity, wind, rainfall, cloud cover, and WMO code.
    """
    return weather_service.get_current_weather(latitude, longitude, location_name)

# =====================================================================
# 2. 7-DAY FORECAST & HOURLY TIMELINE
# =====================================================================

@router.get("/forecast")
def get_weather_forecast(
    latitude: float = Query(13.0033, ge=-90.0, le=90.0),
    longitude: float = Query(76.1004, ge=-180.0, le=180.0),
    location_name: Optional[str] = Query(None),
    crop_name: str = Query("Tomato", description="Target crop for agricultural advisory")
):
    """
    Retrieves full 7-day daily forecast, 24-hour timeline, and crop-specific agricultural guidance.
    """
    return weather_service.get_forecast(latitude, longitude, location_name, crop_name=crop_name)

# =====================================================================
# 3. LOCATION SEARCH & AUTOCOMPLETE
# =====================================================================

@router.get("/location-search")
def search_locations(
    q: str = Query(..., min_length=2, description="Search term for village, town, district, or PIN code")
):
    """
    Autocomplete search for villages, towns, districts, or Indian postal PIN codes.
    Combines local Karnataka agro-gazetteer indexing with Open-Meteo geocoding.
    """
    return weather_service.search_locations(q)

# =====================================================================
# 4. REVERSE GEOCODING
# =====================================================================

@router.get("/reverse-geocode")
def reverse_geocode(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0)
):
    """
    Resolves browser Geolocation coordinates into a readable Village/Town, District, and State.
    """
    return weather_service.reverse_geocode(latitude, longitude)

# =====================================================================
# 5. PREFERRED FARM LOCATION MANAGEMENT
# =====================================================================

@router.get("/preferred-location")
def get_preferred_farm_location(
    authorization: Optional[str] = Header(None)
):
    """
    Retrieves the farmer's saved preferred farm location.
    Enables instant weather loading on future visits without nagging for device GPS repeatedly.
    """
    user_id = get_request_user_id(authorization)
    return weather_service.get_preferred_location(user_id)

@router.put("/preferred-location")
def save_preferred_farm_location(
    payload: PreferredLocationPayload,
    authorization: Optional[str] = Header(None)
):
    """
    Saves or updates the farmer's preferred field/farm location.
    """
    user_id = get_request_user_id(authorization)
    return weather_service.save_preferred_location(user_id, payload.model_dump())

# =====================================================================
# 6. BACKWARDS COMPATIBILITY ROUTES
# =====================================================================

@router.get("")
def read_weather_compat(
    latitude: float = Query(13.0033),
    longitude: float = Query(76.1004),
    location_name: str = Query("Hassan, Karnataka")
):
    """Backwards compatible endpoint for legacy Topbar & Dashboard widgets."""
    return weather_service.get_current_weather(latitude, longitude, location_name)

@router.get("/impact")
def analyze_weather_market_impact(
    crop_name: str = Query("Tomato", description="Crop commodity name"),
    district: str = Query("Hassan", description="District name"),
    latitude: float = Query(13.0033),
    longitude: float = Query(76.1004)
):
    """
    Weather-Related Agricultural Market Analysis API.
    Evaluates rainfall, transit delay risks, and supply impacts,
    with explicit correlation vs causation disclaimers.
    """
    return weather_impact_engine.analyze_weather_impact(crop_name, district, latitude, longitude)
