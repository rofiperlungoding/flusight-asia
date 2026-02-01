
-- Create table for storing geographic variant spread forecasts
CREATE TABLE IF NOT EXISTS geo_forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    forecast_date DATE NOT NULL,
    week_iso TEXT,
    country TEXT NOT NULL, -- Specific country e.g. "Vietnam"
    variant_distribution JSONB NOT NULL,
    model_version TEXT DEFAULT 'gnn_v1'
);

-- Enable RLS
ALTER TABLE geo_forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'geo_forecasts' AND policyname = 'Public can read geo forecasts'
    ) THEN
        CREATE POLICY "Public can read geo forecasts" ON geo_forecasts FOR SELECT USING (true);
    END IF;
END $$;

-- Policy: Service Role Write
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'geo_forecasts' AND policyname = 'Service role can insert geo forecasts'
    ) THEN
        CREATE POLICY "Service role can insert geo forecasts" ON geo_forecasts FOR INSERT WITH CHECK (true);
    END IF;
END $$;
