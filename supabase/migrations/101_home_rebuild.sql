-- Migration: 101_home_rebuild.sql
-- Purpose: Rebuild Home system tables to match Montree schema
-- Status: Complete comprehensive schema transformation
-- Date: 2026-02-09
--
-- This migration transforms the weak Home schema into a proper
-- clone of the Montree schema. All changes are idempotent.

-- ============================================
-- PART 0: ENSURE home_families HAS REQUIRED COLUMNS
-- ============================================

DO $$
BEGIN
  -- Add settings column if missing (used by settings API)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_families' AND column_name = 'settings'
  ) THEN
    ALTER TABLE home_families ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;

  -- Add access_code if missing (used by auth)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_families' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE home_families ADD COLUMN access_code TEXT;
  END IF;

  -- Add updated_at if missing (used by settings API)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_families' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE home_families ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Add phone if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_families' AND column_name = 'phone'
  ) THEN
    ALTER TABLE home_families ADD COLUMN phone TEXT;
  END IF;

  -- Add address if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_families' AND column_name = 'address'
  ) THEN
    ALTER TABLE home_families ADD COLUMN address TEXT;
  END IF;

  -- Add timezone if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_families' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE home_families ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
END $$;

-- ============================================
-- PART 1: FIX home_children TABLE
-- ============================================

-- Make birth_date nullable and add missing columns
DO $$
BEGIN
  -- Make birth_date nullable (was NOT NULL) or add it if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE home_children ALTER COLUMN birth_date DROP NOT NULL;
  ELSE
    ALTER TABLE home_children ADD COLUMN birth_date DATE;
  END IF;

  -- Add notes column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'notes'
  ) THEN
    ALTER TABLE home_children ADD COLUMN notes TEXT;
  END IF;

  -- Add is_active column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE home_children ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add nickname column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE home_children ADD COLUMN nickname TEXT;
  END IF;

  -- Add photo_url column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE home_children ADD COLUMN photo_url TEXT;
  END IF;

  -- Add gender column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'gender'
  ) THEN
    ALTER TABLE home_children ADD COLUMN gender TEXT;
  END IF;

  -- Add enrollment_date column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'enrollment_date'
  ) THEN
    ALTER TABLE home_children ADD COLUMN enrollment_date DATE;
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'home_children' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE home_children ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create trigger for home_children updated_at
DROP TRIGGER IF EXISTS home_children_updated ON home_children;
CREATE TRIGGER home_children_updated
  BEFORE UPDATE ON home_children
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 2: EXPAND home_progress TO home_child_progress
-- ============================================

-- Rename table if needed (for clarity)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'home_progress'
  ) THEN
    -- Add all missing columns to home_progress
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'classroom_id'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN classroom_id UUID REFERENCES home_families(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'work_id'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN work_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'times_practiced'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN times_practiced INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'help_requested'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN help_requested BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'completed_cycle'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN completed_cycle BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'practicing_at'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN practicing_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'status_changed_at'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN status_changed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'last_session_date'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN last_session_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_progress' AND column_name = 'observation_notes'
    ) THEN
      ALTER TABLE home_progress ADD COLUMN observation_notes TEXT;
    END IF;
  END IF;
END $$;

-- Create trigger for home_progress updated_at
DROP TRIGGER IF EXISTS home_progress_updated ON home_progress;
CREATE TRIGGER home_progress_updated
  BEFORE UPDATE ON home_progress
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 3: EXPAND home_curriculum TO FULL RICH SCHEMA
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'home_curriculum'
  ) THEN
    -- Add all rich metadata columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'work_id'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN work_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'description'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'age_range'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN age_range TEXT DEFAULT '3-6';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'materials'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN materials JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'direct_aims'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN direct_aims JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'indirect_aims'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN indirect_aims JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'control_of_error'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN control_of_error TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'prerequisites'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN prerequisites JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'video_search_terms'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN video_search_terms JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'levels'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN levels JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'category_key'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN category_key TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'category_name'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN category_name TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'name_chinese'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN name_chinese TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'is_custom'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN is_custom BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'presentation_notes'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN presentation_notes TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'home_connection'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN home_connection TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_curriculum' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE home_curriculum ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
  END IF;
END $$;

-- Create trigger for home_curriculum updated_at
DROP TRIGGER IF EXISTS home_curriculum_updated ON home_curriculum;
CREATE TRIGGER home_curriculum_updated
  BEFORE UPDATE ON home_curriculum
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 4: CREATE home_observations TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS home_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  observation_type TEXT,  -- e.g., 'behavioral', 'academic', 'social'
  antecedent TEXT,        -- What happened before the behavior
  behavior TEXT NOT NULL, -- Description of the observed behavior
  consequence TEXT,       -- What happened after the behavior
  context TEXT,           -- Context in which behavior occurred
  area TEXT,              -- Curriculum area (practical_life, sensorial, math, language, cultural)
  work_name TEXT,         -- Name of the work being done
  notes TEXT,
  observed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_observations_family ON home_observations(family_id);
CREATE INDEX IF NOT EXISTS idx_home_observations_child ON home_observations(child_id);
CREATE INDEX IF NOT EXISTS idx_home_observations_observed ON home_observations(observed_at DESC);

