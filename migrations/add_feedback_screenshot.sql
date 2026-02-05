-- Add screenshot_url column to montree_feedback table
-- Run this migration to enable screenshot attachments in feedback

ALTER TABLE montree_feedback
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN montree_feedback.screenshot_url IS 'URL to screenshot stored in Supabase storage';
