-- Migration 063: Add category column to child_work_media
-- This fixes the error: "Could not find the 'category' column of 'child_work_media'"

-- Add category column for organizing media
ALTER TABLE child_work_media 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'work' 
CHECK (category IN ('work', 'life', 'shared'));

-- Add index for filtering by category
CREATE INDEX IF NOT EXISTS idx_child_work_media_category 
ON child_work_media(category);

-- Comment for clarity
COMMENT ON COLUMN child_work_media.category IS 'Media category: work (curriculum), life (daily moments), shared (general classroom)';
