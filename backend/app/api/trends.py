from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.market_data import get_market_trends
from backend.app.services.trend_detector import trend_detector

router = APIRouter(prefix="/market-trends", tags=["Market Trends & Arrivals"])

@router.get("")
def read_market_trends(
    crop_id: str = Query("CROP_TOMATO", description="Crop identifier"),
    variety_id: Optional[str] = Query(None, description="Variety identifier"),
    mandi_id: Optional[str] = Query("MND_HASSAN", description="Primary Mandi identifier"),
    compare_mandi_id: Optional[str] = Query(None, description="Optional secondary Mandi for comparison"),
    aggregation: str = Query("daily", description="Aggregation: daily, weekly, or monthly"),
    timeframe: str = Query("3months", description="Timeframe filter")
):
    """
    Feature 2: Advanced Historical Price & Arrival Trends API.
    Supports daily, weekly, and monthly views, multi-mandi comparisons, and period change metrics.
    """
    return get_market_trends(crop_id, variety_id, mandi_id, compare_mandi_id, aggregation, timeframe)

@router.get("/detect-trend")
def detect_price_trend(
    crop_id: str = Query("CROP_TOMATO", description="Crop identifier"),
    mandi_id: str = Query("MND_HASSAN", description="Mandi identifier")
):
    """
    Feature 3: Automatic Rising/Falling Price Trend Detection API.
    Computes SMA_7, SMA_21, momentum, and classifies as RISING, FALLING, STABLE, or INCONCLUSIVE.
    """
    return trend_detector.detect_trend(crop_id, mandi_id)
