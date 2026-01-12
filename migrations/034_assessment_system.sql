-- Migration: 034_assessment_system.sql
-- Purpose: Create assessment system tables for Pre-K/K English readiness testing
-- Created: January 12, 2026

-- =====================================================
-- ASSESSMENT SESSIONS TABLE
-- One row per test taken by a child
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id),
  child_name TEXT NOT NULL,
  classroom_id UUID,
  teacher_id UUID,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Overall Results
  total_score INTEGER DEFAULT 0,
  total_possible INTEGER DEFAULT 0,
  overall_percentage DECIMAL(5,2),
  overall_level TEXT CHECK (overall_level IN ('proficient', 'developing', 'emerging')),
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ASSESSMENT RESULTS TABLE  
-- Individual skill results within a session
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  
  -- Skill Info
  skill_code TEXT NOT NULL,  -- 'letter_recognition', 'beginning_sounds', etc.
  skill_name TEXT NOT NULL,  -- 'Letter Recognition', 'Beginning Sounds', etc.
  skill_order INTEGER,       -- Order in test sequence (1-7)
  
  -- Results
  correct_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  percentage DECIMAL(5,2),
  level TEXT CHECK (level IN ('proficient', 'developing', 'emerging')),
  
  -- Detailed Item Data (JSON array of each question)
  -- Format: [{item: 'letter_a', correct: true, attempts: 1, time_ms: 2300}, ...]
  items_data JSONB DEFAULT '[]'::jsonb,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sessions_child ON assessment_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_classroom ON assessment_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON assessment_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_results_session ON assessment_results(session_id);
CREATE INDEX IF NOT EXISTS idx_results_skill ON assessment_results(skill_code);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_assessment_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assessment_session_timestamp ON assessment_sessions;
CREATE TRIGGER trigger_update_assessment_session_timestamp
  BEFORE UPDATE ON assessment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_session_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (adjust based on your auth system)
CREATE POLICY "Allow all on assessment_sessions" ON assessment_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on assessment_results" ON assessment_results
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE assessment_sessions IS 'Assessment test sessions taken by children';
COMMENT ON TABLE assessment_results IS 'Individual skill results within an assessment session';
COMMENT ON COLUMN assessment_results.items_data IS 'JSON array: [{item, correct, attempts, time_ms}]';
COMMENT ON COLUMN assessment_sessions.overall_level IS 'proficient (≥80%), developing (50-79%), emerging (<50%)';
