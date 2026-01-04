-- migrations/020_english_progress.sql
-- English Progress Tracking for Parent Reports

-- Table to store each child's English journey progress
CREATE TABLE IF NOT EXISTS english_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Current stage in the Montessori English sequence
    current_stage TEXT NOT NULL DEFAULT 'oral' CHECK (current_stage IN (
        'oral', 'sound', 'sandpaper', 'moveable', 'pink', 'blue', 'green', 'grammar'
    )),
    
    -- Progress within current stage (0-100)
    stage_progress INTEGER NOT NULL DEFAULT 0 CHECK (stage_progress >= 0 AND stage_progress <= 100),
    
    -- Skills completed (stored as JSON array of skill names)
    skills_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Teacher notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One progress record per child
    UNIQUE(child_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_english_progress_child ON english_progress(child_id);

-- Enable RLS
ALTER TABLE english_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all progress
CREATE POLICY "Allow authenticated read" ON english_progress
    FOR SELECT TO authenticated USING (true);

-- Policy: Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated write" ON english_progress
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_english_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS english_progress_updated ON english_progress;
CREATE TRIGGER english_progress_updated
    BEFORE UPDATE ON english_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_english_progress_timestamp();

-- Comment for documentation
COMMENT ON TABLE english_progress IS 'Tracks each child''s progress through the Montessori English language sequence for parent reports';
