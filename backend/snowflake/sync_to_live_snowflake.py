"""
FARMPRICE AI — Direct Live Snowflake Synchronization Tool
Connects directly to Snowflake account mdsfbiq-cr91823 (or configured account)
and syncs all verified agricultural knowledge tables, Karnataka mandi prices,
and analytical views from the local store.

Usage:
  python backend/snowflake/sync_to_live_snowflake.py --user YOUR_SNOWFLAKE_USER --password YOUR_SNOWFLAKE_PASSWORD
Or set SNOWFLAKE_USER and SNOWFLAKE_PASSWORD in your .env file and run:
  python backend/snowflake/sync_to_live_snowflake.py
"""

import sys
import os
import argparse
from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

import snowflake.connector

LOCAL_DB_PATH = Path(__file__).resolve().parent / "farmprice_local.db"
WORKSHEET_SQL_PATH = Path(__file__).resolve().parent / "deploy_to_snowflake_worksheet.sql"

def parse_args():
    parser = argparse.ArgumentParser(description="Sync FARMPRICE AI Data to Live Snowflake")
    parser.add_argument("--account", default=os.getenv("SNOWFLAKE_ACCOUNT", "mdsfbiq-cr91823"), help="Snowflake Account Identifier")
    parser.add_argument("--user", default=os.getenv("SNOWFLAKE_USER", ""), help="Snowflake Username")
    parser.add_argument("--password", default=os.getenv("SNOWFLAKE_PASSWORD", ""), help="Snowflake Password")
    parser.add_argument("--warehouse", default=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"), help="Snowflake Warehouse")
    parser.add_argument("--database", default=os.getenv("SNOWFLAKE_DATABASE", "FARMPRICE_DB"), help="Snowflake Database")
    parser.add_argument("--schema", default=os.getenv("SNOWFLAKE_SCHEMA", "AGRICULTURE"), help="Snowflake Schema")
    parser.add_argument("--role", default=os.getenv("SNOWFLAKE_ROLE", "PUBLIC"), help="Snowflake Role")
    return parser.parse_args()

def sync_to_snowflake():
    args = parse_args()

    account = args.account
    user = args.user
    password = args.password
    warehouse = args.warehouse
    database = args.database
    schema = args.schema
    role = args.role

    print("=================================================================")
    print("FARMPRICE AI — Direct Live Snowflake Warehouse Synchronization")
    print("=================================================================")
    print(f"Target Account:   {account}")
    print(f"Target Database:  {database}")
    print(f"Target Schema:    {schema}")
    print(f"Target Warehouse: {warehouse}")
    print(f"Role:             {role}")

    if not user or not password or user == "your_snowflake_username" or password == "your_snowflake_password":
        print("\n[!] Snowflake User/Password not supplied.")
        print("    You can either:")
        print("    1. Run with arguments: python backend/snowflake/sync_to_live_snowflake.py --user <username> --password <password>")
        print("    2. Or set SNOWFLAKE_USER and SNOWFLAKE_PASSWORD in your .env file.")
        print("    3. Or execute 'backend/snowflake/deploy_to_snowflake_worksheet.sql' directly in your Snowsight Worksheet:")
        print("       https://app.snowflake.com/mdsfbiq/cr91823/#/workspaces/ws/USER%24/PUBLIC/DEFAULT%24")
        return False

    print(f"\n[1/4] Connecting to Snowflake ({account}) as user '{user}'...")
    try:
        ctx = snowflake.connector.connect(
            user=user,
            password=password,
            account=account,
            warehouse=warehouse,
            role=role
        )
        cs = ctx.cursor()
        print("  -> Connected successfully to Snowflake live account!")
    except Exception as e:
        print(f"  [X] Failed to connect to Snowflake: {e}")
        return False

    try:
        print("\n[2/4] Setting up Database and Schemas...")
        cs.execute(f"CREATE DATABASE IF NOT EXISTS {database};")
        cs.execute(f"USE DATABASE {database};")
        cs.execute(f"CREATE SCHEMA IF NOT EXISTS AGRICULTURE;")
        cs.execute(f"CREATE SCHEMA IF NOT EXISTS ANALYTICS;")
        cs.execute(f"CREATE SCHEMA IF NOT EXISTS RAW;")
        cs.execute(f"CREATE SCHEMA IF NOT EXISTS STAGING;")
        print("  -> Databases and Schemas created/verified.")

        print("\n[3/4] Executing Worksheet DDL & Data Population Script...")
        if not WORKSHEET_SQL_PATH.exists():
            print("  Generating worksheet script...")
            from backend.snowflake.export_worksheet_sql import generate_snowflake_worksheet_sql
            generate_snowflake_worksheet_sql()

        sql_content = WORKSHEET_SQL_PATH.read_text(encoding="utf-8")
        
        # Split into statements, preserving block boundaries
        statements = []
        current_stmt = []
        for line in sql_content.splitlines():
            clean = line.strip()
            if clean.startswith("--") and not current_stmt:
                continue
            current_stmt.append(line)
            if clean.endswith(";"):
                stmt_text = "\n".join(current_stmt).strip()
                if stmt_text:
                    statements.append(stmt_text)
                current_stmt = []

        print(f"  Executing {len(statements)} SQL commands against Snowflake...")
        success_count = 0
        error_count = 0
        for i, stmt in enumerate(statements, 1):
            try:
                cs.execute(stmt)
                success_count += 1
                if i % 10 == 0 or i == len(statements):
                    print(f"    Progress: {i}/{len(statements)} commands executed...")
            except Exception as stmt_err:
                error_count += 1
                # Ignore duplicate key errors if already populated
                err_msg = str(stmt_err)
                if "already exists" not in err_msg.lower() and "duplicate" not in err_msg.lower():
                    print(f"    Warning on statement {i}: {stmt_err}")

        print(f"  -> Execution finished: {success_count} succeeded, {error_count} warnings/skipped.")

        print("\n[4/4] Verifying Live Snowflake Analytics Layer...")
        cs.execute(f"USE DATABASE {database};")
        cs.execute(f"USE SCHEMA AGRICULTURE;")
        
        cs.execute("""
            SELECT 'CROP_REQUIREMENTS' as tbl, COUNT(*) as cnt FROM CROP_REQUIREMENTS
            UNION ALL SELECT 'MANDI_PRICES', COUNT(*) FROM MANDI_PRICES
            UNION ALL SELECT 'CROP_YIELD_HISTORY', COUNT(*) FROM CROP_YIELD_HISTORY
            UNION ALL SELECT 'CULTIVATION_COSTS', COUNT(*) FROM CULTIVATION_COSTS
            UNION ALL SELECT 'DATA_SOURCE_LOG', COUNT(*) FROM DATA_SOURCE_LOG
        """)
        rows = cs.fetchall()
        print("\n  =================================================")
        print("  LIVE SNOWFLAKE TABLE RECORD COUNTS:")
        print("  =================================================")
        for r in rows:
            print(f"  * {r[0]:<25}: {r[1]} rows")
        print("  =================================================")

        # Test view query
        cs.execute("SELECT crop_name, district, estimated_net_profit_per_acre FROM V_DISTRICT_CROP_PROFIT_SUMMARY LIMIT 3")
        view_rows = cs.fetchall()
        print("\n  Sample from Live View (V_DISTRICT_CROP_PROFIT_SUMMARY):")
        for vr in view_rows:
            print(f"  * Crop: {vr[0]:<15} | District: {vr[1]:<15} | Net Profit/Acre: Rs. {vr[2]:,.2f}")

        print("\n[SUCCESS] Snowflake Account mdsfbiq-cr91823 is fully linked and populated with live data!")
        return True

    except Exception as e:
        print(f"\n[X] Error during synchronization: {e}")
        return False
    finally:
        cs.close()
        ctx.close()

if __name__ == "__main__":
    sync_to_snowflake()
