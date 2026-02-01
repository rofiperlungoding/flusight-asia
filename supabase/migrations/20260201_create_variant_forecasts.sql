-- Create table for storing competitive variant forecasts
CREATE TABLE IF NOT EXISTS variant_forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    forecast_date DATE NOT NULL, -- The specific week being predicted
    week_iso TEXT, -- e.g. "2026-W05"
    region TEXT DEFAULT 'Asia',
    variant_distribution JSONB NOT NULL, -- { "Clade A": 0.4, "Clade B": 0.3 }
    model_version TEXT DEFAULT 'transformer_v1'
);

-- Enable RLS
ALTER TABLE variant_forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read
CREATE POLICY "Public can read variant forecasts" ON variant_forecasts FOR SELECT USING (true);

-- Policy: Service Role Write
CREATE POLICY "Service role can insert variant forecasts" ON variant_forecasts FOR INSERT WITH CHECK (true);
