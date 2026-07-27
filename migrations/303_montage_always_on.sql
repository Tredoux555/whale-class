-- 303_montage_always_on.sql
-- "Week in Film" is now a STANDARD feature — the school gate is gone (Jul 2026).
-- =========================================================================
-- 301_montage.sql shipped montree_schools.montage_enabled as an admin-style
-- opt-in gate; 302_montage_default_on.sql flipped the DEFAULT to TRUE for new
-- rows but deliberately left existing schools alone.
--
-- The product decision has since changed: the weekly photo montage is not an
-- extra, it is part of every classroom's weekly parent report. It auto-generates
-- alongside the report and is announced to parents in the report email.
--
-- Accordingly, lib/montree/montage/enqueue.ts NO LONGER READS this column — the
-- only remaining gate is "the report has >= 8 eligible (teacher-confirmed,
-- parent-visible) photos", which is enforced in the enqueue helper and again in
-- the Railway worker.
--
-- montree_schools.montage_enabled is therefore DEPRECATED / always-on. The
-- column is intentionally kept (dropping it would break older deploys mid
-- rollout and several INSERTs still write it), but nothing gates on it. This
-- migration backfills every existing row to TRUE so that any straggler code
-- path — an old deploy, a script, a manual query — behaves the same way as the
-- new code.
--
-- Idempotent. Safe to re-run. Run in the Supabase SQL Editor or via the pooler.
-- =========================================================================

BEGIN;

-- Backfill: every school gets montages. No school is opted out any more.
UPDATE montree_schools
   SET montage_enabled = TRUE
 WHERE montage_enabled IS DISTINCT FROM TRUE;

-- Keep the default aligned (302 already did this; harmless to re-assert).
ALTER TABLE montree_schools
  ALTER COLUMN montage_enabled SET DEFAULT TRUE;

COMMENT ON COLUMN montree_schools.montage_enabled IS
  'DEPRECATED (migration 303, Jul 2026). Week in Film is a standard feature for '
  'every school and no application code reads this column. Kept for backwards '
  'compatibility only; always TRUE.';

COMMIT;

-- Verify:
--   SELECT count(*) FILTER (WHERE montage_enabled) AS on_count, count(*) AS total
--     FROM montree_schools;
--   -- expected: on_count = total
