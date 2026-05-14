// /api/montree/cron/generate-alipay-invoices/route.ts
//
// Phase B — Daily cron that generates Stripe invoices with Alipay + WeChat Pay
// payment methods for schools on payment_method='alipay_invoice'.
//
// Reads montree_schools WHERE:
//   payment_method = 'alipay_invoice'
//   AND subscription_status IN ('active','past_due','trialing')
//   AND (next_invoice_due_at IS NULL OR next_invoice_due_at <= NOW() + 7 days)
//
// Trial gate: skips schools still inside their free 30-day trial. The cron
// query DOES include trialing schools, but createAlipayInvoice() refuses if
// trial_ends_at is still in the future. This is defence-in-depth — the cron
// also pre-filters before calling.
//
// Auth: x-cron-secret header matching CRON_SECRET env, OR super-admin session
// for manual triggers from the Health tab.
//
// Cron schedule (Railway): 0 6 * * * (06:00 UTC daily — one hour after the
// existing trial drip).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import {
  getBillingConfig,
  createAlipayInvoice,
} from '@/lib/montree/billing';

export const dynamic = 'force-dynamic';
// Tolerate batch generation across many schools (Stripe calls are sequential
// to respect rate limits).
export const maxDuration = 120;

interface CronOutcome {
  school_id: string;
  school_name: string | null;
  outcome: 'generated' | 'skipped' | 'error';
  reason?: string;
  invoice_id?: string;
  amount_due_cents?: number;
  cadence?: 'monthly' | 'annual';
}

export async function POST(request: NextRequest) {
  // Auth: prefer x-cron-secret, fall back to super-admin session for manual triggers.
  let authed = false;
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    authed = true;
  }
  if (!authed) {
    const adminAuth = await verifySuperAdminAuth(request.headers);
    if (adminAuth.valid) authed = true;
  }
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      { error: 'Billing not configured', detail: cfg.reason, generated: 0, skipped: 0, errors: 0 },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  // Pull candidate schools. next_invoice_due_at window: NULL OR <= now + 7 days.
  // The 7-day lookahead lets us issue invoices a week before they're due so
  // schools have time to pay before the period ends.
  const lookaheadIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: candidates, error: queryErr } = await supabase
    .from('montree_schools')
    .select('id, name, subscription_status, trial_ends_at, next_invoice_due_at, payment_method, billing_cadence')
    .eq('payment_method', 'alipay_invoice')
    .in('subscription_status', ['active', 'past_due', 'trialing'])
    .or(`next_invoice_due_at.is.null,next_invoice_due_at.lte.${lookaheadIso}`);

  if (queryErr) {
    console.error('[cron alipay invoices] query failed:', queryErr.message);
    return NextResponse.json(
      { error: 'Query failed', detail: queryErr.message },
      { status: 500 }
    );
  }

  const outcomes: CronOutcome[] = [];
  const nowMs = Date.now();

  for (const school of candidates || []) {
    // Trial pre-filter — skip schools still in their free trial window.
    if (
      school.subscription_status === 'trialing' &&
      school.trial_ends_at &&
      new Date(school.trial_ends_at).getTime() > nowMs
    ) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        outcome: 'skipped',
        reason: `Still in trial until ${school.trial_ends_at}`,
      });
      continue;
    }

    if (dryRun) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        outcome: 'skipped',
        reason: 'dry-run',
      });
      continue;
    }

    const result = await createAlipayInvoice(supabase, school.id);
    if (result.ok && result.data) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        outcome: 'generated',
        invoice_id: result.data.invoice_id,
        amount_due_cents: result.data.amount_due_cents,
        cadence: result.data.cadence,
      });
    } else {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        outcome: 'error',
        reason: result.reason || 'Unknown error',
      });
    }
  }

  const generated = outcomes.filter((o) => o.outcome === 'generated').length;
  const skipped = outcomes.filter((o) => o.outcome === 'skipped').length;
  const errors = outcomes.filter((o) => o.outcome === 'error').length;

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    generated,
    skipped,
    errors,
    outcomes,
  });
}

// GET = inspection / dry-run.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Force dry-run on GET regardless of param.
  url.searchParams.set('dry_run', '1');
  const newReq = new NextRequest(url, {
    method: 'POST',
    headers: request.headers,
  });
  return POST(newReq);
}
