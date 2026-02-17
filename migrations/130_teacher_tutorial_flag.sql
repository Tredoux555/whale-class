-- Migration 130: Teacher Tutorial Flag
-- Date: Feb 17, 2026
-- Purpose: Track first-time flow completion per teacher

ALTER TABLE montree_teachers
ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN montree_teachers.has_completed_tutorial IS
  'Set to true after teacher adds their first student. Controls welcome tutorial visibility.';
