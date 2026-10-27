import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / "farmprice_local.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Check table schema
cur.execute("PRAGMA table_info(MANDI_PRICES)")
cols = [dict(c) for c in cur.fetchall()]
print("=== MANDI_PRICES COLUMNS ===")
for col in cols:
    print(f"  - {col['name']} ({col['type']})")

cur.execute("SELECT COUNT(*) as cnt FROM MANDI_PRICES")
cnt = cur.fetchone()["cnt"]
print(f"\nTotal rows in MANDI_PRICES: {cnt}")

cur.execute("SELECT DISTINCT commodity FROM MANDI_PRICES ORDER BY commodity")
commodities = [r["commodity"] for r in cur.fetchall()]
print(f"\nDistinct Commodities ({len(commodities)}):")
print(", ".join(commodities[:25]))
if len(commodities) > 25:
    print(f"... and {len(commodities)-25} more")

cur.execute("SELECT DISTINCT market FROM MANDI_PRICES ORDER BY market")
markets = [r["market"] for r in cur.fetchall()]
print(f"\nDistinct Mandis/Markets ({len(markets)}):")
print(", ".join(markets[:20]))

cur.execute("SELECT DISTINCT district FROM MANDI_PRICES ORDER BY district")
districts = [r["district"] for r in cur.fetchall()]
print(f"\nDistinct Districts ({len(districts)}):")
print(", ".join(districts))

cur.execute("SELECT min(modal_price), max(modal_price), min(observation_date), max(observation_date) FROM MANDI_PRICES")
stats = cur.fetchone()
print(f"\nPrice Range: Rs. {stats[0]} - Rs. {stats[1]} / Quintal | Dates: {stats[2]} to {stats[3]}")

# Also check other tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
all_tables = [r["name"] for r in cur.fetchall()]
print(f"\nAll tables in database ({len(all_tables)}):")
for t in all_tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  * {t}: {cur.fetchone()[0]} rows")
