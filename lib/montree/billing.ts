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
// 🚨 Pricing model (Sep 7 2026 — 3-TIER, supersedes the Jul-6 Starter/Premium
// model and the original flat $7/student):
//   basic $12/year/school · lite $20/month/school · full $3/active child/month
//   with a $30/month floor (quantity floor of 10). NO free trial — new schools
//   land on Basic with a card required. See lib/montree/plans/* for the
//   entitlement side; this module owns the money side.

import Stripe from 'stripe';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { getSupabase } from '@/lib/supabase-client';
// clearBudgetCache is no longer called here — applyPlan (which setSchoolAiTier
// now delegates to) owns budget writes AND the cache invalidation.
import { isPeriodClosed } from '@/lib/montree/finance/period-lock';
import type { Plan } from '@/lib/montree/plans/types';
import { fullPlanQuantity, toPlan } from '@/lib/montree/plans/types';
import { applyPlan } from '@/lib/montree/plans/apply-plan';
import { TIER_TO_PLAN } from '@/lib/montree/reports/resolve-model';

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

// ---------------------------------------------------------------------------
// PINNED STRIPE API VERSION — read this before touching anything Stripe-shaped
// ---------------------------------------------------------------------------
//
// This account deliberately talks to Stripe's 2024-12-18 "acacia" API. The
// installed SDK (stripe@20) ships types for 2026-01-28 "clover" ONLY — Stripe's
// own docs say the typings "only reflect the latest API version" and tell you to
// silence the difference file-wide. We do not silence it; instead the three
// places where acacia and clover genuinely disagree are bridged below, each
// named and explained, so the divergence is greppable:
//
//   1. Stripe.StripeConfig['apiVersion'] admits only the SDK's latest version.
//   2. Subscription.current_period_start/_end moved onto the subscription ITEM
//      in clover (see acaciaSubscriptionPeriod()).
//   3. Invoice payment_method_types dropped 'alipay' in clover — and Alipay is
//      the whole point of the China rail (see CHINA_RAIL_PAYMENT_METHODS).
//
// 🚨 DO NOT "fix" this by bumping the version string. Whether to move to clover
// is a billing decision, not a typing one: at minimum it changes where the
// period dates live and may remove Alipay as an invoice payment method, which
// would break Chinese schools' invoices.
// Widened to `string` on purpose: the literal type is not in the SDK's
// LatestApiVersion union, and asserting the config object would be a
// non-overlapping conversion. The runtime constructor takes any version string.
const STRIPE_API_VERSION: string = '2024-12-18.acacia';

/**
 * Get the Stripe client. THROWS if not configured — all callers must check
 * `getBillingConfig().configured` first.
 */
function getStripeClient(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY missing — call getBillingConfig() first');
  }
  // See STRIPE_API_VERSION above: the config type only admits the SDK's newest
  // version, so the pin is asserted here and nowhere else.
  return new Stripe(secret, { apiVersion: STRIPE_API_VERSION } as Stripe.StripeConfig);
}

/**
 * The billing period of a subscription, in Unix seconds.
 *
 * On acacia these live on the Subscription; on clover they moved onto each
 * subscription ITEM. Read whichever is present so this keeps working across the
 * version change rather than silently returning null the day the pin moves.
 */
function acaciaSubscriptionPeriod(
  subscription: Stripe.Subscription,
): { start: number | null; end: number | null } {
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const item = subscription.items.data[0];
  return {
    start: legacy.current_period_start ?? item?.current_period_start ?? null,
    end: legacy.current_period_end ?? item?.current_period_end ?? null,
  };
}

/**
 * The payment methods offered on a China-rail invoice. Alipay is valid on the
 * pinned acacia API but is not in clover's PaymentMethodType union, so the list
 * is asserted here once instead of at the call site.
 */
const CHINA_RAIL_PAYMENT_METHODS = [
  'alipay',
  'wechat_pay',
] as Stripe.InvoiceCreateParams.PaymentSettings.PaymentMethodType[];

// Pricing constant. $7/student/month = 700 cents. This is Premium — the
// PLATFORM DEFAULT. Schools can carry a per-school override
// (montree_schools.billing_override_usd, migration 202). Always resolve the
// effective price via effectivePricePerStudentUsd() / Cents() — never read
// these constants directly when computing a charge.
export const PRICE_PER_STUDENT_USD = 7;
export const PRICE_PER_STUDENT_CENTS = 700;

// 🚨 3-TIER PRICING (Sep 7 2026) — Basic / Lite / Full.
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §4.
//
//   basic → STRIPE_PRICE_BASIC_YEAR        $12/year/school,  quantity 1
//   lite  → STRIPE_PRICE_LITE_MONTH        $20/month/school, quantity 1
//   full  → STRIPE_PRICE_FULL_CHILD_MONTH  $3/child/month,   quantity = max(10, activeChildren)
//
// The $30/month Full minimum is expressed as a QUANTITY FLOOR (Stripe has no
// native minimum-charge on a per-seat price). fullPlanQuantity() in
// lib/montree/plans/types.ts owns that floor — checkout, change-plan and
// sync-quantity all call it so they can never drift.
//
// STRIPE_PRICE_PER_STUDENT ($7 legacy Premium) stays READABLE so the webhook
// can still map an old subscription onto plan 'full'. It is never offered in
// checkout again. STRIPE_PRICE_STARTER is retired.
export const PLAN_PRICE_ENV: Record<Plan, string> = {
  basic: 'STRIPE_PRICE_BASIC_YEAR',
  lite: 'STRIPE_PRICE_LITE_MONTH',
  full: 'STRIPE_PRICE_FULL_CHILD_MONTH',
};

/** The configured Stripe Price ID for a plan, or null when the env is unset. */
export function planPriceId(plan: Plan): string | null {
  return process.env[PLAN_PRICE_ENV[plan]] || null;
}

/**
 * Reverse map: a Stripe Price ID → the plan it sells. Includes the legacy $7
 * per-student Price, which maps to 'full' so existing Premium subscriptions
 * resolve correctly on their next webhook.
 */
export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_BASIC_YEAR) return 'basic';
  if (priceId === process.env.STRIPE_PRICE_LITE_MONTH) return 'lite';
  if (priceId === process.env.STRIPE_PRICE_FULL_CHILD_MONTH) return 'full';
  if (priceId === process.env.STRIPE_PRICE_PER_STUDENT) return 'full'; // legacy $7 Premium
  return null;
}

/**
 * Resolve the effective per-student price (USD) for a school, honouring any
 * `billing_override_usd` override. Returns the platform default ($7) when no
 * override is set.
 *
 * Use this anywhere you'd be tempted to use PRICE_PER_STUDENT_USD directly —
 * Stripe Checkout line items, monthly charge estimates, principal-facing
 * billing copy.
 */
export function effectivePricePerStudentUsd(
  school: Pick<SchoolBillingRow, 'billing_override_usd'> | null | undefined
): number {
  const override = school?.billing_override_usd;
  // billing_override_usd is a Postgres numeric, which PostgREST hands back as a
  // string. Number() first so this is an arithmetic comparison, not a
  // string/number coercion TypeScript cannot see through.
  if (override !== null && override !== undefined && Number(override) >= 0) {
    return Number(override);
  }
  return PRICE_PER_STUDENT_USD;
}

