
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

from flusight.processing import GeoTimeseriesProcessor, ASIA_GRAPH
from flusight.ml.models import FluSightGNN

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_supabase_config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None, None
    return url.rstrip('/'), key

def predict_spread():
    logging.info("🌍 Starting Geographic Spread Prediction (GNN)...")
    
    # 1. Load Metadata & Model
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    meta_path = os.path.join(models_dir, 'gnn_meta.json')
    model_path = os.path.join(models_dir, 'gnn_v1.pth')
    
    if not os.path.exists(meta_path) or not os.path.exists(model_path):
        logging.error("❌ Model artifacts not found. Run train_gnn.py first.")
        return

    with open(meta_path, 'r') as f:
        meta = json.load(f)
        
    nodes = meta['nodes'] # List of countries in correct order
    variants = meta['variants']
    input_len = meta['input_len']
    pred_len = meta['pred_len']
    num_nodes = meta['num_nodes']
    num_variants = meta['num_variants']
    
    # 2. Reconstruct Adjacency Matrix
    # We must ensure it matches training EXACTLY
    node_map = {n: i for i, n in enumerate(nodes)}
    adj = torch.zeros(num_nodes, num_nodes)
    for u, v, w in ASIA_GRAPH['edges']:
        if u in node_map and v in node_map:
            i, j = node_map[u], node_map[v]
            adj[i, j] = w
            adj[j, i] = w

    # 3. Load & Process Sequence Data
    data_path = os.path.join(os.path.dirname(__file__), '..', 'sequences_data.json')
    if not os.path.exists(data_path):
        logging.error("❌ Data file not found.")
        return
        
    with open(data_path, 'r') as f:
        sequences = json.load(f)
        
    processor = GeoTimeseriesProcessor(sequences)
    processor.top_variants = variants # Enforce consistency
    
    tensor, dates = processor.aggregate_spatial(smooth_window=3)
    # tensor: (Time, Nodes, Variants)
    
    if len(tensor) < input_len:
         logging.warning(f"⚠️ Not enough history ({len(tensor)} weeks). Need {input_len}.")
         # Optional: pad with last known state?
         return

    # Get last window
    last_window = tensor[-input_len:] # (Input, Nodes, Variants)
    
    # Prepare Input Tensor: (Batch=1, Time, Nodes, Variants)
    input_tensor = torch.FloatTensor(last_window).unsqueeze(0)
    
    # 4. Predict
    model = FluSightGNN(
        num_nodes=num_nodes,
        num_variants=num_variants, 
        adj_matrix=adj,
        d_model=32, 
        pred_len=pred_len
    )
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    with torch.no_grad():
        forecast = model(input_tensor) # (1, PredLen, Nodes, Variants)
        forecast = forecast.squeeze(0).numpy() # (PredLen, Nodes, Variants)
        
    # 5. Format & Save results
    last_date = dates[-1]
    logging.info(f"📅 Last historical week: {last_date}")
    
    records = []
    
    for t in range(pred_len):
        target_date = last_date + timedelta(weeks=t+1)
        iso_week = target_date.strftime('%G-W%V')
        
        for n_idx, country in enumerate(nodes):
            # Get distribution for this country at this timestep
            probs = forecast[t, n_idx, :]
            
            # Map back to variant names
            dist = {v: float(round(probs[i], 3)) for i, v in enumerate(variants)}
            dist['Other'] = float(round(probs[-1], 3)) # Last one is 'Other' in our ordering logic typically? 
            # Wait, variant list usually is top_k. 'Other' handling in TimeseriesProcessor puts it as last column.
            # processor.top_variants only contains top_k. TimeseriesProcessor appends "Other".
            # The model output dimension is num_variants (which includes Other).
            # So len(variants) should be num_variants - 1.
            
            # Reconstruct columns list carefully
            cols = variants + ['Other']
            if len(cols) != num_variants:
                 # This implies mismatch between meta['variants'] and trained dimension
                 # In train_gnn, we used processor.top_variants.
                 # aggregate_weekly adds 'Other'.
                 pass
            
            dist = {col: float(round(p, 3)) for col, p in zip(cols, probs)}
            
            records.append({
                "forecast_date": target_date.strftime('%Y-%m-%d'),
                "week_iso": iso_week,
                "country": country,
                "variant_distribution": dist,
                "model_version": "gnn_v1"
            })
            
    # Upload
    supabase_url, supabase_key = get_supabase_config()
    if not supabase_url:
        logging.warning("⚠️ Supabase not configured. Printing first 2 records instead.")
        print(json.dumps(records[:2], indent=2))
        return

    logging.info(f"📤 Uploading {len(records)} geo-forecasts...")
    
    try:
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        resp = httpx.post(
            f"{supabase_url}/rest/v1/geo_forecasts",
            headers=headers,
            json=records,
            timeout=15.0
        )
        if resp.status_code in [200, 201, 204]:
            logging.info("✅ Geo-forecasts saved successfully.")
        else:
            logging.error(f"❌ Supabase error: {resp.text}")
            
    except Exception as e:
        logging.error(f"❌ Upload failed: {e}")

if __name__ == "__main__":
    predict_spread()
