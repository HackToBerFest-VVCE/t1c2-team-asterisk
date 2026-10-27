import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.snowflake import snowflake_manager
from backend.app.services.crop_recommendation_engine import (
    crop_recommendation_engine,
    KARNATAKA_DISTRICT_COORDS,
    DISTRICT_AGRO_CLIMATIC_ZONE
)

logger = logging.getLogger("farmprice.api.recommendation")

router = APIRouter(tags=["Weather-Based Crop Recommendation and Profit Engine"])

@router.get("/recommendations")
def get_crop_recommendations(
    district: str = Query("Hassan", description="Karnataka district (e.g., Hassan, Kolar, Belagavi, Mysuru)"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Optional farm latitude"),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Optional farm longitude"),
    category: Optional[str] = Query(None, description="Filter by crop category (Vegetables, Fruits, Cereals, etc.)"),
    season: Optional[str] = Query(None, description="Filter by season (Kharif, Rabi, Summer, Year-Round)"),
    water_availability: Optional[str] = Query(None, description="Water availability (Low, Medium, High, Any)"),
    budget_limit_per_acre: Optional[float] = Query(None, ge=0.0, description="Max investment budget per acre (₹)"),
    acres: float = Query(1.0, ge=0.1, le=1000.0, description="Farm land size in acres")
):
    """
    Primary Decision-Support Endpoint:
    Returns ranked, weather-aware crop recommendations, expected net returns per acre,
    break-even selling prices, nearby mandi comparisons, and scenario projections.
    """
    try:
        return crop_recommendation_engine.generate_recommendations(
            district=district,
            latitude=latitude,
            longitude=longitude,
            category=category,
            season=season,
            water_availability=water_availability,
            budget_limit_per_acre=budget_limit_per_acre,
            acres=acres
        )
    except Exception as e:
        logger.error("Error generating crop recommendations: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.get("/profit-estimates")
def get_crop_profit_estimate(
    crop_name: str = Query(..., description="Crop name (e.g. Tomato, Banana, Onion, Potato)"),
    district: str = Query("Hassan", description="District in Karnataka"),
    acres: float = Query(1.0, ge=0.1, le=1000.0, description="Land size in acres"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0)
):
    """
    Detailed Deep-Dive Profit Predictor:
    Calculates itemized cultivation costs (seeds, fertilizer, labour, irrigation, protection, machinery, harvest),
    marketable yield, transport deductions, break-even selling prices, and Conservative/Baseline/Optimistic scenarios.
    """
    reqs = snowflake_manager.get_crop_requirements(crop_name=crop_name)
    if not reqs:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_name}' not found in agricultural catalog.")

    crop = reqs[0]
    lat = latitude or KARNATAKA_DISTRICT_COORDS.get(district, (13.0033, 76.1004))[0]
    lon = longitude or KARNATAKA_DISTRICT_COORDS.get(district, (13.0033, 76.1004))[1]

    profit_data = crop_recommendation_engine.calculate_crop_profit_and_mandi(
        crop=crop,
        district=district,
        farmer_lat=lat,
        farmer_lon=lon,
        acres=acres
    )

    return {
        "crop": crop,
        "district": district,
        "acres": acres,
        "profit_data": profit_data
    }


@router.get("/recommendations/districts")
def list_supported_districts():
    """Returns list of supported Karnataka districts for crop recommendation."""
    districts = snowflake_manager.get_distinct_recommendation_districts()
    return {
        "state": "Karnataka",
        "districts": districts,
        "total_count": len(districts)
    }


@router.get("/recommendations/audit-logs")
def get_data_source_audit_logs():
    """Returns official verification status and record counts for all connected agricultural data sources."""
    logs = snowflake_manager.get_data_source_audit_logs()
    recent_analyses = snowflake_manager.get_recent_crop_profit_analysis(limit=10)
    return {
        "data_sources": logs,
        "recent_stored_analyses": recent_analyses
    }
