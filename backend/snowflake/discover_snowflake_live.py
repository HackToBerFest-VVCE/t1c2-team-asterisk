"""
FARMPRICE AI — Snowflake Live Discovery & Schema Validator
Connects to Snowflake with provided credentials, inspects warehouses, databases,
schemas, and discovers tables: MANDI_PRICES, REALDATA1, REALDATA2, REALDATA3.
"""

import os
import sys
import json
from dotenv import load_dotenv
import snowflake.connector

load_dotenv()

ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "mdsfbiq-cr91823")
USER = os.getenv("SNOWFLAKE_USER", "CP")
PASSWORD = os.getenv("SNOWFLAKE_PASSWORD")
DATABASE = os.getenv("SNOWFLAKE_DATABASE", "FARMPRICE_DB")
SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "AGRICULTURE")

def run_discovery():
    print("=" * 70)
    print("FARMPRICE AI — Snowflake Live Database & Table Discovery")
    print("=" * 70)
    print(f"Account:  {ACCOUNT}")
    print(f"User:     {USER}")
    print(f"Database: {DATABASE}")
    print(f"Schema:   {SCHEMA}")
    print("-" * 70)

    # 1. Connect
    conn = None
    warehouses_to_try = [None, "COMPUTE_WH", "FARMPRICE_WH"]
    for wh in warehouses_to_try:
        try:
            print(f"[*] Attempting connection (warehouse={wh})...")
            conn_params = {
                "user": USER,
                "password": PASSWORD,
                "account": ACCOUNT,
            }
            if wh:
                conn_params["warehouse"] = wh
            
            conn = snowflake.connector.connect(**conn_params)
            print(f"[+] Successfully connected to Snowflake account {ACCOUNT}!")
            break
        except Exception as e:
            print(f"[-] Connection attempt with warehouse={wh} failed: {e}")

    if not conn:
        print("[X] Could not connect to Snowflake.")
        return

    cur = conn.cursor()

    # 2. Check current context
    try:
        cur.execute("SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_WAREHOUSE(), CURRENT_DATABASE(), CURRENT_SCHEMA()")
        row = cur.fetchone()
        print("\n[+] Active Snowflake Context:")
        print(f"    User:      {row[0]}")
        print(f"    Role:      {row[1]}")
        print(f"    Warehouse: {row[2]}")
        print(f"    Database:  {row[3]}")
        print(f"    Schema:    {row[4]}")
    except Exception as e:
        print(f"[-] Could not query session context: {e}")

    # 3. List Warehouses
    active_wh = None
    try:
        cur.execute("SHOW WAREHOUSES")
        wh_rows = cur.fetchall()
        print("\n[+] Available Warehouses:")
        for w in wh_rows:
            wh_name = w[0]
            wh_state = w[1]
            wh_size = w[3]
            print(f"    - {wh_name} (State: {wh_state}, Size: {wh_size})")
            if wh_name in ("FARMPRICE_WH", "COMPUTE_WH") and not active_wh:
                active_wh = wh_name
        if not active_wh and wh_rows:
            active_wh = wh_rows[0][0]
    except Exception as e:
        print(f"[-] SHOW WAREHOUSES failed: {e}")

    # Ensure warehouse is in use
    if active_wh:
        try:
            cur.execute(f"USE WAREHOUSE {active_wh}")
            print(f"[+] Using Warehouse: {active_wh}")
        except Exception as e:
            print(f"[-] Failed to USE WAREHOUSE {active_wh}: {e}")

    # 4. Check Database and Schema
    try:
        cur.execute(f"USE DATABASE {DATABASE}")
        cur.execute(f"USE SCHEMA {SCHEMA}")
        print(f"[+] Successfully switched to {DATABASE}.{SCHEMA}")
    except Exception as e:
        print(f"[-] Failed to switch database/schema: {e}")

    # 5. List all tables in schema
    print("\n[+] Inspecting Tables in FARMPRICE_DB.AGRICULTURE:")
    tables_found = []
    try:
        cur.execute(f"SHOW TABLES IN SCHEMA {DATABASE}.{SCHEMA}")
        t_rows = cur.fetchall()
        for t in t_rows:
            tbl_name = t[1]
            row_count = t[4]
            tables_found.append(tbl_name)
            print(f"    - Table: {tbl_name} (Estimated Rows: {row_count})")
    except Exception as e:
        print(f"[-] SHOW TABLES failed: {e}")

    # 6. Detailed inspection of specific target tables
    target_tables = ["MANDI_PRICES", "REALDATA1", "REALDATA2", "REALDATA3"]
    discovery_report = {}

    for tbl in target_tables:
        print("\n" + "=" * 50)
        print(f"Table Inspection: {DATABASE}.{SCHEMA}.{tbl}")
        print("=" * 50)
        
        tbl_info = {"exists": False, "columns": [], "row_count": 0, "sample_data": []}
        try:
            # Check columns
            cur.execute(f"DESCRIBE TABLE {DATABASE}.{SCHEMA}.{tbl}")
            cols = cur.fetchall()
            tbl_info["exists"] = True
            print("  Columns:")
            for col in cols:
                c_name = col[0]
                c_type = col[1]
                c_null = col[3]
                tbl_info["columns"].append({"name": c_name, "type": c_type, "nullable": c_null})
                print(f"    - {c_name:<25} {c_type:<20} Nullable: {c_null}")

            # Exact Row count
            cur.execute(f"SELECT COUNT(*) FROM {DATABASE}.{SCHEMA}.{tbl}")
            cnt = cur.fetchone()[0]
            tbl_info["row_count"] = cnt
            print(f"\n  Exact Row Count: {cnt}")

            # Sample 3 rows
            if cnt > 0:
                cur.execute(f"SELECT * FROM {DATABASE}.{SCHEMA}.{tbl} LIMIT 3")
                col_names = [desc[0] for desc in cur.description]
                sample_rows = cur.fetchall()
                print("  Sample Data (First 3 rows):")
                for sr in sample_rows:
                    row_dict = dict(zip(col_names, [str(v) if v is not None else "NULL" for v in sr]))
                    tbl_info["sample_data"].append(row_dict)
                    print("   ", json.dumps(row_dict, indent=None)[:120] + "...")
            else:
                print("  [Table is currently empty]")

        except Exception as te:
            print(f"  [-] Error inspecting table {tbl}: {te}")
            tbl_info["error"] = str(te)

        discovery_report[tbl] = tbl_info

    # Save discovery results to json file
    out_file = os.path.join(os.path.dirname(__file__), "snowflake_discovery_results.json")
    with open(out_file, "w") as f:
        json.dump(discovery_report, f, indent=2)
    print(f"\n[+] Saved detailed discovery report to {out_file}")

    cur.close()
    conn.close()
    print("\n[+] Discovery completed.")

if __name__ == "__main__":
    run_discovery()
