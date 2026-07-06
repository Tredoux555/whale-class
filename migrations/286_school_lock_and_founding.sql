-- migrations/286_school_lock_and_founding.sql
--
-- Launch-pricing restructure (Jul 6, 2026) — Workstream 2.
--
-- Two capabilities added:
--   1. Abuse LOCK on schools. A super-admin can lock a school; login is then
--      refused for every role and resolve-model kills all AI spend for it
--      (Workstream 1 owns resolve-model). A locked school's users land on the
--      /montree/locked screen where they can message Tredoux (→ super-admin
--      Feedback tab, feedback_type='appeal').
--   2. FOUNDING signup codes. Tredoux admits a waitlist school in super-admin,
--      generates a one-time signup code (FND-XXXXXX), and shares the link
--      https://montree.xyz/montree/try?founding=FND-XXXXXX . Redeeming the code
--      at signup stamps the new school founding_member=true + a $3 billing
--      override + a 30-day Premium month, then marks the waitlist row redeemed.
--
-- 🚨 DEPLOY-ORDER: resolve-model (Workstream 1) selects locked_at. Its
-- fail-closed catch returns 'free', so if this migration hasn't run when the
-- code deploys, EVERY school 402s. Run this in Supabase BEFORE the git push.
--
-- Idempotent — safe to re-run.

BEGIN;

-- ── 1. Abuse lock + founding-member flag on montree_schools ──
-- locked_at NULL = not locked. Set = the moment it was locked.
-- founding_member = redeemed a Founding 100 code (Premium locked at $3 for life).
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS locked_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_reason    TEXT,
  ADD COLUMN IF NOT EXISTS founding_member  BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Signup-code columns on montree_founding_waitlist ──
-- signup_code: the one-time FND-XXXXXX code generated when a row is admitted.
--   UNIQUE (per amendment A11 — the constraint alone is enough; no redundant
--   partial index). Multiple NULLs are allowed by a UNIQUE constraint, so
--   un-generated rows don't collide with each other.
-- redeemed_by_school_id / redeemed_at: set atomically when the code is used at
--   signup, so a code is single-use.
ALTER TABLE montree_founding_waitlist
  ADD COLUMN IF NOT EXISTS signup_code           TEXT,
  ADD COLUMN IF NOT EXISTS code_generated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS redeemed_by_school_id UUID,
  ADD COLUMN IF NOT EXISTS redeemed_at           TIMESTAMPTZ;

-- UNIQUE on signup_code. Guard the ADD so a re-run doesn't error on the
-- already-present constraint (ADD CONSTRAINT has no IF NOT EXISTS in Postgres).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'montree_founding_waitlist_signup_code_key'
  ) THEN
    ALTER TABLE montree_founding_waitlist
      ADD CONSTRAINT montree_founding_waitlist_signup_code_key UNIQUE (signup_code);
  END IF;
END $$;

COMMIT;
