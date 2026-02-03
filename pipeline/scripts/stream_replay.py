import os
import time
import sys
import logging
import random
import json
from datetime import datetime
from dotenv import load_dotenv
import supabase

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found.")
    return supabase.create_client(url, key)

def main():
    logging.info("Starting Stream Replay (The Feeder)...")
    client = get_supabase_client()
    
    # 1. Fetch a pool of sequence data to "replay"
    # We grab old sequences to re-insert as "new"
    logging.info("Fetching source data pool...")
    try:
        resp = client.table("sequences").select("*").limit(100).execute()
        data_pool = resp.data
        
        if not data_pool:
            logging.error("No data found in DB to replay.")
            return
            
        logging.info(f"Loaded {len(data_pool)} sequences to replay.")
        
    except Exception as e:
        logging.error(f"Failed to fetch data: {e}")
        return

    # 2. Replay Loop
    logging.info("Beginning Replay Stream. Press Ctrl+C to stop.")
    
    count = 0
    try:
        while True:
            # Pick a random sequence
            seed_record = random.choice(data_pool)
            
            # Create a "new" record from it
            # We modify ID and timestamps to make it unique and "now"
            new_id = f"stream-{int(time.time())}-{random.randint(100,999)}"
            new_record = seed_record.copy()
            new_record['id'] = new_id
            new_record['created_at'] = datetime.now().isoformat() # This triggers the watcher
            new_record['strain_name'] = f"{seed_record['strain_name']}-LIVE" # Mark as live
            
            # Insert
            try:
                client.table("sequences").insert(new_record).execute()
                count += 1
                logging.info(f"[{count}] Injected: {new_record['strain_name']}")
            except Exception as insert_err:
                logging.error(f"Insert failed: {insert_err}")
                
            # Wait random interval (3-6 seconds)
            wait_time = random.uniform(3, 6)
            time.sleep(wait_time)
            
    except KeyboardInterrupt:
        logging.info("\nStream Replay Stopped.")

if __name__ == "__main__":
    main()
