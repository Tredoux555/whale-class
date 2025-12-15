-- Migration: Create curriculum tracking tables
-- Run this in Supabase SQL Editor

-- 1. Curriculum Roadmap
CREATE TABLE IF NOT EXISTS curriculum_roadmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_order INTEGER NOT NULL UNIQUE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL,
  stage TEXT NOT NULL,
  age_min DECIMAL NOT NULL,
  age_max DECIMAL NOT NULL,
  prerequisite_work_ids INTEGER[] DEFAULT '{}',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_sequence 
  ON curriculum_roadmap(sequence_order);

CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_stage 
  ON curriculum_roadmap(stage);

CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_area 
  ON curriculum_roadmap(area);

-- 2. Activity to Curriculum Mapping
CREATE TABLE IF NOT EXISTS activity_to_curriculum_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_work_id UUID NOT NULL REFERENCES curriculum_roadmap(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  variant_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(curriculum_work_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_curriculum_mapping_work 
  ON activity_to_curriculum_mapping(curriculum_work_id);

CREATE INDEX IF NOT EXISTS idx_activity_curriculum_mapping_activity 
  ON activity_to_curriculum_mapping(activity_id);

-- 3. Child Curriculum Position
CREATE TABLE IF NOT EXISTS child_curriculum_position (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  current_curriculum_work_id UUID REFERENCES curriculum_roadmap(id),
  completed_work_ids UUID[] DEFAULT '{}',
  current_stage TEXT,
  started_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_curriculum_position_child_id 
  ON child_curriculum_position(child_id);

-- 4. Child Work Completion
CREATE TABLE IF NOT EXISTS child_work_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  curriculum_work_id UUID NOT NULL REFERENCES curriculum_roadmap(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  mastery_level INTEGER DEFAULT 1,
  notes TEXT,
  times_practiced INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id, curriculum_work_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_child_work_completion_child_id 
  ON child_work_completion(child_id);

CREATE INDEX IF NOT EXISTS idx_child_work_completion_work_id 
  ON child_work_completion(curriculum_work_id);

CREATE INDEX IF NOT EXISTS idx_child_work_completion_date 
  ON child_work_completion(completion_date);

