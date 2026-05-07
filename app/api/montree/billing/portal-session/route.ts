// /api/montree/billing/portal-session/route.ts
//
// Phase 4 — Stripe Customer Portal session. Lets the principal manage their
// card, view invoices, and cancel from a Stripe-hosted page. Same gating
// as checkout: principal-only, school derived from JWT.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { getBillingConfig, createCustomerPortalSession } from '@/lib/montree/billing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only the principal can manage their school billing.' },
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
      },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const result = await createCustomerPortalSession(supabase, auth.schoolId);

  if (!result.ok || !result.data) {
    return NextResponse.json(
      {
        error: 'Could not create portal session',
        configured: result.configured,
        detail: result.reason,
      },
      { status: result.configured ? 500 : 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    portal_url: result.data.portal_url,
  });
}
