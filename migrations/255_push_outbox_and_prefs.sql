-- 255_push_outbox_and_prefs.sql
-- Jun 12, 2026 — Tier 2 push polish: durable retry queue + per-parent
-- notification preferences. (254 is reserved for the missing-tables batch
-- staged in the same burn round.)
--
-- Plain language, part 1 (outbox): when a push send fails transiently
-- (network blip, APNs/FCM 5xx, 429), the old sender retried in memory only —
-- a restart or deploy mid-retry silently dropped the notification. Mirrors
-- the montree_webhook_inbox pattern (migration 253): persist the failed send
-- here, then a drain pass retries due rows with exponential backoff (max 5
-- attempts, then status='dead'). Dead TOKENS (APNs 410 / FCM UNREGISTERED)
-- are never enqueued — retrying a retired token is pointless by definition.
-- Until this migration is run the sender logs one loud line and falls back
-- to the previous fire-and-forget behaviour. Safe + idempotent.
--
-- Plain language, part 2 (prefs): parents could not opt out of any push
-- category. notification_prefs on montree_parents holds per-category
-- opt-outs: {"reports": false} etc. ABSENT key = enabled (opt-out model),
-- so '{}' means "everything on" and no backfill is needed.

CREATE TABLE IF NOT EXISTS montree_push_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who the notification addresses (matches montree_device_tokens).
  owner_type      TEXT NOT NULL CHECK (owner_type IN ('teacher', 'principal', 'parent')),
  owner_id        UUID NOT NULL,

  -- Everything needed to replay the send without re-resolving anything:
  -- { platform, token, tokenRowId, push: { title, body, data } }
  payload         JSONB NOT NULL,

  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'dead')),
  last_error      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The drain's working set: "what is due?".
CREATE INDEX IF NOT EXISTS idx_push_outbox_due
  ON montree_push_outbox (next_attempt_at)
  WHERE status = 'pending';

-- Deny-all for the anon key; server uses service role (same house style as
-- 251/252/253: RLS enabled with NO policies = nobody but service role,
-- which bypasses RLS, can touch the table).
ALTER TABLE montree_push_outbox ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_push_outbox IS
  'Durable retry queue for transiently-failed push sends (mirrors montree_webhook_inbox). Drained opportunistically at the start of each push batch (lib/montree/push/outbox.ts); a cron route can call drainPushOutbox later. Rows hit status=dead after 5 attempts.';

-- ---------------------------------------------------------------------------
-- Per-parent notification preferences (opt-out model).
-- Shape: { "reports"?: boolean, "messages"?: boolean, "broadcasts"?: boolean }
-- Absent key = true. Enforced in ONE chokepoint: sendPushToOwners()
-- (lib/montree/push/sender.ts) filters parent owners before token lookup.
-- ---------------------------------------------------------------------------

ALTER TABLE montree_parents
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN montree_parents.notification_prefs IS
  'Push notification opt-outs per category (reports/messages/broadcasts). Absent key = enabled. Edited via PATCH /api/montree/parent/account/notification-prefs.';
