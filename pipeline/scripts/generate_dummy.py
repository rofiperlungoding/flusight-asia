import json
import pandas as pd
import numpy as np
import os

def generate_dummy():
    print("Generating dummy sequences_data.json...")
    dates = pd.date_range(start='2020-01-01', end='2026-02-01', freq='D')
    dummy_seqs = []
    variants = ['Clade A', 'Clade B', 'Clade C', 'Clade D', 'Clade E']
    
    for d in dates:
        # Simulate shifting dominance
        year = d.year
        if year < 2022: 
            probs = [0.6, 0.2, 0.1, 0.05, 0.05]
        elif year < 2024: 
             probs = [0.1, 0.6, 0.2, 0.05, 0.05]
        else:
             probs = [0.05, 0.1, 0.6, 0.2, 0.05]
             
        v = np.random.choice(variants, p=probs)
        
        dummy_seqs.append({
            'collection_date': d.strftime('%Y-%m-%d'),
            'mutations': [{'mutation_notation': v}], 
            'variant_signature': v,
            'strain_name': f'Simulated/{v}/{d.strftime("%Y-%m-%d")}'
        })
        
    path = os.path.join(os.path.dirname(__file__), '..', 'sequences_data.json')
    with open(path, 'w') as f:
        json.dump(dummy_seqs, f, indent=2)
    print(f"Saved to {path}")

if __name__ == "__main__":
    generate_dummy()
