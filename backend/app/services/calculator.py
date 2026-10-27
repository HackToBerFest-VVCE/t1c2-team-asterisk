import math
from typing import Dict, Any, Tuple
from backend.app.core.config import settings
from backend.app.schemas.calculator import (
    NetReturnCalculationRequest,
    NetReturnCalculationResponse,
    CostBreakdown
)

def convert_to_quintals(quantity: float, unit: str) -> Tuple[float, float]:
    """
    Converts input quantity to quintals and kilograms.
    1 Quintal = 100 Kilograms.
    Returns (quantity_quintals, quantity_kg).
    """
    if quantity <= 0:
        raise ValueError("Quantity must be strictly positive.")
    
    clean_unit = unit.lower().strip()
    if clean_unit in ("quintals", "quintal", "q"):
        q_quintals = quantity
        q_kg = quantity * 100.0
    elif clean_unit in ("kg", "kilograms", "kilogram"):
        q_quintals = quantity / 100.0
        q_kg = quantity
    else:
        raise ValueError(f"Unsupported unit '{unit}'. Use 'quintals' or 'kg'.")

    return round(q_quintals, 4), round(q_kg, 2)

def calculate_net_return(req: NetReturnCalculationRequest) -> NetReturnCalculationResponse:
    """
    Calculates deterministic Take-Home Net Return and per-unit breakdowns (per-quintal and per-kg).
    Formula:
      Gross Sale Value = Quantity (q) * Price (Rs/q)
      Net Return = Gross - Transport - Loading - Mandi Fees - Packaging - Storage - Weighing - Other
    """
    q_quintals, q_kg = convert_to_quintals(req.quantity, req.unit)
    
    if req.applicable_price_per_q <= 0:
        raise ValueError("Applicable market price must be greater than zero.")
        
    gross_sale_value = round(q_quintals * req.applicable_price_per_q, 2)

    # 1. Transport expense
    if req.manual_transport_cost is not None:
        if req.manual_transport_cost < 0:
            raise ValueError("Manual transport cost cannot be negative.")
        transport_cost = req.manual_transport_cost
    else:
        dist = req.distance_km if req.distance_km is not None else 15.0
        rate = req.transport_rate_per_km_per_q if req.transport_rate_per_km_per_q is not None else settings.default_transport_per_km_per_q
        if dist < 0 or rate < 0:
            raise ValueError("Distance and transport rate cannot be negative.")
        transport_cost = dist * rate * q_quintals

    # 2. Loading and unloading labor
    if req.manual_loading_cost is not None:
        if req.manual_loading_cost < 0:
            raise ValueError("Manual loading cost cannot be negative.")
        loading_cost = req.manual_loading_cost
    else:
        rate_labor = req.loading_unloading_per_q if req.loading_unloading_per_q is not None else settings.default_loading_unloading_per_q
        if rate_labor < 0:
            raise ValueError("Loading rate cannot be negative.")
        loading_cost = rate_labor * q_quintals

    # 3. Market fees (APMC Cess)
    if req.manual_market_fees is not None:
        if req.manual_market_fees < 0:
            raise ValueError("Manual market fees cannot be negative.")
        market_fees = req.manual_market_fees
    else:
        cess_pct = req.market_cess_percent if req.market_cess_percent is not None else settings.default_market_cess_percent
        if cess_pct < 0 or cess_pct > 100:
            raise ValueError("Market cess percent must be between 0 and 100.")
        market_fees = gross_sale_value * (cess_pct / 100.0)

    # 4. Packaging, Storage, Weighing, and Other expenses
    pkg_cost = req.packaging_cost if req.packaging_cost is not None else 0.0
    storage_cost = req.storage_cost if req.storage_cost is not None else 0.0
    weighing_fee = req.weighing_fee if req.weighing_fee is not None else 0.0
    other_expenses = req.other_expenses if req.other_expenses is not None else 0.0

    if pkg_cost < 0 or storage_cost < 0 or weighing_fee < 0 or other_expenses < 0:
        raise ValueError("Expense items cannot be negative.")

    total_expenses = round(
        transport_cost + loading_cost + market_fees + pkg_cost + storage_cost + weighing_fee + other_expenses,
        2
    )
    total_expenses_per_q = round(total_expenses / q_quintals, 2)
    total_expenses_per_kg = round(total_expenses / q_kg, 2)

    estimated_net_return = round(gross_sale_value - total_expenses, 2)
    net_return_per_q = round(estimated_net_return / q_quintals, 2)
    net_return_per_kg = round(estimated_net_return / q_kg, 2)

    # Break-even price per quintal & per kg
    if req.production_cost_per_q is not None and req.production_cost_per_q > 0:
        break_even_price_q = round(total_expenses_per_q + req.production_cost_per_q, 2)
    else:
        break_even_price_q = round(total_expenses_per_q, 2)
    
    break_even_price_kg = round(break_even_price_q / 100.0, 2)
    is_profitable = estimated_net_return > 0

    costs = CostBreakdown(
        transport_cost=round(transport_cost, 2),
        loading_unloading_cost=round(loading_cost, 2),
        market_fees=round(market_fees, 2),
        packaging_cost=round(pkg_cost, 2),
        storage_cost=round(storage_cost, 2),
        weighing_fee=round(weighing_fee, 2),
        other_expenses=round(other_expenses, 2),
        total_expenses=total_expenses,
        total_expenses_per_q=total_expenses_per_q,
        total_expenses_per_kg=total_expenses_per_kg
    )

    assumptions_note = (
        "Calculated returns are estimates based on documented transport rates, APMC cess, and auction modal prices. "
        "Final realization may vary depending on physical crop moisture, grading, and weighing."
    )

    return NetReturnCalculationResponse(
        quantity_quintals=q_quintals,
        quantity_kg=q_kg,
        applicable_price_per_q=req.applicable_price_per_q,
        applicable_price_per_kg=round(req.applicable_price_per_q / 100.0, 2),
        gross_sale_value=gross_sale_value,
        costs=costs,
        estimated_net_return=estimated_net_return,
        net_return_per_quintal=net_return_per_q,
        net_return_per_kg=net_return_per_kg,
        break_even_price_per_q=break_even_price_q,
        break_even_price_per_kg=break_even_price_kg,
        is_profitable=is_profitable,
        assumptions_note=assumptions_note
    )
