// app/api/montree/super-admin/lyf-coach/tax/route.ts
//
// Super-admin — Lyf Coach VAT view. Per-jurisdiction liability owed =
// Σ tax_collected − Σ tax_remitted (product='lyf_coach'), plus the tax register
// (montree_tax_registrations). Cross-check against Stripe Tax's own reports.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  // Aggregate VAT rows in JS (low volume). product-scoped to Lyf Coach.
  const { data: taxRows, error: taxErr } = await supabase
    .from('montree_finance_transactions')
    .select('type, jurisdiction, usd_amount')
    .eq('product', 'lyf_coach')
    .in('type', ['tax_collected', 'tax_remitted'])
    .limit(10000);

  if (taxErr) {
    if (taxErr.code === '42703' || taxErr.code === '42P01') {
      return NextResponse.json({ migration_pending: true, jurisdictions: [], registrations: [], totals: {} });
    }
    console.error('[lyf-coach tax]', taxErr);
    return NextResponse.json({ error: 'Failed to load tax data' }, { status: 500 });
  }

  const byCountry = new Map<string, { collected: number; remitted: number }>();
  for (const r of (taxRows || []) as Array<{ type: string; jurisdiction: string | null; usd_amount: number }>) {
    const c = r.jurisdiction || 'unknown';
    const acc = byCountry.get(c) || { collected: 0, remitted: 0 };
    const amt = Number(r.usd_amount) || 0;
    if (r.type === 'tax_collected') acc.collected += amt;
    else if (r.type === 'tax_remitted') acc.remitted += amt;
    byCountry.set(c, acc);
  }
  const jurisdictions = [...byCountry.entries()]
    .map(([country, v]) => ({
      country,
      collected: Math.round(v.collected * 10000) / 10000,
      remitted: Math.round(v.remitted * 10000) / 10000,
      owed: Math.round((v.collected - v.remitted) * 10000) / 10000,
    }))
    .sort((a, b) => b.owed - a.owed);

  const totalCollected = jurisdictions.reduce((s, j) => s + j.collected, 0);
  const totalRemitted = jurisdictions.reduce((s, j) => s + j.remitted, 0);

  // Tax register (graceful if the table isn't there yet).
  let registrations: unknown[] = [];
  const { data: regs, error: regErr } = await supabase
    .from('montree_tax_registrations')
    .select('id, scheme, covers_country, registration_number, filing_frequency, registered_at, next_filing_due, status, notes')
    .order('next_filing_due', { ascending: true, nullsFirst: false });
  if (!regErr) registrations = regs || [];

  return NextResponse.json({
    jurisdictions,
    registrations,
    totals: {
      collected: Math.round(totalCollected * 10000) / 10000,
      remitted: Math.round(totalRemitted * 10000) / 10000,
      owed: Math.round((totalCollected - totalRemitted) * 10000) / 10000,
    },
  });
}
