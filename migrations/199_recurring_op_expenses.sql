-- Migration 199 — Recurring op-expense templates.
--
-- Replaces "manually add Railway hosting / Supabase / Resend rows on the 1st
-- of every month" with a stored template that the cron fires automatically.
--
-- Cron call: POST /api/montree/super-admin/finance/recurring/run with
-- x-cron-secret. Scans every active template, picks ones due this month
-- (where last_fired_period_month != current YYYY-MM), inserts a fresh
-- finance_tx row with source='manual_entry' + category='op_expense'.
--
-- Idempotency: last_fired_period_month is the gate. Re-running the cron in
-- the same month is a no-op.

CREATE TABLE IF NOT EXISTS montree_recurring_op_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category TEXT NOT NULL,
  description TEXT NOT NULL,
  usd_amount NUMERIC(12,4) NOT NULL CHECK (usd_amount > 0),
  -- Day of month the cron fires this. 1-28 only (avoid 29-31 edge cases on
  -- short months). The cron handler scans on/after this day each month.
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),

  -- Idempotency key. Set to 'YYYY-MM' each time the cron fires for that
  -- period. The cron skips templates where this matches the current period.
  last_fired_period_month TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_op_expenses_active
  ON montree_recurring_op_expenses(is_active, day_of_month)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION montree_recurring_op_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_op_updated_at ON montree_recurring_op_expenses;
CREATE TRIGGER trg_recurring_op_updated_at
  BEFORE UPDATE ON montree_recurring_op_expenses
  FOR EACH ROW EXECUTE FUNCTION montree_recurring_op_set_updated_at();

COMMENT ON TABLE montree_recurring_op_expenses IS
  'Templates for the monthly recurring-op-expense cron. Each row fires once per period_month, inserting a manual_entry finance_tx row.';
