"""Quick test to fetch real H3N2 sequences from NCBI."""

import os
import sys
sys.path.insert(0, "src")

from dotenv import load_dotenv
load_dotenv()

from flusight.ingestion.ncbi import NCBIFetcher

def main():
    email = os.getenv("NCBI_EMAIL")
    api_key = os.getenv("NCBI_API_KEY")
    
    print(f"🔬 FluSight-Asia NCBI Fetcher Test")
    print(f"📧 Using email: {email}")
    print(f"🔑 API Key: {'✓ configured' if api_key else '✗ not set'}")
    print("-" * 50)
    
    fetcher = NCBIFetcher(email=email, api_key=api_key)
    
    # Build query for H3N2 from Asia (using older date for more results)
    query = fetcher.build_search_query(
        subtype="H3N2",
        segment="HA",
        region="Asia",
        min_date="2020-01-01"  # Broader date range
    )
    print(f"🔍 Query: {query[:100]}...")
    print("-" * 50)
    
    # Search for IDs
    print("⏳ Searching NCBI GenBank...")
    ids = fetcher.search(query, max_results=10)
    print(f"✅ Found {len(ids)} sequences")
    
    if not ids:
        print("⚠️  No sequences found. Try adjusting the date range.")
        return
    
    # Fetch and parse first few records
    print(f"\n📥 Fetching first {min(5, len(ids))} sequences...")
    print("-" * 50)
    
    count = 0
    for record in fetcher.fetch_records(ids[:5]):
        parsed = fetcher.parse_record(record)
        count += 1
        print(f"\n🧬 Sequence #{count}")
        print(f"   GenBank ID: {parsed.get('genbank_id')}")
        print(f"   Strain: {parsed.get('strain_name')}")
        print(f"   Date: {parsed.get('collection_date')}")
        print(f"   Country: {parsed.get('country')}")
        print(f"   Length: {parsed.get('sequence_length')} bp")
    
    print("\n" + "=" * 50)
    print(f"✅ Successfully fetched {count} sequences!")
    print("=" * 50)

if __name__ == "__main__":
    main()
