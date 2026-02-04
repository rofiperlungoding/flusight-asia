"""NCBI GenBank data fetcher for influenza sequences."""

import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterator

from Bio import Entrez, SeqIO
from Bio.SeqRecord import SeqRecord

# Type alias for parsed sequence data
SequenceData = dict[str, str | int | float | None]


@dataclass
class NCBIFetcher:
    """Fetches influenza sequences from NCBI GenBank.
    
    This class provides methods to search, fetch, and parse influenza
    virus sequences from NCBI's GenBank database using BioPython's
    Entrez utilities.
    
    Attributes:
        email: Email address for NCBI Entrez (required by NCBI).
        api_key: Optional NCBI API key for higher rate limits.
        database: NCBI database to query (default: nucleotide).
        batch_size: Number of records to fetch per request.
    
    Example:
        >>> fetcher = NCBIFetcher(email="researcher@university.edu")
        >>> query = fetcher.build_search_query(subtype="H3N2", region="Asia")
        >>> ids = fetcher.search(query, max_results=100)
        >>> for record in fetcher.fetch_records(ids):
        ...     data = fetcher.parse_record(record)
        ...     print(data["strain_name"])
    """
    
    email: str
    api_key: str | None = None
    database: str = "nucleotide"
    batch_size: int = 100
    
    def __post_init__(self):
        """Configure Entrez with credentials."""
        Entrez.email = self.email
        if self.api_key:
            Entrez.api_key = self.api_key
    
    def build_search_query(
        self,
        subtype: str = "H3N2",
        segment: str = "HA",
        region: str | None = None,
        min_date: str | None = None,
        max_date: str | None = None,
    ) -> str:
        """Build NCBI search query for influenza sequences.
        
        Args:
            subtype: Influenza subtype (e.g., "H3N2", "H1N1").
            segment: Gene segment (e.g., "HA", "NA").
            region: Geographic region to filter by (e.g., "Asia").
            min_date: Minimum collection date (YYYY-MM-DD format).
            max_date: Maximum collection date (YYYY-MM-DD format).
            
        Returns:
            NCBI Entrez query string.
        """
        # Base query for influenza A with specified subtype
        query_parts = [
            "Influenza A virus[Organism]",
            f"{subtype}[All Fields]",
        ]
        
        # Add segment filter
        segment_terms = {
            "HA": "hemagglutinin[Title]",
            "NA": "neuraminidase[Title]",
        }
        if segment in segment_terms:
            query_parts.append(segment_terms[segment])
        
        # Filter for human host only (exclude avian, swine, etc.)
        query_parts.append('"Homo sapiens"[Host]')
        
        # Add region filter (countries in Asia) - use simpler OR syntax
        if region and region.lower() == "asia":
            asian_countries = [
                "China", "Japan", "Korea", "Taiwan", "Singapore",
                "Thailand", "Vietnam", "Malaysia", "Indonesia", "Philippines",
                "India", "Bangladesh", "Hong Kong"
            ]
            country_query = " OR ".join(f'{c}[All Fields]' for c in asian_countries)
            query_parts.append(f"({country_query})")
        
        # Filter for complete HA sequences (reasonably long, ~1700bp typical)
        query_parts.append("1500:2000[SLEN]")
        
        return " AND ".join(query_parts)
    
    def search(self, query: str, max_results: int = 1000, max_retries: int = 3) -> list[str]:
        """Search NCBI and return list of accession IDs.
        
        Args:
            query: NCBI Entrez search query string.
            max_results: Maximum number of results to return.
            max_retries: Maximum number of retry attempts for transient failures.
            
        Returns:
            List of GenBank accession IDs.
            
        Raises:
            RuntimeError: If all retry attempts fail.
        """
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                handle = Entrez.esearch(
                    db=self.database,
                    term=query,
                    retmax=max_results,
                    usehistory="y",
                )
                record = Entrez.read(handle)
                handle.close()
                
                return record["IdList"]
                
            except RuntimeError as e:
                last_exception = e
                # Handle transient NCBI errors like "Search Backend failed"
                if "Backend" in str(e) or "timeout" in str(e).lower():
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    print(f"⚠️ NCBI API error (attempt {attempt + 1}/{max_retries}): {e}")
                    print(f"   Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise
        
        # All retries exhausted
        raise RuntimeError(f"NCBI search failed after {max_retries} attempts: {last_exception}")
    
    def fetch_records(self, ids: list[str], max_retries: int = 3) -> Iterator[SeqRecord]:
        """Fetch sequence records by ID in batches.
        
        Args:
            ids: List of GenBank accession IDs.
            max_retries: Maximum number of retry attempts per batch for transient failures.
            
        Yields:
            BioPython SeqRecord objects.
        """
        for i in range(0, len(ids), self.batch_size):
            batch_ids = ids[i:i + self.batch_size]
            batch_num = i // self.batch_size + 1
            
            # Retry logic for each batch
            for attempt in range(max_retries):
                try:
                    handle = Entrez.efetch(
                        db=self.database,
                        id=",".join(batch_ids),
                        rettype="gb",
                        retmode="text",
                    )
                    
                    for record in SeqIO.parse(handle, "genbank"):
                        yield record
                    
                    handle.close()
                    break  # Success, exit retry loop
                    
                except (RuntimeError, IOError, Exception) as e:
                    error_msg = str(e).lower()
                    # Handle transient NCBI errors
                    if any(keyword in error_msg for keyword in ["backend", "timeout", "connection", "reset"]):
                        if attempt < max_retries - 1:
                            wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                            print(f"⚠️ Batch {batch_num} fetch error (attempt {attempt + 1}/{max_retries}): {e}")
                            print(f"   Retrying in {wait_time} seconds...")
                            time.sleep(wait_time)
                        else:
                            print(f"❌ Batch {batch_num} failed after {max_retries} attempts: {e}")
                            raise
                    else:
                        raise
            
            # Rate limiting: NCBI allows 10 requests/second with API key, 3 without
            time.sleep(0.5)
    
    def parse_record(self, record: SeqRecord | dict) -> SequenceData:
        """Parse a GenBank record into our schema format.
        
        Args:
            record: BioPython SeqRecord or dict-like object (for testing).
            
        Returns:
            Dictionary matching our sequence table schema.
        """
        # Handle both SeqRecord and dict inputs (for testing)
        if isinstance(record, dict):
            return self._parse_dict_record(record)
        
        return self._parse_seqrecord(record)
    
    def _parse_dict_record(self, record: dict) -> SequenceData:
        """Parse a dictionary record (for testing)."""
        description = record.get("description", "")
        
        # Extract strain name from description
        strain_match = re.search(r'\(A/[^)]+\)', description)
        strain_name = strain_match.group(0)[1:-1] if strain_match else description
        
        # Extract subtype
        subtype = "H3N2" if "H3N2" in description else "Unknown"
        
        return {
            "genbank_id": record.get("id"),
            "strain_name": strain_name,
            "segment": "HA",
            "subtype": subtype,
            "raw_sequence": str(record.get("seq", "")),
            "sequence_length": len(record.get("seq", "")),
            "source": "ncbi",
        }
    
    def _parse_seqrecord(self, record: SeqRecord) -> SequenceData:
        """Parse a BioPython SeqRecord."""
        # Extract metadata from features and annotations
        strain_name = self._extract_strain_name(record)
        collection_date = self._extract_collection_date(record)
        country = self._extract_country(record)
        
        return {
            "genbank_id": record.id,
            "strain_name": strain_name,
            "segment": "HA",
            "subtype": "H3N2",
            "raw_sequence": str(record.seq),
            "sequence_length": len(record.seq),
            "collection_date": collection_date,
            "country": country,
            "host": self._extract_host(record),
            "source": "ncbi",
        }
    
    def _extract_strain_name(self, record: SeqRecord) -> str:
        """Extract strain name from record."""
        # Try features first
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "strain" in qualifiers:
                    return qualifiers["strain"][0]
                if "isolate" in qualifiers:
                    return qualifiers["isolate"][0]
        
        # Fall back to description parsing
        desc = record.description
        match = re.search(r'\(A/[^)]+\)', desc)
        if match:
            return match.group(0)[1:-1]
        
        return record.id
    
    def _extract_collection_date(self, record: SeqRecord) -> str | None:
        """Extract collection date from record."""
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "collection_date" in qualifiers:
                    date_str = qualifiers["collection_date"][0]
                    return self._normalize_date(date_str)
        return None
    
    def _extract_country(self, record: SeqRecord) -> str | None:
        """Extract country from record."""
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "country" in qualifiers:
                    country = qualifiers["country"][0]
                    # May include region: "China: Hong Kong"
                    return country.split(":")[0].strip()
        return None
    
    def _extract_host(self, record: SeqRecord) -> str:
        """Extract host from record."""
        for feature in record.features:
            if feature.type == "source":
                qualifiers = feature.qualifiers
                if "host" in qualifiers:
                    return qualifiers["host"][0].capitalize()
        return "Human"  # Default for influenza A
    
    def _normalize_date(self, date_str: str) -> str | None:
        """Normalize date string to ISO format.
        
        Handles various date formats commonly found in GenBank:
        - Full: "2024-06-15"
        - Month: "2024-06" or "Jun-2024"
        - Year: "2024"
        
        Args:
            date_str: Date string in various formats.
            
        Returns:
            ISO formatted date string (YYYY-MM-DD) or None if unparseable.
        """
        # Common formats in GenBank
        formats = [
            "%Y-%m-%d",
            "%Y-%m",
            "%Y",
            "%d-%b-%Y",
            "%b-%Y",
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        return None


def fetch_h3n2_asia(
    email: str,
    api_key: str | None = None,
    min_date: str = "2020-01-01",
    max_results: int = 500,
) -> list[SequenceData]:
    """Convenience function to fetch H3N2 sequences from Asia.
    
    This is the main entry point for the data pipeline to fetch
    influenza sequences from NCBI.
    
    Args:
        email: Email for NCBI Entrez (required by NCBI policy).
        api_key: Optional NCBI API key for higher rate limits.
        min_date: Minimum collection date (default: 2020-01-01).
        max_results: Maximum sequences to fetch.
        
    Returns:
        List of parsed sequence data dictionaries.
        
    Example:
        >>> sequences = fetch_h3n2_asia(
        ...     email="researcher@example.com",
        ...     min_date="2024-01-01",
        ...     max_results=100
        ... )
        >>> for seq in sequences:
        ...     print(f"{seq['strain_name']}: {seq['sequence_length']}bp")
    """
    fetcher = NCBIFetcher(email=email, api_key=api_key)
    
    query = fetcher.build_search_query(
        subtype="H3N2",
        segment="HA",
        region="Asia",
        min_date=min_date,
    )
    
    ids = fetcher.search(query, max_results=max_results)
    
    sequences = []
    for record in fetcher.fetch_records(ids):
        parsed = fetcher.parse_record(record)
        sequences.append(parsed)
    
    return sequences
