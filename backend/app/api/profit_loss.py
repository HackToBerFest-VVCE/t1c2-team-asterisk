from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from backend.app.services.profit_loss_service import profit_loss_service

router = APIRouter(prefix="/profit-loss", tags=["Profit & Loss Calculations and Reporting"])

class ProfitLossCalculationRequest(BaseModel):
    farmer_name: Optional[str] = Field("Farmer", description="Farmer name")
    crop_name: str = Field(..., description="Crop name")
    variety_name: Optional[str] = Field("Standard", description="Variety name")
    origin_name: str = Field("Hassan, Karnataka", description="Farm origin")
    mandi_name: str = Field("Hassan APMC", description="Destination APMC market")
    quantity: float = Field(..., gt=0, description="Sale quantity")
    unit: str = Field("Quintals", description="Unit of measurement")
    sale_price_per_q: float = Field(..., gt=0, description="Applicable sale price per quintal")
    road_distance_km: Optional[float] = Field(None, description="Road transit distance in km")
    transport_rate_per_km_per_q: Optional[float] = Field(0.85, description="Transport rate Rs/km/q")
    transport_expense: Optional[float] = Field(None, description="Direct transport expense override")
    loading_unloading_per_q: Optional[float] = Field(8.0, description="Loading/unloading rate Rs/q")
    apmc_cess_percent: Optional[float] = Field(1.5, description="Statutory APMC cess %")
    weighing_fee_per_q: Optional[float] = Field(3.0, description="Weighing fee Rs/q")
    production_cost_per_q: Optional[float] = Field(0.0, description="Optional cultivation/production cost per quintal")
    user_id: Optional[str] = Field(None, description="Farmer user account ID")

@router.post("/calculate")
def calculate_profit_loss(req: ProfitLossCalculationRequest):
    """
    Executes financial profit/loss calculation.
    Classifies outcome (PROFIT, LOSS, BREAK_EVEN, INCOMPLETE),
    generates prominent bilingual outcome badges, and permanently records calculation.
    """
    try:
        result = profit_loss_service.calculate_and_record(req.model_dump())
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profit/Loss calculation failed: {str(e)}")

@router.get("/history")
def list_profit_loss_history(
    user_id: Optional[str] = Query(None, description="Filter by user account"),
    limit: int = Query(50, ge=1, le=100)
):
    """Retrieves saved profit/loss calculation records."""
    return profit_loss_service.list_history(user_id=user_id, limit=limit)
