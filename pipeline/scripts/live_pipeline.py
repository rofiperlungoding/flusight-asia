import os
import time
import sys
import logging
import torch
import torch.nn as nn
import torch.optim as optim
from datetime import datetime, timedelta
from dotenv import load_dotenv
import supabase

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from flusight.ml.tokenizer import SequenceTokenizer
from flusight.ml.models import MutationLSTM
from flusight.processing.reference_strains import translate_sequence

# Reuse prediction logic (we can import or reimplement slightly modified)
# To avoid circular imports or complex refactors, I'll adapt the logic inline for the "Brain"
from predict import predict_future_risk

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found.")
    return supabase.create_client(url, key)

def log_status(client, message, status="info", job="live_learner"):
    try:
        data = {
            "job_name": job,
            "status": status,
            "message": message,
            "records_processed": 0,
            "records_failed": 0,
            "started_at": datetime.now().isoformat()
        }
        client.table("pipeline_logs").insert(data).execute()
    except Exception as e:
        logging.error(f"Failed to log status: {e}")

def main():
    logging.info("Starting Live Learning Agent...")
    client = get_supabase_client()
    
    # Init Model
    tokenizer = SequenceTokenizer()
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
    
    # Load existing weights if avail
    if os.path.exists("best_model.pth"):
        model.load_state_dict(torch.load("best_model.pth"))
        logging.info("Loaded existng model weights.")
    
    optimizer = optim.Adam(model.parameters(), lr=0.0001) # Lower LR for fine-tuning
    criterion = nn.CrossEntropyLoss()
    
    last_check_time = (datetime.now() - timedelta(minutes=5)).isoformat()
    
    log_status(client, "Live Learning Agent Started. Waiting for data...", "success")

    while True:
        try:
            # 1. Poll for NEW sequences
            resp = client.table("sequences")\
                .select("raw_sequence, strain_name, created_at")\
                .gt("created_at", last_check_time)\
                .execute()
            
            new_sequences = resp.data
            
            if new_sequences and len(new_sequences) > 0:
                logging.info(f"Detected {len(new_sequences)} new sequences! Learning...")
                log_status(client, f"Detected {len(new_sequences)} new sequences. Updating model...", "info")
                
                # Update last_check_time
                last_check_time = datetime.now().isoformat()
                
                # 2. Fine-tune Model
                model.train()
                valid_seqs = []
                for item in new_sequences:
                    raw = item.get('raw_sequence')
                    if raw:
                        aa_seq = translate_sequence(raw)
                        if aa_seq and len(aa_seq) > 10:
                            valid_seqs.append(aa_seq)
                
                if valid_seqs:
                    # Tokenize
                    input_data = tokenizer.batch_encode(valid_seqs)
                    
                    # Quick training loop (Episodic training)
                    for _ in range(5): # 5 quick epochs on new data
                        optimizer.zero_grad()
                        x_batch = input_data[:, :-1]
                        y_batch = input_data[:, 1:]
                        
                        output = model(x_batch)
                        loss = criterion(output.reshape(-1, tokenizer.vocab_size), y_batch.reshape(-1))
                        loss.backward()
                        optimizer.step()
                    
                    # Save updated model
                    torch.save(model.state_dict(), "best_model.pth")
                    logging.info("Model updated.")
                    
                    # 3. Generate New Forecasts
                    logging.info("Generating updated forecasts...")
                    predict_future_risk() 
                    log_status(client, "Model updated and new forecast generated.", "success")
                    
            else:
                # Heartbeat or just sleep
                # logging.info("No new data. Sleeping...")
                pass

            if os.environ.get("RUN_ONCE"):
                logging.info("RUN_ONCE is set. Exiting after one pass.")
                break

            time.sleep(5) # Poll every 5 seconds
            
        except KeyboardInterrupt:
            logging.info("Stopping...")
            break
        except Exception as e:
            logging.error(f"Error in loop: {e}")
            if os.environ.get("RUN_ONCE"):
                sys.exit(1) # Fail the action if error occurs in run-once mode
            time.sleep(10)

if __name__ == "__main__":
    main()
