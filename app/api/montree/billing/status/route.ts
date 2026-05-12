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

  return NextResponse.json({
    billing_configured: cfg.configured,
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
