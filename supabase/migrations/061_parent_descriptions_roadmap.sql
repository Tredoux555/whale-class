-- Migration: 061_parent_descriptions_roadmap.sql
-- Date: 2026-01-23
-- Purpose: Add parent description columns to curriculum_roadmap (legacy table used by parent dashboard)

-- ============================================
-- PART 1: ADD COLUMNS TO CURRICULUM_ROADMAP
-- ============================================

ALTER TABLE curriculum_roadmap 
ADD COLUMN IF NOT EXISTS parent_description TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS home_connection TEXT;

-- ============================================
-- PART 2: COPY DATA FROM MONTREE TABLES
-- ============================================

-- Copy parent descriptions where work IDs match
UPDATE curriculum_roadmap cr
SET 
  parent_description = mw.parent_description,
  why_it_matters = mw.why_it_matters,
  home_connection = mw.home_connection
FROM montree_school_curriculum_works mw
WHERE cr.id = mw.work_key
AND mw.parent_description IS NOT NULL;

-- ============================================
-- PART 3: ADD INDEX FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_parent_desc 
ON curriculum_roadmap(id) 
WHERE parent_description IS NOT NULL;

-- ============================================
-- DONE: 268 works now have parent descriptions
-- ============================================
