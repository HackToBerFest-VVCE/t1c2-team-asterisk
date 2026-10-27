import math
import logging
import requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger("farmprice.geocoding")

# Comprehensive Gazetteer for Karnataka Agricultural Hubs & Mandi Districts
KARNATAKA_GAZETTEER = [
    {"name": "Hassan", "district": "Hassan", "state": "Karnataka", "pincode": "573201", "lat": 13.0033, "lon": 76.1004, "type": "District Headquarters"},
    {"name": "Channarayapatna", "district": "Hassan", "state": "Karnataka", "pincode": "573116", "lat": 12.9064, "lon": 76.3888, "type": "Taluk / APMC Market"},
    {"name": "Alur", "district": "Hassan", "state": "Karnataka", "pincode": "573213", "lat": 12.9842, "lon": 75.9864, "type": "Taluk"},
    {"name": "Belur", "district": "Hassan", "state": "Karnataka", "pincode": "573115", "lat": 13.1625, "lon": 75.8569, "type": "Taluk"},
    {"name": "Sakleshpur", "district": "Hassan", "state": "Karnataka", "pincode": "573134", "lat": 12.9439, "lon": 75.7865, "type": "Taluk / Plantation Center"},
    {"name": "Arsikere", "district": "Hassan", "state": "Karnataka", "pincode": "573103", "lat": 13.3148, "lon": 76.2570, "type": "Taluk / Coconut & Maize Hub"},
    {"name": "Holenarasipura", "district": "Hassan", "state": "Karnataka", "pincode": "573211", "lat": 12.7900, "lon": 76.2400, "type": "Taluk / Paddy Hub"},
    {"name": "Arkalgud", "district": "Hassan", "state": "Karnataka", "pincode": "573102", "lat": 12.7667, "lon": 76.0500, "type": "Taluk"},
    {"name": "Mysore (Bandipalya)", "district": "Mysore", "state": "Karnataka", "pincode": "570001", "lat": 12.2858, "lon": 76.6698, "type": "Major Mandi Hub"},
    {"name": "Mandya", "district": "Mandya", "state": "Karnataka", "pincode": "571401", "lat": 12.5218, "lon": 76.8951, "type": "District Mandi"},
    {"name": "Bengaluru (Yeshwanthpur)", "district": "Bengaluru Urban", "state": "Karnataka", "pincode": "560022", "lat": 13.0280, "lon": 77.5408, "type": "State Terminal Market"},
    {"name": "Shivamogga (Shimoga)", "district": "Shivamogga", "state": "Karnataka", "pincode": "577201", "lat": 13.9299, "lon": 75.5681, "type": "District Mandi"},
    {"name": "Kolar", "district": "Kolar", "state": "Karnataka", "pincode": "563101", "lat": 13.1367, "lon": 78.1292, "type": "Asia's 2nd Largest Tomato Market"},
    {"name": "Chikkaballapur", "district": "Chikkaballapur", "state": "Karnataka", "pincode": "562101", "lat": 13.4325, "lon": 77.7275, "type": "Horticultural Hub"},
    {"name": "Tumakuru (Tumkur)", "district": "Tumakuru", "state": "Karnataka", "pincode": "572101", "lat": 13.3409, "lon": 77.1010, "type": "District APMC"},
    {"name": "Chitradurga", "district": "Chitradurga", "state": "Karnataka", "pincode": "577501", "lat": 14.2251, "lon": 76.3980, "type": "Dryland Farming Hub"},
    {"name": "Davanagere", "district": "Davanagere", "state": "Karnataka", "pincode": "577002", "lat": 14.4644, "lon": 75.9218, "type": "Major Grain Mandi"},
    {"name": "Belagavi (Belgaum)", "district": "Belagavi", "state": "Karnataka", "pincode": "590001", "lat": 15.8497, "lon": 74.4977, "type": "Vegetable & Sugar Corridor"},
    {"name": "Hubballi-Dharwad", "district": "Dharwad", "state": "Karnataka", "pincode": "580020", "lat": 15.3647, "lon": 75.1240, "type": "North Karnataka Commercial Hub"},
    {"name": "Ballari (Bellary)", "district": "Ballari", "state": "Karnataka", "pincode": "583101", "lat": 15.1394, "lon": 76.9214, "type": "Chilli & Cotton Mandi"}
]

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers between two coordinates."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

