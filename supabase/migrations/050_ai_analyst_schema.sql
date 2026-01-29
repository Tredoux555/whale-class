-- MONTREE AI ANALYST - Database Migration
-- Session 115 - Phase 1
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CHILD SENSITIVE PERIODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS montree_child_sensitive_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  sensitive_period TEXT NOT NULL CHECK (sensitive_period IN (
    'order', 'language', 'movement', 'sensory', 'small_objects', 
    'social', 'writing', 'reading', 'math'
  )),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 100),
  status TEXT DEFAULT 'active' CHECK (status IN ('emerging', 'active', 'waning', 'passed')),
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, sensitive_period, status)
);

CREATE INDEX IF NOT EXISTS idx_sensitive_periods_child ON montree_child_sensitive_periods(child_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_periods_status ON montree_child_sensitive_periods(status);

-- ============================================
-- 2. WEEKLY ANALYSIS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS montree_weekly_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  area_distribution JSONB DEFAULT '{}',
  expected_distribution JSONB DEFAULT '{}',
  total_works_count INTEGER DEFAULT 0,
  avg_duration_minutes DECIMAL(5,2),
  expected_duration_minutes DECIMAL(5,2),
  concentration_score INTEGER CHECK (concentration_score BETWEEN 1 AND 100),
  repetition_patterns JSONB DEFAULT '[]',
  avoidance_patterns JSONB DEFAULT '[]',
  breakthrough_indicators JSONB DEFAULT '[]',
  active_sensitive_periods TEXT[] DEFAULT '{}',
  sensitive_period_evidence JSONB DEFAULT '{}',
  red_flags JSONB DEFAULT '[]',
  yellow_flags JSONB DEFAULT '[]',
  recommended_works JSONB DEFAULT '[]',
  teacher_summary TEXT,
  parent_summary TEXT,
  psychological_profile TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_model TEXT DEFAULT 'claude-sonnet',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_analysis_child ON montree_weekly_analysis(child_id);
CREATE INDEX IF NOT EXISTS idx_weekly_analysis_week ON montree_weekly_analysis(week_start);

-- ============================================
-- 3. CHILD FOCUS WORKS TABLE
-- One active work per area per child (for focus mode UI)
-- ============================================
CREATE TABLE IF NOT EXISTS montree_child_focus_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  
  -- Area and work
  area TEXT NOT NULL CHECK (area IN (
    'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'
  )),
  work_id UUID REFERENCES montree_classroom_curriculum_works(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  
  -- When it was set
  set_at TIMESTAMPTZ DEFAULT NOW(),
  set_by TEXT, -- teacher name or 'ai_recommended'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ONE work per area per child
  UNIQUE(child_id, area)
);

CREATE INDEX IF NOT EXISTS idx_focus_works_child ON montree_child_focus_works(child_id);

-- ============================================
-- 4. ADD COLUMNS TO montree_child_progress
-- For richer tracking data
-- ============================================
ALTER TABLE montree_child_progress 
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS repetition_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS concentration_quality TEXT CHECK (concentration_quality IN ('deep', 'moderate', 'distracted', 'abandoned')),
  ADD COLUMN IF NOT EXISTS self_corrected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS help_requested INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_cycle BOOLEAN DEFAULT true;

-- ============================================
-- 5. ADD COLUMNS TO montree_sessions (if exists)
-- For observation notes enhancement
-- ============================================
DO $$
BEGIN
  -- Check if table exists before altering
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'montree_sessions') THEN
    ALTER TABLE montree_sessions 
      ADD COLUMN IF NOT EXISTS emotional_state TEXT CHECK (emotional_state IN ('joyful', 'calm', 'frustrated', 'anxious', 'neutral')),
      ADD COLUMN IF NOT EXISTS social_interaction TEXT CHECK (social_interaction IN ('independent', 'parallel', 'collaborative', 'sought_help', 'helped_peer')),
      ADD COLUMN IF NOT EXISTS ai_extracted_keywords TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE montree_child_sensitive_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_weekly_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_child_focus_works ENABLE ROW LEVEL SECURITY;

-- Policies for sensitive_periods
CREATE POLICY "Teachers can view their classroom sensitive periods"
  ON montree_child_sensitive_periods FOR SELECT
  USING (true);

CREATE POLICY "Teachers can insert sensitive periods"
  ON montree_child_sensitive_periods FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Teachers can update sensitive periods"
  ON montree_child_sensitive_periods FOR UPDATE
  USING (true);

-- Policies for weekly_analysis
CREATE POLICY "Teachers can view their classroom analysis"
  ON montree_weekly_analysis FOR SELECT
  USING (true);

CREATE POLICY "System can insert analysis"
  ON montree_weekly_analysis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update analysis"
  ON montree_weekly_analysis FOR UPDATE
  USING (true);

-- Policies for focus_works
CREATE POLICY "Teachers can view focus works"
  ON montree_child_focus_works FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage focus works"
  ON montree_child_focus_works FOR ALL
  USING (true);

-- ============================================
-- DONE! Migration complete.
-- ============================================
