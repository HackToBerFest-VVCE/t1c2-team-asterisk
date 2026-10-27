# FARMPRICE AI — Detailed Functional & Non-Functional Requirements

## 1. Functional Requirements

### 1.1 Market Comparison & Selection
- **FR-1.1:** System shall support selecting standard Indian agricultural crops (Tomato, Onion, Potato, Maize, Paddy, Ragi, Cotton, etc.) and specific varieties (Hybrid, Local, Desi, Jyothi, etc.).
- **FR-1.2:** System shall allow user to input harvest quantity in either kilograms (kg) or quintals (q), automatically converting 100 kg = 1 Quintal.
- **FR-1.3:** System shall retrieve eligible mandis from the data layer for the selected crop, variety, and comparison date.
- **FR-1.4:** System shall display Minimum, Modal, and Maximum prices per quintal for each mandi.
- **FR-1.5:** System shall support sorting by Net Return, Modal Price, Road Distance, and Arrival Volume.
- **FR-1.6:** If fewer than 3 mandis have active observations for a specific crop/date, system shall display available mandis and provide a clear explanatory notice without generating fictitious markets.

### 1.2 Net Return Calculator
- **FR-2.1:** Gross Sale Value must be calculated as `Quantity × Modal Price`.
- **FR-2.2:** Net Return must be calculated as `Gross Sale Value - Transport Cost - Loading/Unloading - Mandi Cess - Misc Selling Expenses`.
- **FR-2.3:** User must be able to adjust individual expense values (per km transport rate, manual flat cost, loading per quintal, cess percentage) and immediately see recalculated values.
- **FR-2.4:** Break-even selling price per quintal must be computed dynamically.
- **FR-2.5:** System shall present a side-by-side comparison of candidate mandis highlighting the best option.

### 1.3 Snowflake Data Warehouse
- **FR-3.1:** Backend must connect to Snowflake using snowflake-connector-python with parameterized queries.
- **FR-3.2:** System must provide a dedicated development adapter that operates against a local database seeded with realistic Agmarknet data when Snowflake credentials are not active.
- **FR-3.3:** The health endpoint `/api/health` must report the Snowflake connection status accurately (`connected`, `fallback_local`, or `disconnected`).
- **FR-3.4:** Snowflake schema DDL must define raw, staging, and curated analytical dimensions and fact tables.

### 1.4 Explainable Recommendations
- **FR-4.1:** System must rank mandis deterministically based on Take-Home Net Return.
- **FR-4.2:** Recommendations must display itemized reasons ("Why this market?"), including price premium, distance cost impact, and net financial gain over alternatives.
- **FR-4.3:** Clear notices must flag data freshness, staleness (>7 days old), or missing fields.

### 1.5 Price History & Market Trends
- **FR-5.1:** System must visualize historical modal price trends and arrival volumes over daily, weekly, and monthly timeframes.
- **FR-5.2:** Dual-axis visualization must illustrate the inverse or direct relationship between arrival volume spikes and price movements.
- **FR-5.3:** No chart shall display random or synthetic data in normal operation; all points must derive from real recorded observations.

### 1.6 AI Time-Series Forecasting
- **FR-6.1:** System shall train an auto-regressive model with chronological validation splits.
- **FR-6.2:** Predictions must include upper and lower prediction intervals (95% confidence bounds).
- **FR-6.3:** Model performance metrics (MAE, RMSE, MAPE) must be displayed and compared against a Simple Moving Average baseline.
- **FR-6.4:** Forecasts must explicitly state disclaimer: "Forecasts are statistical estimates and not guaranteed market prices."
- **FR-6.5:** When historical observations are fewer than 14 entries, system must flag `INSUFFICIENT_DATA` rather than returning false predictions.

### 1.7 Geospatial & Location Intelligence
- **FR-7.1:** Support origin location selection (e.g. Hassan, Mandya, Mysore, Bengaluru, Tumkur, Shimoga).
- **FR-7.2:** Interactive map visualization rendering mandi pins, origin marker, and estimated route paths.
- **FR-7.3:** Road distance estimation must clearly distinguish road route estimates (using realistic road curvature factor ~1.25x) from straight-line haversine distance.

### 1.8 Multilingual & Farmer Experience
- **FR-8.1:** Full internationalization (i18n) with one-click toggling between English and Kannada (ಕನ್ನಡ).
- **FR-8.2:** Responsive layout accommodating mobile Android screens, tablets, and desktop displays.
- **FR-8.3:** Export capability for professional PDF and CSV reports.

## 2. Non-Functional Requirements
- **Performance:** Sub-200ms calculation and comparison responses under local dev; sub-1s Snowflake analytical queries.
- **Reliability:** Graceful error handling for missing APIs, network timeouts, and partial records.
- **Security:** Zero credential leakage in client code or Git repositories. Parameterized SQL queries preventing injection.
- **Accessibility:** High contrast text (WCAG AA compliant), clear touch targets (>44px), intuitive iconography.
