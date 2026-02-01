-- Migration 099: Create montree_classroom_curriculum tables
-- These tables were created directly in Supabase but need migration for deployments
-- Date: 2026-01-31

-- Table: Curriculum Areas per Classroom
CREATE TABLE IF NOT EXISTS montree_classroom_curriculum_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL,  -- 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'
  name TEXT NOT NULL,
  name_chinese TEXT,
  icon TEXT NOT NULL DEFAULT '📚',
  color TEXT NOT NULL DEFAULT '#888888',
  sequence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(classroom_id, area_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mcca_classroom ON montree_classroom_curriculum_areas(classroom_id);
CREATE INDEX IF NOT EXISTS idx_mcca_area_key ON montree_classroom_curriculum_areas(area_key);

-- Table: Curriculum Works per Classroom
-- Each classroom gets its OWN copy of the curriculum with all parent/teacher descriptions
CREATE TABLE IF NOT EXISTS montree_classroom_curriculum_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES montree_classroom_curriculum_areas(id) ON DELETE CASCADE,
  work_key TEXT NOT NULL,  -- unique identifier like 'pl_pouring_water'
  name TEXT NOT NULL,
  name_chinese TEXT,
  description TEXT,  -- Simple description (from parent_explanation_simple)
  age_range TEXT DEFAULT '3-6',
  sequence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Teacher-facing data
  direct_aims JSONB DEFAULT '[]',      -- What the child directly learns
  indirect_aims JSONB DEFAULT '[]',    -- Secondary benefits
  materials JSONB DEFAULT '[]',        -- Required materials
  control_of_error TEXT,               -- How child self-corrects
  prerequisites JSONB DEFAULT '[]',    -- Readiness indicators
  quick_guide TEXT,                    -- Teacher's 10-second scan before presenting
  presentation_steps JSONB DEFAULT '[]', -- Detailed step-by-step: [{step, title, description, tip}]
  presentation_notes TEXT,             -- Additional teacher guidance

  -- Parent-facing data (for reports)
  parent_description TEXT,             -- Detailed explanation for parents
  why_it_matters TEXT,                 -- Why this work is important

  -- Video/media support
  video_search_terms TEXT,             -- YouTube search terms for demo videos

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table already exists (for existing deployments)
DO $$
BEGIN
  -- Teacher columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'quick_guide') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN quick_guide TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'direct_aims') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN direct_aims JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'indirect_aims') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN indirect_aims JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'control_of_error') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN control_of_error TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'prerequisites') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN prerequisites JSONB DEFAULT '[]';
  END IF;

  -- Parent columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'parent_description') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN parent_description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'why_it_matters') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN why_it_matters TEXT;
  END IF;

  -- Video column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'video_search_terms') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN video_search_terms TEXT;
  END IF;

  -- Detailed presentation columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'presentation_steps') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN presentation_steps JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'montree_classroom_curriculum_works' AND column_name = 'presentation_notes') THEN
    ALTER TABLE montree_classroom_curriculum_works ADD COLUMN presentation_notes TEXT;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mccw_classroom ON montree_classroom_curriculum_works(classroom_id);
CREATE INDEX IF NOT EXISTS idx_mccw_area ON montree_classroom_curriculum_works(area_id);
CREATE INDEX IF NOT EXISTS idx_mccw_sequence ON montree_classroom_curriculum_works(classroom_id, sequence);
CREATE INDEX IF NOT EXISTS idx_mccw_active ON montree_classroom_curriculum_works(classroom_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mccw_work_key ON montree_classroom_curriculum_works(work_key);

-- Enable RLS
ALTER TABLE montree_classroom_curriculum_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classroom_curriculum_works ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "Service role full access areas" ON montree_classroom_curriculum_areas FOR ALL USING (true);
CREATE POLICY "Service role full access works" ON montree_classroom_curriculum_works FOR ALL USING (true);

COMMENT ON TABLE montree_classroom_curriculum_areas IS 'Curriculum areas (Practical Life, Sensorial, etc.) per classroom';
COMMENT ON TABLE montree_classroom_curriculum_works IS 'Curriculum works/activities per classroom, linked to areas';
