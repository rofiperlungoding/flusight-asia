import torch
import torch.nn as nn
import math

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0) # (1, max_len, d_model)
        self.register_buffer('pe', pe)

    def forward(self, x):
        # x: (batch, seq_len, d_model)
        x = x + self.pe[:, :x.size(1), :]
        return x

class MutationLSTM(nn.Module):
    """
    LSTM-based model to predict future mutations from sequence data.
    Input: Sequence of amino acid indices
    Output: Probability distribution over amino acids for each position (or next position)
    """
    def __init__(self, vocab_size=25, embedding_dim=32, hidden_size=64, num_layers=2, dropout=0.2, bidirectional=True):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        # batch_first=True expects (batch, seq, feature)
        self.lstm = nn.LSTM(
            embedding_dim, 
            hidden_size, 
            num_layers, 
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=bidirectional
        )
        
        # Output size doubles if bidirectional
        self.multiplier = 2 if bidirectional else 1
        self.fc = nn.Linear(hidden_size * self.multiplier, vocab_size)
    
    def forward(self, x):
        """
        x: (batch_size, seq_len)
        Returns: (batch_size, seq_len, vocab_size)
        """
        # x: (batch, seq_len)
        embedded = self.embedding(x) # (batch, seq_len, emb_dim)
        
        # LSTM output: (batch, seq_len, hidden_size)
        output, (hn, cn) = self.lstm(embedded)
        
        # Project to vocabulary size
        prediction = self.fc(output) # (batch, seq_len, vocab_size)
        
        return prediction

class FluSightTransformer(nn.Module):
    """
    Transformer-based Time-Series Forecaster.
    Predicts the probability distribution of variants for the next N weeks.
    
    Architecture:
    - Input Embedding (Linear)
    - Positional Encoding
    - Transformer Encoder
    - Output Projection
    """
    def __init__(self, num_variants=6, d_model=64, nhead=4, num_layers=2, dropout=0.1, input_len=52, pred_len=12):
        super().__init__()
        
        self.input_len = input_len
        self.pred_len = pred_len
        self.d_model = d_model
        
        # 1. Embedding: Map variant distribution (k) to d_model
        self.embedding = nn.Linear(num_variants, d_model)
        
        # 2. Positional Encoding
        self.pos_encoder = PositionalEncoding(d_model)
        
        # 3. Transformer Encoder
        encoder_layers = nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward=d_model*4, dropout=dropout, batch_first=True)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers)
        
        # 4. Decoder / Projection
        # We flatten the encoder output and project to (pred_len * num_variants)
        # Or we can use a query-based decoder. For robustness on small data, 
        # a direct linear projection from the *last* encoded time step is often stable.
        # Let's try projecting the entire flattened sequence to capture global context.
        self.flatten_dim = input_len * d_model
        
        self.output_head = nn.Sequential(
            nn.Linear(self.flatten_dim, d_model * 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model * 2, pred_len * num_variants)
        )
        
        self.num_variants = num_variants

    def forward(self, x):
        """
        x: (batch, input_len, num_variants)
        Returns: (batch, pred_len, num_variants) (Softmaxed)
        """
        batch_size = x.size(0)
        
        # 1. Embed
        x = self.embedding(x) # (batch, input_len, d_model)
        
        # 2. Positional Encoding
        x = self.pos_encoder(x)
        
        # 3. Encoder
        x = self.transformer_encoder(x) # (batch, input_len, d_model)
        
        # 4. Flatten
        x = x.reshape(batch_size, -1) # (batch, input_len * d_model)
        
        # 5. Project
        out = self.output_head(x) # (batch, pred_len * num_variants)
        
        # 6. Reshape
        out = out.reshape(batch_size, self.pred_len, self.num_variants)
        
        # 7. Softmax over the variants dimension to ensure valid distribution
        out = torch.softmax(out, dim=2)
        
        return out
