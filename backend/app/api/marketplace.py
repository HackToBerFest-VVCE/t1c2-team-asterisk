"""
FARMPRICE AI — Snowflake Marketplace API Endpoints
Authoritatively serves Farmer Produce Listings, Buyer Marketplace Feed, and Purchase Enquiries from Snowflake.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Depends, Header
from backend.app.schemas.marketplace import (
    ProduceListingCreate,
    ProduceListingUpdate,
    ProduceListingResponse,
    PurchaseEnquiryCreate,
    PurchaseEnquiryStatusUpdate,
    PurchaseEnquiryResponse,
    MarketplaceProfileCreate,
    MarketplaceProfileResponse
)
from backend.app.services.marketplace_service import marketplace_service

router = APIRouter(prefix="/marketplace", tags=["Snowflake Agri Marketplace"])

# =====================================================================
# 1. PRODUCE LISTINGS ENDPOINTS
# =====================================================================

@router.get("/listings", response_model=List[ProduceListingResponse])
def get_produce_listings(
    crop_name: Optional[str] = Query(None, description="Filter by crop name (e.g. Tomato, Onion)"),
    district: Optional[str] = Query(None, description="Filter by Karnataka district (e.g. Hassan)"),
    status: Optional[str] = Query(None, description="Listing status: ACTIVE, PARTIALLY_FULFILLED, FULFILLED, CANCELLED"),
    farmer_id: Optional[str] = Query(None, description="Filter by farmer user ID"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """
    GET /api/marketplace/listings
    Fetches real-time produce listings from Snowflake live data warehouse.
    """
    return marketplace_service.get_listings(
        crop_name=crop_name,
        district=district,
        status=status,
        farmer_id=farmer_id,
        min_price=min_price,
        max_price=max_price,
        limit=limit
    )

@router.get("/listings/{listing_id}", response_model=ProduceListingResponse)
def get_produce_listing_detail(listing_id: str):
    """
    GET /api/marketplace/listings/{listing_id}
    Retrieves a single listing from Snowflake.
    """
    return marketplace_service.get_listing_by_id(listing_id)

@router.post("/listings", response_model=ProduceListingResponse, status_code=201)
def create_produce_listing(payload: ProduceListingCreate):
    """
    POST /api/marketplace/listings
    Creates and persists a new crop listing into Snowflake live tables.
    """
    return marketplace_service.create_listing(payload)

@router.put("/listings/{listing_id}", response_model=ProduceListingResponse)
def update_produce_listing(
    listing_id: str,
    payload: ProduceListingUpdate,
    authorization: Optional[str] = Header(None)
):
    """
    PUT /api/marketplace/listings/{listing_id}
    Updates existing listing in Snowflake when farmers edit price, quantity, or status.
    """
    user_id = authorization.replace("Bearer ", "") if authorization else None
    return marketplace_service.update_listing(listing_id, payload, user_id=user_id)

# =====================================================================
# 2. PURCHASE ENQUIRIES ENDPOINTS
# =====================================================================

@router.post("/listings/{listing_id}/enquiry", response_model=PurchaseEnquiryResponse, status_code=201)
def submit_purchase_enquiry(
    listing_id: str,
    payload: PurchaseEnquiryCreate
):
    """
    POST /api/marketplace/listings/{listing_id}/enquiry
    Submits a buyer purchase enquiry to Snowflake.
    Validates requested quantity against available stock and prevents duplicate submissions.
    """
    return marketplace_service.create_purchase_enquiry(listing_id, payload)

@router.get("/enquiries", response_model=List[PurchaseEnquiryResponse])
def get_purchase_enquiries(
    buyer_id: Optional[str] = Query(None, description="Filter by buyer user ID"),
    farmer_id: Optional[str] = Query(None, description="Filter by farmer user ID"),
    listing_id: Optional[str] = Query(None, description="Filter by produce listing ID"),
    status: Optional[str] = Query(None, description="Filter by status: SUBMITTED, ACCEPTED, REJECTED, COMPLETED"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    GET /api/marketplace/enquiries
    Retrieves purchase enquiries from Snowflake.
    """
    return marketplace_service.get_enquiries(
        buyer_id=buyer_id,
        farmer_id=farmer_id,
        listing_id=listing_id,
        status=status,
        limit=limit
    )

@router.get("/enquiries/{enquiry_id}", response_model=PurchaseEnquiryResponse)
def get_purchase_enquiry_detail(enquiry_id: str):
    """
    GET /api/marketplace/enquiries/{enquiry_id}
    Retrieves a single purchase enquiry from Snowflake.
    """
    return marketplace_service.get_enquiry_by_id(enquiry_id)

@router.put("/enquiries/{enquiry_id}/status", response_model=PurchaseEnquiryResponse)
def update_purchase_enquiry_status(
    enquiry_id: str,
    payload: PurchaseEnquiryStatusUpdate,
    authorization: Optional[str] = Header(None)
):
    """
    PUT /api/marketplace/enquiries/{enquiry_id}/status
    Updates enquiry status in Snowflake. If ACCEPTED, decrements available quantity in Snowflake.
    """
    user_id = authorization.replace("Bearer ", "") if authorization else None
    return marketplace_service.update_enquiry_status(enquiry_id, payload, user_id=user_id)

# =====================================================================
# 3. PROFILES ENDPOINTS
# =====================================================================

@router.get("/profiles", response_model=List[MarketplaceProfileResponse])
def get_marketplace_profiles(
    role: Optional[str] = Query(None, description="farmer or buyer"),
    district: Optional[str] = Query(None, description="Filter by district")
):
    """
    GET /api/marketplace/profiles
    Fetches verified farmer and buyer profiles from Snowflake.
    """
    return marketplace_service.get_profiles(role=role, district=district)

@router.post("/profiles", response_model=MarketplaceProfileResponse)
def upsert_marketplace_profile(payload: MarketplaceProfileCreate):
    """
    POST /api/marketplace/profiles
    Creates or updates farmer/buyer profile in Snowflake.
    """
    return marketplace_service.upsert_profile(payload)
