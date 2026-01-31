"""
Reference strains for influenza mutation analysis.

Contains reference sequences and antigenic site definitions for H3N2.
"""

# H3N2 Reference Strain: A/Darwin/6/2021 (WHO recommended vaccine strain)
# Full HA protein including signal peptide (566 AA total)
# Signal peptide: positions 1-16
# HA1 domain: positions 17-345 (H3 numbering starts at 17)
# HA2 domain: positions 346-566
H3N2_HA_REFERENCE = {
    "strain": "A/Darwin/6/2021",
    "subtype": "H3N2",
    "segment": "HA",
    "signal_peptide_length": 16,  # Skip first 16 AA for H3 numbering
    # Full HA amino acid sequence (GenBank: EPI_ISL_1563628)
    "sequence": (
        # Signal peptide (1-16)
        "MKTIIALSYILCLVFA"
        # HA1 domain (17-345, H3 numbering 1-329)
        "QKLPGNDNSTATLCLGHHAVPNGTIVKTITNDQIEVTNATELVQNSSIGEICDSPHQILDGENCTLIDALLGDPQCDGFQNKKWDLFVERSKAYSNCYPYDVPDYASLRSLVASSGTLEFNNESFNWTGVTQNGTSSACKRRSNNSFFSRLNWLTHLNFKYPALNVTMPNNEQFDKLYIWGVHHPGTDKDQISLYAQASGRITVSTKRSQQAVIPNIGSRPRVRDIPSRISIYWTIVKPGDILLINSTGNLIAPRGYFKIRSGKSSIMRSDAPIGKCNSECITPNGSIPNDKPFQNVNRITYGACPRYVKQNTLKLATGMRNVPEKQTRGIFGAIAGFIENGWEGMVDGWYGFRHQNSEGRGQAADLKSTQAAIDQINGKLNRLIGKTNEKFHQIEKEFSEVEGRIQDLEKYVEDTKIDLWSYNAELLVALENQHTIDLTDSEMNKLFEKTKKQLRENAEDMGNGCFKIYHKCDNACIGSIRNGTYDHDVYRDEALNNRFQIKGVELKSGYKDWILWISFAISCFLLCVALLGFIMWACQKGNIRCNICI"
    ),
}

# Antigenic sites for H3N2 HA (Burke & Smith definitions)
# Positions are in H3 numbering (after signal peptide, starting at 1)
# In our sequence, add 16 to get absolute position
SIGNAL_PEPTIDE_LENGTH = 16

ANTIGENIC_SITES = {
    "A": list(range(122 + SIGNAL_PEPTIDE_LENGTH, 147 + SIGNAL_PEPTIDE_LENGTH)),
    "B": list(range(155 + SIGNAL_PEPTIDE_LENGTH, 196 + SIGNAL_PEPTIDE_LENGTH)),
    "C": list(range(44 + SIGNAL_PEPTIDE_LENGTH, 52 + SIGNAL_PEPTIDE_LENGTH)) + list(range(271 + SIGNAL_PEPTIDE_LENGTH, 279 + SIGNAL_PEPTIDE_LENGTH)),
    "D": list(range(172 + SIGNAL_PEPTIDE_LENGTH, 177 + SIGNAL_PEPTIDE_LENGTH)) + list(range(201 + SIGNAL_PEPTIDE_LENGTH, 212 + SIGNAL_PEPTIDE_LENGTH)),
    "E": list(range(62 + SIGNAL_PEPTIDE_LENGTH, 64 + SIGNAL_PEPTIDE_LENGTH)) + list(range(78 + SIGNAL_PEPTIDE_LENGTH, 84 + SIGNAL_PEPTIDE_LENGTH)),
}

# Known escape mutations (H3 numbering, need to add 16 for absolute position)
KNOWN_ESCAPE_MUTATIONS = {
    145 + SIGNAL_PEPTIDE_LENGTH: ["K", "N"],  # K145N
    156 + SIGNAL_PEPTIDE_LENGTH: ["H", "Q"],  # H156Q
    158 + SIGNAL_PEPTIDE_LENGTH: ["N", "K"],  # N158K - egg adaptation
    189 + SIGNAL_PEPTIDE_LENGTH: ["N", "K"],  # N189K
    193 + SIGNAL_PEPTIDE_LENGTH: ["F", "S"],  # F193S
    194 + SIGNAL_PEPTIDE_LENGTH: ["L", "I"],  # L194I
}

# Codon table for translation
CODON_TABLE = {
    'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
    'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
    'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
    'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
    'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
}


def translate_sequence(nucleotide_seq: str) -> str:
    """Translate nucleotide sequence to amino acid sequence."""
    seq = nucleotide_seq.upper().replace(" ", "").replace("\n", "")
    
    amino_acids = []
    for i in range(0, len(seq) - 2, 3):
        codon = seq[i:i+3]
        aa = CODON_TABLE.get(codon, 'X')
        if aa == '*':
            break
        amino_acids.append(aa)
    
    return ''.join(amino_acids)


def get_antigenic_site(position: int) -> str | None:
    """Get the antigenic site for a given position (absolute, 1-indexed)."""
    for site, positions in ANTIGENIC_SITES.items():
        if position in positions:
            return site
    return None


def get_h3_position(absolute_position: int) -> int:
    """Convert absolute position to H3 numbering (subtract signal peptide)."""
    return absolute_position - SIGNAL_PEPTIDE_LENGTH


def is_escape_mutation(position: int, variant_aa: str) -> bool:
    """Check if a mutation is a known escape mutation."""
    if position in KNOWN_ESCAPE_MUTATIONS:
        return variant_aa in KNOWN_ESCAPE_MUTATIONS[position]
    return False