/** Same as effectivePricePerStudentUsd, in cents. */
export function effectivePricePerStudentCents(
  school: Pick<SchoolBillingRow, 'billing_override_usd'> | null | undefined
): number {
  return Math.round(effectivePricePerStudentUsd(school) * 100);
}

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
  // Migration 202 — per-school override.
  // billing_override_usd is stored as a numeric DECIMAL in Postgres; Supabase
  // returns it as `number | string` depending on driver. We accept either
  // and normalise inside effectivePricePerStudentUsd().
  billing_override_usd: number | string | null;
  billing_override_note: string | null;
  // Migration 209 — three-rail inbound payments.
  payment_method: string | null;
  billing_cadence: string | null;
  next_invoice_due_at: string | null;
  manual_invoice_details: Record<string, unknown> | null;
}

const BILLING_FIELDS =
  'id, name, owner_email, billing_email, stripe_customer_id, stripe_subscription_id, stripe_price_id_active, subscription_status, trial_ends_at, current_period_end, billing_quantity, monthly_charge_estimate_cents, last_synced_to_stripe_at, billing_override_usd, billing_override_note, payment_method, billing_cadence, next_invoice_due_at, manual_invoice_details';

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

// ── Override Price resolution ─────────────────────────────────────────────
//
// When a school has billing_override_usd set, we need a Stripe Price object
// at that amount. Stripe Prices are immutable, so we either reuse an existing
// Montree-tagged override Price or create a new one. Process-lifetime cache
// keeps lookups cheap.

const OVERRIDE_PRICE_CACHE = new Map<number, string>();  // unit_amount_cents → price_id
let PRODUCT_ID_CACHE: string | null = null;              // resolved once per process

/**
 * Resolve the Stripe Product ID from the configured default Price. Cached for
 * the lifetime of the process. Returns null if Stripe isn't configured or the
 * lookup fails.
 */
async function getStripeProductId(stripe: Stripe): Promise<string | null> {
  if (PRODUCT_ID_CACHE) return PRODUCT_ID_CACHE;
  const defaultPriceId = process.env.STRIPE_PRICE_PER_STUDENT;
  if (!defaultPriceId) return null;
  try {
    const price = await stripe.prices.retrieve(defaultPriceId);
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (productId) PRODUCT_ID_CACHE = productId;
    return productId || null;
  } catch (err) {
    console.error('[billing] failed to resolve product id from default price:', err);
    return null;
  }
}

/**
 * Get or create a Stripe Price for a per-school override amount. Looks up
 * existing Montree-tagged override prices first to avoid creating duplicates.
 *
 * Returns null on any failure — callers should fall back to the default
 * price or surface the error.
 */
async function getOrCreateOverridePriceId(
  stripe: Stripe,
  unitAmountCents: number
): Promise<string | null> {
  if (unitAmountCents <= 0) return null;
  const cached = OVERRIDE_PRICE_CACHE.get(unitAmountCents);
  if (cached) return cached;

  const productId = await getStripeProductId(stripe);
  if (!productId) return null;

  try {
    // Look up existing Montree override Prices with matching amount. Stripe's
    // prices.list paginates at 100 max; we paginate manually if needed.
    let starting_after: string | undefined;
    for (let page = 0; page < 5; page++) {
      const list = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 100,
        type: 'recurring',
        ...(starting_after ? { starting_after } : {}),
      });
      const found = list.data.find(p =>
        p.unit_amount === unitAmountCents &&
        p.recurring?.interval === 'month' &&
        p.currency === 'usd' &&
        p.metadata?.montree_override === 'true'
      );
      if (found) {
        OVERRIDE_PRICE_CACHE.set(unitAmountCents, found.id);
        return found.id;
      }
      if (!list.has_more) break;
      starting_after = list.data[list.data.length - 1]?.id;
      if (!starting_after) break;
    }

    // No match — create a new Price.
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: unitAmountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: `Montree override $${(unitAmountCents / 100).toFixed(2)}/student/month`,
      metadata: {
        montree_override: 'true',
        amount_cents: String(unitAmountCents),
        source: 'montree_phase4_override',
      },
    });
    OVERRIDE_PRICE_CACHE.set(unitAmountCents, price.id);
    console.log('[billing] created override Price', price.id, 'at', unitAmountCents, 'cents');
    return price.id;
  } catch (err) {
    console.error('[billing] override price resolve failed for', unitAmountCents, 'cents:', err);
    return null;
  }
}

/**
 * Resolve the Stripe Price ID to use for a school — override Price if a
 * custom amount is set AND it differs from the platform default, otherwise
 * the configured STRIPE_PRICE_PER_STUDENT.
 */
