"""Lightweight Supabase writer using httpx (no compiled dependencies)."""

import os
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()


class SupabaseClient:
    """Lightweight Supabase client using httpx for CI compatibility.
    
    This avoids the compiled dependencies issue with the official
    supabase-py package while providing essential CRUD operations.
    """
    
    def __init__(self, url: str | None = None, key: str | None = None):
        """Initialize client with project URL and service key."""
        self.url = (url or os.environ.get("SUPABASE_URL", "")).rstrip("/")
        self.key = key or os.environ.get("SUPABASE_SERVICE_KEY", "")
        
        if not self.url or not self.key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        
        self.rest_url = f"{self.url}/rest/v1"
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._location_cache: dict[str, str] = {}
    
    def _request(
        self,
        method: str,
        table: str,
        params: dict | None = None,
        json: dict | list | None = None,
    ) -> httpx.Response:
        """Make a request to the Supabase REST API."""
        url = f"{self.rest_url}/{table}"
        response = httpx.request(
            method,
            url,
            headers=self.headers,
            params=params,
            json=json,
            timeout=30.0,
        )
        response.raise_for_status()
        return response
    
    def select(self, table: str, columns: str = "*", **filters) -> list[dict]:
        """Select rows from a table."""
        params = {"select": columns}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        response = self._request("GET", table, params=params)
        return response.json()
    
    def insert(self, table: str, data: dict | list[dict]) -> list[dict]:
        """Insert row(s) into a table."""
        if isinstance(data, dict):
            data = [data]
        response = self._request("POST", table, json=data)
        return response.json()
    
    def update(self, table: str, data: dict, **filters) -> list[dict]:
        """Update rows matching filters."""
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        response = self._request("PATCH", table, params=params, json=data)
        return response.json()
    
    def upsert(self, table: str, data: dict | list[dict], on_conflict: str = "id") -> list[dict]:
        """Upsert row(s) into a table."""
        if isinstance(data, dict):
            data = [data]
        
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        url = f"{self.rest_url}/{table}"
        
        response = httpx.post(
            url,
            headers=headers,
            params={"on_conflict": on_conflict},
            json=data,
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()
    
    def count(self, table: str) -> int:
        """Get count of rows in a table."""
        headers = {**self.headers, "Prefer": "count=exact"}
        response = httpx.head(
            f"{self.rest_url}/{table}",
            headers=headers,
            params={"select": "id"},
            timeout=30.0,
        )
        return int(response.headers.get("content-range", "0-0/0").split("/")[-1])


class SequenceWriter:
    """Writes sequence data to Supabase."""
    
    def __init__(self, client: SupabaseClient | None = None):
        """Initialize with optional client."""
        self.client = client or SupabaseClient()
        self._location_cache: dict[str, str] = {}
    
    def _get_location_id(self, country: str | None) -> str | None:
        """Get location ID by country name."""
        if not country:
            return None
        
        if country in self._location_cache:
            return self._location_cache[country]
        
        results = self.client.select("locations", "id", country=country)
        if results:
            location_id = results[0]["id"]
            self._location_cache[country] = location_id
            return location_id
        
        return None
    
    def write_sequences(self, sequences: list[dict[str, Any]]) -> dict[str, int]:
        """Write parsed sequences to Supabase.
        
        Args:
            sequences: List of parsed sequence dictionaries.
            
        Returns:
            Dict with counts: {"written": N, "errors": N}
        """
        stats = {"written": 0, "errors": 0}
        
        for seq in sequences:
            try:
                # Map country to location_id
                country = seq.pop("country", None)
                location_id = self._get_location_id(country)
                
                # Prepare record
                record = {
                    "genbank_id": seq.get("genbank_id"),
                    "strain_name": seq.get("strain_name"),
                    "segment": seq.get("segment", "HA"),
                    "subtype": seq.get("subtype", "H3N2"),
                    "raw_sequence": seq.get("raw_sequence"),
                    "sequence_length": seq.get("sequence_length"),
                    "collection_date": seq.get("collection_date"),
                    "location_id": location_id,
                    "host": seq.get("host", "Human"),
                    "source": seq.get("source", "ncbi"),
                }
                
                # Remove None values
                record = {k: v for k, v in record.items() if v is not None}
                
                # Upsert by genbank_id
                self.client.upsert("sequences", record, on_conflict="genbank_id")
                stats["written"] += 1
                
            except Exception as e:
                print(f"❌ Error writing {seq.get('genbank_id')}: {e}")
                stats["errors"] += 1
        
        return stats
    
    def log_job(
        self,
        job_name: str,
        status: str,
        records_processed: int = 0,
        records_failed: int = 0,
        message: str | None = None,
    ) -> None:
        """Log a pipeline job to the database."""
        record = {
            "job_name": job_name,
            "status": status,
            "records_processed": records_processed,
            "records_failed": records_failed,
            "message": message,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat(),
        }
        self.client.insert("pipeline_logs", record)


def write_sequences_to_supabase(sequences: list[dict]) -> dict[str, int]:
    """Convenience function for pipeline use.
    
    Args:
        sequences: List of parsed sequence dictionaries.
        
    Returns:
        Stats dict with written/error counts.
    """
    writer = SequenceWriter()
    stats = writer.write_sequences(sequences)
    
    # Log the job
    status = "success" if stats["errors"] == 0 else "partial"
    writer.log_job(
        job_name="ncbi_ingest",
        status=status,
        records_processed=stats["written"],
        records_failed=stats["errors"],
        message=f"Wrote {stats['written']} sequences, {stats['errors']} errors",
    )
    
    return stats
