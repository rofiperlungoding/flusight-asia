from typing import List, Dict, Tuple
import pandas as pd
import numpy as np
from .timeseries import TimeseriesProcessor
from .graph_topology import ASIA_GRAPH

class GeoTimeseriesProcessor(TimeseriesProcessor):
    """
    Extends TimeseriesProcessor to handle spatial aggregation.
    """
    def __init__(self, sequences: List[Dict]):
        super().__init__(sequences)
        # Ensure variants are defined globally
        self._define_variants()
        
    def aggregate_spatial(self, smooth_window: int = 3) -> Tuple[np.ndarray, List[pd.Timestamp]]:
        """
        Creates a spatiotemporal tensor.
        Returns:
            tensor: (Time, Nodes, Variants) - Normalized frequencies
            dates: List of timestamps corresponding to the Time dimension
        """
        if self.raw_df.empty:
            return np.array([]), []

        # 1. Determine Global Time Range
        # We need a unified time index for all countries
        global_start = self.raw_df['collection_date'].min()
        global_end = self.raw_df['collection_date'].max()
        
        # Round to weeks
        global_start = global_start - pd.Timedelta(days=global_start.weekday())
        
        full_range = pd.date_range(start=global_start, end=global_end, freq='W-MON')
        
        # 2. Iterate Nodes
        node_data = [] # List of (Time, Variants) arrays
        
        nodes = ASIA_GRAPH['nodes']
        
        for node in nodes:
            # Filter data for this country
            # We assume 'location' or 'country' field exists in sequence data
            # Or parse from strain name? usually "A/Country/..."
            
            # Helper to check country
            def check_country(row):
                # Check explicit field first
                if row.get('country') == node: return True
                if isinstance(row.get('location'), dict) and row['location'].get('country') == node: return True
                
                # Check strain name
                strain = str(row.get('strain_name', ''))
                if f"/{node}/" in strain or strain.startswith(f"A/{node}"):
                    return True
                return False
                
            # Filter
            country_mask = self.raw_df.apply(check_country, axis=1)
            country_df = self.raw_df[country_mask].copy()
            
            if country_df.empty:
                # Create zero-filled dataframe for all weeks
                # Correct shape: (Weeks, NumVariants)
                cols = self.top_variants + ['Other']
                empty_data = np.zeros((len(full_range), len(cols)))
                # Set 'Other' to 1.0? Or uniform?
                # If no data, we assume 1.0 Other (Unknown) or 0 (No info).
                # Uniform distribution (1/K) is often safer for ML than 0s which imply certainty.
                # Let's use Uniform distribution for missing data to avoid bias? 
                # actually, fill 0 and handle masking in loss function is best, but model expects probability sum=1.
                # Let's set 'Other' to 1.0.
                empty_df = pd.DataFrame(empty_data, index=full_range, columns=cols)
                empty_df['Other'] = 1.0 
                node_data.append(empty_df.values)
                print(f"⚠️ No data for {node}, filling with 'Other'=1.0")
                continue
                
            # Aggregate using parent logic
            freqs = self.aggregate_weekly(smooth_window=smooth_window, target_df=country_df)
            
            # Reindex to Global Range
            freqs = freqs.reindex(full_range, fill_value=0)
            
            # Fill missing weeks (NaNs from reindex)
            # Forward fill first?
            freqs = freqs.ffill().bfill()
            
            # If still NaNs (empty df originally), fill 'Other' = 1.0
            if freqs.isnull().all().all():
                 freqs[:] = 0
                 freqs['Other'] = 1.0
            else:
                 # Clean up any remaining NaNs
                 freqs = freqs.fillna(0)
                 # Re-normalize just in case
                 sums = freqs.sum(axis=1).replace(0, 1)
                 freqs = freqs.div(sums, axis=0)

            node_data.append(freqs.values)
            print(f"✅ Processed {node}: {len(freqs)} weeks")

        # Stack: (Nodes, Time, Variants) -> Transpose to (Time, Nodes, Variants)
        # node_data is [ (T, V), (T, V) ... ]
        
        tensor = np.stack(node_data, axis=0) # (Nodes, Time, Variants)
        tensor = np.swapaxes(tensor, 0, 1)   # (Time, Nodes, Variants)
        
        return tensor, full_range
