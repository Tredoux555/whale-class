-- Migration: 050_montree_foundation.sql
-- Date: 2026-01-18
-- Purpose: Clean Montree hierarchy - Schools → Classrooms → Curriculum → Children → Assignments

-- ============================================
-- PART 1: CLASSROOMS TABLE (links to montree_schools)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  teacher_id UUID,                    -- Optional link to auth.users
  age_group TEXT DEFAULT '3-6',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_montree_classrooms_school ON montree_classrooms(school_id);

-- ============================================
-- PART 2: SCHOOL-LEVEL CURRICULUM
-- ============================================

-- School curriculum areas (seeded from master, editable by school admin)
CREATE TABLE IF NOT EXISTS montree_school_curriculum_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL,             -- practical_life, sensorial, math, language, cultural
  name TEXT NOT NULL,
  name_chinese TEXT,
  icon TEXT,
  color TEXT,
  description TEXT,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, area_key)
);

CREATE INDEX IF NOT EXISTS idx_school_curriculum_areas_school ON montree_school_curriculum_areas(school_id);

-- School curriculum works (seeded from master, editable by school admin)
CREATE TABLE IF NOT EXISTS montree_school_curriculum_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES montree_school_curriculum_areas(id) ON DELETE CASCADE,
  
  -- Work identity
  work_key TEXT NOT NULL,             -- Original ID like pl_carrying_mat
  name TEXT NOT NULL,
  name_chinese TEXT,
  description TEXT,
  
  -- Montessori metadata
  age_range TEXT DEFAULT '3-6',
  materials JSONB DEFAULT '[]',
  direct_aims JSONB DEFAULT '[]',
  indirect_aims JSONB DEFAULT '[]',
  control_of_error TEXT,
  prerequisites JSONB DEFAULT '[]',
  video_search_terms JSONB DEFAULT '[]',
  levels JSONB DEFAULT '[]',          -- [{level, name, description, videoSearchTerms}]
  
  -- Ordering
  category_key TEXT,                  -- For grouping within area
  category_name TEXT,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- School customization
  school_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, work_key)
);

CREATE INDEX IF NOT EXISTS idx_school_curriculum_works_school ON montree_school_curriculum_works(school_id);
CREATE INDEX IF NOT EXISTS idx_school_curriculum_works_area ON montree_school_curriculum_works(area_id);

-- ============================================
-- PART 3: CLASSROOM-LEVEL CURRICULUM
-- ============================================

-- Classroom curriculum areas (seeded from school, fully editable by teachers)
CREATE TABLE IF NOT EXISTS montree_classroom_curriculum_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_chinese TEXT,
  icon TEXT,
  color TEXT,
  description TEXT,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(classroom_id, area_key)
);

CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_areas_classroom ON montree_classroom_curriculum_areas(classroom_id);

-- Classroom curriculum works (seeded from school, fully editable by teachers)
CREATE TABLE IF NOT EXISTS montree_classroom_curriculum_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES montree_classroom_curriculum_areas(id) ON DELETE CASCADE,
  
  -- Work identity
  work_key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_chinese TEXT,
  description TEXT,
  
  -- Montessori metadata
  age_range TEXT DEFAULT '3-6',
  materials JSONB DEFAULT '[]',
  direct_aims JSONB DEFAULT '[]',
  indirect_aims JSONB DEFAULT '[]',
  control_of_error TEXT,
  prerequisites JSONB DEFAULT '[]',
  video_search_terms JSONB DEFAULT '[]',
  levels JSONB DEFAULT '[]',
  
  -- Ordering
  category_key TEXT,
  category_name TEXT,
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Teacher customization
  teacher_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(classroom_id, work_key)
);

CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_works_classroom ON montree_classroom_curriculum_works(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_works_area ON montree_classroom_curriculum_works(area_id);

-- ============================================
-- PART 4: UPDATE CHILDREN TABLE
-- ============================================

-- Add classroom_id to montree_children if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'classroom_id'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN photo_url TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'settings'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_montree_children_classroom ON montree_children(classroom_id);

-- ============================================
-- PART 5: CHILD WORK ASSIGNMENTS
-- ============================================

-- Clean table for tracking child progress on classroom works
CREATE TABLE IF NOT EXISTS montree_child_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES montree_classroom_curriculum_works(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'not_started',  -- not_started, presented, practicing, mastered
  current_level INT DEFAULT 0,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  presented_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_child_assignments_child ON montree_child_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_child_assignments_work ON montree_child_assignments(work_id);
CREATE INDEX IF NOT EXISTS idx_child_assignments_status ON montree_child_assignments(status);

-- ============================================
-- PART 6: AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Create or replace function for updated_at
CREATE OR REPLACE FUNCTION montree_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all new tables
DROP TRIGGER IF EXISTS montree_classrooms_updated ON montree_classrooms;
CREATE TRIGGER montree_classrooms_updated
  BEFORE UPDATE ON montree_classrooms
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_school_areas_updated ON montree_school_curriculum_areas;
CREATE TRIGGER montree_school_areas_updated
  BEFORE UPDATE ON montree_school_curriculum_areas
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_school_works_updated ON montree_school_curriculum_works;
CREATE TRIGGER montree_school_works_updated
  BEFORE UPDATE ON montree_school_curriculum_works
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_classroom_areas_updated ON montree_classroom_curriculum_areas;
CREATE TRIGGER montree_classroom_areas_updated
  BEFORE UPDATE ON montree_classroom_curriculum_areas
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_classroom_works_updated ON montree_classroom_curriculum_works;
CREATE TRIGGER montree_classroom_works_updated
  BEFORE UPDATE ON montree_classroom_curriculum_works
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_assignments_updated ON montree_child_assignments;
CREATE TRIGGER montree_assignments_updated
  BEFORE UPDATE ON montree_child_assignments
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- DONE: Tables created for Montree hierarchy
-- ============================================
-- montree_schools (already existed)
-- montree_classrooms (NEW)
-- montree_school_curriculum_areas (NEW)
-- montree_school_curriculum_works (NEW)
-- montree_classroom_curriculum_areas (NEW)
-- montree_classroom_curriculum_works (NEW)
-- montree_children (UPDATED with classroom_id)
-- montree_child_assignments (NEW)
