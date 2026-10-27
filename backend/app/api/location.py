from fastapi import APIRouter, Query
from backend.app.services.location import lookup_coordinates, estimate_road_distance, KNOWN_LOCATIONS
from backend.app.services.market_data import get_all_mandis

router = APIRouter(prefix="/location", tags=["Geospatial & Road Distance"])

@router.get("/resolve")
def resolve_location(query: str = Query("Hassan", description="Village, town or district")):
    lat, lon, label = lookup_coordinates(query)
    return {
        "query": query,
        "resolved_label": label,
        "latitude": lat,
        "longitude": lon,
        "supported_origins": list(KNOWN_LOCATIONS.keys())
    }

@router.get("/nearby-mandis")
def nearby_mandis(
    latitude: float = Query(13.0033),
    longitude: float = Query(76.1004)
):
    mandis = get_all_mandis()
    results = []
    for m in mandis:
        straight, road = estimate_road_distance(latitude, longitude, m["latitude"], m["longitude"])
        results.append({
            "mandi_id": m["mandi_id"],
            "mandi_name": m["mandi_name"],
            "district": m["district"],
            "latitude": m["latitude"],
            "longitude": m["longitude"],
            "straight_line_km": straight,
            "estimated_road_km": road,
            "distance_method": "Road estimate (1.25x curvature factor)"
        })
    results.sort(key=lambda x: x["estimated_road_km"])
    return results
