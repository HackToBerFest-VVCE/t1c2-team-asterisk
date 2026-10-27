import time
from typing import Dict, Any, List, Optional
from backend.app.services.weather_service import weather_service

class WeatherImpactEngine:
    """
    Agricultural Weather Contextual Intelligence.
    Correlates rainfall, temperature, and humidity with harvest logistics,
    transit delays, and arrival volume flushes while explicitly distinguishing
    correlation from direct financial causation.
    """
    def analyze_weather_impact(
        self,
        crop_name: str = "Tomato",
        district: str = "Hassan",
        latitude: float = 13.0033,
        longitude: float = 76.1004
    ) -> Dict[str, Any]:
        location_label = f"{district}, Karnataka"
        forecast_res = weather_service.get_forecast(
            latitude=latitude,
            longitude=longitude,
            location_name=location_label,
            crop_name=crop_name
        )

        curr = forecast_res.get("current", {})
        temp = curr.get("temperature_celsius", forecast_res.get("temperature_celsius", 26.0))
        humidity = curr.get("humidity_percent", forecast_res.get("humidity_percent", 68))
        rain_chance = curr.get("rain_chance_percent", forecast_res.get("rain_chance_percent", 12))
        condition = curr.get("condition", forecast_res.get("condition", "Clear Sky"))
        agri = forecast_res.get("agricultural_intelligence", {})

        alerts: List[Dict[str, str]] = []
        supply_impacts: List[str] = []
        logistics_impacts: List[str] = []

        # Rainfall analysis
        if rain_chance >= 60:
            alerts.append({
                "severity": "HIGH",
                "title": "Monsoon Transit Advisory",
                "message": f"High probability of rainfall ({rain_chance}%) in {district} over next 24-48h. Expect field-to-mandi transit delays."
            })
            logistics_impacts.append("Wet road conditions and localized waterlogging may slow haulage transport by 15-30 minutes.")
            supply_impacts.append(f"Perishable produce like {crop_name} harvested in rain requires immediate tarp coverage to avoid moisture decay.")
        elif rain_chance >= 30:
            alerts.append({
                "severity": "MODERATE",
                "title": "Moderate Rain Chance",
                "message": f"Scattered rain showers ({rain_chance}%) possible. Ensure moisture-proof packaging for open-truck transport."
            })
            logistics_impacts.append("Intermittent rain on regional rural roads may cause minor packing and loading delays.")
            supply_impacts.append("Short delays in early morning field picking may shift arrival clearance to afternoon auctions.")
        else:
            alerts.append({
                "severity": "LOW",
                "title": "Favorable Harvesting Conditions",
                "message": f"Clear weather in {district}. Optimal harvesting, loading, and transit conditions across regional corridors."
            })
            logistics_impacts.append(f"Smooth highway transit on {district} freight corridors.")
            supply_impacts.append("Optimal dry field conditions favor bulk vegetable and tuber harvests.")

        # Temperature / Storage analysis
        if temp >= 32.0:
            supply_impacts.append(f"Warm daytime ambient temperatures ({temp}°C) accelerate post-harvest respiration in {crop_name}. Recommend dispatching during early dawn hours.")
        else:
            supply_impacts.append(f"Moderate daytime temperatures ({temp}°C) maintain firm fruit firmness during short-distance haulage.")

        # Correlation vs Causation Explanatory Statement (Mandatory Requirement)
        causation_disclaimer = (
            "Important Contextual Note: Agricultural weather conditions influence harvesting logistics, "
            "road transit speed, and short-term auction arrivals. Weather observations represent correlated "
            "environmental factors and must NOT be interpreted as proof that weather alone caused any specific price change."
        )

        return {
            "district": district,
            "crop_name": crop_name,
            "weather_observation": forecast_res,
            "harvest_condition": "FAVORABLE" if rain_chance < 40 else "CHALLENGING",
            "active_alerts": alerts,
            "logistics_impacts": logistics_impacts,
            "supply_impacts": supply_impacts,
            "causation_disclaimer": causation_disclaimer,
            "daily_forecast": forecast_res.get("daily", []),
            "hourly_forecast": forecast_res.get("hourly", []),
            "drying_advisory": agri.get("drying_advisory"),
            "storage_advisory": agri.get("storage_advisory"),
            "transport_logistics_advisory": agri.get("transport_logistics_advisory"),
            "analysis_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC")
        }

# Singleton instance
weather_impact_engine = WeatherImpactEngine()
