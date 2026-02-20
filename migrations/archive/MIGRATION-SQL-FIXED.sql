-- Migration 011: Update curriculum_roadmap to v2 structure
-- FIXED VERSION - Handles existing schema properly
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Backup existing data
-- ============================================
CREATE TABLE IF NOT EXISTS curriculum_roadmap_backup AS 
SELECT * FROM curriculum_roadmap;

CREATE TABLE IF NOT EXISTS child_curriculum_position_backup AS 
SELECT * FROM child_curriculum_position;

CREATE TABLE IF NOT EXISTS child_work_completion_backup AS 
SELECT * FROM child_work_completion;

-- ============================================
-- STEP 2: Drop dependent constraints temporarily
-- ============================================
ALTER TABLE child_curriculum_position 
DROP CONSTRAINT IF EXISTS child_curriculum_position_current_work_id_fkey;

ALTER TABLE child_curriculum_position 
DROP CONSTRAINT IF EXISTS child_curriculum_position_current_curriculum_work_id_fkey;

ALTER TABLE child_work_completion 
DROP CONSTRAINT IF EXISTS child_work_completion_work_id_fkey;

ALTER TABLE child_work_completion 
DROP CONSTRAINT IF EXISTS child_work_completion_curriculum_work_id_fkey;

ALTER TABLE curriculum_videos 
DROP CONSTRAINT IF EXISTS curriculum_videos_work_id_fkey;

ALTER TABLE activity_to_curriculum_mapping 
DROP CONSTRAINT IF EXISTS activity_to_curriculum_mapping_curriculum_work_id_fkey;

-- ============================================
-- STEP 3: Create new curriculum tables
-- ============================================

-- Areas table (5 areas)
CREATE TABLE IF NOT EXISTS curriculum_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS curriculum_categories (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES curriculum_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_categories_area ON curriculum_categories(area_id);

-- Update curriculum_roadmap structure (works table)
-- Change id column from UUID to TEXT (required for new curriculum system)
DO $$ 
BEGIN
  -- Check if id is UUID and needs to be changed to TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    -- Add temporary column for new TEXT id
    ALTER TABLE curriculum_roadmap ADD COLUMN id_text TEXT;
    -- Copy UUID values as text for existing records
    UPDATE curriculum_roadmap SET id_text = id::TEXT;
    -- Drop the old primary key constraint
    ALTER TABLE curriculum_roadmap DROP CONSTRAINT IF EXISTS curriculum_roadmap_pkey;
    -- Drop the old id column
    ALTER TABLE curriculum_roadmap DROP COLUMN id;
    -- Rename id_text to id
    ALTER TABLE curriculum_roadmap RENAME COLUMN id_text TO id;
    -- Make it primary key
    ALTER TABLE curriculum_roadmap ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Now add new columns
DO $$ 
BEGIN
  -- Add area_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'area_id') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN area_id TEXT;
  END IF;
  
  -- Add category_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'category_id') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN category_id TEXT;
  END IF;
  
  -- Add age_range column (TEXT) - NEW column for v2
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'age_range') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN age_range TEXT;
  END IF;
  
  -- Add name column (if work_name exists, we'll keep both for compatibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'name') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN name TEXT;
  END IF;
  
  -- Copy work_name to name if name is null
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'work_name') THEN
    UPDATE curriculum_roadmap SET name = work_name WHERE name IS NULL AND work_name IS NOT NULL;
  END IF;
  
  -- Add materials column (JSONB array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'materials') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN materials JSONB DEFAULT '[]';
  END IF;
  
  -- Add direct_aims column (JSONB array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'direct_aims') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN direct_aims JSONB DEFAULT '[]';
  END IF;
  
  -- Add indirect_aims column (JSONB array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'indirect_aims') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN indirect_aims JSONB DEFAULT '[]';
  END IF;
  
  -- Add control_of_error column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'control_of_error') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN control_of_error TEXT;
  END IF;
  
  -- Add chinese_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'chinese_name') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN chinese_name TEXT;
  END IF;
  
  -- Add image_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'image_url') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN image_url TEXT;
  END IF;
  
  -- Add levels column (JSONB array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'levels') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN levels JSONB DEFAULT '[]';
  END IF;
  
  -- Add prerequisites column (if it doesn't exist as JSONB array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'prerequisites') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN prerequisites JSONB DEFAULT '[]';
  END IF;
  
  -- Add sequence column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'sequence') THEN
    ALTER TABLE curriculum_roadmap ADD COLUMN sequence INTEGER;
    -- Copy sequence_order to sequence if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'curriculum_roadmap' AND column_name = 'sequence_order') THEN
      UPDATE curriculum_roadmap SET sequence = sequence_order;
    END IF;
  END IF;