class GeocodingService:
    """
    Geocoding & Reverse Geocoding Service.
    Resolves coordinates to human-readable administrative entities (Village/Town, District, State)
    and supports forward autocomplete search by town, district, or Indian postal PIN code.
    """
    OPEN_METEO_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"

    def search_locations(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Searches locations by village, town, district or PIN code.
        Combines local gazetteer indexing with Open-Meteo global geocoding API.
        """
        if not query or len(query.strip()) < 2:
            return []

        q = query.strip().lower()
        results: List[Dict[str, Any]] = []
        seen_keys = set()

        # 1. Match against local Karnataka gazetteer first (instant & reliable)
        for g in KARNATAKA_GAZETTEER:
            name_match = q in g["name"].lower()
            district_match = q in g["district"].lower()
            pincode_match = q in g.get("pincode", "")
            
            if name_match or district_match or pincode_match:
                key = f"{round(g['lat'], 3)}_{round(g['lon'], 3)}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    results.append({
                        "name": g["name"],
                        "village_town": g["name"],
                        "district": g["district"],
                        "state": g["state"],
                        "country": "India",
                        "pincode": g.get("pincode"),
                        "formatted_address": f"{g['name']}, {g['district']}, {g['state']}",
                        "latitude": g["lat"],
                        "longitude": g["lon"],
                        "source": "Karnataka Agro Gazetteer"
                    })

        # 2. Query Open-Meteo Geocoding API for broader village/town resolution
        try:
            resp = requests.get(
                self.OPEN_METEO_GEO_URL,
                params={"name": query, "count": 10, "language": "en", "format": "json"},
                timeout=3.5
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("results", [])
                
                # Sort: prioritize India & Karnataka
                for item in items:
                    country = item.get("country", "")
                    admin1 = item.get("admin1", "") # State
                    admin2 = item.get("admin2", "") # District
                    name = item.get("name", "")
                    lat = float(item.get("latitude", 0.0))
                    lon = float(item.get("longitude", 0.0))

                    key = f"{round(lat, 3)}_{round(lon, 3)}"
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)

                    formatted = f"{name}, {admin1 or admin2 or country}"
                    if country and country != "India":
                        formatted += f", {country}"

                    # Priority boost for Indian / Karnataka locations
                    is_karnataka = (admin1 and "karnataka" in admin1.lower())
                    is_india = (country and "india" in country.lower())

                    res_obj = {
                        "name": name,
                        "village_town": name,
                        "district": admin2 or name,
                        "state": admin1 or "Karnataka",
                        "country": country or "India",
                        "pincode": None,
                        "formatted_address": formatted,
                        "latitude": lat,
                        "longitude": lon,
                        "source": "Open-Meteo Global Geocoding"
                    }
                    if is_karnataka or is_india:
                        results.insert(0 if is_karnataka else len(results), res_obj)
                    else:
                        results.append(res_obj)
        except Exception as e:
            logger.debug("Open-Meteo Geocoding query failed: %s", str(e))

        return results[:limit]

    def reverse_geocode(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Reverse geocodes latitude/longitude into human-readable village/town, district, and state.
        Uses closest Karnataka agro-centroid with haversine distance calculation and fallback.
        """
        # Find nearest point in Karnataka gazetteer
        nearest = None
        min_dist = float("inf")

        for g in KARNATAKA_GAZETTEER:
            dist = calculate_haversine_distance(latitude, longitude, g["lat"], g["lon"])
            if dist < min_dist:
                min_dist = dist
                nearest = g

        # If within 40km of a known hub, use precise localized label
        if nearest and min_dist <= 50.0:
            return {
                "village_town": nearest["name"],
                "district": nearest["district"],
                "state": nearest["state"],
                "country": "India",
                "pincode": nearest.get("pincode", "573201"),
                "formatted_address": f"{nearest['name']}, {nearest['district']} District, Karnataka",
                "latitude": latitude,
                "longitude": longitude,
                "distance_to_mandi_center_km": round(min_dist, 1),
                "is_detected": True,
                "source": "Karnataka Regional Spatial Index"
            }

        # Otherwise fallback to general coordinate description
        fallback_district = nearest["district"] if nearest else "Hassan"
        return {
            "village_town": f"Near {fallback_district}",
            "district": fallback_district,
            "state": "Karnataka",
            "country": "India",
            "pincode": nearest.get("pincode", "573201") if nearest else "573201",
            "formatted_address": f"Lat {latitude:.4f}, Lon {longitude:.4f} ({fallback_district} Region)",
            "latitude": latitude,
            "longitude": longitude,
            "distance_to_mandi_center_km": round(min_dist, 1) if nearest else 0.0,
            "is_detected": True,
            "source": "Coordinate Spatial Approximation"
        }

geocoding_service = GeocodingService()
