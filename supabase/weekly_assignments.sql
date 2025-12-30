-- First check existing table structure
-- Run this to see what columns exist:

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weekly_assignments';

-- If table exists with wrong schema, drop and recreate:
-- DROP TABLE IF EXISTS weekly_assignments CASCADE;

-- Then create fresh:
CREATE TABLE IF NOT EXISTS weekly_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT 2025,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  work_id UUID REFERENCES curriculum_roadmap(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'practical_life',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_assignments_week 
ON weekly_assignments(year, week_number);

ALTER TABLE weekly_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON weekly_assignments
  FOR ALL USING (true) WITH CHECK (true);
