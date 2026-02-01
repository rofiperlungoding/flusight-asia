CREATE TABLE IF NOT EXISTS forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    region TEXT NOT NULL DEFAULT 'Asia',
    forecast_date DATE NOT NULL,
    risk_score FLOAT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    predicted_variants JSONB,
    confidence_lower FLOAT,
    confidence_upper FLOAT,
    model_version TEXT DEFAULT 'v1.0'
);

-- Enable RLS
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read
CREATE POLICY "Public can read forecasts" ON forecasts FOR SELECT USING (true);

-- Policy: Service Role Write
CREATE POLICY "Service role can insert forecasts" ON forecasts FOR INSERT WITH CHECK (true);
