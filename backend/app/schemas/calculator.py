from typing import Optional, Dict
from pydantic import BaseModel, Field, field_validator

class NetReturnCalculationRequest(BaseModel):
    crop_id: str
    variety_id: Optional[str] = None
    quantity: float = Field(..., gt=0, description="Available quantity to sell")
    unit: str = Field("quintals", description="'quintals' or 'kg'")
    applicable_price_per_q: float = Field(..., gt=0, description="Price in Rs per Quintal")
    
    # Distance / Transport
    distance_km: Optional[float] = Field(None, ge=0, description="Road distance to mandi")
    transport_rate_per_km_per_q: Optional[float] = Field(None, ge=0, description="Transport rate per km per quintal")
    manual_transport_cost: Optional[float] = Field(None, ge=0, description="Flat transport cost override")
    
    # Labor & Loading
    loading_unloading_per_q: Optional[float] = Field(None, ge=0, description="Labor per quintal")
    manual_loading_cost: Optional[float] = Field(None, ge=0, description="Flat labor cost override")
    
    # APMC Cess / Mandi fees
    market_cess_percent: Optional[float] = Field(None, ge=0, le=100, description="APMC cess percentage (e.g. 1.5%)")
    manual_market_fees: Optional[float] = Field(None, ge=0, description="Flat mandi fees override")
    
    # Packaging, Storage, Weighing, and Custom User-Defined Expenses
    packaging_cost: Optional[float] = Field(0.0, ge=0, description="Crates, gunny bags, packaging")
    storage_cost: Optional[float] = Field(0.0, ge=0, description="Short-term holding / cold store charges")
    weighing_fee: Optional[float] = Field(0.0, ge=0, description="Weighbridge operator charge")
    other_expenses: Optional[float] = Field(0.0, ge=0, description="Miscellaneous charges")
    production_cost_per_q: Optional[float] = Field(None, ge=0, description="Optional farm gate production cost per quintal")

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        v_clean = v.lower().strip()
        if v_clean not in ("quintals", "quintal", "q", "kg", "kilograms"):
            raise ValueError("Unit must be either 'quintals' ('q') or 'kg' ('kilograms')")
        return v_clean

class CostBreakdown(BaseModel):
    transport_cost: float
    loading_unloading_cost: float
    market_fees: float
    packaging_cost: float = 0.0
    storage_cost: float = 0.0
    weighing_fee: float = 0.0
    other_expenses: float
    total_expenses: float
    total_expenses_per_q: float
    total_expenses_per_kg: float

class NetReturnCalculationResponse(BaseModel):
    quantity_quintals: float
    quantity_kg: float
    applicable_price_per_q: float
    applicable_price_per_kg: float
    gross_sale_value: float
    costs: CostBreakdown
    estimated_net_return: float
    net_return_per_quintal: float
    net_return_per_kg: float
    break_even_price_per_q: float
    break_even_price_per_kg: float
    is_profitable: bool
    assumptions_note: str
    selling_guarantee_disclaimer: str = (
        "Notice: Calculated returns are transparent estimates based on input expenses and market price references. "
        "FARMPRICE AI does not guarantee future selling prices, buyers, or final realization."
    )
