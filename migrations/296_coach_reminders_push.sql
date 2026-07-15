-- migrations/296_coach_reminders_push.sql
-- Coach Clock + Push Reminders (Jul 15, 2026) — follows 295 (Diary Recall).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into the Supabase SQL Editor.
--    The app degrades gracefully until it runs: the reminder tools return a clean
--    "not available yet" error, push subscribe 500s softly, and the per-turn
--    timezone persist is fire-and-forget (42703 swallowed).
--
-- ADDS
--   1. story_coach_reminders          — a nudge the coach scheduled for the user.
--                                        message encrypted at rest (diary-crypto),
--                                        space-scoped; the cron dispatches it as a
--                                        push (or email fallback) at remind_at.
--   2. story_coach_push_subscriptions — a coach-page browser's Web Push
--                                        subscription, keyed by SPACE (resolved
--                                        from the verified token, never the client).
--   3. story_admin_users.timezone     — the user's last-seen IANA timezone, so the
--                                        cron can fire at their local wall-clock
--                                        time. Written fire-and-forget by the route.
--
-- Both new tables: RLS ENABLED + FORCED, NO policies → service-role only (house
-- style, mirrors 259 / 262 / 263). The browser never touches these tables; every
-- read/write goes through the service-role server, scoped to the caller's space.
--
-- NOTE: message_enc carries a cipher_version column so readDiaryField() can branch
-- exactly as it does for the diary / coach log (always written v1 by this build).

BEGIN;

CREATE TABLE IF NOT EXISTS story_coach_reminders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space          text NOT NULL,
  remind_at      timestamptz NOT NULL,
  tz             text,                             -- tz used to interpret/schedule it
  message_enc    text NOT NULL,                    -- AES-256-GCM 'gcm:iv:tag:ct'
  recurrence     text,                             -- NULL | daily | weekdays | weekly | monthly
  status         text NOT NULL DEFAULT 'pending',  -- pending | sent | cancelled
  delivered_via  text,                             -- push | email | none
  cipher_version int  NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz
);

-- per-space listing (pending + recent sent); and the cron's due sweep.
CREATE INDEX IF NOT EXISTS idx_coach_reminders_space
  ON story_coach_reminders (space, status, remind_at);
CREATE INDEX IF NOT EXISTS idx_coach_reminders_due
  ON story_coach_reminders (status, remind_at);

ALTER TABLE story_coach_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_reminders FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS story_coach_push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space        text NOT NULL,
  endpoint     text NOT NULL UNIQUE,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coach_push_subs_space
  ON story_coach_push_subscriptions (space);

ALTER TABLE story_coach_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_push_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS timezone text;

COMMIT;

-- After running:
--   SELECT to_regclass('story_coach_reminders');            -- not null
--   SELECT to_regclass('story_coach_push_subscriptions');   -- not null
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'story_admin_users' AND column_name = 'timezone';  -- 1 row
