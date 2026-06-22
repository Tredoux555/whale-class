// lib/story/coach/billing.ts
//
// Lyf Coach (Sealed Individual) billing — Stripe Billing on the SHARED Montree
// Limited Stripe account, keyed by `space` (the individual coach user is one
// story_admin_users row). Mirrors lib/montree/billing.ts patterns (config gate,
// race-safe customer create, checkout/portal) but for the consumer subscription.
//
// 🚨 Build strategy: ships BEFORE Stripe is configured. Every function checks
// getCoachBillingConfig().configured first and degrades gracefully.
//
// Pricing (MONETISATION SPEC v1.0): $14.99/mo + $99/yr, tax-EXCLUSIVE (Stripe
// Tax adds local VAT on top). Trial is DB-managed (startCoachTrial) — NO Stripe
// object until the user converts. See docs/handoffs/LYF_COACH_PAYMENTS_PLAN.md.

import Stripe from 'stripe';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

const TRIAL_DAYS = 7;
const COACH_PRODUCT = 'lyf_coach';

/** PostgREST "column / relation does not exist" — migration 269 not run yet. */
function isMissingSchema(err: { code?: string } | null | undefined): boolean {
  return err?.code === '42703' || err?.code === '42P01';
}

// ── Config ─────────────────────────────────────────────────────────────────

export interface CoachBillingConfig {
  configured: boolean;       // secret + monthly price present (enough for checkout)
  reason?: string;
  secret_key_present: boolean;
  monthly_price_present: boolean;
  annual_price_present: boolean;
  webhook_secret_present: boolean; // needed by the Phase C webhook, not checkout
  app_url: string;
}

export function getCoachBillingConfig(): CoachBillingConfig {
  const secret = process.env.STRIPE_SECRET_KEY; // SAME account as Montree
  const monthly = process.env.STORY_STRIPE_PRICE_SEALED_MONTHLY;
  const annual = process.env.STORY_STRIPE_PRICE_SEALED_ANNUAL;
  const webhook = process.env.STORY_STRIPE_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';

  const secretPresent = Boolean(secret);
  const monthlyPresent = Boolean(monthly);
  const configured = secretPresent && monthlyPresent;

  let reason: string | undefined;
  if (!configured) {
    const missing: string[] = [];
    if (!secretPresent) missing.push('STRIPE_SECRET_KEY');
    if (!monthlyPresent) missing.push('STORY_STRIPE_PRICE_SEALED_MONTHLY');
    reason = `Missing env: ${missing.join(', ')}`;
  }

  return {
    configured,
    reason,
    secret_key_present: secretPresent,
    monthly_price_present: monthlyPresent,
    annual_price_present: Boolean(annual),
    webhook_secret_present: Boolean(webhook),
    app_url: appUrl,
  };
}

/** Stripe client on the shared account. THROWS if unconfigured — check config first. */
export function getCoachStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY missing — call getCoachBillingConfig() first');
  return new Stripe(secret, { apiVersion: '2026-01-28.clover' });
}

// ── User billing row ──────────────────────────────────────────────────────

export interface CoachUserBilling {
  space: string;
  username: string | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  plan: string | null;
  current_period_end: string | null;
  subscription_id: string | null;
}

export async function loadCoachUserBilling(
  supabase: SupabaseClient,
  space: string,
): Promise<CoachUserBilling | null> {
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('space, username, stripe_customer_id, subscription_status, plan, current_period_end, subscription_id')
    .eq('space', space)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (!isMissingSchema(error)) console.warn('[coach/billing] load error:', error.message);
    return null;
  }
  if (!data) return null;
  return {
    space: data.space as string,
    username: (data.username as string | null) ?? null,
    stripe_customer_id: (data.stripe_customer_id as string | null) ?? null,
    subscription_status: (data.subscription_status as string | null) ?? null,
    plan: (data.plan as string | null) ?? null,
    current_period_end: (data.current_period_end as string | null) ?? null,
    subscription_id: (data.subscription_id as string | null) ?? null,
  };
}

