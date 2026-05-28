-- Migration 238: extend montree_weekly_admin_notes to support monthly summaries
--
-- Adds 'monthly' to the doc_type CHECK so the existing table can store the new
-- Monthly Summary notes alongside Weekly Summary + Weekly Plan rows. For
-- monthly rows, `week_start` is repurposed as the 1st-of-month anchor (which
-- is rarely a Monday), so the Monday constraint must be loosened to apply
-- only to summary/plan rows.
--
-- Idempotent. Safe to re-run.
--
-- After this runs:
--   doc_type ∈ ('summary', 'plan', 'monthly')
--   week_start MUST be a Monday when doc_type ∈ ('summary','plan')
--   week_start CAN be any date when doc_type = 'monthly' (we'll use the 1st)
--
-- See CLAUDE.md Session 135 for context.

BEGIN;

-- 1. Drop the doc_type CHECK constraint
ALTER TABLE montree_weekly_admin_notes
  DROP CONSTRAINT IF EXISTS montree_weekly_admin_notes_doc_type_check;

-- 2. Recreate it with 'monthly' included
ALTER TABLE montree_weekly_admin_notes
  ADD CONSTRAINT montree_weekly_admin_notes_doc_type_check
  CHECK (doc_type IN ('summary', 'plan', 'monthly'));

-- 3. Drop the Monday-only week_start CHECK constraint
ALTER TABLE montree_weekly_admin_notes
  DROP CONSTRAINT IF EXISTS chk_week_start_monday;

-- 4. Recreate it conditionally — only enforce Monday for summary/plan
ALTER TABLE montree_weekly_admin_notes
  ADD CONSTRAINT chk_week_start_monday CHECK (
    doc_type = 'monthly'
    OR EXTRACT(ISODOW FROM week_start) = 1
  );

-- 5. Make sure the unique index still works for monthly rows. The existing
--    idx_weekly_notes_unique uses COALESCE(area, '__summary__') so
--    (child_id, week_start, 'monthly', '__summary__') is its own row — one
--    per child per month, which is what we want.

COMMIT;
