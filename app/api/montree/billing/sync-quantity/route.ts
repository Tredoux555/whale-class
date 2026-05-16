// /api/montree/billing/sync-quantity/route.ts
//
// Phase 4 — Push current student count to Stripe as the subscription
// quantity. Idempotent — if quantity hasn't changed, no Stripe call.
//
// Two modes:
//   POST ?school_id=X      — sync one school (super admin OR principal of
//                             that school)
//   POST                   — sync ALL schools with active subscriptions
//                             (super admin only OR x-cron-secret header for
//                             scheduled job)
//
// The fire-and-forget per-child sync hook in lib/montree/billing.ts
// (maybeSyncStripeQuantity) covers steady-state. This endpoint is for
// reconciliation: catching up after batches of imports, fixing drift,
// running daily as a sweep.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';
import { getBillingConfig, syncSubscriptionQuantity } from '@/lib/montree/billing';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;  // sweep across many schools may take a while

export async function POST(request: NextRequest) {
  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      { error: 'Billing not configured', configured: false, detail: cfg.reason },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');

  // ── Single-school mode ─────────────────────────────────────────────────
  if (schoolId) {
    // Auth: principal of THIS school OR super admin.
    const principalAuth = await verifySchoolRequest(request);
    if (!(principalAuth instanceof NextResponse) && principalAuth.role === 'principal' && principalAuth.schoolId === schoolId) {
      // Authorised as principal of this school.
    } else {
      const superAuth = await verifySuperAdminAuth(request.headers);
      if (!superAuth.valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await syncSubscriptionQuantity(supabase, schoolId, { force: true });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Sync failed', detail: result.reason },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      school_id: schoolId,
      previous_quantity: result.data?.previous_quantity,
      new_quantity: result.data?.new_quantity,
      updated: result.data?.updated,
    });
  }

  // ── Sweep mode ─────────────────────────────────────────────────────────
  // Super admin OR cron-secret. Walks every school with an active
  // subscription and reconciles quantity.
  //
  // 🚨 Session 113 V2 Finance audit F-A-1: trim + length-after-trim check
  // defends against a whitespace-only CRON_SECRET env var.
  const cronSecret = (request.headers.get('x-cron-secret') || '').trim();
  const cronSecretConfigured = (process.env.CRON_SECRET || '').trim();
  const isCron = Boolean(
    cronSecretConfigured.length > 0 &&
      cronSecret.length > 0 &&
      cronSecret === cronSecretConfigured
  );
  if (!isCron) {
    const superAuth = await verifySuperAdminAuth(request.headers);
    if (!superAuth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Find every school that currently has a Stripe subscription.
  const { data: schools, error } = await supabase
    .from('montree_schools')
    .select('id')
    .not('stripe_subscription_id', 'is', null)
    .in('subscription_status', ['active', 'trialing', 'past_due']);

  if (error) {
    console.error('[billing sync sweep] school lookup failed:', error.message);
    return NextResponse.json({ error: 'Lookup failed', detail: error.message }, { status: 500 });
  }

  const results: Array<{
    school_id: string;
    ok: boolean;
    updated?: boolean;
    previous_quantity?: number | null;
    new_quantity?: number;
    reason?: string;
  }> = [];
  let updatedCount = 0;
  let errorCount = 0;

  for (const s of schools || []) {
    try {
      const result = await syncSubscriptionQuantity(supabase, s.id);
      if (result.ok && result.data) {
        results.push({
          school_id: s.id,
          ok: true,
          updated: result.data.updated,
          previous_quantity: result.data.previous_quantity,
          new_quantity: result.data.new_quantity,
        });
        if (result.data.updated) updatedCount += 1;
      } else {
        results.push({ school_id: s.id, ok: false, reason: result.reason });
        errorCount += 1;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[billing sync sweep] school', s.id, 'failed:', msg);
      results.push({ school_id: s.id, ok: false, reason: msg });
      errorCount += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    swept: schools?.length || 0,
    updated: updatedCount,
    errors: errorCount,
    results: results.slice(0, 100),  // cap response size
  });
}
