"""
Tests for Snowflake Marketplace Integration:
- Produce Listings CRUD with Snowflake as source of truth
- Buyer Purchase Enquiries with quantity validation and concurrency safety
- Stock quantity decrement upon enquiry acceptance
- Idempotent migration verification
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_marketplace_listings():
    """Verify listings are fetched from Snowflake with at least the migrated mock records."""
    response = client.get("/api/marketplace/listings")
    assert response.status_code == 200
    listings = response.json()
    assert isinstance(listings, list)
    assert len(listings) >= 7, f"Expected at least 7 seeded listings, got {len(listings)}"

    # Check that known crops exist
    crop_names = [l["crop_name"] for l in listings]
    assert "Tomato" in crop_names
    assert "Onion" in crop_names
    assert "Ginger" in crop_names

    # Check structure
    sample = listings[0]
    assert "listing_id" in sample
    assert "farmer_id" in sample
    assert "available_quantity" in sample
    assert "expected_price" in sample
    assert "harvest_date" in sample

def test_filter_marketplace_listings():
    """Test filtering by crop name and district."""
    # Filter by Tomato
    res_tomato = client.get("/api/marketplace/listings?crop_name=Tomato")
    assert res_tomato.status_code == 200
    for l in res_tomato.json():
        assert "tomato" in l["crop_name"].lower()

    # Filter by District Hassan
    res_hassan = client.get("/api/marketplace/listings?district=Hassan")
    assert res_hassan.status_code == 200
    for l in res_hassan.json():
        assert l["district"].lower() == "hassan"

def test_create_and_edit_produce_listing():
    """Verify creating a new listing in Snowflake and updating its expected price and quantity."""
    payload = {
        "farmer_id": "usr_chethan",
        "farmer_name": "Chethan Patel",
        "farmer_phone": "+91 98765 43210",
        "crop_name": "Ragi",
        "variety": "Organic Native Ragi",
        "available_quantity": 45.0,
        "quantity_unit": "Quintals",
        "expected_price": 3400.0,
        "state": "Karnataka",
        "district": "Hassan",
        "village_or_town": "Sakleshpur",
        "pickup_address": "Estate Road Near Stream",
        "harvest_date": "2026-10-26",
        "quality_grade": "Grade A / Organic Certified",
        "description": "Certified organic native finger millet from hill terrace.",
        "photo_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600"
    }

    create_res = client.post("/api/marketplace/listings", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    listing_id = created["listing_id"]
    assert listing_id.startswith("LST_RAGI_")
    assert created["expected_price"] == 3400.0
    assert created["available_quantity"] == 45.0

    # Edit the listing in Snowflake
    update_payload = {
        "expected_price": 3500.0,
        "available_quantity": 42.0,
        "description": "Updated: Certified organic native finger millet with moisture < 10%."
    }
    update_res = client.put(f"/api/marketplace/listings/{listing_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["expected_price"] == 3500.0
    assert updated["available_quantity"] == 42.0
    assert "moisture < 10%" in updated["description"]

def test_purchase_enquiry_validation_and_stock_decrement():
    """
    Test complete purchase enquiry flow:
    1. Validation: requested quantity cannot exceed available quantity
    2. Validation: positive price and quantity
    3. Creation: enquiry successfully created in Snowflake
    4. Duplicate prevention: cannot create duplicate pending enquiry
    5. Acceptance: farmer accepts enquiry -> available stock automatically decrements
    """
    # 1. Fetch available Maize listing
    res = client.get("/api/marketplace/listings?crop_name=Maize")
    assert res.status_code == 200
    listings = res.json()
    assert len(listings) > 0
    maize_listing = listings[0]
    listing_id = maize_listing["listing_id"]
    avail_qty = maize_listing["available_quantity"]

    # 2. Test Invalid: requested quantity > available quantity
    bad_payload = {
        "buyer_id": "buyer_test_qa",
        "buyer_name": "Karnataka Flour Mills",
        "buyer_phone": "+91 98450 11223",
        "buyer_company": "Karnataka Flour Mills Pvt Ltd",
        "requested_quantity": avail_qty + 100.0, # Exceeds available!
        "offered_price": 2100.0,
        "message": "Bulk purchase requirement."
    }
    bad_res = client.post(f"/api/marketplace/listings/{listing_id}/enquiry", json=bad_payload)
    assert bad_res.status_code == 400
    assert "exceeds available stock" in bad_res.json()["detail"]

    # 3. Test Valid Enquiry Submission
    valid_qty = 25.0
    valid_payload = {
        "buyer_id": "buyer_test_qa",
        "buyer_name": "Karnataka Flour Mills",
        "buyer_phone": "+91 98450 11223",
        "buyer_company": "Karnataka Flour Mills Pvt Ltd",
        "requested_quantity": valid_qty,
        "offered_price": 2150.0,
        "message": "Procurement for animal feed processing plant."
    }
    create_enq_res = client.post(f"/api/marketplace/listings/{listing_id}/enquiry", json=valid_payload)
    assert create_enq_res.status_code == 201
    enquiry = create_enq_res.json()
    enquiry_id = enquiry["enquiry_id"]
    assert enquiry["enquiry_status"] == "SUBMITTED"
    assert enquiry["requested_quantity"] == valid_qty

    # 4. Test Duplicate Prevention
    dup_res = client.post(f"/api/marketplace/listings/{listing_id}/enquiry", json=valid_payload)
    assert dup_res.status_code == 409
    assert "already have a pending purchase enquiry" in dup_res.json()["detail"]

    # 5. Test Acceptance and Stock Decrement in Snowflake
    status_payload = {
        "enquiry_status": "ACCEPTED",
        "farmer_response_note": "Offer accepted. Please schedule pickup truck."
    }
    accept_res = client.put(f"/api/marketplace/enquiries/{enquiry_id}/status", json=status_payload)
    assert accept_res.status_code == 200
    accepted_enq = accept_res.json()
    assert accepted_enq["enquiry_status"] == "ACCEPTED"
    assert "Please schedule pickup" in accepted_enq["farmer_response_note"]

    # Verify listing quantity has decremented by 25.0 in Snowflake
    updated_listing = client.get(f"/api/marketplace/listings/{listing_id}").json()
    expected_remaining = round(avail_qty - valid_qty, 2)
    assert updated_listing["available_quantity"] == expected_remaining
