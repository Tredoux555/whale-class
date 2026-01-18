-- Session 58: Clear student data for fresh testing
-- Run this in Supabase SQL Editor
-- Date: 2026-01-19

-- ============================================
-- STEP 1: Clear related data first (FK constraints)
-- ============================================

-- Clear report tokens
DELETE FROM montree_report_tokens;

-- Clear report media links  
DELETE FROM montree_report_media;

-- Clear weekly reports
DELETE FROM montree_weekly_reports;

-- Clear media-children links (group photos)
DELETE FROM montree_media_children;

-- Clear all media
DELETE FROM montree_media;

-- Clear child assignments
DELETE FROM montree_child_assignments;

-- ============================================
-- STEP 2: Clear children
-- ============================================

DELETE FROM montree_children;

-- ============================================
-- STEP 3: Verify clean state
-- ============================================

SELECT 'montree_children' as table_name, COUNT(*) as count FROM montree_children
UNION ALL
SELECT 'montree_media', COUNT(*) FROM montree_media
UNION ALL
SELECT 'montree_weekly_reports', COUNT(*) FROM montree_weekly_reports
UNION ALL
SELECT 'montree_report_tokens', COUNT(*) FROM montree_report_tokens;

-- Expected output: All counts = 0
-- ============================================
-- DONE: Ready for fresh student import
-- Go to /montree/admin/students and drop your document
-- ============================================
