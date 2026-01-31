-- FluSight-Asia Initial Schema
-- Version: 1.0.0
-- Applied: 2026-01-31

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- LOCATIONS TABLE
-- =============================================================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(3),
    region VARCHAR(50) DEFAULT 'Asia',
    subregion VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country, subregion)
);

CREATE INDEX idx_locations_country ON locations(country);
CREATE INDEX idx_locations_region ON locations(region);

-- =============================================================================
-- SEQUENCES TABLE
-- =============================================================================
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gisaid_id VARCHAR(50) UNIQUE,
    genbank_id VARCHAR(50),
    strain_name VARCHAR(255) NOT NULL,
    segment VARCHAR(10) DEFAULT 'HA',
    subtype VARCHAR(10) DEFAULT 'H3N2',
    raw_sequence TEXT NOT NULL,
    sequence_length INTEGER NOT NULL,
    amino_acid_sequence TEXT,
    collection_date DATE NOT NULL,
    location_id UUID REFERENCES locations(id),
    host VARCHAR(50) DEFAULT 'Human',
    clade VARCHAR(50),
    lineage VARCHAR(100),
    quality_score CHAR(1) CHECK (quality_score IN ('A', 'B', 'C', 'D')),
    ambiguity_percentage DECIMAL(5, 2),
    vaccine_strain_distance DECIMAL(8, 6),
    feature_vector JSONB,
    source VARCHAR(50) NOT NULL,
    ingestion_batch VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sequences_collection_date ON sequences(collection_date DESC);
CREATE INDEX idx_sequences_clade ON sequences(clade);
CREATE INDEX idx_sequences_location ON sequences(location_id);
CREATE INDEX idx_sequences_quality ON sequences(quality_score);
CREATE INDEX idx_sequences_strain_name ON sequences USING gin(strain_name gin_trgm_ops);
CREATE INDEX idx_sequences_gisaid ON sequences(gisaid_id) WHERE gisaid_id IS NOT NULL;

-- =============================================================================
-- MUTATIONS TABLE
-- =============================================================================
CREATE TABLE mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    reference_aa CHAR(1) NOT NULL,
    variant_aa CHAR(1) NOT NULL,
    mutation_notation VARCHAR(20) NOT NULL,
    is_synonymous BOOLEAN DEFAULT FALSE,
    antigenic_site CHAR(1) CHECK (antigenic_site IN ('A', 'B', 'C', 'D', 'E')),
    is_novel BOOLEAN DEFAULT FALSE,
    is_escape_mutation BOOLEAN DEFAULT FALSE,
    functional_impact VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sequence_id, position)
);

CREATE INDEX idx_mutations_sequence ON mutations(sequence_id);
CREATE INDEX idx_mutations_position ON mutations(position);
CREATE INDEX idx_mutations_antigenic_site ON mutations(antigenic_site) WHERE antigenic_site IS NOT NULL;
CREATE INDEX idx_mutations_novel ON mutations(is_novel) WHERE is_novel = TRUE;

-- =============================================================================
-- PREDICTIONS TABLE
-- =============================================================================
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_type VARCHAR(50) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    forecast_date DATE NOT NULL,
    horizon_weeks INTEGER,
    prediction_data JSONB NOT NULL,
    confidence_lower DECIMAL(5, 4),
    confidence_upper DECIMAL(5, 4),
    actual_outcome JSONB,
    accuracy_score DECIMAL(5, 4),
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_type ON predictions(prediction_type);
CREATE INDEX idx_predictions_date ON predictions(forecast_date DESC);
CREATE INDEX idx_predictions_generated ON predictions(generated_at DESC);
CREATE INDEX idx_predictions_model ON predictions(model_version);

-- =============================================================================
-- PIPELINE LOGS TABLE
-- =============================================================================
CREATE TABLE pipeline_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    job_id VARCHAR(100),
    batch_id VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    message TEXT,
    error_details JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_pipeline_logs_job ON pipeline_logs(job_name);
CREATE INDEX idx_pipeline_logs_status ON pipeline_logs(status);
CREATE INDEX idx_pipeline_logs_started ON pipeline_logs(started_at DESC);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sequences_updated_at 
    BEFORE UPDATE ON sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Public read access for sequences" ON sequences FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Public read access for mutations" ON mutations FOR SELECT USING (true);
CREATE POLICY "Public read access for predictions" ON predictions FOR SELECT USING (true);

CREATE POLICY "Service role full access locations" ON locations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access sequences" ON sequences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access mutations" ON mutations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access predictions" ON predictions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access pipeline_logs" ON pipeline_logs FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- SEED DATA: Asian Locations
-- =============================================================================
INSERT INTO locations (country, country_code, subregion, latitude, longitude) VALUES
    ('China', 'CHN', 'East China', 31.2304, 121.4737),
    ('China', 'CHN', 'South China', 23.1291, 113.2644),
    ('China', 'CHN', 'North China', 39.9042, 116.4074),
    ('Japan', 'JPN', NULL, 35.6762, 139.6503),
    ('South Korea', 'KOR', NULL, 37.5665, 126.9780),
    ('Taiwan', 'TWN', NULL, 25.0330, 121.5654),
    ('Singapore', 'SGP', NULL, 1.3521, 103.8198),
    ('Thailand', 'THA', NULL, 13.7563, 100.5018),
    ('Vietnam', 'VNM', NULL, 21.0278, 105.8342),
    ('Malaysia', 'MYS', NULL, 3.1390, 101.6869),
    ('Indonesia', 'IDN', NULL, -6.2088, 106.8456),
    ('Philippines', 'PHL', NULL, 14.5995, 120.9842),
    ('India', 'IND', NULL, 28.6139, 77.2090),
    ('Bangladesh', 'BGD', NULL, 23.8103, 90.4125),
    ('Hong Kong', 'HKG', NULL, 22.3193, 114.1694);
