-- migrations/187_agent_stripe_connect.sql
-- Phase 3 of the agent referral programme — Stripe Connect Express onboarding.
--
-- Each referral agent (a row in montree_teachers) gets their own Stripe Connect
-- Express account. We never see their bank/tax info — Stripe hosts the form.
-- We just store the account ID and a denormalised status so super admin can
-- show "Sarah is verified" or "Sarah hasn't completed onboarding yet" without
-- a roundtrip to Stripe on every page load.
--
-- Run in Supabase SQL Editor.

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_connect_disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at TIMESTAMPTZ;

-- Stripe account IDs are unique per Stripe account — index for webhook lookups.
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_stripe_connect_account
  ON montree_teachers(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN montree_teachers.stripe_connect_account_id IS
  'Stripe Connect Express account ID (acct_*) for this agent. NULL = not onboarded yet. Set when /api/montree/super-admin/agents/[id]/connect-onboard creates the account.';

COMMENT ON COLUMN montree_teachers.stripe_connect_status IS
  'Denormalised summary of Stripe Connect onboarding state. Values: ''pending'' (account created, no info submitted), ''onboarding'' (some info submitted but not complete), ''verified'' (charges + payouts enabled), ''restricted'' (disabled_reason present), ''disabled'' (account fully disabled). NULL = no Connect account exists.';
