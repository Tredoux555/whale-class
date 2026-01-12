-- Daily Reports Table for Montree
-- Run in Supabase SQL Editor
-- Migration 030: Daily Reports System

-- Daily reports from teachers to parents
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Quick status
  mood TEXT CHECK (mood IN ('happy', 'calm', 'tired', 'fussy', 'sick')),
  
  -- Activities
  activities_done TEXT[], -- array of activity names
  activities_notes TEXT,
  
  -- Care details (for younger children)
  meals_eaten TEXT CHECK (meals_eaten IN ('all', 'most', 'some', 'little', 'none')),
  nap_duration INTEGER, -- minutes
  
  -- Teacher notes
  highlights TEXT, -- what went well
  notes TEXT, -- general notes for parent
  
  -- Photo
  photo_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One report per child per day
  UNIQUE(child_id, report_date)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_daily_reports_child_date ON daily_reports(child_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);

-- RLS policies
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Everyone can read/write for now (simplify for MVP)
CREATE POLICY "Allow all for daily_reports" ON daily_reports FOR ALL USING (true);
