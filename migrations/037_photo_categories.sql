-- Migration: Photo Categories + Shared Photos
-- Adds category to media and enables shared photos

-- Add category column to child_work_media
ALTER TABLE child_work_media 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'work' 
CHECK (category IN ('work', 'life', 'shared'));

-- Add index for category queries
CREATE INDEX IF NOT EXISTS idx_child_work_media_category 
ON child_work_media(category);

-- Table for shared photos (master list)
CREATE TABLE IF NOT EXISTS shared_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  title TEXT,
  description TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- When a shared photo is added, we create entries for all active children
-- This function handles that
CREATE OR REPLACE FUNCTION distribute_shared_photo()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a copy for each active child
  INSERT INTO child_work_media (
    child_id,
    work_name,
    media_type,
    media_url,
    thumbnail_url,
    category,
    notes,
    taken_at
  )
  SELECT 
    c.id,
    COALESCE(NEW.title, 'Group Photo'),
    NEW.media_type,
    NEW.media_url,
    NEW.thumbnail_url,
    'shared',
    NEW.description,
    NEW.taken_at
  FROM children c
  WHERE c.active_status = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-distribute shared photos
DROP TRIGGER IF EXISTS trigger_distribute_shared_photo ON shared_photos;
CREATE TRIGGER trigger_distribute_shared_photo
  AFTER INSERT ON shared_photos
  FOR EACH ROW
  EXECUTE FUNCTION distribute_shared_photo();

-- RLS
ALTER TABLE shared_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on shared_photos" ON shared_photos FOR ALL USING (true);

-- Update existing media to have 'work' category
UPDATE child_work_media SET category = 'work' WHERE category IS NULL;
