-- Migration 111: Fix Data Integrity Issues
-- Date: 2026-02-01
-- Issues Fixed:
--   1. Add UNIQUE constraint to prevent duplicate progress records
--   2. Clean up existing duplicate records (keep newest)
--   3. Standardize status values (normalize 'completed' to 'mastered')

-- ============================================
-- STEP 1: Clean up duplicate progress records
-- ============================================

-- First, identify and delete duplicates, keeping only the newest record for each (child_id, work_name)
-- This uses a CTE to find all duplicates and delete all but the one with latest updated_at

WITH duplicates AS (
  SELECT id,
         child_id,
         work_name,
         ROW_NUMBER() OVER (
           PARTITION BY child_id, work_name
           ORDER BY COALESCE(updated_at, presented_at, created_at) DESC
         ) as rn
  FROM montree_child_progress
)
DELETE FROM montree_child_progress
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================
-- STEP 2: Normalize status values
-- ============================================

-- Convert 'completed' to 'mastered'
UPDATE montree_child_progress
SET status = 'mastered'
WHERE status = 'completed';

-- Convert numeric status values to strings
UPDATE montree_child_progress
SET status = CASE
  WHEN status = '0' THEN 'not_started'
  WHEN status = '1' THEN 'presented'
  WHEN status = '2' THEN 'practicing'
  WHEN status = '3' THEN 'mastered'
  ELSE status
END
WHERE status IN ('0', '1', '2', '3');

-- ============================================
-- STEP 3: Add UNIQUE constraint
-- ============================================

-- Add unique constraint to prevent future duplicates
-- Using child_id + work_name (area is often null/inconsistent)
ALTER TABLE montree_child_progress
DROP CONSTRAINT IF EXISTS unique_child_work;

ALTER TABLE montree_child_progress
ADD CONSTRAINT unique_child_work UNIQUE (child_id, work_name);

-- ============================================
-- STEP 4: Add index for performance
-- ============================================

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_montree_progress_child_work
ON montree_child_progress(child_id, work_name);

CREATE INDEX IF NOT EXISTS idx_montree_progress_status
ON montree_child_progress(child_id, status);

-- ============================================
-- Verification queries (run manually to check)
-- ============================================

-- Check for remaining duplicates (should return 0)
-- SELECT child_id, work_name, COUNT(*) as cnt
-- FROM montree_child_progress
-- GROUP BY child_id, work_name
-- HAVING COUNT(*) > 1;

-- Check status values (should only be: not_started, presented, practicing, mastered)
-- SELECT DISTINCT status FROM montree_child_progress;
