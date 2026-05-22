-- Migration 229: story_push_subscriptions — Web Push subscriptions for the
-- Story system.
--
-- One row per device per Story user. When the admin places a call, the
-- server sends a Web Push to every subscription for that username so the
-- user gets a notification even when the Story app is closed (PWA must be
-- installed to the Home Screen on iOS 16.4+ for this to work).
--
-- `endpoint` is the push-service URL and is globally unique → UNIQUE so a
-- re-subscribe from the same device upserts rather than duplicates.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS story_push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL,                 -- the Story user this device belongs to
  endpoint     TEXT NOT NULL UNIQUE,          -- push-service endpoint URL
  p256dh       TEXT NOT NULL,                 -- subscription public key
  auth         TEXT NOT NULL,                 -- subscription auth secret
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Send-side lookup: every subscription for a username.
CREATE INDEX IF NOT EXISTS idx_story_push_subs_username
  ON story_push_subscriptions (username);

COMMIT;
