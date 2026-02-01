"""Sequence processing, validation, and feature engineering."""

from .mutation_detector import MutationDetector, Mutation, get_mutation_summary
from .timeseries import TimeseriesProcessor

from .reference_strains import (
    H3N2_HA_REFERENCE,
    ANTIGENIC_SITES,
    translate_sequence,
    get_antigenic_site,
    is_escape_mutation,
)

__all__ = [
    "MutationDetector",
    "Mutation",
    "get_mutation_summary",
    "H3N2_HA_REFERENCE",
    "ANTIGENIC_SITES",
    "translate_sequence",
    "get_antigenic_site",
    "is_escape_mutation",
    "TimeseriesProcessor",
]

