// lib/montree/billing.ts
//
// Phase 4 — Stripe school subscription billing.
//
// All helpers are env-gated and gracefully degrade when STRIPE_SECRET_KEY
// or STRIPE_PRICE_PER_STUDENT is missing. Callers check the `configured`
// field and surface an honest "billing not set up yet" UX rather than
// crashing.
//
// 🚨 BUILD STRATEGY: This module is shipped to prod BEFORE Stripe credentials
// are configured. Tredoux follows docs/STRIPE_BILLING_SETUP.md to wire up
// Stripe later. Once env vars are in Railway, all the existing API endpoints
// (checkout, portal, webhook, sync-quantity) start functioning automatically
// — no code change needed.
//
// Pricing model (locked):
//   $7 per student per month — flat rate. Quantity = active children count.
//   Stripe billing model: per_unit price in USD with quantity = headcount.
//   Monthly recurring. 30-day trial. No annual / no upfront.

import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase-client';
import { clearBudgetCache } from '@/lib/montree/api-usage';

// ── Configuration ─────────────────────────────────────────────────────────

export interface BillingConfig {
  configured: boolean;
  reason?: string;
  secret_key_present: boolean;
  price_id_present: boolean;
  webhook_secret_present: boolean;
  app_url: string;
}

/**
 * Snapshot the billing config. Used by status endpoints, super admin tab,
 * and as a guard at the top of every other helper.
 *
 * `configured` is true ONLY if STRIPE_SECRET_KEY, STRIPE_PRICE_PER_STUDENT,
 * AND STRIPE_WEBHOOK_SECRET are all set. Any of those missing → not
 * configured.
 */
export function getBillingConfig(): BillingConfig {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_PER_STUDENT;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';

  const secretPresent = Boolean(secret);
  const pricePresent = Boolean(priceId);
  const webhookPresent = Boolean(webhookSecret);
  const allPresent = secretPresent && pricePresent && webhookPresent;

  let reason: string | undefined;
  if (!allPresent) {
    const missing: string[] = [];
    if (!secretPresent) missing.push('STRIPE_SECRET_KEY');
    if (!pricePresent) missing.push('STRIPE_PRICE_PER_STUDENT');
    if (!webhookPresent) missing.push('STRIPE_WEBHOOK_SECRET');
    reason = `Missing env: ${missing.join(', ')}`;
  }

  return {
    configured: allPresent,
    reason,
    secret_key_present: secretPresent,
    price_id_present: pricePresent,
    webhook_secret_present: webhookPresent,
    app_url: appUrl,
  };
}

/**
 * Get the Stripe client. THROWS if not configured — all callers must check
 * `getBillingConfig().configured` first.
 */
function getStripeClient(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY missing — call getBillingConfig() first');
  }
  return new Stripe(secret, { apiVersion: '2024-12-18.acacia' });
}

// Pricing constant. $7/student/month = 700 cents.
export const PRICE_PER_STUDENT_USD = 7;
export const PRICE_PER_STUDENT_CENTS = 700;

// ── School row helpers ────────────────────────────────────────────────────

export interface SchoolBillingRow {
  id: string;
  name: string | null;
  owner_email: string | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id_active: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  billing_quantity: number | null;
  monthly_charge_estimate_cents: number | null;
  last_synced_to_stripe_at: string | null;
}

const BILLING_FIELDS =
  'id, name, owner_email, billing_email, stripe_customer_id, stripe_subscription_id, stripe_price_id_active, subscription_status, trial_ends_at, current_period_end, billing_quantity, monthly_charge_estimate_cents, last_synced_to_stripe_at';

export async function loadSchoolBilling(
  supabase: SupabaseClient,
  schoolId: string
): Promise<SchoolBillingRow | null> {
  const { data } = await supabase
    .from('montree_schools')
    .select(BILLING_FIELDS)
    .eq('id', schoolId)
    .maybeSingle();
  return (data as SchoolBillingRow | null) || null;
}

/**
 * Count active children for a school. Used as the Stripe subscription quantity.
 */
export async function countActiveStudents(
  supabase: SupabaseClient,
  schoolId: string
): Promise<number> {
  const { count } = await supabase
    .from('montree_children')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('is_active', true);
  return count || 0;
}

