-- Story Uploads Storage Bucket Setup
-- Run this in Supabase SQL Editor
-- This script safely creates the bucket and policies (won't fail if they already exist)

-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-uploads', 'story-uploads', true)
ON CONFLICT (id) DO UPDATE 
SET public = true; -- Ensure it's public even if bucket exists

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to story uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create policies for authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-uploads');

-- Create policy for public access (view/download)
CREATE POLICY "Allow public access to story uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-uploads');

-- Optional: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'story-uploads')
WITH CHECK (bucket_id = 'story-uploads');

-- Optional: Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'story-uploads');

-- Verify the setup
SELECT 
  'Bucket created/verified' as status,
  id,
  name,
  public
FROM storage.buckets
WHERE id = 'story-uploads';

SELECT 
  'Policies created' as status,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%story-uploads%' OR policyname LIKE '%authenticated%' OR policyname LIKE '%public%';

