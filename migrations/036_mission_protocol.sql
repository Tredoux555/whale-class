-- Migration 036: Mission Protocol System
-- Tracks daily check-ins, wins, energy patterns, and session anchors for Tredoux

-- ============================================
-- MISSION SESSIONS TABLE
-- Records each check-in (Mission Bridge)
-- ============================================
CREATE TABLE IF NOT EXISTS mission_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session details
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level VARCHAR(10) NOT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  project VARCHAR(50) NOT NULL,
  first_action TEXT NOT NULL,
  mission_connection TEXT NOT NULL,
  
  -- Session anchor (filled at end)
  session_anchor TEXT,
  anchor_completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MISSION WINS TABLE
-- Logs accomplishments
-- ============================================
CREATE TABLE IF NOT EXISTS mission_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  win_text TEXT NOT NULL,
  project VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MISSION STREAKS TABLE
-- Tracks current and longest streaks
-- ============================================
CREATE TABLE IF NOT EXISTS mission_streaks (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row table
  
  -- Session streaks
  current_session_streak INTEGER DEFAULT 0,
  longest_session_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  
  -- Total counts
  total_sessions INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  
  -- Energy pattern counts
  high_energy_count INTEGER DEFAULT 0,
  medium_energy_count INTEGER DEFAULT 0,
  low_energy_count INTEGER DEFAULT 0,
  
  -- Project session counts (JSON for flexibility)
  project_counts JSONB DEFAULT '{"whale": 0, "jeffy": 0, "sentinel": 0, "guardian": 0}'::jsonb,
  
  -- Current season
  current_season_name VARCHAR(100) DEFAULT 'Whale Launch Sprint',
  current_season_project VARCHAR(50) DEFAULT 'whale',
  current_season_started DATE DEFAULT CURRENT_DATE,
  current_season_target_end DATE,
  
  -- Warnings
  consecutive_low_energy INTEGER DEFAULT 0,
  missed_days INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize the single streaks row
INSERT INTO mission_streaks (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- WEEKLY CALIBRATIONS TABLE
-- Sunday reviews
-- ============================================
CREATE TABLE IF NOT EXISTS mission_weekly_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  week_start DATE NOT NULL,
  week_theme VARCHAR(200),
  primary_project VARCHAR(50),
  secondary_project VARCHAR(50),
  
  -- Day assignments (JSON: {"monday": "whale", "tuesday": "jeffy", ...})
  day_assignments JSONB DEFAULT '{}'::jsonb,
  
  -- Obstacles and wins
  anticipated_obstacles TEXT[],
  wins_this_week TEXT[],
  
  -- Mission reconnection note
  mission_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_mission_sessions_date ON mission_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_mission_sessions_project ON mission_sessions(project);
CREATE INDEX IF NOT EXISTS idx_mission_wins_created ON mission_wins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mission_calibrations_week ON mission_weekly_calibrations(week_start DESC);

-- ============================================
-- HELPER FUNCTION: Update streaks after session
-- ============================================
CREATE OR REPLACE FUNCTION update_mission_streaks()
RETURNS TRIGGER AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER;
  longest_streak INTEGER;
  proj_counts JSONB;
BEGIN
  -- Get current values
  SELECT last_session_date, current_session_streak, longest_session_streak, project_counts
  INTO last_date, current_streak, longest_streak, proj_counts
  FROM mission_streaks WHERE id = 1;
  
  -- Update streak logic
  IF last_date IS NULL OR NEW.session_date = last_date THEN
    -- Same day or first ever, keep current streak
    current_streak := COALESCE(current_streak, 0);
  ELSIF NEW.session_date = last_date + INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    current_streak := current_streak + 1;
  ELSIF NEW.session_date > last_date + INTERVAL '1 day' THEN
    -- Missed day(s), reset streak
    current_streak := 1;
  END IF;
  
  -- Update longest if current exceeds
  IF current_streak > longest_streak THEN
    longest_streak := current_streak;
  END IF;
  
  -- Update project count
  proj_counts := jsonb_set(
    proj_counts,
    ARRAY[NEW.project],
    to_jsonb(COALESCE((proj_counts->>NEW.project)::integer, 0) + 1)
  );
  
  -- Update the streaks row
  UPDATE mission_streaks SET
    last_session_date = NEW.session_date,
    current_session_streak = current_streak,
    longest_session_streak = longest_streak,
    total_sessions = total_sessions + 1,
    high_energy_count = high_energy_count + CASE WHEN NEW.energy_level = 'high' THEN 1 ELSE 0 END,
    medium_energy_count = medium_energy_count + CASE WHEN NEW.energy_level = 'medium' THEN 1 ELSE 0 END,
    low_energy_count = low_energy_count + CASE WHEN NEW.energy_level = 'low' THEN 1 ELSE 0 END,
    consecutive_low_energy = CASE 
      WHEN NEW.energy_level = 'low' THEN consecutive_low_energy + 1 
      ELSE 0 
    END,
    project_counts = proj_counts,
    updated_at = NOW()
  WHERE id = 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_mission_streaks ON mission_sessions;
CREATE TRIGGER trigger_update_mission_streaks
  AFTER INSERT ON mission_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_streaks();

-- ============================================
-- HELPER FUNCTION: Update wins count
-- ============================================
CREATE OR REPLACE FUNCTION update_wins_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mission_streaks SET
    total_wins = total_wins + 1,
    updated_at = NOW()
  WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wins
DROP TRIGGER IF EXISTS trigger_update_wins_count ON mission_wins;
CREATE TRIGGER trigger_update_wins_count
  AFTER INSERT ON mission_wins
  FOR EACH ROW
  EXECUTE FUNCTION update_wins_count();
