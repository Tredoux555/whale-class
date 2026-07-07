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

// Social pipeline states (migration 289). Shared by the contacts GET (social
// view filter) and the set_social PATCH (validation).
const SOCIAL_STATUS_SET = new Set([
  'none', 'found', 'invited', 'messaged', 'replied', 'connected', 'dead',
]);
// Postgres "undefined column" — thrown when migration 289 hasn't run yet.
const UNDEFINED_COLUMN = '42703';

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

    // ── social_counts ─────────────────────────────────────────────────────
    // Counter strip for the 📘 Social view: how many rows sit in each social
    // pipeline state (found / invited / messaged / replied / connected / dead)
    // within the current scope + country filter. Paged; 42703-safe.
    if (view === 'social_counts') {
      const counts: Record<string, number> = {
        found: 0, invited: 0, messaged: 0, replied: 0, connected: 0, dead: 0, tracked: 0,
      };
      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        let q = supabase
          .from('montree_outreach_contacts')
          .select('social_status,facebook_url')
          .range(from, from + PAGE_SIZE - 1);
        q = scoped(q, all);
        q = filterCountry(q, country);
        const { data, error } = await q;
        if (error) {
          if ((error as { code?: string }).code === UNDEFINED_COLUMN) {
            return NextResponse.json({ counts, migration_pending: true }, { headers: { 'Cache-Control': 'no-store' } });
          }
          throw error;
        }
        const rows = (data || []) as Array<{ social_status: string | null; facebook_url: string | null }>;
        for (const r of rows) {
          const s = r.social_status || 'none';
          const tracked = (s !== 'none') || !!r.facebook_url;
          if (tracked) counts.tracked++;
          if (s in counts) counts[s]++;
        }
        if (rows.length < PAGE_SIZE) break;
        if (page === MAX_PAGES - 1) {
          console.warn('[global-outreach] social_counts hit MAX_PAGES cap — results may be truncated.');
        }
      }
      return NextResponse.json({ counts }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // ── contacts ──────────────────────────────────────────────────────────
    if (view === 'contacts') {
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      const q = url.searchParams.get('q') || '';
      // Social view: restrict to rows with any social presence (a facebook_url
      // OR a social_status other than 'none'). Only applied when requested.
      const socialOnly = url.searchParams.get('social') === '1';
      const socialStatus = url.searchParams.get('social_status') || '';

      const runQuery = (applySocial: boolean) => {
        let query = supabase
          .from('montree_outreach_contacts')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);
        query = scoped(query, all);
        query = filterCountry(query, country);
        if (status) query = query.eq('status', status);
        if (applySocial) {
          if (socialStatus && SOCIAL_STATUS_SET.has(socialStatus)) {
            query = query.eq('social_status', socialStatus);
          } else {
            query = query.or('facebook_url.not.is.null,social_status.neq.none');
          }
        }
        if (q.trim()) {
          // amendment I2 — sanitize before the two-branch .or(): cap length,
          // escape ilike wildcards, strip chars that break .or() parsing.
          const safe = q.slice(0, 60).replace(/[%_\\]/g, '\\$&').replace(/[(),]/g, '');
          if (safe) query = query.or(`org_name.ilike.%${safe}%,email.ilike.%${safe}%`);
        }
        return query;
      };

      let { data, error, count } = await runQuery(socialOnly);
      // 42703-safe: if the social columns don't exist yet (migration 289 not
      // run), the social filter references a missing column. Retry without the
      // social clause so the tab renders empty instead of 500-ing.
      if (error && (error as { code?: string }).code === '42703' && socialOnly) {
        ({ data, error, count } = await runQuery(false));
        if (!error) {
          return NextResponse.json(
            { contacts: [], total: 0, migration_pending: true },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
      }
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

// ── PATCH: set_social ─────────────────────────────────────────────────────
// Update the social-outreach channel for one contact (migration 289). This is
// a SEPARATE axis from the email `status` flow (that stays on campaign-manager
// PATCH). Advances social_status, stamps social_invited_at / social_replied_at
// on the appropriate transitions (first time only), and sets the 4 URL fields
// + social_notes when supplied.
export async function PATCH(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action;

  // ── social_enrich ─────────────────────────────────────────────────────────
  // Enrich EXISTING contact rows (imported yesterday from the master list) with
  // discovered social URLs. bulk_import can't do this — it upserts-or-skips on
  // unique conflict and never touches existing rows. Here we MATCH by
  // (org_name, country) within a batch and UPDATE only the social columns.
  if (action === 'social_enrich') {
    return socialEnrich(body);
  }

  if (action !== 'set_social') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getSupabase();

  try {
    // Read the current row so we only stamp the *_at timestamps on the FIRST
    // transition into a state (don't re-stamp on re-saves).
    const { data: current, error: readErr } = await supabase
      .from('montree_outreach_contacts')
      .select('social_status, social_invited_at, social_replied_at')
      .eq('id', id)
      .maybeSingle();
    if (readErr) {
      const code = (readErr as { code?: string }).code;
      if (code === UNDEFINED_COLUMN) {
        return NextResponse.json(
          { error: 'social columns not present — run migration 289 first', migration_pending: true },
          { status: 409 },
        );
      }
      throw readErr;
    }
    if (!current) return NextResponse.json({ error: 'contact not found' }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.social_status !== undefined) {
      const next = String(body.social_status);
      if (!SOCIAL_STATUS_SET.has(next)) {
        return NextResponse.json({ error: `invalid social_status: ${next}` }, { status: 400 });
      }
      update.social_status = next;
      const cur = current as { social_invited_at?: string | null; social_replied_at?: string | null };
      const nowIso = new Date().toISOString();
      if ((next === 'invited' || next === 'messaged') && !cur.social_invited_at) {
        update.social_invited_at = nowIso;
      }
      if ((next === 'replied' || next === 'connected') && !cur.social_replied_at) {
        update.social_replied_at = nowIso;
      }
    }

    // URL + notes fields: set when the key is present (empty string clears).
    for (const field of ['facebook_url', 'instagram_url', 'linkedin_url', 'x_url', 'social_notes']) {
      if (body[field] !== undefined) {
        const v = body[field];
        update[field] = v == null ? null : String(v).slice(0, 2000);
      }
    }

    const { data, error } = await supabase
      .from('montree_outreach_contacts')
      .update(update)
      .eq('id', id)
      .select('id, org_name, social_status, social_invited_at, social_replied_at, facebook_url, instagram_url, linkedin_url, x_url, social_notes')
      .maybeSingle();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === UNDEFINED_COLUMN) {
        return NextResponse.json(
          { error: 'social columns not present — run migration 289 first', migration_pending: true },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ contact: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[global-outreach] PATCH error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── social_enrich implementation ───────────────────────────────────────────
// Body: { rows: [{school_name, country, facebook_url, instagram_url,
//   linkedin_url, x_url, social_notes, email}], batch_tag? }.
// Matches each row to existing contact(s) by exact org_name = school_name AND
// country; if none, retries a case-insensitive ilike (escaped). Updates ONLY
// the social URL columns (non-empty values only — never blanks an existing
// URL), appends social_notes, promotes social_status none/NULL → 'found', and
// fills email when the row carries one and the contact has none. Multiple exact
// matches on the same org_name+country are treated as campus dup rows and ALL
// updated; anything else is counted ambiguous.
type EnrichRow = {
  school_name?: unknown; country?: unknown;
  facebook_url?: unknown; instagram_url?: unknown;
  linkedin_url?: unknown; x_url?: unknown;
  social_notes?: unknown; email?: unknown;
};
type ExistingContact = {
  id: string; org_name: string; country: string | null; email: string | null;
  social_status: string | null; social_notes: string | null;
  facebook_url: string | null; instagram_url: string | null;
  linkedin_url: string | null; x_url: string | null;
};

const SELECT_COLS =
  'id, org_name, country, email, social_status, social_notes, facebook_url, instagram_url, linkedin_url, x_url';
// Escape ilike wildcards so a school name with %/_/\ can't act as a pattern.
const escLike = (s: string) => s.replace(/[%_\\]/g, '\\$&');
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

async function socialEnrich(body: Record<string, unknown>) {
  const rows = Array.isArray(body.rows) ? (body.rows as EnrichRow[]) : null;
  if (!rows) return NextResponse.json({ error: 'rows[] required' }, { status: 400 });
  if (rows.length > 500) {
    return NextResponse.json({ error: 'too many rows — max 500 per call' }, { status: 413 });
  }
  const batchTag = str(body.batch_tag) || BATCH_TAG;
  const supabase = getSupabase();

  let matched = 0, updated = 0, ambiguous = 0;
  const unmatched: string[] = [];

  try {
    for (const raw of rows) {
      const school = str(raw.school_name);
      const cc = str(raw.country);
      if (!school) { ambiguous++; continue; }
      const keyLabel = `${school}${cc ? ` (${cc})` : ''}`;

      // 1) exact match on org_name + country within the batch.
      let base = supabase
        .from('montree_outreach_contacts')
        .select(SELECT_COLS)
        .eq('org_name', school)
        .eq('batch_tag', batchTag);
      base = cc ? base.eq('country', cc) : base.or('country.is.null,country.eq.');
      const exact = await base.limit(50);
      let data = exact.data;
      const error = exact.error;
      if (error) {
        if ((error as { code?: string }).code === UNDEFINED_COLUMN) {
          return NextResponse.json(
            { error: 'social columns not present — run migration 289 first', migration_pending: true },
            { status: 409 },
          );
        }
        throw error;
      }

      // 2) fallback: case-insensitive name match (escaped) within the batch.
      if (!data || data.length === 0) {
        let q2 = supabase
          .from('montree_outreach_contacts')
          .select(SELECT_COLS)
          .ilike('org_name', escLike(school))
          .eq('batch_tag', batchTag);
        q2 = cc ? q2.eq('country', cc) : q2.or('country.is.null,country.eq.');
        const r2 = await q2.limit(50);
        if (r2.error) throw r2.error;
        data = r2.data;
      }

      const hits = (data || []) as unknown as ExistingContact[];
      if (hits.length === 0) { unmatched.push(keyLabel); continue; }

      // Only update multiple hits when they share the SAME org_name+country
      // exactly (campus dup rows). Otherwise it's ambiguous — leave them.
      if (hits.length > 1) {
        const sameKey = hits.every(h =>
          h.org_name === hits[0].org_name && (h.country || '') === (hits[0].country || ''),
        );
        if (!sameKey) { ambiguous++; continue; }
      }
      matched++;

      const fb = str(raw.facebook_url), ig = str(raw.instagram_url);
      const li = str(raw.linkedin_url), x = str(raw.x_url);
      const notes = str(raw.social_notes);
      const email = str(raw.email);

      for (const h of hits) {
        const patch: Record<string, unknown> = {};
        // Social URLs — set only when incoming is non-empty (never blank one).
        if (fb) patch.facebook_url = fb.slice(0, 2000);
        if (ig) patch.instagram_url = ig.slice(0, 2000);
        if (li) patch.linkedin_url = li.slice(0, 2000);
        if (x) patch.x_url = x.slice(0, 2000);
        // Append notes (don't overwrite).
        if (notes) {
          patch.social_notes = (h.social_notes ? `${h.social_notes}; ` : '') + notes;
          if (String(patch.social_notes).length > 2000) {
            patch.social_notes = String(patch.social_notes).slice(0, 2000);
          }
        }
        // Promote status only from none/NULL → found.
        if (!h.social_status || h.social_status === 'none') patch.social_status = 'found';
        // Fill email only when the contact has none and the row carries one.
        if (email && email.includes('@') && !h.email) patch.email = email.slice(0, 200);

        if (Object.keys(patch).length === 0) continue;
        patch.updated_at = new Date().toISOString();

        const { error: upErr } = await supabase
          .from('montree_outreach_contacts')
          .update(patch)
          .eq('id', h.id);
        if (upErr) {
          if ((upErr as { code?: string }).code === UNDEFINED_COLUMN) {
            return NextResponse.json(
              { error: 'social columns not present — run migration 289 first', migration_pending: true },
              { status: 409 },
            );
          }
          throw upErr;
        }
        updated++;
      }
    }

    return NextResponse.json(
      { matched, updated, unmatched, ambiguous },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[global-outreach] social_enrich error:', e);
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
