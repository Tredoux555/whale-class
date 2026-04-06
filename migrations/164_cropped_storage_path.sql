-- Migration 164: Add cropped_storage_path to montree_media
-- When teachers crop photos (for parent reports or "Teach the AI"),
-- the cropped version is saved to a new path. The original storage_path
-- is preserved so parent reports can show either version.

ALTER TABLE montree_media
ADD COLUMN IF NOT EXISTS cropped_storage_path TEXT;

COMMENT ON COLUMN montree_media.cropped_storage_path IS 'Storage path for teacher-cropped version. Original stays in storage_path.';
