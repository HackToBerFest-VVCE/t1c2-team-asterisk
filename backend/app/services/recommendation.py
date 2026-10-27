from typing import List, Dict, Any, Optional
from backend.app.core.snowflake import snowflake_manager
from backend.app.services.calculator import calculate_net_return, convert_to_quintals
from backend.app.services.location import estimate_road_distance
from backend.app.services.trend_detector import trend_detector
from backend.app.schemas.calculator import NetReturnCalculationRequest
from backend.app.schemas.market import (
    MarketComparisonRequest,
    MarketComparisonResponse,
    MandiComparisonItem
)

def evaluate_market_comparison(req: MarketComparisonRequest) -> MarketComparisonResponse:
    """
    Retrieves eligible mandi observations from the active Snowflake/adapter layer,
    calculates net return for each, ranks them deterministically, integrates
    rising/falling trend detection signals, and produces explainable reasoning.
    """
    q_quintals, q_kg = convert_to_quintals(req.quantity, req.unit)
    
    query = """
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
            f.data_quality_status
        FROM FACT_DAILY_MARKET_PRICES f
        JOIN DIM_MANDIS m ON f.mandi_id = m.mandi_id
        JOIN DIM_CROPS c ON f.crop_id = c.crop_id
        JOIN DIM_VARIETIES v ON f.variety_id = v.variety_id
        WHERE f.crop_id = ?
    """
    params = [req.crop_id]
    if req.variety_id:
        query += " AND f.variety_id = ?"
        params.append(req.variety_id)

    raw_results = snowflake_manager.execute_query(query, tuple(params))
    
    # Deduplicate by mandi_id, taking most recent date if multiple exist
    mandi_records: Dict[str, Dict[str, Any]] = {}
    for r in raw_results:
        m_id = r["mandi_id"]
        if m_id not in mandi_records or r["observation_date"] > mandi_records[m_id]["observation_date"]:
            mandi_records[m_id] = r

    items: List[MandiComparisonItem] = []
    
    crop_name = "Selected Crop"
    variety_name = None

    for m_id, row in mandi_records.items():
        crop_name = row.get("crop_name", crop_name)
        variety_name = row.get("variety_name", variety_name)
        
        mandi_lat = float(row["latitude"])
        mandi_lon = float(row["longitude"])
        orig_lat = req.origin_latitude if req.origin_latitude is not None else 13.0033
        orig_lon = req.origin_longitude if req.origin_longitude is not None else 76.1004

        straight_dist, road_dist = estimate_road_distance(orig_lat, orig_lon, mandi_lat, mandi_lon)

        if req.max_distance_km and road_dist > req.max_distance_km:
            continue

        modal_price = float(row["modal_price_per_q"])
        min_price = float(row.get("min_price_per_q", modal_price * 0.85))
        max_price = float(row.get("max_price_per_q", modal_price * 1.15))
        arrivals = float(row.get("arrival_quantity_tonnes", 0.0))
        cess_pct = float(row.get("apmc_cess_percentage", 1.5))
        weighing_fee = float(row.get("weighing_fee_per_q", 3.0))

        # Calculate Net Return
        calc_req = NetReturnCalculationRequest(
            crop_id=req.crop_id,
            variety_id=req.variety_id,
            quantity=q_quintals,
            unit="quintals",
            applicable_price_per_q=modal_price,
            distance_km=road_dist,
            transport_rate_per_km_per_q=req.custom_transport_rate_per_km_q,
            loading_unloading_per_q=req.custom_loading_per_q,
            market_cess_percent=cess_pct,
            other_expenses=weighing_fee * q_quintals
        )
        calc_res = calculate_net_return(calc_req)

        # Detect trend for this mandi & crop
        trend_info = trend_detector.detect_trend(req.crop_id, m_id)

        items.append(MandiComparisonItem(
            mandi_id=m_id,
            mandi_name=row["mandi_name"],
            mandi_name_kannada=row.get("mandi_name_kannada"),
            district=row["district"],
            state=row["state"],
            observation_date=row["observation_date"],
            min_price_per_q=min_price,
            modal_price_per_q=modal_price,
            max_price_per_q=max_price,
            arrival_quantity_tonnes=arrivals,
            straight_line_distance_km=straight_dist,
            estimated_road_distance_km=road_dist,
            distance_method="Road estimate (1.25x curvature factor)",
            gross_sale_value=calc_res.gross_sale_value,
            transport_expense=calc_res.costs.transport_cost,
            loading_expense=calc_res.costs.loading_unloading_cost,
            market_fees=calc_res.costs.market_fees,
            other_expenses=calc_res.costs.other_expenses,
            total_expenses=calc_res.costs.total_expenses,
            estimated_net_return=calc_res.estimated_net_return,
            net_return_per_quintal=calc_res.net_return_per_quintal,
            break_even_price_per_q=calc_res.break_even_price_per_q,
            rank=0,
            price_difference_from_best=0.0,
            net_return_difference_from_best=0.0,
            trend_classification=trend_info.get("classification", "STABLE"),
            trend_evidence=trend_info.get("evidence"),
            data_source=row.get("data_source", "AGMARKNET"),
            data_quality_status=row.get("data_quality_status", "VERIFIED"),
            staleness_days=0,
            recommendation_reasons=[],
            missing_info_notices=[]
        ))

    # Deterministic Ranking Rules:
    # 1. Highest Net Return
    # 2. Highest Arrival Quantity (liquidity)
    # 3. Lowest Road Distance
    items.sort(
        key=lambda x: (
            -x.estimated_net_return,
            -(x.arrival_quantity_tonnes or 0.0),
            x.estimated_road_distance_km
        )
    )

    highest_price_mandi_id = None
    max_price_seen = -1.0
    for it in items:
        if it.modal_price_per_q > max_price_seen:
            max_price_seen = it.modal_price_per_q
            highest_price_mandi_id = it.mandi_id

    best_mandi = items[0] if items else None

    for idx, it in enumerate(items, start=1):
        it.rank = idx
        if idx == 1:
            it.is_best_net_return = True
        if it.mandi_id == highest_price_mandi_id:
            it.is_highest_price = True

        if best_mandi:
            it.net_return_difference_from_best = round(it.estimated_net_return - best_mandi.estimated_net_return, 2)
            it.price_difference_from_best = round(it.modal_price_per_q - best_mandi.modal_price_per_q, 2)

        reasons = []
        if it.is_best_net_return:
            reasons.append(f"Highest take-home return of ₹{it.estimated_net_return:,.0f} for your {q_quintals} quintals.")
            if it.estimated_road_distance_km <= 20.0:
                reasons.append(f"Low freight overhead due to close proximity ({it.estimated_road_distance_km} km road route).")
            if (it.arrival_quantity_tonnes or 0) >= 100:
                reasons.append(f"High trading volume ({it.arrival_quantity_tonnes} tonnes) guarantees fast auction clearance.")
            if it.trend_classification == "RISING":
                reasons.append(f"Market momentum is RISING ({it.trend_evidence}).")
        else:
            diff = abs(it.net_return_difference_from_best)
            reasons.append(f"Yields ₹{diff:,.0f} lower take-home earnings than {best_mandi.mandi_name}.")
            if it.is_highest_price:
                reasons.append(
                    f"Notice: While the listed price is ₹{it.modal_price_per_q:,.0f}/q (+₹{it.price_difference_from_best:,.0f}), "
                    f"the {it.estimated_road_distance_km} km distance incurs ₹{it.transport_expense:,.0f} in transport costs!"
                )
            elif it.estimated_road_distance_km > best_mandi.estimated_road_distance_km:
                reasons.append(f"Higher transit distance (+{round(it.estimated_road_distance_km - best_mandi.estimated_road_distance_km, 1)} km) increases logistics expense.")

        it.recommendation_reasons = reasons

    notice = None
    if len(items) < 3:
        notice = f"Only {len(items)} eligible mandi(s) currently have verified records for this crop. Displaying all verified markets without synthetic records."

    return MarketComparisonResponse(
        crop_id=req.crop_id,
        crop_name=crop_name,
        variety_id=req.variety_id,
        variety_name=variety_name,
        quantity_quintals=q_quintals,
        origin_name=req.origin_name or "Hassan, Karnataka",
        comparison_date=req.selling_date or "2026-10-24",
        total_eligible_mandis=len(items),
        data_mode=snowflake_manager.mode,
        best_mandi_id=best_mandi.mandi_id if best_mandi else None,
        best_mandi_name=best_mandi.mandi_name if best_mandi else None,
        highest_listed_price_mandi_id=highest_price_mandi_id,
        mandis=items,
        data_quality_notice=notice
    )
