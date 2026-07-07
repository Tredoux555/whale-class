# PLAN — Ad-Geo Attribution Tracking (Jul 7, 2026) — LOCKED

**Owner:** Fable (PM). **Builder:** Opus. **Decided by Tredoux Jul 7:** internal-only v1 (no Meta pixel/CAPI), one super-admin funnel view, aggregates only (no PII display).

## Purpose
Run Facebook ads → track WHERE quality traffic comes from inside Montree super-admin (not FB's dashboard) → target ads at geos producing signups/trials, not clicks. Synergy: outreach email waves warm countries; ads give the same regions a second touch.

## What already exists (recon-verified Jul 7)
- App fronted by **Cloudflare** — `cf-ipcountry` header on every request (middleware.ts:126,136 uses it for locale only, never persisted).
- `montree_visitors` table (migrations 156 + 163) + write route `app/api/montree/visitors/track/route.ts` (public, rate-limited, bot-filtered, geo via external ip-api.com) + read route `app/api/montree/visitors/route.ts` + `VisitorsTab.tsx`.
- **🚨 SCHEMA DRIFT:** code comment in track/route.ts (~L88) says the LIVE table has `isp` instead of `ip` and no `page_url` (stuffed into referrer). **Builder MUST verify live schema before writing the migration** (pooler first; if GFW blocks, output a verification SQL for Tredoux).
- `montree_schools` already has `signup_country/_code/_city/_region/_ip/_timezone` (migration 128). `try/instant` writes them (~L530); `principal/register` uses a different IP helper (audit-logger.ts) and may NOT write them — verify + fix for parity.
- First-touch cookie precedent: `montree_ref` (welcome/[code] → RefCookie.tsx → read at principal/register → redeem.ts). Copy this pattern.
- **No UTM capture anywhere.** No utm columns anywhere.

## Build spec (v1)
1. **Migration 288** (check migrations/ for actual next number; idempotent; align with VERIFIED live schema):
   - `montree_visitors`: ADD `utm_source, utm_medium, utm_campaign, utm_content TEXT` + index on `(visited_at, utm_source)`. Repair drift columns only if verification confirms it's safe.
   - `montree_schools`: ADD `attrib_source TEXT, attrib_utm JSONB, attrib_first_touch_at TIMESTAMPTZ`.
2. **Capture:** wherever the visitor beacon fires on public pages, parse `location.search` for utm_* and include in the track POST. Server: prefer `cf-ipcountry` for country (keep ip-api as fallback/detail), persist utm fields.
3. **First-touch cookie `montree_attrib`** (non-httpOnly, 90d, SameSite=Lax, JSON: {source, utm_*, country, ts}) — set ONLY if absent (first touch wins). Set client-side alongside the beacon.
4. **Signup stamp:** `principal/register` AND `try/instant` read `montree_attrib` → write `attrib_source/attrib_utm/attrib_first_touch_at` on the school row. Fire-and-forget, NEVER blocks signup (redeem.ts posture). Also give register parity on signup_country.
5. **Super-admin funnel view:** extend `VisitorsTab` (or sibling section) — table: country × source → visits (montree_visitors), signups (montree_schools by attrib_source + signup_country), trial schools. Source derivation: utm_source if present; else referrer-domain class (facebook→`fb`, google→`search`, none→`direct`); welcome-code traffic = `outreach`. Date-range filter. English-only (super-admin convention). API: extend visitors route or new `super-admin/traffic-funnel/route.ts` with `verifySuperAdminAuth`.
6. **Privacy:** no raw IPs in UI; aggregates only.

## Rules that bind this build
- No new top-level PAGE routes → no middleware publicPaths change needed (verify).
- ESLint 0 errors, scoped tsc clean, runtime-audit checklist (Jun-14 rule) — list what needs live verification post-deploy.
- Migration is STAGED, not run — SQL pasted in chat for Tredoux (standing rule: everything runs from the chat).
- Never auto-send anything; no Stripe/billing touches.

## Out of scope v1 (do not build)
Maps, session replay, Meta pixel/CAPI, per-user journeys, UTM rewriting of approved outreach email links (flagged separately for Tredoux).

## Related decision (same day, separate track)
Disadvantaged founding cohort: Premium free for life, cap 15 admits, email all 29 emailable of the 80-row disadvantaged list, EsF HQ partnership letter in parallel. Templates pending Tredoux approval — see campaign log.
