# Phase 4: Machine Learning Models Implementation Plan

**Goal:** Implement LSTM and Transformer models to predict future H3N2 mutations and variant dominance.

**Architecture:** Use PyTorch for deep learning models. Train a Sequence LSTM to predict mutation probabilities based on historical sequences. Train a Temporal Transformer (time-series) to forecast strain dominance.

**Tech Stack:** PyTorch, Pandas, Numpy, Scikit-learn, Supabase Client (Python)

---

### Task 4.1: Data Preparation Module

**Files:**
- Create: `pipeline/src/flusight/ml/data_loader.py`
- Test: `pipeline/tests/ml/test_data_loader.py`

**Step 1: Write the failing test**

```python
# pipeline/tests/ml/test_data_loader.py
import pytest
from flusight.ml.data_loader import fetch_training_data

def test_fetch_training_data_returns_dataframe():
    df = fetch_training_data(limit=10)
    assert not df.empty
    assert 'sequence' in df.columns
    assert 'collection_date' in df.columns
```

**Step 2: Run test to verify it fails**

Run: `pytest pipeline/tests/ml/test_data_loader.py`
Expected: FAIL (ModuleNotFoundError or ImportError)

**Step 3: Write minimal implementation**

```python
# pipeline/src/flusight/ml/data_loader.py
import os
import pandas as pd
from supabase import create_client

def fetch_training_data(limit=1000):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    supabase = create_client(url, key)
    
    response = supabase.table("sequences").select("*").limit(limit).execute()
    df = pd.DataFrame(response.data)
    
    # Basic preprocessing
    if not df.empty and 'collection_date' in df.columns:
        df['collection_date'] = pd.to_datetime(df['collection_date'])
        
    return df
```

**Step 4: Run test to verify it passes**

Run: `pytest pipeline/tests/ml/test_data_loader.py`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/src/flusight/ml/data_loader.py pipeline/tests/ml/test_data_loader.py
git commit -m "feat: add ML data loader module"
```

---

### Task 4.2: Sequence Tokenizer

**Files:**
- Create: `pipeline/src/flusight/ml/tokenizer.py`
- Test: `pipeline/tests/ml/test_tokenizer.py`

**Step 1: Write the failing test**

```python
# pipeline/tests/ml/test_tokenizer.py
from flusight.ml.tokenizer import SequenceTokenizer

def test_tokenizer_encodes_and_decodes():
    tokenizer = SequenceTokenizer()
    seq = "MKAIL"
    encoded = tokenizer.encode(seq)
    decoded = tokenizer.decode(encoded)
    assert len(encoded) == 5
    assert decoded == seq
```

**Step 2: Run test to verify it fails**

Run: `pytest pipeline/tests/ml/test_tokenizer.py`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/src/flusight/ml/tokenizer.py
import torch

class SequenceTokenizer:
    def __init__(self):
        self.vocab = {aa: i for i, aa in enumerate("ACDEFGHIKLMNPQRSTVWY*-X")}
        self.inv_vocab = {i: aa for aa, i in self.vocab.items()}
    
    def encode(self, sequence):
        return [self.vocab.get(aa, self.vocab['X']) for aa in sequence]
        
    def decode(self, indices):
        return "".join([self.inv_vocab.get(i, 'X') for i in indices])
```

**Step 4: Run test to verify it passes**

Run: `pytest pipeline/tests/ml/test_tokenizer.py`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/src/flusight/ml/tokenizer.py pipeline/tests/ml/test_tokenizer.py
git commit -m "feat: add sequence tokenizer"
```

---

### Task 4.3: LSTM Model Architecture

**Files:**
- Create: `pipeline/src/flusight/ml/models.py`
- Test: `pipeline/tests/ml/test_models.py`

**Step 1: Write the failing test**

```python
# pipeline/tests/ml/test_models.py
import torch
from flusight.ml.models import MutationLSTM

def test_lstm_forward_pass():
    model = MutationLSTM(input_size=25, hidden_size=64, num_layers=1, output_size=25)
    # Batch size 1, Seq len 10, Feature size 25 (one-hot) OR Embedding input
    # Let's assume Embedding input for simplicity: (Batch, Seq) -> (Batch, Seq, Vocab)
    input_seq = torch.randint(0, 25, (1, 10)) # (Batch, Seq)
    output = model(input_seq)
    assert output.shape == (1, 10, 25)
```

**Step 2: Run test to verify it fails**

Run: `pytest pipeline/tests/ml/test_models.py`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
# pipeline/src/flusight/ml/models.py
import torch
import torch.nn as nn

class MutationLSTM(nn.Module):
    def __init__(self, vocab_size=25, embedding_dim=32, hidden_size=64, num_layers=1):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, vocab_size)
    
    def forward(self, x):
        # x: (batch, seq_len)
        embedded = self.embedding(x) # (batch, seq_len, emb_dim)
        output, _ = self.lstm(embedded) # (batch, seq_len, hidden)
        prediction = self.fc(output) # (batch, seq_len, vocab_size)
        return prediction
```

**Step 4: Run test to verify it passes**

Run: `pytest pipeline/tests/ml/test_models.py`
Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/src/flusight/ml/models.py pipeline/tests/ml/test_models.py
git commit -m "feat: add LSTM model architecture"
```

---

### Task 4.4: Training Script (Skeleton)

**Files:**
- Create: `pipeline/scripts/train_lstm.py`

**Step 1: Create script**

```python
# pipeline/scripts/train_lstm.py
import torch
import torch.nn as nn
from flusight.ml.data_loader import fetch_training_data
from flusight.ml.tokenizer import SequenceTokenizer
from flusight.ml.models import MutationLSTM

def train():
    print("Fetching data...")
    df = fetch_training_data(limit=100)
    print(f"Loaded {len(df)} sequences")
    
    tokenizer = SequenceTokenizer()
    model = MutationLSTM()
    
    # Dummy training loop for skeleton
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    print("Training started...")
    # ... training logic ...
    print("Training complete (skeleton)")

if __name__ == "__main__":
    train()
```

**Step 2: Commit**

```bash
git add pipeline/scripts/train_lstm.py
git commit -m "feat: add training script skeleton"
```
