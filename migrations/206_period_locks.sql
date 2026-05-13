-- Migration 206 — Period locking for financial periods.
--
-- Phase B3 of FINANCIAL_ARCHITECTURE_PLAN.md. Once a month is "closed" by
-- the super-admin (typically after monthly reconciliation), historical
-- montree_finance_transactions and montree_agent_payouts rows for that
-- period become immutable. Mutations are gated server-side by
-- assertPeriodOpen() helper at the API layer.
--
-- This is the auditor-friendly immutability layer. Without it, any
-- super-admin SQL or API call can silently rewrite history — fine for
-- early-stage operational use but not OK for filed financial periods.
--
-- Reopening a closed month requires explicit super-admin action with notes
-- captured (audit trail). The `closed_at` column is NULL for the active
-- period, populated for closed ones. Re-opening UPDATEs `closed_at` to NULL
-- and writes the notes.
--
-- Idempotent — IF NOT EXISTS. Safe to re-run.

CREATE TABLE IF NOT EXISTS montree_period_locks (
  -- Period in 'YYYY-MM' format. One row per month.
  period_month TEXT PRIMARY KEY CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),

  -- When the period was closed. NULL = was opened (in case of reopening).
  closed_at TIMESTAMPTZ,

  -- Who closed it. Free text for v1 (super_admin token doesn't have a user id).
  closed_by TEXT,

  -- Free-form notes — required when reopening so there's a paper trail.
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION montree_period_locks_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_period_locks_updated_at ON montree_period_locks;
CREATE TRIGGER trg_period_locks_updated_at
  BEFORE UPDATE ON montree_period_locks
  FOR EACH ROW EXECUTE FUNCTION montree_period_locks_set_updated_at();

-- Index for the "is this period closed?" lookup pattern.
CREATE INDEX IF NOT EXISTS idx_period_locks_closed
  ON montree_period_locks(period_month)
  WHERE closed_at IS NOT NULL;

COMMENT ON TABLE montree_period_locks IS
  'Phase B3 — financial period locks. When closed_at is NOT NULL for a given period_month, mutations to montree_finance_transactions and montree_agent_payouts for that period are refused by API-layer guards. Reopening requires explicit super-admin action with notes captured.';

-- ── Verification queries ────────────────────────────────────────────────────
-- SELECT period_month, closed_at IS NOT NULL AS is_closed, closed_at, closed_by
--   FROM montree_period_locks ORDER BY period_month DESC;
