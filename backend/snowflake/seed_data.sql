-- =====================================================================
-- FARMPRICE AI (Bharat-VISTAAR) — Seed Data
-- Realistic Karnataka APMC records matching Agmarknet format
-- =====================================================================

USE DATABASE FARMPRICE_DB;
USE SCHEMA ANALYTICS;

-- Insert Crops
INSERT INTO DIM_CROPS (crop_id, crop_name, crop_name_kannada, category, is_perishable, standard_unit) VALUES
('CROP_TOMATO', 'Tomato', 'ಟೊಮೆಟೊ', 'Vegetables', TRUE, 'Quintal'),
('CROP_ONION', 'Onion', 'ಈರುಳ್ಳಿ', 'Vegetables', FALSE, 'Quintal'),
('CROP_POTATO', 'Potato', 'ಆಲೂಗಡ್ಡೆ', 'Tubers', FALSE, 'Quintal'),
('CROP_MAIZE', 'Maize', 'ಮೆಕ್ಕೆಜೋಳ', 'Cereals', FALSE, 'Quintal'),
('CROP_PADDY', 'Paddy', 'ಭತ್ತ', 'Cereals', FALSE, 'Quintal'),
('CROP_RAGI', 'Ragi (Finger Millet)', 'ರಾಗಿ', 'Millets', FALSE, 'Quintal')
ON CONFLICT (crop_id) DO NOTHING;

-- Insert Varieties
INSERT INTO DIM_VARIETIES (variety_id, crop_id, variety_name, variety_name_kannada, description) VALUES
('VAR_TOM_HYBRID', 'CROP_TOMATO', 'Hybrid', 'ಹೈಬ್ರಿಡ್', 'High yielding firm red round tomatoes'),
('VAR_TOM_LOCAL', 'CROP_TOMATO', 'Local / Desi', 'ನಾಟಿ / ದೇಶಿ', 'Traditional tangy local variety'),
('VAR_ONI_MED', 'CROP_ONION', 'Medium', 'ಮಧ್ಯಮ', 'Standard red globe medium size onion'),
('VAR_ONI_SMALL', 'CROP_ONION', 'Small / Shallot', 'ಸಣ್ಣ ಈರುಳ್ಳಿ', 'Karnataka small sambar onion'),
('VAR_POT_JYOTHI', 'CROP_POTATO', 'Kufri Jyothi', 'ಕುಫ್ರಿ ಜ್ಯೋತಿ', 'Standard table potato round oval'),
('VAR_MAI_HYBRID', 'CROP_MAIZE', 'Hybrid Yellow', 'ಹಳದಿ ಹೈಬ್ರಿಡ್', 'Commercial feed and starch yellow maize'),
('VAR_PAD_SONA', 'CROP_PADDY', 'Sona Masuri', 'ಸೋನಾ ಮಸೂರಿ', 'Fine aromatic medium grain non-basmati'),
('VAR_RAG_LOCAL', 'CROP_RAGI', 'Local Brown', 'ನಾಟಿ ಕಂದು ರಾಗಿ', 'Nutritious drought-resistant local ragi')
ON CONFLICT (variety_id) DO NOTHING;

-- Insert Mandis
INSERT INTO DIM_MANDIS (mandi_id, mandi_name, mandi_name_kannada, district, state, latitude, longitude, apmc_cess_percentage, weighing_fee_per_q, has_cold_storage, operating_days) VALUES
('MND_HASSAN', 'Hassan APMC', 'ಹಾಸನ ಎಪಿಎಂಸಿ', 'Hassan', 'Karnataka', 13.0033, 76.1004, 1.5, 3.0, TRUE, 'Mon-Sat'),
('MND_CRPATNA', 'Channarayapatna Mandi', 'ಚನ್ನರಾಯಪಟ್ಟಣ ಮಾರುಕಟ್ಟೆ', 'Hassan', 'Karnataka', 12.9064, 76.3888, 1.5, 2.5, FALSE, 'Mon-Sat'),
('MND_MYSORE', 'Mysore Mandi (Bandipalya)', 'ಮೈಸೂರು ಮಾರುಕಟ್ಟೆ (ಬಂಡಿಪಾಳ್ಯ)', 'Mysore', 'Karnataka', 12.2858, 76.6698, 1.5, 3.5, TRUE, 'Mon-Sun'),
('MND_ARASIKERE', 'Arasikere APMC', 'ಅರಸೀಕೆರೆ ಎಪಿಎಂಸಿ', 'Hassan', 'Karnataka', 13.3148, 76.2570, 1.5, 2.5, FALSE, 'Mon-Sat'),
('MND_HOLENARASIPURA', 'Holenarasipura Mandi', 'ಹೊಳೆನರಸೀಪುರ ಮಾರುಕಟ್ಟೆ', 'Hassan', 'Karnataka', 12.7900, 76.2400, 1.5, 2.5, FALSE, 'Tue, Fri, Sun'),
('MND_MANDYA', 'Mandya APMC', 'ಮಂಡ್ಯ ಎಪಿಎಂಸಿ', 'Mandya', 'Karnataka', 12.5218, 76.8951, 1.5, 3.0, FALSE, 'Mon-Sat'),
('MND_BENGALURU', 'Bengaluru APMC (Yeshwanthpur)', 'ಬೆಂಗಳೂರು ಎಪಿಎಂಸಿ (ಯಶವಂತಪುರ)', 'Bengaluru Urban', 'Karnataka', 13.0280, 77.5408, 1.5, 4.0, TRUE, 'Mon-Sun'),
('MND_SHIMOGA', 'Shimoga APMC', 'ಶಿವಮೊಗ್ಗ ಎಪಿಎಂಸಿ', 'Shivamogga', 'Karnataka', 13.9299, 75.5681, 1.5, 3.0, FALSE, 'Mon-Sat')
ON CONFLICT (mandi_id) DO NOTHING;

