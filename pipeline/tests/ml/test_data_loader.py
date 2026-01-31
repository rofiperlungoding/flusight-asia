import pytest
from flusight.ml.data_loader import fetch_training_data

def test_fetch_training_data_returns_dataframe():
    """Test that data loader returns a non-empty dataframe with required columns"""
    # This test might fail if network/db is down, but serves as integration test
    # Ideally should mock supabase, but for speed we'll hit dev db (it's read only here)
    try:
        df = fetch_training_data(limit=10)
        assert not df.empty
        assert 'sequence' in df.columns
        assert 'collection_date' in df.columns
    except Exception as e:
        # Debugging info
        import os
        print(f"URL: {os.environ.get('SUPABASE_URL')}") # Be careful with logs
        print(f"KEY Present: {bool(os.environ.get('SUPABASE_SERVICE_KEY'))}")
        pytest.fail(f"Failed to fetch data: {str(e)}")
