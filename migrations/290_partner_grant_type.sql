-- Migration 290 — Partner Program: grant_type on the founding waitlist.
--
-- The Partner Program (Jul 8, 2026) reuses the founding-code machinery for a
-- SECOND kind of grant: an underprivileged-school partner gets Premium FREE FOR
-- LIFE (not the $3-for-life Founding 100 deal). Redemption reads grant_type to
-- decide which grant to stamp:
--   'founding_3_life'   → billing_override_usd = 3  (existing Founding 100)
--   'partner_free_life' → billing_override_usd = 0  + permanent Sonnet AI tier
--
-- Additive + idempotent. Safe to deploy the code BEFORE this runs:
--   - Redemption reads grant_type 42703-safe → a missing column behaves exactly
--     as today (every code is treated as 'founding_3_life').
--   - The create_partner mint action HARD-REQUIRES this migration; until it runs
--     it returns a clear "run migration 290" message rather than a cryptic error.
--
-- partner_agent_id is an optional traceability link back to the referral agent
-- minted alongside the code (no FK — a shell agent row must not block delete).

BEGIN;

ALTER TABLE montree_founding_waitlist
  ADD COLUMN IF NOT EXISTS grant_type       TEXT NOT NULL DEFAULT 'founding_3_life',
  ADD COLUMN IF NOT EXISTS partner_agent_id UUID;

-- CHECK constraint on grant_type. Guard with a DO-block so a re-run doesn't
-- error on the already-present constraint (ADD CONSTRAINT has no IF NOT EXISTS
-- in Postgres). DROP IF EXISTS + re-ADD keeps it idempotent.
DO $$
BEGIN
  ALTER TABLE montree_founding_waitlist
    DROP CONSTRAINT IF EXISTS montree_founding_waitlist_grant_type_check;
  ALTER TABLE montree_founding_waitlist
    ADD CONSTRAINT montree_founding_waitlist_grant_type_check
      CHECK (grant_type IN ('founding_3_life', 'partner_free_life'));
END $$;

COMMIT;
