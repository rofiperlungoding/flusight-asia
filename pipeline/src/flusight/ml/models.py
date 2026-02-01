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

class GraphConvLayer(nn.Module):
    """
    Simple Graph Convolution Layer in pure PyTorch.
    H_out = Activation( A_norm * H_in * W )
    """
    def __init__(self, in_features, out_features, dropout=0.0):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features, bias=False)
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x, adj):
        """
        x: (Batch, Nodes, InFeatures)
        adj: (Nodes, Nodes) - Normalized Adjacency
        """
        # 1. Transform features: H * W -> (Batch, Nodes, OutFeatures)
        support = self.linear(x)
        
        # 2. Propagate: A * Support
        # adj is (Nodes, Nodes). support is (Batch, Nodes, OutFeatures).
        # We need (Batch, Nodes, OutFeatures) result.
        out = torch.matmul(adj, support)
        
        return self.dropout(out)

class FluSightGNN(nn.Module):
    """
    Spatiotemporal Graph Neural Network.
    Predicts variant distribution for N nodes over time.
    
    Structure:
    - Input: (Batch, Time, Nodes, Variants)
    - GCN Layer (Spatial mixing)
    - LSTM Layer (Temporal evolution per node)
    - Output Projection
    """
    def __init__(self, num_nodes, num_variants, adj_matrix, d_model=32, rnn_layers=1, dropout=0.1, pred_len=12):
        super().__init__()
        
        self.num_nodes = num_nodes
        self.num_variants = num_variants
        self.pred_len = pred_len
        
        # Register simplified adjacency as buffer (non-trainable param)
        # Pre-normalize the adjacency matrix: D^-1/2 * (A+I) * D^-1/2
        self.register_buffer('adj', self._normalize_adj(adj_matrix))
        
        # 1. Spatial Encoder (GCN)
        # Input features are variant probs (num_variants)
        self.gcn1 = GraphConvLayer(num_variants, d_model, dropout)
        self.gcn2 = GraphConvLayer(d_model, d_model, dropout)
        
        # 2. Temporal Encoder (LSTM)
        # We handle the Time dimension by iterating or reshaping
        # LSTM input: (Batch * Nodes, Time, d_model)
        self.lstm = nn.LSTM(d_model, d_model, num_layers=rnn_layers, batch_first=True, dropout=dropout if rnn_layers > 1 else 0)
        
        # 3. Decoder used for Autoregressive prediction
        # For simplicity in this version, we'll project the LAST hidden state to the full horizon
        # Similar to the Transformer approach but per node
        self.decoder = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.ReLU(),
            nn.Linear(d_model, pred_len * num_variants)
        )

    def _normalize_adj(self, adj):
        """Symmetrically normalize adjacency matrix."""
        # A_hat = A + I
        A_hat = adj + torch.eye(adj.size(0))
        
        # Degree Matrix D
        d = A_hat.sum(dim=1)
        
        # D^-1/2
        d_inv_sqrt = torch.pow(d, -0.5)
        d_inv_sqrt[torch.isinf(d_inv_sqrt)] = 0.
        D_inv_sqrt = torch.diag(d_inv_sqrt)
        
        # D^-1/2 * A_hat * D^-1/2
        return torch.mm(torch.mm(D_inv_sqrt, A_hat), D_inv_sqrt)

    def forward(self, x):
        """
        x: (Batch, Time, Nodes, Variants)
        Returns: (Batch, PredLen, Nodes, Variants)
        """
        b, t, n, f = x.size()
        
        # 1. GCN Step (Applied per timestep)
        # Reshape to (Batch * Time, Nodes, Variants) to batch spatial ops
        x_flat = x.view(b * t, n, f)
        
        x_gcn = self.gcn1(x_flat, self.adj) # (B*T, N, d_model)
        x_gcn = torch.relu(x_gcn)
        x_gcn = self.gcn2(x_gcn, self.adj) # (B*T, N, d_model)
        
        # 2. Temporal Step
        # Reshape for LSTM: (Batch, Time, Nodes, d_model) -> (Batch * Nodes, Time, d_model)
        # We want to track independent histories for each node (sharing weights)
        x_seq = x_gcn.view(b, t, n, -1)
        x_seq = x_seq.permute(0, 2, 1, 3).contiguous() # (B, N, T, d_model)
        x_seq = x_seq.view(b * n, t, -1) # (B*N, T, d_model)
        
        # LSTM
        out, (hn, cn) = self.lstm(x_seq)
        
        # Take last state: (B*N, d_model)
        last_state = out[:, -1, :] 
        
        # 3. Decode
        pred = self.decoder(last_state) # (B*N, PredLen * Variants)
        
        # Reshape back: (B, N, PredLen, Variants)
        pred = pred.view(b, n, self.pred_len, self.num_variants)
        
        # Permute to (B, PredLen, N, Variants) for consistency
        pred = pred.permute(0, 2, 1, 3)
        
        # Softmax
        pred = torch.softmax(pred, dim=3)
        
        return pred