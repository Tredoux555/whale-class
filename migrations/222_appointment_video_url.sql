-- migrations/222_appointment_video_url.sql
--
-- Phase 116.2 — Jitsi video call URLs on parent appointments.
--
-- ARCHITECTURE (locked in Session 116 plan):
--   - Jitsi Meet (free, public infra at meet.jit.si — no account, no API
--     key, no infra to run). Daily.co + Whereby + Twilio were considered
--     and deferred — Jitsi gives same-day shipping with zero ops.
--   - Room URL is deterministic from the appointment's `ical_token`:
--     https://meet.jit.si/montree-<first-12-chars-of-ical_token>
--     The `montree-` prefix is anti-collision posture for public Jitsi
--     infra (architectural rule #164 — don't let parents accidentally
--     join a random "meeting" room).
--   - The `video_url` column is denormalised. We could regenerate it
--     from `ical_token` on every read, but persisting it is cheaper +
--     lets a future redirect / private-room provider swap in without
--     reshuffling consumers.
--
-- FEATURE FLAG: `video_calls`, default OFF. Schools opt in per the
-- standard Session 115/116 posture — every new ecosystem feature is
-- opt-in so we don't surprise existing schools with new surfaces.
--
-- RUN POSTURE: idempotent. Every clause uses IF NOT EXISTS /
-- ON CONFLICT DO NOTHING.

BEGIN;

ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- No index. video_url is read alongside the appointment row by id /
-- parent_id; it's never the WHERE-clause column for a hot query.

INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'video_calls',
  'Video calls on appointments',
  'When ON, parents booking an appointment can opt into a Jitsi Meet video call. URL is generated automatically and a "Join video call" button appears on the appointment detail for both parent and staff.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
