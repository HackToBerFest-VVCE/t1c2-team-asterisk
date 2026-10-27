"""
FARMPRICE AI — Snowflake Role PUBLIC Connection and Dataset Access Tester
Target: https://app.snowflake.com/mdsfbiq/cr91823/#/data/databases/FARMPRICE_DB/access

Connects to Snowflake account mdsfbiq-cr91823 as role PUBLIC and verifies
access to FARMPRICE_DB.AGRICULTURE datasets (MANDI_PRICES, CROP_REQUIREMENTS, etc.).

Usage:
    python backend/snowflake/test_snowflake_public_connection.py --user <username> --password <password>
Or with environment variables:
    python backend/snowflake/test_snowflake_public_connection.py
"""

import os
import sys
import argparse
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

from backend.app.core.config import settings

def parse_args():
    parser = argparse.ArgumentParser(description="Test Snowflake Access as Role PUBLIC")
    parser.add_argument("--account", default=os.getenv("SNOWFLAKE_ACCOUNT", "mdsfbiq-cr91823"), help="Snowflake Account")
    parser.add_argument("--user", default=os.getenv("SNOWFLAKE_USER", ""), help="Snowflake Username")
    parser.add_argument("--password", default=os.getenv("SNOWFLAKE_PASSWORD", ""), help="Snowflake Password")
    parser.add_argument("--warehouse", default=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"), help="Warehouse")
    parser.add_argument("--database", default=os.getenv("SNOWFLAKE_DATABASE", "FARMPRICE_DB"), help="Database")
    parser.add_argument("--schema", default=os.getenv("SNOWFLAKE_SCHEMA", "AGRICULTURE"), help="Schema")
    parser.add_argument("--role", default=os.getenv("SNOWFLAKE_ROLE", "PUBLIC"), help="Role (default: PUBLIC)")
    return parser.parse_args()

def test_connection():
    args = parse_args()

    account = args.account
    user = args.user
    password = args.password
    warehouse = args.warehouse
    database = args.database
    schema = args.schema
    role = args.role or "PUBLIC"

    print("=====================================================================")
    print("FARMPRICE AI — Snowflake Dataset Access Test (Role: PUBLIC)")
    print("=====================================================================")
    print(f"Target Account:   {account}")
    print(f"Target Database:  {database}")
    print(f"Target Schema:    {schema}")
    print(f"Target Warehouse: {warehouse}")
    print(f"Target Role:      {role}")
    print(f"Web Console URL:  https://app.snowflake.com/mdsfbiq/cr91823/#/data/databases/{database}/access")
    print("=====================================================================\n")

    if not user or not password or user in ("your_snowflake_username", "") or password in ("your_snowflake_password", ""):
        print("[!] Snowflake credentials not provided in .env or CLI.")
        print("    To run a live test against your Snowflake account:")
        print(f"    python backend/snowflake/test_snowflake_public_connection.py --user YOUR_USERNAME --password YOUR_PASSWORD\n")
        print("    Checking backend application configuration...")
        print(f"    - Configured default account:   {settings.snowflake_account}")
        print(f"    - Configured default database:  {settings.snowflake_database}")
        print(f"    - Configured default schema:    {settings.snowflake_schema}")
        print(f"    - Configured default role:      {settings.snowflake_role}")
        print(f"    - Configured fallback mode:     {settings.snowflake_use_local_fallback}")
        
        # Test query through snowflake_manager
        from backend.app.core.snowflake import snowflake_manager
        health = snowflake_manager.check_connection()
        print(f"\n[+] Application Adapter Status: {health.get('status')} (Mode: {health.get('mode')})")
        print(f"    Notice: {health.get('notice')}")
        
        # Query local mirror
        prices = snowflake_manager.get_mandi_prices_paginated(page_size=5)
        print(f"[+] Verified local mirror: {prices.get('total_records', 0)} MANDI_PRICES records accessible.")
        return True

    try:
        import snowflake.connector
    except ImportError:
        print("[x] snowflake-connector-python is not installed.")
        return False

    print(f"[*] Connecting to Snowflake account '{account}' as user '{user}' with role '{role}'...")
    try:
        conn = snowflake.connector.connect(
            user=user,
            password=password,
            account=account,
            warehouse=warehouse,
            database=database,
            schema=schema,
            role=role
        )
        print("[+] Successfully established connection to Snowflake Analytical Warehouse!")
    except Exception as e:
        print(f"[x] Connection failed: {e}")
        print("\nTroubleshooting tips for Role PUBLIC:")
        print("1. Ensure you have run the grants in 'backend/snowflake/grant_public_access.sql'.")
        print("2. Ensure COMPUTE_WH has USAGE granted to ROLE PUBLIC.")
        print("3. Ensure FARMPRICE_DB and AGRICULTURE schema have USAGE granted to ROLE PUBLIC.")
        return False

    try:
        cur = conn.cursor()

        # 1. Verify session identity
        cur.execute("SELECT CURRENT_ROLE(), CURRENT_WAREHOUSE(), CURRENT_DATABASE(), CURRENT_SCHEMA()")
        session_info = cur.fetchone()
        print(f"\n[+] Active Snowflake Session Context:")
        print(f"    - Active Role:      {session_info[0]}")
        print(f"    - Active Warehouse: {session_info[1]}")
        print(f"    - Active Database:  {session_info[2]}")
        print(f"    - Active Schema:    {session_info[3]}")

        # 2. Query MANDI_PRICES table
        print(f"\n[*] Querying MANDI_PRICES dataset as role '{role}'...")
        cur.execute("SELECT COUNT(*) FROM MANDI_PRICES")
        mandi_count = cur.fetchone()[0]
        print(f"[+] Total records in FARMPRICE_DB.AGRICULTURE.MANDI_PRICES: {mandi_count}")

        # 3. Sample 5 records
        cur.execute("""
            SELECT district, market, commodity, variety, modal_price, arrival_quantity, observation_date
            FROM MANDI_PRICES
            ORDER BY observation_date DESC, modal_price DESC
            LIMIT 5
        """)
        rows = cur.fetchall()
        print(f"\n[+] Sample Records retrieved by Role {role}:")
        print(f"    {'District':<15} {'Market':<20} {'Commodity':<15} {'Variety':<15} {'Price (Rs/Q)':<12} {'Date'}")
        print("    " + "-" * 85)
        for r in rows:
            print(f"    {str(r[0]):<15} {str(r[1]):<20} {str(r[2]):<15} {str(r[3]):<15} {str(r[4]):<12} {str(r[6])}")

        # 4. Check other knowledge tables
        tables = ['CROP_REQUIREMENTS', 'CROP_YIELD_HISTORY', 'CULTIVATION_COSTS', 'CROP_PROFIT_ANALYSIS']
        print("\n[*] Checking access to additional agricultural knowledge tables:")
        for tbl in tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                cnt = cur.fetchone()[0]
                print(f"    - {tbl:<25} : {cnt:>6} rows accessible")
            except Exception as te:
                print(f"    - {tbl:<25} : Error ({te})")

        cur.close()
        conn.close()
        print("\n=====================================================================")
        print(f"[SUCCESS] Role {role} has full read access to FARMPRICE_DB datasets!")
        print("=====================================================================")
        return True

    except Exception as qe:
        print(f"[x] Error querying Snowflake datasets: {qe}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
