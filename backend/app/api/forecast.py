from fastapi import APIRouter, HTTPException
from backend.app.schemas.forecast import ForecastRequest, ForecastResponse
from backend.app.services.forecasting import train_and_forecast_price

router = APIRouter(prefix="/forecast", tags=["AI Price Forecasting"])

@router.post("", response_model=ForecastResponse)
def get_price_forecast(req: ForecastRequest):
    try:
        return train_and_forecast_price(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting engine error: {str(e)}")
