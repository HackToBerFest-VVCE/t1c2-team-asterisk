"""
Script to generate a self-contained Snowflake worksheet SQL file (deploy_to_snowflake_worksheet.sql)
from the curated schema and SQLite local database (farmprice_local.db).
This script outputs standard Snowflake SQL that can be pasted directly into Snowsight worksheet
and executed with "Run All".
"""

import sqlite3
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "farmprice_local.db"
OUTPUT_SQL_PATH = BASE_DIR / "deploy_to_snowflake_worksheet.sql"

def escape_sql_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    # String escaping for SQL
    s = str(val).replace("'", "''")
    return f"'{s}'"

def generate_snowflake_worksheet_sql():
    if not DB_PATH.exists():
        print(f"Error: {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get list of tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Discovered tables in local database: {tables}")

    out_lines = []
    out_lines.append("-- =====================================================================")
    out_lines.append("-- FARMPRICE AI (Bharat-VISTAAR) — Snowflake Analytical Warehouse")
    out_lines.append("-- Target Account: mdsfbiq-cr91823 (URL: https://app.snowflake.com/mdsfbiq/cr91823/)")
    out_lines.append("-- Worksheet: USER$/PUBLIC/DEFAULT$")
    out_lines.append("-- Instructions: Paste this entire script into your Snowflake Worksheet and click 'Run All'")
    out_lines.append("-- =====================================================================\n")

    out_lines.append("-- 1. Session Context & Warehouse Setup")
    out_lines.append("USE ROLE ACCOUNTADMIN;")
    out_lines.append("CREATE WAREHOUSE IF NOT EXISTS COMPUTE_WH")
    out_lines.append("    WITH WAREHOUSE_SIZE = 'XSMALL'")
    out_lines.append("    AUTO_SUSPEND = 60")
    out_lines.append("    AUTO_RESUME = TRUE")
    out_lines.append("    INITIALLY_SUSPENDED = TRUE;")
    out_lines.append("USE WAREHOUSE COMPUTE_WH;\n")

    out_lines.append("-- 2. Database & Schema Creation")
    out_lines.append("CREATE DATABASE IF NOT EXISTS FARMPRICE_DB;")
    out_lines.append("USE DATABASE FARMPRICE_DB;\n")
    out_lines.append("CREATE SCHEMA IF NOT EXISTS AGRICULTURE;")
    out_lines.append("CREATE SCHEMA IF NOT EXISTS ANALYTICS;")
    out_lines.append("CREATE SCHEMA IF NOT EXISTS RAW;")
    out_lines.append("CREATE SCHEMA IF NOT EXISTS STAGING;\n")

    # Read base DDL from schema.sql
    schema_sql_path = BASE_DIR / "schema.sql"
    if schema_sql_path.exists():
        schema_text = schema_sql_path.read_text(encoding="utf-8")
        out_lines.append("-- 3. Core Multi-Layer Analytical Schema (Tables & Views)")
        out_lines.append(schema_text)
        out_lines.append("\n-- =====================================================================")
        out_lines.append("-- 4. Data Insertion / Hydration from Karnataka Datasets")
        out_lines.append("-- =====================================================================\n")

    # Tables to export in order
    export_order = [
        ("AGRICULTURE", "CROP_REQUIREMENTS"),
        ("AGRICULTURE", "MANDI_PRICES"),
        ("AGRICULTURE", "CROP_YIELD_HISTORY"),
        ("AGRICULTURE", "CULTIVATION_COSTS"),
        ("AGRICULTURE", "CROP_PROFIT_ANALYSIS"),
        ("AGRICULTURE", "DATA_SOURCE_LOG"),
        ("AGRICULTURE", "WEATHER_HISTORY"),
        ("AGRICULTURE", "WEATHER_FORECAST"),
        ("ANALYTICS", "DIM_CROPS"),
        ("ANALYTICS", "DIM_VARIETIES"),
        ("ANALYTICS", "DIM_MANDIS"),
        ("ANALYTICS", "FACT_DAILY_MARKET_PRICES"),
    ]

    for schema_name, table_name in export_order:
        # Check if table exists in SQLite
        if table_name not in tables:
            continue

        cur.execute(f"PRAGMA table_info({table_name})")
        cols_info = cur.fetchall()
        col_names = [c[1] for c in cols_info]

        cur.execute(f"SELECT * FROM {table_name}")
        rows = cur.fetchall()
        print(f"Table {table_name}: {len(rows)} records found.")

        if not rows:
            continue

        out_lines.append(f"\nUSE SCHEMA {schema_name};")
        out_lines.append(f"-- Inserting {len(rows)} records into {schema_name}.{table_name}")

        # Batch inserts in chunks of 50 for clean execution in Snowflake worksheets
        chunk_size = 50
        cols_str = ", ".join(col_names)
        for i in range(0, len(rows), chunk_size):
            chunk = rows[i:i + chunk_size]
            val_rows = []
            for r in chunk:
                vals = [escape_sql_val(r[col]) for col in col_names]
                val_rows.append(f"  ({', '.join(vals)})")
            
            # Using MERGE or INSERT
            insert_stmt = f"INSERT INTO {table_name} ({cols_str}) VALUES\n" + ",\n".join(val_rows) + ";"
            out_lines.append(insert_stmt)

    # Verification queries
    out_lines.append("\n-- =====================================================================")
    out_lines.append("-- 5. Verification & Live Analytics Queries")
    out_lines.append("-- =====================================================================\n")
    out_lines.append("USE SCHEMA AGRICULTURE;")
    out_lines.append("-- Verify Record Counts:")
    out_lines.append("SELECT 'CROP_REQUIREMENTS' as TABLE_NAME, COUNT(*) as ROW_COUNT FROM CROP_REQUIREMENTS")
    out_lines.append("UNION ALL SELECT 'MANDI_PRICES', COUNT(*) FROM MANDI_PRICES")
    out_lines.append("UNION ALL SELECT 'CROP_YIELD_HISTORY', COUNT(*) FROM CROP_YIELD_HISTORY")
    out_lines.append("UNION ALL SELECT 'CULTIVATION_COSTS', COUNT(*) FROM CULTIVATION_COSTS")
    out_lines.append("UNION ALL SELECT 'DATA_SOURCE_LOG', COUNT(*) FROM DATA_SOURCE_LOG;")
    out_lines.append("\n-- View Latest Karnataka APMC Mandi Prices:")
    out_lines.append("SELECT district, market, commodity, variety, modal_price, arrival_quantity, observation_date")
    out_lines.append("FROM MANDI_PRICES")
    out_lines.append("ORDER BY observation_date DESC, modal_price DESC")
    out_lines.append("LIMIT 20;\n")
    out_lines.append("-- View High-Net-Return Crops (Profit Engine Analytical View):")
    out_lines.append("SELECT crop_name, district, estimated_gross_revenue_per_acre, total_cultivation_cost_per_acre, estimated_net_profit_per_acre, best_recommended_mandi")
    out_lines.append("FROM V_DISTRICT_CROP_PROFIT_SUMMARY")
    out_lines.append("ORDER BY estimated_net_profit_per_acre DESC")
    out_lines.append("LIMIT 15;\n")

    # Role PUBLIC Grants
    out_lines.append("\n-- =====================================================================")
    out_lines.append("-- 6. Role PUBLIC Grants (Allow Role PUBLIC to query datasets)")
    out_lines.append("-- =====================================================================\n")
    out_lines.append("GRANT USAGE, OPERATE ON WAREHOUSE COMPUTE_WH TO ROLE PUBLIC;")
    out_lines.append("GRANT USAGE ON DATABASE FARMPRICE_DB TO ROLE PUBLIC;")
    out_lines.append("GRANT USAGE ON SCHEMA FARMPRICE_DB.AGRICULTURE TO ROLE PUBLIC;")
    out_lines.append("GRANT USAGE ON SCHEMA FARMPRICE_DB.ANALYTICS TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON ALL TABLES IN SCHEMA FARMPRICE_DB.AGRICULTURE TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON FUTURE TABLES IN SCHEMA FARMPRICE_DB.AGRICULTURE TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON ALL VIEWS IN SCHEMA FARMPRICE_DB.AGRICULTURE TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON FUTURE VIEWS IN SCHEMA FARMPRICE_DB.AGRICULTURE TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON ALL TABLES IN SCHEMA FARMPRICE_DB.ANALYTICS TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON FUTURE TABLES IN SCHEMA FARMPRICE_DB.ANALYTICS TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON ALL VIEWS IN SCHEMA FARMPRICE_DB.ANALYTICS TO ROLE PUBLIC;")
    out_lines.append("GRANT SELECT ON FUTURE VIEWS IN SCHEMA FARMPRICE_DB.ANALYTICS TO ROLE PUBLIC;")
    out_lines.append("GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA FARMPRICE_DB.AGRICULTURE TO ROLE PUBLIC;\n")
    out_lines.append("-- Test Role PUBLIC Access:")
    out_lines.append("USE ROLE PUBLIC;")
    out_lines.append("USE WAREHOUSE COMPUTE_WH;")
    out_lines.append("USE DATABASE FARMPRICE_DB;")
    out_lines.append("USE SCHEMA AGRICULTURE;")
    out_lines.append("SELECT CURRENT_ROLE(), CURRENT_DATABASE(), CURRENT_SCHEMA();")
    out_lines.append("SELECT 'MANDI_PRICES' AS TABLE_NAME, COUNT(*) FROM MANDI_PRICES;\n")

    OUTPUT_SQL_PATH.write_text("\n".join(out_lines), encoding="utf-8")
    print(f"Successfully generated {OUTPUT_SQL_PATH} ({len(out_lines)} lines, {OUTPUT_SQL_PATH.stat().st_size} bytes)")

if __name__ == "__main__":
    generate_snowflake_worksheet_sql()
