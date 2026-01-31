import os
import pandas as pd
import requests
from dotenv import load_dotenv
from flusight.processing.reference_strains import translate_sequence

# Load env variables if not already loaded
load_dotenv()

def fetch_training_data(limit=1000):
    """
    Fetches sequence data from Supabase via REST API for training ML models.
    Returns a pandas DataFrame with sequences and metadata.
    """
    base_url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not base_url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")

    try:
        # Construct REST API URL
        # /rest/v1/sequences?select=*&limit=1000
        api_url = f"{base_url}/rest/v1/sequences"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        params = {
            "select": "*",
            "limit": limit
        }

        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        print(f"Fetched {len(data) if data else 0} records via REST API")
        
        if not data:
            return pd.DataFrame()
        
        df = pd.DataFrame(data)
        
        # Basic preprocessing
        if 'collection_date' in df.columns:
            df['collection_date'] = pd.to_datetime(df['collection_date'])
            
        # Translate raw sequences if amino_acid_sequence is missing
        if 'raw_sequence' in df.columns:
             # Check if amino_acid_sequence needs population
            if 'amino_acid_sequence' not in df.columns or df['amino_acid_sequence'].isnull().all() or (df['amino_acid_sequence'] == '').all():
                 print("Translating raw sequences to amino acids...")
                 df['amino_acid_sequence'] = df['raw_sequence'].apply(lambda x: translate_sequence(x) if x else None)

        return df
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()
