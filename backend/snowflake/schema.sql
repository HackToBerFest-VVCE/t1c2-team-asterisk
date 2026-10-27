-- =====================================================================
-- FARMPRICE AI (Bharat-VISTAAR) — Snowflake Data Warehouse Architecture
-- Multi-Layer Data Model: Raw -> Staging -> Curated Analytics
-- =====================================================================

-- Database & Schema setup
CREATE DATABASE IF NOT EXISTS FARMPRICE_DB;
USE DATABASE FARMPRICE_DB;

CREATE SCHEMA IF NOT EXISTS RAW;
CREATE SCHEMA IF NOT EXISTS STAGING;
CREATE SCHEMA IF NOT EXISTS ANALYTICS;
CREATE SCHEMA IF NOT EXISTS AGRICULTURE;

-- =====================================================================
-- 0. AGRICULTURE SCHEMA: Core Analytical & Crop Recommendation Tables
-- =====================================================================
USE SCHEMA AGRICULTURE;

-- 0.1 Canonical Mandi Prices Table (AGMARKNET / data.gov.in)
CREATE TABLE IF NOT EXISTS MANDI_PRICES (
    mandi_price_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    observation_date DATE NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    market VARCHAR(150) NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    variety VARCHAR(100) DEFAULT 'Standard',
    grade VARCHAR(50) DEFAULT 'FAQ',
    min_price NUMBER(10, 2),
    max_price NUMBER(10, 2),
    modal_price NUMBER(10, 2) NOT NULL,
    arrival_quantity NUMBER(12, 2) DEFAULT 0.0,
    source VARCHAR(100) DEFAULT 'AGMARKNET',
    source_updated_at VARCHAR(100),
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_mandi_prices_obs UNIQUE (state, district, market, commodity, variety, grade, observation_date)
);

-- 0.2 Crop Requirements Table (ICAR / UAS Bengaluru)
CREATE TABLE IF NOT EXISTS CROP_REQUIREMENTS (
    crop_id VARCHAR(64) PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    crop_name_kannada VARCHAR(100),
    scientific_name VARCHAR(150),
    category VARCHAR(50) NOT NULL, -- 'Vegetables', 'Fruits', 'Cereals', 'Pulses', 'Oilseeds', 'Commercial'
    min_temp_c NUMBER(5, 2) NOT NULL,
    max_temp_c NUMBER(5, 2) NOT NULL,
    opt_temp_min_c NUMBER(5, 2) NOT NULL,
    opt_temp_max_c NUMBER(5, 2) NOT NULL,
    min_rainfall_mm NUMBER(8, 2) DEFAULT 400.0,
    max_rainfall_mm NUMBER(8, 2) DEFAULT 1200.0,
    min_soil_ph NUMBER(4, 2) NOT NULL DEFAULT 5.5,
    max_soil_ph NUMBER(4, 2) NOT NULL DEFAULT 7.5,
    soil_type VARCHAR(150) DEFAULT 'Well-drained Red Loam / Sandy Loam',
    water_needs VARCHAR(30) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Very High'
    growing_days_min INT NOT NULL,
    growing_days_max INT NOT NULL,
    season VARCHAR(100) NOT NULL, -- 'Kharif', 'Rabi', 'Summer', 'Year-Round'
    recommended_planting_months VARCHAR(100),
    suitable_zones VARCHAR(255),
    weather_sensitivities VARCHAR(255),
    source VARCHAR(100) DEFAULT 'ICAR & UAS Bengaluru Package of Practices',
    source_url VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'VERIFIED_SCIENTIFIC',
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_crop_name UNIQUE (crop_name)
);

-- 0.3 Weather History Table (Open-Meteo)
CREATE TABLE IF NOT EXISTS WEATHER_HISTORY (
    history_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    location_id VARCHAR(64) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Karnataka',
    latitude NUMBER(9, 6) NOT NULL,
    longitude NUMBER(9, 6) NOT NULL,
    observation_date DATE NOT NULL,
    temp_max_c NUMBER(5, 2),
    temp_min_c NUMBER(5, 2),
    temp_mean_c NUMBER(5, 2),
    precipitation_mm NUMBER(7, 2) DEFAULT 0.0,
    relative_humidity_pct INT,
    wind_speed_kmh NUMBER(5, 2),
    weather_code INT,
    weather_condition VARCHAR(100),
    provider VARCHAR(100) DEFAULT 'Open-Meteo',
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_weather_history_obs UNIQUE (district, observation_date, provider)
);

