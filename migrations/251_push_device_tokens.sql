-- 251_push_device_tokens.sql
-- App Store build (Jun 2026): native push notifications.
-- One row per device token. A token belongs to exactly one signed-in
-- identity (teacher / principal / parent); re-registering the same token
-- under a different owner re-assigns it (device changed hands / re-login).
-- Safe + idempotent.

CREATE TABLE IF NOT EXISTS montree_device_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token        text NOT NULL UNIQUE,
  platform     text NOT NULL CHECK (platform IN ('ios', 'android')),
  owner_type   text NOT NULL CHECK (owner_type IN ('teacher', 'principal', 'parent')),
  owner_id     uuid NOT NULL,
  school_id    uuid,
  app_version  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  -- set when APNs/FCM reports the token dead; sender skips these
  failed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_montree_device_tokens_owner
  ON montree_device_tokens (owner_type, owner_id)
  WHERE failed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_montree_device_tokens_school
  ON montree_device_tokens (school_id)
  WHERE failed_at IS NULL;
