# Service-Role / Tenant-Isolation Audit — 2026-06-06

*Overnight hardening run. Branch: `overnight/hardening-2026-06-06`. Read-only audit + one additive guard script. No route logic changed, nothing deployed.*

## TL;DR

The architecture doc's claim of "**~20** API routes use the service-role key" is a **large undercount**. In reality **essentially every API route** uses the service-role client (which bypasses RLS). Despite that, a targeted audit of the highest-sensitivity tables found **zero open cross-tenant holes** — isolation is enforced consistently through three mechanisms. A regression guard (`scripts/audit-tenant-scoping.mjs`) now encodes the audit so the bug class can't silently return.

## What was verified

**1. `.env.local` was never committed.** It is git-ignored (`.gitignore:33` → `.env*.local`) and has **no history across any ref** (`git log --all -- .env.local` is empty). Only `.env.example` / `.env.stripe.example` (templates) are tracked. → The secret-leak emergency in P0 #1 does **not** apply to git history. Rotating credentials remains good hygiene but is not urgent on these grounds.

**2. The service-role footprint is the whole app, not ~20 routes.** `lib/supabase-client.ts` `getSupabase()` returns a **service-role** client (its own comment: "service role — bypasses RLS"). Three aliases all point to it: `createAdminClient`, `createServerClient`, `createSupabaseAdmin`. ~466 route files call one of these. So RLS is **not** a backstop for the app today — tenant isolation rests entirely on the application layer.

**3. Application-layer isolation is, in fact, disciplined.** Three protection mechanisms cover the surface:

- **Middleware admin-JWT gate** (`middleware.ts` `requiresAdminJWT`) — forces a valid `admin-token` cookie on the legacy groups: `/api/admin/*`, `/api/whale/*` (except `parent/`+`teacher/`, which self-auth), `/api/weekly-planning/*`, `/api/curriculum-import/*`, `/api/students/*`, `/api/classroom/*`, `/api/onboard/*`.
- **`verifySchoolRequest`** → returns `{ role, schoolId, userId }`; disciplined routes scope every query `.eq('school_id', auth.schoolId)`. (Verified clean on the sensitive `app/api/montree/admin/parents/[parentId]/route.ts` — role-gated + school-scoped on every read, update, delete, and audit insert.)
- **`verifyChildBelongsToSchool`** (`lib/montree/verify-child-access.ts`) — the single source of truth for `child_id` access; joins `children → classrooms` on `school_id`. Routes that scope by `child_id` are therefore safe without a literal `school_id`.
- Parent routes additionally use `parent-auth` / `resolveAuthorizedParent` (per-request DB re-check).

## Method

Scanned all route files touching `montree_parents | montree_children | montree_media`, then filtered out any that reference `school_id` **or** a verify helper. 60+ raw candidates narrowed to **4**. All 4 were then individually confirmed protected:

| Route | Protection |
|---|---|
| `curriculum-import/works` | middleware admin-JWT |
| `curriculum-import/onboarding` | middleware admin-JWT |
| `whale/student/[studentId]/progress-summary` | middleware admin-JWT (`/api/whale/`, not parent/teacher) |
| `super-admin/i18n-sync` | `verifySuperAdminAuth` + `x-cron-secret` |

**Result: 0 unprotected routes.** The new guard re-runs this logic and currently reports `185 sensitive-table routes checked, 0 violations`.

## Residual risk (not holes, but worth doing)

1. **RLS is still not a defense-in-depth backstop.** Every isolation guarantee is one missing `.eq('school_id', ...)` away from a leak. The guard catches the *sensitive-table* cases at CI time; tightening RLS policies (`USING (true)` → `school_id`-scoped) would make it a true second layer. This is a DB migration — staged for review, **not** applied here (it can lock users out if wrong).
2. **Audit scope was the highest-sensitivity tables.** Other tenant tables (meeting transcripts, finance ledger, message threads) were not exhaustively swept this run. Extend `SENSITIVE_TABLES` in the guard incrementally.
3. **`NEXT_PUBLIC_ADMIN_PASSWORD`** is referenced in `app/montree/super-admin/page.tsx` — anything `NEXT_PUBLIC_*` ships in the browser bundle (P0 #2). Unchanged here; needs a coordinated server-auth change + deploy.

## What this run changed

- **Added:** `scripts/audit-tenant-scoping.mjs` (regression guard, additive, imports nothing, runnable in CI/pre-push).
- **No route logic touched. No migration applied. No secrets touched. Nothing deployed.**
