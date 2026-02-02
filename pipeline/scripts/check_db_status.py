import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    sys.exit(1)

tables = [
    "sequences",
    "pipeline_logs",
    "mutations",
    "forecasts",
    "variant_forecasts", 
    "geo_forecasts"
]

print("-" * 40)
print(" DATABASE STATUS CHECK (via REST)")
print("-" * 40)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Range": "0-0",
    "Prefer": "count=exact"
}

for table in tables:
    try:
        api_url = f"{url}/rest/v1/{table}?select=*"
        # Head request to get count in Content-Range
        response = requests.get(api_url, headers=headers)
        
        if response.status_code >= 400:
             print(f"{table:<20} : ERROR {response.status_code} - {response.text}")
             continue

        content_range = response.headers.get("Content-Range")
        if content_range:
            # Format: 0-0/123 or */123
            count = content_range.split('/')[-1]
            print(f"{table:<20} : {count}")
        else:
            print(f"{table:<20} : UNKNOWN (No Content-Range)")
            
    except Exception as e:
        print(f"{table:<20} : ERROR - {str(e)}")

print("-" * 40)
