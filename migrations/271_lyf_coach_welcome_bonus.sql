-- 271_lyf_coach_welcome_bonus.sql
-- First-100 welcome bonus: a bigger first-calendar-month Sonnet allowance.
-- One column on the individual coach user (story_admin_users, keyed by space).
-- welcome_bonus_period = 'YYYY-MM' of the month the bonus applies to (their
-- verify month). The 1000-cap is live ONLY while this equals the meter's current
-- period_month, so it auto-expires when the calendar month rolls — no cron.
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS welcome_bonus_period text;  -- 'YYYY-MM' or NULL

COMMIT;
