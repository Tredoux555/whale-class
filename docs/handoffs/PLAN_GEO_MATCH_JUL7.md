# PLAN — Visitor ↔ School Geo Match (Jul 7, 2026) — Fable plan, pending Opus audit

**Purpose (Tredoux, verbatim intent):** track which countries/towns visitors come from and analyse that AGAINST the Montessori-school outreach list, to plan email waves. Warm geography → prioritized batches.

## What exists (verified earlier today)
- `montree_visitors` already captures per visit: `ip(→isp drift), country, country_code, city, region, timezone, referrer, visited_at` (geo via ip-api.com; beacon = `VisitorTracker.tsx` in `app/montree/layout.tsx`). Ad-geo v1 (commit fc0ab19b) added utm columns + funnel view.
- Outreach list: `montree_outreach_contacts` (6,852 rows live, global-scrape batch_tag='global-scrape-jul2026'), driven by `GlobalOutreachTab.tsx` + `app/api/montree/super-admin/global-outreach/route.ts` (GET by_country/contacts/export). Status flow new→drafted→sent→replied…
- **✅ VERIFIED (Opus audit Jul 7) — see AUDIT AMENDMENTS section at bottom for the binding facts.** Short version: NO `city` column on `montree_outreach_contacts` (migration 182 is the CREATE, not 183). CSV City data survived — folded into the **`region`** column as `"{Region} / {City}"` (GlobalOutreachTab.tsx L143). No `emailed_at` column; the sent timestamp is `sent_date`. Visitors read route already aggregates city + country. GlobalOutreachTab has no URL/prop param (deep-link = new work).

## Build spec (v1)
1. **API — `app/api/montree/super-admin/geo-match/route.ts`** (GET, `verifySuperAdminAuth`):
   - Params: `days` (default 30), `country` (optional filter), `min_visits` (default 1).
   - Query A: `montree_visitors` in window → group by (country_code, country, city, region): visit_count, unique fingerprints, last_seen.
   - Query B: `montree_outreach_contacts` for the countries present in A → per country: total schools, emailable count, status breakdown; per city (IF a city field exists) exact/normalized match, ELSE country-level list with ilike city-in-(city|notes|org_name) best-effort (escape %_\\).
   - Response: locations ranked by visit_count, each with matched schools (name, email y/n, status, contact link/id) capped ~50/location.
   - **Warm flag:** location where ≥1 contact has status sent/emailed AND a visit occurred after its emailed_at → `warm: true` (someone we emailed likely looked).
   - Pagination-aware: don't silently truncate at supabase 1000 default; window+group in SQL if simpler (a Postgres RPC is acceptable but only if needed — prefer plain selects with explicit .limit and note the ceiling).
2. **UI — new "🗺 Geo Match" view** inside `VisitorsTab.tsx` (third view pill next to the existing list + 🎯 Funnel) — super-admin is hardcoded English:
   - Table: Town, Region, Country | visits | last seen | schools in reach (count + expandable rows: org_name, status chip, ✉️ y/n) | 🔥 warm badge.
   - Filters: days (7/30/90), country dropdown (from data), "only locations with schools" toggle.
   - Row action: link/deep-link into the 🌍 Global Outreach tab filtered to that country (query param if supported; else copy country name — keep cheap).
3. **No migration expected.** If the auditor confirms no city column on contacts, DO NOT add one in this build — match country-level + best-effort ilike; a city-enrichment backfill is a separate future task.
4. **Privacy:** no raw IPs in the UI. City-level aggregates + school rows only.

## Binding rules
- verifySuperAdminAuth before any query; ilike inputs escaped; `.maybeSingle()` where applicable; JSON-before-OK client-side; fetch error states rendered (diagnosable, not swallowed).
- ESLint 0 errors on touched files; scoped tsc clean; no new public routes (no middleware change).
- Out of scope: maps, IP display, contact-table schema changes, auto-email anything.

## Sacred flow
Fable plan (this doc) → Opus plan-audit (verify UNVERIFIED items, amend doc) → Opus build → Opus fresh-eyes review → Fable QC → commit+push via Desktop Commander.

---

## AUDIT AMENDMENTS (Opus plan-auditor, Jul 7 2026) — BUILDER: READ BEFORE BUILDING

