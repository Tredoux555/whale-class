# Tech Debt Master Plan — 4 Tasks, Least → Most Risky

**Goal:** Work through all remaining technical debt systematically. Each task gets a detailed plan, audit of the plan, implementation, post-implementation audit, and fixes — all before moving to the next task.

---

## Task Order (least risky → most risky)

### Task 1: Dead Code Removal
**Risk: ZERO** — Only deleting code that's confirmed unused.

**Scope:**
- Delete ALL Home product code (user confirmed Home is scrapped):
  - `app/home/` — all pages (page.tsx, register, login, dashboard)
  - `app/api/home/` — all 12 routes (auth/try, auth/login, auth/register, curriculum, progress, children, debug)
  - `lib/home/` — auth.ts, curriculum-helpers.ts
  - `lib/curriculum/data/home-curriculum.json` — 68-work curriculum data
  - Any Home-related imports/references in shared files
- Delete ~7 confirmed dead API routes:
  - `/api/montree/feedback/route.ts` + `feedback/upload-screenshot/route.ts`
  - `/api/montree/notify/route.ts`
  - `/api/montree/focus-works/route.ts`
  - `/api/montree/dm/route.ts`
  - `/api/whale/themes/route.ts`
  - `/api/public/videos/route.ts`
- Clean up CLAUDE.md references to Home

**Verification:** Build passes (`npm run build`), no broken imports, grep for orphaned references.

---

### Task 2: Whale API Auth (43 routes with zero auth)
**Risk: LOW** — Adding auth guards to admin-only routes. If anything breaks, it only affects admin tools (Whale Class), not the SaaS product (Montree).

**Scope:**
- Add admin JWT verification to all 43 Whale API routes
- Pattern already exists: `lib/auth.ts` has `verifyAuth()` using `jose` + `ADMIN_SECRET`
- Each route gets: JWT check → 401 if invalid → proceed if valid
- Frontend already sends JWT in cookie (set on admin login)

**Approach:**
- Create a shared middleware helper (or reuse existing `verifyAuth`)
- Apply consistently to all 43 routes
- Test that admin tools still work when logged in, return 401 when not

**Verification:** Build passes, all Whale routes return 401 without valid JWT, admin tools function normally with JWT.

---

### Task 3: API Route Consolidation
**Risk: MEDIUM** — Merging routes means changing URLs, which requires updating all frontend fetch calls too.

**Scope (prioritized by value):**

**Phase 3A — CRUD consolidation (high value, low complexity):**
- Montree curriculum: merge `/update`, `/delete`, `/reorder` into main `/curriculum` route using HTTP methods (PATCH, DELETE, PUT)
- Montree progress: merge `/update` into main `/progress` route (POST/PATCH)
- Weekly planning: merge `/add-work`, `/delete` into main route with methods
- Story admin send-*: merge send-message, send-audio, send-image, send-video into single `/send` route with type param
- Story vault: merge list/upload/download/delete/unlock/save-from-message into fewer routes

**Phase 3B — Deduplication (medium value, medium complexity):**
- Whale vs Montree overlap: identify and remove Whale routes that duplicate Montree functionality
- Progress variants: consolidate summary/bars/enhanced into single route with query params

**Phase 3C — Large file extraction (low urgency):**
- Extract business logic from 5 largest routes (400+ lines each) into lib/ files
- Routes become thin wrappers

**Verification:** Build passes, all frontend features work, no broken fetch calls, route count significantly reduced.

---

### Task 4: Auth Restructure (localStorage → httpOnly cookies)
**Risk: HIGH** — Changing the fundamental auth mechanism for teacher sessions and teacher admin. Affects login, logout, every authenticated request, and middleware.

**Scope:**
- Teacher sessions: move JWT from localStorage to httpOnly cookie
- Teacher admin sessions: same
- Update middleware to read cookies instead of Authorization headers
- Update all frontend code that reads/writes localStorage tokens
- Add proper cookie management (set on login, clear on logout, expiry)
- Ensure CSRF protection works with cookie-based auth

**Approach:**
- Cookie-based auth is already used by admin JWT (lib/auth.ts) — extend that pattern
- Parent auth already uses cookies (montree_parent_session) — proven pattern
- Implement as backward-compatible first (accept both cookie and header), then remove header support

**Verification:** Build passes, login/logout flows work, sessions persist across page refreshes, cookies are httpOnly + Secure + SameSite, no localStorage token usage remains.

---

## Process for Each Task

```
1. PLAN     → Write detailed implementation plan for the task
2. AUDIT    → Review plan for gaps, risks, missed files
3. REVISE   → Fix any issues found in audit
4. EXECUTE  → Implement the changes
5. AUDIT    → Post-implementation review (build, grep for orphans, test auth flows)
6. FIX      → Address any issues from post-audit
7. CONFIRM  → Verify everything is clean before moving to next task
```

---

## What We're NOT Touching
- Montree SaaS routes (working, authenticated, recently hardened)
- Story system routes (working)
- Super-admin routes (recently hardened in Phase 9)
- Database schema
- Deployment/Railway config
