import os
import sys
from dotenv import load_dotenv
import snowflake.connector

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

conn = snowflake.connector.connect(
    user=os.getenv('SNOWFLAKE_USER', 'CP'),
    password=os.getenv('SNOWFLAKE_PASSWORD'),
    account=os.getenv('SNOWFLAKE_ACCOUNT', 'mdsfbiq-cr91823'),
    warehouse=os.getenv('SNOWFLAKE_WAREHOUSE', 'FARMPRICE_WH'),
    database=os.getenv('SNOWFLAKE_DATABASE', 'FARMPRICE_DB'),
    schema=os.getenv('SNOWFLAKE_SCHEMA', 'AGRICULTURE')
)
cur = conn.cursor()

print('=== REALDATA1 Columns & Header Row ===')
cur.execute('SELECT * FROM REALDATA1 LIMIT 5')
for r in cur.fetchall():
    print(r)

print('\n=== REALDATA2 Columns & Header Row ===')
cur.execute('SELECT * FROM REALDATA2 LIMIT 5')
for r in cur.fetchall():
    print(r)

print('\n=== REALDATA3 Top States ===')
cur.execute('SELECT STATE, COUNT(*) FROM REALDATA3 GROUP BY STATE ORDER BY 2 DESC LIMIT 15')
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} records")

print('\n=== REALDATA3 Distinct Commodities ===')
cur.execute('SELECT COMMODITY, COUNT(*) FROM REALDATA3 GROUP BY COMMODITY ORDER BY 2 DESC LIMIT 20')
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} records")

print('\n=== REALDATA3 Date Format and Range ===')
cur.execute('SELECT MIN(ARRIVAL_DATE), MAX(ARRIVAL_DATE) FROM REALDATA3')
print('Date range:', cur.fetchone())

cur.close()
conn.close()
