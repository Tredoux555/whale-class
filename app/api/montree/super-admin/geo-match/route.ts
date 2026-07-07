// /api/montree/super-admin/geo-match — Visitor ↔ School Geo Match (v1)
//
// GET only. Cross-references site visitors (montree_visitors) against the
// outreach school list (montree_outreach_contacts) to plan email waves:
// warm geography → prioritized batches.
//
// Design (per PLAN_GEO_MATCH_JUL7.md AUDIT AMENDMENTS — binding):
//   - JOIN visitors ↔ contacts at COUNTRY level. ip-api visitor city names
//     almost never equal the school's "Region / City" composite, so city is a
//     SOFT badge only ("town-hot"), never a filter that empties the list.
//   - Country label spaces don't align 1:1 (visitor CF "US" vs contact "USA"
//     / "United States"). Normalize via a small hardcoded country_code →
//     contact-label lookup for the active outreach countries, with a
//     lower/trim fallback for everything else.
//   - Fetch contacts with .in('country', visitorCountryLabels) so we never
//     pull the whole 6,852-row table (avoids the implicit 1000-row cap).
//   - Warm flag: a country has ≥1 contact with status IN
//     ('sent','replied','meeting_booked','converted') AND sent_date NOT NULL,
//     AND a visitor visited that country AFTER that sent_date.
//   - No RPC, no migration, no raw IPs in the response.
import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VISITOR_ROW_CAP = 50000; // mirror visitors/route.ts stats query
const SCHOOLS_PER_LOCATION_CAP = 50;

// Country statuses that count as "we have emailed them" for the warm signal.
const WARM_STATUSES = new Set(['sent', 'replied', 'meeting_booked', 'converted']);

/**
 * Normalize a country label for cross-source matching. Lowercased + trimmed +
 * common punctuation/whitespace collapsed. Used as the JOIN key so that
 * visitor labels and contact labels that differ only in case/spacing still
 * meet. (Genuinely different labels — "USA" vs "United States" — are bridged
 * by CODE_TO_CONTACT_LABEL below before this normalization runs.)
 */
