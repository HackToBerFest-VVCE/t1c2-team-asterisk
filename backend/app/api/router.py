from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.crops import router as crops_router
from backend.app.api.mandis import router as mandis_router
from backend.app.api.comparison import router as comparison_router
from backend.app.api.calculator import router as calculator_router
from backend.app.api.trends import router as trends_router
from backend.app.api.forecast import router as forecast_router
from backend.app.api.location import router as location_router
from backend.app.api.weather import router as weather_router
from backend.app.api.reports import router as reports_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.daily_prices import router as daily_prices_router
from backend.app.api.auth import router as auth_router
from backend.app.api.user import router as user_router
from backend.app.api.market_api import router as market_router
from backend.app.api.mandi_prices import router as mandi_prices_router
from backend.app.api.crop_recommendation import router as crop_rec_router
from backend.app.api.snowflake_explorer import router as snowflake_explorer_router
from backend.app.api.insurance import router as insurance_router
from backend.app.api.complaints import router as complaints_router
from backend.app.api.profit_loss import router as profit_loss_router
from backend.app.api.marketplace import router as marketplace_router

api_router = APIRouter(prefix="/api")

@api_router.get("", include_in_schema=False)
@api_router.get("/", include_in_schema=False)
def api_root():
    return {
        "status": "online",
        "service": "FARMPRICE AI API",
        "health": "/api/health",
        "documentation": "/docs"
    }

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(user_router)
api_router.include_router(market_router)
api_router.include_router(mandi_prices_router)
api_router.include_router(crop_rec_router)
api_router.include_router(crops_router)
api_router.include_router(mandis_router)
api_router.include_router(comparison_router)
api_router.include_router(calculator_router)
api_router.include_router(trends_router)
api_router.include_router(forecast_router)
api_router.include_router(location_router)
api_router.include_router(weather_router)
api_router.include_router(reports_router)
api_router.include_router(alerts_router)
api_router.include_router(daily_prices_router)
api_router.include_router(snowflake_explorer_router)
api_router.include_router(insurance_router)
api_router.include_router(complaints_router)
api_router.include_router(profit_loss_router)
api_router.include_router(marketplace_router)