async function resolvePriceIdForSchool(
  stripe: Stripe,
  school: Pick<SchoolBillingRow, 'billing_override_usd'>
): Promise<{ priceId: string | null; isOverride: boolean; reason?: string }> {
  const effectiveCents = effectivePricePerStudentCents(school);
  const defaultPriceId = process.env.STRIPE_PRICE_PER_STUDENT;
  if (!defaultPriceId) return { priceId: null, isOverride: false, reason: 'STRIPE_PRICE_PER_STUDENT missing' };
  if (effectiveCents === PRICE_PER_STUDENT_CENTS) {
    return { priceId: defaultPriceId, isOverride: false };
  }
  const overrideId = await getOrCreateOverridePriceId(stripe, effectiveCents);
  if (!overrideId) {
    return {
      priceId: null,
      isOverride: true,
      reason: `Could not resolve override Price at ${effectiveCents} cents`,
    };
  }
  return { priceId: overrideId, isOverride: true };
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
 * Create a Stripe Checkout session for a school. Returns the URL for the
 * principal to land on.
 *
 * 🚨 3-TIER PRICING (Sep 7 2026): `options.plan` is 'basic' | 'lite' | 'full'.
 * Anything else (including the retired 'starter'/'premium') coerces to
 * 'basic' — the safe, cheap default that every new signup lands on.
 *
 *   basic → STRIPE_PRICE_BASIC_YEAR,       quantity 1
 *   lite  → STRIPE_PRICE_LITE_MONTH,       quantity 1
 *   full  → STRIPE_PRICE_FULL_CHILD_MONTH, quantity = fullPlanQuantity(children)
 *
 * Founding 100 schools are forced to 'full' by the CALLER; they keep the $3
 * per-child Price (that IS the promise) and the $30 floor applies to them too
 * (director decision, Sep 7). A partner on billing_override_usd = 0 has no
 * charge to collect and is refused before this function (checkout route 400).
 *
 * NO TRIAL. `trial_period_days` is deliberately never passed — trials were
 * retired with this restructure. Card is collected at Checkout as before.
 *
 * The chosen plan is stamped onto subscription_data.metadata.montree_plan so
 * the webhook (handleSubscriptionUpsert) can confirm what was bought.
 */
export async function createSchoolCheckoutSession(
  supabase: SupabaseClient,
  schoolId: string,
  options: { successPath?: string; cancelPath?: string; plan?: Plan | string } = {}
): Promise<BillingResult<{ checkout_url: string; session_id: string }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }
  const plan: Plan = toPlan(options.plan) ?? 'basic';

  // Ensure customer exists.
  const customerResult = await getOrCreateStripeCustomer(supabase, schoolId);
  if (!customerResult.ok || !customerResult.data) {
    return { ok: false, configured: true, reason: customerResult.reason || 'Customer create failed' };
  }
  const customerId = customerResult.data.customer_id;

  // 🚨 Quantity by plan. Basic and Lite are FLAT per school (quantity 1);
  // Full is per active child with the $30 floor baked in by fullPlanQuantity.
  const quantity =
    plan === 'full' ? fullPlanQuantity(await countActiveStudents(supabase, schoolId)) : 1;

  const stripe = getStripeClient();

  // Reload school here so we have the latest billing_override_usd (the school
  // we read at the top of this function via getOrCreateStripeCustomer was a
  // pre-customer fetch; the override could've been set in between).
  const schoolForPrice = await loadSchoolBilling(supabase, schoolId);
  if (!schoolForPrice) {
    return { ok: false, configured: true, reason: 'School not found' };
  }

  // 🚨 3-tier Price resolution — one env Price per plan, no override
  // machinery. Founding 100 sits on the SAME $3 Full Price everyone else
  // pays; the promise is that the $3 never rises, not that it is bespoke, so
  // there is nothing per-school to resolve. (resolvePriceIdForSchool + the
  // override-Price cache remain for syncSubscriptionQuantity's legacy
  // per-student subscriptions.)
  const resolvedPriceId = planPriceId(plan);
  if (!resolvedPriceId) {
    return {
      ok: false,
      configured: false,
      reason: `Plan '${plan}' not configured — ${PLAN_PRICE_ENV[plan]} env is unset. Set the Price ID in Railway.`,
    };
  }
  const priceId: string = resolvedPriceId;
  console.log('[billing] checkout for school', schoolId, 'plan', plan, 'Price', priceId, 'qty', quantity);

  const successPath = options.successPath || '/montree/admin/billing?status=success';
  const cancelPath = options.cancelPath || '/montree/admin/billing?status=canceled';

  // 🚨 NO TRIAL (Sep 7 2026). The old "first month is on us" trial_period_days
  // block was removed with the 3-tier restructure — every new school lands on
  // Basic with a card required, and there is no free window to carry into
  // Stripe. trial_ends_at / subscription_status='trialing' remain as columns
  // but are never read for entitlement again. Do not reintroduce a trial here
  // without changing the plan doc first.

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      subscription_data: {
        // montree_plan is the canonical tier signal the webhook reads
        // (handleSubscriptionUpsert, amendment A9). Stripe copies
        // subscription_data.metadata onto the created subscription.
        metadata: { school_id: schoolId, source: 'montree_phase4', montree_plan: plan },
      },
      success_url: `${cfg.app_url}${successPath}`,
      cancel_url: `${cfg.app_url}${cancelPath}`,
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      // 🚨 Card required upfront — even when subscription enters trial mode,
      // Stripe collects + validates the payment method at Checkout. This is
      // the canonical "subscription from day 1" posture per the pricing
      // model change: no free-trial window without card-on-file.
      payment_method_collection: 'always',
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
 * 🚨 Move an EXISTING Stripe subscription onto a different plan (Sep 7 2026).
 * Upgrade or downgrade — one subscription item, swapped price + quantity.
 *
 *   UPGRADE   (basic→lite/full, lite→full): proration_behavior
 *             'create_prorations'. Stripe credits the unused portion of the
 *             annual Basic charge automatically. Expect an odd-looking first
 *             invoice; the Stripe portal explains it better than we can.
 *   DOWNGRADE (full→lite/basic, lite→basic): proration_behavior 'none' and
 *             the billing cycle anchor untouched, so the school KEEPS what it
 *             already paid for until the period ends.
 *
 * 🚨 THIS FUNCTION DOES NOT WRITE montree_schools.plan. The WEBHOOK is the
 * only writer — always. Applying a downgrade optimistically here is how
 * Stripe and our plan column diverge; the customer.subscription.updated event
 * that this call triggers carries the truth and applies it.
 *
 * A school with no Stripe subscription gets {ok:false, reason:'no_subscription'}
 * — the caller should start a Checkout instead.
 */
