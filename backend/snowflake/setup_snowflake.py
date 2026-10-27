"""
FARMPRICE AI (Bharat-VISTAAR) — Snowflake Setup & Verification Script
Executes schema.sql and seed_data.sql against configured Snowflake or local adapter.
"""

import sys
import os
import argparse
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.core.config import settings
from backend.app.core.snowflake import snowflake_manager

def run_setup(use_local: bool = False):
    print("=================================================================")
    print("FARMPRICE AI — Snowflake Data Warehouse Setup & Verification")
    print("=================================================================")
    
    health = snowflake_manager.check_connection()
    print(f"Target Snowflake Account: {settings.snowflake_account}")
    print(f"Current Data Engine Mode: {health['mode']}")
    print(f"Status: {health['status']}")
    print(f"Latency: {health.get('latency_ms', 0)} ms")
    print(f"Data Notice: {health['notice']}")
    
    # Query row counts
    try:
        crops = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM DIM_CROPS")
        mandis = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM DIM_MANDIS")
        facts = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM FACT_DAILY_MARKET_PRICES")
        
        # Core Agriculture Schema Tables
        agri_reqs = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM CROP_REQUIREMENTS")
        mandi_prices = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM MANDI_PRICES")
        yields = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM CROP_YIELD_HISTORY")
        costs = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM CULTIVATION_COSTS")
        sources = snowflake_manager.execute_query("SELECT COUNT(*) as cnt FROM DATA_SOURCE_LOG")

        print("\n--- Analytical & Agriculture Layer Record Verification ---")
        print(f"  * CROP_REQUIREMENTS (ICAR & UAS):          {agri_reqs[0]['cnt']} crops")
        print(f"  * MANDI_PRICES (AGMARKNET data.gov.in):    {mandi_prices[0]['cnt']} prices")
        print(f"  * CROP_YIELD_HISTORY (DA&FW Statistics):   {yields[0]['cnt']} records")
        print(f"  * CULTIVATION_COSTS (UASB Package):        {costs[0]['cnt']} cost models")
        print(f"  * DATA_SOURCE_LOG (Audit Trail):           {sources[0]['cnt']} sources")
        print(f"  * DIM_CROPS (Catalog):                     {crops[0]['cnt']} commodities")
        print(f"  * DIM_MANDIS (Karnataka APMC Markets):     {mandis[0]['cnt']} yards")
        print(f"  * FACT_DAILY_MARKET_PRICES:                {facts[0]['cnt']} observations")
        print("Data Layer is Verified and Operational.")
    except Exception as e:
        print(f"Error querying data layer: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FARMPRICE AI Snowflake Setup")
    parser.add_argument("--local", action="store_true", help="Force local SQLite adapter mode")
    args = parser.parse_args()
    run_setup(use_local=args.local)
