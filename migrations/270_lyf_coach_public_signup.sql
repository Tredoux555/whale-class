-- 270_lyf_coach_public_signup.sql
-- Email verification for public Lyf Coach (web) signups.
--
-- Additive on the live INSTANT-login flow. A public account is a
-- story_admin_users row keyed by `space`, with username == lowercased email
-- (already UNIQUE — that constraint already enforces one-account-per-email, so
-- NO separate email column / unique index is added here).
--
-- Users sign up and are logged in instantly (unchanged). These columns only
-- track whether they've confirmed the email we send them. An unverified account
-- is NEVER locked out — the app shows a gentle banner until verified.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- 1. Add the three verification columns (additive, nullable except the flag).
ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS email_verified       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verify_token   text,
  ADD COLUMN IF NOT EXISTS email_verify_sent_at timestamptz;

-- 2. Grandfather every existing account so nobody already signed up sees the
--    "confirm your email" banner. No-op on re-run (a genuinely-unverified new
--    signup carries a token/sent_at and is excluded).
UPDATE story_admin_users
   SET email_verified = true
 WHERE email_verified = false
   AND email_verify_token IS NULL
   AND email_verify_sent_at IS NULL;

-- 3. Fast lookup of a pending confirmation by token.
CREATE INDEX IF NOT EXISTS idx_admin_users_verify_token
  ON story_admin_users (email_verify_token) WHERE email_verify_token IS NOT NULL;

COMMIT;
