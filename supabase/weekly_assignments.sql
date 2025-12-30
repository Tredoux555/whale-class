-- Weekly Assignments Table (Simple Version)
-- Run this in Supabase SQL Editor

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

-- Index for fast lookups by week
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_week 
ON weekly_assignments(year, week_number);

-- Index for child lookups
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_child 
ON weekly_assignments(child_id);

-- Unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_assignments_unique 
ON weekly_assignments(week_number, year, child_id, work_name);

-- Enable RLS
ALTER TABLE weekly_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role full access" ON weekly_assignments
  FOR ALL USING (true) WITH CHECK (true);
