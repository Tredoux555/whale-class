-- Migration: 100_add_nickname_column.sql
-- Date: 2026-02-02
-- Purpose: Add nickname column to montree_children (required by parent portal API)

-- Add nickname column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'montree_children' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN nickname TEXT;
  END IF;
END $$;

-- Comment explaining the column
COMMENT ON COLUMN montree_children.nickname IS 'Optional nickname/short name for the child (e.g., "Luke" for "Lucas")';
