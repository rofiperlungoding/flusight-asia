
import os
import sys
import torch
import json
import logging
import httpx
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from flusight.processing import TimeseriesProcessor
from flusight.ml.models import FluSightTransformer

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_supabase_config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None, None
    return url.rstrip('/'), key

def predict_temporal():
    logging.info("🔮 Starting Temporal Variant Prediction...")
    
    # 1. Load Metadata & Model
    model_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    meta_path = os.path.join(model_dir, 'transformer_meta.json')
    model_path = os.path.join(model_dir, 'transformer_v1.pth')
    
    if not os.path.exists(meta_path) or not os.path.exists(model_path):
        logging.error("❌ Model artifacts not found. Run train_transformer.py first.")
        # Create dummy artifacts if needed for testing? No, better to fail loud.
        return

    with open(meta_path, 'r') as f:
        meta = json.load(f)
        
    variants = meta['variants']
    input_len = meta['input_len']
    pred_len = meta['pred_len']
    num_variants = meta['num_variants']
    
    # 2. Load Data (Latest sequences)
    # Ideally fetch from Supabase. For now, use local JSON from pipeline artifact.
    data_path = os.path.join(os.path.dirname(__file__), '..', 'sequences_data.json')
    if not os.path.exists(data_path):
        logging.warning("⚠️ Local sequences_data.json not found. Fetching from Supabase not implemented in this script version.")
        return
        
    with open(data_path, 'r') as f:
        sequences = json.load(f)
        
    # 3. Process Data
    processor = TimeseriesProcessor(sequences)
    # Force the processor to use the SAME variants as training
    processor.top_variants = variants
    
    weekly_df = processor.aggregate_weekly()
    
    if len(weekly_df) < input_len:
        logging.warning(f"⚠️ Not enough history ({len(weekly_df)} weeks) to predict. Need {input_len}.")
        # Pad with 0s? 
        return

    # Get last 52 weeks
    last_window = weekly_df.iloc[-input_len:].values
    last_window_tensor = torch.FloatTensor(last_window).unsqueeze(0) # (1, 52, K)
    
    # 4. Predict
    model = FluSightTransformer(num_variants=num_variants, d_model=32, num_layers=2, nhead=2)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    with torch.no_grad():
        forecast = model(last_window_tensor) # (1, 12, K)
        forecast = forecast.squeeze(0).numpy()
        
    # 5. Save to Supabase
    supabase_url, supabase_key = get_supabase_config()
    if not supabase_url:
        logging.warning("⚠️ Supabase not configured. Skipping upload.")
        return

    last_date = weekly_df.index[-1]
    
    logging.info(f"📅 Last historical week: {last_date}")
    
    forecast_records = []
    
    columns = variants + ['Other']
    
    for i in range(pred_len):
        # Calculate target week
        target_date = last_date + timedelta(weeks=i+1)
        iso_week = target_date.strftime('%G-W%V')
        
        # Distribution
        probs = forecast[i]
        dist = {col: float(round(p, 3)) for col, p in zip(columns, probs)}
        
        record = {
            "forecast_date": target_date.strftime('%Y-%m-%d'),
            "week_iso": iso_week,
            "region": "Asia",
            "variant_distribution": dist,
            "model_version": "transformer_v1"
        }
        forecast_records.append(record)
        
    logging.info(f"📤 Uploading {len(forecast_records)} predictions...")
    
    try:
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        resp = httpx.post(
            f"{supabase_url}/rest/v1/variant_forecasts",
            headers=headers,
            json=forecast_records,
            timeout=60.0
        )
        if resp.status_code in [200, 201, 204]:
            logging.info("✅ Predictions saved successfully.")
        else:
            logging.error(f"❌ Supabase error: {resp.text}")
            
    except Exception as e:
        logging.error(f"❌ Upload failed: {e}")

if __name__ == "__main__":
    predict_temporal()