DROP TRIGGER IF EXISTS home_observations_updated ON home_observations;
CREATE TRIGGER home_observations_updated
  BEFORE UPDATE ON home_observations
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 5: CREATE home_media TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS home_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES home_children(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_type TEXT,  -- e.g., 'image/jpeg', 'video/mp4'
  file_size INTEGER,
  caption TEXT,
  area TEXT,       -- Curriculum area
  work_name TEXT,  -- Name of the work documented
  tags JSONB DEFAULT '[]',
  media_type TEXT DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  storage_bucket TEXT DEFAULT 'home-media',
  original_filename TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,  -- Duration in seconds for videos
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_media_family ON home_media(family_id);
CREATE INDEX IF NOT EXISTS idx_home_media_child ON home_media(child_id);
CREATE INDEX IF NOT EXISTS idx_home_media_created ON home_media(created_at DESC);

DROP TRIGGER IF EXISTS home_media_updated ON home_media;
CREATE TRIGGER home_media_updated
  BEFORE UPDATE ON home_media
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 6: EXPAND home_sessions TO home_work_sessions
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'home_sessions'
  ) THEN
    -- Add missing columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'family_id'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN family_id UUID REFERENCES home_families(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'work_id'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN work_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'assignment_id'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN assignment_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'session_type'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN session_type TEXT DEFAULT 'observation';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'area'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN area TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'media_urls'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN media_urls JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'status'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN status TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'observed_at'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN observed_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'home_sessions' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE home_sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
  END IF;
END $$;

-- Create trigger for home_sessions updated_at
DROP TRIGGER IF EXISTS home_sessions_updated ON home_sessions;
CREATE TRIGGER home_sessions_updated
  BEFORE UPDATE ON home_sessions
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 7: CREATE home_weekly_reports TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS home_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  content JSONB DEFAULT '{}',  -- Rich report content as JSON
  areas_covered JSONB DEFAULT '[]',  -- Array of areas worked on this week
  works_progressed JSONB DEFAULT '[]',  -- Array of works that progressed
  ai_summary TEXT,  -- Generated summary from AI
  highlights JSONB DEFAULT '[]',  -- Key highlights of the week
  photos JSONB DEFAULT '[]',  -- Array of photo metadata
  stats JSONB DEFAULT '{}',  -- Statistics: {total_sessions, average_duration, etc}
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(family_id, child_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_home_weekly_reports_family ON home_weekly_reports(family_id);
CREATE INDEX IF NOT EXISTS idx_home_weekly_reports_child ON home_weekly_reports(child_id);
CREATE INDEX IF NOT EXISTS idx_home_weekly_reports_week ON home_weekly_reports(week_start DESC);

DROP TRIGGER IF EXISTS home_weekly_reports_updated ON home_weekly_reports;
CREATE TRIGGER home_weekly_reports_updated
  BEFORE UPDATE ON home_weekly_reports
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 8: CREATE home_guru_interactions TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS home_guru_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  child_id UUID REFERENCES home_children(id) ON DELETE CASCADE,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
  message_content TEXT NOT NULL,
  context JSONB DEFAULT '{}',  -- Context about the child, curriculum, etc
  tokens_used INTEGER,  -- For billing/tracking
  model TEXT,  -- Which AI model was used
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_guru_interactions_family ON home_guru_interactions(family_id);
CREATE INDEX IF NOT EXISTS idx_home_guru_interactions_child ON home_guru_interactions(child_id);
CREATE INDEX IF NOT EXISTS idx_home_guru_interactions_created ON home_guru_interactions(created_at DESC);

-- ============================================
-- PART 9: ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all home tables
ALTER TABLE home_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_guru_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies: Home system uses service role key (bypasses RLS) with
-- API-layer auth (family_id checked from session). These policies provide
-- defense-in-depth by validating family_id references a real family.
-- For true user-level RLS, migrate to Supabase Auth in the future.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'home_observations_family_access') THEN
    CREATE POLICY "home_observations_family_access" ON home_observations
      FOR ALL USING (EXISTS (SELECT 1 FROM home_families WHERE id = home_observations.family_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'home_media_family_access') THEN
    CREATE POLICY "home_media_family_access" ON home_media
      FOR ALL USING (EXISTS (SELECT 1 FROM home_families WHERE id = home_media.family_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'home_weekly_reports_family_access') THEN
    CREATE POLICY "home_weekly_reports_family_access" ON home_weekly_reports
      FOR ALL USING (EXISTS (SELECT 1 FROM home_families WHERE id = home_weekly_reports.family_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'home_guru_interactions_family_access') THEN
    CREATE POLICY "home_guru_interactions_family_access" ON home_guru_interactions
      FOR ALL USING (EXISTS (SELECT 1 FROM home_families WHERE id = home_guru_interactions.family_id));
  END IF;
END $$;

-- ============================================
-- PART 10: ADD STORAGE BUCKET FOR HOME MEDIA
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'home-media',
  'home-media',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- ============================================
-- PART 11: VERIFY MIGRATION SUCCESS
-- ============================================

-- Check all tables exist and have required columns
SELECT
  'home_children' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_children'
GROUP BY table_name
UNION ALL
SELECT
  'home_curriculum' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_curriculum'
GROUP BY table_name
UNION ALL
SELECT
  'home_progress' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_progress'
GROUP BY table_name
UNION ALL
SELECT
  'home_observations' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_observations'
GROUP BY table_name
UNION ALL
SELECT
  'home_media' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_media'
GROUP BY table_name
UNION ALL
SELECT
  'home_sessions' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_sessions'
GROUP BY table_name
UNION ALL
SELECT
  'home_weekly_reports' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_weekly_reports'
GROUP BY table_name
UNION ALL
SELECT
  'home_guru_interactions' as table_name,
  COUNT(*) as column_count,
  ARRAY_AGG(column_name) as columns
FROM information_schema.columns
WHERE table_name = 'home_guru_interactions'
GROUP BY table_name;
