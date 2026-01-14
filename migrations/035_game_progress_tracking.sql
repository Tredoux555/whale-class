-- ============================================
-- MIGRATION 035: GAME PROGRESS TRACKING
-- Created: January 14, 2026
-- Purpose: Track student game sessions and progress
-- ============================================

-- ============================================
-- PART 1: GAME SESSIONS TABLE
-- Tracks individual play sessions
-- ============================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  items_completed INTEGER DEFAULT 0,
  items_total INTEGER DEFAULT 0,
  score INTEGER,
  level_reached INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_child ON game_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started ON game_sessions(started_at DESC);

-- ============================================
-- PART 2: STUDENT GAME PROGRESS TABLE
-- Aggregated progress per game per child
-- ============================================

CREATE TABLE IF NOT EXISTS student_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  highest_level INTEGER DEFAULT 0,
  items_mastered JSONB DEFAULT '[]'::jsonb,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_sgp_child ON student_game_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_sgp_game ON student_game_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_sgp_last_played ON student_game_progress(last_played_at DESC);

-- ============================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_game_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Anyone can insert game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Anyone can update game_sessions" ON game_sessions;

CREATE POLICY "Anyone can read game_sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game_sessions" ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game_sessions" ON game_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can read student_game_progress" ON student_game_progress;
DROP POLICY IF EXISTS "Anyone can insert student_game_progress" ON student_game_progress;
DROP POLICY IF EXISTS "Anyone can update student_game_progress" ON student_game_progress;

CREATE POLICY "Anyone can read student_game_progress" ON student_game_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can insert student_game_progress" ON student_game_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update student_game_progress" ON student_game_progress FOR UPDATE USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 035 complete: Game Progress Tracking';
  RAISE NOTICE '  - game_sessions table created';
  RAISE NOTICE '  - student_game_progress table created';
  RAISE NOTICE '  - RLS policies applied';
END $$;