-- Seed Historical Market Observations for Hassan & surrounding Mandis
-- Current Date Context: October 2026
INSERT INTO FACT_DAILY_MARKET_PRICES 
(fact_id, mandi_id, crop_id, variety_id, observation_date, min_price_per_q, modal_price_per_q, max_price_per_q, arrival_quantity_tonnes, data_source, data_quality_status)
VALUES
-- Tomato Hybrid - 24 Oct 2026 (Live Observations)
('FCT_TOM_HAS_24', 'MND_HASSAN', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1600.0, 2100.0, 2450.0, 125.0, 'AGMARKNET', 'VERIFIED'),
('FCT_TOM_CRP_24', 'MND_CRPATNA', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1750.0, 2050.0, 2320.0, 48.0, 'AGMARKNET', 'VERIFIED'),
('FCT_TOM_MYS_24', 'MND_MYSORE', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1680.0, 1990.0, 2200.0, 210.0, 'AGMARKNET', 'VERIFIED'),
('FCT_TOM_ARA_24', 'MND_ARASIKERE', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1620.0, 1950.0, 2180.0, 35.0, 'AGMARKNET', 'VERIFIED'),
('FCT_TOM_HOL_24', 'MND_HOLENARASIPURA', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1580.0, 1920.0, 2150.0, 28.0, 'AGMARKNET', 'VERIFIED'),
('FCT_TOM_MAN_24', 'MND_MANDYA', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1700.0, 2080.0, 2380.0, 85.0, 'AGMARKNET', 'VERIFIED'),
('FCT_TOM_BLR_24', 'MND_BENGALURU', 'CROP_TOMATO', 'VAR_TOM_HYBRID', '2026-10-24', 1800.0, 2250.0, 2550.0, 480.0, 'AGMARKNET', 'VERIFIED'),

-- Onion Medium - 24 Oct 2026
('FCT_ONI_HAS_24', 'MND_HASSAN', 'CROP_ONION', 'VAR_ONI_MED', '2026-10-24', 2100.0, 2450.0, 2750.0, 92.0, 'AGMARKNET', 'VERIFIED'),
('FCT_ONI_MYS_24', 'MND_MYSORE', 'CROP_ONION', 'VAR_ONI_MED', '2026-10-24', 2200.0, 2580.0, 2850.0, 310.0, 'AGMARKNET', 'VERIFIED'),
('FCT_ONI_CRP_24', 'MND_CRPATNA', 'CROP_ONION', 'VAR_ONI_MED', '2026-10-24', 2050.0, 2380.0, 2600.0, 34.0, 'AGMARKNET', 'VERIFIED'),
('FCT_ONI_BLR_24', 'MND_BENGALURU', 'CROP_ONION', 'VAR_ONI_MED', '2026-10-24', 2300.0, 2690.0, 3050.0, 620.0, 'AGMARKNET', 'VERIFIED'),

-- Potato Jyothi - 24 Oct 2026
('FCT_POT_HAS_24', 'MND_HASSAN', 'CROP_POTATO', 'VAR_POT_JYOTHI', '2026-10-24', 1400.0, 1680.0, 1900.0, 160.0, 'AGMARKNET', 'VERIFIED'),
('FCT_POT_BLR_24', 'MND_BENGALURU', 'CROP_POTATO', 'VAR_POT_JYOTHI', '2026-10-24', 1550.0, 1850.0, 2100.0, 420.0, 'AGMARKNET', 'VERIFIED'),
('FCT_POT_MYS_24', 'MND_MYSORE', 'CROP_POTATO', 'VAR_POT_JYOTHI', '2026-10-24', 1450.0, 1720.0, 1950.0, 140.0, 'AGMARKNET', 'VERIFIED')
ON CONFLICT (fact_id) DO NOTHING;

-- Seed Model Forecast Metrics
INSERT INTO FORECAST_EVALUATION_METRICS
(eval_id, model_name, model_version, crop_id, mandi_id, train_start_date, train_end_date, test_start_date, test_end_date, mae, rmse, mape, baseline_mape)
VALUES
('EVAL_TOM_HAS_01', 'Time-Series Ridge Auto-Regressive', 'v1.4', 'CROP_TOMATO', 'MND_HASSAN', '2025-01-01', '2026-09-30', '2026-10-01', '2026-10-20', 178.50, 224.10, 8.4, 12.6),
('EVAL_ONI_HAS_01', 'Time-Series Ridge Auto-Regressive', 'v1.4', 'CROP_ONION', 'MND_HASSAN', '2025-01-01', '2026-09-30', '2026-10-01', '2026-10-20', 162.20, 198.80, 7.2, 11.4);
