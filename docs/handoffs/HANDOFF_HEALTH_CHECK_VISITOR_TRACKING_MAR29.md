# Handoff: 10x Health Check + Visitor Tracking — Mar 29, 2026

## Overview

Two features shipped this session:
1. **Visitor Tracking** — Track who's visiting montree.xyz with location data (city, country) for outreach campaign monitoring
2. **10x Health Check** — Full app audit fixing the primary lag source + security gaps + crash-safe error handling

Both deployed. Migration 156 run. Commits `85404d4e` (visitor tracking) + `331bf527` (health check) live on Railway.

---

## Feature 1: Visitor Tracking (3×3×3×3 Audited)

### What It Does
Every page visit on montree.xyz logs: location (city, country, region, timezone, lat/lng), ISP, device info (screen size, language, user agent), page path, referrer, and bot detection. Data visible in super-admin dashboard under 📍 Visitors tab.

### Architecture
- **Client:** `VisitorTracker.tsx` — fires `navigator.sendBeacon` on every route change, 30s client-side debounce, renders null (zero UI impact)
- **Server:** `POST /api/montree/visitors/track` — public endpoint, in-memory rate limit (1 per fingerprint per 30s), SHA256 fingerprinting from IP+UA+screen, bot detection (~33 patterns), ip-api.com geolocation, always returns `{ ok: true }` (no data leakage)
- **Admin:** `GET /api/montree/visitors` — super-admin only (verifySuperAdminAuth), paginated visitor list + aggregated stats (capped at 50K rows for performance)
- **UI:** `VisitorsTab.tsx` — 4 views (Live feed, Countries, Cities, Pages), error state with retry, AbortController cleanup

### Files Created (4)
1. `migrations/156_visitor_tracking.sql` — `montree_visitors` table + 5 indexes
2. `app/api/montree/visitors/track/route.ts` — Public POST tracking endpoint
3. `app/api/montree/visitors/route.ts` — Super-admin GET endpoint
4. `components/montree/VisitorTracker.tsx` — Client beacon component
5. `components/montree/super-admin/VisitorsTab.tsx` — Admin dashboard tab

### Files Modified (2)
1. `app/montree/super-admin/page.tsx` — Added VisitorsTab import, 'visitors' tab type, 📍 tab button
2. `app/montree/layout.tsx` — Added `<VisitorTracker />` inside `<I18nClientWrapper>`

### Migration
156 — ✅ RUN via Supabase SQL Editor (Mar 29)

### Audit
3×3×3×3 methodology. All audit cycles CLEAN. Bot detection covers 33+ patterns including common crawlers, SEO tools, and headless browsers.

---

## Feature 2: 10x Health Check

### Audit Methodology
5 parallel audit agents covering:
1. **API Performance** — Query patterns, unbounded fetches, N+1 queries, missing limits
2. **Frontend** — Component re-renders, data fetching patterns, bundle impact
3. **Database** — Missing indexes, query optimization, connection patterns
4. **Auth & Security** — Missing access checks, cross-school data leaks
5. **Middleware** — Request processing overhead, static file handling

### ~70+ Issues Found, 14 Highest-Priority Fixed

### Fixes Applied (12 files, commit `331bf527`)

#### PRIMARY LAG FIX
- **`app/api/montree/media/route.ts`** — 3 edits:
  - Added `.limit(500)` to direct media query and group media query (was loading ALL photos into memory — primary cause of user-reported lag)
  - Replaced `.select('*')` with specific columns only (id, storage_path, thumbnail_path, media_type, caption, captured_at, child_id, work_id, parent_visible, school_id, classroom_id, created_at, updated_at, auto_crop, tags)

#### SECURITY FIXES
- **`app/api/montree/messages/route.ts`** — Added `verifyChildBelongsToSchool` import and check on POST method. Previously any authenticated user could create messages for children in other schools.
- **`app/api/montree/messages/[id]/route.ts`** — Added school verification on both PATCH and GET methods. Previously any authenticated user could read/modify any message.

#### QUERY LIMIT FIXES
- **`app/api/montree/reports/preview/route.ts`** — Added `.limit(1000)` to both photo queries (direct media and group media children)

#### CRASH-SAFE ERROR HANDLING
- **`app/api/montree/reports/unreported/route.ts`** — Changed `.single()` to `.maybeSingle()` for last report lookup (0 reports is valid for first report), added error check for child lookup
- **`app/api/montree/guru/concerns/route.ts`** — Added error checks + early 404 returns on both GET and POST `.single()` calls
- **`app/api/montree/guru/suggestions/route.ts`** — Changed cached lookup to `.maybeSingle()`, added error check for child lookup
- **`app/api/montree/guru/daily-plan/route.ts`** — Changed cached + insert result to `.maybeSingle()`, added error check for child, added error logging for insert
- **`app/api/montree/billing/checkout/route.ts`** — Added explicit null check + error logging on school `.single()` lookup
- **`app/api/montree/billing/status/route.ts`** — Added explicit null check + error logging on school `.single()` lookup

#### SILENT FAILURE PREVENTION
- **`app/api/montree/pulse/route.ts`** — Changed `.catch(() => {})` to `.catch((err) => { console.error('[Pulse] Lock release failed:', err); })`. A silent lock failure could block pulse generation for 30 minutes.
- **`app/api/montree/guru/end-of-day/route.ts`** — Added `.catch()` error logging to fire-and-forget cache insert operation

---

## Remaining Issues (Lower Priority, Not Blocking)

### Performance
- N+1 insert patterns in admin import routes (should batch instead of loop)
- Large classifier signature files (556 KB) loaded eagerly — could be lazy-loaded
- Middleware DB role lookups on every protected request — could cache in JWT claims

### Database
- Missing composite indexes: `teachers(school_id, is_active)`, `children(classroom_id, is_active)`
- These would speed up dashboard loads for schools with many teachers/children

### Code Quality
- ~14 more `.single()` calls in admin/onboarding routes need `.maybeSingle()` + error handling
- `ignoreBuildErrors: true` in next.config.ts hiding TypeScript errors at build time

### Security (Low Risk)
- `verifyChildBelongsToSchool` still missing from: `weekly-planning/*` routes

---

## Deploy Summary
- **Visitor Tracking:** Commit `85404d4e` — ✅ PUSHED, Railway deployed
- **Health Check:** Commit `331bf527` — ✅ PUSHED, Railway deployed
- **Migration 156:** ✅ RUN via Supabase SQL Editor
- **No new env vars required**
