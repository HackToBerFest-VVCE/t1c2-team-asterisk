from typing import List, Optional
from pydantic import BaseModel, Field

class ForecastRequest(BaseModel):
    crop_id: str
    variety_id: Optional[str] = None
    mandi_id: str
    horizon_days: int = Field(7, ge=1, le=30, description="Forecast horizon in days (e.g. 7, 14, 30)")

class DailyForecastPoint(BaseModel):
    date: str
    predicted_modal_price: float
    lower_bound: float
    upper_bound: float
    day_of_week: str

class ModelEvaluationMetrics(BaseModel):
    model_name: str
    model_version: str
    training_period: str
    validation_period: str
    mae: float
    rmse: float
    mape_percentage: float
    baseline_model_name: str = "7-Day Simple Moving Average"
    baseline_mape_percentage: float

class ForecastResponse(BaseModel):
    status: str # "SUCCESS" or "INSUFFICIENT_DATA" or "STALE_DATA"
    crop_id: str
    crop_name: str
    variety_id: Optional[str] = None
    variety_name: Optional[str] = None
    mandi_id: str
    mandi_name: str
    current_modal_price: Optional[float] = None
    latest_observation_date: Optional[str] = None
    forecast_horizon_days: int
    predicted_end_price: Optional[float] = None
    price_change_percentage: Optional[float] = None
    metrics: Optional[ModelEvaluationMetrics] = None
    forecast_points: List[DailyForecastPoint] = []
    disclaimer: str
    uncertainty_level: str # "LOW", "MODERATE", "HIGH", "UNAVAILABLE"
    data_points_used: int
    notice: Optional[str] = None
