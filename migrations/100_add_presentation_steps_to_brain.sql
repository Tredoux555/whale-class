-- Migration 100: Add presentation_steps to montessori_works (the Brain)
-- This column will store detailed step-by-step teacher presentation instructions
-- Date: 2026-01-31

-- Add presentation_steps column to the Brain
ALTER TABLE montessori_works
ADD COLUMN IF NOT EXISTS presentation_steps JSONB DEFAULT '[]';

-- Add presentation_notes for any additional guidance
ALTER TABLE montessori_works
ADD COLUMN IF NOT EXISTS presentation_notes TEXT;

-- Comment for documentation
COMMENT ON COLUMN montessori_works.presentation_steps IS 'Detailed step-by-step presentation instructions: [{step, title, description, tip}]';
COMMENT ON COLUMN montessori_works.presentation_notes IS 'Additional teacher guidance for this work';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'montessori_works'
AND column_name IN ('presentation_steps', 'presentation_notes');
