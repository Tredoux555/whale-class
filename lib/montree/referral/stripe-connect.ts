// lib/montree/referral/stripe-connect.ts
//
// Stripe Connect Express helpers for the agent referral programme.
//
// Reuses the shared singleton from lib/montree/stripe.ts. Connect Express
// means Stripe hosts the agent-onboarding form — we never see bank/tax info,
// and Stripe handles 1099-NEC (US) / equivalents (other jurisdictions).
//
// Flow:
//   1. createConnectAccount(agent) — creates an Express account in Stripe
//   2. createOnboardingLink(accountId) — generates a one-time URL the agent
//      uses to fill in their bank/tax details
//   3. fetchAccountStatus(accountId) — pulls current state for display
//   4. summariseStatus(account) — derives the denormalised status string
//      we store in montree_teachers.stripe_connect_status

import Stripe from 'stripe';
import { getStripe } from '@/lib/montree/stripe';

export type ConnectStatus = 'pending' | 'onboarding' | 'verified' | 'restricted' | 'disabled';

export interface ConnectStatusSummary {
  account_id: string;
  status: ConnectStatus;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  disabled_reason: string | null;
}

/**
 * Where Stripe sends the agent after they finish (or abandon) onboarding.
 * Always montree.xyz domain — we don't trust the request to set the base URL.
 */
function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  return 'https://montree.xyz';
}

/**
 * Create a new Stripe Connect Express account for the given agent.
 * The agent's email is pre-filled so they don't have to retype it.
 *
 * NOTE on country: Stripe Connect requires us to know the agent's country.
 * For Phase 3 we leave country UNSPECIFIED (Stripe defaults to the platform
 * account's country) — agents anywhere Stripe supports Express can complete
 * onboarding. If we ever need country gating per agent, accept it as a param.
 */
export async function createConnectAccount(params: {
  email: string;
  display_name?: string;
}): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.create({
    type: 'express',
    email: params.email,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true }, // we transfer USD from platform balance to them
    },
    metadata: {
      source: 'agent_referral_programme',
      display_name: params.display_name || '',
    },
  });
}

/**
 * Generate a one-time onboarding link for the agent. The link expires (per
 * Stripe) within a few minutes of creation — generate fresh whenever you need
 * to send it. Configure return / refresh URLs so Stripe can bounce them back
 * into our flow.
 */
export async function createOnboardingLink(accountId: string): Promise<Stripe.AccountLink> {
  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/montree/agent/onboarding?status=refresh&account=${encodeURIComponent(accountId)}`,
    return_url: `${baseUrl}/montree/agent/onboarding?status=complete&account=${encodeURIComponent(accountId)}`,
    type: 'account_onboarding',
  });
}

/**
 * Pull the latest state for an account. Useful in the super admin UI to
 * confirm "yes Sarah really has finished" without waiting for the webhook.
 */
export async function fetchAccountStatus(accountId: string): Promise<ConnectStatusSummary> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return summariseStatus(account);
}

/**
 * Derive the high-level status string from a Stripe Account object.
 *
 *   verified    — charges + payouts both enabled, no disabled_reason
 *   onboarding  — details_submitted but charges or payouts not yet enabled
 *   restricted  — disabled_reason present (something needs fixing)
 *   pending     — account exists but agent hasn't started filling it in
 *   disabled    — payouts explicitly disabled (terminal)
 */
export function summariseStatus(account: Stripe.Account): ConnectStatusSummary {
  const charges = !!account.charges_enabled;
  const payouts = !!account.payouts_enabled;
  const details = !!account.details_submitted;
  const disabledReason = account.requirements?.disabled_reason || null;

  let status: ConnectStatus;
  if (disabledReason) {
    // Some restrictions are recoverable (the agent can fix them in Stripe);
    // others are terminal. We use 'restricted' for both — Stripe surfaces the
    // exact reason in the dashboard.
    status = 'restricted';
  } else if (charges && payouts && details) {
    status = 'verified';
  } else if (details) {
    status = 'onboarding';
  } else {
    status = 'pending';
  }

  return {
    account_id: account.id,
    status,
    charges_enabled: charges,
    payouts_enabled: payouts,
    details_submitted: details,
    disabled_reason: disabledReason,
  };
}
