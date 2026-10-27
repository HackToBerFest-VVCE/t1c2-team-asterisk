import os
import time
import uuid
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.services.weather_provider import weather_provider
from backend.app.services.geocoding_service import geocoding_service
from backend.app.core.config import get_local_db_path
from backend.app.core.snowflake import snowflake_manager

logger = logging.getLogger("farmprice.weather_service")
LOCAL_DB_PATH = get_local_db_path()

class WeatherService:
    """
    Authoritative Weather Intelligence & Agricultural Advisory Service.
    Coordinates real-time meteorological observation retrieval (via Open-Meteo),
    automatic browser-detected geocoding, user farm location persistence,
    crop-specific harvest/moisture impact modeling, and Snowflake historical mirroring.
    """
    def __init__(self):
        self._init_weather_tables()

    def _get_connection(self):
        os.makedirs(os.path.dirname(LOCAL_DB_PATH), exist_ok=True)
        conn = sqlite3.connect(LOCAL_DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_weather_tables(self):
        try:
            conn = self._get_connection()
            cur = conn.cursor()

            # 1. User Preferred Farm Locations Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_farm_locations (
                    user_id TEXT PRIMARY KEY,
                    location_name TEXT NOT NULL,
                    village_town TEXT,
                    district TEXT NOT NULL,
                    state TEXT NOT NULL DEFAULT 'Karnataka',
                    pincode TEXT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    is_gps_detected INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 2. Snowflake Mirror: FACT_WEATHER_OBSERVATIONS
            cur.execute("""
                CREATE TABLE IF NOT EXISTS FACT_WEATHER_OBSERVATIONS (
                    obs_id TEXT PRIMARY KEY,
                    location_reference TEXT NOT NULL,
                    district TEXT NOT NULL,
                    state TEXT DEFAULT 'Karnataka',
                    latitude REAL,
                    longitude REAL,
                    provider TEXT NOT NULL,
                    temperature_celsius REAL,
                    apparent_temperature_celsius REAL,
                    relative_humidity_pct INT,
                    precipitation_mm REAL,
                    rain_chance_pct INT,
                    wind_speed_kmh REAL,
                    weather_condition TEXT,
                    weather_code INT,
                    observation_timestamp TEXT,
                    retrieval_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    source_attribution TEXT
                )
            """)

            # 3. Snowflake Mirror: FACT_WEATHER_FORECAST_SNAPSHOTS
            cur.execute("""
                CREATE TABLE IF NOT EXISTS FACT_WEATHER_FORECAST_SNAPSHOTS (
                    snapshot_id TEXT PRIMARY KEY,
                    location_reference TEXT NOT NULL,
                    forecast_date TEXT NOT NULL,
                    horizon_days INT NOT NULL,
                    provider TEXT NOT NULL,
                    temperature_max_celsius REAL,
                    temperature_min_celsius REAL,
                    precipitation_sum_mm REAL,
                    precipitation_probability_max INT,
                    weather_condition TEXT,
                    snapshot_timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Seed default farm location for usr_chethan (Hassan)
            cur.execute("""
                INSERT OR IGNORE INTO user_farm_locations (
                    user_id, location_name, village_town, district, state, pincode, latitude, longitude, is_gps_detected, updated_at
                ) VALUES (
                    'usr_chethan', 'Alur Taluk, Hassan', 'Alur', 'Hassan', 'Karnataka', '573213', 13.0033, 76.1004, 0, ?
                )
            """, (datetime.now(timezone.utc).isoformat(),))

            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning("Could not initialize weather tables: %s", str(e))

    def get_current_weather(
        self,
        latitude: float,
        longitude: float,
        location_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves current real-time weather observations for given coordinates.
        Resolves location name automatically if not supplied.
        """
        effective_loc = location_name
        if not effective_loc or effective_loc.strip() == "":
            rev = geocoding_service.reverse_geocode(latitude, longitude)
            effective_loc = rev.get("formatted_address") or rev.get("village_town") or f"{latitude:.2f}, {longitude:.2f}"

        weather_res = weather_provider.fetch_current_and_forecast(
            latitude=latitude,
            longitude=longitude,
            location_name=effective_loc
        )

        # Trigger non-blocking snapshot persistence for analytical history
        try:
            self._record_weather_observation(weather_res)
        except Exception as e:
            logger.debug("Weather observation snapshot error: %s", str(e))

        return weather_res

    def get_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: Optional[str] = None,
        crop_name: str = "Tomato"
    ) -> Dict[str, Any]:
        """
        Retrieves full 7-day agricultural forecast, hourly timeline, and farm impact advisory.
        """
        weather_res = self.get_current_weather(latitude, longitude, location_name)
        district = weather_res.get("district") or (
            location_name.split(",")[0] if location_name and "," in location_name else "Hassan"
        )
        
        # Build agricultural intelligence
        agri_advisory = self.analyze_agricultural_weather(
            weather_data=weather_res,
            crop_name=crop_name,
            district=district
        )

        return {
            **weather_res,
            "agricultural_intelligence": agri_advisory,
            "crop_advisory": agri_advisory
        }

    def search_locations(self, query: str) -> List[Dict[str, Any]]:
        """Searches locations by village, town, district, or PIN code."""
        return geocoding_service.search_locations(query)

    def reverse_geocode(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Resolves GPS coordinates into administrative entity."""
        return geocoding_service.reverse_geocode(latitude, longitude)

    def get_preferred_location(self, user_id: str) -> Dict[str, Any]:
        """Loads farmer's saved farm location."""
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM user_farm_locations WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        conn.close()

        if row:
            d = dict(row)
            return {
                "has_saved_location": True,
                "location_name": d["location_name"],
                "village_town": d["village_town"],
                "district": d["district"],
                "state": d["state"],
                "pincode": d["pincode"],
                "latitude": float(d["latitude"]),
                "longitude": float(d["longitude"]),
                "is_gps_detected": bool(d["is_gps_detected"]),
                "updated_at": d["updated_at"]
            }

        # Default fallback to Hassan
        return {
            "has_saved_location": False,
            "location_name": "Hassan, Karnataka",
            "village_town": "Hassan",
            "district": "Hassan",
            "state": "Karnataka",
            "pincode": "573201",
            "latitude": 13.0033,
            "longitude": 76.1004,
            "is_gps_detected": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

    def save_preferred_location(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves or updates the farmer's preferred field/farm location."""
        now_iso = datetime.now(timezone.utc).isoformat()
        lat = float(data.get("latitude", 13.0033))
        lon = float(data.get("longitude", 76.1004))
        loc_name = data.get("location_name") or data.get("formatted_address") or "Hassan, Karnataka"
        v_town = data.get("village_town") or loc_name.split(",")[0].strip()
        dist = data.get("district") or "Hassan"
        state = data.get("state") or "Karnataka"
        pin = data.get("pincode")
        is_gps = 1 if data.get("is_gps_detected") else 0

        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO user_farm_locations (
                user_id, location_name, village_town, district, state, pincode, latitude, longitude, is_gps_detected, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, loc_name, v_town, dist, state, pin, lat, lon, is_gps, now_iso))

        # Also update USER_PROFILES if exists
        try:
            cur.execute("""
                UPDATE USER_PROFILES 
                SET district = ?, village_or_town = ?, state = ?, updated_at = ?
                WHERE user_id = ?
            """, (dist, v_town, state, now_iso, user_id))
        except Exception:
            pass

        conn.commit()
        conn.close()

        return {
            "status": "SUCCESS",
            "success": True,
            "message": f"Preferred farm location saved to {loc_name}.",
            "location": {
                "location_name": loc_name,
                "village_town": v_town,
                "district": dist,
                "state": state,
                "pincode": pin,
                "latitude": lat,
                "longitude": lon,
                "is_gps_detected": bool(is_gps),
                "updated_at": now_iso
            }
        }

    def analyze_agricultural_weather(
        self,
        weather_data: Dict[str, Any],
        crop_name: str = "Tomato",
        district: str = "Hassan"
    ) -> Dict[str, Any]:
        """
        Generates evidence-based agricultural weather guidance:
        - 24h and 7-day cumulative rainfall assessment
        - Harvesting advisories & moisture risks
        - Sun-drying and open storage warnings
        - Freight haulage & rural transit delay alerts
        - Strictly maintains correlation vs causation disclaimers
        """
        curr = weather_data.get("current", {})
        temp = curr.get("temperature_celsius", weather_data.get("temperature_celsius", 26.0))
        humidity = curr.get("humidity_percent", weather_data.get("humidity_percent", 65))
        rain_chance = curr.get("rain_chance_percent", weather_data.get("rain_chance_percent", 15))
        wind_kmh = curr.get("wind_kmh", weather_data.get("wind_kmh", 8.0))
        daily = weather_data.get("daily", [])

        # 7-day cumulative rain estimation
        cum_rain_7d = sum(d.get("precipitation_sum_mm", 0.0) for d in daily)
        next_24h_rain_prob = max([d.get("precipitation_probability_max", 0) for d in daily[:1]] or [rain_chance])

        # Transparent rule-based agricultural indicators
        harvest_suitability = "OPTIMAL"
        alerts = []
        drying_advisory = ""
        storage_advisory = ""
        transport_logistics_advisory = ""

        # Crop-specific moisture vulnerability
        crop_lower = crop_name.lower()
        is_perishable = crop_lower in ("tomato", "green chilli", "capsicum", "coriander")
        is_tuber = crop_lower in ("potato", "ginger", "garlic", "onion")
        is_cereal = crop_lower in ("paddy", "maize", "ragi")

        # 1. Rain and Harvesting Risk Analysis
        if next_24h_rain_prob >= 60 or cum_rain_7d >= 25.0:
            harvest_suitability = "CHALLENGING"
            alerts.append({
                "severity": "HIGH",
                "title": f"Rain Alert ({next_24h_rain_prob}% Chance in Next 24h)",
                "kannada": f"ಮಳೆ ಎಚ್ಚರಿಕೆ (ಮುಂದಿನ 24 ಗಂಟೆಗಳಲ್ಲಿ {next_24h_rain_prob}% ಮಳೆ ಸಾಧ್ಯತೆ)",
                "category": "HARVEST_RISK",
                "message": f"Precipitation expected in {district}. For {crop_name}, pause plucking during wet downpours to avoid bacterial soft rot."
            })
            if is_tuber:
                alerts.append({
                    "severity": "MODERATE",
                    "title": "Tuber Harvesting Advisory",
                    "kannada": "ಗೆಡ್ಡೆ ಬೆಳೆ ಕೊಯ್ಲು ಸಲಹೆ",
                    "category": "SOIL_MOISTURE",
                    "message": "Waterlogged soils increase mechanical skinning and soil clod adherence. Ensure tubers are air-cured under cover."
                })
        elif next_24h_rain_prob >= 35 or cum_rain_7d >= 10.0:
            harvest_suitability = "MODERATE"
            alerts.append({
                "severity": "MODERATE",
                "title": f"Scattered Showers Forecast ({next_24h_rain_prob}%)",
                "kannada": f"ಚದುರಿದ ಮಳೆ ಮುನ್ಸೂಚನೆ ({next_24h_rain_prob}%)",
                "category": "HARVEST_TIMING",
                "message": f"Clear early mornings favor field picking in {district}. Complete harvesting before afternoon cloud build-up."
            })
        else:
            harvest_suitability = "OPTIMAL"
            alerts.append({
                "severity": "LOW",
                "title": "Favorable Dry Harvesting Window",
                "kannada": "ಅನುಕೂಲಕರ ಶುಷ್ಕ ಕೊಯ್ಲು ವಾತಾವರಣ",
                "category": "HARVEST_OPTIMAL",
                "message": f"Dry atmospheric conditions prevailing across {district}. Ideal for field picking, grading, and bulk packing."
            })

        # 2. Drying & Storage Analysis
        if humidity >= 75 or rain_chance >= 40:
            drying_advisory = "Unfavorable for open sun-drying of grains/ragi. Ambient moisture exceeds 75%; store in moisture-barrier gunny bags."
            storage_advisory = "High atmospheric humidity accelerates moisture absorption in stored produce. Elevate wooden pallets at least 15 cm off cement floors."
        else:
            drying_advisory = "Favorable ambient drying conditions. Low relative humidity allows effective moisture reduction for maize and ragi."
            storage_advisory = "Well-ventilated warehouse storage optimal. Low fungal spore germination risk under current ambient humidity."

        # 3. Transport & Freight Logistics Advisory
        if next_24h_rain_prob >= 50 or wind_kmh >= 25.0:
            transport_logistics_advisory = f"High precipitation probability ({next_24h_rain_prob}%) on regional haulage corridors. Mandate heavy-duty PVC tarpaulins on open cargo trucks to prevent transit water spoilage."
        else:
            transport_logistics_advisory = f"Smooth freight conditions on {district} APMC connecting corridors. Normal transit haulage expected."

        # Temperature extremes
        if temp >= 32.0 and is_perishable:
            alerts.append({
                "severity": "MODERATE",
                "title": f"Warm Ambient Peak ({temp}°C)",
                "kannada": f"ಹೆಚ್ಚಿನ ಹಗಲಿನ ತಾಪಮಾನ ({temp}°C)",
                "category": "TEMPERATURE_PRESERVATION",
                "message": f"High daytime heat accelerates respiration and weight loss in {crop_name}. Dispatch vehicles in early dawn (5:00 AM - 8:00 AM)."
            })

        # Mandatory causation disclaimer
        causation_disclaimer = (
            "Important Contextual Note: Agricultural weather conditions influence harvesting logistics, "
            "road transit speed, and short-term auction arrivals. Weather observations represent correlated "
            "environmental factors and must NOT be interpreted as proof that weather alone caused any specific price change."
        )

        return {
            "crop_name": crop_name,
            "district": district,
            "harvest_suitability": harvest_suitability,
            "next_24h_rain_probability": next_24h_rain_prob,
            "cumulative_7d_rainfall_mm": round(cum_rain_7d, 1),
            "drying_advisory": drying_advisory,
            "storage_advisory": storage_advisory,
            "transport_logistics_advisory": transport_logistics_advisory,
            "alerts": alerts,
            "active_alerts": alerts, # backwards compatibility
            "causation_disclaimer": causation_disclaimer,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    def _record_weather_observation(self, weather: Dict[str, Any]):
        """Persists snapshot into local analytical SQLite mirror for historical reporting."""
        curr = weather.get("current", {})
        obs_id = f"OBS_{uuid.uuid4().hex[:10].upper()}"
        loc_ref = weather.get("location_name") or weather.get("location") or "Hassan"
        dist = loc_ref.split(",")[0].strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO FACT_WEATHER_OBSERVATIONS (
                obs_id, location_reference, district, state, latitude, longitude, provider,
                temperature_celsius, apparent_temperature_celsius, relative_humidity_pct,
                precipitation_mm, rain_chance_pct, wind_speed_kmh, weather_condition, weather_code,
                observation_timestamp, retrieval_timestamp, source_attribution
            ) VALUES (?, ?, ?, 'Karnataka', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            obs_id, loc_ref, dist,
            weather.get("latitude"), weather.get("longitude"),
            weather.get("provider", "Open-Meteo"),
            curr.get("temperature_celsius"), curr.get("apparent_temperature_celsius"),
            curr.get("humidity_percent"), curr.get("precipitation_mm"),
            curr.get("rain_chance_percent"), curr.get("wind_kmh"),
            curr.get("condition"), curr.get("weather_code"),
            weather.get("observation_time", now_iso), now_iso,
            weather.get("source", "Open-Meteo API")
        ))
        conn.commit()
        conn.close()

# Global Singleton
weather_service = WeatherService()
