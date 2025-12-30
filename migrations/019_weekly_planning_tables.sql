-- Migration 015: Weekly Planning System Tables
-- Run in Supabase SQL Editor
-- Date: December 30, 2025

-- ============================================
-- Weekly Plans (uploaded documents)
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  start_date DATE,
  end_date DATE,
  title TEXT,
  original_filename TEXT,
  translated_content JSONB, -- Stores the translated plan structure
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, year)
);

-- ============================================
-- Weekly Assignments (child → work for a week)
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  work_id TEXT REFERENCES curriculum_roadmap(id),
  work_name TEXT NOT NULL, -- Stored name in case work_id not matched
  area TEXT CHECK (area IN ('practical_life', 'sensorial', 'math', 'language', 'culture')),
  assigned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(weekly_plan_id, child_id, work_id)
);

-- ============================================
-- Work Progress (P → Pr → M tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS work_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  work_id TEXT REFERENCES curriculum_roadmap(id),
  work_name TEXT, -- Fallback if work_id not matched
  assignment_id UUID REFERENCES weekly_assignments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'presented' CHECK (status IN ('presented', 'practicing', 'mastered')),
  presented_date DATE,
  practicing_date DATE,
  mastered_date DATE,
  observation_notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, work_id)
);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_weekly_plans_week ON weekly_plans(week_number, year);
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_plan ON weekly_assignments(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_child ON weekly_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_work_progress_child ON work_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_work_progress_work ON work_progress(work_id);
CREATE INDEX IF NOT EXISTS idx_work_progress_status ON work_progress(status);

-- ============================================
-- Trigger to update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_weekly_plans_updated_at ON weekly_plans;
CREATE TRIGGER update_weekly_plans_updated_at
  BEFORE UPDATE ON weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_progress_updated_at ON work_progress;
CREATE TRIGGER update_work_progress_updated_at
  BEFORE UPDATE ON work_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies (enable row level security)
-- ============================================

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_progress ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all
CREATE POLICY "Allow read weekly_plans" ON weekly_plans FOR SELECT USING (true);
CREATE POLICY "Allow read weekly_assignments" ON weekly_assignments FOR SELECT USING (true);
CREATE POLICY "Allow read work_progress" ON work_progress FOR SELECT USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Allow insert weekly_plans" ON weekly_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update weekly_plans" ON weekly_plans FOR UPDATE USING (true);
CREATE POLICY "Allow insert weekly_assignments" ON weekly_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update weekly_assignments" ON weekly_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow insert work_progress" ON work_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update work_progress" ON work_progress FOR UPDATE USING (true);

-- ============================================
-- Helpful views
-- ============================================

CREATE OR REPLACE VIEW v_weekly_progress AS
SELECT 
  wp.id as plan_id,
  wp.week_number,
  wp.year,
  wp.title as plan_title,
  c.id as child_id,
  c.name as child_name,
  wa.work_name,
  wa.area,
  pr.status,
  pr.presented_date,
  pr.practicing_date,
  pr.mastered_date,
  cr.video_url,
  cr.video_channel
FROM weekly_plans wp
JOIN weekly_assignments wa ON wa.weekly_plan_id = wp.id
JOIN children c ON c.id = wa.child_id
LEFT JOIN work_progress pr ON pr.assignment_id = wa.id
LEFT JOIN curriculum_roadmap cr ON cr.id = wa.work_id
ORDER BY wp.week_number DESC, c.name, wa.area;

-- ============================================
-- Verify tables created
-- ============================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('weekly_plans', 'weekly_assignments', 'work_progress', 'work_name_translations')
ORDER BY table_name;
