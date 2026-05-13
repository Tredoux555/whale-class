-- Migration 208 — Xero sync log table for idempotent finance_tx → Xero mirroring.
--
-- Phase C of FINANCIAL_ARCHITECTURE_PLAN.md.
--
-- The sync script (scripts/sync-to-xero.mjs) reads new finance_transactions
-- since the last successful sync, maps each row to the appropriate Xero
-- object (Invoice / Bill / BankTransaction / ManualJournal), POSTs to Xero
-- API, and writes the result here.
--
-- The unique partial index on (finance_tx_id, xero_object_type) WHERE
-- status='success' makes the sync idempotent — re-running the script never
-- duplicates Xero objects. If a row failed last time, the new attempt isn't
-- blocked by the index (only successful syncs occupy a slot).
--
-- Inactive until Xero env vars are configured in Railway. Script returns
-- early with "Xero not configured — skipping" log message until then.
--
-- Idempotent — IF NOT EXISTS. Safe to re-run.

CREATE TABLE IF NOT EXISTS montree_xero_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  finance_tx_id UUID REFERENCES montree_finance_transactions(id) ON DELETE SET NULL,

  -- Xero side identifiers.
  xero_object_type TEXT NOT NULL CHECK (xero_object_type IN (
    'Invoice', 'Bill', 'BankTransaction', 'ManualJournal', 'CreditNote'
  )),
  xero_object_id TEXT,  -- Xero's UUID for the synced object; NULL on failure

  -- Result.
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,

  -- Audit timestamps.
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🚨 The idempotency contract: one successful (finance_tx_id, xero_object_type)
-- combo per finance_tx row. Re-running the sync against the same finance_tx
-- skips it (success row already exists). Failed attempts don't occupy a slot
-- so retries are unblocked.
CREATE UNIQUE INDEX IF NOT EXISTS idx_xero_sync_log_unique
  ON montree_xero_sync_log(finance_tx_id, xero_object_type)
  WHERE status = 'success';

CREATE INDEX IF NOT EXISTS idx_xero_sync_log_recent
  ON montree_xero_sync_log(synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_xero_sync_log_failures
  ON montree_xero_sync_log(synced_at DESC)
  WHERE status = 'failed';

COMMENT ON TABLE montree_xero_sync_log IS
  'Phase C — append-only log of finance_transactions → Xero sync attempts. Idempotent via partial unique index on (finance_tx_id, xero_object_type) WHERE status=success. Inactive until Xero env vars configured.';

-- ── Verification queries ────────────────────────────────────────────────────
-- SELECT status, count(*) FROM montree_xero_sync_log GROUP BY status;
-- SELECT count(*) FROM montree_finance_transactions
--   WHERE id NOT IN (SELECT finance_tx_id FROM montree_xero_sync_log WHERE status = 'success');
--   -- unsynced rows
