import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test(name, path, params=None):
    url = f"{BASE_URL}{path}"
    try:
        res = requests.get(url, params=params, timeout=25)
        print(f"\n=== {name} [{res.status_code}] ===")
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list):
                print(f"List response: {len(data)} items. First item: {json.dumps(data[0] if data else {}, indent=2)}")
            elif isinstance(data, dict):
                summary = {k: v for k, v in data.items() if k not in ("records", "tables")}
                print(f"Summary: {json.dumps(summary, indent=2)}")
                if "tables" in data:
                    print("Snowflake Tables Inventory:")
                    for t in data["tables"]:
                        print(f"  - {t['name']}: {t.get('row_count')} rows | {t.get('display_name')}")
                if "records" in data:
                    print(f"Records returned: {len(data['records'])}, total: {data.get('total_records')}")
                    if data["records"]:
                        print(f"Sample first record: {json.dumps(data['records'][0], indent=2)}")
        else:
            print(f"Error {res.status_code}: {res.text[:300]}")
    except Exception as e:
        print(f"Failed to query {url}: {e}")

if __name__ == "__main__":
    test("Snowflake Health", "/api/health/snowflake")
    test("Snowflake Inventory", "/api/snowflake/inventory")
    test("MANDI_PRICES Table Explorer", "/api/snowflake/table-data", {"table": "MANDI_PRICES", "page_size": 10})
    test("CROP_REQUIREMENTS Table Explorer", "/api/snowflake/table-data", {"table": "CROP_REQUIREMENTS", "page_size": 10})
    test("CULTIVATION_COSTS Table Explorer", "/api/snowflake/table-data", {"table": "CULTIVATION_COSTS", "page_size": 10})
    test("Crops Catalog (from Snowflake)", "/api/crops")
    test("Crop Recommendation Engine (from Snowflake)", "/api/recommendations", {"district": "Hassan"})
