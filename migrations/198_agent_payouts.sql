-- Migration 198 — Phase 5 Payout calculator infrastructure.
--
-- Creates montree_agent_payouts: per-(agent, school, period_month) row capturing
-- the full math (gross revenue, Stripe fee, AI costs, net, share %, payout) plus
-- payout state (status, stripe_transfer_id, paid_at).
--
-- Idempotent via UNIQUE(agent_id, school_id, period_month). Phase 5's
-- calculator UPSERTs; replaying never double-counts.
--
-- The forward-dep FK from montree_finance_transactions.agent_payout_id is
-- finalised in this migration too — section 189 created the column but
-- intentionally deferred the constraint.

-- ── 1. The table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS montree_agent_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who + which school + when
  agent_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE RESTRICT,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE RESTRICT,
  -- Format: 'YYYY-MM'. The calendar month this payout aggregates.
  period_month TEXT NOT NULL CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),

  -- The full math, all in USD (the base currency we calc in).
  gross_revenue_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  stripe_fee_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  anthropic_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  openai_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  other_direct_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  -- Derived: gross - (stripe_fee + anthropic + openai + other). Stored, not
  -- generated, so the value at calc time is preserved even if the math
  -- changes later.
  net_usd NUMERIC(12,4) NOT NULL DEFAULT 0,

  -- Agent's share % at the time of calculation. Locked here so future %
  -- changes don't retroactively alter past payouts.
  revenue_share_pct NUMERIC(5,2) NOT NULL CHECK (revenue_share_pct >= 0 AND revenue_share_pct <= 100),
  -- The actual payout = MAX(0, net * pct / 100). Negative net → $0 share.
  payout_usd NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (payout_usd >= 0),

  -- State machine. pending → paid (Stripe transfer success) OR cancelled.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')),

  -- Stripe payout trace (set when status flips to 'paid').
  stripe_transfer_id TEXT,
  paid_at TIMESTAMPTZ,
  paid_by_method TEXT CHECK (paid_by_method IN ('stripe_connect', 'manual_wire', 'other') OR paid_by_method IS NULL),
  fx_rate_used NUMERIC(12,6),
  payout_currency TEXT,  -- e.g., 'USD', 'HKD' — agent's local currency

  -- Calc audit trail
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- How many finance_tx rows contributed (for sanity checking the calc).
  source_tx_count INTEGER NOT NULL DEFAULT 0,
  -- Manual override flag — set when a super-admin edits payout_usd by hand.
  is_manual_override BOOLEAN NOT NULL DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per (agent, school, month). Idempotency for the calc job.
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_payouts_unique
  ON montree_agent_payouts(agent_id, school_id, period_month);

-- Common lookups.
CREATE INDEX IF NOT EXISTS idx_agent_payouts_agent
  ON montree_agent_payouts(agent_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_school
  ON montree_agent_payouts(school_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_pending
  ON montree_agent_payouts(status, period_month DESC)
  WHERE status = 'pending';

-- updated_at trigger
CREATE OR REPLACE FUNCTION montree_agent_payouts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_payouts_updated_at ON montree_agent_payouts;
CREATE TRIGGER trg_agent_payouts_updated_at
  BEFORE UPDATE ON montree_agent_payouts
  FOR EACH ROW EXECUTE FUNCTION montree_agent_payouts_set_updated_at();

-- ── 2. Backfill the forward-FK from finance_transactions ────────────────────
-- Migration 189 created montree_finance_transactions.agent_payout_id WITHOUT
-- a FK constraint (to avoid forward dep). Now that the target table exists,
-- add it. ON DELETE SET NULL so deleting a payout doesn't cascade-nuke the
-- commission ledger row.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_finance_tx_agent_payout'
  ) THEN
    ALTER TABLE montree_finance_transactions
      ADD CONSTRAINT fk_finance_tx_agent_payout
      FOREIGN KEY (agent_payout_id)
      REFERENCES montree_agent_payouts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE montree_agent_payouts IS
  'Phase 5 — one row per (agent, school, month). The output of the payout aggregator. Status moves pending → paid via Stripe Connect transfer.';