function normLabel(s: string | null | undefined): string {
  if (!s) return '';
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Hardcoded 2-letter country_code → the contact-table country label(s) as they
 * appear in the CSV-imported outreach list, for the active outreach countries.
 * Visitor country_code is Cloudflare-authoritative (more reliable than the
 * free-text visitor `country` label), so we prefer the code path when present.
 *
 * Values are the NORMALIZED contact label(s) (see normLabel). Multiple aliases
 * are allowed because the scrape used inconsistent names (e.g. "USA" and
 * "United States"). Anything not in this map falls back to normalizing the
 * visitor's own `country` label — a best-effort match that may miss.
 */
const CODE_TO_CONTACT_LABEL: Record<string, string[]> = {
  US: ['usa', 'united states', 'united states of america', 'us'],
  GB: ['uk', 'united kingdom', 'great britain', 'england'],
  DE: ['germany', 'deutschland'],
  NL: ['netherlands', 'the netherlands', 'holland'],
  AU: ['australia'],
  NZ: ['new zealand'],
  CA: ['canada'],
  IT: ['italy', 'italia'],
  FR: ['france'],
  ES: ['spain', 'españa', 'espana'],
  JP: ['japan'],
  KR: ['korea', 'south korea', 'republic of korea'],
  IN: ['india'],
  IE: ['ireland'],
  AE: ['uae', 'united arab emirates'],
  ZA: ['south africa'],
  MX: ['mexico', 'méxico'],
  BR: ['brazil', 'brasil'],
  AR: ['argentina'],
  CL: ['chile'],
  CO: ['colombia'],
  PE: ['peru', 'perú'],
  CN: ['china'],
  CH: ['switzerland'],
  NO: ['norway'],
  AT: ['austria'],
};

/**
 * Given a visitor group's country_code + country label, return the set of
 * normalized contact-country labels that should be considered a match.
 * Always includes the normalized visitor label itself as a fallback.
 */
function contactLabelsForVisitor(
  countryCode: string | null,
  countryLabel: string | null
): string[] {
  const out = new Set<string>();
  const code = (countryCode || '').toUpperCase().trim();
  if (code && CODE_TO_CONTACT_LABEL[code]) {
    for (const l of CODE_TO_CONTACT_LABEL[code]) out.add(l);
  }
  const norm = normLabel(countryLabel);
  if (norm) out.add(norm);
  return Array.from(out);
}

type VisitorRow = {
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  fingerprint: string | null;
  visited_at: string;
};

type ContactRow = {
  id: string;
  org_name: string | null;
  email: string | null;
  status: string | null;
  country: string | null;
  region: string | null;
  sent_date: string | null;
};

type SchoolOut = {
  id: string;
  org_name: string;
  has_email: boolean;
  status: string;
  town_hot: boolean;
  warm: boolean;
};

type LocationOut = {
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  visits: number;
  unique_visitors: number;
  last_seen: string;
  matched_country_label: string | null;
  schools_in_reach: number;
  schools: SchoolOut[];
  warm: boolean;
  town_hot: boolean;
};

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 90);
  const countryFilter = (url.searchParams.get('country') || '').trim();
  const minVisits = Math.max(parseInt(url.searchParams.get('min_visits') || '1', 10) || 1, 1);

  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    // ── Query A: visitors in window ─────────────────────────────────────────
    let vQuery = supabase
      .from('montree_visitors')
      .select('country, country_code, city, region, fingerprint, visited_at')
      .gte('visited_at', sinceISO)
      .limit(VISITOR_ROW_CAP);
    if (countryFilter) vQuery = vQuery.eq('country', countryFilter);

    const { data: visitorData, error: vError } = await vQuery;
    if (vError) throw vError;

    const visitors = (visitorData || []) as VisitorRow[];

    // Group visitors by (country_code|country|city|region) — a "location".
    type LocAcc = {
      city: string | null;
      region: string | null;
      country: string | null;
      country_code: string | null;
      visits: number;
      fingerprints: Set<string>;
      last_seen: string;
    };
    const locMap = new Map<string, LocAcc>();

    for (const v of visitors) {
      const city = v.city || null;
      const region = v.region || null;
      const country = v.country || null;
      const code = v.country_code || null;
      const key = `${code || ''}|${country || ''}|${city || ''}|${region || ''}`;
      let acc = locMap.get(key);
      if (!acc) {
        acc = {
          city,
          region,
          country,
          country_code: code,
          visits: 0,
          fingerprints: new Set<string>(),
          last_seen: v.visited_at,
        };
        locMap.set(key, acc);
      }
      acc.visits++;
      if (v.fingerprint) acc.fingerprints.add(v.fingerprint);
      if (v.visited_at > acc.last_seen) acc.last_seen = v.visited_at;
    }

    // Collect the normalized contact-country labels we need to fetch, and a
    // reverse index from normalized-label → the visitor country labels that
    // asked for it (so we can attach schools back to locations).
    const neededLabels = new Set<string>();
    // Per-location: which normalized contact labels match it (usually 1).
    const locLabels = new Map<string, string[]>();
    for (const [key, acc] of locMap) {
      const labels = contactLabelsForVisitor(acc.country_code, acc.country);
      locLabels.set(key, labels);
      for (const l of labels) neededLabels.add(l);
    }

    // ── Query B: contacts for ONLY the countries present in the visitor set ──
    // We cannot .in() on a normalized label (the DB stores the raw label), so
    // we fetch by the raw candidate labels. Build the raw-label candidate list
    // from the same code map (its values are already normalized == the common
    // stored form) plus the visitors' own raw labels. Then normalize on the
    // JS side when grouping so case/spacing differences still match.
    const rawCandidateLabels = new Set<string>();
    for (const acc of locMap.values()) {
      const code = (acc.country_code || '').toUpperCase().trim();
      if (code && CODE_TO_CONTACT_LABEL[code]) {
        for (const l of CODE_TO_CONTACT_LABEL[code]) rawCandidateLabels.add(l);
      }
      if (acc.country) rawCandidateLabels.add(acc.country);
    }

    // Also add capitalized variants for the code-map values (the CSV labels are
    // usually Title Case e.g. "South Africa", but our map stores lowercase).
    // Fetch is case-sensitive in Postgres for .in(), so include Title Case too.
    const inList: string[] = [];
    for (const l of rawCandidateLabels) {
      inList.push(l);
      // Title-case each word
      const title = l.replace(/\b\w/g, c => c.toUpperCase());
      if (title !== l) inList.push(title);
      // Upper-case (for "USA", "UAE", "UK")
      const upper = l.toUpperCase();
      if (upper !== l && upper.length <= 4) inList.push(upper);
    }

    const contactsByLabel = new Map<string, ContactRow[]>();
    // Country-level summary accumulator.
    type CountrySummary = {
      country: string; total: number; emailable: number;
      new: number; drafted: number; sent: number; replied: number;
      bounced: number; converted: number; dead: number;
    };
    const summaryMap = new Map<string, CountrySummary>();

    if (inList.length > 0) {
      // Paginate: a single .in() select truncates at supabase's implicit
      // 1000-row cap, and one visitor country (e.g. USA ~3,198 rows) blows past
      // it → silently undercounted schools/warm/summary. Mirror the .range()
      // loop that global-outreach/route.ts uses.
      const CONTACT_PAGE_SIZE = 1000;
      const CONTACT_MAX_PAGES = 300; // 300k-row safety cap
      const inArr = Array.from(new Set(inList));
      const contacts: ContactRow[] = [];
      for (let page = 0; page < CONTACT_MAX_PAGES; page++) {
        const from = page * CONTACT_PAGE_SIZE;
        const { data: contactData, error: cError } = await supabase
          .from('montree_outreach_contacts')
          .select('id, org_name, email, status, country, region, sent_date')
          .in('country', inArr)
          .range(from, from + CONTACT_PAGE_SIZE - 1);
        if (cError) throw cError;
        const rows = (contactData || []) as ContactRow[];
        contacts.push(...rows);
        if (rows.length < CONTACT_PAGE_SIZE) break;
        if (page === CONTACT_MAX_PAGES - 1) {
          console.warn('[geo-match] contacts fetch hit MAX_PAGES cap — results may be truncated.');
        }
      }

      for (const c of contacts) {
        const nl = normLabel(c.country);
        if (!nl) continue;
        if (!contactsByLabel.has(nl)) contactsByLabel.set(nl, []);
        contactsByLabel.get(nl)!.push(c);

        // Summary rollup keyed by the raw contact label.
        const skey = c.country || 'Unknown';
        let s = summaryMap.get(skey);
        if (!s) {
          s = { country: skey, total: 0, emailable: 0, new: 0, drafted: 0, sent: 0, replied: 0, bounced: 0, converted: 0, dead: 0 };
          summaryMap.set(skey, s);
        }
        s.total++;
        if (c.email) s.emailable++;
        const st = c.status || '';
        if (st === 'new') s.new++;
        else if (st === 'drafted') s.drafted++;
        else if (st === 'sent') s.sent++;
        else if (st === 'replied') s.replied++;
        else if (st === 'bounced') s.bounced++;
        else if (st === 'converted') s.converted++;
        else if (st === 'dead') s.dead++;
      }
    }

    // ── Assemble locations with matched schools ─────────────────────────────
    const locations: LocationOut[] = [];
    for (const [key, acc] of locMap) {
      if (acc.visits < minVisits) continue;

      const labels = locLabels.get(key) || [];
      // Gather matched contacts across all normalized labels for this location.
      const seen = new Set<string>();
      const matched: ContactRow[] = [];
      for (const l of labels) {
        const rows = contactsByLabel.get(l);
        if (!rows) continue;
        for (const r of rows) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          matched.push(r);
        }
      }

      // town-hot: visitor city (case-insensitive substring) appears in ANY
      // matched contact's region composite. Soft signal only.
      const cityNorm = (acc.city || '').toLowerCase().trim();
      let locTownHot = false;

      // warm: ∃ matched contact with a warm status + sent_date, and this
      // location's last_seen (a visit) is after that sent_date.
      let locWarm = false;
      const lastSeenTs = new Date(acc.last_seen).getTime();

      // Build the (capped) school output list. Prioritize emailable + warm.
      const schoolOut: SchoolOut[] = matched.map(c => {
        const region = (c.region || '').toLowerCase();
        const townHot = cityNorm.length >= 2 && region.includes(cityNorm);
        if (townHot) locTownHot = true;

        const sentTs = c.sent_date ? new Date(c.sent_date).getTime() : NaN;
        const warm =
          !!c.status &&
          WARM_STATUSES.has(c.status) &&
          !Number.isNaN(sentTs) &&
          lastSeenTs > sentTs;
        if (warm) locWarm = true;

        return {
          id: c.id,
          org_name: c.org_name || '(unnamed school)',
          has_email: !!c.email,
          status: c.status || 'new',
          town_hot: townHot,
          warm,
        };
      });

      // Sort: warm first, then town-hot, then emailable, then name.
      schoolOut.sort((a, b) => {
        if (a.warm !== b.warm) return a.warm ? -1 : 1;
        if (a.town_hot !== b.town_hot) return a.town_hot ? -1 : 1;
        if (a.has_email !== b.has_email) return a.has_email ? -1 : 1;
        return a.org_name.localeCompare(b.org_name);
      });

      locations.push({
        city: acc.city,
        region: acc.region,
        country: acc.country,
        country_code: acc.country_code,
        visits: acc.visits,
        unique_visitors: acc.fingerprints.size,
        last_seen: acc.last_seen,
        matched_country_label: labels[0] || null,
        schools_in_reach: matched.length,
        schools: schoolOut.slice(0, SCHOOLS_PER_LOCATION_CAP),
        warm: locWarm,
        town_hot: locTownHot,
      });
    }

    locations.sort((a, b) => b.visits - a.visits);

    // Country summary output (sorted by total schools desc).
    const countrySummary = Array.from(summaryMap.values()).sort((a, b) => b.total - a.total);

    // Country dropdown options = distinct visitor country labels in window.
    const countryOptions = Array.from(
      new Set(visitors.map(v => v.country).filter((c): c is string => !!c))
    ).sort();

    return NextResponse.json(
      {
        days,
        locations,
        country_summary: countrySummary,
        country_options: countryOptions,
        total_visits: visitors.length,
        location_count: locations.length,
      },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[geo-match] GET error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
