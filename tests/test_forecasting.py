import pytest
from backend.app.schemas.forecast import ForecastRequest
from backend.app.services.forecasting import train_and_forecast_price

def test_forecasting_pipeline_success():
    req = ForecastRequest(
        crop_id="CROP_TOMATO",
        variety_id="VAR_TOM_HYBRID",
        mandi_id="MND_HASSAN",
        horizon_days=7
    )
    res = train_and_forecast_price(req)
    assert res.status == "SUCCESS"
    assert len(res.forecast_points) == 7
    assert res.metrics is not None
    assert res.metrics.mape_percentage > 0.0
    assert res.metrics.baseline_mape_percentage > 0.0
    
    # Check prediction intervals
    for pt in res.forecast_points:
        assert pt.lower_bound <= pt.predicted_modal_price <= pt.upper_bound
        assert pt.predicted_modal_price > 0

def test_forecasting_insufficient_data_guard():
    # Request crop/mandi with no or fewer than 14 records (e.g. dummy crop)
    req = ForecastRequest(
        crop_id="CROP_NONEXISTENT",
        mandi_id="MND_HASSAN",
        horizon_days=7
    )
    res = train_and_forecast_price(req)
    assert res.status == "INSUFFICIENT_DATA"
    assert res.uncertainty_level == "UNAVAILABLE"
    assert len(res.forecast_points) == 0
    assert "insufficient" in res.disclaimer.lower() or "fewer than 14" in res.disclaimer.lower()
