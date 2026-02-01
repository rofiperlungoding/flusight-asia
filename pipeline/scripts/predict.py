import os
import torch
import json
import logging
import httpx
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv

# Add src to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


from flusight.ml.tokenizer import SequenceTokenizer
from flusight.ml.models import MutationLSTM
from flusight.processing.reference_strains import translate_sequence

load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_supabase_config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment variables.")
    return url.rstrip('/'), key

def load_model(model_path="best_model.pth"):
    # Re-instantiate tokenizer to get vocab size
    tokenizer = SequenceTokenizer()
    
    # Model Hyperparameters (Must match training)
    EMBEDDING_DIM = 32
    HIDDEN_SIZE = 64
    NUM_LAYERS = 2
    DROPOUT = 0.2
    
    model = MutationLSTM(
        vocab_size=tokenizer.vocab_size,
        embedding_dim=EMBEDDING_DIM,
        hidden_size=HIDDEN_SIZE,
        num_layers=NUM_LAYERS,
        dropout=DROPOUT,
        bidirectional=True
    )
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
        model.eval()
        logging.info(f"Model loaded from {model_path}")
        return model, tokenizer
    else:
        logging.warning("Model file not found. Using untrained model for testing structure.")
        return model, tokenizer

def predict_future_risk():
    try:
        supabase_url, supabase_key = get_supabase_config()
    except ValueError as e:
        logging.error(f"Configuration error: {e}")
        return

    rest_url = f"{supabase_url}/rest/v1"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    model, tokenizer = load_model()
    
    # 1. Fetch latest H3N2 sequence as seed
    logging.info("Fetching latest sequence...")
    try:
        response = httpx.get(
            f"{rest_url}/sequences",
            headers=headers,
            params={
                "select": "raw_sequence,collection_date",
                "subtype": "eq.H3N2",
                "order": "collection_date.desc",
                "limit": 1
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        logging.error(f"Failed to fetch sequence: {e}")
        return

    if not data:
        logging.error("No sequences found to seed prediction.")
        return

    raw_seq = data[0].get('raw_sequence')
    if not raw_seq:
         logging.error("Sequence data missing raw_sequence.")
         return

    # Translate to Amino Acid
    try:
        logging.info("Translating sequence to amino acids...")
        seed_seq = translate_sequence(raw_seq)
        if not seed_seq:
            logging.error("Translation resulted in empty sequence.")
            return
    except Exception as e:
        logging.error(f"Translation failed: {e}")
        return

    last_date = datetime.now() 
    
    # 2. Simulate next 3 months
    current_risk = 0.2 # Baseline risk
    
    logging.info(f"Starting prediction from seed length: {len(seed_seq)}")
    
    for i in range(1, 4): # Next 3 months
        forecast_date = last_date + relativedelta(months=i)
        
        # Encode
        input_tensor = torch.tensor(tokenizer.encode(seed_seq), dtype=torch.long)
        input_tensor = input_tensor.unsqueeze(0) # Batch dim
        
        with torch.no_grad():
            output = model(input_tensor) # (1, SeqLen, Vocab)
            last_logits = output[0, -1, :]
            probs = torch.softmax(last_logits, dim=0)
            
        # Get top 3 predicted amino acids
        top_probs, top_indices = torch.topk(probs, 3)
        predicted_variants = []
        
        risk_increment = 0
        
        for p, idx in zip(top_probs, top_indices):
            aa = tokenizer.inv_vocab[idx.item()]
            prob = p.item()
            predicted_variants.append({"aa": aa, "probability": round(prob, 3)})
            
            if aa not in ['M', 'L', 'I', 'V']: 
                risk_increment += 0.05
        
        current_risk = min(1.0, current_risk + risk_increment + (torch.rand(1).item() * 0.1))
        
        confidence_lower = max(0.0, current_risk - 0.1)
        confidence_upper = min(1.0, current_risk + 0.1)

        forecast_entry = {
            "region": "Asia",
            "forecast_date": forecast_date.strftime('%Y-%m-%d'),
            "risk_score": round(current_risk, 3),
            "predicted_variants": predicted_variants, # JSONB handles list of dicts
            "confidence_lower": round(confidence_lower, 3),
            "confidence_upper": round(confidence_upper, 3)
        }
        
        logging.info(f"Month {i} Forecast: Risk={forecast_entry['risk_score']}")
        
        # 3. Write to Supabase using httpx
        try:
            resp = httpx.post(
                f"{rest_url}/forecasts",
                headers=headers,
                json=forecast_entry,
                timeout=10.0
            )
            if resp.status_code in [200, 201]:
                 logging.info("  -> Saved.")
            else:
                 logging.error(f"  -> Failed to save: {resp.text}")
        except Exception as e:
            logging.error(f"  -> Error saving: {e}")

    logging.info("Forecasts generated successfully.")

if __name__ == "__main__":
    predict_future_risk()
