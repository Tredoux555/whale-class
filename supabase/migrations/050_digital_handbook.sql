-- DIGITAL HANDBOOK MIGRATION
-- Run this in Supabase SQL Editor
-- Created: January 21, 2025
-- Purpose: Add handbook fields for teacher training content

-- ============================================
-- 1. ADD DIGITAL HANDBOOK FIELDS TO montessori_works
-- ============================================

-- Presentation steps - structured JSONB for step-by-step guide
-- Format: [{"step": 1, "title": "Invite", "description": "...", "tip": "..."}, ...]
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS presentation_steps JSONB DEFAULT '[]';

-- Points of interest - what captures the child's attention
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS points_of_interest TEXT[] DEFAULT '{}';

-- Extensions - related works that extend this one (self-referencing)
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS extension_work_ids UUID[] DEFAULT '{}';

-- Control of error - how child self-corrects
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS control_of_error TEXT;

-- Variations - different ways to present the same work
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS variations TEXT[] DEFAULT '{}';

-- Common challenges - what teachers often struggle with
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS common_challenges TEXT[] DEFAULT '{}';

-- Mastery indicators - how to know child has mastered
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS mastery_indicators TEXT[] DEFAULT '{}';

-- Re-presentation triggers - when to re-present
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS repres_triggers TEXT[] DEFAULT '{}';

-- ============================================
-- 2. COMMENT DOCUMENTATION
-- ============================================

COMMENT ON COLUMN montessori_works.presentation_steps IS 
'JSONB array of presentation steps. Format: [{"step": 1, "title": "...", "description": "...", "tip": "..."}]';

COMMENT ON COLUMN montessori_works.points_of_interest IS 
'What captures the child''s attention during this work';

COMMENT ON COLUMN montessori_works.extension_work_ids IS 
'UUIDs of works that extend/advance this work';

COMMENT ON COLUMN montessori_works.control_of_error IS 
'How the child self-corrects without teacher intervention';

COMMENT ON COLUMN montessori_works.variations IS 
'Different ways to present the same work';

COMMENT ON COLUMN montessori_works.common_challenges IS 
'Common challenges teachers face with this work';

COMMENT ON COLUMN montessori_works.mastery_indicators IS 
'Observable signs that child has mastered this work';

COMMENT ON COLUMN montessori_works.repres_triggers IS 
'Signs that work should be re-presented';

-- ============================================
-- 3. INDEX FOR HANDBOOK QUERIES
-- ============================================

-- Index for finding works with presentation steps filled
CREATE INDEX IF NOT EXISTS idx_works_has_presentation 
ON montessori_works ((presentation_steps IS NOT NULL AND presentation_steps != '[]'::jsonb));

-- ============================================
-- 4. VERIFY
-- ============================================
-- Run this to check the new columns:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'montessori_works' 
-- ORDER BY ordinal_position;
