-- Migration 168: Increase story-uploads bucket file size limit
-- The default Supabase bucket limit is 50MB per file.
-- Videos from phones (even at 1080p) easily exceed 50MB for clips over 30 seconds.
-- This raises the limit to 200MB to allow longer video uploads.
--
-- IMPORTANT: On Supabase free plan, the max upload is 50MB regardless of this setting.
-- You need Supabase Pro plan for file_size_limit > 50MB to take effect.
-- If you're on free plan, leave this at 50MB (52428800) or upgrade.

UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200MB (set to 52428800 for 50MB if on free plan)
WHERE id = 'story-uploads';

-- Verify
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'story-uploads';
