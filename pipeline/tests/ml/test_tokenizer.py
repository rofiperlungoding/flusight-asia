import pytest
import torch
from flusight.ml.tokenizer import SequenceTokenizer

def test_tokenizer_encodes_and_decodes():
    tokenizer = SequenceTokenizer()
    seq = "MKAIL"
    encoded = tokenizer.encode(seq)
    decoded = tokenizer.decode(encoded)
    
    assert len(encoded) == 5
    assert decoded == seq
    # 'M' is in vocab
    assert encoded[0] in tokenizer.vocab.values()

def test_tokenizer_handles_unknown_chars():
    tokenizer = SequenceTokenizer()
    seq = "MK?IL" # ? is unknown
    encoded = tokenizer.encode(seq)
    decoded = tokenizer.decode(encoded)
    
    # ? should be mapped to X
    assert decoded == "MKXIL"

def test_batch_encode():
    tokenizer = SequenceTokenizer()
    seqs = ["MK", "MKAIL"]
    # Should pad to length 5
    batch = tokenizer.batch_encode(seqs)
    
    assert batch.shape == (2, 5)
    assert batch[0, 2].item() == tokenizer.vocab['X'] # Padding
    assert batch[1, 4].item() == tokenizer.vocab['L']
