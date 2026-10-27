import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name, path, params=None):
    url = f"{BASE_URL}{path}"
    try:
        res = requests.get(url, params=params, timeout=25)
        print(f"=== {name} [{res.status_code}] ===")
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, list):
                print(f"Returned list with {len(data)} items. Sample first item:")
                print(json.dumps(data[0] if data else {}, indent=2))
            elif isinstance(data, dict):
                summary = {k: v for k, v in data.items() if k not in ("records", "commodities", "districts", "markets")}
                print(f"Response summary: {json.dumps(summary, indent=2)}")
                if "records" in data:
                    print(f"Records returned: {len(data['records'])}, total: {data.get('total_records')}")
                    if data["records"]:
                        print(f"Sample record: {json.dumps(data['records'][0], indent=2)}")
                elif "commodities" in data:
                    print(f"Commodities count: {len(data['commodities'])}, Sample: {data['commodities'][:5]}")
                elif "states" in data:
                    print(f"States count: {len(data['states'])}, Sample: {data['states'][:8]}")
        else:
            print(f"Error {res.status_code}: {res.text[:300]}")
    except Exception as e:
        print(f"Failed to connect to {url}: {e}")

if __name__ == "__main__":
    test_endpoint("Snowflake Health", "/api/health/snowflake")
    test_endpoint("Distinct States", "/api/states")
    test_endpoint("Mandi Prices (Live Snowflake)", "/api/mandi-prices", {"page_size": 2})
    test_endpoint("Market Data (Live Snowflake)", "/api/market-data", {"page_size": 2})
    test_endpoint("Crops from REALDATA2", "/api/crops/snowflake")
    test_endpoint("REALDATA1 (State Benchmarks)", "/api/realdata1", {"limit": 2})
    test_endpoint("REALDATA3 (Live Mandis)", "/api/realdata3", {"page_size": 2})
