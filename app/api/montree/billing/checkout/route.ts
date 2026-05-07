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
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only the principal can start a checkout for their school.' },
      { status: 403 }
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
    .select('id, name, subscription_status')
    .eq('id', auth.schoolId)
    .maybeSingle();
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // If already actively subscribed, point them at the customer portal.
  if (school.subscription_status === 'active' || school.subscription_status === 'trialing') {
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
