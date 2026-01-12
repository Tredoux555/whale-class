-- Daily Reports Table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id),
  teacher_name TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Quick mood/status
  mood TEXT CHECK (mood IN ('happy', 'okay', 'tired', 'upset', 'sick')),
  energy_level TEXT CHECK (energy_level IN ('high', 'medium', 'low')),
  
  -- Activities (checkboxes)
  activities JSONB DEFAULT '[]',
  
  -- Notes
  highlights TEXT,
  notes TEXT,
  
  -- Meals
  breakfast TEXT CHECK (breakfast IN ('all', 'most', 'some', 'none', 'na')),
  lunch TEXT CHECK (lunch IN ('all', 'most', 'some', 'none', 'na')),
  snack TEXT CHECK (snack IN ('all', 'most', 'some', 'none', 'na')),
  
  -- Nap
  nap_start TIME,
  nap_end TIME,
  
  -- Photo
  photo_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, report_date)
);

CREATE INDEX idx_daily_reports_child_date ON daily_reports(child_id, report_date DESC);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage reports" ON daily_reports FOR ALL USING (true);
