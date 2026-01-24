-- Migration: Add document support to montree_media
-- Session 64: Document upload feature
-- FIXED: media_type is TEXT with CHECK constraint, not ENUM

-- 1. Drop old check constraint and add new one with 'document'
-- First, find and drop the existing constraint
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the check constraint on media_type
  SELECT conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
  WHERE c.conrelid = 'montree_media'::regclass
    AND a.attname = 'media_type'
    AND c.contype = 'c';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE montree_media DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;
END $$;

-- Add new constraint with 'document' included
ALTER TABLE montree_media 
ADD CONSTRAINT montree_media_media_type_check 
CHECK (media_type IN ('photo', 'video', 'document'));

-- 2. Add file_name column if it doesn't exist
ALTER TABLE montree_media 
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 3. Add mime_type column if it doesn't exist  
ALTER TABLE montree_media
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 4. Add comments for clarity
COMMENT ON COLUMN montree_media.file_name IS 'Original filename for documents';
COMMENT ON COLUMN montree_media.mime_type IS 'MIME type of the file (e.g., application/pdf)';

-- 5. Verify the changes
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration SESSION_64_DOCUMENT_SUPPORT complete!';
  RAISE NOTICE 'media_type now accepts: photo, video, document';
  RAISE NOTICE 'New columns: file_name, mime_type';
END $$;

-- Show current columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'montree_media' 
  AND column_name IN ('file_name', 'mime_type', 'media_type')
ORDER BY column_name;
