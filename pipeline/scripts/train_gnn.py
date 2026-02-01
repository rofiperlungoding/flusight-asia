
import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
import json
import logging

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from flusight.processing import GeoTimeseriesProcessor, ASIA_GRAPH
from flusight.ml.models import FluSightGNN

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_gnn():
    logging.info("🚀 Starting GNN Training...")

    # 1. Load Data
    data_path = os.path.join(os.path.dirname(__file__), '..', 'sequences_data.json')
    if not os.path.exists(data_path):
        logging.error(f"❌ Data file not found: {data_path}")
        return

    with open(data_path, 'r') as f:
        sequences = json.load(f)

    # 2. Process Data (Spatiotemporal Aggregation)
    processor = GeoTimeseriesProcessor(sequences)
    
    # Tensor shape: (Time, Nodes, Variants)
    tensor, dates = processor.aggregate_spatial(smooth_window=3)
    
    if len(tensor) == 0:
        logging.error("❌ No data processed.")
        return
        
    logging.info(f"📅 Spatiotemporal Tensor Shape: {tensor.shape} (Time, Nodes, Variants)")
    
    # 3. Create Dataset (Sliding Window)
    # We need to slice the (Time, Nodes, Variants) tensor
    INPUT_LEN = 12 # Smaller window for demo? Or use 26/52.
    PRED_LEN = 4
    
    num_time = tensor.shape[0]
    num_nodes = tensor.shape[1]
    num_variants = tensor.shape[2]
    
    X_list = []
    y_list = []
    
    for i in range(num_time - INPUT_LEN - PRED_LEN + 1):
        # Window: [i : i+Input]
        X_window = tensor[i : i + INPUT_LEN] # (Input, Nodes, Variants)
        
        # Target: [i+Input : i+Input+Pred]
        y_window = tensor[i + INPUT_LEN : i + INPUT_LEN + PRED_LEN] # (Pred, Nodes, Variants)
        
        X_list.append(X_window)
        y_list.append(y_window)
        
    X = np.array(X_list) # (Samples, Input, Nodes, Variants)
    y = np.array(y_list) # (Samples, Pred, Nodes, Variants)
    
    # Convert inputs to (Samples, Time, Nodes, Variants) - Matches model expectation
    # X shape is already correct
    
    logging.info(f"📦 Dataset shapes: X={X.shape}, y={y.shape}")
    
    # Convert to Tensor
    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.FloatTensor(y)
    
    # 4. Build Adjacency Matrix from Graph Topology
    nodes = ASIA_GRAPH['nodes']
    edges = ASIA_GRAPH['edges']
    node_map = {n: i for i, n in enumerate(nodes)}
    
    adj = torch.eye(num_nodes) # Self loops already included in normalization step, but safe to start with I or 0
    adj = torch.zeros(num_nodes, num_nodes)
    
    for u, v, w in edges:
        if u in node_map and v in node_map:
            i, j = node_map[u], node_map[v]
            adj[i, j] = w
            adj[j, i] = w # Undirected? Or directed? Usually travel is bidirectional.
            
    logging.info("🔗 Adjacency Matrix constructed.")
    
    # 5. Initialize Model
    model = FluSightGNN(
        num_nodes=num_nodes,
        num_variants=num_variants, 
        adj_matrix=adj,
        d_model=32, 
        pred_len=PRED_LEN
    )
    
    # 6. Training Loop
    criterion = nn.MSELoss() # Or KLDiv. For complex spatiotemporal, start simple with MSE.
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    model.train()
    
    EPOCHS = 20
    for epoch in range(EPOCHS):
        optimizer.zero_grad()
        
        # Forward
        # Input: (Batch, Time, Nodes, Variants)
        pred = model(X_tensor) # (Batch, PredLen, Nodes, Variants)
        
        # Loss
        loss = criterion(pred, y_tensor)
        
        loss.backward()
        optimizer.step()
        
        if epoch % 5 == 0:
            logging.info(f"Epoch {epoch}: Loss={loss.item():.4f}")
            
    logging.info("✅ Training complete.")

    # 7. Save Model
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(models_dir, 'gnn_v1.pth'))
    
    # Save Meta
    meta = {
        "nodes": nodes,
        "variants": processor.top_variants,
        "input_len": INPUT_LEN,
        "pred_len": PRED_LEN,
        "num_nodes": num_nodes,
        "num_variants": num_variants
    }
    with open(os.path.join(models_dir, 'gnn_meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

if __name__ == "__main__":
    train_gnn()