END $$;

-- Create indexes (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'area_id') THEN
    CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_area ON curriculum_roadmap(area_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_category ON curriculum_roadmap(category_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curriculum_roadmap' AND column_name = 'age_range') THEN
    CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_age ON curriculum_roadmap(age_range);
  END IF;
END $$;

-- Update child_curriculum_position to use TEXT work_id
DO $$
BEGIN
  -- Add current_work_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_curriculum_position' AND column_name = 'current_work_id') THEN
    ALTER TABLE child_curriculum_position ADD COLUMN current_work_id TEXT;
  END IF;
END $$;

-- ============================================
-- STEP 4: Create work_levels table for detailed level tracking
-- ============================================
CREATE TABLE IF NOT EXISTS curriculum_work_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id TEXT NOT NULL,
  level_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  video_search_terms JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_id, level_number)
);

CREATE INDEX IF NOT EXISTS idx_work_levels_work ON curriculum_work_levels(work_id);

-- ============================================
-- STEP 5: Update child_work_completion for level tracking
-- ============================================
DO $$ 
BEGIN
  -- Add work_id column if it doesn't exist (for compatibility with curriculum_work_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'work_id') THEN
    ALTER TABLE child_work_completion ADD COLUMN work_id TEXT;
    -- Copy curriculum_work_id to work_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'child_work_completion' AND column_name = 'curriculum_work_id') THEN
      UPDATE child_work_completion SET work_id = curriculum_work_id::TEXT;
    END IF;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'status') THEN
    ALTER TABLE child_work_completion ADD COLUMN status TEXT DEFAULT 'in_progress';
  END IF;
  
  -- Add current_level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'current_level') THEN
    ALTER TABLE child_work_completion ADD COLUMN current_level INTEGER DEFAULT 1;
  END IF;
  
  -- Add max_level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'max_level') THEN
    ALTER TABLE child_work_completion ADD COLUMN max_level INTEGER DEFAULT 1;
  END IF;
  
  -- Add level_completions column (JSONB to track each level)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'level_completions') THEN
    ALTER TABLE child_work_completion ADD COLUMN level_completions JSONB DEFAULT '{}';
  END IF;
  
  -- Add started_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'started_at') THEN
    ALTER TABLE child_work_completion ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  
  -- Add completed_at column if it doesn't exist (may exist as completion_date)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'completed_at') THEN
    ALTER TABLE child_work_completion ADD COLUMN completed_at TIMESTAMPTZ;
    -- Copy completion_date to completed_at if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'child_work_completion' AND column_name = 'completion_date') THEN
      UPDATE child_work_completion SET completed_at = completion_date::TIMESTAMPTZ WHERE completion_date IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 6: Create progress summary view
-- ============================================
-- Note: This view will be populated after running the seed script
DROP VIEW IF EXISTS child_curriculum_progress;

