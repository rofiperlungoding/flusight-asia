from typing import List, Dict, Tuple, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import collections

class TimeseriesProcessor:
    """
    Processes raw sequence data into time-series tensors for forecasting models.
    Handles aggregation, variant definition (clustering), and normalization.
    """
    
    def __init__(self, sequences: List[Dict]):
        """
        Args:
            sequences: List of dictionaries containing 'collection_date', 'mutations', etc.
        """
        self.raw_df = pd.DataFrame(sequences)
        if not self.raw_df.empty:
            self.raw_df['collection_date'] = pd.to_datetime(self.raw_df['collection_date'], errors='coerce')
            # Filter out invalid dates
            self.raw_df = self.raw_df.dropna(subset=['collection_date'])
            # Sort by date
            self.raw_df = self.raw_df.sort_values('collection_date')
            
        self.top_variants = []
        self.variant_map = {} # Maps variant_signature -> index
        
    def _define_variants(self, top_k: int = 5) -> List[str]:
        """
        Identifies the top K most common mutation signatures to define as 'Variants'.
        Returns the list of signatures.
        """
        if self.raw_df.empty:
            return []
            
        # Create a 'signature' string for each sequence
        # We need to assume 'mutations' is a list of mutation strings or objects
        # IF mutations are not pre-calculated, we might need to rely on 'clade' or similar
        # For now, let's assume 'mutations' field exists or we create a hashable signature
        
        signatures = []
        for _, row in self.raw_df.iterrows():
            muts = row.get('mutations', [])
            if isinstance(muts, list):
                # Sort mutations to ensure consistent signature
                # If mutations are dicts, extract notation. If strings, just sort.
                mut_strs = sorted([m if isinstance(m, str) else m.get('mutation_notation', '') for m in muts])
                sig = ",".join(mut_strs)
                if not sig: sig = "WT" # Wild Type / No mutations relative to ref
            else:
                sig = "Unknown"
            signatures.append(sig)
            
        self.raw_df['variant_signature'] = signatures
        
        # Count frequencies
        counts = collections.Counter(signatures)
        
        # Get top K
        self.top_variants = [sig for sig, count in counts.most_common(top_k)]
        
        # Create mapping: Variant -> Index (0 to K-1). K is 'Other'
        self.variant_map = {sig: i for i, sig in enumerate(self.top_variants)}
        
        print(f"✅ Identified Top {len(self.top_variants)} Variants:")
        for v in self.top_variants:
            print(f"   - {v[:50]}..." if len(v) > 50 else f"   - {v}")
            
        return self.top_variants

    def aggregate_weekly(self, smooth_window: int = 3) -> pd.DataFrame:
        """
        Aggregates sequences into a weekly frequency matrix.
        Cols: [Variant_0, Variant_1, ..., Variant_K-1, Other]
        Rows: ISO Weeks
        Values: Normalized frequency (Sum = 1.0)
        """
        if self.raw_df.empty:
            return pd.DataFrame()
            
        if not self.top_variants:
            self._define_variants()
            
        # Add 'iso_week' column
        self.raw_df['iso_week'] = self.raw_df['collection_date'].dt.to_period('W').apply(lambda r: r.start_time)

        # 1. Pivot Table: Count occurrences of each variant per week
        # First, map signatures to columns
        def map_variant(sig):
            if sig in self.top_variants:
                return sig
            return "Other"
            
        self.raw_df['mapped_variant'] = self.raw_df['variant_signature'].apply(map_variant)
        
        counts = self.raw_df.pivot_table(
            index='iso_week', 
            columns='mapped_variant', 
            aggfunc='size', 
            fill_value=0
        )
        
        # Ensure all columns exist (even if 0 counts)
        expected_cols = self.top_variants + ["Other"]
        for col in expected_cols:
            if col not in counts.columns:
                counts[col] = 0
                
        # Reorder columns
        counts = counts[expected_cols]
        
        # 2. Resample to ensure all weeks are present (fill 0)
        full_range = pd.date_range(start=self.raw_df['iso_week'].min(), end=self.raw_df['iso_week'].max(), freq='W-MON')
        counts = counts.reindex(full_range, fill_value=0)
        
        # 3. Smoothing (Rolling Average)
        # We smooth the counts before normalizing to handle low-sample weeks
        smoothed = counts.rolling(window=smooth_window, min_periods=1, center=False).mean()
        
        # 4. Normalize (Row Sum = 1.0)
        # constant to avoid div by zero
        sums = smoothed.sum(axis=1).replace(0, 1) 
        freqs = smoothed.div(sums, axis=0)
        
        return freqs

    def create_sliding_windows(self, weekly_df: pd.DataFrame, input_len: int = 52, pred_len: int = 12) -> Tuple[np.ndarray, np.ndarray]:
        """
        Creates sliding window tensors for training.
        X shape: (Samples, input_len, num_variants)
        y shape: (Samples, pred_len, num_variants)
        """
        data = weekly_df.values
        X, y = [], []
        
        if len(data) < input_len + pred_len:
            print(f"⚠️ Not enough data for sliding window. Need {input_len + pred_len}, got {len(data)}")
            return np.array(X), np.array(y)
            
        for i in range(len(data) - input_len - pred_len + 1):
            X_window = data[i : i + input_len]
            y_window = data[i + input_len : i + input_len + pred_len]
            X.append(X_window)
            y.append(y_window)
            
        return np.array(X), np.array(y)