### Verified schema facts (binding)
- **`montree_outreach_contacts`** created in **migration 182** (NOT 183 — 183 only adds demo-request statuses; 287 adds the `disadvantaged_school` contact_type). Geo-relevant columns: `country TEXT`, `region TEXT`, `website TEXT`, `phone TEXT`, `notes TEXT`. **There is NO `city` and NO `address` column.**
- **CSV → DB city mapping (the load-bearing fact):** `docs/outreach/Montree_Global_Master_Jul2026.csv` header = `Country,School,Email,Region,City,Phone,Website,Source,Type,Flags,Notes`. GlobalOutreachTab.tsx L136-148 folds City INTO `region`: `region = city ? (region ? "${region} / ${city}" : city) : region`. So **city lives inside the `region` column**, usually as `"Region / City"` (e.g. `"Gauteng / Sandton"`), sometimes just `"City"`, sometimes just region, sometimes NULL. Flags+Notes are joined into `notes` (`[flags, notes].join('; ')`). The route's `pickContactColumns` whitelist (L20-50) has NO `city`, so the CSV City was never a standalone column — this is not fixable without a migration + re-import (explicitly out of scope per plan §3).
- **Warm flag:** there is **no `emailed_at`**. Use **`sent_date`** (set on status `sent`) — plus `draft_date`/`reply_date` exist. The plan's `status sent/emailed` should read **`status IN ('sent','replied','meeting_booked','converted') AND sent_date IS NOT NULL`**, compared against visitor `visited_at`.
- **`montree_visitors`:** timestamp column is **`visited_at`**. Geo columns `country, country_code, city, region` are populated by `visitors/track/route.ts` — country/code prefer Cloudflare `cf-ipcountry` (authoritative), **city+region come from ip-api.com** (best-effort, can be NULL, and reflect the ISP/datacenter city, not necessarily the human's town). Bots are regex-filtered at track time.
- **Read route already does the aggregation:** `app/api/montree/visitors/route.ts` already groups by country AND by city (L103-117, `topCities` keyed `city|country`), capped at 50000 rows via `.limit(50000)` (no RPC needed). **Reuse this pattern — do NOT write an RPC.** The geo-match route can select the same slim columns (`country, country_code, city, region, fingerprint, visited_at`) `.gte('visited_at', since).limit(50000)` and group in JS.
- **GlobalOutreachTab deep-link:** the tab component takes **no props and reads no searchParams** → a country pre-filter into the tab is NEW work. HOWEVER the underlying API `global-outreach/route.ts` DOES accept `?view=contacts&country=X&status=Y&q=` (L60-131). Cheapest v1 = the geo-match row's "schools in reach" already renders the matched contacts inline (from the geo-match API), so a deep-link is optional polish. If wanted, thread a `country` into VisitorsTab→GlobalOutreachTab via a shared parent state or a `?tab=global&country=` query param — but keep it out of v1 unless trivial.

### CRIT / HIGH findings
- **[CRIT] City-level exact match is a dead end. Match at COUNTRY level for v1.** ip-api visitor city names will almost never equal the school's `"Region / City"` composite string. Two independent problems: (1) format mismatch (visitor `city="Sandton"` vs contact `region="Gauteng / Sandton"`), and (2) ip-api cities are datacenter/ISP-city, so a Sandton parent frequently geolocates as `"Johannesburg"`. **v1 rule: JOIN visitors ↔ contacts on `country` (or `country_code`→country name).** Then, as a *soft signal only*, mark a location "town-hot" when the visitor `city` string appears (case-insensitive substring, escaped) inside any matched contact's `region`. Never gate the school list on city — always show the country's schools, and surface the city hint as a badge. The plan's "per city exact/normalized match" (§Build spec 1 Query B) MUST be softened to this or the UI shows empty school lists for warm cities.
- **[CRIT] Country JOIN key mismatch.** Visitors carry BOTH `country` (label, may be NULL) and `country_code` (2-letter, CF-authoritative, more reliable). Contacts carry only `country` (free-text label from the CSV, e.g. "South Africa", "USA" vs "United States"). **These label spaces do NOT align 1:1.** Builder MUST decide a normalization: prefer mapping visitor `country_code` → the contact `country` label via a small hardcoded lookup for the ~20 active outreach countries, OR normalize both sides (lower/trim) and accept some misses. Flag mismatches in the response rather than silently dropping. Do not assume `visitors.country === contacts.country`.
- **[HIGH] Contacts row-ceiling.** 6,852 contacts; a naive single `.select()` hits supabase's implicit 1000-row cap → silent truncation of the school match. Either (a) fetch contacts filtered to ONLY the countries present in the visitor window (usually a handful → well under 1000), or (b) paginate with `.range()` like `global-outreach/route.ts` already does (PAGE_SIZE loop, MAX_PAGES guard). Option (a) is strongly preferred — query `montree_outreach_contacts` with `.in('country', [normalizedCountriesFromVisitors])` so you never pull the whole 6,852.
- **[HIGH] Don't re-aggregate the raw 50K visitor rows twice.** The plan implies a fresh grouped query; the existing read route already builds `topCities`/`country_breakdown`. Either reuse `visitors/route.ts` shape or, if a dedicated route is cleaner, copy its exact `.limit(50000)` + JS-group approach. No RPC, no `GROUP BY` in supabase-js (not supported without an RPC/view).
- **[MED] Warm flag needs per-location `sent_date` join, not a global flag.** "someone we emailed looked" = for a given country/location, ∃ contact with `sent_date` and ∃ visitor with `visited_at > that sent_date`. Compute per country (cheap: min visitor time in window vs any contact `sent_date` in that country). Keep it a soft badge.

### Net recommendation
Plan is sound and low-risk **once Query B is re-specified as country-join + city-as-soft-hint** (the two CRITs). No migration, no RPC, no schema change. Reuse `visitors/route.ts` aggregation and `global-outreach/route.ts` pagination patterns. Ship city matching as a badge, never as a filter that can empty the school list.