export async function changeSchoolPlan(
  supabase: SupabaseClient,
  schoolId: string,
  plan: Plan
): Promise<BillingResult<{ subscription_id: string; plan: Plan; quantity: number; direction: 'upgrade' | 'downgrade' | 'same' }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) return { ok: false, configured: true, reason: 'School not found' };
  if (!school.stripe_subscription_id) {
    return { ok: false, configured: true, reason: 'no_subscription' };
  }

  const targetPriceId = planPriceId(plan);
  if (!targetPriceId) {
    return {
      ok: false,
      configured: false,
      reason: `Plan '${plan}' not configured — ${PLAN_PRICE_ENV[plan]} env is unset.`,
    };
  }

  const quantity =
    plan === 'full' ? fullPlanQuantity(await countActiveStudents(supabase, schoolId)) : 1;

  const RANK: Record<Plan, number> = { basic: 0, lite: 1, full: 2 };
  const currentPlan = planForPriceId(school.stripe_price_id_active);
  const direction: 'upgrade' | 'downgrade' | 'same' = !currentPlan
    ? 'upgrade'
    : RANK[plan] > RANK[currentPlan]
      ? 'upgrade'
      : RANK[plan] < RANK[currentPlan]
        ? 'downgrade'
        : 'same';

  const stripe = getStripeClient();
  try {
    const subscription = await stripe.subscriptions.retrieve(school.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) {
      return { ok: false, configured: true, reason: 'Subscription has no items — Stripe configuration broken' };
    }
    await stripe.subscriptions.update(school.stripe_subscription_id, {
      items: [{ id: item.id, price: targetPriceId, quantity }],
      proration_behavior: direction === 'downgrade' ? 'none' : 'create_prorations',
      metadata: { school_id: schoolId, montree_plan: plan },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Subscription plan change failed';
    console.error('[billing] change plan failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  console.log(
    `[billing] school ${schoolId} plan change ${currentPlan ?? 'legacy'} → ${plan} (${direction}, qty ${quantity}); webhook will write the plan column`
  );
  return {
    ok: true,
    configured: true,
    data: { subscription_id: school.stripe_subscription_id, plan, quantity, direction },
  };
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
): Promise<BillingResult<{ previous_quantity: number | null; new_quantity: number; updated: boolean; price_changed: boolean }>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) return { ok: false, configured: true, reason: 'School not found' };

  // Effective price per student in cents — honours billing_override_usd.
  const effectiveCents = effectivePricePerStudentCents(school);

  if (!school.stripe_subscription_id) {
    // Not subscribed — nothing to sync. We DO update billing_quantity in our
    // DB so the dashboard's "monthly estimate" stays current, but no Stripe
    // call. Estimate uses the effective (override-aware) price so the principal
    // sees their actual rate even before checkout.
    const headcount = await countActiveStudents(supabase, schoolId);
    await supabase
      .from('montree_schools')
      .update({
        billing_quantity: headcount,
        monthly_charge_estimate_cents: headcount * effectiveCents,
      })
      .eq('id', schoolId);
    return {
      ok: true,
      configured: true,
      data: {
        previous_quantity: school.billing_quantity,
        new_quantity: headcount,
        updated: false,
        price_changed: false,
      },
    };
  }

  // 🚨 3-tier quantity (Sep 7 2026). Basic and Lite are FLAT per school —
  // their Stripe quantity is always 1 and headcount must never touch it.
  // Full is per active child WITH the $30 floor: fullPlanQuantity owns that
  // floor, and it MUST be applied here too or the next sync silently drops a
  // Full school below the minimum (plan §10 risk 5).
  // A subscription on none of the three plan Prices is a legacy per-student
  // subscription — leave its behaviour exactly as it was (raw headcount).
  const headcount = await countActiveStudents(supabase, schoolId);
  const subscribedPlan = planForPriceId(school.stripe_price_id_active);
  const newQuantity =
    subscribedPlan === 'full'
      ? fullPlanQuantity(headcount)
      : subscribedPlan === 'basic' || subscribedPlan === 'lite'
        ? 1
        : headcount;
  const previousQuantity = school.billing_quantity;

  const stripe = getStripeClient();
  let priceChanged = false;
  // Unit price used for the stored monthly estimate. For a plan subscription
  // it is whatever Stripe actually charges per unit (Basic $12/yr, Lite
  // $20/mo, Full $3/child/mo); for a legacy per-student subscription it stays
  // the override-aware effective price.
  let estimateUnitCents = effectiveCents;
  try {
    // Fetch the subscription to get the item ID we need to update + check if
    // the item's current price matches the effective price (override may have
    // changed since last sync).
    const subscription = await stripe.subscriptions.retrieve(school.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) {
      return { ok: false, configured: true, reason: 'Subscription has no items — Stripe configuration broken' };
    }

    const currentItemUnitAmount = item.price.unit_amount;
    // 🚨 The override-Price swap belongs to LEGACY per-student subscriptions
    // only. A subscription already sitting on one of the three plan Prices
    // must never be "corrected" toward effectivePricePerStudentCents — Basic
    // ($1200/yr) and Lite ($2000/mo) would look like a mismatch against $700
    // and get swapped onto the per-student Price. Quantity still syncs.
    const priceMismatch =
      subscribedPlan === null && currentItemUnitAmount !== effectiveCents;
    if (subscribedPlan !== null && typeof currentItemUnitAmount === 'number') {
      estimateUnitCents = currentItemUnitAmount;
    }
    const quantityMismatch = previousQuantity !== newQuantity;

    // Skip the Stripe round-trip when nothing's changed.
    if (!options.force && !priceMismatch && !quantityMismatch) {
      return {
        ok: true,
        configured: true,
        data: {
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          updated: false,
          price_changed: false,
        },
      };
    }

    // Resolve target Price ID (default or override) when the price needs to change.
    let targetPriceId: string | undefined;
    if (priceMismatch) {
      const priceResult = await resolvePriceIdForSchool(stripe, school);
      if (!priceResult.priceId) {
        return {
          ok: false,
          configured: true,
          reason: priceResult.reason || 'Failed to resolve Price during sync',
        };
      }
      targetPriceId = priceResult.priceId;
      priceChanged = true;
      console.log(
        '[billing] sync swapping price for school', schoolId,
        'from', currentItemUnitAmount, 'to', effectiveCents, 'cents',
        priceResult.isOverride ? '(override)' : '(default)'
      );
    }

    await stripe.subscriptionItems.update(item.id, {
      quantity: Math.max(1, newQuantity),  // Stripe rejects quantity=0; floor to 1
      ...(targetPriceId ? { price: targetPriceId } : {}),
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
      monthly_charge_estimate_cents: newQuantity * estimateUnitCents,
      last_synced_to_stripe_at: new Date().toISOString(),
    })
    .eq('id', schoolId);

  return {
    ok: true,
    configured: true,
    data: {
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      updated: true,
      price_changed: priceChanged,
    },
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
  // 🚨 Session 113 V2 Finance audit F-P-1 — surface late writes to closed
  // periods. Webhooks and the aggregator can land days after period close;
  // we intentionally allow the write (real money events MUST be recorded)
  // but log loudly so the accountant can spot post-close adjustments. The
  // hard refusal lives at the route layer for manual + cron writes; this
  // is the soft-audit layer for system writes that can't be rejected.
  try {
    const periodMonth = periodMonthOfDate(new Date(entry.occurred_at));
    const closed = await isPeriodClosed(supabase, periodMonth);
    if (closed) {
      console.warn(
        '[billing] LATE WRITE TO CLOSED PERIOD — finance_tx',
        JSON.stringify({
          period_month: periodMonth,
          source: entry.source,
          source_ref: entry.source_ref,
          type: entry.type,
          usd_amount: entry.usd_amount,
          occurred_at: entry.occurred_at,
          school_id: entry.school_id ?? null,
          agent_id: entry.agent_id ?? null,
        })
      );
      // Audit hook: still write the row. Accountant scans logs for this
      // string and decides whether to reopen the period for adjustment.
    }
  } catch (auditErr) {
    // Defensive — never let the audit hook block a real money write.
    console.error('[billing] period-lock audit hook failed (non-fatal)', auditErr);
  }

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
// school's AI tier feature flags so Astra + AI reports activate / deactivate
// in lockstep with the subscription. Mirrors the super-admin tier-change
// pattern exactly (toggles ai_tier_haiku + ai_tier_sonnet, sets budget,
// clears budget cache).
//
// Architectural rule: the principal's "Activate Astra" CTA → Stripe Checkout
// completing → webhook fires customer.subscription.created with status=
// 'trialing' (or 'active' if no trial) → this helper flips the school to
// premium. Subscription cancel → status='canceled' → this helper flips back
// to free.
//
// Super-admin manual tier override remains. enabled_by='stripe_webhook'
// distinguishes auto-flips from manual overrides in the audit log.

// 🚨 Launch pricing (Jul 6 2026) — 'haiku' is the Starter ($3) target.
//   premium → ai_tier_sonnet=true  (Sonnet reports + photo fallback + Guru)
//   haiku   → ai_tier_haiku=true    (Haiku everything; NEVER escalates to Sonnet)
//   free    → both off              (no AI; every AI route 402s)
export type AiTierTarget = 'free' | 'haiku' | 'premium';

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
  // 🚨 COMPATIBILITY WRAPPER (Sep 7 2026). This used to be the second of two
  // divergent grant mechanics. It now delegates to applyPlan — the ONE
  // implementation — so the webhook path, the super-admin path and the
  // founding/partner redemption path can never drift again.
  //   free → basic · haiku → lite · premium → full
  // Still best-effort: applyPlan never throws, and this stays void-returning
  // so the hot webhook handler is unchanged for its callers.
  const plan = TIER_TO_PLAN[tier === 'premium' ? 'sonnet' : tier];
  await applyPlan(supabase, schoolId, plan, 'stripe', enabledBy);
}

export async function handleSubscriptionUpsert(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  // Read prior status BEFORE update so we can detect the trialing→active
  // transition for the conversion email. founding_member (migration 286) is
  // read so the legacy $3-price heuristic below never mis-classifies a
  // Founding 100 school (which pays $3 but must stay Premium) as Starter.
  // plan_override (migration 349) is read so a super-admin force can never be
  // clobbered by Stripe. Resilient select: if the column doesn't exist yet
  // (42703 — migration 349 lagging) fall back to the pre-349 column set.
  let school:
    | {
        id: string;
        name?: string | null;
        subscription_status: string | null;
        owner_email?: string | null;
        owner_name?: string | null;
        founding_member?: boolean | null;
        plan_override?: string | null;
      }
    | null = null;
  const withPlan = await supabase
    .from('montree_schools')
    .select('id, name, subscription_status, owner_email, owner_name, founding_member, plan_override')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (withPlan.error) {
    console.warn('[billing] plan_override select failed (run migration 349):', withPlan.error.message);
    const fallback = await supabase
      .from('montree_schools')
      .select('id, name, subscription_status, owner_email, owner_name, founding_member')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    school = fallback.data ?? null;
  } else {
    school = withPlan.data ?? null;
  }
  if (!school) {
    console.warn('[billing] subscription event for unknown customer', customerId);
    return;
  }
  const priorStatus = school.subscription_status;
  const isFoundingMember = school.founding_member === true;
  const hasPlanOverride = !!toPlan(school.plan_override);

  const item = subscription.items.data[0];
  const status = subscription.status;
  const period = acaciaSubscriptionPeriod(subscription);
  const currentPeriodStart = period.start
    ? new Date(period.start * 1000).toISOString()
    : null;
  const currentPeriodEnd = period.end
    ? new Date(period.end * 1000).toISOString()
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // Compute estimate from Stripe's actual unit_amount (which reflects any
  // override Price already in effect), not the platform default. Falls back
  // to the platform default only if Stripe didn't return a unit_amount.
  const itemUnitAmount = item?.price.unit_amount ?? PRICE_PER_STUDENT_CENTS;
  const quantity = item?.quantity || 0;

  await supabase
    .from('montree_schools')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id_active: item?.price.id || null,
      subscription_status: status,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEnd,
      billing_quantity: item?.quantity || null,
      monthly_charge_estimate_cents: quantity * itemUnitAmount,
      // Don't overwrite last_synced_to_stripe_at — that tracks our outbound
      // syncs, not Stripe's inbound webhooks.
    })
    .eq('id', school.id);

  // 🚨 3-TIER PRICING (Sep 7 2026). Map the subscription onto a plan.
  // Decision order:
  //   1. The PRICE ID — the most reliable signal, because it is what Stripe
  //      is actually charging. planForPriceId also maps the legacy $7
  //      per-student Price onto 'full' so old Premium subs stay whole.
  //   2. subscription.metadata.montree_plan (stamped at checkout) as tiebreak
  //      for a Price we don't recognise.
  //   3. Legacy unit-amount heuristic (700¢ / 300¢).
  //   4. Terminal statuses force 'basic'; grace statuses leave it alone.
  //
  // 🚨 NEVER overwrite the plan when plan_override is set or the school is a
  // founding member. Those two beat Stripe by design (resolvePlan rules 2+3),
  // and writing the column anyway would make super-admin's own display lie.
  const planFromMetadata =
    typeof subscription.metadata?.montree_plan === 'string'
      ? subscription.metadata.montree_plan.toLowerCase()
      : null;

  const planFromPrice = planForPriceId(item?.price.id ?? null);
  const planFromMetadataNarrowed = toPlan(planFromMetadata);

  let targetPlan: Plan | null = planFromPrice ?? planFromMetadataNarrowed;
  if (!targetPlan) {
    // Legacy unit-amount heuristic: $7/student → full; $3 → lite, EXCEPT for a
    // founding member, who legitimately pays $3 while on Full.
    if (itemUnitAmount === PRICE_PER_STUDENT_CENTS) targetPlan = 'full';
    else if (itemUnitAmount === 300 && !isFoundingMember) targetPlan = 'lite';
  }
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
    // Product keeps working, AI stops — much softer than the old total 402.
    targetPlan = 'basic';
  } else if (status === 'past_due' || status === 'incomplete' || status === 'paused') {
    // Grace — Stripe is still retrying. Leave the plan exactly as it is.
    targetPlan = null;
  }

  if (hasPlanOverride || isFoundingMember) {
    console.log(
      `[billing] school ${school.id} has ${hasPlanOverride ? 'plan_override' : 'founding_member'} — Stripe plan write SKIPPED (would have been ${targetPlan ?? 'unchanged'})`
    );
  } else if (targetPlan) {
    await applyPlan(supabase, school.id, targetPlan, 'stripe', 'stripe_webhook');
  } else {
    console.log(
      `[billing] subscription status=${status} for school ${school.id} — plan left unchanged (grace period)`
    );
  }

  // Record which Price is live so sync-quantity and the billing page can read
  // the plan back without a Stripe round-trip. Non-fatal pre-migration-349.
  if (item?.price.id) {
    const { error: priceIdErr } = await supabase
      .from('montree_schools')
      .update({ stripe_price_id: item.price.id })
      .eq('id', school.id);
    if (priceIdErr) {
      console.warn('[billing] stripe_price_id write failed (run migration 349):', priceIdErr.message);
    }
  }

  // Reference periodStart so it's not flagged as unused (currently unused
  // but useful for future Phase 6 period analysis).
  void currentPeriodStart;

  // ── Trial → paid conversion email. Fire-and-forget.
  // Trigger: status transitions from 'trialing' (or null/incomplete) → 'active'
  // AND we have an owner email to write to.
  const becameActive =
    status === 'active' &&
    priorStatus !== 'active' &&
    priorStatus !== 'past_due'; // past_due → active is just retry recovery, not a conversion
  if (becameActive) {
    const owner = school as { owner_email?: string | null; owner_name?: string | null; name?: string | null };
    if (owner.owner_email) {
      // Lazy import to avoid pulling email module into hot webhook path on every event.
      import('./email')
        .then(({ sendTrialConvertedEmail }) =>
          sendTrialConvertedEmail(
            owner.owner_email as string,
            owner.owner_name || (owner.owner_email as string).split('@')[0],
            owner.name || 'your school'
          )
        )
        .catch((err) => console.error('[billing] trial-converted email failed', err));
    }
  }
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

  // Find the school first so we can flip its AI tier off. Also read
  // founding_member / plan_override — 🚨 audit fix (Sep 7 2026): this
  // handler used to flip every canceled subscription's plan to 'basic'
  // unconditionally, which is the SAME footgun handleSubscriptionUpsert
  // guards against (a founding/overridden school's `plan` column should
  // never be clobbered by Stripe). resolvePlan's precedence (override/
  // founding beat the plan column) already protects live entitlement, but
  // writing plan='basic' anyway leaves the column lying to anything that
  // reads it directly (super-admin display, exports) — so guard here too,
  // matching handleSubscriptionUpsert exactly.
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, founding_member, plan_override')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  await supabase
    .from('montree_schools')
    .update({ subscription_status: 'canceled' })
    .eq('stripe_customer_id', customerId);

  if (school) {
    const hasPlanOverride = !!toPlan((school as { plan_override?: string | null }).plan_override);
    const isFoundingMember = (school as { founding_member?: boolean | null }).founding_member === true;
    if (hasPlanOverride || isFoundingMember) {
      console.log(
        `[billing] school ${school.id} has ${hasPlanOverride ? 'plan_override' : 'founding_member'}` +
          ' — subscription.deleted plan flip SKIPPED (would have been basic)'
      );
    } else {
      await setSchoolAiTier(supabase, school.id, 'free', 'stripe_webhook');
    }
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

// ── Alipay / WeChat invoice rail (Phase B) ────────────────────────────────
//
// Architectural rule #82: Alipay/WeChat invoices are NOT subscriptions —
// they're recurring one-time Stripe invoices generated by cron. Stripe's
// recurring rails require card or SEPA mandate; Alipay/WeChat are
// payment_method=alipay/wechat_pay in `collection_method: 'send_invoice'`
// (one-time, finalised → hosted_invoice_url with QR codes).
//
// Architectural rule #86: Annual prepayment = monthly amount × 12 × 0.9
// (10% discount — strategic decision locked in INBOUND_PAYMENTS_PLAN.md §1).
// One annual invoice, one Stripe payment, but recognise revenue ratably as
// 12 monthly finance_tx rows at receipt time.
//
// Architectural rule #88: Stripe Alipay/WeChat payment IS Stripe. All
// Stripe-side guards apply: idempotency on event_id, 200-on-error to avoid
// retry storms, webhook signature verification.

/** Annual discount factor — 10% off when school pays for 12 months upfront. */
export const ANNUAL_DISCOUNT_FACTOR = 0.9;

/** Default days_until_due for alipay invoices. Overridable per-school via manual_invoice_details.payment_terms_days. */
export const DEFAULT_INVOICE_TERMS_DAYS = 14;

/** Dunning windows (days since first past_due) for the dunning cron. */
export const DUNNING_REMINDER_DAYS = [1, 7, 13] as const;
/** Day at which past_due flips to canceled if still unpaid. */
export const DUNNING_CANCEL_DAY = 14;

/**
 * Compute the line-item total (cents) for an alipay invoice.
 * Monthly: students × per-student-cents.
 * Annual: students × per-student-cents × 12 × 0.9 (10% discount).
 *
 * Locale-aware via the school billing override (billing_override_usd).
 */
export function computeAlipayInvoiceTotalCents(
  school: Pick<SchoolBillingRow, 'billing_override_usd'>,
  quantity: number,
  cadence: 'monthly' | 'annual'
): number {
  const unitCents = effectivePricePerStudentCents(school);
  const safeQty = Math.max(1, quantity);
  if (cadence === 'annual') {
    // 20 × 700 × 12 × 0.9 = 151,200 cents = $1,512.00
    return Math.round(safeQty * unitCents * 12 * ANNUAL_DISCOUNT_FACTOR);
  }
  return safeQty * unitCents;
}

/**
 * Create a finalised Stripe Invoice with Alipay + WeChat Pay payment methods.
 * Sends the hosted_invoice_url to the school's billing_email and bumps
 * next_invoice_due_at to prevent the cron from re-issuing.
 *
 * Idempotency: the cron filters on `next_invoice_due_at IS NULL OR <=
 * NOW() + INTERVAL '7 days'`, so calling this twice on a fresh window will
 * generate two invoices — that's a bug in the caller, not this function.
 *
 * Trial gate: refuses to issue when subscription_status='trialing' AND
 * trial_ends_at is still in the future. Cron filters this case out, but
 * defence-in-depth here too.
 */
export async function createAlipayInvoice(
  supabase: SupabaseClient,
  schoolId: string
): Promise<BillingResult<{
  invoice_id: string;
  hosted_invoice_url: string;
  amount_due_cents: number;
  cadence: 'monthly' | 'annual';
  due_date: string | null;
}>> {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return { ok: false, configured: false, reason: cfg.reason };
  }

  const school = await loadSchoolBilling(supabase, schoolId);
  if (!school) return { ok: false, configured: true, reason: 'School not found' };
  if (school.payment_method !== 'alipay_invoice') {
    return {
      ok: false,
      configured: true,
      reason: `School payment_method is ${school.payment_method || 'stripe_subscription'}, not alipay_invoice`,
    };
  }

  // Trial gate — don't bill during the free 30-day trial. Cron filters this,
  // but defence-in-depth.
  if (school.subscription_status === 'trialing' && school.trial_ends_at) {
    const trialEnd = new Date(school.trial_ends_at).getTime();
    if (trialEnd > Date.now()) {
      return {
        ok: false,
        configured: true,
        reason: `School is still in trial until ${school.trial_ends_at} — no invoice generated`,
      };
    }
  }

  // Ensure Stripe customer exists.
  const customerResult = await getOrCreateStripeCustomer(supabase, schoolId);
  if (!customerResult.ok || !customerResult.data) {
    return { ok: false, configured: true, reason: customerResult.reason || 'Customer create failed' };
  }
  const customerId = customerResult.data.customer_id;

  const quantity = Math.max(1, await countActiveStudents(supabase, schoolId));
  const cadence: 'monthly' | 'annual' = school.billing_cadence === 'annual' ? 'annual' : 'monthly';
  const totalCents = computeAlipayInvoiceTotalCents(school, quantity, cadence);

  const details = (school.manual_invoice_details || {}) as Record<string, unknown>;
  const termsDays = typeof details.payment_terms_days === 'number' && details.payment_terms_days > 0
    ? Math.min(60, Math.floor(details.payment_terms_days))
    : DEFAULT_INVOICE_TERMS_DAYS;

  // Description rendered on the invoice line item.
  const now = new Date();
  const periodLabel = cadence === 'annual'
    ? `annual ${now.getUTCFullYear()}`
    : new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const lineDescription = `Montree subscription — ${periodLabel} — ${quantity} student${quantity === 1 ? '' : 's'}`;

  const stripe = getStripeClient();

  let invoice: Stripe.Invoice;
  try {
    // 1. Create draft invoice attached to customer.
    invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: termsDays,
      // Both Alipay AND WeChat Pay enabled (locked strategic decision).
      payment_settings: {
        payment_method_types: CHINA_RAIL_PAYMENT_METHODS,
      },
      auto_advance: true,
      description: `Montree ${cadence === 'annual' ? 'annual' : 'monthly'} subscription`,
      metadata: {
        montree_school_id: schoolId,
        montree_cadence: cadence,
        montree_rail: 'alipay_invoice',
        montree_quantity: String(quantity),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe invoice create failed';
    console.error('[billing] alipay invoice create failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  if (!invoice.id) {
    return { ok: false, configured: true, reason: 'Stripe returned no invoice ID' };
  }

  // 2. Add a single line item with the full amount. Using `add_invoice_items`
  // pattern keeps it simple — no Stripe Price object needed for Alipay path.
  try {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: totalCents,
      currency: 'usd',
      description: lineDescription,
      metadata: {
        montree_school_id: schoolId,
        montree_cadence: cadence,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe invoice item create failed';
    console.error('[billing] alipay invoice item create failed for school', schoolId, ':', msg);
    // Best-effort void of the empty invoice so we don't leave it in Stripe.
    try {
      await stripe.invoices.voidInvoice(invoice.id);
    } catch (voidErr) {
      console.error('[billing] alipay invoice void after item-create failure also failed', voidErr);
    }
    return { ok: false, configured: true, reason: msg };
  }

  // 3. Finalise so we get the hosted_invoice_url with the QR.
  let finalised: Stripe.Invoice;
  try {
    finalised = await stripe.invoices.finalizeInvoice(invoice.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe invoice finalize failed';
    console.error('[billing] alipay invoice finalize failed for school', schoolId, ':', msg);
    return { ok: false, configured: true, reason: msg };
  }

  const hostedUrl = finalised.hosted_invoice_url || null;
  const dueDate = finalised.due_date ? new Date(finalised.due_date * 1000).toISOString() : null;

  // 4. Bump next_invoice_due_at on the school so the cron skips for the
  // expected window. monthly = +30d, annual = +365d.
  const nextDueAt = new Date(Date.now() + (cadence === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('montree_schools')
    .update({
      next_invoice_due_at: nextDueAt,
      billing_quantity: quantity,
      monthly_charge_estimate_cents: quantity * effectivePricePerStudentCents(school),
    })
    .eq('id', schoolId);

  // 5. Per-school timeline row (open invoice).
  await supabase.from('montree_billing_history').insert({
    school_id: schoolId,
    stripe_invoice_id: finalised.id,
    amount_cents: totalCents,
    currency: 'usd',
    status: 'open',
    description: lineDescription,
    invoice_pdf_url: finalised.invoice_pdf,
    quantity,
  }).then(({ error }) => {
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[billing] alipay billing_history (open) insert failed:', error.message);
    }
  });

  // 6. Fire-and-forget email to school's billing contact.
  if (hostedUrl && (school.billing_email || school.owner_email)) {
    const toEmail = school.billing_email || school.owner_email!;
    import('./billing/alipay-invoice-email')
      .then(({ sendAlipayInvoiceEmail }) =>
        sendAlipayInvoiceEmail({
          to: toEmail,
          schoolName: school.name || 'your school',
          hostedInvoiceUrl: hostedUrl,
          amountCents: totalCents,
          cadence,
          periodLabel,
          studentCount: quantity,
        })
      )
      .catch((err) => console.error('[billing] alipay invoice email failed', err));
  }

  console.log(
    `[billing] alipay invoice ${finalised.id} created for school ${schoolId}`,
    `quantity=${quantity}`,
    `cadence=${cadence}`,
    `amount=${totalCents}c`
  );

  return {
    ok: true,
    configured: true,
    data: {
      invoice_id: finalised.id,
      hosted_invoice_url: hostedUrl || '',
      amount_due_cents: totalCents,
      cadence,
      due_date: dueDate,
    },
  };
}

/**
 * Detect whether a Stripe invoice was paid via Alipay or WeChat Pay.
 * Reads payment_settings.payment_method_types (set when we created it) AND
 * the actual payment_intent's payment_method_types (what was used).
 */
function isAlipayOrWeChatInvoice(invoice: Stripe.Invoice): boolean {
  // Compared as plain strings: 'alipay' is a real value on the pinned acacia
  // API but is absent from clover's PaymentMethodType union (see
  // STRIPE_API_VERSION), so a typed .includes() would reject it.
  const settingsTypes: string[] = invoice.payment_settings?.payment_method_types || [];
  if (settingsTypes.includes('alipay') || settingsTypes.includes('wechat_pay')) {
    return true;
  }
  // Fallback: check metadata flag we set.
  if (invoice.metadata?.montree_rail === 'alipay_invoice') {
    return true;
  }
  return false;
}

/**
 * Period month of a date (YYYY-MM). Used for finance_tx period_month
 * assignment on annual ledger expansions.
 */
function periodMonthOfDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Annual recognition mode. Currently 'monthly' = 12 monthly finance_tx rows.
 * Flip to 'single' when accountant decides. Architectural rule #86.
 */
const ANNUAL_RECOGNITION_MODE: 'monthly' | 'single' = 'monthly';

/**
 * Write 12 monthly income rows for an annual prepayment. Each row's
 * period_month is set to its respective month. usd_amount is split evenly.
 * Idempotent via (source='stripe_webhook', source_ref=`${eventId}:income:annual:${monthIndex}`).
 */
async function writeAnnualIncomeRows(
  supabase: SupabaseClient,
  params: {
    occurredAt: string;
    schoolId: string;
    schoolName: string | null;
    invoiceId: string;
    eventId: string;
    totalCents: number;
    currency: string;
    quantity: number;
  }
): Promise<void> {
  const { occurredAt, schoolId, schoolName, invoiceId, eventId, totalCents, currency, quantity } = params;
  if (ANNUAL_RECOGNITION_MODE === 'single') {
    await insertFinanceTx(supabase, {
      occurred_at: occurredAt,
      type: 'income',
      category: 'subscription_revenue_annual',
      description: `Annual subscription prepayment from ${schoolName || schoolId}`,
      school_id: schoolId,
      stripe_invoice_id: invoiceId,
      original_currency: currency,
      original_amount: totalCents / 100,
      fx_rate: 1.0,
      usd_amount: totalCents / 100,
      source: 'stripe_webhook',
      source_ref: `${eventId}:income:annual`,
      notes: `Annual single-row recognition. quantity=${quantity}`,
    });
    return;
  }

  // 12 monthly rows. Each row carries 1/12 of the total. period_month assigned
  // sequentially starting from the occurrence month.
  const perMonthCents = Math.floor(totalCents / 12);
  const remainderCents = totalCents - perMonthCents * 12;
  const startDate = new Date(occurredAt);

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
    const periodMonth = periodMonthOfDate(monthDate);
    // First row absorbs the remainder cents so the split sums exactly.
    const rowCents = i === 0 ? perMonthCents + remainderCents : perMonthCents;
    await insertFinanceTx(supabase, {
      occurred_at: monthDate.toISOString(),
      type: 'income',
      category: 'subscription_revenue',
      description: `Annual subscription — period ${periodMonth} — ${schoolName || schoolId}`,
      school_id: schoolId,
      stripe_invoice_id: invoiceId,
      original_currency: currency,
      original_amount: rowCents / 100,
      fx_rate: 1.0,
      usd_amount: rowCents / 100,
      source: 'stripe_webhook',
      source_ref: `${eventId}:income:annual:${i}`,
      notes: `Annual prepayment, month ${i + 1}/12, period_month=${periodMonth}, quantity=${quantity}`,
    });
  }
}

/**
 * Handle an Alipay/WeChat invoice paid via Stripe. Differs from the
 * stripe_subscription path in that we read the cadence from invoice metadata
 * and advance current_period_end by 30 or 365 days. Reuses insertFinanceTx
 * for idempotency.
 *
 * Called from the webhook router when isAlipayOrWeChatInvoice() is true.
 */
async function handleAlipayInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  // Prefer metadata's school_id (set when we created the invoice) — more
  // direct than stripe_customer_id lookup.
  const schoolIdFromMetadata = invoice.metadata?.montree_school_id || null;
  const cadenceFromMetadata = invoice.metadata?.montree_cadence === 'annual' ? 'annual' : 'monthly';

  let schoolRow: { id: string; name: string | null } | null = null;
  if (schoolIdFromMetadata) {
    const { data } = await supabase
      .from('montree_schools')
      .select('id, name')
      .eq('id', schoolIdFromMetadata)
      .maybeSingle();
    schoolRow = (data as { id: string; name: string | null } | null) || null;
  }

  // Fallback to customer-id lookup if metadata is missing (legacy invoices,
  // tampered, etc.).
  if (!schoolRow && invoice.customer) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
    const { data } = await supabase
      .from('montree_schools')
      .select('id, name')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    schoolRow = (data as { id: string; name: string | null } | null) || null;
  }

  if (!schoolRow) {
    console.warn('[billing] alipay invoice.paid: school not found for invoice', invoice.id);
    return;
  }

  const amountPaidCents = invoice.amount_paid || 0;
  const stripeFeeEstimateCents = amountPaidCents > 0
    ? Math.round(amountPaidCents * 0.029) + 30
    : 0;
  const currency = (invoice.currency || 'usd').toUpperCase();
  const paidAtUnix = invoice.status_transitions?.paid_at || invoice.created || Math.floor(Date.now() / 1000);
  const occurredAt = new Date(paidAtUnix * 1000).toISOString();
  const quantity = Number(invoice.metadata?.montree_quantity || invoice.lines?.data?.[0]?.quantity || 0);

  // Income — single row for monthly, 12 rows for annual.
  if (cadenceFromMetadata === 'annual') {
    await writeAnnualIncomeRows(supabase, {
      occurredAt,
      schoolId: schoolRow.id,
      schoolName: schoolRow.name,
      invoiceId: invoice.id!,
      eventId,
      totalCents: amountPaidCents,
      currency,
      quantity,
    });
  } else {
    await insertFinanceTx(supabase, {
      occurred_at: occurredAt,
      type: 'income',
      category: 'subscription_revenue',
      description: `Alipay/WeChat payment from ${schoolRow.name || schoolRow.id}`,
      school_id: schoolRow.id,
      stripe_invoice_id: invoice.id,
      original_currency: currency,
      original_amount: amountPaidCents / 100,
      fx_rate: 1.0,
      usd_amount: amountPaidCents / 100,
      source: 'stripe_webhook',
      source_ref: `${eventId}:income`,
      notes: `rail=alipay_invoice, quantity=${quantity}, cadence=monthly`,
    });
  }

  // Stripe fee (single row regardless of cadence — Stripe takes the fee at
  // receipt time, not over recognition periods).
  if (stripeFeeEstimateCents > 0) {
    await insertFinanceTx(supabase, {
      occurred_at: occurredAt,
      type: 'direct_cost',
      category: 'stripe_fee',
      description: `Stripe fee on alipay invoice ${invoice.id}`,
      school_id: schoolRow.id,
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

  // Per-school timeline row (paid).
  // 🚨 Session 113 V2 Finance audit F-Misc-2: added period_start +
  // period_end so the alipay rail's billing_history row has the same
  // column completeness as the subscription rail's row (handleInvoicePaid
  // at line ~800). Without these, the per-school invoice timeline UI
  // shows blanks for alipay invoices.
  const alipayPeriodStart = invoice.lines?.data?.[0]?.period?.start;
  const alipayPeriodEnd = invoice.lines?.data?.[0]?.period?.end;
  await supabase.from('montree_billing_history').insert({
    school_id: schoolRow.id,
    stripe_invoice_id: invoice.id,
    amount_cents: amountPaidCents,
    currency: invoice.currency || 'usd',
    status: 'paid',
    description: invoice.description || `Alipay/WeChat payment (${cadenceFromMetadata})`,
    invoice_pdf_url: invoice.invoice_pdf,
    period_start: alipayPeriodStart ? new Date(alipayPeriodStart * 1000).toISOString() : null,
    period_end: alipayPeriodEnd ? new Date(alipayPeriodEnd * 1000).toISOString() : null,
    quantity,
  }).then(({ error }) => {
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[billing] alipay billing_history insert failed:', error.message);
    }
  });

  // Bump school state — current_period_end forward, next_invoice_due_at to
  // mirror current_period_end, subscription_status to active.
  const advanceDays = cadenceFromMetadata === 'annual' ? 365 : 30;
  // If current_period_end is already in the future, advance from there;
  // otherwise advance from now (handles re-activations from canceled / past_due).
  const baseTime = invoice.period_end
    ? invoice.period_end * 1000
    : (() => {
        const candidate = paidAtUnix * 1000;
        return candidate;
      })();
  const newPeriodEnd = new Date(baseTime + advanceDays * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('montree_schools')
    .update({
      subscription_status: 'active',
      current_period_end: newPeriodEnd,
      next_invoice_due_at: newPeriodEnd,
    })
    .eq('id', schoolRow.id);

  // Tier auto-flip on success (architectural rule #85).
  await setSchoolAiTier(supabase, schoolRow.id, 'premium', 'stripe_webhook');

  console.log(
    `[billing] alipay invoice ${invoice.id} paid for school ${schoolRow.id}`,
    `cadence=${cadenceFromMetadata}`,
    `amount=${amountPaidCents}c`,
    `new period_end=${newPeriodEnd}`
  );
}

/**
 * Route invoice.paid events. Alipay/WeChat path forks from the
 * stripe_subscription path because cadence advancement + annual ledger
 * expansion differ.
 */
export async function routeInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  if (isAlipayOrWeChatInvoice(invoice)) {
    await handleAlipayInvoicePaid(supabase, invoice, eventId);
    return;
  }
  await handleInvoicePaid(supabase, invoice, eventId);
}

/**
 * Route invoice.payment_failed events. Alipay path tracks past_due timing
 * for the dunning cron to read.
 */
export async function routeInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  if (isAlipayOrWeChatInvoice(invoice)) {
    await handleAlipayInvoicePaymentFailed(supabase, invoice);
    return;
  }
  await handleInvoicePaymentFailed(supabase, invoice);
}

/**
 * Handle a failed alipay/wechat invoice. Records the failure, flips status to
 * past_due if not already. The dunning cron reads montree_billing_history
 * to derive "day N since first failure".
 */
async function handleAlipayInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const schoolIdFromMetadata = invoice.metadata?.montree_school_id || null;

  // NOTE: named type instead of `typeof schoolRow` — inside the branches the
  // flow-narrowed type of schoolRow is `null`, so `data as typeof schoolRow`
  // collapsed every later use to `never`. Type-level fix only.
  type SchoolRowLite = { id: string; name: string | null; subscription_status: string | null };
  let schoolRow: SchoolRowLite | null = null;
  if (schoolIdFromMetadata) {
    const { data } = await supabase
      .from('montree_schools')
      .select('id, name, subscription_status')
      .eq('id', schoolIdFromMetadata)
      .maybeSingle();
    schoolRow = (data as SchoolRowLite | null) || null;
  }
  if (!schoolRow && invoice.customer) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
    const { data } = await supabase
      .from('montree_schools')
      .select('id, name, subscription_status')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    schoolRow = (data as SchoolRowLite | null) || null;
  }
  if (!schoolRow) return;

  await supabase.from('montree_billing_history').insert({
    school_id: schoolRow.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due || 0,
    currency: invoice.currency || 'usd',
    status: 'failed',
    description: `Alipay/WeChat payment failed: ${invoice.description || 'subscription'}`,
    invoice_pdf_url: invoice.invoice_pdf,
  }).then(({ error }) => {
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[billing] alipay billing_history (failed) insert failed:', error.message);
    }
  });

  // Only flip to past_due if currently active — don't downgrade from canceled.
  if (schoolRow.subscription_status === 'active' || schoolRow.subscription_status === 'trialing') {
    await supabase
      .from('montree_schools')
      .update({ subscription_status: 'past_due' })
      .eq('id', schoolRow.id);
  }
}
