-- =====================================================
-- MIGRATION 113: Student Tenure Tracking
-- Adds enrolled_at field to track how long students have been in the program
-- This helps Guru give more accurate advice (won't treat 6-month students as "new")
-- Date: February 3, 2026
-- =====================================================

-- Add enrolled_at column to montree_children
ALTER TABLE montree_children
ADD COLUMN IF NOT EXISTS enrolled_at DATE DEFAULT CURRENT_DATE;

-- Add comment explaining the field
COMMENT ON COLUMN montree_children.enrolled_at IS
  'Date when student joined this classroom. Used by Guru to understand student tenure.';

-- For existing students, we'll set enrolled_at based on their created_at
-- This gives a reasonable default rather than making them all look "new"
UPDATE montree_children
SET enrolled_at = DATE(created_at)
WHERE enrolled_at IS NULL OR enrolled_at = CURRENT_DATE;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 113: Student tenure tracking added successfully!';
  RAISE NOTICE '   - Added enrolled_at column to montree_children';
  RAISE NOTICE '   - Backfilled existing students with created_at date';
END $$;
