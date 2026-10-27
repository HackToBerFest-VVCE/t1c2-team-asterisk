# FARMPRICE AI — Implementation Task Checklist

## Phase 1: Environment & Requirements Documentation
- [x] Inspect workspace and system runtimes (Python 3.10, Node 20, npm 10, git)
- [x] Configure `.gitignore` and `.env.example`
- [x] Create Kiro Spec documents (`KIRO_SPEC.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `TASKS.md`)
- [x] Install python dependencies (`snowflake-connector-python`, `python-dotenv`, `requests`, `fastapi`, `uvicorn`, `scikit-learn`, `reportlab`)

## Phase 2: Snowflake Schema & Data Model
- [x] Design multi-layer Snowflake DDL (`snowflake/schema.sql`): Raw, Staging, Curated dimensions/facts
- [x] Create realistic APMC Karnataka seed data (`snowflake/seed_data.sql`)
- [x] Build backend Snowflake connector (`backend/app/core/snowflake.py`) with connection verification and safe dev fallback adapter
- [x] Create automated Snowflake setup & verification script (`backend/snowflake/setup_snowflake.py`)

## Phase 3: Core Calculation & Recommendation Engines
- [x] Implement Net Return Calculator (`backend/app/services/calculator.py`) with unit conversion and break-even pricing
- [x] Implement Explainable Recommendation Engine (`backend/app/services/recommendation.py`) with deterministic ranking and itemized "Why this market?" factors
- [x] Write comprehensive unit tests for calculator, edge cases, zero quantity, negative costs, unit conversions (`tests/test_calculator.py`)
- [x] Write tests for recommendation ranking consistency and tie-breaking (`tests/test_recommendation.py`)

## Phase 4: Machine Learning & Time-Series Forecasting
- [x] Implement Time-Series forecasting pipeline with chronological validation split (`backend/app/services/forecasting.py`)
- [x] Implement Baseline model (Simple Moving Average) comparison
- [x] Compute prediction intervals (95% upper/lower bounds) and evaluation metrics (MAE, RMSE, MAPE)
- [x] Add guardrails for sparse history / insufficient observations (<14 data points)
- [x] Write automated tests for forecasting pipeline (`tests/test_forecasting.py`)

## Phase 5: FastAPI Backend Services & API Endpoints
- [x] Set up FastAPI application (`backend/app/main.py`) with CORS and OpenAPI docs
- [x] Implement Pydantic request/response schemas (`backend/app/schemas/`)
- [x] Implement endpoints:
  - `GET /api/health`: System health and Snowflake connection status
  - `GET /api/crops`: Reference crops and varieties
  - `GET /api/mandis`: Mandi reference data and coordinates
  - `POST /api/market-comparison`: Multi-mandi comparison & ranking
  - `POST /api/calculate-net-return`: Dynamic calculator & what-if simulator
  - `GET /api/market-trends`: Historical price & arrival trends
  - `POST /api/forecast`: AI price forecast with confidence intervals
  - `POST /api/reports/export`: PDF & CSV report export
  - `GET /api/weather`: Real-time weather intelligence
  - `GET/POST /api/alerts`: Farmer price alert subscriptions
- [x] Write API integration tests (`tests/test_api.py`)

## Phase 6: Frontend Development (React + Vite + Design System)
- [x] Initialize Vite React application with clean asset structure
- [x] Implement Forest Green / Warm Ivory / Charcoal design system (`index.css`) matching the visual reference
- [x] Implement Bilingual localization (English & Kannada `en.json`, `kn.json`)
- [x] Build Sidebar navigation & Topbar (Search, Weather widget, Chethan P profile avatar)
- [x] Build 7 Primary Views:
  1. **Dashboard / Landing**: Hero banner, quick action cards, trust badges
  2. **Smart Mandi Comparison**: Crop/variety filters, quantity selector, mandi cards, net return badges
  3. **Net Return Calculator**: Interactive sliders, breakdown cards, side-by-side mandi comparison, break-even price
  4. **AI Price Forecasting**: Interactive forecast charts, upper/lower bounds, model evaluation, baseline comparison
  5. **Location-Based Market Intelligence**: Interactive map, road route vs straight line distance, transport cost
  6. **Market Trends & Arrival Analytics**: Dual-axis price & arrival charts, key insights panel
  7. **Settings & Profile**: Chethan P farmer profile, language toggle, preferred crops
  8. **Saved Reports & Alerts**: PDF/CSV download triggers, alert toggle sliders
- [x] Build Trust Bar footer & responsive layouts (Mobile, Tablet, Desktop)

## Phase 7: Verification, Test Execution & Documentation
- [x] Execute all pytest suites (calculator, recommendation, forecasting, API)
- [x] Start FastAPI backend and verify `/docs` and endpoints
- [x] Verify frontend build and local execution
- [x] Document step-by-step setup, Snowflake instructions, and demo guide in `README.md`
