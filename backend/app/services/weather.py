from typing import Dict, Any
from backend.app.services.weather_service import weather_service

def get_contextual_weather(
    latitude: float = 13.0033,
    longitude: float = 76.1004,
    location_name: str = "Hassan, Karnataka"
) -> Dict[str, Any]:
    """
    Retrieves real-time atmospheric observations via Open-Meteo API
    with local fallback cache. Weather is strictly contextual.
    """
    return weather_service.get_current_weather(
        latitude=latitude,
        longitude=longitude,
        location_name=location_name
    )
