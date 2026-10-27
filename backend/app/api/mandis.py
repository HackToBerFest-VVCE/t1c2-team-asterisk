from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from backend.app.services.market_data import get_all_mandis, get_all_mandis_with_prices

router = APIRouter(prefix="/mandis", tags=["Mandis Reference"])

@router.get("")
def list_mandis(include_prices: bool = Query(False, description="Include available crop prices for each mandi")):
    if include_prices:
        return get_all_mandis_with_prices()
    return get_all_mandis()

@router.get("/map-data")
def get_map_mandis():
    """Returns all Karnataka mandis with verified coordinates and current crop prices for interactive map."""
    return get_all_mandis_with_prices()

@router.get("/{mandi_id}")
def get_mandi(mandi_id: str):
    mandis = get_all_mandis_with_prices()
    for m in mandis:
        if m["mandi_id"].lower() == mandi_id.lower():
            return m
    raise HTTPException(status_code=404, detail="Mandi not found")

