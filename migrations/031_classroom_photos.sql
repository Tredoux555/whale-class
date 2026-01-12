-- Photo Gallery Table for Montree
-- Migration 031: Photos System

CREATE TABLE IF NOT EXISTS classroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  teacher_name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Which children are in this photo (for tagging)
  child_ids UUID[] DEFAULT '{}',
  
  -- Activity type for organization
  activity_type TEXT, -- 'practical_life', 'art', 'outdoor', 'celebration', etc.
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_date ON classroom_photos(photo_date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_children ON classroom_photos USING GIN(child_ids);

ALTER TABLE classroom_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for classroom_photos" ON classroom_photos FOR ALL USING (true);
