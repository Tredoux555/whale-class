-- Migration 133: Add photo_url to curriculum works
-- Allows teachers to upload a photo for each work in their classroom curriculum

ALTER TABLE montree_classroom_curriculum_works
ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- Index not needed — photo_url is only read alongside the work row
