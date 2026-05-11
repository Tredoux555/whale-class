-- Migration 200 — Stripe webhook dead-letter queue.
--
-- When the Stripe webhook handler can't process an event (DB down, code bug,
-- transient API timeout), the event lands here so it can be retried manually
-- from super-admin. Stripe also auto-retries with exponential backoff for
-- ~3 days, but if BOTH our handler and Stripe's retry exhaust, this is the
-- record we need.
--
-- Idempotency: unique on stripe_event_id so duplicate landings are no-ops.
--
-- The webhook handler always returns 200 to Stripe (avoid retry storms), so
-- the only way to see failures was Railway logs. This table makes them
-- queryable + retryable.

CREATE TABLE IF NOT EXISTS montree_webhook_deadletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source TEXT NOT NULL DEFAULT 'stripe',
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,

  -- The raw event payload (JSONB so it's queryable).
  payload JSONB NOT NULL,

  -- Why we couldn't process it.
  error_message TEXT NOT NULL,
  error_stack TEXT,

  -- Lifecycle.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_pending
  ON montree_webhook_deadletter(status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_event_type
  ON montree_webhook_deadletter(event_type, created_at DESC);

CREATE OR REPLACE FUNCTION montree_webhook_dlq_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_webhook_dlq_updated_at ON montree_webhook_deadletter;
CREATE TRIGGER trg_webhook_dlq_updated_at
  BEFORE UPDATE ON montree_webhook_deadletter
  FOR EACH ROW EXECUTE FUNCTION montree_webhook_dlq_set_updated_at();

COMMENT ON TABLE montree_webhook_deadletter IS
  'Failed webhook events captured for manual retry. Unique on stripe_event_id prevents duplicates from Stripe re-firing the same event.';
