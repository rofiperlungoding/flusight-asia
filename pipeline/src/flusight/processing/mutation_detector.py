"""
Mutation detection module for influenza sequences.

Compares sequences against reference strains to identify mutations,
particularly those at antigenic sites.
"""

from dataclasses import dataclass
from typing import Optional

from .reference_strains import (
    H3N2_HA_REFERENCE,
    translate_sequence,
    get_antigenic_site,
    is_escape_mutation,
)


@dataclass
class Mutation:
    """Represents a single amino acid mutation."""
    position: int  # Absolute position in reference
    reference_aa: str
    variant_aa: str
    antigenic_site: Optional[str] = None
    is_escape: bool = False
    is_novel: bool = False
    
    @property
    def notation(self) -> str:
        """Standard mutation notation: e.g., K145N"""
        return f"{self.reference_aa}{self.position}{self.variant_aa}"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for database insertion."""
        return {
            "position": self.position,
            "reference_aa": self.reference_aa,
            "variant_aa": self.variant_aa,
            "mutation_notation": self.notation,
            "antigenic_site": self.antigenic_site,
            "is_escape_mutation": self.is_escape,
            "is_novel": self.is_novel,
            "is_synonymous": False,
        }


def find_alignment_offset(query_aa: str, ref_aa: str, window: int = 20) -> int:
    """
    Find the offset where query aligns to reference.
    Returns the position in reference where query starts.
    Uses a sliding window to find best match.
    """
    if not query_aa or not ref_aa:
        return 0
    
    query_start = query_aa[:window]
    best_score = 0
    best_offset = 0
    
    for offset in range(len(ref_aa) - window):
        ref_window = ref_aa[offset:offset + window]
        score = sum(1 for a, b in zip(query_start, ref_window) if a == b)
        if score > best_score:
            best_score = score
            best_offset = offset
    
    # Only use offset if we found a reasonable match (>60% identity)
    if best_score >= window * 0.6:
        return best_offset
    return 0


class MutationDetector:
    """Detects mutations by comparing sequences to reference strains."""
    
    def __init__(self, known_mutations: set[str] | None = None):
        self.reference = H3N2_HA_REFERENCE
        self.reference_aa = self.reference["sequence"]
        self.known_mutations = known_mutations or set()
    
    def detect_mutations(self, nucleotide_seq: str) -> list[Mutation]:
        """
        Detect mutations in a nucleotide sequence compared to reference.
        Handles partial sequences by finding alignment offset.
        """
        query_aa = translate_sequence(nucleotide_seq)
        
        if not query_aa or len(query_aa) < 50:
            return []
        
        # Find where query aligns to reference
        offset = find_alignment_offset(query_aa, self.reference_aa)
        
        mutations = []
        
        # Compare aligned regions
        max_pos = min(len(query_aa), len(self.reference_aa) - offset)
        
        for i in range(max_pos):
            ref_pos = offset + i  # Position in reference
            ref_aa = self.reference_aa[ref_pos] if ref_pos < len(self.reference_aa) else None
            var_aa = query_aa[i]
            
            if ref_aa and ref_aa != var_aa and var_aa != 'X':
                position = ref_pos + 1  # 1-indexed
                antigenic_site = get_antigenic_site(position)
                is_escape = is_escape_mutation(position, var_aa)
                
                mutation = Mutation(
                    position=position,
                    reference_aa=ref_aa,
                    variant_aa=var_aa,
                    antigenic_site=antigenic_site,
                    is_escape=is_escape,
                    is_novel=f"{ref_aa}{position}{var_aa}" not in self.known_mutations,
                )
                mutations.append(mutation)
        
        return mutations
    
    def analyze_sequence(self, sequence_data: dict) -> dict:
        """Analyze a sequence record and return mutation analysis."""
        raw_seq = sequence_data.get("raw_sequence", "")
        mutations = self.detect_mutations(raw_seq)
        
        return {
            "sequence_id": sequence_data.get("id"),
            "strain_name": sequence_data.get("strain_name"),
            "total_mutations": len(mutations),
            "antigenic_mutations": sum(1 for m in mutations if m.antigenic_site),
            "escape_mutations": sum(1 for m in mutations if m.is_escape),
            "novel_mutations": sum(1 for m in mutations if m.is_novel),
            "mutations": [m.to_dict() for m in mutations],
        }


def get_mutation_summary(mutations: list[Mutation]) -> str:
    """Generate a human-readable summary of mutations."""
    if not mutations:
        return "No mutations detected"
    
    antigenic = [m for m in mutations if m.antigenic_site]
    escape = [m for m in mutations if m.is_escape]
    
    parts = [f"{len(mutations)} total mutations"]
    
    if antigenic:
        parts.append(f"{len(antigenic)} at antigenic sites")
    
    if escape:
        parts.append(f"{len(escape)} known escape mutations")
    
    return ", ".join(parts)
