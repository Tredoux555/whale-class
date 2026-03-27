-- Migration 151: Fix area check constraint on montree_weekly_admin_notes
-- The plan document format uses area='notes' for additional teacher notes column,
-- but the original constraint only allowed the 5 Montessori areas + NULL.

-- Drop the old constraint
ALTER TABLE montree_weekly_admin_notes DROP CONSTRAINT IF EXISTS montree_weekly_admin_notes_area_check;

-- Recreate with 'notes' included
ALTER TABLE montree_weekly_admin_notes
  ADD CONSTRAINT montree_weekly_admin_notes_area_check
  CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'notes') OR area IS NULL);
