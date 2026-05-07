-- migrations/189_billing_phase4.sql
-- Phase 4 of the agent referral programme — Stripe school subscription
-- billing + unified finance ledger.
--
-- Schools pay $7 per student per month via Stripe. The subscription quantity
-- is synced to montree_children.is_active count. When schools are billed,
-- montree_finance_transactions captures both the income (subscription
-- revenue) AND the direct cost (Stripe fee). Phase 5's payout calculator
-- aggregates from this ledger.
--
-- All ALTER TABLE statements use IF NOT EXISTS — fully idempotent. Run as
-- many times as needed in Supabase SQL Editor without side effects.
--
-- 🚨 BUILD STRATEGY: this migration ships BEFORE Stripe credentials are
-- configured. The DB shape is what's locked. Tredoux follows
-- docs/STRIPE_BILLING_SETUP.md to wire up Stripe later — when he sets
-- STRIPE_SECRET_KEY and webhook env vars, the existing API endpoints
-- start functioning automatically.

-- ── montree_schools extensions ──────────────────────────────────────────────
-- Most billing columns already exist (migration 028). We add:
--   billing_quantity            — last quantity pushed to Stripe (= student count)
--   last_synced_to_stripe_at    — when the headcount sync last fired
--   stripe_price_id_active      — the Stripe Price object backing this sub
--                                 (lets us migrate prices without losing track)
--   billing_email               — explicit email for Stripe invoices
--                                 (defaults to owner_email — but principals
--                                  may want a different billing contact)
--   monthly_charge_estimate_cents — calculated estimate for display
--                                   (= billing_quantity × $7)

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS billing_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS last_synced_to_stripe_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_price_id_active TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS monthly_charge_estimate_cents INTEGER;

-- ── montree_finance_transactions ────────────────────────────────────────────
-- Unified ledger. Every income, direct cost, commission, and op-ex row lands
-- here. Phase 5's payout aggregator + Phase 6's Money tab read from here.
--
-- Multi-currency aware (original_currency + fx_rate + usd_amount). Source
-- tracking captures whether the row came from a Stripe webhook, an API
-- usage aggregate, or a manual entry. Idempotent inserts keyed off
-- (source, source_ref) — webhooks can replay safely.

CREATE TABLE IF NOT EXISTS montree_finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- When the underlying real-world event happened (invoice.paid timestamp,
  -- API call timestamp, manual entry date). NOT the row insert time.
  occurred_at TIMESTAMPTZ NOT NULL,

  -- Top-level type. Drives which "Section" it shows up under in the Money tab.
  type TEXT NOT NULL CHECK (type IN (
    'income', 'direct_cost', 'commission', 'op_expense', 'fx_adjustment'
  )),

  -- Sub-category. Free-text for forward compatibility — Phase 6's Money tab
  -- will group by this. Recommended values:
  --   subscription_revenue, refund
  --   api_anthropic, api_openai, api_other, stripe_fee
  --   referral_payout
  --   hosting, domain, email_service, supabase, other_op_expense
  category TEXT NOT NULL,

  description TEXT NOT NULL,

  -- References. Sparse — only fields relevant to the transaction's type
  -- are populated. school_id on income/direct_cost so we can attribute
  -- revenue + costs per school for the agent payout calc.
  school_id UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  agent_payout_id UUID,  -- references montree_agent_payouts(id) — that
                         -- table comes in Phase 5; FK added then to avoid
                         -- forward-dep here.

  -- Stripe trace IDs (for webhook idempotency + audit).
  stripe_charge_id TEXT,
  stripe_invoice_id TEXT,
  stripe_transfer_id TEXT,

  -- Amounts. We store both original currency and USD-normalised so the
  -- accountant pack can present either.
  original_currency TEXT NOT NULL DEFAULT 'USD',
  original_amount NUMERIC(12,4) NOT NULL,
  fx_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  usd_amount NUMERIC(12,4) NOT NULL,

  -- Where this row came from. Drives idempotency.
  source TEXT NOT NULL CHECK (source IN (
    'stripe_webhook', 'api_usage_aggregate', 'manual_entry', 'system_cron'
  )),
  source_ref TEXT,  -- ID in source system. For stripe_webhook, the event id
                    -- or the invoice/charge id. For api_usage_aggregate, a
                    -- composite like "school_id:period_month".

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  notes TEXT
);

-- Idempotency: a Stripe webhook replaying an event won't double-insert.
-- The unique partial index allows source_ref to be null for non-webhook
-- entries (manual entries don't have a source_ref).
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_tx_source_unique
  ON montree_finance_transactions(source, source_ref)
  WHERE source_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_tx_occurred ON montree_finance_transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_type ON montree_finance_transactions(type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_school
  ON montree_finance_transactions(school_id, occurred_at DESC)
  WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_tx_agent
  ON montree_finance_transactions(agent_id, occurred_at DESC)
  WHERE agent_id IS NOT NULL;

COMMENT ON TABLE montree_finance_transactions IS
  'Unified financial ledger for the Money tab + payout aggregator. Every income, direct cost, commission, op-ex row lands here. Multi-currency aware. Idempotent inserts via (source, source_ref).';

-- ── montree_billing_history (existing — ensure schema present) ──────────────
-- This table predates Phase 4 (referenced by /api/montree/billing/webhook).
-- Defensive — create with IF NOT EXISTS in case it was never made in a fresh
-- DB. Pre-Phase 4 webhook wrote rows here; Phase 4 webhook continues to write
-- here AND ALSO writes to montree_finance_transactions. Belt-and-braces:
-- billing_history is the per-school invoice timeline; finance_transactions
-- is the accounting ledger. They can coexist.

CREATE TABLE IF NOT EXISTS montree_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,  -- 'paid' | 'failed' | 'refunded' | 'pending'
  description TEXT,
  invoice_pdf_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  quantity INTEGER,  -- student count at billing time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_history_school
  ON montree_billing_history(school_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_history_invoice
  ON montree_billing_history(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- Idempotently add the new columns we want even if the table existed.
ALTER TABLE montree_billing_history
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quantity INTEGER;

COMMENT ON COLUMN montree_schools.billing_quantity IS
  'Last student count we pushed to Stripe as the subscription quantity. Updated by lib/montree/billing.ts syncSubscriptionQuantity(). Drives monthly_charge_estimate_cents = billing_quantity * 700 (= $7).';

COMMENT ON COLUMN montree_schools.stripe_price_id_active IS
  'Stripe Price object ID currently backing this school''s subscription. Captured at checkout; preserved across price migrations.';

COMMENT ON COLUMN montree_schools.billing_email IS
  'Where Stripe sends invoices for this school. NULL = use owner_email. Principals may want a separate finance contact.';
