import pytest
from backend.app.schemas.market import MarketComparisonRequest
from backend.app.services.recommendation import evaluate_market_comparison

def test_recommendation_ranking_and_price_distinction():
    # 50 quintals of Tomato from Hassan
    req = MarketComparisonRequest(
        crop_id="CROP_TOMATO",
        variety_id="VAR_TOM_HYBRID",
        quantity=50.0,
        unit="quintals",
        origin_latitude=13.0033,
        origin_longitude=76.1004,
        origin_name="Hassan, Karnataka"
    )
    res = evaluate_market_comparison(req)
    
    assert res.total_eligible_mandis >= 3
    assert res.best_mandi_id is not None
    assert len(res.mandis) > 0

    # Verify best mandi has rank 1
    rank_1 = res.mandis[0]
    assert rank_1.rank == 1
    assert rank_1.is_best_net_return is True

    # Check that highest price vs best net return is properly identified
    # Bangalore APMC usually has highest price but high freight distance
    blr_mandi = next((m for m in res.mandis if "Bengaluru" in m.mandi_name), None)
    if blr_mandi:
        # Bangalore has higher road distance
        assert blr_mandi.estimated_road_distance_km > rank_1.estimated_road_distance_km
        # And higher transport costs
        assert blr_mandi.transport_expense > rank_1.transport_expense

    # Verify explainable reasons exist
    assert len(rank_1.recommendation_reasons) > 0
    assert any("take-home" in r.lower() or "return" in r.lower() for r in rank_1.recommendation_reasons)

def test_sorting_order_is_strictly_descending_by_net_return():
    req = MarketComparisonRequest(
        crop_id="CROP_TOMATO",
        quantity=30.0,
        unit="quintals"
    )
    res = evaluate_market_comparison(req)
    for i in range(len(res.mandis) - 1):
        assert res.mandis[i].estimated_net_return >= res.mandis[i+1].estimated_net_return