// ── DB-managed trial (instant on signup/claim, no card, no Stripe object) ──

export interface TrialResult { ok: boolean; started: boolean; reason?: string }

/**
 * Start the 7-day Sealed-Individual trial for a space. Idempotent + best-effort:
 * only sets the trial when subscription_status IS NULL (i.e. the space has never
 * had any billing state), so it can never restart a trial or clobber an active
 * subscription. Never throws — a trial-start failure must not block login/claim.
 * Owner space billing is irrelevant (owner is comped via getEntitlement).
 */
export async function startCoachTrial(
  supabase: SupabaseClient,
  space: string,
): Promise<TrialResult> {
  const periodEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('story_admin_users')
      .update({
        subscription_status: 'trialing',
        plan: 'sealed_individual',
        current_period_end: periodEnd,
      })
      .eq('space', space)
      .is('subscription_status', null) // only if never set — race/idempotency-safe
      .select('space'); // NOT .maybeSingle() — a shared space (e.g. owner) could
                        // match >1 row; .maybeSingle() would error on that.
    if (error) {
      if (!isMissingSchema(error)) console.warn('[coach/billing] trial start error:', error.message);
      return { ok: false, started: false, reason: error.message };
    }
    return { ok: true, started: Array.isArray(data) && data.length > 0 };
  } catch (e) {
    console.warn('[coach/billing] trial start threw:', e);
    return { ok: false, started: false, reason: 'unexpected' };
  }
}

// ── Stripe customer (race-safe, keyed by space) ────────────────────────────

export interface CoachBillingResult<T = Record<string, unknown>> {
  ok: boolean;
  configured: boolean;
  reason?: string;
  data?: T;
}

