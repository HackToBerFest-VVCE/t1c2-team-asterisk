from fastapi import APIRouter
from backend.app.core.snowflake import snowflake_manager
from backend.app.core.config import settings

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("")
def get_health():
    sf_health = snowflake_manager.check_connection()
    overall_status = "healthy" if sf_health.get("status") == "healthy" else "degraded"
    return {
        "status": overall_status,
        "app_env": settings.app_env,
        "service": "FARMPRICE AI API",
        "version": "1.0.0",
        "snowflake": sf_health
    }

@router.get("/snowflake")
def get_snowflake_health():
    """
    GET /api/health/snowflake
    Performs live database connectivity check against Snowflake Analytical Warehouse
    (or high-fidelity local SQLite mirror), computing actual latency.
    """
    return snowflake_manager.check_connection()

