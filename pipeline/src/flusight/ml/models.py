import torch
import torch.nn as nn

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
