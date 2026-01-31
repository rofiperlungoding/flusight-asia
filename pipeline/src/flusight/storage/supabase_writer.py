"""Supabase storage writer for sequence data."""

import os
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


class SupabaseWriter:
    """Writes sequence data to Supabase database.
    
    This class handles:
    - Upserting sequences (avoiding duplicates)
    - Matching sequences to locations
    - Logging pipeline job status
    
    Example:
        >>> writer = SupabaseWriter()
        >>> writer.upsert_sequences(sequences)
        >>> writer.log_job_complete("ncbi_ingest", records_processed=100)
    """
    
    def __init__(self, url: str | None = None, key: str | None = None):
        """Initialize Supabase client.
        
        Args:
            url: Supabase project URL (defaults to env var).
            key: Supabase service role key (defaults to env var).
        """
        self.url = url or os.environ.get("SUPABASE_URL")
        self.key = key or os.environ.get("SUPABASE_SERVICE_KEY")
        
        if not self.url or not self.key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        
        self.client: Client = create_client(self.url, self.key)
        self._location_cache: dict[str, str] = {}
    
    def _get_location_id(self, country: str | None) -> str | None:
        """Get location ID by country name, using cache.
        
        Args:
            country: Country name to look up.
            
        Returns:
            Location UUID or None if not found.
        """
        if not country:
            return None
        
        # Check cache first
        if country in self._location_cache:
            return self._location_cache[country]
        
        # Query database
        result = self.client.table("locations").select("id").eq("country", country).execute()
        
        if result.data:
            location_id = result.data[0]["id"]
            self._location_cache[country] = location_id
            return location_id
        
        return None
    
    def upsert_sequences(self, sequences: list[dict[str, Any]]) -> dict[str, int]:
        """Upsert sequences to database, avoiding duplicates.
        
        Uses genbank_id as the unique constraint for upsert.
        
        Args:
            sequences: List of parsed sequence dictionaries.
            
        Returns:
            Dict with counts: {"inserted": N, "updated": N, "skipped": N}
        """
        stats = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
        
        for seq in sequences:
            try:
                # Map country to location_id
                country = seq.pop("country", None)
                location_id = self._get_location_id(country)
                
                # Prepare record for database
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
                
                # Check if sequence exists
                existing = (
                    self.client.table("sequences")
                    .select("id")
                    .eq("genbank_id", record.get("genbank_id"))
                    .execute()
                )
                
                if existing.data:
                    # Update existing
                    self.client.table("sequences").update(record).eq(
                        "genbank_id", record.get("genbank_id")
                    ).execute()
                    stats["updated"] += 1
                else:
                    # Insert new
                    self.client.table("sequences").insert(record).execute()
                    stats["inserted"] += 1
                    
            except Exception as e:
                print(f"Error upserting sequence {seq.get('genbank_id')}: {e}")
                stats["errors"] += 1
        
        return stats
    
    def log_job_start(self, job_name: str, batch_id: str | None = None) -> str:
        """Log the start of a pipeline job.
        
        Args:
            job_name: Name of the job (e.g., "ncbi_ingest").
            batch_id: Optional batch identifier.
            
        Returns:
            The UUID of the created log entry.
        """
        record = {
            "job_name": job_name,
            "batch_id": batch_id,
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
        }
        
        result = self.client.table("pipeline_logs").insert(record).execute()
        return result.data[0]["id"]
    
    def log_job_complete(
        self,
        log_id: str,
        status: str = "success",
        records_processed: int = 0,
        records_failed: int = 0,
        message: str | None = None,
        error_details: dict | None = None,
    ) -> None:
        """Update a pipeline log entry with completion status.
        
        Args:
            log_id: The UUID of the log entry to update.
            status: Final status ("success", "failed", "partial").
            records_processed: Number of records successfully processed.
            records_failed: Number of records that failed.
            message: Optional status message.
            error_details: Optional error details dict.
        """
        update = {
            "status": status,
            "records_processed": records_processed,
            "records_failed": records_failed,
            "completed_at": datetime.utcnow().isoformat(),
        }
        
        if message:
            update["message"] = message
        if error_details:
            update["error_details"] = error_details
        
        self.client.table("pipeline_logs").update(update).eq("id", log_id).execute()
    
    def get_sequence_count(self) -> int:
        """Get total count of sequences in database."""
        result = self.client.table("sequences").select("id", count="exact").execute()
        return result.count or 0
    
    def get_recent_sequences(self, limit: int = 10) -> list[dict]:
        """Get most recently added sequences."""
        result = (
            self.client.table("sequences")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
