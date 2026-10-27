-- =====================================================================
-- FARMPRICE AI (Bharat-VISTAAR) — Snowflake Marketplace Integration Schema
-- Database: FARMPRICE_DB | Schema: AGRICULTURE
-- =====================================================================

USE DATABASE FARMPRICE_DB;
USE SCHEMA AGRICULTURE;

-- 1. MARKETPLACE_PROFILES Table
-- Stores comprehensive verified profile data for both farmers and buyers/APMC traders
CREATE TABLE IF NOT EXISTS MARKETPLACE_PROFILES (
    profile_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(30) NOT NULL, -- 'farmer', 'buyer', 'apmc_trader'
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    state VARCHAR(100) DEFAULT 'Karnataka',
    district VARCHAR(100) NOT NULL,
    village_or_town VARCHAR(150),
    business_name VARCHAR(200),
    kisan_card_or_gst VARCHAR(100),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 2. PRODUCE_LISTINGS Table
-- Authoritative, live crop listings entered by farmers or synced from marketplace
CREATE TABLE IF NOT EXISTS PRODUCE_LISTINGS (
    listing_id VARCHAR(64) PRIMARY KEY,
    farmer_id VARCHAR(64) NOT NULL,
    farmer_name VARCHAR(150) NOT NULL,
    farmer_phone VARCHAR(30) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100) DEFAULT 'Standard / Hybrid',
    available_quantity NUMBER(12, 2) NOT NULL,
    initial_quantity NUMBER(12, 2) NOT NULL,
    quantity_unit VARCHAR(30) DEFAULT 'Quintals',
    expected_price NUMBER(10, 2) NOT NULL,
    state VARCHAR(100) DEFAULT 'Karnataka',
    district VARCHAR(100) NOT NULL,
    village_or_town VARCHAR(150) NOT NULL,
    pickup_address VARCHAR(255),
    harvest_date DATE NOT NULL,
    quality_grade VARCHAR(80) DEFAULT 'Grade A / Fair Average',
    listing_status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'
    description VARCHAR(1000),
    photo_url VARCHAR(500),
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT chk_qty_non_negative CHECK (available_quantity >= 0),
    CONSTRAINT chk_price_positive CHECK (expected_price > 0)
);

-- 3. PURCHASE_ENQUIRIES Table
-- Live purchase enquiries submitted by verified buyers / APMC traders
CREATE TABLE IF NOT EXISTS PURCHASE_ENQUIRIES (
    enquiry_id VARCHAR(64) PRIMARY KEY,
    buyer_id VARCHAR(64) NOT NULL,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_phone VARCHAR(30) NOT NULL,
    buyer_company VARCHAR(200),
    listing_id VARCHAR(64) NOT NULL,
    requested_quantity NUMBER(12, 2) NOT NULL,
    offered_price NUMBER(10, 2) NOT NULL,
    enquiry_status VARCHAR(50) DEFAULT 'SUBMITTED', -- 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'
    message VARCHAR(1000),
    farmer_response_note VARCHAR(1000),
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT chk_enq_qty_positive CHECK (requested_quantity > 0),
    CONSTRAINT chk_enq_offered_price_positive CHECK (offered_price > 0)
);

-- Convenient Analytical View: Marketplace Live Listings with Farmer Details
CREATE OR REPLACE VIEW V_LIVE_MARKETPLACE_FEED AS
SELECT 
    l.listing_id,
    l.farmer_id,
    l.farmer_name,
    l.crop_name,
    l.variety,
    l.available_quantity,
    l.initial_quantity,
    l.quantity_unit,
    l.expected_price,
    l.state,
    l.district,
    l.village_or_town,
    l.harvest_date,
    l.quality_grade,
    l.listing_status,
    l.description,
    l.photo_url,
    l.created_at,
    l.updated_at,
    p.business_name AS farmer_farm_name,
    p.is_verified AS farmer_is_verified,
    COUNT(e.enquiry_id) AS total_enquiries_count
FROM PRODUCE_LISTINGS l
LEFT JOIN MARKETPLACE_PROFILES p ON l.farmer_id = p.user_id OR l.farmer_id = p.profile_id
LEFT JOIN PURCHASE_ENQUIRIES e ON l.listing_id = e.listing_id
WHERE l.listing_status IN ('ACTIVE', 'PARTIALLY_FULFILLED')
GROUP BY 
    l.listing_id, l.farmer_id, l.farmer_name, l.crop_name, l.variety,
    l.available_quantity, l.initial_quantity, l.quantity_unit, l.expected_price,
    l.state, l.district, l.village_or_town, l.harvest_date, l.quality_grade,
    l.listing_status, l.description, l.photo_url, l.created_at, l.updated_at,
    p.business_name, p.is_verified;
