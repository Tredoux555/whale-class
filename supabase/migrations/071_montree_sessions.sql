-- Migration: 071_montree_sessions.sql
-- Purpose: Create work sessions table for teacher observations
-- Run this in Supabase SQL Editor

-- ============================================
-- WORK SESSIONS TABLE
-- Stores observations, notes, photos for each child's work
-- Linked by child_id so ALL teachers can see/add
-- ============================================

CREATE TABLE IF NOT EXISTS montree_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_id UUID REFERENCES montessori_works(id) ON DELETE SET NULL,
  work_name TEXT,  -- Fallback if work_id not available
  area TEXT,       -- practical_life, sensorial, math, language, cultural
  session_type TEXT DEFAULT 'observation',  -- observation, practice, presentation, assessment
  status TEXT,     -- presented, practicing, completed
  notes TEXT,
  media_urls TEXT[] DEFAULT '{}',
  duration_minutes INTEGER,
  teacher_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  observed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_child ON montree_work_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_work ON montree_work_sessions(work_id);
CREATE INDEX IF NOT EXISTS idx_sessions_observed ON montree_work_sessions(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_area ON montree_work_sessions(area);

-- ============================================
-- RLS POLICIES (if needed)
-- For now, keep it simple - no RLS
-- ============================================

ALTER TABLE montree_work_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated operations for now
CREATE POLICY "Allow all session operations" ON montree_work_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'montree_work_sessions table created successfully' as status;
