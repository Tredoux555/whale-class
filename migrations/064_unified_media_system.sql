-- Migration 064: Unified Media System
-- Session 54: Fix existing errors + document architecture
-- 
-- ARCHITECTURE DECISION:
-- - PRIMARY: montree_media (newer, better designed, from migration 050)
-- - LEGACY: child_work_media (kept for backward compatibility)
-- 
-- Going forward, ALL new code should use montree_media.
-- This migration fixes the category column error and prepares for deprecation.

-- =============================================
-- PART 1: Fix child_work_media category column
-- This fixes: "Could not find the 'category' column"
-- =============================================

-- Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_media' AND column_name = 'category'
  ) THEN
    ALTER TABLE child_work_media 
    ADD COLUMN category TEXT DEFAULT 'work';
    
    -- Add check constraint
    ALTER TABLE child_work_media 
    ADD CONSTRAINT child_work_media_category_check 
    CHECK (category IN ('work', 'life', 'shared'));
    
    RAISE NOTICE '✅ Added category column to child_work_media';
  ELSE
    RAISE NOTICE '✓ category column already exists';
  END IF;
END $$;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_child_work_media_category 
ON child_work_media(category);

-- =============================================
-- PART 2: Ensure montree_media has all needed columns
-- =============================================

-- Add sync-related columns if missing (for offline-first support)
DO $$ 
BEGIN
  -- sync_status should exist from migration 050, but ensure it does
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_media' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE montree_media 
    ADD COLUMN sync_status TEXT DEFAULT 'synced' 
    CHECK (sync_status IN ('pending', 'uploading', 'synced', 'failed'));
  END IF;
  
  -- Add processing_status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_media' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE montree_media 
    ADD COLUMN processing_status TEXT DEFAULT 'complete' 
    CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed'));
  END IF;
END $$;

-- =============================================
-- PART 3: Create helper function for media URL
-- =============================================

CREATE OR REPLACE FUNCTION get_media_public_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Construct public URL for Supabase storage
  -- Format: https://[project].supabase.co/storage/v1/object/public/whale-media/[path]
  RETURN 'https://' || current_setting('app.settings.supabase_url', true) || 
         '/storage/v1/object/public/whale-media/' || storage_path;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: return path as-is
    RETURN storage_path;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PART 4: Create view for unified media access
-- Combines both tables for migration period
-- =============================================

CREATE OR REPLACE VIEW unified_media AS
SELECT 
  id,
  child_id,
  work_id,
  media_type,
  media_url AS url,
  thumbnail_url,
  notes AS caption,
  taken_at AS captured_at,
  created_at,
  'child_work_media' AS source_table
FROM child_work_media
WHERE child_id IS NOT NULL

UNION ALL

SELECT 
  id,
  child_id,
  work_id,
  media_type,
  storage_path AS url,
  thumbnail_path AS thumbnail_url,
  caption,
  captured_at,
  created_at,
  'montree_media' AS source_table
FROM montree_media
WHERE child_id IS NOT NULL;

-- =============================================
-- SUCCESS
-- =============================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 064 complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED: child_work_media now has category column';
  RAISE NOTICE 'PRIMARY TABLE: montree_media (use this for new code)';
  RAISE NOTICE 'LEGACY TABLE: child_work_media (backward compatible)';
  RAISE NOTICE '';
  RAISE NOTICE 'VIEW: unified_media combines both tables for queries';
  RAISE NOTICE '';
END $$;
