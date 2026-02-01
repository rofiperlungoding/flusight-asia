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
            
        # Ensure variant_signature exists
        if 'variant_signature' not in self.raw_df.columns:
            signatures = []
            for _, row in self.raw_df.iterrows():
                muts = row.get('mutations', [])
                # Handle various mutation formats (dicts from API or raw strings)
                if isinstance(muts, list):
                    processed_muts = []
                    for m in muts:
                         if isinstance(m, dict):
                             processed_muts.append(m.get('mutation_notation', ''))
                         elif isinstance(m, str):
                             processed_muts.append(m)
                    
                    # Sort and join
                    sig = ",".join(sorted([m for m in processed_muts if m]))
                    if not sig: sig = "WT" 
                else:
                    sig = "Unknown"
                signatures.append(sig)
                
            self.raw_df['variant_signature'] = signatures
        
        # Count frequencies
        counts = collections.Counter(self.raw_df['variant_signature'])
        
        # Get top K
        self.top_variants = [sig for sig, count in counts.most_common(top_k)]
        
        # Create mapping
        self.variant_map = {sig: i for i, sig in enumerate(self.top_variants)}
        
        print(f"✅ Identified Top {len(self.top_variants)} Variants:")
        # for v in self.top_variants:
        #     print(f"   - {v[:50]}..." if len(v) > 50 else f"   - {v}")
            
        return self.top_variants

    def aggregate_weekly(self, smooth_window: int = 3, target_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Aggregates sequences into a weekly frequency matrix.
        Args:
            smooth_window: Weeks to smooth over.
            target_df: Optional DataFrame to aggregate. Defaults to self.raw_df.
        """
        df = target_df if target_df is not None else self.raw_df

        if df.empty:
            return pd.DataFrame()
            
        if not self.top_variants:
            self._define_variants()
            
        # Add 'iso_week' column if not present (it might be since we operate on subset)
        if 'iso_week' not in df.columns:
            df = df.copy() # Avoid SettingWithCopy
            df['iso_week'] = df['collection_date'].dt.to_period('W').apply(lambda r: r.start_time)

        # 1. Pivot Table: Count occurrences of each variant per week
        # First, map signatures to columns
        def map_variant(sig):
            if sig in self.top_variants:
                return sig
            return "Other"
            
        # Ensure variant_signature column exists in the target df
        if 'variant_signature' not in df.columns:
            # If we are using self.raw_df, it should have been created in _define_variants
            # If df is a subset or new df, we need to regenerate signatures
            # Reuse _define_variants logic but just for column creation if top_variants is already set?
            # Simpler: just call _define_variants() which is idempotent-ish or create a helper.
            # For now, let's just trigger _define_variants if the main raw_df doesn't have it, 
            # Or manually apply the signature logic if operating on a copy.
            
            # FAST FIX: ensure we only run this if necessary
            if self.raw_df is df and 'variant_signature' in self.raw_df:
                 pass 
            else:
                 # Re-run signature generation for this dataframe
                 signatures = []
                 for _, row in df.iterrows():
                    muts = row.get('mutations', [])
                    if isinstance(muts, list):
                        processed = []
                        for m in muts:
                             if isinstance(m, dict): processed.append(m.get('mutation_notation', ''))
                             elif isinstance(m, str): processed.append(m)
                        sig = ",".join(sorted([p for p in processed if p])) or "WT"
                    else:
                        sig = "Unknown"
                    signatures.append(sig)
                 df['mapped_variant'] = [s if s in self.top_variants else "Other" for s in signatures]

        if 'mapped_variant' not in df.columns and 'variant_signature' in df.columns:
             df['mapped_variant'] = df['variant_signature'].apply(map_variant)
        
        counts = df.pivot_table(
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
        # Use simple global min/max or df specific? 
        # For comparative spatial analysis, we might want a global range, 
        # but for this method let's stick to df specific unless provided.
        # Ideally, start/end should be configurable.
        start_date = df['iso_week'].min()
        end_date = df['iso_week'].max()
        
        if pd.isna(start_date) or pd.isna(end_date):
             return pd.DataFrame()

        full_range = pd.date_range(start=start_date, end=end_date, freq='W-MON')
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
