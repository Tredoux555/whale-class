-- Migration 228: story_calls — voice-call signalling for the Story system.
--
-- A call is admin (Tredoux) <-> one Story user, identified by username
-- (the Story system keys everything by username — see story_online_sessions).
-- The admin starts a call -> a 'ringing' row. The user's Story page polls
-- /api/story/current-call and shows an incoming-call banner. Both sides
-- join the same Agora channel via /api/story/agora-token.
--
-- Reuses the Agora engine from lib/montree/appointments/agora/* — only the
-- signalling table + Story-auth routes are new.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS story_calls (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL,                       -- the Story user being called
  channel      TEXT NOT NULL,                       -- Agora channel name (story-<entropy>)
  status       TEXT NOT NULL DEFAULT 'ringing'
               CHECK (status IN ('ringing', 'active', 'ended')),
  initiated_by TEXT NOT NULL,                       -- admin username who started the call
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ
);

-- The user-poll lookup: latest non-ended call for a username.
CREATE INDEX IF NOT EXISTS idx_story_calls_user_active
  ON story_calls (username, created_at DESC)
  WHERE status IN ('ringing', 'active');

-- Auto-bump updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION story_calls_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_story_calls_updated_at ON story_calls;
CREATE TRIGGER trg_story_calls_updated_at
  BEFORE UPDATE ON story_calls
  FOR EACH ROW EXECUTE FUNCTION story_calls_touch_updated_at();

COMMIT;
