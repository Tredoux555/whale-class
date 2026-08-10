// lib/montree/visitors.ts
// Shared helpers for querying montree_visitors past PostgREST's server-side
// max-rows response cap, and for the internal-traffic (Tredoux's own
// devices) exclusion filter added in migration 324.
//
// 🚨 THE BUG THIS EXISTS TO FIX: a single `.limit(50000)` select is silently
// truncated by Supabase's configured "Max Rows" API setting (commonly 1000)
// regardless of the client-requested limit — the client-side .limit() only
// LOWERS the cap, it can never raise it. /api/montree/visitors,
// traffic-funnel and geo-match all asked for up to 50,000 visitor rows and
// silently got ≤1,000 back, so 90-day stats were identical to 30-day stats
// once the window held >1,000 visits. Mirrors the same trap already fixed in
// geo-match's contacts fetch and lib/montree/montage-tracker/media.ts.

import type { UntypedClient } from '@/lib/supabase-client';

/** PostgREST's configured max-rows silently truncates ANY select past this,
 *  even one that asks for more via .limit() — page every unbounded read. */
const PAGE_SIZE = 1000;
/** Hard safety cap so a runaway loop can never hammer the DB (200k rows). */
const MAX_PAGES = 200;

type PageResult<T> = { data: T[] | null; error: { code?: string; message: string } | null };

/**
 * Runs `queryPage(from, to)` repeatedly until a short page signals the end,
 * concatenating results. `queryPage` must apply identical filters/order on
 * every call and only vary the range — callers own their own
 * .select()/.eq()/.order() chain, this just drives the pagination loop.
 * Throws the first page's Supabase error (with its `.code`) if one occurs,
 * so callers can catch 42703 (undefined column) for schema-drift fallbacks.
 */
export async function fetchAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryPage(from, to);
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) {
      console.warn('[fetchAllPages] hit MAX_PAGES cap — results may be truncated.');
    }
  }
  return out;
}

/**
 * Fetch ALL montree_visitors rows with `visited_at >= sinceISO`, paginated
 * past the max-rows cap, ordered by `id` for stable page boundaries (Postgres
 * gives no ordering guarantee without ORDER BY, so unordered .range() paging
 * can silently skip or duplicate rows across pages).
 *
 * Excludes internal-traffic rows (`is_internal = true`, migration 324) by
 * default — that's the "exclude my devices" default the super-admin Visitors
 * / Funnel / Geo Match views want. Pass `includeInternal: true` for the
 * "show my devices too" toggle. Drift-safe: `is_internal` is a new column —
 * if it doesn't exist yet (42703), retries once with no internal-traffic
 * filter at all (equivalent to "no rows are marked internal yet").
 */
export async function fetchVisitorsSince<T extends Record<string, unknown>>(
  supabase: UntypedClient,
  columns: string,
  sinceISO: string,
  opts: {
    includeInternal?: boolean;
    /** Extra filters (e.g. .eq('country', x)) applied to every page's query. */
    extra?: (q: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  } = {}
): Promise<T[]> {
  const build = (filterInternal: boolean) => (from: number, to: number) => {
    let q: any = supabase // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('montree_visitors')
      .select(columns)
      .gte('visited_at', sinceISO)
      .order('id', { ascending: true });
    if (opts.extra) q = opts.extra(q);
    if (filterInternal) q = q.eq('is_internal', false);
    return q.range(from, to);
  };

  if (opts.includeInternal) {
    return fetchAllPages<T>(build(false));
  }

  try {
    return await fetchAllPages<T>(build(true));
  } catch (e) {
    if ((e as { code?: string })?.code === '42703') {
      return fetchAllPages<T>(build(false));
    }
    throw e;
  }
}

/**
 * Parse the `include_internal` query param the three visitor views share
 * ("exclude my devices" toggle, default excluded — pass `?include_internal=1`
 * to include Tredoux's own marked devices in the numbers).
 */
export function wantsInternalIncluded(searchParams: URLSearchParams): boolean {
  const v = searchParams.get('include_internal');
  return v === '1' || v === 'true';
}
