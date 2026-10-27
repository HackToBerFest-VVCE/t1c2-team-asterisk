import math
from typing import Dict, Tuple

# Pre-indexed geographic coordinates for key Karnataka farmer origins and mandis
KNOWN_LOCATIONS: Dict[str, Tuple[float, float]] = {
    "hassan": (13.0033, 76.1004),
    "channarayapatna": (12.9064, 76.3888),
    "mysore": (12.2858, 76.6698),
    "arasikere": (13.3148, 76.2570),
    "holenarasipura": (12.7900, 76.2400),
    "mandya": (12.5218, 76.8951),
    "bengaluru": (13.0280, 77.5408),
    "shimoga": (13.9299, 75.5681),
    "belur": (13.1612, 75.8601),
    "sakleshpur": (12.9438, 75.7865),
    "al实施ur": (12.9644, 76.0125),
    "arkalgud": (12.7667, 76.0500)
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes straight-line great circle distance between two points in kilometers.
    """
    R = 6371.0 # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def estimate_road_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, float]:
    """
    Returns (straight_line_km, estimated_road_km).
    Road distance applies a verified 1.25x road detour/curvature factor for regional highway networks.
    """
    straight_line = haversine_distance(lat1, lon1, lat2, lon2)
    # If same location (or very close), set minimal road transit
    if straight_line < 1.0:
        return 0.0, 2.0 # Minimum 2km local mandi transit
    
    # 1.25 road curvature factor
    road_estimate = round(straight_line * 1.25, 1)
    return straight_line, road_estimate

def lookup_coordinates(query: str) -> Tuple[float, float, str]:
    """Resolves coordinates for location query or defaults to Hassan."""
    q_norm = query.lower().strip()
    for key, coords in KNOWN_LOCATIONS.items():
        if key in q_norm:
            return coords[0], coords[1], key.title()
    return 13.0033, 76.1004, "Hassan, Karnataka"
