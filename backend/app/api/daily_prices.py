import csv
import io
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Query, Response, HTTPException
from backend.app.core.snowflake import snowflake_manager
from backend.app.schemas.market import DailyPriceRecordItem, DailyPricesExplorerResponse

router = APIRouter(prefix="/daily-prices", tags=["Feature 1 — Daily Mandi Prices Explorer"])

@router.get("", response_model=DailyPricesExplorerResponse)
def get_daily_prices_explorer(
    state: Optional[str] = Query(None, description="Filter by state (e.g. Karnataka)"),
    district: Optional[str] = Query(None, description="Filter by district (e.g. Hassan)"),
    mandi_id: Optional[str] = Query(None, description="Filter by mandi ID"),
    crop_id: Optional[str] = Query(None, description="Filter by crop ID"),
    search_query: Optional[str] = Query(None, description="Search crop or mandi name"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    sort_by: str = Query("date_desc", description="Sort by: date_desc, price_desc, price_asc, mandi_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100)
):
    """
    Feature 1: Complete Daily Mandi Price Explorer API.
    Provides multi-filter querying, autocomplete search, data freshness,
    and stale/quality flags for official Agmarknet records.
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
            f.data_quality_status,
            f.observation_date AS created_at
        FROM FACT_DAILY_MARKET_PRICES f
        JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
        JOIN DIM_CROPS c ON f.crop_id = c.crop_id
        JOIN DIM_VARIETIES v ON f.variety_id = v.variety_id
        WHERE 1=1
    """
    params = []

    if state:
        query += " AND LOWER(m.state) = LOWER(?)"
        params.append(state)
    if district:
        query += " AND LOWER(m.district) = LOWER(?)"
        params.append(district)
    if mandi_id:
        query += " AND m.mandi_id = ?"
        params.append(mandi_id)
    if crop_id:
        query += " AND c.crop_id = ?"
        params.append(crop_id)
    if date_from:
        query += " AND f.observation_date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND f.observation_date <= ?"
        params.append(date_to)
    if search_query:
        query += " AND (LOWER(c.crop_name) LIKE ? OR LOWER(m.mandi_name) LIKE ? OR LOWER(m.district) LIKE ?)"
        term = f"%{search_query.lower()}%"
        params.extend([term, term, term])

    # Sorting
    if sort_by == "price_desc":
        query += " ORDER BY f.modal_price_per_q DESC"
    elif sort_by == "price_asc":
        query += " ORDER BY f.modal_price_per_q ASC"
    elif sort_by == "mandi_asc":
        query += " ORDER BY m.mandi_name ASC"
    else: # date_desc
        query += " ORDER BY f.observation_date DESC, f.modal_price_per_q DESC"

    raw_records = snowflake_manager.execute_query(query, tuple(params) if params else None)
    total_records = len(raw_records)

    # Pagination
    offset = (page - 1) * page_size
    paged_records = raw_records[offset:offset + page_size]

    now_date = datetime.now().date()
    items: List[DailyPriceRecordItem] = []

    for r in paged_records:
        obs_date_str = str(r["observation_date"]).split("T")[0]
        days_old = 0
        try:
            obs_dt = datetime.strptime(obs_date_str, "%Y-%m-%d").date()
            days_old = max(0, (now_date - obs_dt).days)
        except Exception:
            pass

        items.append(DailyPriceRecordItem(
            fact_id=r["fact_id"],
            mandi_id=r["mandi_id"],
            mandi_name=r["mandi_name"],
            district=r["district"],
            state=r["state"],
            crop_id=r["crop_id"],
            crop_name=r["crop_name"],
            variety_name=r["variety_name"],
            observation_date=obs_date_str,
            min_price_per_q=float(r["min_price_per_q"] or 0.0),
            modal_price_per_q=float(r["modal_price_per_q"]),
            max_price_per_q=float(r["max_price_per_q"] or 0.0),
            arrival_quantity_tonnes=float(r["arrival_quantity_tonnes"] or 0.0) if r.get("arrival_quantity_tonnes") else None,
            price_unit="₹ / Quintal",
            data_source=r.get("data_source", "AGMARKNET"),
            retrieval_timestamp=str(r.get("created_at", "2026-10-24 10:00:00")),
            data_quality_status=r.get("data_quality_status", "VERIFIED"),
            is_stale=days_old > 7,
            staleness_days=days_old
        ))

    # Fetch distinct available filters
    crops_q = snowflake_manager.execute_query("SELECT DISTINCT crop_name FROM DIM_CROPS ORDER BY crop_name")
    mandis_q = snowflake_manager.execute_query("SELECT DISTINCT mandi_name FROM DIM_MANDIS ORDER BY mandi_name")
    districts_q = snowflake_manager.execute_query("SELECT DISTINCT district FROM DIM_MANDIS ORDER BY district")

    return DailyPricesExplorerResponse(
        total_records=total_records,
        page=page,
        page_size=page_size,
        freshness_timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        data_mode=snowflake_manager.mode,
        data_source="AGMARKNET / Verified Indian Mandi Records",
        records=items,
        available_states=["Karnataka"],
        available_districts=[d["district"] for d in districts_q],
        available_crops=[c["crop_name"] for c in crops_q],
        available_mandis=[m["mandi_name"] for m in mandis_q]
    )

@router.get("/export-csv")
def export_daily_prices_csv(
    crop_id: Optional[str] = Query(None),
    mandi_id: Optional[str] = Query(None)
):
    """Exports filtered daily price records to CSV."""
    query = """
        SELECT 
            f.observation_date,
            m.mandi_name,
            m.district,
            m.state,
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
        WHERE 1=1
    """
    params = []
    if crop_id:
        query += " AND c.crop_id = ?"
        params.append(crop_id)
    if mandi_id:
        query += " AND m.mandi_id = ?"
        params.append(mandi_id)
    query += " ORDER BY f.observation_date DESC LIMIT 500"

    records = snowflake_manager.execute_query(query, tuple(params) if params else None)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Mandi Name", "District", "State", "Commodity", "Variety",
        "Min Price (Rs/q)", "Modal Price (Rs/q)", "Max Price (Rs/q)", "Arrivals (Tonnes)", "Source", "Status"
    ])

    for r in records:
        writer.writerow([
            r["observation_date"], r["mandi_name"], r["district"], r["state"],
            r["crop_name"], r["variety_name"], r["min_price_per_q"], r["modal_price_per_q"],
            r["max_price_per_q"], r["arrival_quantity_tonnes"], r["data_source"], r["data_quality_status"]
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Agmarknet_Daily_Prices.csv"}
    )
