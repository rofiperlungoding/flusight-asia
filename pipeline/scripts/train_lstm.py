import torch
import torch.nn as nn
import torch.optim as optim
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from flusight.ml.data_loader import fetch_training_data
from flusight.ml.tokenizer import SequenceTokenizer
from flusight.ml.models import MutationLSTM

def train():
    # Hyperparameters
    BATCH_SIZE = 16
    EMBEDDING_DIM = 32
    HIDDEN_SIZE = 64
    NUM_LAYERS = 2
    DROPOUT = 0.2
    LEARNING_RATE = 0.001
    LEARNING_RATE = 0.001
    EPOCHS = int(os.environ.get('EPOCHS', 10000))
    print(f"Training for {EPOCHS} epochs")
    
    print("Step 1: Fetching training data...")
    try:
        # Fetch larger dataset (None for all, or 5000)
        df = fetch_training_data(limit=5000)
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return

    if df.empty or 'amino_acid_sequence' not in df.columns:
        print("No training data found or missing 'amino_acid_sequence' column.")
        return

    print(f"Loaded {len(df)} sequences.")
    
    print("Step 2: Tokenizing sequences...")
    tokenizer = SequenceTokenizer()
    sequences = df['amino_acid_sequence'].tolist()
    
    # Filter valid sequences
    sequences = [s for s in sequences if isinstance(s, str) and len(s) > 10]
    
    if not sequences:
        print("No valid sequences to train on.")
        return
        
    print(f"Tokenizing {len(sequences)} valid sequences...")
    # Tokenize all
    input_data = tokenizer.batch_encode(sequences)
    
    # Split into Train/Val (80/20)
    split_idx = int(len(input_data) * 0.8)
    # Shuffle indices if needed, but for time-series/evolution, random split is usually okay for this stage
    perm = torch.randperm(len(input_data))
    train_indices = perm[:split_idx]
    val_indices = perm[split_idx:]
    
    train_data = input_data[train_indices]
    val_data = input_data[val_indices]
    
    print(f"Train Set: {len(train_data)}, Validation Set: {len(val_data)}")

    print("Step 3: Initializing Model...")
    model = MutationLSTM(
        vocab_size=tokenizer.vocab_size, 
        embedding_dim=EMBEDDING_DIM, 
        hidden_size=HIDDEN_SIZE, 
        num_layers=NUM_LAYERS,
        dropout=DROPOUT,
        bidirectional=True
    )
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    print("Step 4: Training Loop...")
    best_val_loss = float('inf')
    
    for epoch in range(EPOCHS):
        # Training
        model.train()
        permutation = torch.randperm(train_data.size(0))
        epoch_loss = 0
        
        for i in range(0, train_data.size(0), BATCH_SIZE):
            indices = permutation[i:i+BATCH_SIZE]
            batch = train_data[indices]
            
            x_batch = batch[:, :-1]
            y_batch = batch[:, 1:]
            
            optimizer.zero_grad()
            output = model(x_batch) # (Batch, Seq, Vocab)
            
            # Reshape for loss
            loss = criterion(output.reshape(-1, tokenizer.vocab_size), y_batch.reshape(-1))
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            
        avg_train_loss = epoch_loss / (len(train_data) / BATCH_SIZE)
        
        # Validation
        model.eval()
        val_loss = 0
        with torch.no_grad():
             x_val = val_data[:, :-1]
             y_val = val_data[:, 1:]
             val_out = model(x_val)
             v_loss = criterion(val_out.reshape(-1, tokenizer.vocab_size), y_val.reshape(-1))
             val_loss = v_loss.item()
        
        print(f"Epoch {epoch+1}/{EPOCHS} | Train Loss: {avg_train_loss:.4f} | Val Loss: {val_loss:.4f}")
        
        # Checkpoint
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), "best_model.pth")
            print("  -> Saved best model")
            
    print("Training complete!")

if __name__ == "__main__":
    train()
