-- Migration 141: Add auto_crop JSONB column to montree_media
-- Stores AI-suggested crop coordinates from Smart Capture vision analysis
-- Format: {"x": 0.1, "y": 0.05, "width": 0.8, "height": 0.9} (normalized 0-1)

ALTER TABLE montree_media
ADD COLUMN IF NOT EXISTS auto_crop JSONB DEFAULT NULL;

COMMENT ON COLUMN montree_media.auto_crop IS 'AI-suggested crop region (normalized 0-1 coordinates: x, y, width, height). NULL means no crop suggestion.';
