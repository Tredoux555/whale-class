-- Migration 138: Add parent_visible flag to montree_media
-- Allows teachers to control which photos appear in parent reports.
-- Default TRUE = all photos visible (including snap photos).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'montree_media' AND column_name = 'parent_visible'
  ) THEN
    ALTER TABLE montree_media ADD COLUMN parent_visible BOOLEAN DEFAULT true;
    CREATE INDEX idx_montree_media_parent_visible ON montree_media(parent_visible, child_id);
    RAISE NOTICE '✅ Added parent_visible column + index to montree_media';
  ELSE
    RAISE NOTICE '✓ parent_visible already exists';
  END IF;
END $$;
