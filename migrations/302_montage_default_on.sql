-- 302_montage_default_on.sql
-- Montage ON by default for every new school (Jul 27 2026).
-- =========================================================================
-- 301_montage.sql shipped the school-level gate as
--   montree_schools.montage_enabled BOOLEAN NOT NULL DEFAULT FALSE
-- which means every school created since then has had montages silently off,
-- and no signup path ever set the column. Parent weekly reports have no such
-- gate — montages are the same kind of pure enhancement, so they get the same
-- treatment: on unless someone turns them off.
--
-- Montage rendering stays self-gating regardless of this flag: the job is only
-- enqueued when a report has >= 8 eligible confirmed parent-visible photos, the
-- worker is one shared flag-agnostic Railway service, and a render failure can
-- never block or degrade report delivery (see lib/montree/montage/enqueue.ts).
--
-- This only changes the DEFAULT for rows created from now on. Existing schools
-- keep whatever value they already have — flip those individually (see
-- scripts/enable-montage-for-school.js) rather than mass-updating, so a school
-- that was deliberately opted out stays out.
--
-- The app also writes montage_enabled: true explicitly in every
-- montree_schools INSERT (principal/register, onboarding, teacher/register,
-- try/instant, super-admin/npo-applications), so new schools are correct even
-- on a database where this migration has not been run.
--
-- Idempotent. Safe to re-run. Run in the Supabase SQL Editor or via the pooler.
-- =========================================================================

BEGIN;

ALTER TABLE montree_schools
  ALTER COLUMN montage_enabled SET DEFAULT TRUE;

COMMIT;

-- Verify:
--   SELECT column_name, column_default, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'montree_schools' AND column_name = 'montage_enabled';
--   -- expected column_default: true
