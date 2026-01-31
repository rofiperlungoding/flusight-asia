"""Simple NCBI connection test."""

import os
import sys
sys.path.insert(0, "src")

from dotenv import load_dotenv
load_dotenv()

from Bio import Entrez

def main():
    email = os.getenv("NCBI_EMAIL")
    api_key = os.getenv("NCBI_API_KEY")
    
    Entrez.email = email
    if api_key:
        Entrez.api_key = api_key
    
    print(f"🔬 Simple NCBI Connection Test")
    print(f"📧 Email: {email}")
    print("-" * 50)
    
    # Very simple query - just H3N2 influenza HA sequences
    query = 'Influenza A virus[Organism] AND H3N2[All Fields] AND hemagglutinin[Title] AND 1500:2000[SLEN]'
    
    print(f"🔍 Query: {query}")
    print("-" * 50)
    
    handle = Entrez.esearch(db="nucleotide", term=query, retmax=10)
    record = Entrez.read(handle)
    handle.close()
    
    count = record.get("Count", "0")
    ids = record.get("IdList", [])
    
    print(f"✅ Total matches in GenBank: {count}")
    print(f"📋 Retrieved IDs: {len(ids)}")
    
    if ids:
        print(f"\n🆔 Sample IDs: {ids[:5]}")
        
        # Fetch one record to verify
        print("\n📥 Fetching first record...")
        from Bio import SeqIO
        handle = Entrez.efetch(db="nucleotide", id=ids[0], rettype="gb", retmode="text")
        for record in SeqIO.parse(handle, "genbank"):
            print(f"   ID: {record.id}")
            print(f"   Description: {record.description[:80]}...")
            print(f"   Length: {len(record.seq)} bp")
        handle.close()
        print("\n✅ NCBI connection working!")
    else:
        print("⚠️  No results found")

if __name__ == "__main__":
    main()
