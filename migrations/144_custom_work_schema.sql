BEGIN;

-- Add missing columns to montree_classroom_curriculum_works
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- Partial unique index: prevents duplicate custom work names per classroom
-- Does NOT block standard works with same name as custom works
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_work_unique_name
  ON montree_classroom_curriculum_works (classroom_id, LOWER(name))
  WHERE is_custom = true;

-- Index for fast custom work lookups
CREATE INDEX IF NOT EXISTS idx_custom_works_lookup
  ON montree_classroom_curriculum_works (classroom_id, is_custom)
  WHERE is_custom = true;

COMMIT;
