-- =====================================================
-- MIGRATION 119: Student Gender & Enhanced Profile Support
-- Adds gender column for student profiles
-- Supports the new bulk import and psychological profile system
-- Date: February 6, 2026
-- =====================================================

-- Add gender column to montree_children
ALTER TABLE montree_children
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add comment
COMMENT ON COLUMN montree_children.gender IS
  'Student gender (boy/girl). Part of developmental profile system.';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 119: Student gender & profile support added!';
  RAISE NOTICE '   - Added gender column to montree_children';
END $$;
