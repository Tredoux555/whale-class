-- 272_lyf_coach_first_login_shown.sql
-- First-login welcome banner: show a one-time welcome the first time a VERIFIED
-- public coach user lands in the app, then never again. One boolean on the
-- individual coach user (story_admin_users, keyed by space). The variant
-- (founder vs standard) is derived from welcome_bonus_period (migration 271);
-- this column only tracks whether the banner has already been shown.
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS first_login_shown boolean NOT NULL DEFAULT false;

COMMIT;
