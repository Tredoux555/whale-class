-- Migration 202 — Per-school billing override (early-adopter pricing).
--
-- Adds two columns to montree_schools:
--   billing_override_usd  — DECIMAL price per student per month. NULL means
--                           "use the default ($7)". Range enforced 0..100 USD.
--   billing_override_note — Free-text reason from super-admin (e.g.
--                           "Early adopter — locked at $5 through Jun 2027").
--
-- Use cases:
--   * Early adopters charged $5 instead of $7 for first N students/schools
--   * Strategic partners locked at a custom rate
--   * Heritage schools migrated in at a grandfathered price
--
-- How it flows through the system:
--   1. Super-admin sets the override via the new BillingOverrideModal.
--   2. Next Stripe Checkout: a Price with the override amount is looked up
--      or created via stripe.prices.create() and used in the line_items.
--   3. Existing subscriptions: next syncSubscriptionQuantity() call detects
--      the unit-amount mismatch between Stripe's current item price and the
--      effective price, then swaps the subscription item to the override
--      Price (with proration).
--   4. monthly_charge_estimate_cents on the school row reflects the effective
--      price (override or default).
--
-- Idempotent: safe to re-run.

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS billing_override_usd DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS billing_override_note TEXT;

-- Enforce sane range. NULL passes the check trivially.
-- We use a CHECK constraint (not NOT NULL) so the column stays optional.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_schools_billing_override_usd_range'
  ) THEN
    ALTER TABLE montree_schools
      ADD CONSTRAINT montree_schools_billing_override_usd_range
      CHECK (billing_override_usd IS NULL OR (billing_override_usd >= 0 AND billing_override_usd <= 100));
  END IF;
END $$;

-- Partial index on rows with an override set, so super-admin "schools with
-- overrides" queries stay fast as the school count grows.
CREATE INDEX IF NOT EXISTS idx_montree_schools_billing_override
  ON montree_schools (billing_override_usd)
  WHERE billing_override_usd IS NOT NULL;

COMMENT ON COLUMN montree_schools.billing_override_usd IS
  'Per-school custom price per student per month, in USD. NULL = use the platform default ($7). Range 0..100. Honored by Stripe Checkout + sync.';

COMMENT ON COLUMN montree_schools.billing_override_note IS
  'Free-text super-admin note explaining why this school has a custom rate (e.g. "Early adopter through Jun 2027").';
