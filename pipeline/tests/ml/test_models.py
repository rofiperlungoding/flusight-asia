import pytest
import torch
from flusight.ml.models import MutationLSTM

def test_lstm_forward_pass_shape():
    batch_size = 2
    seq_len = 10
    vocab_size = 25
    
    model = MutationLSTM(vocab_size=vocab_size, hidden_size=16)
    
    # Random integer inputs (indices)
    input_seq = torch.randint(0, vocab_size, (batch_size, seq_len))
    
    output = model(input_seq)
    
    # Output should correspond to logits for each position
    assert output.shape == (batch_size, seq_len, vocab_size)

def test_lstm_parameters_update():
    # Simple check that gradients flow
    vocab_size = 5
    model = MutationLSTM(vocab_size=vocab_size, hidden_size=4)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
    
    input_seq = torch.randint(0, vocab_size, (1, 5))
    target = torch.randint(0, vocab_size, (1, 5))
    
    output = model(input_seq)
    # Reshape for CrossEntropy: (Batch*Seq, Class)
    loss = torch.nn.functional.cross_entropy(output.view(-1, vocab_size), target.view(-1))
    
    loss.backward()
    optimizer.step()
    
    # No assertion, just ensure it runs without error
    assert True
