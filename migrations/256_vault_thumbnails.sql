-- =============================================
-- VAULT THUMBNAILS  (fix/story-vault-mobile-jun13)
-- Run this in the Supabase SQL Editor BEFORE deploying the branch.
-- =============================================
--
-- Adds a nullable thumbnail_path column to vault_files. The vault upload
-- routes generate a small (~480px wide, q70) JPEG thumbnail for IMAGE uploads
-- with `sharp`, store it in the vault-secure bucket next to the original, and
-- record its storage path here. The gallery grid loads these tiny thumbnails
-- instead of full-resolution originals (fixes slow image loading on iOS); the
-- full-resolution image is only fetched when the viewer opens.
--
-- Nullable + IF NOT EXISTS so it is safe to run on the live table and so the
-- existing image backlog (rows with thumbnail_path = NULL) keeps working: the
-- download route falls back to serving the full image when no thumbnail exists.
-- Videos never get a thumbnail_path.

ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
