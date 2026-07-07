/**
 * GET /api/montree/super-admin/traffic-funnel
 * Ad-geo attribution funnel for super-admin (Jul 7 2026).
 *
 * Aggregates country × source → visits (montree_visitors) / signups + trial
 * schools (montree_schools). Source = utm_source-derived channel class for
 * visitors; attrib_source for schools. Aggregates only — no raw IPs, no PII.
 *
 * ?days=N (default 30, cap 90) date-range filter on visited_at / created_at.
 * Auth: verifySuperAdminAuth (JWT or password header).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { deriveSource } from '@/lib/montree/attribution';

interface FunnelCell {
  country: string; // country code (2-letter) or 'ZZ' unknown
  source: string; // fb | search | outreach | direct | referral | <utm_source>
  visits: number;
  signups: number;
  trials: number;
}

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 90);

  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const norm = (c: string | null | undefined) => (c ? String(c).toUpperCase().slice(0, 2) : 'ZZ');
  const key = (country: string, source: string) => `${country}|${source}`;
  const cells = new Map<string, FunnelCell>();
  const cellFor = (country: string, source: string): FunnelCell => {
    const k = key(country, source);
    let cell = cells.get(k);
    if (!cell) {
      cell = { country, source, visits: 0, signups: 0, trials: 0 };
      cells.set(k, cell);
    }
    return cell;
  };

  // ── Visits: montree_visitors → country_code × derived-source ──
  // utm_source column is from migration 288; if it's missing the select 42703s,
  // so fall back to a utm-less select (source derives from referrer only).
  let visitors: Array<{
    country_code: string | null;
    utm_source: string | null;
    referrer: string | null;
  }> | null = null;
  {
    const withUtm = await supabase
      .from('montree_visitors')
      .select('country_code, utm_source, referrer')
      .gte('visited_at', sinceISO)
      .limit(50000);
    if (withUtm.error && withUtm.error.code === '42703') {
      const noUtm = await supabase
        .from('montree_visitors')
        .select('country_code, referrer')
        .gte('visited_at', sinceISO)
        .limit(50000);
      visitors = (noUtm.data || []).map((v) => ({
        country_code: v.country_code,
        utm_source: null,
        referrer: v.referrer,
      }));
    } else if (withUtm.error) {
      console.error('[traffic-funnel] visitors error:', withUtm.error.code);
    } else {
      visitors = withUtm.data;
    }
  }
  for (const v of visitors || []) {
    const source = deriveSource(v.utm_source, v.referrer);
    cellFor(norm(v.country_code), source).visits++;
  }

  // ── Signups + trials: montree_schools → attrib_source × signup_country_code ──
  // attrib_source column is from migration 288; degrade to signup geo only.
  let schools: Array<{
    attrib_source: string | null;
    signup_country_code: string | null;
    subscription_status: string | null;
  }> | null = null;
  {
    const withAttrib = await supabase
      .from('montree_schools')
      .select('attrib_source, signup_country_code, subscription_status')
      .gte('created_at', sinceISO)
      .limit(50000);
    if (withAttrib.error && withAttrib.error.code === '42703') {
      const noAttrib = await supabase
        .from('montree_schools')
        .select('signup_country_code, subscription_status')
        .gte('created_at', sinceISO)
        .limit(50000);
      schools = (noAttrib.data || []).map((s) => ({
        attrib_source: null,
        signup_country_code: s.signup_country_code,
        subscription_status: s.subscription_status,
      }));
    } else if (withAttrib.error) {
      console.error('[traffic-funnel] schools error:', withAttrib.error.code);
    } else {
      schools = withAttrib.data;
    }
  }
  for (const s of schools || []) {
    const source = s.attrib_source || 'direct'; // unattributed = direct
    const cell = cellFor(norm(s.signup_country_code), source);
    cell.signups++;
    if (s.subscription_status === 'trialing') cell.trials++;
  }

  const rows = Array.from(cells.values()).sort(
    (a, b) => b.signups - a.signups || b.visits - a.visits
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.visits += r.visits;
      acc.signups += r.signups;
      acc.trials += r.trials;
      return acc;
    },
    { visits: 0, signups: 0, trials: 0 }
  );

  return NextResponse.json(
    { rows, totals, days },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  );
}
