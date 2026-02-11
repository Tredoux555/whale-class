# Tech Debt Project — Complete Handoff

**Date:** Feb 11, 2026
**Status:** ALL 4 TASKS COMPLETE + AUDITED + DEPLOYED

---

## Summary

4-task tech debt project addressing the top items from the Known Technical Debt list: dead code, missing API auth, route sprawl, and insecure localStorage JWT storage.

**Total impact:** ~70 files changed, ~6,500 lines deleted, 43 API routes secured, auth migrated to httpOnly cookies.

**Commits (all pushed to `origin/main`):**

| Commit | Task | Description |
|--------|------|-------------|
| `8e35e33` | 1 | Remove Home product + dead routes |
| `031079a` | 2 | Add admin JWT auth to all Whale API routes |
| `319e88b` | 3 | Consolidate API routes: story send 4→1, curriculum CRUD |
| `1c92845` | 4 | Auth restructure: localStorage JWT → httpOnly cookies |
| `36194bd` | — | Update CLAUDE.md to reflect all changes |
| `f15b1c8` | — | Remove stale /home/ routes from robots.ts (audit fix) |

---

## Task 1: Dead Code Removal

**35 files deleted, 6,226 lines removed.**

Deleted the entire Home product (parent home-learning program that was never launched):
- `app/home/` — 3 pages (landing, login, register)
- `app/api/home/` — 4 API routes (auth/try, auth/login, auth/register, curriculum)
- `lib/home/` — auth helpers, curriculum helpers
- `components/home/` — UI components
- `lib/curriculum/data/home-curriculum.json` — 68-work curriculum data

Also deleted:
- `app/api/whale/themes/route.ts` — dead endpoint (no frontend called it)
- `app/admin/montree-home/` — orphaned admin page
- `FamiliesTab` from super-admin panel (referenced Home families table)
- Home references from middleware routing

**Audit finding (fixed):** Two stale `/home/` routes remained in `app/robots.ts` — removed in commit `f15b1c8`.

---

## Task 2: Whale API Auth

**43 Whale API routes protected via middleware-level admin JWT check.**

Previously, all `/api/whale/*` routes had zero authentication — they relied on the admin UI being behind a login page (UI-gated security). Now the middleware enforces `admin-token` cookie verification before any request reaches the route handler.

**Implementation:**
- Added JWT check in `middleware.ts` lines 119–136
- Checks `admin-token` httpOnly cookie → `verifyAdminToken()` via jose library
- Returns 401 JSON if missing or invalid
- Added `/api/whale/:path*` to middleware matcher (was excluded by regex)

**Exclusions (have own Supabase-based auth):**
- `/api/whale/parent/*` — 4 routes, check `supabase.auth.getUser()`
- `/api/whale/teacher/*` — 5 routes, check `supabase.auth.getUser()` + role verification

---

## Task 3: API Route Consolidation

**6 route files deleted, 2 consolidations.**

### Story Send (4 → 1)
Old: `send-message/`, `send-audio/`, `send-image/`, `send-video/` — 4 separate routes with duplicated auth logic.
New: Single `/api/story/admin/send` route handles all message types. Detects type from Content-Type header and file MIME type.

Shared helpers extracted to `lib/story/story-admin-auth.ts`:
- `verifyStoryAdminToken()` — JWT verification
- `getStoryJWTSecret()`, `getCurrentWeekStart()`, `getSessionToken()`, `getAdminLoginLogId()`

### Curriculum CRUD (3 → 1)
Old: Separate `curriculum/update/` and `curriculum/delete/` routes.
New: Main `curriculum/route.ts` now handles GET, POST, PATCH, and DELETE.

---

## Task 4: Auth Restructure (localStorage → httpOnly Cookies)

**The most impactful change. Fixes a security vulnerability AND fixes 31 broken dashboard pages.**

### Problem
Teacher/principal JWT tokens were stored in `localStorage` via `setToken()`. This was:
1. **Insecure** — vulnerable to XSS token theft
2. **Broken** — the curriculum page (and 30+ other pages) used raw `fetch()` without sending the Authorization header, so after Phase 3 added `verifySchoolRequest()`, they silently got 401s

### Solution
Server sets `montree-auth` httpOnly cookie on login. Browser automatically sends it on every same-origin request. No client-side code changes needed for fetch calls.

### Changes

**Server-side:**
- `lib/montree/server-auth.ts` — Added `MONTREE_AUTH_COOKIE`, `setMontreeAuthCookie()`, `clearMontreeAuthCookie()`
- `app/api/montree/auth/teacher/route.ts` — Sets cookie on login response
- `app/api/montree/principal/login/route.ts` — Sets cookie on both code-based and email-based login paths
- `app/api/montree/try/instant/route.ts` — **Now creates JWT tokens** (was missing — `setToken(responseData.token)` was setting `undefined`)
- `app/api/montree/auth/logout/route.ts` — **New** — clears the cookie
- `lib/montree/verify-request.ts` — Checks cookie first, then Bearer header fallback. `x-school-id` fallback removed from `verifySchoolRequest()`

**Client-side:**
- `lib/montree/api.ts` — `setToken()` is now a no-op (cleans up legacy localStorage), `getToken()` returns null, `clearToken()` calls logout API, `montreeApi()` no longer sends Authorization header
- Login pages (`login`, `principal/login`, `try`) — Removed `setToken()` calls

**Cookie settings:** `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 days`

### Bug Fix: try/instant Missing Tokens
The `/api/montree/try/instant` route was NOT creating JWT tokens. The client called `setToken(responseData.token)` but `responseData.token` was `undefined`. This means trial accounts had NO working auth token. Fixed by adding `createMontreeToken()` calls for both teacher and principal paths.

---

## Audit Results

Each task was audited by an independent agent after implementation.

| Task | Result | Findings |
|------|--------|----------|
| 1 | ✅ Pass | Stale `/home/` in robots.ts (fixed) |
| 2 | ✅ Pass | All 43 routes verified, exclusions correct |
| 3 | ✅ Pass | Old routes deleted, new routes handle all types, zero orphaned references |
| 4 | ✅ Pass | Cookie settings correct, all login paths set cookie, all pages will auto-authenticate |

### Critical Discovery: 31 Broken Dashboard Pages

The audit revealed that **31 pages** were broken in production since Security Phase 3 added `verifySchoolRequest()` to API routes. These pages use raw `fetch()` (not `montreeApi()`) and send no auth headers. On the deployed production code, `verifySchoolRequest()` required either a Bearer token or `x-school-id` header — raw `fetch()` provides neither.

The httpOnly cookie fix resolves all 31 pages in one shot because the browser automatically sends the cookie.

**Affected pages include:** curriculum, guru, reports, observations, capture, media, students, onboarding, weekly-review, videos, messages, work operations, and more.

---

## Remaining Items

### Not Part of This Project
- `MESSAGE_ENCRYPTION_KEY` rotation — still pending, see CLAUDE.md
- Centralized logging service
- PWA manifest
- x-school-id header cleanup (~11 frontend files still send it, harmless)

### Known Security Debt (Unchanged)
- Parent invite codes stored as plaintext
- CSP `script-src 'unsafe-inline'` required by Next.js
- `ignoreBuildErrors: true` in next.config.ts