-- 0.4 Weather Forecast Table (Open-Meteo 7-day numerical forecast)
CREATE TABLE IF NOT EXISTS WEATHER_FORECAST (
    forecast_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    location_id VARCHAR(64) NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Karnataka',
    latitude NUMBER(9, 6) NOT NULL,
    longitude NUMBER(9, 6) NOT NULL,
    forecast_date DATE NOT NULL,
    horizon_days INT NOT NULL,
    predicted_temp_max_c NUMBER(5, 2),
    predicted_temp_min_c NUMBER(5, 2),
    precipitation_mm NUMBER(7, 2) DEFAULT 0.0,
    precipitation_probability_pct INT DEFAULT 0,
    weather_condition VARCHAR(100),
    provider VARCHAR(100) DEFAULT 'Open-Meteo',
    ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_weather_forecast UNIQUE (district, forecast_date, horizon_days, provider)
);

-- 0.5 Crop Yield History Table (DA&FW / DES Karnataka District Statistics)
CREATE TABLE IF NOT EXISTS CROP_YIELD_HISTORY (
    yield_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Karnataka',
    season VARCHAR(50) NOT NULL, -- 'Kharif', 'Rabi', 'Summer', 'Annual'
    reference_year VARCHAR(20) NOT NULL,
    area_hectares NUMBER(12, 2),
    production_tonnes NUMBER(12, 2),
    yield_kg_per_hectare NUMBER(10, 2) NOT NULL,
    yield_quintals_per_acre NUMBER(10, 2) NOT NULL, -- 1 ha = 2.47105 acres; 1 quintal = 100 kg
    source VARCHAR(100) DEFAULT 'Department of Agriculture and Farmers Welfare (DA&FW)',
    verification_status VARCHAR(50) DEFAULT 'OFFICIALLY_PUBLISHED',
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_crop_yield_obs UNIQUE (crop_name, district, season, reference_year)
);

-- 0.6 Cultivation Costs Table (CACP & UAS Bengaluru Package of Practices)
CREATE TABLE IF NOT EXISTS CULTIVATION_COSTS (
    cost_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    season VARCHAR(50) NOT NULL,
    reference_year VARCHAR(20) NOT NULL,
    seed_cost_per_acre NUMBER(10, 2) NOT NULL,
    fertilizer_cost_per_acre NUMBER(10, 2) NOT NULL,
    labour_cost_per_acre NUMBER(10, 2) NOT NULL,
    irrigation_cost_per_acre NUMBER(10, 2) NOT NULL,
    crop_protection_cost_per_acre NUMBER(10, 2) NOT NULL,
    machinery_tillage_cost_per_acre NUMBER(10, 2) NOT NULL,
    harvesting_cost_per_acre NUMBER(10, 2) NOT NULL,
    packaging_transport_cost_per_acre NUMBER(10, 2) NOT NULL,
    total_cost_per_acre NUMBER(10, 2) NOT NULL,
    source VARCHAR(100) DEFAULT 'UAS Bengaluru & CACP Cost of Cultivation Studies',
    verification_type VARCHAR(50) DEFAULT 'UNIVERSITY_PACKAGE_OF_PRACTICES',
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_cultivation_cost UNIQUE (crop_name, district, season, reference_year)
);

