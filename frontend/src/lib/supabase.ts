import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

// Type definitions for database tables
export interface Location {
    id: string;
    country: string;
    country_code: string | null;
    region: string;
    subregion: string | null;
    latitude: number | null;
    longitude: number | null;
}

export interface Sequence {
    id: string;
    gisaid_id: string | null;
    genbank_id: string | null;
    strain_name: string;
    segment: string;
    subtype: string;
    raw_sequence: string;
    sequence_length: number;
    amino_acid_sequence: string | null;
    collection_date: string;
    location_id: string | null;
    host: string;
    clade: string | null;
    lineage: string | null;
    quality_score: 'A' | 'B' | 'C' | 'D' | null;
    vaccine_strain_distance: number | null;
    source: string;
    created_at: string;
}

export interface Mutation {
    id: string;
    sequence_id: string;
    position: number;
    reference_aa: string;
    variant_aa: string;
    mutation_notation: string;
    is_synonymous: boolean;
    antigenic_site: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    is_novel: boolean;
}

export interface Prediction {
    id: string;
    prediction_type: string;
    model_version: string;
    generated_at: string;
    forecast_date: string;
    horizon_weeks: number | null;
    prediction_data: Record<string, unknown>;
    confidence_lower: number | null;
    confidence_upper: number | null;
}
