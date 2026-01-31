"""Tests for NCBI data fetcher."""

import pytest
from flusight.ingestion.ncbi import NCBIFetcher


def test_ncbi_fetcher_initialization():
    """Test that NCBIFetcher initializes with required parameters."""
    fetcher = NCBIFetcher(email="test@example.com")
    assert fetcher.email == "test@example.com"
    assert fetcher.database == "nucleotide"


def test_build_search_query():
    """Test that search query is built correctly for H3N2 Asia."""
    fetcher = NCBIFetcher(email="test@example.com")
    query = fetcher.build_search_query(
        subtype="H3N2",
        segment="HA",
        region="Asia",
        min_date="2024-01-01"
    )
    
    assert "H3N2" in query
    assert "Influenza A virus" in query


def test_build_search_query_segment_filter():
    """Test that segment filter is applied correctly."""
    fetcher = NCBIFetcher(email="test@example.com")
    query = fetcher.build_search_query(segment="HA")
    
    # Should include hemagglutinin or HA terms
    assert "hemagglutinin" in query.lower() or "HA" in query


def test_parse_dict_record():
    """Test parsing of a dictionary record (mock GenBank)."""
    fetcher = NCBIFetcher(email="test@example.com")
    
    # Mock GenBank record structure
    mock_record = {
        "id": "MN123456",
        "description": "Influenza A virus (A/Singapore/2024-0001(H3N2)) hemagglutinin (HA) gene",
        "seq": "ATGAAGACTATCATTGCTTTGAGCTACATTCTATGTCTGGTTTTCGCTCAAAAACTTCCCGGAAATGACAAC",
    }
    
    parsed = fetcher.parse_record(mock_record)
    
    assert parsed["genbank_id"] == "MN123456"
    assert parsed["subtype"] == "H3N2"
    assert "Singapore" in parsed["strain_name"]
    assert parsed["source"] == "ncbi"
    assert parsed["sequence_length"] == len(mock_record["seq"])


def test_normalize_date_formats():
    """Test date normalization for various formats."""
    fetcher = NCBIFetcher(email="test@example.com")
    
    # Full date
    assert fetcher._normalize_date("2024-06-15") == "2024-06-15"
    
    # Month only - should default to first of month
    result = fetcher._normalize_date("2024-06")
    assert result.startswith("2024-06")
    
    # Year only
    result = fetcher._normalize_date("2024")
    assert result.startswith("2024")
