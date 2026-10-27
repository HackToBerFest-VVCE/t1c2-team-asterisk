"""
FARMPRICE AI — Marketplace Pydantic Schemas
Validates Produce Listings, Buyer Purchase Enquiries, and Marketplace Profiles.
"""

from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field, field_validator

# =====================================================================
# PROFILES
# =====================================================================

class MarketplaceProfileBase(BaseModel):
    user_id: str = Field(..., description="Unique user handle or identifier (e.g. usr_chethan)")
    role: str = Field("farmer", description="'farmer', 'buyer', or 'apmc_trader'")
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=7, max_length=30)
    email: Optional[str] = Field(None, max_length=150)
    state: str = Field("Karnataka", max_length=100)
    district: str = Field(..., max_length=100)
    village_or_town: Optional[str] = Field(None, max_length=150)
    business_name: Optional[str] = Field(None, max_length=200)
    kisan_card_or_gst: Optional[str] = Field(None, max_length=100)
    is_verified: bool = True

class MarketplaceProfileCreate(MarketplaceProfileBase):
    pass

class MarketplaceProfileResponse(MarketplaceProfileBase):
    profile_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# =====================================================================
# PRODUCE LISTINGS
# =====================================================================

class ProduceListingCreate(BaseModel):
    farmer_id: str = Field(..., description="Farmer user_id or profile_id")
    farmer_name: str = Field(..., min_length=2, max_length=150)
    farmer_phone: str = Field(..., min_length=7, max_length=30)
    crop_name: str = Field(..., min_length=2, max_length=100)
    variety: Optional[str] = Field("Standard / Hybrid", max_length=100)
    available_quantity: float = Field(..., gt=0, description="Available quantity must be greater than zero")
    quantity_unit: str = Field("Quintals", max_length=30)
    expected_price: float = Field(..., gt=0, description="Expected price per unit must be greater than zero")
    state: str = Field("Karnataka", max_length=100)
    district: str = Field(..., max_length=100)
    village_or_town: str = Field(..., max_length=150)
    pickup_address: Optional[str] = Field(None, max_length=255)
    harvest_date: str = Field(..., description="Harvest date in YYYY-MM-DD")
    quality_grade: Optional[str] = Field("Grade A / Fair Average", max_length=80)
    description: Optional[str] = Field(None, max_length=1000)
    photo_url: Optional[str] = Field(None, max_length=500)

    @field_validator("available_quantity")
    @classmethod
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("Available quantity must be strictly greater than 0")
        return round(float(v), 2)

    @field_validator("expected_price")
    @classmethod
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError("Expected price must be strictly greater than 0")
        return round(float(v), 2)

class ProduceListingUpdate(BaseModel):
    crop_name: Optional[str] = None
    variety: Optional[str] = None
    available_quantity: Optional[float] = Field(None, ge=0)
    expected_price: Optional[float] = Field(None, gt=0)
    district: Optional[str] = None
    village_or_town: Optional[str] = None
    pickup_address: Optional[str] = None
    harvest_date: Optional[str] = None
    quality_grade: Optional[str] = None
    listing_status: Optional[str] = Field(None, description="'ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'")
    description: Optional[str] = None
    photo_url: Optional[str] = None

class ProduceListingResponse(BaseModel):
    listing_id: str
    farmer_id: str
    farmer_name: str
    farmer_phone: str
    crop_name: str
    variety: str
    available_quantity: float
    initial_quantity: float
    quantity_unit: str
    expected_price: float
    state: str
    district: str
    village_or_town: str
    pickup_address: Optional[str] = None
    harvest_date: str
    quality_grade: str
    listing_status: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    enquiries_count: Optional[int] = 0
    farmer_farm_name: Optional[str] = None
    farmer_is_verified: Optional[bool] = True

# =====================================================================
# PURCHASE ENQUIRIES
# =====================================================================

class PurchaseEnquiryCreate(BaseModel):
    buyer_id: str = Field(..., description="Buyer user_id or profile_id")
    buyer_name: str = Field(..., min_length=2, max_length=150)
    buyer_phone: str = Field(..., min_length=7, max_length=30)
    buyer_company: Optional[str] = Field(None, max_length=200)
    requested_quantity: float = Field(..., gt=0, description="Requested quantity must be strictly greater than zero")
    offered_price: float = Field(..., gt=0, description="Offered price must be strictly greater than zero")
    message: Optional[str] = Field(None, max_length=1000)

    @field_validator("requested_quantity")
    @classmethod
    def validate_requested_quantity(cls, v):
        if v <= 0:
            raise ValueError("Requested quantity must be strictly greater than 0")
        return round(float(v), 2)

    @field_validator("offered_price")
    @classmethod
    def validate_offered_price(cls, v):
        if v <= 0:
            raise ValueError("Offered price must be strictly greater than 0")
        return round(float(v), 2)

class PurchaseEnquiryStatusUpdate(BaseModel):
    enquiry_status: str = Field(..., description="'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'")
    farmer_response_note: Optional[str] = Field(None, max_length=1000)

class PurchaseEnquiryResponse(BaseModel):
    enquiry_id: str
    buyer_id: str
    buyer_name: str
    buyer_phone: str
    buyer_company: Optional[str] = None
    listing_id: str
    requested_quantity: float
    offered_price: float
    enquiry_status: str
    message: Optional[str] = None
    farmer_response_note: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    crop_name: Optional[str] = None
    farmer_id: Optional[str] = None
    farmer_name: Optional[str] = None
    quantity_unit: Optional[str] = "Quintals"
    listing_expected_price: Optional[float] = None
