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
  PRICE_PER_STUDENT_CENTS,
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
  const liveEstimateCents = liveStudentCount * PRICE_PER_STUDENT_CENTS;

  // Recent invoice timeline (most recent 12 — a year of monthly invoices).
  const { data: history } = await supabase
    .from('montree_billing_history')
    .select('id, stripe_invoice_id, amount_cents, currency, status, description, invoice_pdf_url, period_start, period_end, quantity, created_at')
    .eq('school_id', auth.schoolId)
    .order('created_at', { ascending: false })
    .limit(12);

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
      live_monthly_charge_estimate_usd: liveStudentCount * PRICE_PER_STUDENT_USD,
      trial_days_remaining: trialDaysRemaining,
    },
    pricing: {
      price_per_student_usd: PRICE_PER_STUDENT_USD,
    },
    history: history || [],
  });
}
