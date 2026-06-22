// app/api/montree/super-admin/lyf-coach/tax/register/route.ts
//
// Super-admin — add a tax registration to the register (EU OSS, UK VAT, etc.).
// One row per scheme. covers_country NULL for multi-country schemes like eu_oss.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_FREQ = new Set(['quarterly', 'monthly', 'annual']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    scheme?: string; covers_country?: string; registration_number?: string;
    filing_frequency?: string; registered_at?: string; next_filing_due?: string; notes?: string;
  } | null;
  if (!body?.scheme || typeof body.scheme !== 'string') {
    return NextResponse.json({ error: 'scheme is required (e.g. eu_oss, uk_vat)' }, { status: 400 });
  }
  const freq = body.filing_frequency && ALLOWED_FREQ.has(body.filing_frequency) ? body.filing_frequency : 'quarterly';
  for (const d of [body.registered_at, body.next_filing_due]) {
    if (d && !DATE_RE.test(d)) return NextResponse.json({ error: 'dates must be YYYY-MM-DD' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_tax_registrations')
    .insert({
      scheme: body.scheme.slice(0, 40),
      covers_country: body.covers_country ? body.covers_country.slice(0, 2).toUpperCase() : null,
      registration_number: body.registration_number?.slice(0, 100) || null,
      filing_frequency: freq,
      registered_at: body.registered_at || null,
      next_filing_due: body.next_filing_due || null,
      notes: body.notes?.slice(0, 500) || null,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ error: 'Run migration 269 first.' }, { status: 503 });
    console.error('[lyf-coach tax register]', error);
    return NextResponse.json({ error: 'Failed to add registration' }, { status: 500 });
  }
  return NextResponse.json({ success: true, id: data?.id }, { status: 201 });
}
