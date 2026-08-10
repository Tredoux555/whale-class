/**
 * GET /api/montree/visitors
 * Fetch visitor data for super-admin dashboard.
 * Requires super-admin auth (JWT or password).
 * Supports date range filtering and pagination.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { fetchVisitorsSince, wantsInternalIncluded } from '@/lib/montree/visitors';

export async function GET(request: NextRequest) {
  // Auth check
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 90);
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 1000);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  const country = searchParams.get('country');
  const page = searchParams.get('page_url');
  const includeInternal = wantsInternalIncluded(searchParams);

  const supabase = getSupabase();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  // Build query — a single page for the Live feed list (already paginated
  // via limit/offset, so no 1,000-row cap concern here).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildListQuery = (filterInternal: boolean): any => {
    let q = supabase
      .from('montree_visitors')
      .select('*', { count: 'exact' })
      .gte('visited_at', sinceISO)
      .order('visited_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (country) q = q.eq('country', country);
    if (page) {
      // Escape SQL wildcards: %, _, and backslash
      const escapedPage = page.replace(/[\\%_]/g, '\\$&');
      q = q.ilike('page_url', `%${escapedPage}%`);
    }
    if (filterInternal) q = q.eq('is_internal', false);
    return q;
  };

  let { data, error, count } = await buildListQuery(!includeInternal);
  if (error?.code === '42703') {
    // is_internal (migration 324) not run yet — retry unfiltered.
    ({ data, error, count } = await buildListQuery(false));
  }

  if (error) {
    console.error('[VISITORS] Fetch error:', error.code);
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 });
  }

  // 🚨 FIXED — this used to be a single `.limit(50000)` select, which
  // Supabase/PostgREST's server-side max-rows setting (commonly 1000)
  // silently truncates regardless of the requested limit. A 90-day window
  // holding 3,000+ visits was undercounted and looked identical to a 30-day
  // window. fetchVisitorsSince pages past that cap via .range() and applies
  // the internal-traffic exclusion filter (drift-safe).
  const statsData = await fetchVisitorsSince<{
    country: string | null;
    country_code: string | null;
    city: string | null;
    fingerprint: string | null;
    page_url: string | null;
  }>(supabase, 'country, country_code, city, fingerprint, page_url', sinceISO, {
    includeInternal,
    extra: country ? (q) => q.eq('country', country) : undefined,
  });

  // Compute aggregates
  const uniqueVisitors = new Set((statsData?.map(v => v.fingerprint) || []).filter(Boolean)).size;
  const totalPageViews = statsData?.length || 0;

  // Country breakdown
  const countryMap = new Map<string, { count: number; code: string | null }>();
  for (const v of statsData || []) {
    if (v.country) {
      const existing = countryMap.get(v.country);
      if (existing) {
        existing.count++;
      } else {
        countryMap.set(v.country, { count: 1, code: v.country_code });
      }
    }
  }
  const countryBreakdown = Array.from(countryMap.entries())
    .map(([country, { count, code }]) => ({ country, country_code: code, count }))
    .sort((a, b) => b.count - a.count);

  // Top pages
  const pageMap = new Map<string, number>();
  for (const v of statsData || []) {
    if (v.page_url) {
      pageMap.set(v.page_url, (pageMap.get(v.page_url) || 0) + 1);
    }
  }
  const topPages = Array.from(pageMap.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // City breakdown
  const cityMap = new Map<string, { count: number; country: string | null }>();
  for (const v of statsData || []) {
    if (v.city) {
      const key = `${v.city}|${v.country || ''}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        cityMap.set(key, { count: 1, country: v.country });
      }
    }
  }
  const topCities = Array.from(cityMap.entries())
    .map(([key, { count, country }]) => ({ city: key.split('|')[0], country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json({
    visitors: data,
    total: count,
    stats: {
      unique_visitors: uniqueVisitors,
      total_page_views: totalPageViews,
      country_breakdown: countryBreakdown,
      top_pages: topPages,
      top_cities: topCities,
      days,
    },
  }, {
    headers: {
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
    },
  });
}
