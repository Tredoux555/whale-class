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
import { fetchVisitorsSince, wantsInternalIncluded } from '@/lib/montree/visitors';

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
  const includeInternal = wantsInternalIncluded(searchParams);

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
  // 🚨 FIXED — this used to be a single `.limit(50000)` select, which
  // PostgREST's server-side max-rows setting (commonly 1000) silently
  // truncates regardless of the requested limit; a 90-day window with 3,000+
  // visits was undercounted. fetchVisitorsSince pages past that cap and
  // excludes internal traffic (migration 324) by default.
  // utm_source column is from migration 288; if it's missing the select
  // 42703s, so fall back to a utm-less select (source derives from referrer
  // only) — fetchVisitorsSince's own is_internal fallback runs first, then
  // this utm fallback runs on top of whichever shape came back.
  let visitors: Array<{
    country_code: string | null;
    utm_source: string | null;
    referrer: string | null;
  }> = [];
  try {
    visitors = await fetchVisitorsSince<{
      country_code: string | null;
      utm_source: string | null;
      referrer: string | null;
    }>(supabase, 'country_code, utm_source, referrer', sinceISO, { includeInternal });
  } catch (e) {
    if ((e as { code?: string })?.code === '42703') {
      const noUtm = await fetchVisitorsSince<{ country_code: string | null; referrer: string | null }>(
        supabase,
        'country_code, referrer',
        sinceISO,
        { includeInternal }
      );
      visitors = noUtm.map((v) => ({ country_code: v.country_code, utm_source: null, referrer: v.referrer }));
    } else {
      console.error('[traffic-funnel] visitors error:', (e as { code?: string })?.code);
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
