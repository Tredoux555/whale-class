-- Migration: 092_montree_media.sql
-- Purpose: Media storage for photos/videos
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: MEDIA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS montree_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  
  -- Media info
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size_bytes INTEGER,
  duration_seconds INTEGER,  -- For videos
  width INTEGER,
  height INTEGER,
  
  -- Metadata
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  work_id UUID,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Processing status
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  processing_status TEXT DEFAULT 'complete' CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_montree_media_school ON montree_media(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_child ON montree_media(child_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_captured ON montree_media(captured_at DESC);

-- ============================================
-- PART 2: MEDIA-CHILDREN JUNCTION (for group photos)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_media_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES montree_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_montree_media_children_media ON montree_media_children(media_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_children_child ON montree_media_children(child_id);

-- ============================================
-- PART 3: RLS POLICIES
-- ============================================

ALTER TABLE montree_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_media_children ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (service role)
CREATE POLICY "Allow all montree_media" ON montree_media FOR ALL USING (true);
CREATE POLICY "Allow all montree_media_children" ON montree_media_children FOR ALL USING (true);

-- ============================================
-- PART 4: STORAGE BUCKET
-- Run this separately if bucket doesn't exist
-- ============================================

-- Note: You need to create the storage bucket in Supabase Dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "New bucket"
-- 3. Name it: montree-media
-- 4. Make it PUBLIC (for easy image display)
-- 5. Set file size limit to 10MB
-- 
-- Or run this SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'montree-media',
  'montree-media',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Storage policies
CREATE POLICY "Public read montree-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'montree-media');

CREATE POLICY "Authenticated upload montree-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'montree-media');

CREATE POLICY "Authenticated delete montree-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'montree-media');

-- ============================================
-- VERIFICATION
-- ============================================

-- Check tables created:
-- SELECT * FROM montree_media LIMIT 5;
-- SELECT * FROM montree_media_children LIMIT 5;
