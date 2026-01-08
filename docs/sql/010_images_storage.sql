-- DALL-E Image Generator Storage Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dmfncjjtsoxrnvcdnvjq/sql/new

-- Create images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (drop first if exists to avoid conflict)
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Allow service role uploads
DROP POLICY IF EXISTS "Service role upload for images" ON storage.objects;
CREATE POLICY "Service role upload for images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images');

-- Allow service role updates  
DROP POLICY IF EXISTS "Service role update for images" ON storage.objects;
CREATE POLICY "Service role update for images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'images');

-- Allow service role deletes
DROP POLICY IF EXISTS "Service role delete for images" ON storage.objects;
CREATE POLICY "Service role delete for images"
ON storage.objects FOR DELETE
USING (bucket_id = 'images');
