-- Migration 126: Montree Home — Homeschool parent support
-- Date: Feb 15, 2026
-- Purpose: Enable homeschool parents in the existing Montree system
--
-- Architecture: Homeschool parents use the SAME montree_teachers table with
-- role='homeschool_parent'. They get their own "school" (plan_type='homeschool'),
-- a classroom ('My Home'), and go through the exact same onboarding as teachers.
-- All tracking tables work unchanged — they only need child_id.
--
-- NO new tables needed. Only adapting montree_children for flexible querying.

-- ============================================
-- 1. Adapt montree_children for homeschool use
-- ============================================
-- Add school_id column for direct parent→children lookup.
-- This is useful for both homeschool AND classroom queries.
--
-- All tracking tables (montree_child_work_progress, montree_child_focus_works,
-- montree_child_extras, montree_behavioral_observations, montree_guru_interactions)
-- work unchanged — they only reference child_id.

-- ============================================
-- 0. Add role column to montree_teachers
-- ============================================
-- Homeschool parents are stored in montree_teachers with role='homeschool_parent'.
-- Existing teachers default to 'teacher'. The auth route now selects this column,
-- so it MUST exist before any login attempt.
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'teacher';

-- Add school_id for direct tenant-level queries
ALTER TABLE montree_children ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE;

-- Backfill school_id for existing children (look up via their classroom's school_id)
UPDATE montree_children c
SET school_id = cl.school_id
FROM montree_classrooms cl
WHERE c.classroom_id = cl.id
AND c.school_id IS NULL;

-- Index for school-level queries: SELECT * FROM montree_children WHERE school_id = ?
CREATE INDEX IF NOT EXISTS idx_children_school_id ON montree_children(school_id);
