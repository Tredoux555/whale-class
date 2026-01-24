-- Story Shared Files System
-- For sharing documents (Word, Excel, PDF, etc.) with students
-- Run in Supabase SQL Editor

-- Table for tracking shared files
CREATE TABLE IF NOT EXISTS story_shared_files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  description TEXT,
  uploaded_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_story_shared_files_active ON story_shared_files(is_active, created_at DESC);
CREATE INDEX idx_story_shared_files_uploaded_by ON story_shared_files(uploaded_by);

-- Create storage bucket for shared files (public access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-files', 'story-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for story-files bucket
DROP POLICY IF EXISTS "story_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "story_files_select" ON storage.objects;
DROP POLICY IF EXISTS "story_files_delete" ON storage.objects;

CREATE POLICY "story_files_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-files');

CREATE POLICY "story_files_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-files');

CREATE POLICY "story_files_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'story-files');

COMMENT ON TABLE story_shared_files IS 'Documents shared with students via the story admin system';