-- 0.7 Unified Recommendation & Crop Profit Analysis Table
CREATE TABLE IF NOT EXISTS CROP_PROFIT_ANALYSIS (
    analysis_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    location_name VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    planting_window VARCHAR(100) NOT NULL,
    expected_harvest_date DATE,
    suitability_score NUMBER(5, 2) NOT NULL, -- 0 to 100
    weather_score NUMBER(5, 2) NOT NULL,     -- 0 to 100
    expected_yield_q_acre NUMBER(8, 2) NOT NULL,
    expected_selling_price_per_q NUMBER(10, 2) NOT NULL,
    estimated_cultivation_cost_acre NUMBER(10, 2) NOT NULL,
    estimated_transport_cost_acre NUMBER(10, 2) NOT NULL,
    expected_gross_revenue_acre NUMBER(12, 2) NOT NULL,
    expected_net_profit_acre NUMBER(12, 2) NOT NULL,
    conservative_profit_acre NUMBER(12, 2) NOT NULL,
    optimistic_profit_acre NUMBER(12, 2) NOT NULL,
    break_even_price_per_q NUMBER(10, 2) NOT NULL,
    best_mandi_name VARCHAR(150),
    best_mandi_distance_km NUMBER(6, 1),
    confidence_score NUMBER(4, 2) NOT NULL, -- 0.00 to 1.00
    risk_factors VARCHAR(500),
    analyzed_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 0.8 Data Source Audit Log Table
CREATE TABLE IF NOT EXISTS DATA_SOURCE_LOG (
    log_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    dataset_name VARCHAR(100) NOT NULL,
    records_ingested INT DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    coverage_summary VARCHAR(255),
    logged_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- =====================================================================
-- 1. RAW LAYER: Ingestion Landing Tables
-- Preserves raw payloads directly from AGMARKNET / data.gov.in APIs
-- =====================================================================
USE SCHEMA RAW;

CREATE TABLE IF NOT EXISTS RAW_MARKET_ARRIVALS (
    raw_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    source_record_id VARCHAR(100),
    state_name VARCHAR(100),
    district_name VARCHAR(100),
    market_name VARCHAR(150),
    commodity_name VARCHAR(100),
    variety_name VARCHAR(100),
    arrival_date VARCHAR(30),
    min_price_str VARCHAR(50),
    max_price_str VARCHAR(50),
    modal_price_str VARCHAR(50),
    arrival_quantity_str VARCHAR(50),
    unit VARCHAR(50),
    ingestion_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    ingestion_status VARCHAR(20) DEFAULT 'RECEIVED'
);

-- =====================================================================
-- 2. STAGING LAYER: Cleaned, Deduplicated & Validated Records
-- =====================================================================
USE SCHEMA STAGING;

CREATE TABLE IF NOT EXISTS STG_MARKET_PRICES (
    staging_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    raw_id VARCHAR(64),
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    market VARCHAR(150) NOT NULL,
    crop VARCHAR(100) NOT NULL,
    variety VARCHAR(100) NOT NULL,
    observation_date DATE NOT NULL,
    min_price_per_q NUMBER(10, 2),
    max_price_per_q NUMBER(10, 2),
    modal_price_per_q NUMBER(10, 2) NOT NULL,
    arrival_quantity_tonnes NUMBER(12, 2),
    data_quality_score NUMBER(3, 2) DEFAULT 1.0,
    is_anomaly BOOLEAN DEFAULT FALSE,
    validation_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT unique_market_observation UNIQUE (market, crop, variety, observation_date)
);

-- =====================================================================
-- 3. ANALYTICS LAYER: Curated Dimensions and Fact Tables
-- =====================================================================
USE SCHEMA ANALYTICS;

-- Geography Dimension
CREATE TABLE IF NOT EXISTS DIM_GEOGRAPHY (
    geo_id VARCHAR(32) PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100),
    pincode VARCHAR(10),
    latitude NUMBER(9, 6),
    longitude NUMBER(9, 6)
);

-- Crop & Variety Dimension
CREATE TABLE IF NOT EXISTS DIM_CROPS (
    crop_id VARCHAR(32) PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    crop_name_kannada VARCHAR(100),
    category VARCHAR(50),
    is_perishable BOOLEAN DEFAULT FALSE,
    standard_unit VARCHAR(20) DEFAULT 'Quintal'
);

CREATE TABLE IF NOT EXISTS DIM_VARIETIES (
    variety_id VARCHAR(32) PRIMARY KEY,
    crop_id VARCHAR(32) REFERENCES DIM_CROPS(crop_id),
    variety_name VARCHAR(100) NOT NULL,
    variety_name_kannada VARCHAR(100),
    description VARCHAR(255)
);

-- Mandi Dimension
CREATE TABLE IF NOT EXISTS DIM_MANDIS (
    mandi_id VARCHAR(32) PRIMARY KEY,
    mandi_name VARCHAR(150) NOT NULL,
    mandi_name_kannada VARCHAR(150),
    geo_id VARCHAR(32) REFERENCES DIM_GEOGRAPHY(geo_id),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude NUMBER(9, 6) NOT NULL,
    longitude NUMBER(9, 6) NOT NULL,
    apmc_cess_percentage NUMBER(4, 2) DEFAULT 1.5,
    weighing_fee_per_q NUMBER(6, 2) DEFAULT 3.0,
    has_cold_storage BOOLEAN DEFAULT FALSE,
    operating_days VARCHAR(100) DEFAULT 'Mon-Sat'
);

-- Curated Fact Table: Daily Market Prices
CREATE TABLE IF NOT EXISTS FACT_DAILY_MARKET_PRICES (
    fact_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    mandi_id VARCHAR(32) REFERENCES DIM_MANDIS(mandi_id),
    crop_id VARCHAR(32) REFERENCES DIM_CROPS(crop_id),
    variety_id VARCHAR(32) REFERENCES DIM_VARIETIES(variety_id),
    observation_date DATE NOT NULL,
    min_price_per_q NUMBER(10, 2),
    modal_price_per_q NUMBER(10, 2) NOT NULL,
    max_price_per_q NUMBER(10, 2),
    arrival_quantity_tonnes NUMBER(12, 2),
    data_source VARCHAR(100) DEFAULT 'AGMARKNET',
    provenance_record_id VARCHAR(100),
    data_quality_status VARCHAR(20) DEFAULT 'VERIFIED',
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT uq_mandi_crop_date UNIQUE (mandi_id, crop_id, variety_id, observation_date)
);

-- Data Quality Audit Log
CREATE TABLE IF NOT EXISTS DATA_QUALITY_AUDIT (
    audit_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    run_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    records_evaluated INT,
    duplicates_detected INT,
    anomalies_flagged INT,
    stale_records_found INT,
    audit_notes VARCHAR(500)
);

-- Synchronization Batch Audit & Telemetry History
CREATE TABLE IF NOT EXISTS SYNC_BATCH_HISTORY (
    batch_id VARCHAR(64) PRIMARY KEY,
    trigger_type VARCHAR(30) NOT NULL, -- 'MANUAL', 'SCHEDULED', 'BACKFILL'
    source_name VARCHAR(100) NOT NULL,
    state_filter VARCHAR(100),
    commodity_filter VARCHAR(100),
    date_from VARCHAR(30),
    date_to VARCHAR(30),
    records_fetched INT DEFAULT 0,
    records_inserted INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_duplicate INT DEFAULT 0,
    records_rejected INT DEFAULT 0,
    status VARCHAR(30) NOT NULL, -- 'SUCCESS', 'PARTIAL', 'FAILED'
    error_message VARCHAR(1000),
    started_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    completed_at TIMESTAMP_NTZ
);

-- Analytical Marketplace Supply & Direct Procurement Facts
CREATE TABLE IF NOT EXISTS FACT_MARKETPLACE_LISTINGS (
    listing_id VARCHAR(64) PRIMARY KEY,
    crop_id VARCHAR(32),
    crop_name VARCHAR(100),
    variety_name VARCHAR(100),
    quantity NUMBER(12, 2),
    quantity_unit VARCHAR(30),
    expected_price_per_unit NUMBER(10, 2),
    district VARCHAR(100),
    state VARCHAR(100),
    quality_grade VARCHAR(50),
    is_organic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS FACT_PROCUREMENT_CONFIRMATIONS (
    confirmation_id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) UNIQUE NOT NULL,
    yard_id VARCHAR(64) NOT NULL,
    agreed_price_per_unit NUMBER(10, 2) NOT NULL,
    total_estimated_value NUMBER(14, 2) NOT NULL,
    confirmed_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);



-- Model Forecast Evaluation Metrics
CREATE TABLE IF NOT EXISTS FORECAST_EVALUATION_METRICS (
    eval_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    crop_id VARCHAR(32),
    mandi_id VARCHAR(32),
    train_start_date DATE,
    train_end_date DATE,
    test_start_date DATE,
    test_end_date DATE,
    mae NUMBER(8, 2),
    rmse NUMBER(8, 2),
    mape NUMBER(5, 2),
    baseline_mape NUMBER(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Weather Intelligence Analytical Fact Tables
CREATE TABLE IF NOT EXISTS FACT_WEATHER_OBSERVATIONS (
    obs_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    location_reference VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Karnataka',
    latitude NUMBER(8, 4),
    longitude NUMBER(8, 4),
    provider VARCHAR(100) NOT NULL,
    temperature_celsius NUMBER(5, 2),
    apparent_temperature_celsius NUMBER(5, 2),
    relative_humidity_pct NUMBER(3, 0),
    precipitation_mm NUMBER(6, 2),
    rain_chance_pct NUMBER(3, 0),
    wind_speed_kmh NUMBER(5, 2),
    weather_condition VARCHAR(100),
    weather_code NUMBER(4, 0),
    observation_timestamp TIMESTAMP_NTZ,
    retrieval_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    source_attribution VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS FACT_WEATHER_FORECAST_SNAPSHOTS (
    snapshot_id VARCHAR(64) DEFAULT UUID_STRING() PRIMARY KEY,
    location_reference VARCHAR(150) NOT NULL,
    forecast_date DATE NOT NULL,
    horizon_days NUMBER(2, 0) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    temperature_max_celsius NUMBER(5, 2),
    temperature_min_celsius NUMBER(5, 2),
    precipitation_sum_mm NUMBER(6, 2),
    precipitation_probability_max NUMBER(3, 0),
    weather_condition VARCHAR(100),
    snapshot_timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Analytical View for Application Comparison Engine
CREATE OR REPLACE VIEW V_ACTIVE_MANDI_PRICES AS
SELECT 
    f.fact_id,
    f.observation_date,
    m.mandi_id,
    m.mandi_name,
    m.mandi_name_kannada,
    m.district,
    m.state,
    m.latitude,
    m.longitude,
    m.apmc_cess_percentage,
    m.weighing_fee_per_q,
    c.crop_id,
    c.crop_name,
    c.crop_name_kannada,
    v.variety_id,
    v.variety_name,
    f.min_price_per_q,
    f.modal_price_per_q,
    f.max_price_per_q,
    f.arrival_quantity_tonnes,
    f.data_source,
    f.data_quality_status,
    DATEDIFF(day, f.observation_date, CURRENT_DATE()) AS staleness_days
FROM FACT_DAILY_MARKET_PRICES f
JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
JOIN DIM_CROPS c ON f.crop_id = c.crop_id
JOIN DIM_VARIETIES v ON f.variety_id = v.variety_id;

-- District-Wise Aggregation & Market Analytics View
CREATE OR REPLACE VIEW V_DISTRICT_MARKET_SUMMARY AS
SELECT
    m.district,
    m.state,
    c.crop_id,
    c.crop_name,
    c.crop_name_kannada,
    f.observation_date,
    COUNT(DISTINCT m.mandi_id) AS active_mandis_count,
    ROUND(AVG(f.modal_price_per_q), 2) AS district_avg_modal_price,
    ROUND(MIN(f.min_price_per_q), 2) AS district_min_price,
    ROUND(MAX(f.max_price_per_q), 2) AS district_max_price,
    ROUND(SUM(f.arrival_quantity_tonnes), 2) AS total_district_arrivals_tonnes
FROM FACT_DAILY_MARKET_PRICES f
JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
JOIN DIM_CROPS c ON f.crop_id = c.crop_id
GROUP BY m.district, m.state, c.crop_id, c.crop_name, c.crop_name_kannada, f.observation_date;

-- Historical Trend Analysis View
CREATE OR REPLACE VIEW V_COMMODITY_TREND_ANALYSIS AS
SELECT
    f.crop_id,
    c.crop_name,
    f.mandi_id,
    m.mandi_name,
    m.district,
    f.observation_date,
    f.modal_price_per_q,
    f.arrival_quantity_tonnes,
    AVG(f.modal_price_per_q) OVER (
        PARTITION BY f.crop_id, f.mandi_id 
        ORDER BY f.observation_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS sma_7_modal_price,
    AVG(f.modal_price_per_q) OVER (
        PARTITION BY f.crop_id, f.mandi_id 
        ORDER BY f.observation_date 
        ROWS BETWEEN 20 PRECEDING AND CURRENT ROW
    ) AS sma_21_modal_price
FROM FACT_DAILY_MARKET_PRICES f
JOIN DIM_CROPS c ON f.crop_id = c.crop_id
JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id;
