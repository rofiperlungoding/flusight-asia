"""Supabase database client."""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


def get_supabase_client() -> Client:
    """Get authenticated Supabase client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")  # Use service key for pipeline
    
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
    
    return create_client(url, key)


# Singleton client instance
_client: Client | None = None


def get_client() -> Client:
    """Get or create singleton Supabase client."""
    global _client
    if _client is None:
        _client = get_supabase_client()
    return _client
