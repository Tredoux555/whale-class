-- Migration: 062_custom_works_cleanup.sql
-- Date: 2026-01-23
-- Purpose: Deactivate orphaned custom works and add performance indexes

-- ============================================
-- PART 1: DEACTIVATE CUSTOM WORKS
-- ============================================
-- All 48 custom works have zero assignments, making them orphaned data

UPDATE montree_school_curriculum_works
SET is_active = false
WHERE work_key LIKE 'custom_%';

UPDATE montree_classroom_curriculum_works
SET is_active = false
WHERE work_key LIKE 'custom_%';

-- ============================================
-- PART 2: PERFORMANCE INDEXES
-- ============================================

-- Partial index for active works only (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_school_works_active 
ON montree_school_curriculum_works(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_classroom_works_active 
ON montree_classroom_curriculum_works(is_active) WHERE is_active = true;

-- Composite index for common assignment queries
CREATE INDEX IF NOT EXISTS idx_assignments_child_status 
ON montree_child_assignments(child_id, status);

-- Index for works with parent descriptions
CREATE INDEX IF NOT EXISTS idx_curriculum_roadmap_parent_desc 
ON curriculum_roadmap(id) WHERE parent_description IS NOT NULL;

-- ============================================
-- RESULT: 
-- - 268 active works (all with parent descriptions)
-- - 48 inactive custom works
-- - 4 new indexes for query performance
-- ============================================
