import torch

class SequenceTokenizer:
    """
    Tokenizes amino acid sequences into integer indices for ML models.
    Vocabulary handling for standard amino acids + special tokens.
    """
    def __init__(self):
        # Standard Amino Acids + Special Tokens
        # X = unknown/pad, * = stop, - = gap
        self.chars = "ACDEFGHIKLMNPQRSTVWY*-X"
        self.vocab = {aa: i for i, aa in enumerate(self.chars)}
        self.inv_vocab = {i: aa for i, aa in enumerate(self.chars)}
        self.vocab_size = len(self.chars)
        self.pad_token_id = self.vocab['X'] # Use X as padding/unknown for now
    
    def encode(self, sequence):
        """Encodes a string sequence into a list of indices."""
        return [self.vocab.get(aa, self.vocab['X']) for aa in sequence]
        
    def decode(self, indices):
        """Decodes a list of indices (or tensor) back to a string."""
        if isinstance(indices, torch.Tensor):
            indices = indices.tolist()
        return "".join([self.inv_vocab.get(i, 'X') for i in indices])
    
    def batch_encode(self, sequences, max_len=None):
        """
        Encodes a list of sequences into a padded tensor.
        """
        encoded_seqs = [self.encode(seq) for seq in sequences]
        
        if max_len is None:
            max_len = max(len(s) for s in encoded_seqs)
            
        padded_seqs = []
        for seq in encoded_seqs:
            if len(seq) < max_len:
                seq = seq + [self.pad_token_id] * (max_len - len(seq))
            else:
                seq = seq[:max_len]
            padded_seqs.append(seq)
            
        return torch.tensor(padded_seqs, dtype=torch.long)
