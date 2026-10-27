from fastapi import APIRouter, HTTPException
from backend.app.schemas.market import MarketComparisonRequest, MarketComparisonResponse
from backend.app.services.recommendation import evaluate_market_comparison

router = APIRouter(prefix="/market-comparison", tags=["Market Comparison & Recommendations"])

@router.post("", response_model=MarketComparisonResponse)
def compare_markets(req: MarketComparisonRequest):
    try:
        return evaluate_market_comparison(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market comparison evaluation error: {str(e)}")
