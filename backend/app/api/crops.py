from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from backend.app.services.market_data import get_all_crops, get_varieties_for_crop
from backend.app.core.snowflake import snowflake_manager
from backend.app.services.crop_recommendation_engine import crop_recommendation_engine

router = APIRouter(prefix="/crops", tags=["Agricultural Crops & Agronomic Requirements"])

@router.get("")
def list_crops(
    category: Optional[str] = Query(None, description="Filter by crop category (Vegetables, Fruits, Cereals, etc.)"),
    season: Optional[str] = Query(None, description="Filter by season (Kharif, Rabi, Summer, Year-Round)"),
    crop_name: Optional[str] = Query(None, description="Filter by specific crop name")
):
    """
    Returns authentic agricultural crop requirements from ICAR / UAS Bengaluru catalog.
    Falls back to market crops list if no specific filters applied.
    """
    reqs = snowflake_manager.get_crop_requirements(category=category, season=season, crop_name=crop_name)
    if reqs:
        return reqs
    return get_all_crops()

@router.get("/snowflake")
def list_snowflake_crops(crop: Optional[str] = Query(None, description="Filter by crop name")):
    """
    GET /api/crops/snowflake
    Returns real crop agronomic benchmarks directly from Snowflake table REALDATA2.
    """
    if snowflake_manager.mode == "SNOWFLAKE_LIVE":
        return snowflake_manager.get_realdata2(crop=crop)
    return get_all_crops()

@router.get("/categories")
def list_crop_categories():
    """Returns distinct crop categories in the agricultural knowledge base."""
    crops = snowflake_manager.get_crop_requirements()
    categories = sorted(list(set(c["category"] for c in crops if c.get("category"))))
    seasons = ["Kharif", "Rabi", "Summer", "Year-Round"]
    return {
        "categories": categories,
        "seasons": seasons
    }

@router.get("/suitability")
def evaluate_crop_suitability(
    crop_name: str = Query(..., description="Crop name to evaluate (e.g. Tomato, Banana, Onion)"),
    district: str = Query("Hassan", description="District in Karnataka"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0)
):
    """
    Evaluates specific crop agro-climatic and weather suitability for a given location.
    """
    reqs = snowflake_manager.get_crop_requirements(crop_name=crop_name)
    if not reqs:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_name}' not found in agricultural catalog.")
    
    crop = reqs[0]
    rec_result = crop_recommendation_engine.generate_recommendations(
        district=district,
        latitude=latitude,
        longitude=longitude,
        category=None
    )
    # Find matching crop in recommendations
    for r in rec_result.get("recommendations", []):
        if r["crop_name"].lower() == crop_name.lower():
            return {
                "crop": crop,
                "suitability_score": r["suitability_score"],
                "weather_score": r["weather_score"],
                "season_score": r["season_score"],
                "agro_climatic_fit": r["agro_climatic_fit"],
                "agro_climatic_zone": r["agro_climatic_zone"],
                "weather_risks": r["weather_risks"],
                "season_reasoning": r["season_reasoning"],
                "financial_overview": r["profit_data"]["financials"],
                "best_mandi": r["profit_data"]["mandi"],
                "harvest_forecast": r["profit_data"]["forecast_at_harvest"],
                "confidence_score": r["confidence_score"]
            }
            
    raise HTTPException(status_code=404, detail=f"Suitability analysis could not be generated for '{crop_name}'.")

@router.get("/{crop_id}/varieties")
def list_varieties(crop_id: str):
    """Returns registered varieties for a crop."""
    varieties = get_varieties_for_crop(crop_id)
    return varieties
