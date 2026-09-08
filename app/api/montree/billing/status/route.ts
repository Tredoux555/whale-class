// /api/montree/billing/status/route.ts
//
// Phase 4 — Billing status for the auth'd school. Returns subscription_status,
// trial_ends_at, current_period_end, billing_quantity, monthly_charge_estimate,
// recent invoice timeline, and whether Stripe is configured platform-wide.
//
// Always returns 200 even if Stripe isn't configured — the principal still
// needs a status page; we just include `billing_configured: false` so the
// UI can render an honest "not set up yet" state.
//
// Auth: principal OR teacher of the school can read status (read-only).
// Mutating endpoints (checkout, portal) are principal-only.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import {
  getBillingConfig,
  loadSchoolBilling,
  countActiveStudents,
  PRICE_PER_STUDENT_USD,
  effectivePricePerStudentUsd,
  effectivePricePerStudentCents,
} from '@/lib/montree/billing';
import { loadResolvedPlan } from '@/lib/montree/plans/resolve-plan';
import {
  BASIC_PRICE_USD_PER_YEAR,
  LITE_PRICE_USD_PER_MONTH,
  FULL_PRICE_USD_PER_CHILD_MONTH,
  FULL_MIN_CHILDREN,
  FULL_MIN_USD_PER_MONTH,
  fullPlanQuantity,
} from '@/lib/montree/plans/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cfg = getBillingConfig();
  const supabase = getSupabase();

  const school = await loadSchoolBilling(supabase, auth.schoolId);
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // 🚨 Launch pricing (Jul 6 2026) — founding_member drives the billing page's
  // "Founding 100 — Premium at $3 for life" card. Fetched in an ISOLATED,
  // non-fatal query so a lagging migration 286 can't take down the whole
  // billing status surface (loadSchoolBilling deliberately does NOT select
  // this column). If the column doesn't exist yet (42703), treat as false.
  let foundingMember = false;
  try {
    const { data: foundingRow, error: foundingErr } = await supabase
      .from('montree_schools')
      .select('founding_member')
      .eq('id', auth.schoolId)
      .maybeSingle();
    if (foundingErr) {
      // 42703 = column does not exist → migration 286 not yet run. Non-fatal.
      console.warn('[billing/status] founding_member lookup error (non-fatal — run migration 286):', foundingErr.message);
    } else {
      foundingMember = (foundingRow as { founding_member?: boolean | null } | null)?.founding_member === true;
    }
  } catch (err) {
    console.warn('[billing/status] founding_member lookup threw (non-fatal — run migration 286):', err);
  }

  const liveStudentCount = await countActiveStudents(supabase, auth.schoolId);
  // Effective price honours any per-school billing_override_usd. Estimates
  // shown to the principal must use this, not the platform default.
  const effectivePriceUsd = effectivePricePerStudentUsd(school);
  const effectivePriceCents = effectivePricePerStudentCents(school);
  const liveEstimateCents = liveStudentCount * effectivePriceCents;
  const isOverridden = effectivePriceUsd !== PRICE_PER_STUDENT_USD;

  // Recent invoice timeline (most recent 12 — a year of monthly invoices).
  // Pull a wider buffer (40) so dedup-by-invoice-id doesn't accidentally
  // drop legitimate older invoices when the most-recent invoice has lots
  // of webhook events (3DS challenge → payment_failed → payment_action_required
  // → paid all share the same stripe_invoice_id).
  const { data: rawHistory } = await supabase
    .from('montree_billing_history')
    .select('id, stripe_invoice_id, amount_cents, currency, status, description, invoice_pdf_url, period_start, period_end, quantity, created_at')
    .eq('school_id', auth.schoolId)
    .order('created_at', { ascending: false })
    .limit(40);

  // Dedupe by stripe_invoice_id — keep ONLY the most recent status for each
  // invoice. This is the canonical fix for the "failed-then-paid" duplicate
  // display issue. Stripe reuses the same invoice_id across retries (3DS
  // challenges, card retries, etc.) — when the eventual outcome is `paid`,
  // we only show the `paid` row. The earlier `failed` row was just a step
  // in the authentication dance, not a real payment failure.
  //
  // Architectural rule: stripe_invoice_id is the canonical dedup key for
  // billing_history display. If a row has no stripe_invoice_id (legacy data
  // or non-Stripe entry), keep it untouched.
  const seenInvoiceIds = new Set<string>();
  const dedupedHistory = (rawHistory || []).filter((row) => {
    if (!row.stripe_invoice_id) return true;
    if (seenInvoiceIds.has(row.stripe_invoice_id)) return false;
    seenInvoiceIds.add(row.stripe_invoice_id);
    return true;
  });
  const history = dedupedHistory.slice(0, 12);

  // Days remaining in trial (if applicable).
  let trialDaysRemaining: number | null = null;
  if (school.trial_ends_at) {
    const trialEnd = new Date(school.trial_ends_at).getTime();
    const now = Date.now();
    if (trialEnd > now) {
      trialDaysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    }
  }

  // 🚨 3-TIER PRICING (Sep 7 2026) — the resolved plan + the photo-cap usage
  // WP-C's billing page renders. loadResolvedPlan is 42703-safe, so this block
  // degrades to plan 'basic'/'legacy' before migration 349 rather than 500ing.
  const resolvedPlan = await loadResolvedPlan(supabase, auth.schoolId);

  // Photo usage is only meaningful on a capped (Basic) plan. The count is
  // GRANDFATHERED: only photos created at/after plan_changed_at count, so a
  // school that dropped to Basic keeps its existing library.
  let photosUsed: number | null = null;
  if (resolvedPlan.photoCap !== null) {
    let q = supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', auth.schoolId);
    if (resolvedPlan.planChangedAt) q = q.gte('created_at', resolvedPlan.planChangedAt);
    const { count, error: photoErr } = await q;
    if (photoErr) {
      console.warn('[billing/status] photo cap count failed (non-fatal):', photoErr.message);
    } else {
      photosUsed = count || 0;
    }
  }

  return NextResponse.json({
    billing_configured: cfg.configured,
    // Everything WP-C's billing page needs to render the plan cards.
    plan: {
      plan: resolvedPlan.plan,
      source: resolvedPlan.source,
      model: resolvedPlan.model,
      locked: resolvedPlan.locked,
      ai_budget_usd: resolvedPlan.aiBudgetUsd,
      photo_cap: resolvedPlan.photoCap,
      photos_used: photosUsed,
      plan_changed_at: resolvedPlan.planChangedAt,
      prices: {
        basic_usd_per_year: BASIC_PRICE_USD_PER_YEAR,
        lite_usd_per_month: LITE_PRICE_USD_PER_MONTH,
        full_usd_per_child_month: FULL_PRICE_USD_PER_CHILD_MONTH,
        full_min_children: FULL_MIN_CHILDREN,
        full_min_usd_per_month: FULL_MIN_USD_PER_MONTH,
      },
      // What Full would bill this school today, floor included.
      full_quote_quantity: fullPlanQuantity(liveStudentCount),
      full_quote_usd_per_month:
        fullPlanQuantity(liveStudentCount) * FULL_PRICE_USD_PER_CHILD_MONTH,
    },
    school: {
      id: school.id,
      name: school.name,
      subscription_status: school.subscription_status || null,
      trial_ends_at: school.trial_ends_at,
      current_period_end: school.current_period_end,
      stripe_customer_id: school.stripe_customer_id,
      stripe_subscription_id: school.stripe_subscription_id,
      billing_email: school.billing_email || school.owner_email || null,
      billing_quantity: school.billing_quantity,
      monthly_charge_estimate_cents: school.monthly_charge_estimate_cents,
      // Live student count from DB at this moment — may differ from
      // billing_quantity if a sync hasn't fired yet.
      live_student_count: liveStudentCount,
      live_monthly_charge_estimate_cents: liveEstimateCents,
      live_monthly_charge_estimate_usd: liveStudentCount * effectivePriceUsd,
      trial_days_remaining: trialDaysRemaining,
      // Phase B/C — three-rail inbound payments (migration 209).
      payment_method: school.payment_method || 'stripe_subscription',
      billing_cadence: school.billing_cadence || 'monthly',
      next_invoice_due_at: school.next_invoice_due_at,
      // Launch pricing (Jul 6 2026) — Founding 100 flag (migration 286).
      founding_member: foundingMember,
    },
    pricing: {
      // The principal's actual rate. Equals platform default unless a
      // per-school override is in effect.
      price_per_student_usd: effectivePriceUsd,
      // Platform default ($7). Surfaced so the UI can render "Your rate: $5
      // (down from $7)" without recomputing it.
      default_price_per_student_usd: PRICE_PER_STUDENT_USD,
      is_overridden: isOverridden,
    },
    history: history || [],
  });
}
