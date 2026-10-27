"""
Snowflake Analytical Data Explorer API Endpoints
Provides real-time discovery, metadata inspection, and paginated record exploration
directly from Snowflake Analytical Warehouse (FARMPRICE_DB.AGRICULTURE).
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.core.snowflake import snowflake_manager
from backend.app.core.config import settings

router = APIRouter(prefix="/snowflake", tags=["Snowflake Data Explorer & Analytical Warehouse"])

@router.get("/inventory")
def get_snowflake_inventory():
    """
    Returns inventory of all Snowflake tables with live row counts,
    descriptions, categories, and analytical roles.
    """
    try:
        tables = snowflake_manager.get_snowflake_table_inventory()
        health = snowflake_manager.check_connection()
        return {
            "status": "SUCCESS",
            "warehouse_mode": snowflake_manager.mode,
            "warehouse": settings.snowflake_warehouse,
            "database": settings.snowflake_database,
            "schema": settings.snowflake_schema,
            "latency_ms": health.get("latency_ms", 0.0),
            "total_tables": len(tables),
            "tables": tables
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Snowflake inventory: {str(e)}")

@router.get("/table-data")
def get_snowflake_table_data(
    table: str = Query("MANDI_PRICES", description="Table name to query (REALDATA1, REALDATA2, REALDATA3, MANDI_PRICES, CROP_REQUIREMENTS, etc.)"),
    search: Optional[str] = Query(None, description="Search keyword across text columns"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=10, le=200, description="Records per page"),
    sort_by: Optional[str] = Query(None, description="Column name to sort by"),
    sort_dir: str = Query("ASC", description="Sort direction: ASC or DESC")
):
    """
    Retrieves real paginated records, columns, and total row count
    directly from the requested Snowflake table.
    """
    try:
        data = snowflake_manager.query_snowflake_table_data(
            table_name=table,
            search=search,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_dir=sort_dir
        )
        return {
            "status": "SUCCESS",
            "warehouse_mode": snowflake_manager.mode,
            "database": settings.snowflake_database,
            "schema": settings.snowflake_schema,
            **data
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query to Snowflake table '{table}' failed: {str(e)}")
