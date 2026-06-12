-- 253_webhook_inbox.sql  (= db/RUN_THESE/06_webhook_inbox.sql)
-- Jun 12, 2026 — audit fix H5 (AUDIT-whale.md): inbox-first webhook persistence.
--
-- Plain language: the billing webhook replies 200 to Stripe BEFORE processing
-- the event (deliberate perf choice). If the server restarts/crashes in the
-- seconds a handler is still running, that event is lost silently — Stripe
-- won't retry (it got a 200) and the dead-letter queue only catches handler
-- ERRORS, not process death. This inbox closes that window: every verified
-- event is persisted here FIRST, then acked, then processed. A row stuck in
-- 'received'/'processing' is the smoking gun for an event lost to a restart —
-- queryable, replayable, never silent.
--
-- Until this migration is run the webhook logs a loud warning and falls back
-- to the previous behaviour (process without inbox). Safe + idempotent.

CREATE TABLE IF NOT EXISTS montree_webhook_inbox (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source           TEXT NOT NULL DEFAULT 'stripe',
  stripe_event_id  TEXT UNIQUE NOT NULL,
  event_type       TEXT NOT NULL,

  -- Full verified Stripe event (not just event.data) so it can be replayed.
  payload          JSONB NOT NULL,

  status           TEXT NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  attempts         INTEGER NOT NULL DEFAULT 1,
  last_error       TEXT,

  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- "What never finished?" — the whole point of the inbox.
CREATE INDEX IF NOT EXISTS idx_webhook_inbox_unfinished
  ON montree_webhook_inbox (status, received_at DESC)
  WHERE status IN ('received', 'processing', 'failed');

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_event_type
  ON montree_webhook_inbox (event_type, received_at DESC);

CREATE OR REPLACE FUNCTION montree_webhook_inbox_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_webhook_inbox_updated_at ON montree_webhook_inbox;
CREATE TRIGGER trg_webhook_inbox_updated_at
  BEFORE UPDATE ON montree_webhook_inbox
  FOR EACH ROW EXECUTE FUNCTION montree_webhook_inbox_touch_updated_at();

-- Deny-all for the anon key; server uses service role (same as 251/252).
ALTER TABLE montree_webhook_inbox ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_webhook_inbox IS
  'Inbox-first persistence for Stripe billing webhook events (audit H5). Events are stored before the 200 ack; rows stuck in received/processing mean the process died mid-handler and the event needs manual replay.';
