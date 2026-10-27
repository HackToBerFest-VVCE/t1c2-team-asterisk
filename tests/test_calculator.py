import pytest
from backend.app.services.calculator import convert_to_quintals, calculate_net_return
from backend.app.schemas.calculator import NetReturnCalculationRequest

def test_unit_conversion_quintals_to_kg():
    q_quintals, q_kg = convert_to_quintals(50.0, "quintals")
    assert q_quintals == 50.0
    assert q_kg == 5000.0

def test_unit_conversion_kg_to_quintals():
    q_quintals, q_kg = convert_to_quintals(250.0, "kg")
    assert q_quintals == 2.5
    assert q_kg == 250.0

def test_invalid_unit_raises_error():
    with pytest.raises(ValueError):
        convert_to_quintals(10.0, "liters")

def test_zero_or_negative_quantity_raises_error():
    with pytest.raises(ValueError):
        convert_to_quintals(0.0, "quintals")
    with pytest.raises(ValueError):
        convert_to_quintals(-5.0, "kg")

def test_net_return_formula_consistency():
    # 50 quintals at Rs 2,100/q
    # Gross = 50 * 2100 = Rs 105,000
    # Manual transport = 1200
    # Manual loading = 400
    # Manual fees = 300
    # Other expenses = 200
    # Total expenses = 1200 + 400 + 300 + 200 = 2100
    # Net Return = 105,000 - 2,100 = 102,900
    req = NetReturnCalculationRequest(
        crop_id="CROP_TOMATO",
        quantity=50.0,
        unit="quintals",
        applicable_price_per_q=2100.0,
        manual_transport_cost=1200.0,
        manual_loading_cost=400.0,
        manual_market_fees=300.0,
        other_expenses=200.0
    )
    res = calculate_net_return(req)
    assert res.gross_sale_value == 105000.0
    assert res.costs.total_expenses == 2100.0
    assert res.estimated_net_return == 102900.0
    assert res.net_return_per_quintal == round(102900.0 / 50.0, 2)
    assert res.break_even_price_per_q == round(2100.0 / 50.0, 2)
    assert res.is_profitable is True

def test_distance_based_transport_calculation():
    # 10 quintals, 20 km, 0.85 rate/km/q = 10 * 20 * 0.85 = Rs 170
    req = NetReturnCalculationRequest(
        crop_id="CROP_ONION",
        quantity=10.0,
        unit="quintals",
        applicable_price_per_q=2000.0,
        distance_km=20.0,
        transport_rate_per_km_per_q=0.85,
        loading_unloading_per_q=10.0, # 10 * 10 = Rs 100
        market_cess_percent=1.5,      # 1.5% of 20,000 = Rs 300
        other_expenses=0.0
    )
    res = calculate_net_return(req)
    assert res.gross_sale_value == 20000.0
    assert res.costs.transport_cost == 170.0
    assert res.costs.loading_unloading_cost == 100.0
    assert res.costs.market_fees == 300.0
    assert res.costs.total_expenses == 570.0
    assert res.estimated_net_return == 19430.0

def test_negative_costs_raise_validation_error():
    with pytest.raises(Exception):
        NetReturnCalculationRequest(
            crop_id="CROP_TOMATO",
            quantity=10.0,
            applicable_price_per_q=2000.0,
            manual_transport_cost=-50.0
        )
