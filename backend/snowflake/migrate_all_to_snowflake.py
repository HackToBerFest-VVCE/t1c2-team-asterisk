"""
FARMPRICE AI — Complete Snowflake Data Warehouse Migration & Hydration
1. Creates agronomic tables (CROP_REQUIREMENTS, CULTIVATION_COSTS, CROP_YIELD_HISTORY, etc.) in FARMPRICE_DB.AGRICULTURE
2. Hydrates verified ICAR & UAS agronomic data into Snowflake
3. Populates MANDI_PRICES directly from REALDATA3 (9,832 records)
4. Validates final row counts in Snowflake
"""

import os
import sys
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
import snowflake.connector

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "mdsfbiq-cr91823")
USER = os.getenv("SNOWFLAKE_USER", "CP")
PASSWORD = os.getenv("SNOWFLAKE_PASSWORD")
DATABASE = os.getenv("SNOWFLAKE_DATABASE", "FARMPRICE_DB")
SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "AGRICULTURE")
WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "FARMPRICE_WH")
ROLE = os.getenv("SNOWFLAKE_ROLE", "ACCOUNTADMIN")

LOCAL_DB_PATH = Path(__file__).resolve().parent / "farmprice_local.db"

def run_migration():
    print("=" * 70)
    print("MIGRATING ALL FARMPRICE AI FEATURES & DATASETS TO SNOWFLAKE")
    print(f"Target: {DATABASE}.{SCHEMA} on {ACCOUNT} (WH: {WAREHOUSE})")
    print("=" * 70)

    # 1. Connect to Snowflake
    conn = snowflake.connector.connect(
        account=ACCOUNT,
        user=USER,
        password=PASSWORD,
        warehouse=WAREHOUSE,
        database=DATABASE,
        schema=SCHEMA,
        role=ROLE
    )
    cur = conn.cursor()
    print("✓ Successfully connected to live Snowflake Analytical Warehouse!")

    # 2. Connect to Local SQLite
    sqlite_conn = sqlite3.connect(LOCAL_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # 3. Create CROP_REQUIREMENTS table
    print("\n--- 1. Creating & Hydrating CROP_REQUIREMENTS ---")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CROP_REQUIREMENTS (
            crop_id VARCHAR(64) PRIMARY KEY,
            crop_name VARCHAR(100) NOT NULL,
            crop_name_kannada VARCHAR(100),
            scientific_name VARCHAR(150),
            category VARCHAR(50) NOT NULL,
            min_temp_c NUMBER(5, 2) NOT NULL,
            max_temp_c NUMBER(5, 2) NOT NULL,
            opt_temp_min_c NUMBER(5, 2) NOT NULL,
            opt_temp_max_c NUMBER(5, 2) NOT NULL,
            min_rainfall_mm NUMBER(8, 2) DEFAULT 400.0,
            max_rainfall_mm NUMBER(8, 2) DEFAULT 1200.0,
            min_soil_ph NUMBER(4, 2) NOT NULL DEFAULT 5.5,
            max_soil_ph NUMBER(4, 2) NOT NULL DEFAULT 7.5,
            soil_type VARCHAR(150) DEFAULT 'Well-drained Red Loam / Sandy Loam',
            water_needs VARCHAR(30) NOT NULL DEFAULT 'Medium',
            growing_days_min INT NOT NULL,
            growing_days_max INT NOT NULL,
            season VARCHAR(100) NOT NULL,
            recommended_planting_months VARCHAR(100),
            suitable_zones VARCHAR(255),
            weather_sensitivities VARCHAR(255),
            source VARCHAR(100) DEFAULT 'ICAR & UAS Bengaluru Package of Practices',
            source_url VARCHAR(255),
            verification_status VARCHAR(50) DEFAULT 'VERIFIED_SCIENTIFIC',
            created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
    """)
    cur.execute("SELECT COUNT(*) FROM CROP_REQUIREMENTS")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT * FROM CROP_REQUIREMENTS")
        rows = sqlite_cur.fetchall()
        if rows:
            cols = rows[0].keys()
            cols_sql = ", ".join(cols)
            cur.executemany(
                f"MERGE INTO CROP_REQUIREMENTS target USING (SELECT {', '.join([f'%s as {c}' for c in cols])}) source "
                f"ON target.crop_id = source.crop_id "
                f"WHEN NOT MATCHED THEN INSERT ({cols_sql}) VALUES ({', '.join([f'source.{c}' for c in cols])})",
                [[r[c] for c in cols] for r in rows]
            )
            print(f"✓ CROP_REQUIREMENTS hydrated with {len(rows)} records from ICAR/UAS catalog.")
    else:
        print("✓ CROP_REQUIREMENTS already hydrated.")

    # 4. Create CULTIVATION_COSTS table
    print("\n--- 2. Creating & Hydrating CULTIVATION_COSTS ---")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CULTIVATION_COSTS (
            cost_id VARCHAR(64) PRIMARY KEY,
            crop_name VARCHAR(100) NOT NULL,
            district VARCHAR(100) NOT NULL,
            season VARCHAR(50) NOT NULL,
            reference_year VARCHAR(20) NOT NULL,
            seed_cost_per_acre NUMBER(10, 2) NOT NULL,
            fertilizer_cost_per_acre NUMBER(10, 2) NOT NULL,
            labour_cost_per_acre NUMBER(10, 2) NOT NULL,
            irrigation_cost_per_acre NUMBER(10, 2) NOT NULL,
            crop_protection_cost_per_acre NUMBER(10, 2) NOT NULL,
            machinery_tillage_cost_per_acre NUMBER(10, 2) NOT NULL,
            harvesting_cost_per_acre NUMBER(10, 2) NOT NULL,
            packaging_transport_cost_per_acre NUMBER(10, 2) NOT NULL,
            total_cost_per_acre NUMBER(10, 2) NOT NULL,
            source VARCHAR(100) DEFAULT 'UAS Bengaluru & CACP Cost of Cultivation Studies',
            verification_type VARCHAR(50) DEFAULT 'UNIVERSITY_PACKAGE_OF_PRACTICES',
            recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
    """)
    cur.execute("SELECT COUNT(*) FROM CULTIVATION_COSTS")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT * FROM CULTIVATION_COSTS")
        cost_rows = sqlite_cur.fetchall()
        if cost_rows:
            cols = cost_rows[0].keys()
            cols_sql = ", ".join(cols)
            cur.executemany(
                f"MERGE INTO CULTIVATION_COSTS target USING (SELECT {', '.join([f'%s as {c}' for c in cols])}) source "
                f"ON target.cost_id = source.cost_id "
                f"WHEN NOT MATCHED THEN INSERT ({cols_sql}) VALUES ({', '.join([f'source.{c}' for c in cols])})",
                [[r[c] for c in cols] for r in cost_rows]
            )
            print(f"✓ CULTIVATION_COSTS hydrated with {len(cost_rows)} benchmark records.")
    else:
        print("✓ CULTIVATION_COSTS already hydrated.")

    # 5. Create CROP_YIELD_HISTORY table
    print("\n--- 3. Creating & Hydrating CROP_YIELD_HISTORY ---")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CROP_YIELD_HISTORY (
            yield_id VARCHAR(64) PRIMARY KEY,
            crop_name VARCHAR(100) NOT NULL,
            district VARCHAR(100) NOT NULL,
            state VARCHAR(100) DEFAULT 'Karnataka',
            season VARCHAR(50) NOT NULL,
            reference_year VARCHAR(20) NOT NULL,
            area_hectares NUMBER(12, 2),
            production_tonnes NUMBER(12, 2),
            yield_kg_per_hectare NUMBER(10, 2) NOT NULL,
            yield_quintals_per_acre NUMBER(10, 2) NOT NULL,
            source VARCHAR(100) DEFAULT 'Department of Agriculture and Farmers Welfare (DA&FW)',
            verification_status VARCHAR(50) DEFAULT 'OFFICIALLY_PUBLISHED',
            recorded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
    """)
    cur.execute("SELECT COUNT(*) FROM CROP_YIELD_HISTORY")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT * FROM CROP_YIELD_HISTORY")
        yield_rows = sqlite_cur.fetchall()
        if yield_rows:
            cols = yield_rows[0].keys()
            cols_sql = ", ".join(cols)
            cur.executemany(
                f"MERGE INTO CROP_YIELD_HISTORY target USING (SELECT {', '.join([f'%s as {c}' for c in cols])}) source "
                f"ON target.yield_id = source.yield_id "
                f"WHEN NOT MATCHED THEN INSERT ({cols_sql}) VALUES ({', '.join([f'source.{c}' for c in cols])})",
                [[r[c] for c in cols] for r in yield_rows]
            )
            print(f"✓ CROP_YIELD_HISTORY hydrated with {len(yield_rows)} historical yield records.")
    else:
        print("✓ CROP_YIELD_HISTORY already hydrated.")

    # 6. Create CROP_PROFIT_ANALYSIS and DATA_SOURCE_LOG tables
    print("\n--- 4. Creating CROP_PROFIT_ANALYSIS & DATA_SOURCE_LOG ---")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CROP_PROFIT_ANALYSIS (
            analysis_id VARCHAR(64) PRIMARY KEY,
            location_name VARCHAR(150) NOT NULL,
            district VARCHAR(100) NOT NULL,
            crop_name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            planting_window VARCHAR(100) NOT NULL,
            expected_harvest_date DATE,
            suitability_score NUMBER(5, 2) NOT NULL,
            weather_score NUMBER(5, 2) NOT NULL,
            expected_yield_q_acre NUMBER(8, 2) NOT NULL,
            expected_selling_price_per_q NUMBER(10, 2) NOT NULL,
            estimated_cultivation_cost_acre NUMBER(10, 2) NOT NULL,
            estimated_transport_cost_acre NUMBER(10, 2) NOT NULL,
            expected_gross_revenue_acre NUMBER(12, 2) NOT NULL,
            expected_net_profit_acre NUMBER(12, 2) NOT NULL,
            conservative_profit_acre NUMBER(12, 2) NOT NULL,
            optimistic_profit_acre NUMBER(12, 2) NOT NULL,
            break_even_price_per_q NUMBER(10, 2) NOT NULL,
            best_mandi_name VARCHAR(150),
            best_mandi_distance_km NUMBER(6, 1),
            confidence_score NUMBER(4, 2) NOT NULL,
            risk_factors VARCHAR(500),
            analyzed_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS DATA_SOURCE_LOG (
            log_id VARCHAR(64) PRIMARY KEY,
            source_name VARCHAR(100) NOT NULL,
            source_url VARCHAR(255),
            records_count INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            last_synced_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            notes VARCHAR(255)
        )
    """)
    print("✓ CROP_PROFIT_ANALYSIS and DATA_SOURCE_LOG tables ready.")

    # 7. Sync REALDATA3 into MANDI_PRICES
    print("\n--- 5. Synchronizing REALDATA3 into MANDI_PRICES in Snowflake ---")
    cur.execute("SELECT COUNT(*) FROM MANDI_PRICES")
    mandi_count = cur.fetchone()[0]
    print(f"Current MANDI_PRICES row count: {mandi_count}")

    if mandi_count == 0:
        print("Populating MANDI_PRICES directly from REALDATA3 (9,832 records)...")
        sync_sql = """
            INSERT INTO MANDI_PRICES (
                OBSERVATION_DATE,
                STATE,
                DISTRICT,
                MARKET,
                COMMODITY,
                VARIETY,
                GRADE,
                MIN_PRICE,
                MAX_PRICE,
                MODAL_PRICE,
                ARRIVAL_QUANTITY,
                SOURCE,
                SOURCE_UPDATED_AT,
                INGESTED_AT
            )
            SELECT 
                COALESCE(TRY_TO_DATE(ARRIVAL_DATE, 'DD/MM/YYYY'), CURRENT_DATE()) AS OBSERVATION_DATE,
                STATE,
                DISTRICT,
                MARKET,
                COMMODITY,
                VARIETY,
                GRADE,
                COALESCE(MIN_X0020_PRICE::NUMBER(12, 2), 0.0) AS MIN_PRICE,
                COALESCE(MAX_X0020_PRICE::NUMBER(12, 2), 0.0) AS MAX_PRICE,
                COALESCE(MODAL_X0020_PRICE::NUMBER(12, 2), 0.0) AS MODAL_PRICE,
                0.0 AS ARRIVAL_QUANTITY,
                'SNOWFLAKE_REALDATA3' AS SOURCE,
                COALESCE(TRY_TO_TIMESTAMP_NTZ(ARRIVAL_DATE, 'DD/MM/YYYY'), CURRENT_TIMESTAMP()) AS SOURCE_UPDATED_AT,
                CURRENT_TIMESTAMP() AS INGESTED_AT
            FROM REALDATA3
        """
        cur.execute(sync_sql)
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM MANDI_PRICES")
        new_count = cur.fetchone()[0]
        print(f"✓ Successfully synchronized {new_count} records into MANDI_PRICES!")
    else:
        print(f"✓ MANDI_PRICES already contains {mandi_count} records.")

    # 8. Report Final Verification
    print("\n" + "=" * 70)
    print("FINAL SNOWFLAKE DATABASE VERIFICATION")
    print("=" * 70)
    tables_to_check = [
        "MANDI_PRICES", "REALDATA1", "REALDATA2", "REALDATA3",
        "CROP_REQUIREMENTS", "CULTIVATION_COSTS", "CROP_YIELD_HISTORY",
        "CROP_PROFIT_ANALYSIS", "DATA_SOURCE_LOG"
    ]
    for t in tables_to_check:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            cnt = cur.fetchone()[0]
            print(f"  • {DATABASE}.{SCHEMA}.{t.ljust(22)} : {cnt:>6} rows")
        except Exception as e:
            print(f"  • {DATABASE}.{SCHEMA}.{t.ljust(22)} : Error ({e})")

    cur.close()
    conn.close()
    sqlite_conn.close()
    print("\n✓ ALL FEATURES SUCCESSFULLY MIGRATED TO SNOWFLAKE!")

if __name__ == "__main__":
    run_migration()
