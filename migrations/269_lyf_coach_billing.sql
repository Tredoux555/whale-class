-- 269_lyf_coach_billing.sql
-- Lyf Coach payments + VAT — Phase A schema (foundation, read-only; no gating wired).
-- See docs/handoffs/LYF_COACH_PAYMENTS_PLAN.md.
--
-- (a) Stripe + entitlement state on the individual coach user (story_admin_users, keyed by space)
-- (b) Ledger gains product + jurisdiction dimensions (consolidated Montree + Lyf Coach books)
-- (c) Ledger type CHECK extended with tax_collected / tax_remitted (VAT liability sub-ledger)
-- (d) montree_tax_registrations — the tax register (what you're registered for + filing reminders)
-- (e) story_coach_usage — per-space monthly Sonnet-prompt meter (drives the Sonnet→Haiku tier)
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ── (a) story_admin_users billing/entitlement columns ────────────────────────
ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS stripe_customer_id   text,
  ADD COLUMN IF NOT EXISTS subscription_status  text,   -- trialing | active | past_due | canceled | incomplete
  ADD COLUMN IF NOT EXISTS plan                 text,   -- sealed_individual | family
  ADD COLUMN IF NOT EXISTS current_period_end   timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_id      text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_stripe_customer
  ON story_admin_users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ── (b) ledger product + jurisdiction dimensions ─────────────────────────────
ALTER TABLE montree_finance_transactions
  ADD COLUMN IF NOT EXISTS product      text NOT NULL DEFAULT 'montree',  -- 'montree' | 'lyf_coach'
  ADD COLUMN IF NOT EXISTS jurisdiction text;                            -- ISO2 country, for tax rows

CREATE INDEX IF NOT EXISTS idx_finance_tx_product
  ON montree_finance_transactions (product, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_jurisdiction
  ON montree_finance_transactions (jurisdiction) WHERE jurisdiction IS NOT NULL;

-- ── (c) extend the type CHECK to add VAT liability types ─────────────────────
-- Drop ANY existing CHECK on this table whose definition references 'income'
-- (idempotent-history safe — the constraint name may vary across past migrations,
--  mirrors the migration-230 drop-by-definition-match pattern).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'montree_finance_transactions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%income%'
  LOOP
    EXECUTE format('ALTER TABLE montree_finance_transactions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE montree_finance_transactions
  ADD CONSTRAINT montree_finance_transactions_type_check
  CHECK (type IN ('income','direct_cost','commission','op_expense','fx_adjustment','tax_collected','tax_remitted'));

-- ── (d) the tax register ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_tax_registrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme              text NOT NULL,             -- 'eu_oss' | 'uk_vat' | 'au_gst' | ...
  covers_country      text,                      -- ISO2; NULL for multi-country schemes like eu_oss
  registration_number text,
  rate_source         text NOT NULL DEFAULT 'stripe_tax', -- 'stripe_tax' | 'manual'
  filing_frequency    text NOT NULL DEFAULT 'quarterly',  -- 'quarterly' | 'monthly' | 'annual'
  registered_at       date,
  next_filing_due     date,
  status              text NOT NULL DEFAULT 'active',      -- 'active' | 'pending' | 'deregistered'
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tax_reg_active_due
  ON montree_tax_registrations (next_filing_due) WHERE status = 'active';

-- Operator-only financial data: service role bypasses RLS; deny-all for anon.
ALTER TABLE montree_tax_registrations ENABLE ROW LEVEL SECURITY;

-- ── (e) cloud-prompt meter (per space, per month) ────────────────────────────
-- sonnet_count = number of Sonnet-served coach turns this cycle. When it reaches
-- the tier cap the coach silently serves Haiku for the rest of the cycle (the
-- product never goes down). Greeting / step-card / quick taps are NOT counted.
CREATE TABLE IF NOT EXISTS story_coach_usage (
  space        text NOT NULL,
  period_month text NOT NULL,   -- 'YYYY-MM'
  sonnet_count integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space, period_month)
);

-- Per-user usage data: service role only.
ALTER TABLE story_coach_usage ENABLE ROW LEVEL SECURITY;

COMMIT;
