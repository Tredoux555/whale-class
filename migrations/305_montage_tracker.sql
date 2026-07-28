-- 305_montage_tracker.sql
-- Montage Tracker — photo-coverage boards + confirmation-free montage jobs.
-- =========================================================================
-- The Montage Tracker counts EVERY photo a teacher tags with a child, the
-- moment she takes it — there is no teacher-confirmation step and no AI in
-- that loop. The existing AI identification / confirmation pipeline is
-- untouched and keeps running in parallel.
--
-- Montage jobs created FROM the tracker must therefore be allowed to draw
-- from the same unconfirmed-but-tagged pool. This column is the single flag
-- that says so:
--
--   require_confirmed = true  (DEFAULT — every existing row and every
--                              existing caller: report montages, Montage
--                              Studio) → montree_media.teacher_confirmed
--                              must be true, exactly as before.
--   require_confirmed = false (Montage Tracker only) → the
--                              teacher_confirmed filter is dropped.
--
-- 🚨 parent_visible = true remains enforced EVERYWHERE regardless of this
-- flag — in lib/montree/montage/enqueue.ts, in the worker's photo query and
-- in the worker's assertAllParentVisible() re-assert. A photo a teacher hid
-- from parents can never reach a rendered film.
--
-- NOT NULL DEFAULT true means existing rows and existing INSERTs that omit
-- the column keep their current behaviour byte-for-byte.
--
-- ROLLBACK:
--   ALTER TABLE montree_montage_jobs DROP COLUMN IF EXISTS require_confirmed;
--   (Safe: nothing else references it. The tracker's own jobs then behave
--   like ordinary Montage Studio jobs.)
--
-- RLS unchanged (deny-all; server uses the service role). Idempotent.
-- =========================================================================

BEGIN;

ALTER TABLE montree_montage_jobs
  ADD COLUMN IF NOT EXISTS require_confirmed BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN montree_montage_jobs.require_confirmed IS
  'FALSE only for Montage Tracker jobs: draw from all tagged photos, ignoring teacher_confirmed. parent_visible is still enforced everywhere.';

COMMIT;