-- Create view - handle both work_id (new) and curriculum_work_id (old) columns
DO $$
BEGIN
  -- Check if curriculum_work_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_completion' AND column_name = 'curriculum_work_id'
  ) THEN
    -- View with both work_id and curriculum_work_id support
    EXECUTE '
    CREATE VIEW child_curriculum_progress AS
    SELECT 
      c.id AS child_id,
      c.name AS child_name,
      ca.id AS area_id,
      ca.name AS area_name,
      ca.color AS area_color,
      ca.icon AS area_icon,
      COUNT(DISTINCT cr.id) AS total_works,
      COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = ''completed'') AS completed_works,
      COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = ''in_progress'') AS in_progress_works,
      ROUND(
        COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = ''completed'')::NUMERIC / 
        NULLIF(COUNT(DISTINCT cr.id), 0) * 100, 
        1
      ) AS completion_percentage
    FROM children c
    CROSS JOIN curriculum_areas ca
    LEFT JOIN curriculum_roadmap cr ON cr.area_id = ca.id
    LEFT JOIN child_work_completion cwc ON 
      cwc.child_id = c.id
      AND (
        cwc.work_id = cr.id::TEXT 
        OR (cwc.work_id IS NULL AND cwc.curriculum_work_id::TEXT = cr.id::TEXT)
      )
    GROUP BY c.id, c.name, ca.id, ca.name, ca.color, ca.icon
    ORDER BY c.name, ca.sequence';
  ELSE
    -- View with only work_id support
    EXECUTE '
    CREATE VIEW child_curriculum_progress AS
    SELECT 
      c.id AS child_id,
      c.name AS child_name,
      ca.id AS area_id,
      ca.name AS area_name,
      ca.color AS area_color,
      ca.icon AS area_icon,
      COUNT(DISTINCT cr.id) AS total_works,
      COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = ''completed'') AS completed_works,
      COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = ''in_progress'') AS in_progress_works,
      ROUND(
        COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = ''completed'')::NUMERIC / 
        NULLIF(COUNT(DISTINCT cr.id), 0) * 100, 
        1
      ) AS completion_percentage
    FROM children c
    CROSS JOIN curriculum_areas ca
    LEFT JOIN curriculum_roadmap cr ON cr.area_id = ca.id
    LEFT JOIN child_work_completion cwc ON 
      cwc.child_id = c.id
      AND cwc.work_id = cr.id::TEXT
    GROUP BY c.id, c.name, ca.id, ca.name, ca.color, ca.icon
    ORDER BY c.name, ca.sequence';
  END IF;
END $$;

-- ============================================
-- STEP 7: Re-add foreign key constraints
-- ============================================
-- Note: Run these after seeding the new curriculum data

-- ALTER TABLE curriculum_roadmap 
-- ADD CONSTRAINT curriculum_roadmap_area_fkey 
-- FOREIGN KEY (area_id) REFERENCES curriculum_areas(id);

-- ALTER TABLE curriculum_roadmap 
-- ADD CONSTRAINT curriculum_roadmap_category_fkey 
-- FOREIGN KEY (category_id) REFERENCES curriculum_categories(id);

-- ============================================
-- STEP 8: RLS Policies
-- ============================================
ALTER TABLE curriculum_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_work_levels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read curriculum areas" ON curriculum_areas;
DROP POLICY IF EXISTS "Anyone can read curriculum categories" ON curriculum_categories;
DROP POLICY IF EXISTS "Anyone can read work levels" ON curriculum_work_levels;
DROP POLICY IF EXISTS "Admins can manage curriculum areas" ON curriculum_areas;
DROP POLICY IF EXISTS "Admins can manage curriculum categories" ON curriculum_categories;
DROP POLICY IF EXISTS "Admins can manage work levels" ON curriculum_work_levels;

-- Public read access for curriculum structure
CREATE POLICY "Anyone can read curriculum areas" ON curriculum_areas
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read curriculum categories" ON curriculum_categories
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read work levels" ON curriculum_work_levels
  FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admins can manage curriculum areas" ON curriculum_areas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can manage curriculum categories" ON curriculum_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can manage work levels" ON curriculum_work_levels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin'))
  );

