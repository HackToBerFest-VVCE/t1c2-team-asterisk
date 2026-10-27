import numpy as np
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from backend.app.core.snowflake import snowflake_manager
from backend.app.services.agmarknet_provider import agmarknet_provider
from backend.app.services.data_quality import data_quality_engine
from backend.app.services.recommendation import evaluate_market_comparison
from backend.app.schemas.market import MarketComparisonRequest

router = APIRouter(tags=["Market & Official AGMARKNET Data Integration"])

# =====================================================================
# 1. MARKET PRICES ENDPOINTS
# =====================================================================

@router.get("/market/prices")
def get_market_prices(
    crop_id: Optional[str] = Query(None, description="Filter by crop ID (e.g. CROP_TOMATO)"),
    mandi_id: Optional[str] = Query(None, description="Filter by mandi ID (e.g. MND_HASSAN)"),
    state: Optional[str] = Query(None, description="Filter by state (e.g. Karnataka)"),
    district: Optional[str] = Query(None, description="Filter by district (e.g. Hassan)"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    sort_by: str = Query("date_desc", description="Sort order: date_desc, price_desc, price_asc, mandi_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100)
):
    """
    GET /api/market/prices
    Retrieves validated, deduplicated agricultural market prices from Snowflake Analytical layer.
    """
    query = """
        SELECT 
            f.fact_id,
            f.observation_date,
            m.mandi_id,
            m.mandi_name,
            m.district,
            m.state,
            c.crop_id,
            c.crop_name,
            v.variety_name,
            f.min_price_per_q,
            f.modal_price_per_q,
            f.max_price_per_q,
            f.arrival_quantity_tonnes,
            f.data_source,
            'AGMARKNET' AS provenance_record_id,
            f.data_quality_status,
            f.observation_date AS created_at
        FROM FACT_DAILY_MARKET_PRICES f
        JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
        JOIN DIM_CROPS c ON f.crop_id = c.crop_id
        JOIN DIM_VARIETIES v ON f.variety_id = v.variety_id
        WHERE 1=1
    """
    params = []
    if crop_id:
        query += " AND f.crop_id = ?"
        params.append(crop_id)
    if mandi_id:
        query += " AND f.mandi_id = ?"
        params.append(mandi_id)
    if state:
        query += " AND LOWER(m.state) = LOWER(?)"
        params.append(state)
    if district:
        query += " AND LOWER(m.district) = LOWER(?)"
        params.append(district)
    if date_from:
        query += " AND f.observation_date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND f.observation_date <= ?"
        params.append(date_to)

    if sort_by == "price_desc":
        query += " ORDER BY f.modal_price_per_q DESC"
    elif sort_by == "price_asc":
        query += " ORDER BY f.modal_price_per_q ASC"
    elif sort_by == "mandi_asc":
        query += " ORDER BY m.mandi_name ASC"
    else:
        query += " ORDER BY f.observation_date DESC, f.modal_price_per_q DESC"

    records = snowflake_manager.execute_query(query, tuple(params) if params else None)
    total_records = len(records)
    offset = (page - 1) * page_size
    paged = records[offset:offset + page_size]

    today = date.today()
    items = []
    for r in paged:
        obs_date_str = str(r["observation_date"]).split("T")[0]
        days_old = 0
        try:
            obs_dt = datetime.strptime(obs_date_str, "%Y-%m-%d").date()
            days_old = max(0, (today - obs_dt).days)
        except Exception:
            pass

        items.append({
            "fact_id": r["fact_id"],
            "observation_date": obs_date_str,
            "mandi_id": r["mandi_id"],
            "mandi_name": r["mandi_name"],
            "district": r["district"],
            "state": r["state"],
            "crop_id": r["crop_id"],
            "crop_name": r["crop_name"],
            "variety_name": r["variety_name"],
            "min_price_per_q": float(r["min_price_per_q"] or 0.0),
            "modal_price_per_q": float(r["modal_price_per_q"]),
            "max_price_per_q": float(r["max_price_per_q"] or 0.0),
            "arrival_quantity_tonnes": float(r["arrival_quantity_tonnes"]) if r.get("arrival_quantity_tonnes") is not None else None,
            "currency": "INR (₹)",
            "unit": "Rs/Quintal",
            "data_source": r.get("data_source", "AGMARKNET"),
            "provenance_record_id": r.get("provenance_record_id"),
            "data_quality_status": r.get("data_quality_status", "VERIFIED"),
            "is_stale": days_old > 7,
            "staleness_days": days_old
        })

    return {
        "status": "SUCCESS",
        "data_source": "AGMARKNET / Verified Indian Mandi Records",
        "total_records": total_records,
        "page": page,
        "page_size": page_size,
        "records": items
    }


@router.get("/market/prices/latest")
def get_latest_market_prices(
    crop_id: Optional[str] = Query(None, description="Optional crop filter"),
    mandi_id: Optional[str] = Query(None, description="Optional mandi filter")
):
    """
    GET /api/market/prices/latest
    Returns the most recent verified observation date and modal price for each active mandi.
    """
    query = """
        SELECT 
            f.fact_id,
            f.observation_date,
            m.mandi_id,
            m.mandi_name,
            m.district,
            m.state,
            c.crop_id,
            c.crop_name,
            v.variety_name,
            f.min_price_per_q,
            f.modal_price_per_q,
            f.max_price_per_q,
            f.arrival_quantity_tonnes,
            f.data_source,
            f.data_quality_status
        FROM FACT_DAILY_MARKET_PRICES f
        JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
        JOIN DIM_CROPS c ON f.crop_id = c.crop_id
        JOIN DIM_VARIETIES v ON f.variety_id = v.variety_id
        WHERE (f.mandi_id, f.crop_id, f.observation_date) IN (
            SELECT mandi_id, crop_id, MAX(observation_date)
            FROM FACT_DAILY_MARKET_PRICES
            GROUP BY mandi_id, crop_id
        )
    """
    params = []
    if crop_id:
        query += " AND f.crop_id = ?"
        params.append(crop_id)
    if mandi_id:
        query += " AND f.mandi_id = ?"
        params.append(mandi_id)

    query += " ORDER BY c.crop_name ASC, f.modal_price_per_q DESC"
    records = snowflake_manager.execute_query(query, tuple(params) if params else None)

    today = date.today()
    results = []
    for r in records:
        obs_date_str = str(r["observation_date"]).split("T")[0]
        days_old = 0
        try:
            obs_dt = datetime.strptime(obs_date_str, "%Y-%m-%d").date()
            days_old = max(0, (today - obs_dt).days)
        except Exception:
            pass

        results.append({
            "mandi_id": r["mandi_id"],
            "mandi_name": r["mandi_name"],
            "district": r["district"],
            "state": r["state"],
            "crop_id": r["crop_id"],
            "crop_name": r["crop_name"],
            "variety_name": r["variety_name"],
            "latest_observation_date": obs_date_str,
            "min_price_per_q": float(r["min_price_per_q"] or 0.0),
            "modal_price_per_q": float(r["modal_price_per_q"]),
            "max_price_per_q": float(r["max_price_per_q"] or 0.0),
            "arrival_quantity_tonnes": float(r["arrival_quantity_tonnes"]) if r.get("arrival_quantity_tonnes") is not None else None,
            "unit": "₹ / Quintal",
            "data_source": r.get("data_source", "AGMARKNET"),
            "data_quality_status": r.get("data_quality_status", "VERIFIED"),
            "staleness_days": days_old,
            "is_stale": days_old > 7
        })

    return {
        "status": "SUCCESS",
        "count": len(results),
        "latest_observation_date": snowflake_manager.get_latest_observation_date(),
        "prices": results
    }


@router.get("/market/prices/history")
def get_market_prices_history(
    crop_id: str = Query("CROP_TOMATO", description="Crop identifier"),
    mandi_id: str = Query("MND_HASSAN", description="Mandi identifier"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    timeframe: str = Query("90days", description="30days, 60days, 90days, 1year")
):
    """
    GET /api/market/prices/history
    Returns chronological historical time series observations for price charts and trends.
    """
    query = """
        SELECT 
            f.observation_date,
            f.min_price_per_q,
            f.modal_price_per_q,
            f.max_price_per_q,
            f.arrival_quantity_tonnes,
            f.data_quality_status,
            c.crop_name,
            m.mandi_name
        FROM FACT_DAILY_MARKET_PRICES f
        JOIN DIM_CROPS c ON f.crop_id = c.crop_id
        JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
        WHERE f.crop_id = ? AND f.mandi_id = ?
    """
    params = [crop_id, mandi_id]

    if date_from:
        query += " AND f.observation_date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND f.observation_date <= ?"
        params.append(date_to)

    query += " ORDER BY f.observation_date ASC"
    rows = snowflake_manager.execute_query(query, tuple(params))

    series = []
    prices_list = []
    for r in rows:
        modal = float(r["modal_price_per_q"])
        prices_list.append(modal)
        
        # Calculate rolling 7-day moving average
        rolling_window = prices_list[-7:]
        ma_7 = float(np.mean(rolling_window)) if rolling_window else modal

        series.append({
            "date": str(r["observation_date"]).split("T")[0],
            "min_price": float(r["min_price_per_q"] or modal * 0.85),
            "modal_price": modal,
            "max_price": float(r["max_price_per_q"] or modal * 1.15),
            "arrivals_tonnes": float(r["arrival_quantity_tonnes"] or 0.0),
            "moving_average_7d": round(ma_7, 1),
            "data_quality_status": r["data_quality_status"]
        })

    crop_name = rows[0]["crop_name"] if rows else crop_id
    mandi_name = rows[0]["mandi_name"] if rows else mandi_id

    return {
        "status": "SUCCESS",
        "crop_id": crop_id,
        "crop_name": crop_name,
        "mandi_id": mandi_id,
        "mandi_name": mandi_name,
        "total_observations": len(series),
        "data_points": series
    }


# =====================================================================
# 2. ARRIVALS ENDPOINT
# =====================================================================

@router.get("/market/arrivals")
def get_market_arrivals(
    crop_id: Optional[str] = Query(None, description="Optional crop filter"),
    mandi_id: Optional[str] = Query(None, description="Optional mandi filter"),
    days: int = Query(30, ge=1, le=180, description="Past number of days")
):
    """
    GET /api/market/arrivals
    Returns daily and cumulative arrival volumes (in tonnes) for commodities.
    """
    query = """
        SELECT 
            f.observation_date,
            c.crop_id,
            c.crop_name,
            m.mandi_id,
            m.mandi_name,
            f.arrival_quantity_tonnes,
            f.modal_price_per_q
        FROM FACT_DAILY_MARKET_PRICES f
        JOIN DIM_CROPS c ON f.crop_id = c.crop_id
        JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
        WHERE f.arrival_quantity_tonnes IS NOT NULL AND f.arrival_quantity_tonnes > 0
    """
    params = []
    if crop_id:
        query += " AND f.crop_id = ?"
        params.append(crop_id)
    if mandi_id:
        query += " AND f.mandi_id = ?"
        params.append(mandi_id)

    query += " ORDER BY f.observation_date DESC LIMIT ?"
    params.append(days * 10)

    rows = snowflake_manager.execute_query(query, tuple(params))
    
    arrivals = []
    total_tonnes = 0.0
    for r in rows:
        qty = float(r["arrival_quantity_tonnes"])
        total_tonnes += qty
        arrivals.append({
            "observation_date": str(r["observation_date"]).split("T")[0],
            "crop_id": r["crop_id"],
            "crop_name": r["crop_name"],
            "mandi_id": r["mandi_id"],
            "mandi_name": r["mandi_name"],
            "arrival_quantity_tonnes": qty,
            "unit": "Tonnes (1,000 kg)",
            "modal_price_per_q": float(r["modal_price_per_q"])
        })

    return {
        "status": "SUCCESS",
        "total_records": len(arrivals),
        "total_volume_tonnes": round(total_tonnes, 1),
        "arrivals": arrivals
    }


# =====================================================================
# 3. REFERENCE DATA ENDPOINTS
# =====================================================================

@router.get("/market/commodities")
def get_market_commodities():
    """
    GET /api/market/commodities
    Returns all registered agricultural commodities with multilingual names and categories.
    """
    query = "SELECT * FROM DIM_CROPS ORDER BY crop_name ASC"
    crops = snowflake_manager.execute_query(query)
    return {
        "status": "SUCCESS",
        "count": len(crops),
        "commodities": crops
    }


@router.get("/market/locations")
def get_market_locations():
    """
    GET /api/market/locations
    Returns all APMC mandis, districts, geo-coordinates, and statutory fee profiles.
    """
    query = "SELECT * FROM DIM_MANDIS ORDER BY district ASC, mandi_name ASC"
    mandis = snowflake_manager.execute_query(query)
    return {
        "status": "SUCCESS",
        "count": len(mandis),
        "locations": mandis
    }


# =====================================================================
# 4. MARKET COMPARISON ENDPOINT
# =====================================================================

@router.get("/market/comparison")
def compare_market_opportunities(
    crop_id: str = Query("CROP_TOMATO", description="Crop identifier"),
    variety_id: Optional[str] = Query(None, description="Optional variety identifier"),
    quantity_quintals: float = Query(50.0, gt=0, description="Quantity to sell in quintals"),
    origin_latitude: float = Query(13.0033, description="Farmer origin latitude (default Hassan)"),
    origin_longitude: float = Query(76.1004, description="Farmer origin longitude (default Hassan)"),
    origin_name: str = Query("Hassan, Karnataka", description="Farmer location name"),
    custom_transport_rate: Optional[float] = Query(None, description="Optional custom transport ₹/km/quintal")
):
    """
    GET /api/market/comparison
    Compares all eligible APMC mandis for a crop.
    Calculates gross sale, road transport cost, handling fees, APMC cess, and estimated net returns.
    """
    req = MarketComparisonRequest(
        crop_id=crop_id,
        variety_id=variety_id,
        quantity=quantity_quintals,
        unit="quintals",
        origin_latitude=origin_latitude,
        origin_longitude=origin_longitude,
        origin_name=origin_name,
        custom_transport_rate_per_km_q=custom_transport_rate
    )
    return evaluate_market_comparison(req)


# =====================================================================
# 5. DATA SOURCES, FRESHNESS, AND QUALITY ENDPOINTS
# =====================================================================

@router.get("/data/sources")
def get_data_sources_registry():
    """
    GET /api/data/sources
    Returns the complete official AGMARKNET source registry:
    official URLs, dataset identifiers, supported fields, health, and licensing.
    """
    return agmarknet_provider.get_source_registry()


@router.get("/data/freshness")
def get_data_freshness():
    """
    GET /api/data/freshness
    Returns live observation date freshness indicators and staleness diagnostics.
    """
    return snowflake_manager.get_data_freshness_stats()


@router.get("/data/quality")
def get_data_quality_audit():
    """
    GET /api/data/quality
    Executes a comprehensive data quality audit across observations:
    checks for range inversions (min > max), missing modal prices, duplicates, and staleness.
    """
    return data_quality_engine.run_full_database_audit()
