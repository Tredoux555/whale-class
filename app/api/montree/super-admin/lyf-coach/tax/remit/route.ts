// app/api/montree/super-admin/lyf-coach/tax/remit/route.ts
//
// Super-admin — record a VAT remittance (after filing an OSS/UK/etc. return).
// Writes a tax_remitted ledger row (product='lyf_coach', jurisdiction=country)
// that draws the per-country liability down. Period-lock guarded; idempotent on
// source_ref so re-recording the same filing is a no-op.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { assertPeriodOpen, periodMonthOf } from '@/lib/montree/finance/period-lock';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    country?: string; usd_amount?: number; scheme?: string;
    filing_period?: string; occurred_at?: string; notes?: string;
  } | null;

  const country = body?.country ? body.country.slice(0, 2).toUpperCase() : null;
  if (!country) return NextResponse.json({ error: 'country (ISO2) is required' }, { status: 400 });
  if (typeof body?.usd_amount !== 'number' || body.usd_amount <= 0) {
    return NextResponse.json({ error: 'usd_amount must be a positive number' }, { status: 400 });
  }
  const occurredAt = body.occurred_at || new Date().toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) {
    return NextResponse.json({ error: 'occurred_at invalid' }, { status: 400 });
  }
  // filing_period identifies the return (e.g. '2026-Q2'); part of the idempotency key.
  const filingPeriod = (body.filing_period || periodMonthOf(occurredAt)).slice(0, 16);
  const scheme = (body.scheme || 'manual').slice(0, 40);

  const supabase = getSupabase();

  // Refuse writing into a closed accounting period (audit guarantee).
  const lockErr = await assertPeriodOpen(supabase, periodMonthOf(occurredAt));
  if (lockErr) return lockErr;

  const usd = Math.round(body.usd_amount * 10000) / 10000;
  const sourceRef = `lc_remit:${scheme}:${filingPeriod}:${country}`;

  const { error } = await supabase.from('montree_finance_transactions').insert({
    occurred_at: occurredAt,
    type: 'tax_remitted',
    category: 'vat_remittance',
    description: `VAT remitted to ${country} (${scheme} ${filingPeriod})`,
    product: 'lyf_coach',
    jurisdiction: country,
    original_currency: 'USD',
    original_amount: usd,
    fx_rate: 1.0,
    usd_amount: usd,
    source: 'manual_entry',
    source_ref: sourceRef,
    notes: body.notes?.slice(0, 500) || null,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This remittance was already recorded.', source_ref: sourceRef }, { status: 409 });
    }
    if (error.code === '42703' || error.code === '42P01') {
      return NextResponse.json({ error: 'Run migration 269 first.' }, { status: 503 });
    }
    console.error('[lyf-coach tax remit]', error);
    return NextResponse.json({ error: 'Failed to record remittance' }, { status: 500 });
  }

  return NextResponse.json({ success: true, source_ref: sourceRef }, { status: 201 });
}