// ── Customer + subscription lifecycle ─────────────────────────────────────

export interface BillingResult<T = Record<string, unknown>> {
  ok: boolean;
  configured: boolean;
  reason?: string;
  data?: T;
}

/**
 * Get-or-create a Stripe Customer for the school. Idempotent — if
 * stripe_customer_id is already set, returns it without hitting Stripe.
 *
 * Returns { ok: false, configured: false } if Stripe isn't configured.
 */
export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  schoolId: string
): Promise<BillingResult<{ customer_id: string }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) return { ok: false, configured: true, reason: 'School not found' };

  if (school.stripe_customer_id) {
    return { ok: true, configured: true, data: { customer_id: school.stripe_customer_id } };
  }

  const stripe = getStripeClient();
  let customer: Stripe.Customer;
  try {
    customer = await stripe.customers.create({
      name: school.name || 'Montree school',
      email: school.billing_email || school.owner_email || undefined,
      metadata: { school_id: school.id, source: 'montree_phase4' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe customer create failed';
    console.error('[billing] customer create failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  // Race-safe persist: only set if still NULL. Two simultaneous checkouts
  // would both reach this point. The second loses the race; we re-fetch
  // and use the canonical ID.
  const { data: updated, error: updateErr } = await supabase
    .from('montree_schools')
    .update({ stripe_customer_id: customer.id })
    .eq('id', schoolId)
    .is('stripe_customer_id', null)
    .select('stripe_customer_id')
    .maybeSingle();

  if (updateErr) {
    console.error('[billing] persist customer_id failed for school', schoolId, ':', updateErr.message);
    return { ok: false, configured: true, reason: updateErr.message };
  }

  if (!updated) {
    // Race lost — re-fetch.
    const refreshed = await loadSchoolBilling(supabase, schoolId);
    if (refreshed?.stripe_customer_id) {
      console.warn('[billing] customer-create race lost, using canonical:', refreshed.stripe_customer_id, '(orphan from this attempt:', customer.id + ')');
      return { ok: true, configured: true, data: { customer_id: refreshed.stripe_customer_id } };
    }
    return { ok: false, configured: true, reason: 'Race condition — try again' };
  }

  return { ok: true, configured: true, data: { customer_id: customer.id } };
}

/**
 * Create a Stripe Checkout session for a school subscribing to the per-student plan.
 * Returns the URL for the principal to land on.
 */
export async function createSchoolCheckoutSession(
  supabase: SupabaseClient,
  schoolId: string,
  options: { successPath?: string; cancelPath?: string } = {}
): Promise<BillingResult<{ checkout_url: string; session_id: string }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  // Ensure customer exists.
  const customerResult = await getOrCreateStripeCustomer(supabase, schoolId);
  if (!customerResult.ok || !customerResult.data) {
    return { ok: false, configured: true, reason: customerResult.reason || 'Customer create failed' };
  }
  const customerId = customerResult.data.customer_id;

  // Use current student count as initial quantity. If 0, default to 1 so
  // Stripe accepts the line item — the next sync will reconcile.
  const quantity = Math.max(1, await countActiveStudents(supabase, schoolId));

  const priceId = process.env.STRIPE_PRICE_PER_STUDENT!;
  const stripe = getStripeClient();

  const successPath = options.successPath || '/montree/admin/billing?status=success';
  const cancelPath = options.cancelPath || '/montree/admin/billing?status=canceled';

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      subscription_data: {
        metadata: { school_id: schoolId, source: 'montree_phase4' },
      },
      success_url: `${cfg.app_url}${successPath}`,
      cancel_url: `${cfg.app_url}${cancelPath}`,
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      metadata: { school_id: schoolId },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout session create failed';
    console.error('[billing] checkout create failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  if (!session.url) {
    return { ok: false, configured: true, reason: 'Stripe returned no checkout URL' };
  }

  return {
    ok: true,
    configured: true,
    data: { checkout_url: session.url, session_id: session.id },
  };
}

/**
 * Create a Stripe Customer Portal session — lets the principal manage their
 * card, cancel, view invoices.
 */
export async function createCustomerPortalSession(
  supabase: SupabaseClient,
  schoolId: string,
  returnPath: string = '/montree/admin/billing'
): Promise<BillingResult<{ portal_url: string }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) return { ok: false, configured: true, reason: 'School not found' };
  if (!school.stripe_customer_id) {
    return {
      ok: false,
      configured: true,
      reason: 'No Stripe customer yet — start a checkout first.',
    };
  }

  const stripe = getStripeClient();
  let session: Stripe.BillingPortal.Session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: school.stripe_customer_id,
      return_url: `${cfg.app_url}${returnPath}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Portal session create failed';
    console.error('[billing] portal create failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  return { ok: true, configured: true, data: { portal_url: session.url } };
}

/**
 * Push the current student count to Stripe as the subscription quantity.
 * Idempotent — if the quantity hasn't changed since last sync, this is a
 * no-op (avoids spamming Stripe with proration events).
 *
 * Called fire-and-forget from child create/delete routes via
 * maybeSyncStripeQuantity(), and as the worker for /api/montree/billing/
 * sync-quantity (manual + cron sweep).
 */
export async function syncSubscriptionQuantity(
  supabase: SupabaseClient,
  schoolId: string,
  options: { force?: boolean } = {}
): Promise<BillingResult<{ previous_quantity: number | null; new_quantity: number; updated: boolean }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) return { ok: false, configured: true, reason: 'School not found' };
  if (!school.stripe_subscription_id) {
    // Not subscribed — nothing to sync. We DO update billing_quantity in our
    // DB so the dashboard's "monthly estimate" stays current, but no Stripe
    // call.
    const headcount = await countActiveStudents(supabase, schoolId);
    await supabase
      .from('montree_schools')
      .update({
        billing_quantity: headcount,
        monthly_charge_estimate_cents: headcount * PRICE_PER_STUDENT_CENTS,
      })
      .eq('id', schoolId);
    return {
      ok: true,
      configured: true,
      data: { previous_quantity: school.billing_quantity, new_quantity: headcount, updated: false },
    };
  }

  const newQuantity = await countActiveStudents(supabase, schoolId);
  const previousQuantity = school.billing_quantity;

  // Skip the Stripe round-trip if quantity unchanged AND we synced recently.
  if (!options.force && previousQuantity === newQuantity) {
    return {
      ok: true,
      configured: true,
      data: { previous_quantity: previousQuantity, new_quantity: newQuantity, updated: false },
    };
  }

  const stripe = getStripeClient();
  try {
    // Fetch the subscription to get the item ID we need to update.
    const subscription = await stripe.subscriptions.retrieve(school.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) {
      return { ok: false, configured: true, reason: 'Subscription has no items — Stripe configuration broken' };
    }

    await stripe.subscriptionItems.update(item.id, {
      quantity: Math.max(1, newQuantity),  // Stripe rejects quantity=0; floor to 1
      proration_behavior: 'create_prorations',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Subscription quantity update failed';
    console.error('[billing] sync quantity failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  await supabase
    .from('montree_schools')
    .update({
      billing_quantity: newQuantity,
      monthly_charge_estimate_cents: newQuantity * PRICE_PER_STUDENT_CENTS,
      last_synced_to_stripe_at: new Date().toISOString(),
    })
    .eq('id', schoolId);

  return {
    ok: true,
    configured: true,
    data: { previous_quantity: previousQuantity, new_quantity: newQuantity, updated: true },
  };
}

/**
 * Fire-and-forget headcount sync. Called from child create / delete / activate
 * routes. NEVER throws, NEVER blocks the caller. If billing isn't configured,
 * it's a silent no-op — Phase 4 schools running pre-Stripe-config don't
 * generate noise.
 */
export function maybeSyncStripeQuantity(schoolId: string): void {
  const cfg = getBillingConfig();
  if (!cfg.configured) return;
  void (async () => {
    try {
      const supabase = getSupabase();
      await syncSubscriptionQuantity(supabase, schoolId);
    } catch (e) {
      console.error('[billing] background sync failed for', schoolId, ':', e);
    }
  })();
}

// ── Webhook event handlers ────────────────────────────────────────────────
// Each handler is keyed off a Stripe event type. Idempotent — replaying the
// same event won't double-write to montree_finance_transactions or
// montree_billing_history (idempotency via stripe_invoice_id / event id).

interface FinanceTxInsert {
  occurred_at: string;
  type: 'income' | 'direct_cost' | 'commission' | 'op_expense' | 'fx_adjustment';
  category: string;
  description: string;
  school_id?: string | null;
  agent_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_transfer_id?: string | null;
  original_currency?: string;
  original_amount: number;
  fx_rate?: number;
  usd_amount: number;
  source: 'stripe_webhook' | 'api_usage_aggregate' | 'manual_entry' | 'system_cron';
  source_ref?: string | null;
  notes?: string | null;
}

async function insertFinanceTx(
  supabase: SupabaseClient,
  entry: FinanceTxInsert
): Promise<void> {
  const { error } = await supabase.from('montree_finance_transactions').insert({
    occurred_at: entry.occurred_at,
    type: entry.type,
    category: entry.category,
    description: entry.description,
    school_id: entry.school_id || null,
    agent_id: entry.agent_id || null,
    stripe_charge_id: entry.stripe_charge_id || null,
    stripe_invoice_id: entry.stripe_invoice_id || null,
    stripe_transfer_id: entry.stripe_transfer_id || null,
    original_currency: entry.original_currency || 'USD',
    original_amount: entry.original_amount,
    fx_rate: entry.fx_rate || 1.0,
    usd_amount: entry.usd_amount,
    source: entry.source,
    source_ref: entry.source_ref || null,
    notes: entry.notes || null,
  });
  if (error) {
    // Idempotency: if (source, source_ref) unique violation, swallow — the
    // event was already processed.
    if ((error as { code?: string }).code === '23505') {
      console.log('[billing] finance_tx duplicate suppressed for', entry.source, entry.source_ref);
      return;
    }
    console.error('[billing] finance_tx insert failed:', error.message);
    throw error;
  }
}

/**
 * Handle Stripe `invoice.paid`. Writes income + Stripe fee rows to the
 * finance ledger, plus a billing_history row for the per-school timeline.
 * Updates school's subscription_status + current_period_end.
 */
export async function handleInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  const customerId = invoice.customer as string | null;
  if (!customerId) {
    console.warn('[billing] invoice.paid without customer:', invoice.id);
    return;
  }

  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!school) {
    console.warn('[billing] invoice.paid for unknown customer', customerId);
    return;
  }

  // Calculate Stripe fee. invoice.amount_paid is in cents. Stripe doesn't
  // tell us the fee directly on the invoice — we have to fetch the charge
  // or apply the standard formula. Use the formula: 2.9% + $0.30. This is
  // an estimate; reconciliation against Stripe's actual fee report is a
  // Phase 6 concern.
  const amountPaidCents = invoice.amount_paid || 0;
  const stripeFeeEstimateCents = amountPaidCents > 0
    ? Math.round(amountPaidCents * 0.029) + 30
    : 0;
  const currency = (invoice.currency || 'usd').toUpperCase();
  const periodStart = invoice.lines.data[0]?.period?.start;
  const periodEnd = invoice.lines.data[0]?.period?.end;

  // Income row in the finance ledger.
  await insertFinanceTx(supabase, {
    occurred_at: new Date(((invoice.status_transitions?.paid_at) || invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    type: 'income',
    category: 'subscription_revenue',
    description: `Subscription payment from ${school.name || school.id}`,
    school_id: school.id,
    stripe_invoice_id: invoice.id,
    original_currency: currency,
    original_amount: amountPaidCents / 100,
    fx_rate: 1.0,
    usd_amount: amountPaidCents / 100,  // assume USD; FX handled at reconciliation
    source: 'stripe_webhook',
    source_ref: `${eventId}:income`,
    notes: `quantity=${invoice.lines.data[0]?.quantity ?? '?'}`,
  });

  // Direct cost — Stripe processing fee.
  if (stripeFeeEstimateCents > 0) {
    await insertFinanceTx(supabase, {
      occurred_at: new Date(((invoice.status_transitions?.paid_at) || invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      type: 'direct_cost',
      category: 'stripe_fee',
      description: `Stripe fee on invoice ${invoice.id}`,
      school_id: school.id,
      stripe_invoice_id: invoice.id,
      original_currency: currency,
      original_amount: stripeFeeEstimateCents / 100,
      fx_rate: 1.0,
      usd_amount: stripeFeeEstimateCents / 100,
      source: 'stripe_webhook',
      source_ref: `${eventId}:fee`,
      notes: 'Estimated 2.9% + $0.30 — reconcile against Stripe payouts report monthly',
    });
  }

  // Per-school invoice timeline.
  await supabase.from('montree_billing_history').insert({
    school_id: school.id,
    stripe_invoice_id: invoice.id,
    amount_cents: amountPaidCents,
    currency: invoice.currency || 'usd',
    status: 'paid',
    description: invoice.description || 'Subscription payment',
    invoice_pdf_url: invoice.invoice_pdf,
    period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    quantity: invoice.lines.data[0]?.quantity || null,
  }).then(({ error }) => {
    // Unique on stripe_invoice_id — swallow duplicates.
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[billing] billing_history insert failed:', error.message);
    }
  });

  // Update school's subscription_status + current_period_end.
  await supabase
    .from('montree_schools')
    .update({
      subscription_status: 'active',
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('id', school.id);
}

/**
 * Handle invoice.payment_failed. Marks school as past_due. Logs a notes-only
 * entry on billing_history (no finance_tx — no money moved).
 */
export async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string | null;
  if (!customerId) return;
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (!school) return;

  await supabase.from('montree_billing_history').insert({
    school_id: school.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due || 0,
    currency: invoice.currency || 'usd',
    status: 'failed',
    description: `Payment failed: ${invoice.description || 'subscription'}`,
    invoice_pdf_url: invoice.invoice_pdf,
  }).then(({ error }) => {
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[billing] billing_history (failed) insert failed:', error.message);
    }
  });

  await supabase
    .from('montree_schools')
    .update({ subscription_status: 'past_due' })
    .eq('id', school.id);
}

/**
 * Handle subscription create/update — captures the subscription_id +
 * price_id + status + period dates on the school row. Run on
 * customer.subscription.created and .updated.
 */
// ── AI tier auto-flip ─────────────────────────────────────────────────────
//
// Session 98 — when Stripe subscription events land, automatically flip the
// school's AI tier feature flags so Tracy + AI reports activate / deactivate
// in lockstep with the subscription. Mirrors the super-admin tier-change
// pattern exactly (toggles ai_tier_haiku + ai_tier_sonnet, sets budget,
// clears budget cache).
//
// Architectural rule: the principal's "Activate Tracy" CTA → Stripe Checkout
// completing → webhook fires customer.subscription.created with status=
// 'trialing' (or 'active' if no trial) → this helper flips the school to
// premium. Subscription cancel → status='canceled' → this helper flips back
// to free.
//
// Super-admin manual tier override remains. enabled_by='stripe_webhook'
// distinguishes auto-flips from manual overrides in the audit log.

export type AiTierTarget = 'free' | 'premium';

/**
 * Map a Stripe subscription status to a tier action.
 * Returns null when the status implies "leave tier unchanged" (grace period
 * states like past_due where Stripe is retrying and we shouldn't flip down
 * yet).
 */
export function tierForSubscriptionStatus(status: string): AiTierTarget | null {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'premium';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'free';
    case 'past_due':
    case 'incomplete':
    case 'paused':
    default:
      // Grace periods and unknown states — leave the existing tier alone.
      // Stripe will retry payment automatically and eventually move to
      // 'active' / 'unpaid' / 'canceled'.
      return null;
  }
}

/**
 * Set a school's AI tier (free / premium) by upserting feature flags +
 * adjusting the monthly AI budget. Mirrors the super-admin tier-change
 * pattern in app/api/montree/super-admin/schools/route.ts.
 *
 * `enabledBy` is recorded for audit. Defaults to 'stripe_webhook' when called
 * from this module's webhook handlers.
 */
export async function setSchoolAiTier(
  supabase: SupabaseClient,
  schoolId: string,
  tier: AiTierTarget,
  enabledBy: string = 'stripe_webhook'
): Promise<void> {
  const enable = tier === 'premium';

  // Upsert both feature flags atomically (matching super admin route logic).
  for (const key of ['ai_tier_haiku', 'ai_tier_sonnet'] as const) {
    const { error } = await supabase
      .from('montree_school_features')
      .upsert(
        { school_id: schoolId, feature_key: key, enabled: enable, enabled_by: enabledBy },
        { onConflict: 'school_id,feature_key' }
      );
    if (error) {
      console.error(`[billing] setSchoolAiTier: failed to set ${key} for ${schoolId}:`, error);
      // Continue best-effort — don't throw inside a webhook handler.
    }
  }

  // Match super-admin pattern: free → $0/hard_limit, premium → $9999/warn.
  const budget = tier === 'premium' ? 9999 : 0;
  const action = tier === 'premium' ? 'warn' : 'hard_limit';
  const { error: budgetErr } = await supabase
    .from('montree_schools')
    .update({ monthly_ai_budget_usd: budget, ai_budget_action: action })
    .eq('id', schoolId);
  if (budgetErr) {
    console.error('[billing] setSchoolAiTier: failed to set budget for', schoolId, budgetErr);
  }

  clearBudgetCache(schoolId);

  console.log(`[billing] school ${schoolId} flipped to tier=${tier} via ${enabledBy}`);
}

export async function handleSubscriptionUpsert(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (!school) {
    console.warn('[billing] subscription event for unknown customer', customerId);
    return;
  }

  const item = subscription.items.data[0];
  const status = subscription.status;
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  await supabase
    .from('montree_schools')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id_active: item?.price.id || null,
      subscription_status: status,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEnd,
      billing_quantity: item?.quantity || null,
      monthly_charge_estimate_cents: (item?.quantity || 0) * PRICE_PER_STUDENT_CENTS,
      // Don't overwrite last_synced_to_stripe_at — that tracks our outbound
      // syncs, not Stripe's inbound webhooks.
    })
    .eq('id', school.id);

  // Auto-flip AI tier based on subscription status.
  //   active / trialing → premium  (Tracy + Sonnet reports unlocked)
  //   canceled / unpaid / incomplete_expired → free  (AI gates close)
  //   past_due / incomplete → leave unchanged (grace period; Stripe is
  //   retrying payment automatically)
  const tierTarget = tierForSubscriptionStatus(status);
  if (tierTarget) {
    await setSchoolAiTier(supabase, school.id, tierTarget, 'stripe_webhook');
  } else {
    console.log(
      `[billing] subscription status=${status} for school ${school.id} — tier left unchanged (grace period)`
    );
  }

  // Reference periodStart so it's not flagged as unused (currently unused
  // but useful for future Phase 6 period analysis).
  void currentPeriodStart;
}

/**
 * Handle subscription deletion (canceled at period end OR immediately).
 * Marks school as canceled.
 */
export async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  // Find the school first so we can flip its AI tier off.
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  await supabase
    .from('montree_schools')
    .update({ subscription_status: 'canceled' })
    .eq('stripe_customer_id', customerId);

  if (school) {
    await setSchoolAiTier(supabase, school.id, 'free', 'stripe_webhook');
  }
}

/**
 * Handle charge.refunded — write a negative income row to the ledger so
 * Phase 5's payout calculator nets it out.
 */
export async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  eventId: string
): Promise<void> {
  const customerId = charge.customer as string | null;
  if (!customerId) return;
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (!school) return;

  const refundedCents = charge.amount_refunded || 0;
  if (refundedCents === 0) return;

  const currency = (charge.currency || 'usd').toUpperCase();

  await insertFinanceTx(supabase, {
    occurred_at: new Date((charge.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    type: 'income',
    category: 'refund',
    description: `Refund for ${school.name || school.id}`,
    school_id: school.id,
    stripe_charge_id: charge.id,
    original_currency: currency,
    original_amount: -refundedCents / 100,
    fx_rate: 1.0,
    usd_amount: -refundedCents / 100,
    source: 'stripe_webhook',
    source_ref: `${eventId}:refund`,
    notes: 'Negative income — Phase 5 payout calc nets this against the same school for the period',
  });
}
