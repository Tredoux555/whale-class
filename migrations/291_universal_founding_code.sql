-- Migration 291 — Universal Founding 100 link.
--
-- ONE public multi-use link (montree.xyz/montree/try?founding=<UNIVERSAL-CODE>)
-- Tredoux can post in Facebook groups / emails. Every signup through it joins
-- the Founding 100 ($3-for-life) automatically until the cap fills, then the
-- SAME link falls back to a normal 7-day trial (never a dead 400).
--
-- The code lives on the singleton config row. Redemptions self-increment the
-- admitted count by inserting an admitted montree_founding_waitlist row
-- (source='universal_link') so the cap burns down without any manual admit.
--
-- Additive + idempotent. Safe to deploy the code BEFORE this runs:
--   - try/instant reads universal_signup_code 42703-safe → a missing column
--     skips the universal branch entirely (byte-identical to pre-291 behaviour).
--   - The super-admin get_or_create_universal_code action returns a clear
--     "run migration 291" message until the column exists.

BEGIN;

ALTER TABLE montree_founding_config
  ADD COLUMN IF NOT EXISTS universal_signup_code    TEXT,
  ADD COLUMN IF NOT EXISTS universal_code_created_at TIMESTAMPTZ;

COMMIT;
