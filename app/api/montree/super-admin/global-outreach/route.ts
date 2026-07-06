// /api/montree/super-admin/global-outreach — read-only views for the 🌍
// Global Outreach super-admin tab.
//
// GET only. All writes reuse existing routes:
//   - bulk import  → POST /api/montree/super-admin/outreach {action:'bulk_import'}
//   - status change → PATCH /api/montree/super-admin/campaign-manager {id,status}
//
// Views:
//   ?view=by_country[&all=1]  — per-country aggregate + grand totals
//   ?view=contacts&country=&status=&q=&limit=&offset=[&all=1]  — paged browser
//   ?view=export&country=&status=[&all=1]  — CSV attachment (paged, injection-guarded)
//
// Default scope is batch_tag='global-scrape-jul2026'. The `all=1` toggle widens
// to the whole table, excluding agent_application rows and coalescing NULL/empty
// country to 'Unknown' in aggregation (amendment I3).
import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_TAG = 'global-scrape-jul2026';
const PAGE_SIZE = 1000;
const MAX_PAGES = 300; // amendment I4 — high cap; warn-and-stop if ever hit.

type Row = {
  country: string | null;
  status: string | null;
  email: string | null;
  contact_type: string | null;
};

// Apply the tab scope to a query builder. Default = batch-scoped; all=true
// widens to the whole table minus agent_application rows.
function scoped<T>(q: T, all: boolean): T {
  // @ts-expect-error — supabase builder chaining preserves the type at runtime.
  return all ? q.neq('contact_type', 'agent_application') : q.eq('batch_tag', BATCH_TAG);
}

// Apply a country filter. by_country coalesces NULL/empty country to the
// literal 'Unknown' bucket in `all` mode, so clicking that row must match
// NULL-or-empty rows here (an `.eq('country','Unknown')` would return 0).
function filterCountry<T>(q: T, country: string): T {
  if (!country) return q;
  if (country === 'Unknown') {
    // @ts-expect-error — supabase builder chaining preserves the type at runtime.
    return q.or('country.is.null,country.eq.');
  }
  // @ts-expect-error — supabase builder chaining preserves the type at runtime.
  return q.eq('country', country);
}

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const url = new URL(request.url);
  const view = url.searchParams.get('view') || 'by_country';
  const all = url.searchParams.get('all') === '1';
  const country = url.searchParams.get('country') || '';
  const status = url.searchParams.get('status') || '';

  try {
    // ── by_country ────────────────────────────────────────────────────────
    if (view === 'by_country') {
      const acc = new Map<string, {
        country: string; total: number; with_email: number;
        new: number; drafted: number; sent: number; replied: number;
        bounced: number; converted: number; dead: number; disadvantaged: number;
      }>();
      const grand = {
        total: 0, with_email: 0, countries: 0, sent: 0, replied: 0,
        new: 0, drafted: 0, bounced: 0, converted: 0, dead: 0, disadvantaged: 0,
      };

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        let q = supabase
          .from('montree_outreach_contacts')
          .select('country,status,email,contact_type')
          .range(from, from + PAGE_SIZE - 1);
        q = scoped(q, all);
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data || []) as Row[];

        for (const r of rows) {
          const key = all ? (r.country && r.country.trim() ? r.country : 'Unknown') : (r.country || 'Unknown');
          let e = acc.get(key);
          if (!e) {
            e = { country: key, total: 0, with_email: 0, new: 0, drafted: 0, sent: 0, replied: 0, bounced: 0, converted: 0, dead: 0, disadvantaged: 0 };
            acc.set(key, e);
          }
          e.total++;
          grand.total++;
          if (r.email) { e.with_email++; grand.with_email++; }
          if (r.contact_type === 'disadvantaged_school') { e.disadvantaged++; grand.disadvantaged++; }
          const s = r.status || '';
          if (s === 'new') { e.new++; grand.new++; }
          else if (s === 'drafted') { e.drafted++; grand.drafted++; }
          else if (s === 'sent') { e.sent++; grand.sent++; }
          else if (s === 'replied') { e.replied++; grand.replied++; }
          else if (s === 'bounced') { e.bounced++; grand.bounced++; }
          else if (s === 'converted') { e.converted++; grand.converted++; }
          else if (s === 'dead') { e.dead++; grand.dead++; }
        }

        if (rows.length < PAGE_SIZE) break;
        if (page === MAX_PAGES - 1) {
          console.warn('[global-outreach] by_country hit MAX_PAGES cap — results may be truncated.');
        }
      }

      const countries = Array.from(acc.values()).sort((a, b) => b.total - a.total);
      grand.countries = countries.length;
      return NextResponse.json({ countries, grand }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // ── contacts ──────────────────────────────────────────────────────────
    if (view === 'contacts') {
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      const q = url.searchParams.get('q') || '';

      let query = supabase
        .from('montree_outreach_contacts')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
      query = scoped(query, all);
      query = filterCountry(query, country);
      if (status) query = query.eq('status', status);
      if (q.trim()) {
        // amendment I2 — sanitize before the two-branch .or(): cap length,
        // escape ilike wildcards, strip chars that break .or() parsing.
        const safe = q.slice(0, 60).replace(/[%_\\]/g, '\\$&').replace(/[(),]/g, '');
        if (safe) query = query.or(`org_name.ilike.%${safe}%,email.ilike.%${safe}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return NextResponse.json({ contacts: data || [], total: count || 0 }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // ── export ────────────────────────────────────────────────────────────
    if (view === 'export') {
      const cols = ['org_name', 'email', 'country', 'region', 'phone', 'website', 'status', 'contact_type', 'source', 'notes', 'updated_at'];
      const lines: string[] = [cols.join(',')];

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        let query = supabase
          .from('montree_outreach_contacts')
          .select(cols.join(','))
          .order('updated_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        query = scoped(query, all);
        query = filterCountry(query, country);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        const rows = (data || []) as unknown as Array<Record<string, unknown>>;
        for (const r of rows) {
          lines.push(cols.map(c => csvCell(r[c])).join(','));
        }
        if (rows.length < PAGE_SIZE) break;
        if (page === MAX_PAGES - 1) {
          console.warn('[global-outreach] export hit MAX_PAGES cap — CSV may be truncated.');
        }
      }

      return new NextResponse(lines.join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="global-outreach-export.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[global-outreach] GET error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// CSV cell: neutralize injection (prefix leading =+-@ with a quote), then
// quote fields containing comma / quote / CR / LF, doubling embedded quotes.
function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
