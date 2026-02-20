-- ============================================================
-- MONTREE SYSTEM — COMPREHENSIVE FIX SCRIPT
-- Run on whale-class Supabase project (dmfncjjtsoxrnvcdnvjq)
-- Generated: 2026-02-08 from deep audit
-- ============================================================

-- ============================================================
-- BUG-1: Home curriculum seed fails — name is NOT NULL
-- The seedHomeCurriculum() function doesn't provide 'name',
-- only 'work_name'. Make name nullable so inserts succeed.
-- ============================================================
ALTER TABLE home_curriculum ALTER COLUMN name DROP NOT NULL;

-- ============================================================
-- BUG-10: Race condition — duplicate curriculum rows
-- Add unique constraint so concurrent seeds don't duplicate.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'home_curriculum_family_work_unique'
  ) THEN
    ALTER TABLE home_curriculum
      ADD CONSTRAINT home_curriculum_family_work_unique
      UNIQUE (family_id, work_name);
  END IF;
END $$;

-- ============================================================
-- BUG-3: Verify montree_children table exists
-- 39+ API routes reference this table. If it doesn't exist,
-- every student operation in Classroom will 500.
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER DEFAULT 4 CHECK (age >= 0 AND age <= 18),
  photo_url TEXT,
  notes TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  enrolled_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for montree_children
CREATE INDEX IF NOT EXISTS idx_montree_children_classroom
  ON montree_children(classroom_id);
CREATE INDEX IF NOT EXISTS idx_montree_children_active
  ON montree_children(classroom_id, is_active);

-- ============================================================
-- BUG-3 continued: Verify montree_child_progress table exists
-- Progress tracking for classroom students
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_child_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  work_name_chinese TEXT,
  area TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'presented', 'practicing', 'mastered')),
  presented_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_child_work'
  ) THEN
    ALTER TABLE montree_child_progress
      ADD CONSTRAINT unique_child_work
      UNIQUE (child_id, work_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_montree_progress_child
  ON montree_child_progress(child_id);

-- ============================================================
-- BUG-3 continued: Verify montree_child_focus_works table
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_child_focus_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  work_name TEXT NOT NULL,
  set_at TIMESTAMPTZ DEFAULT NOW(),
  set_by TEXT DEFAULT 'teacher',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, area)
);

-- ============================================================
-- BUG-3 continued: Verify montree_media and junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  work_id UUID,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  tags TEXT[],
  media_type TEXT DEFAULT 'photo',
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS montree_media_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES montree_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  UNIQUE (media_id, child_id)
);

-- ============================================================
-- BUG-2: Ensure montree_classroom_curriculum_works has all
-- columns that the POST handler tries to insert.
-- If any are missing, PostgREST returns an error → 500.
-- ============================================================
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_chinese TEXT;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS why_it_matters TEXT;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS direct_aims JSONB DEFAULT '[]'::jsonb;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS indirect_aims JSONB DEFAULT '[]'::jsonb;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS control_of_error TEXT;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS quick_guide TEXT;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS presentation_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS parent_description TEXT;

-- ============================================================
-- BUG-7: Enable RLS on home tables
-- Currently no RLS = any anon-key query can read/write all data
-- ============================================================
ALTER TABLE home_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your API routes use service role key)
DO $$
BEGIN
  -- home_families
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_home_families') THEN
    CREATE POLICY service_role_home_families ON home_families
      FOR ALL USING (current_setting('role') = 'service_role');
  END IF;
  -- home_children
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_home_children') THEN
    CREATE POLICY service_role_home_children ON home_children
      FOR ALL USING (current_setting('role') = 'service_role');
  END IF;
  -- home_curriculum
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_home_curriculum') THEN
    CREATE POLICY service_role_home_curriculum ON home_curriculum
      FOR ALL USING (current_setting('role') = 'service_role');
  END IF;
  -- home_progress
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_home_progress') THEN
    CREATE POLICY service_role_home_progress ON home_progress
      FOR ALL USING (current_setting('role') = 'service_role');
  END IF;
  -- home_sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_home_sessions') THEN
    CREATE POLICY service_role_home_sessions ON home_sessions
      FOR ALL USING (current_setting('role') = 'service_role');
  END IF;
END $$;

-- ============================================================
-- Reload PostgREST schema cache so new columns are visible
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DONE. After running this:
-- 1. Home signups should seed curriculum correctly
-- 2. Classroom "Add Work" should stop returning 500
-- 3. Student management should work (montree_children exists)
-- 4. Home tables are now protected by RLS
-- ============================================================
