// /api/montree/billing/change-plan/route.ts
//
// 🚨 3-TIER PRICING (Sep 7 2026) — move an EXISTING Stripe subscription
// between Basic / Lite / Full. Upgrades prorate; downgrades don't (the school
// keeps what it paid for until the period ends). See changeSchoolPlan.
//
// Auth: principal of the school, with the SAME defensive school_admins
// fallback as billing/checkout (a founder-principal whose unified login
// mis-stamped their JWT as 'teacher' must still be able to change their plan).
// The school_id comes from the JWT, never the body.
//
// 🚨 THIS ROUTE DOES NOT WRITE montree_schools.plan. The Stripe webhook is the
// only writer, always — writing here optimistically is how the plan column and
// Stripe diverge. The response says so via `plan_pending: true`.
//
// No Stripe subscription yet → 409 with `needs_checkout: true`, so the UI can
// send them to /api/montree/billing/checkout instead.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { getBillingConfig, changeSchoolPlan } from '@/lib/montree/billing';
import { toPlan } from '@/lib/montree/plans/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  if (auth.role !== 'principal') {
    const { data: schoolAdmin } = await supabase
      .from('montree_school_admins')
      .select('id, role, is_active')
      .eq('id', auth.userId)
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .maybeSingle();
    if (!schoolAdmin || (schoolAdmin as { role: string }).role !== 'principal') {
      return NextResponse.json(
        { error: 'Only the principal can change their school plan.' },
        { status: 403 }
      );
    }
  }

  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      {
        error: 'Billing not configured',
        configured: false,
        detail: cfg.reason,
        message: "Stripe billing isn't set up yet.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = toPlan(body?.plan);
  if (!plan) {
    return NextResponse.json(
      { error: "plan must be one of 'basic', 'lite' or 'full'." },
      { status: 400 }
    );
  }

  // Founding 100 and free-for-life partners are not on a self-serve plan
  // ladder — their entitlement is granted, not bought. Refuse cleanly rather
  // than letting them downgrade themselves out of a lifetime grant.
  const { data: school } = await supabase
    .from('montree_schools')
    .select('founding_member, billing_override_usd')
    .eq('id', auth.schoolId)
    .maybeSingle();
  const row =
    (school as {
      founding_member?: boolean | null;
      billing_override_usd?: number | string | null;
    } | null) || null;
  if (row?.founding_member === true) {
    return NextResponse.json(
      { error: 'Founding 100 schools are on Full for life — no plan change needed.' },
      { status: 400 }
    );
  }
  if (
    row?.billing_override_usd !== null &&
    row?.billing_override_usd !== undefined &&
    Number(row.billing_override_usd) === 0
  ) {
    return NextResponse.json(
      { error: 'This school is on a $0 plan — no plan change needed.' },
      { status: 400 }
    );
  }

  const result = await changeSchoolPlan(supabase, auth.schoolId, plan);

  if (!result.ok || !result.data) {
    if (result.reason === 'no_subscription') {
      return NextResponse.json(
        {
          error: 'No Stripe subscription yet — start a checkout instead.',
          needs_checkout: true,
          checkout_endpoint: '/api/montree/billing/checkout',
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Could not change plan', configured: result.configured, detail: result.reason },
      { status: result.configured ? 500 : 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    plan: result.data.plan,
    quantity: result.data.quantity,
    direction: result.data.direction,
    // The plan column is written by the webhook, not here. Poll billing/status
    // (or just re-render) a moment later to see it land.
    plan_pending: true,
  });
}
