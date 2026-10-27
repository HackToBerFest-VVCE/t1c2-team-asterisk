from typing import List, Optional
from pydantic import BaseModel, Field

class CropSchema(BaseModel):
    crop_id: str
    crop_name: str
    crop_name_kannada: Optional[str] = None
    category: Optional[str] = None
    is_perishable: bool = False
    standard_unit: str = "Quintal"

class VarietySchema(BaseModel):
    variety_id: str
    crop_id: str
    variety_name: str
    variety_name_kannada: Optional[str] = None
    description: Optional[str] = None

class MandiSchema(BaseModel):
    mandi_id: str
    mandi_name: str
    mandi_name_kannada: Optional[str] = None
    district: str
    state: str
    latitude: float
    longitude: float
    apmc_cess_percentage: float = 1.5
    weighing_fee_per_q: float = 3.0
    has_cold_storage: bool = False
    operating_days: str = "Mon-Sat"

class MarketComparisonRequest(BaseModel):
    crop_id: str
    variety_id: Optional[str] = None
    quantity: float = Field(..., gt=0, description="Quantity to sell")
    unit: str = Field("quintals", description="'quintals' or 'kg'")
    origin_latitude: Optional[float] = 13.0033
    origin_longitude: Optional[float] = 76.1004
    origin_name: Optional[str] = "Hassan, Karnataka"
    selling_date: Optional[str] = "2026-10-24"
    max_distance_km: Optional[float] = 250.0
    custom_transport_rate_per_km_q: Optional[float] = None
    custom_loading_per_q: Optional[float] = None

class MandiComparisonItem(BaseModel):
    mandi_id: str
    mandi_name: str
    mandi_name_kannada: Optional[str] = None
    district: str
    state: str
    observation_date: str
    min_price_per_q: float
    modal_price_per_q: float
    max_price_per_q: float
    arrival_quantity_tonnes: Optional[float] = None
    
    # Distance & Costs
    straight_line_distance_km: float
    estimated_road_distance_km: float
    distance_method: str = "Road estimate (1.25x curvature factor)"
    
    # Calculated Financials
    gross_sale_value: float
    transport_expense: float
    loading_expense: float
    market_fees: float
    other_expenses: float
    total_expenses: float
    estimated_net_return: float
    net_return_per_quintal: float
    break_even_price_per_q: float
    
    # Ranking & Badges
    rank: int
    is_best_net_return: bool = False
    is_highest_price: bool = False
    price_difference_from_best: float
    net_return_difference_from_best: float
    
    # Trend Detection Integration
    trend_classification: str = "STABLE"
    trend_evidence: Optional[str] = None

    # Data Quality & Explainability
    data_source: str = "AGMARKNET"
    data_quality_status: str = "VERIFIED"
    staleness_days: int = 0
    recommendation_reasons: List[str]
    missing_info_notices: List[str] = []

class MarketComparisonResponse(BaseModel):
    crop_id: str
    crop_name: str
    variety_id: Optional[str] = None
    variety_name: Optional[str] = None
    quantity_quintals: float
    origin_name: str
    comparison_date: str
    total_eligible_mandis: int
    data_mode: str
    best_mandi_id: Optional[str] = None
    best_mandi_name: Optional[str] = None
    highest_listed_price_mandi_id: Optional[str] = None
    mandis: List[MandiComparisonItem]
    data_quality_notice: Optional[str] = None

# Feature 1: Daily Mandi Prices Explorer Schemas
class DailyPriceRecordItem(BaseModel):
    fact_id: str
    mandi_id: str
    mandi_name: str
    district: str
    state: str
    crop_id: str
    crop_name: str
    variety_name: str
    observation_date: str
    min_price_per_q: float
    modal_price_per_q: float
    max_price_per_q: float
    arrival_quantity_tonnes: Optional[float] = None
    price_unit: str = "₹ / Quintal"
    data_source: str = "AGMARKNET"
    source_record_id: Optional[str] = None
    retrieval_timestamp: str
    data_quality_status: str
    is_stale: bool = False
    staleness_days: int = 0

class DailyPricesExplorerResponse(BaseModel):
    total_records: int
    page: int
    page_size: int
    freshness_timestamp: str
    data_mode: str
    data_source: str
    records: List[DailyPriceRecordItem]
    available_states: List[str]
    available_districts: List[str]
    available_crops: List[str]
    available_mandis: List[str]
