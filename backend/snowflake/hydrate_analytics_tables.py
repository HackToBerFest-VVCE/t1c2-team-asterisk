"""
FARMPRICE AI — Hydrate DIM and FACT tables into Snowflake FARMPRICE_DB.AGRICULTURE
Creates DIM_CROPS, DIM_VARIETIES, DIM_MANDIS, and FACT_DAILY_MARKET_PRICES in Snowflake
and populates them from the local reference dataset so that all trend detection,
forecasting, and crop recommendation queries execute directly against live Snowflake.
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

def escape_sql_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    s = str(val).replace("'", "''")
    return f"'{s}'"

def run_hydration():
    print("=" * 70)
    print("HYDRATING ANALYTICS DIM & FACT TABLES INTO SNOWFLAKE")
    print("=" * 70)

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

    sqlite_conn = sqlite3.connect(LOCAL_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # 1. DIM_CROPS
    cur.execute("""
        CREATE TABLE IF NOT EXISTS DIM_CROPS (
            crop_id VARCHAR(32) PRIMARY KEY,
            crop_name VARCHAR(100) NOT NULL,
            crop_name_kannada VARCHAR(100),
            category VARCHAR(50),
            is_perishable BOOLEAN DEFAULT FALSE,
            standard_unit VARCHAR(20) DEFAULT 'Quintal'
        )
    """)
    cur.execute("SELECT COUNT(*) FROM DIM_CROPS")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT * FROM DIM_CROPS")
        rows = sqlite_cur.fetchall()
        if rows:
            cols = rows[0].keys()
            cols_str = ", ".join(cols)
            val_tuples = []
            for r in rows:
                val_tuples.append(f"({', '.join([escape_sql_val(r[c]) for c in cols])})")
            cur.execute(f"INSERT INTO DIM_CROPS ({cols_str}) VALUES {', '.join(val_tuples)}")
            print(f"✓ DIM_CROPS hydrated with {len(rows)} records.")
    else:
        print("✓ DIM_CROPS already hydrated.")

    # 2. DIM_VARIETIES
    cur.execute("""
        CREATE TABLE IF NOT EXISTS DIM_VARIETIES (
            variety_id VARCHAR(32) PRIMARY KEY,
            crop_id VARCHAR(32),
            variety_name VARCHAR(100) NOT NULL,
            variety_name_kannada VARCHAR(100),
            description VARCHAR(255)
        )
    """)
    cur.execute("SELECT COUNT(*) FROM DIM_VARIETIES")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT * FROM DIM_VARIETIES")
        rows = sqlite_cur.fetchall()
        if rows:
            cols = rows[0].keys()
            cols_str = ", ".join(cols)
            val_tuples = []
            for r in rows:
                val_tuples.append(f"({', '.join([escape_sql_val(r[c]) for c in cols])})")
            cur.execute(f"INSERT INTO DIM_VARIETIES ({cols_str}) VALUES {', '.join(val_tuples)}")
            print(f"✓ DIM_VARIETIES hydrated with {len(rows)} records.")
    else:
        print("✓ DIM_VARIETIES already hydrated.")

    # 3. DIM_MANDIS
    cur.execute("""
        CREATE TABLE IF NOT EXISTS DIM_MANDIS (
            mandi_id VARCHAR(32) PRIMARY KEY,
            mandi_name VARCHAR(150) NOT NULL,
            mandi_name_kannada VARCHAR(150),
            district VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            latitude NUMBER(9, 6) NOT NULL,
            longitude NUMBER(9, 6) NOT NULL,
            apmc_cess_percentage NUMBER(4, 2) DEFAULT 1.5,
            weighing_fee_per_q NUMBER(6, 2) DEFAULT 3.0,
            has_cold_storage BOOLEAN DEFAULT FALSE,
            operating_days VARCHAR(100) DEFAULT 'Mon-Sat'
        )
    """)
    cur.execute("SELECT COUNT(*) FROM DIM_MANDIS")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT * FROM DIM_MANDIS")
        rows = sqlite_cur.fetchall()
        if rows:
            cols = rows[0].keys()
            cols_str = ", ".join(cols)
            val_tuples = []
            for r in rows:
                val_tuples.append(f"({', '.join([escape_sql_val(r[c]) for c in cols])})")
            cur.execute(f"INSERT INTO DIM_MANDIS ({cols_str}) VALUES {', '.join(val_tuples)}")
            print(f"✓ DIM_MANDIS hydrated with {len(rows)} records.")
    else:
        print("✓ DIM_MANDIS already hydrated.")

    # 4. FACT_DAILY_MARKET_PRICES
    cur.execute("""
        CREATE TABLE IF NOT EXISTS FACT_DAILY_MARKET_PRICES (
            fact_id VARCHAR(64) PRIMARY KEY,
            mandi_id VARCHAR(32),
            crop_id VARCHAR(32),
            variety_id VARCHAR(32),
            observation_date DATE NOT NULL,
            min_price_per_q NUMBER(10, 2),
            modal_price_per_q NUMBER(10, 2) NOT NULL,
            max_price_per_q NUMBER(10, 2),
            arrival_quantity_tonnes NUMBER(12, 2),
            data_source VARCHAR(100) DEFAULT 'AGMARKNET',
            data_quality_status VARCHAR(20) DEFAULT 'VERIFIED'
        )
    """)
    cur.execute("SELECT COUNT(*) FROM FACT_DAILY_MARKET_PRICES")
    if cur.fetchone()[0] == 0:
        sqlite_cur.execute("SELECT fact_id, mandi_id, crop_id, variety_id, observation_date, min_price_per_q, modal_price_per_q, max_price_per_q, arrival_quantity_tonnes, data_source, data_quality_status FROM FACT_DAILY_MARKET_PRICES")
        rows = sqlite_cur.fetchall()
        if rows:
            cols = rows[0].keys()
            cols_str = ", ".join(cols)
            val_tuples = []
            for r in rows:
                val_tuples.append(f"({', '.join([escape_sql_val(r[c]) for c in cols])})")
            cur.execute(f"INSERT INTO FACT_DAILY_MARKET_PRICES ({cols_str}) VALUES {', '.join(val_tuples)}")
            print(f"✓ FACT_DAILY_MARKET_PRICES hydrated with {len(rows)} records.")
    else:
        print("✓ FACT_DAILY_MARKET_PRICES already hydrated.")

    conn.commit()
    cur.close()
    conn.close()
    sqlite_conn.close()
    print("✓ Analytics DIM and FACT tables successfully hydrated in Snowflake!")

if __name__ == "__main__":
    run_hydration()
