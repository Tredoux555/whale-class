-- ============================================
-- PARENT DESCRIPTIONS MIGRATION
-- Session 51 - Add parent-facing content to work translations
-- Run in Supabase SQL Editor
-- ============================================

-- Add parent-facing description columns to existing work_translations table
ALTER TABLE montree_work_translations 
ADD COLUMN IF NOT EXISTS parent_description TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS home_connection TEXT;

-- Add comments for documentation
COMMENT ON COLUMN montree_work_translations.parent_description IS 'Parent-friendly work description, max 30 words, warm tone';
COMMENT ON COLUMN montree_work_translations.why_it_matters IS 'Developmental importance for parents, max 15 words';
COMMENT ON COLUMN montree_work_translations.home_connection IS 'Home extension activity suggestion, max 15 words';

-- Create index for efficient lookups when generating reports
CREATE INDEX IF NOT EXISTS idx_work_translations_has_parent_desc 
ON montree_work_translations(work_id) 
WHERE parent_description IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check column addition
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'montree_work_translations'
AND column_name IN ('parent_description', 'why_it_matters', 'home_connection');

-- Check coverage by area (run after import)
-- SELECT 
--   area,
--   COUNT(*) as total_works,
--   COUNT(parent_description) as with_descriptions,
--   ROUND(COUNT(parent_description)::numeric / COUNT(*)::numeric * 100, 1) as coverage_pct
-- FROM montree_work_translations
-- GROUP BY area
-- ORDER BY area;
