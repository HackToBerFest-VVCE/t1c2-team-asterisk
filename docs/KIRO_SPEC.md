# FARMPRICE AI (Bharat-VISTAAR) — Kiro Spec Document

> **Project Name:** FARMPRICE AI (Bharat-VISTAAR)  
> **Tagline:** Know Your Market. Calculate Your Return. Sell With Confidence.  
> **Challenge:** Agricultural Market Comparison, Transportation-Adjusted Net Returns, Snowflake Analytics, and Explainable Recommendations for Indian Farmers.  
> **IDE / Tooling Disclosure:** Scaffolding and full-stack development performed using Antigravity AI assistant, structured for direct review and continuation within Kiro IDE's Spec workflow.

---

## 1. Executive Summary

Indian farmers often experience significant price disparity between local and regional Agricultural Produce Market Committees (APMCs/mandis). The highest posted market price does not always yield the highest take-home earnings due to variable transportation distances, loading/unloading costs, weighing fees, and APMC cess.

**FARMPRICE AI** solves this critical information asymmetry through:
1. **Smart Mandi Comparison**: Real-time evaluation of minimum, maximum, and modal prices across eligible mandis within reach.
2. **Deterministic Net Return Calculator**: Mathematical deduction of road transport expenses, labor, and cess from gross sale values.
3. **Snowflake Analytical Data Layer**: Scalable data warehouse modeling raw, staging, and curated market observation tables with strict schema enforcement and data quality provenance.
4. **Explainable Recommendation Engine**: Transparent, auditable logic explaining *why* a particular market yields the highest net return over alternatives.
5. **AI Price Forecasting**: Chronologically evaluated time-series forecasting with prediction intervals, baseline comparisons (MAPE/MAE), and explicit "insufficient data" guards.
6. **Farmer-First Multilingual UI**: Kannada (ಕನ್ನಡ) and English support, responsive mobile-first layouts, and printable/downloadable PDF/CSV reports.

---

## 2. Requirements Matrix

| ID | Requirement | Category | Priority | Status |
|:---|:---|:---|:---:|:---:|
| **REQ-01** | Multi-mandi price comparison with modal, min, and max prices | Core Engine | High | Implemented |
| **REQ-02** | Net return formula: `Gross Value - Transport - Loading - Mandi Fees - Misc` | Calculation | High | Implemented |
| **REQ-03** | Break-even price calculation per quintal | Calculation | High | Implemented |
| **REQ-04** | Unit conversion between Kilograms (kg) and Quintals (q) | Calculation | High | Implemented |
| **REQ-05** | Snowflake integration with multi-layered schema (Raw, Staging, Curated) | Data Layer | High | Implemented |
| **REQ-06** | Explainable recommendation engine with itemized factors and tie-breaking | Decision Engine | High | Implemented |
| **REQ-07** | Chronological ML price forecasting with prediction bounds & baseline comparison | Machine Learning | Medium | Implemented |
| **REQ-08** | Interactive location mapping with road route factor vs straight-line distance | Geospatial | Medium | Implemented |
| **REQ-09** | Weather contextual intelligence (Open-Meteo) with graceful fallback | Contextual | Medium | Implemented |
| **REQ-10** | Multilingual support (English & Kannada) across all screens | Accessibility | High | Implemented |
| **REQ-11** | Printable & downloadable PDF and CSV comparison reports | Reporting | Medium | Implemented |
| **REQ-12** | Data quality indicators (Freshness, Completeness, Provenance) | Reliability | High | Implemented |

---

## 3. Tooling & Hackathon Compliance

- **Permitted Use of AI Assistant:** All initial code generation, architecture scaffolding, and test harness setup were generated via pair programming with Antigravity assistant.
- **Repository Integrity:** All commits and file structures maintain standard open-source conventions without hardcoded credentials.
- **Kiro Compatibility:** All code, specifications, and test runners are completely standard Python/FastAPI and React/Vite, allowing instant execution within Kiro IDE.
