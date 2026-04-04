-- Migration 159: Add teacher_confirmed flag to montree_media
-- When a teacher marks a photo as "Correct" in the audit, this flag is set to true.
-- The audit page excludes teacher_confirmed photos — they never reappear as amber.

ALTER TABLE montree_media
ADD COLUMN IF NOT EXISTS teacher_confirmed boolean NOT NULL DEFAULT false;

-- Index for fast filtering in the audit query
CREATE INDEX IF NOT EXISTS idx_montree_media_teacher_confirmed
ON montree_media (teacher_confirmed) WHERE teacher_confirmed = false;
