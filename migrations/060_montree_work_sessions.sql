-- Migration 060: Create montree_work_sessions table
-- For tracking every work interaction (supports repetition tracking)
-- Created: January 22, 2026

-- ============================================
-- WORK SESSIONS TABLE
-- Logs every interaction with a work (status change, photo capture, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core references
  child_id UUID NOT NULL,
  work_id TEXT NOT NULL,  -- References montree_classroom_curriculum_works.id
  assignment_id UUID,      -- Optional link to weekly assignment
  
  -- Session details
  session_type TEXT DEFAULT 'practice' CHECK (session_type IN ('presentation', 'practice', 'mastery', 'observation')),
  duration_minutes INTEGER,
  notes TEXT,
  
  -- Media captured during session
  media_urls JSONB DEFAULT '[]',
  
  -- Timestamps
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_work_sessions_child ON montree_work_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_work ON montree_work_sessions(work_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_observed ON montree_work_sessions(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_child_work ON montree_work_sessions(child_id, work_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_assignment ON montree_work_sessions(assignment_id);

-- Enable RLS
ALTER TABLE montree_work_sessions ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (teachers)
DROP POLICY IF EXISTS "Anyone can read work sessions" ON montree_work_sessions;
CREATE POLICY "Anyone can read work sessions" ON montree_work_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert work sessions" ON montree_work_sessions;
CREATE POLICY "Anyone can insert work sessions" ON montree_work_sessions
  FOR INSERT WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ montree_work_sessions table created!';
  RAISE NOTICE 'This table logs every work interaction for:';
  RAISE NOTICE '  - Session history tracking';
  RAISE NOTICE '  - Work repetition tracking';
  RAISE NOTICE '  - AI report generation';
  RAISE NOTICE '';
  RAISE NOTICE 'Used by:';
  RAISE NOTICE '  - /api/montree/sessions (POST/GET)';
  RAISE NOTICE '  - WorkNavigator status changes';
  RAISE NOTICE '  - WorkNavigator photo captures';
  RAISE NOTICE '  - ThisWeekTab interactions';
END $$;