export async function getOrCreateCoachStripeCustomer(
  supabase: SupabaseClient,
  space: string,
): Promise<CoachBillingResult<{ customer_id: string }>> {
  const cfg = getCoachBillingConfig();
  if (!cfg.configured) return { ok: false, configured: false, reason: cfg.reason };

  const user = await loadCoachUserBilling(supabase, space);
  if (!user) return { ok: false, configured: true, reason: 'Coach user not found' };
  if (user.stripe_customer_id) {
    return { ok: true, configured: true, data: { customer_id: user.stripe_customer_id } };
  }

  const stripe = getCoachStripe();
  let customer: Stripe.Customer;
  try {
    customer = await stripe.customers.create({
      name: user.username || `Lyf Coach (${space})`,
      // story_admin_users has no email column — Stripe Tax collects the billing
      // address at Checkout; metadata.space is how the webhook resolves back.
      metadata: { product: COACH_PRODUCT, space },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe customer create failed';
    console.error('[coach/billing] customer create failed for space', space, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  // Race-safe persist: only set if still NULL. NOT .maybeSingle() — a shared
  // space (e.g. the owner) can match >1 row, which would make .maybeSingle()
  // error; an array tells us cleanly whether we won the race (≥1 updated).
  const { data: updated, error: updErr } = await supabase
    .from('story_admin_users')
    .update({ stripe_customer_id: customer.id })
    .eq('space', space)
    .is('stripe_customer_id', null)
    .select('stripe_customer_id');

  if (updErr) {
    console.error('[coach/billing] persist customer_id failed for space', space, ':', updErr.message);
    return { ok: false, configured: true, reason: updErr.message };
  }
  if (!Array.isArray(updated) || updated.length === 0) {
    const refreshed = await loadCoachUserBilling(supabase, space);
    if (refreshed?.stripe_customer_id) {
      console.warn('[coach/billing] customer-create race lost; using canonical', refreshed.stripe_customer_id, '(orphan:', customer.id + ')');
      return { ok: true, configured: true, data: { customer_id: refreshed.stripe_customer_id } };
    }
    return { ok: false, configured: true, reason: 'Race condition — try again' };
  }
  return { ok: true, configured: true, data: { customer_id: customer.id } };
}

// ── Checkout (conversion) + Portal ──────────────────────────────────────────

export type CoachCadence = 'monthly' | 'annual';

/**
 * Checkout session for converting a trial → paid. NO Stripe trial here (the
 * trial was DB-managed pre-conversion); the subscription bills per cycle from
 * completion. Tax-EXCLUSIVE: automatic_tax adds the customer's local VAT on top.
 */
export async function createCoachCheckoutSession(
  supabase: SupabaseClient,
  space: string,
  options: { cadence?: CoachCadence; successPath?: string; cancelPath?: string } = {},
): Promise<CoachBillingResult<{ checkout_url: string; session_id: string; cadence: CoachCadence }>> {
  const cfg = getCoachBillingConfig();
  if (!cfg.configured) return { ok: false, configured: false, reason: cfg.reason };

  // Resolve price by cadence. Annual only if its env price exists, else monthly.
  const annualPrice = process.env.STORY_STRIPE_PRICE_SEALED_ANNUAL;
  const monthlyPrice = process.env.STORY_STRIPE_PRICE_SEALED_MONTHLY as string;
  const cadence: CoachCadence = options.cadence === 'annual' && annualPrice ? 'annual' : 'monthly';
  const priceId = cadence === 'annual' ? (annualPrice as string) : monthlyPrice;

  const customerResult = await getOrCreateCoachStripeCustomer(supabase, space);
  if (!customerResult.ok || !customerResult.data) {
    return { ok: false, configured: true, reason: customerResult.reason || 'Customer create failed' };
  }
  const customerId = customerResult.data.customer_id;

  const successPath = options.successPath || '/story/admin/coach?billing=success';
  const cancelPath = options.cancelPath || '/story/admin/coach?billing=canceled';

  const stripe = getCoachStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe Tax is OFF for launch — with zero tax registrations it would
      // collect $0 VAT anyway, and HK accounts may not have Stripe Tax. Pricing
      // is tax-EXCLUSIVE, so when you enable Stripe Tax + register a jurisdiction
      // (e.g. EU OSS), switch this to:
      //   automatic_tax: { enabled: true },
      //   customer_update: { address: 'auto' },
      //   tax_id_collection: { enabled: true },
      // and VAT rides on top with no price change.
      automatic_tax: { enabled: false },
      subscription_data: { metadata: { product: COACH_PRODUCT, space } },
      success_url: `${cfg.app_url}${successPath}`,
      cancel_url: `${cfg.app_url}${cancelPath}`,
      payment_method_collection: 'always',
      metadata: { product: COACH_PRODUCT, space, cadence },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout session create failed';
    console.error('[coach/billing] checkout create failed for space', space, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  if (!session.url) return { ok: false, configured: true, reason: 'Stripe returned no checkout URL' };
  return { ok: true, configured: true, data: { checkout_url: session.url, session_id: session.id, cadence } };
}

export async function createCoachPortalSession(
  supabase: SupabaseClient,
  space: string,
  returnPath: string = '/story/admin/coach',
): Promise<CoachBillingResult<{ portal_url: string }>> {
  const cfg = getCoachBillingConfig();
  if (!cfg.configured) return { ok: false, configured: false, reason: cfg.reason };

  const user = await loadCoachUserBilling(supabase, space);
  if (!user) return { ok: false, configured: true, reason: 'Coach user not found' };
  if (!user.stripe_customer_id) {
    return { ok: false, configured: true, reason: 'No Stripe customer yet — upgrade first.' };
  }

  const stripe = getCoachStripe();
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${cfg.app_url}${returnPath}`,
    });
    return { ok: true, configured: true, data: { portal_url: session.url } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Portal session create failed';
    console.error('[coach/billing] portal create failed for space', space, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }
}
