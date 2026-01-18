-- SESSION 58: Clear montree_children for fresh testing
-- Run this in Supabase SQL Editor
-- Date: January 19, 2026

-- ============================================
-- STEP 1: Clear related data first (foreign key dependencies)
-- ============================================

-- Clear media-children links (group photos)
DELETE FROM montree_media_children;

-- Clear child assignments
DELETE FROM montree_child_assignments;

-- Clear report media links
DELETE FROM montree_report_media;

-- Clear reports
DELETE FROM montree_weekly_reports;

-- Clear report tokens
DELETE FROM montree_report_tokens;

-- Clear media
DELETE FROM montree_media;

-- ============================================
-- STEP 2: Clear children
-- ============================================

DELETE FROM montree_children;

-- ============================================
-- STEP 3: Also clear legacy children table sync
-- ============================================

-- This is needed because db.ts syncs montree_children → children
DELETE FROM children WHERE id IN (
  SELECT id FROM children 
  WHERE id NOT IN (SELECT id FROM montree_children)
);

-- ============================================
-- VERIFY: Check counts
-- ============================================

SELECT 'montree_children' as table_name, COUNT(*) as count FROM montree_children
UNION ALL
SELECT 'montree_media', COUNT(*) FROM montree_media
UNION ALL
SELECT 'montree_weekly_reports', COUNT(*) FROM montree_weekly_reports
UNION ALL
SELECT 'montree_report_tokens', COUNT(*) FROM montree_report_tokens;

-- Expected: All counts = 0
-- ============================================
-- DONE: Ready for fresh student import
-- ============================================
