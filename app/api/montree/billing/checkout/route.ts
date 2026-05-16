// /api/montree/billing/checkout/route.ts
//
// Phase 4 — Start a Stripe Checkout session for a school's $7/student
// subscription. Replaces the old tier-based endpoint (basic/standard/premium).
//
// Auth: principal of the school (verified via verifySchoolRequest +
// auth.role === 'principal'). The school_id is derived from the JWT, NOT
// the body — prevents one principal from starting checkout for another
// school.
//
// Pre-Stripe-config: returns 503 with `configured: false` so the principal
// UI can show "billing isn't set up yet" instead of crashing.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { getBillingConfig, createSchoolCheckoutSession } from '@/lib/montree/billing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Principal role gate. Defensive: if the JWT role is NOT 'principal' but the
  // userId actually belongs to an active row in montree_school_admins for the
  // current school, treat them as a principal anyway. Mirrors the canonical
  // fallback pattern from app/api/montree/admin/principal-agent/route.ts
  // (Session 86 commit ca1e13bc). Without this, founder-principals whose JWT
  // got mis-stamped as 'teacher' by the unified login (because their login
  // code matches BOTH a teacher row and a school_admin row) hard-403 here
  // and cannot start checkout for their own school — exactly what the
  // user just hit on Test2.
  if (auth.role !== 'principal') {
    const supabaseForCheck = getSupabase();
    const { data: schoolAdmin } = await supabaseForCheck
      .from('montree_school_admins')
      .select('id, role, is_active')
      .eq('id', auth.userId)
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .maybeSingle();
    if (!schoolAdmin || (schoolAdmin as { role: string }).role !== 'principal') {
      console.warn(
        `[billing/checkout] 403: JWT role="${auth.role}", userId=${auth.userId} ` +
        `not an active principal in school_admins for school=${auth.schoolId}`,
      );
      return NextResponse.json(
        { error: 'Only the principal can start a checkout for their school.' },
        { status: 403 }
      );
    }
    console.warn(
      `[billing/checkout] JWT role mis-stamp recovered: userId=${auth.userId} ` +
      `JWT.role="${auth.role}" but montree_school_admins.role='principal'. ` +
      `Proceeding with checkout. Upstream login flow needs the swap from Session 86.`,
    );
  }

  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      {
        error: 'Billing not configured',
        configured: false,
        detail: cfg.reason,
        message: "Stripe billing isn't set up yet. We'll reach out when it's ready.",
      },
      { status: 503 }
    );
  }

  const supabase = getSupabase();

  // Defence-in-depth: confirm the principal's JWT schoolId still maps to a
  // real school + this principal still owns it.
  const { data: school } = await supabase
    .from('montree_schools')
    .select('id, name, subscription_status, stripe_customer_id')
    .eq('id', auth.schoolId)
    .maybeSingle();
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // If already actively subscribed via Stripe, point them at the customer portal.
  // 🚨 CRITICAL: subscription_status='trialing' alone does NOT mean Stripe is
  // involved — the /montree/try signup sets it directly for the local 30-day
  // trial timer (no Stripe customer created). Mirror of the frontend fix in
  // commit a6d00a17. Must also have a stripe_customer_id to be "actually
  // subscribed via Stripe". Without this guard, every locally-trialing school
  // gets stuck in "Starting..." because checkout bails before hitting Stripe.
  const hasStripeCustomer = !!school.stripe_customer_id;
  const isStripeActive =
    (school.subscription_status === 'active' || school.subscription_status === 'trialing') &&
    hasStripeCustomer;
  if (isStripeActive) {
    return NextResponse.json({
      already_subscribed: true,
      message: 'School is already subscribed. Use the manage-billing portal instead.',
      portal_endpoint: '/api/montree/billing/portal-session',
    });
  }

  const result = await createSchoolCheckoutSession(supabase, auth.schoolId, {});
  if (!result.ok || !result.data) {
    return NextResponse.json(
      {
        error: 'Could not create checkout',
        configured: result.configured,
        detail: result.reason,
      },
      { status: result.configured ? 500 : 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    checkout_url: result.data.checkout_url,
    session_id: result.data.session_id,
  });
}
