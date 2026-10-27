import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, Body, Header, HTTPException, Response, Depends
from pydantic import BaseModel, Field

from backend.app.core.snowflake import snowflake_manager
from backend.app.services.agmarknet_provider import agmarknet_provider

logger = logging.getLogger("farmprice.mandi_prices")

router = APIRouter(tags=["All Crops Mandi Prices — AGMARKNET & Snowflake"])

class SyncMandiPricesRequest(BaseModel):
    state: str = Field("Karnataka", description="State filter (default: Karnataka)")
    commodity: Optional[str] = Field(None, description="Commodity filter (None or 'All' queries all crops)")
    date_from: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    batch_size: int = Field(50, ge=10, le=100, description="Records per page batch")
    max_pages: int = Field(10, ge=1, le=50, description="Maximum pages to ingest")

@router.get("/market-prices")
@router.get("/mandi-prices")
def get_mandi_prices(
    state: Optional[str] = Query(None, description="State filter (default: None for all states)"),
    district: Optional[str] = Query(None, description="District filter (dynamically populated)"),
    market: Optional[str] = Query(None, description="APMC market filter (dynamically populated)"),
    commodity: Optional[str] = Query(None, description="Commodity filter (None or 'All' queries all crops)"),
    variety: Optional[str] = Query(None, description="Variety filter (dynamically populated)"),
    grade: Optional[str] = Query(None, description="Grade filter (dynamically populated)"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search commodity, market, or district"),
    sort_by: str = Query("date_desc", description="Sort: date_desc, price_desc, price_asc, commodity_asc, market_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """
    Returns authentic agricultural commodity prices from Snowflake / SQLite MANDI_PRICES.
    Does NOT default to tomato or any single crop.
    Dynamically supports all crops, all districts, and all APMC markets across Karnataka.
    """
    # If in local adapter mode and MANDI_PRICES is completely empty, perform initial sync
    if snowflake_manager.mode == "LOCAL_DEVELOPMENT_ADAPTER":
        count_check = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")
        if count_check and count_check[0]["c"] == 0:
            logger.info("MANDI_PRICES empty. Triggering initial multi-crop AGMARKNET synchronization...")
            agmarknet_provider.run_sync_pipeline(trigger_type="INITIAL_STARTUP", state="Karnataka")

    result = snowflake_manager.get_mandi_prices_paginated(
        state=state,
        district=district,
        market=market,
        commodity=commodity,
        variety=variety,
        grade=grade,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
        search_query=search
    )

    # Format records with both canonical uppercase and frontend-convenient keys
    formatted_records = []
    for r in result["records"]:
        formatted_records.append({
            "OBSERVATION_DATE": r["observation_date"],
            "STATE": r["state"],
            "DISTRICT": r["district"],
            "MARKET": r["market"],
            "COMMODITY": r["commodity"],
            "VARIETY": r["variety"],
            "GRADE": r["grade"],
            "MIN_PRICE": r["min_price"],
            "MAX_PRICE": r["max_price"],
            "MODAL_PRICE": r["modal_price"],
            "ARRIVAL_QUANTITY": r["arrival_quantity"],
            "SOURCE": r["source"],
            "SOURCE_UPDATED_AT": r["source_updated_at"],
            "INGESTED_AT": r["ingested_at"],
            # Lowercase aliases for frontend convenience
            "observation_date": r["observation_date"],
            "state": r["state"],
            "district": r["district"],
            "market": r["market"],
            "commodity": r["commodity"],
            "variety": r["variety"],
            "grade": r["grade"],
            "min_price": r["min_price"],
            "max_price": r["max_price"],
            "modal_price": r["modal_price"],
            "arrival_quantity": r["arrival_quantity"],
            "source": r["source"],
            "source_updated_at": r["source_updated_at"],
            "ingested_at": r["ingested_at"]
        })

    return {
        "status": "SUCCESS",
        "state": state,
        "selected_commodity": commodity or "All Crops",
        "total_records": result["total_records"],
        "page": result["page"],
        "page_size": result["page_size"],
        "freshness_timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "warehouse_mode": snowflake_manager.mode,
        "records": formatted_records
    }

@router.get("/commodities")
def get_commodities(
    state: Optional[str] = Query(None, description="State filter (default: None for all states)"),
    district: Optional[str] = Query(None, description="Optional district filter"),
    market: Optional[str] = Query(None, description="Optional APMC market filter")
):
    """
    Returns every available commodity dynamically discovered from official AGMARKNET records.
    Never returns hardcoded or invented lists.
    """
    if snowflake_manager.mode != "SNOWFLAKE_LIVE":
        count_check = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")
        if count_check and count_check[0]["c"] == 0:
            agmarknet_provider.run_sync_pipeline(trigger_type="INITIAL_STARTUP", state="Karnataka")

    commodities = snowflake_manager.get_distinct_commodities(
        state=state,
        district=district,
        market=market
    )

    return {
        "status": "SUCCESS",
        "state": state or "All States",
        "count": len(commodities),
        "commodities": commodities
    }

@router.get("/districts")
def get_districts(
    state: Optional[str] = Query(None, description="State filter (default: None for all states)")
):
    """
    Returns all districts dynamically discovered from official AGMARKNET records.
    """
    if snowflake_manager.mode != "SNOWFLAKE_LIVE":
        count_check = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")
        if count_check and count_check[0]["c"] == 0:
            agmarknet_provider.run_sync_pipeline(trigger_type="INITIAL_STARTUP", state="Karnataka")

    districts = snowflake_manager.get_distinct_districts(state=state)

    return {
        "status": "SUCCESS",
        "state": state or "All States",
        "count": len(districts),
        "districts": districts
    }

@router.get("/markets")
def get_markets(
    state: Optional[str] = Query(None, description="State filter (default: None for all states)"),
    district: Optional[str] = Query(None, description="Optional district filter")
):
    """
    Returns all APMC mandis/markets dynamically discovered from official AGMARKNET records.
    """
    if snowflake_manager.mode != "SNOWFLAKE_LIVE":
        count_check = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")
        if count_check and count_check[0]["c"] == 0:
            agmarknet_provider.run_sync_pipeline(trigger_type="INITIAL_STARTUP", state="Karnataka")

    markets = snowflake_manager.get_distinct_markets(state=state, district=district)

    return {
        "status": "SUCCESS",
        "state": state or "All States",
        "district": district or "All Districts",
        "count": len(markets),
        "markets": markets
    }

@router.get("/varieties")
def get_varieties(
    state: Optional[str] = Query(None, description="State filter (default: None for all states)"),
    commodity: Optional[str] = Query(None, description="Optional commodity filter")
):
    """
    Returns all crop varieties dynamically discovered from official AGMARKNET records.
    """
    varieties = snowflake_manager.get_distinct_varieties(state=state, commodity=commodity)
    return {
        "status": "SUCCESS",
        "state": state or "All States",
        "commodity": commodity or "All Crops",
        "count": len(varieties),
        "varieties": varieties
    }

@router.get("/grades")
def get_grades(
    state: Optional[str] = Query(None, description="State filter (default: None for all states)"),
    commodity: Optional[str] = Query(None, description="Optional commodity filter")
):
    """
    Returns all crop grades dynamically discovered from official AGMARKNET records.
    """
    grades = snowflake_manager.get_distinct_grades(state=state, commodity=commodity)
    return {
        "status": "SUCCESS",
        "state": state or "All States",
        "commodity": commodity or "All Crops",
        "count": len(grades),
        "grades": grades
    }

@router.get("/mandi-prices/analytics")
def get_mandi_prices_analytics(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    commodity: Optional[str] = Query(None)
):
    """
    Returns multi-crop dashboard analytics backed by real Snowflake / SQLite records.
    Includes distinct commodity totals, district & mandi coverage, latest modal prices,
    arrival quantities, and price comparison distributions.
    """
    if snowflake_manager.mode != "SNOWFLAKE_LIVE":
        count_check = snowflake_manager.execute_query("SELECT COUNT(*) as c FROM MANDI_PRICES")
        if count_check and count_check[0]["c"] == 0:
            agmarknet_provider.run_sync_pipeline(trigger_type="INITIAL_STARTUP", state="Karnataka")

    return snowflake_manager.get_all_crops_analytics(
        state=state,
        district=district,
        market=market,
        commodity=commodity
    )

@router.post("/mandi-prices/sync")
def sync_mandi_prices(
    payload: Optional[SyncMandiPricesRequest] = Body(None)
):
    """
    Triggers AGMARKNET synchronization across crops.
    Paginates through official API records, landing them safely into Snowflake / SQLite MANDI_PRICES.
    """
    state = payload.state if payload else "Karnataka"
    commodity = payload.commodity if payload else None
    date_from = payload.date_from if payload else None
    date_to = payload.date_to if payload else None
    batch_size = payload.batch_size if payload else 50
    max_pages = payload.max_pages if payload else 10

    result = agmarknet_provider.run_sync_pipeline(
        trigger_type="MANUAL_SYNC",
        state=state,
        commodity=commodity,
        date_from=date_from,
        date_to=date_to,
        batch_size=batch_size,
        max_pages=max_pages
    )

    return result

@router.get("/mandi-prices/export-csv")
def export_mandi_prices_csv(
    state: Optional[str] = Query("Karnataka"),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    commodity: Optional[str] = Query(None)
):
    """
    Exports filtered Mandi Prices across all crops to CSV.
    """
    res = snowflake_manager.get_mandi_prices_paginated(
        state=state,
        district=district,
        market=market,
        commodity=commodity,
        page=1,
        page_size=2000
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "OBSERVATION_DATE", "STATE", "DISTRICT", "MARKET", "COMMODITY", "VARIETY", "GRADE",
        "MIN_PRICE", "MAX_PRICE", "MODAL_PRICE", "ARRIVAL_QUANTITY", "SOURCE", "SOURCE_UPDATED_AT", "INGESTED_AT"
    ])

    for r in res["records"]:
        writer.writerow([
            r["observation_date"], r["state"], r["district"], r["market"],
            r["commodity"], r["variety"], r["grade"],
            r["min_price"], r["max_price"], r["modal_price"],
            r["arrival_quantity"], r["source"], r["source_updated_at"], r["ingested_at"]
        ])

    filename = f"Mandi_Prices_{commodity or 'All_Crops'}_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/states")
def get_states():
    """
    GET /api/states
    Discovers all distinct states available in the active Snowflake / SQLite market dataset.
    """
    states = snowflake_manager.get_distinct_states()
    return {"states": states}

@router.get("/market-data")
def get_market_data(
    state: Optional[str] = Query(None, description="State filter"),
    district: Optional[str] = Query(None, description="District filter"),
    market: Optional[str] = Query(None, description="Market filter"),
    commodity: Optional[str] = Query(None, description="Commodity/Crop filter"),
    search: Optional[str] = Query(None, description="Search keyword"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """
    GET /api/market-data
    Returns real APMC Mandi dataset records directly from Snowflake REALDATA3 (or local mirror)
    with pagination, search, and multi-parameter filtering.
    """
    if snowflake_manager.mode == "SNOWFLAKE_LIVE":
        return snowflake_manager.get_realdata3(
            state=state,
            district=district,
            market=market,
            commodity=commodity,
            search_query=search,
            page=page,
            page_size=page_size
        )
    return snowflake_manager.get_mandi_prices_paginated(
        state=state or "Karnataka",
        district=district,
        market=market,
        commodity=commodity,
        search_query=search,
        page=page,
        page_size=page_size
    )

@router.get("/realdata1")
def get_realdata1(
    state: Optional[str] = Query(None, description="State filter"),
    crop: Optional[str] = Query(None, description="Crop filter"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    GET /api/realdata1
    Returns state-level crop price benchmarks directly from Snowflake table REALDATA1.
    """
    return {
        "table": "REALDATA1",
        "records": snowflake_manager.get_realdata1(state=state, crop=crop, limit=limit)
    }

@router.get("/realdata2")
def get_realdata2(
    crop: Optional[str] = Query(None, description="Crop filter")
):
    """
    GET /api/realdata2
    Returns crop growing seasons and major states directly from Snowflake table REALDATA2.
    """
    return {
        "table": "REALDATA2",
        "records": snowflake_manager.get_realdata2(crop=crop)
    }

@router.get("/realdata3")
def get_realdata3(
    state: Optional[str] = Query(None, description="State filter"),
    district: Optional[str] = Query(None, description="District filter"),
    market: Optional[str] = Query(None, description="Market filter"),
    commodity: Optional[str] = Query(None, description="Commodity filter"),
    search: Optional[str] = Query(None, description="Search keyword"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """
    GET /api/realdata3
    Returns live APMC records directly from Snowflake table REALDATA3.
    """
    return snowflake_manager.get_realdata3(
        state=state,
        district=district,
        market=market,
        commodity=commodity,
        search_query=search,
        page=page,
        page_size=page_size
    )

