# Montree — Overnight Build Plan (for approval)

*Drafted June 5, 2026. Source: MONTREE_ARCHITECTURE_AND_IMPROVEMENTS.md + session memory. Delivery: feature branch only — nothing touches `main` or Railway until you merge. A morning report lands with every change, the risk on each, and the manual steps left for you.*

---

## Ground rules for the run

- **Branch:** `overnight/hardening-2026-06-06`. All commits land here via Desktop Commander against your local `whale` checkout. No push to `main`, so Railway does not auto-deploy.
- **Lint gate:** every commit must pass `lint --max-warnings=0` (your hard rule). I will not commit anything that fails.
- **Self-audit:** full diff review (incl. mobile/iOS surfaces) before each commit, per your audit-before-commit rule.
- **No external dashboards:** I cannot rotate secrets or change Railway/Supabase/Stripe settings. Those stay on your morning to-do list.
- **No destructive prod actions:** no migrations applied to prod, no secrets touched, no users logged out. Migrations are written as files + rollback notes only.
- **Stop conditions:** if a change can't be validated without prod access, or a refactor balloons past its blast radius, I stop that item, leave a note, and move to the next.

---

## What I will build overnight (safe, code-only, ordered)

Ordered safest-first so the run degrades gracefully if interrupted.

### 1. Service-role route audit + report  *(backlog #3 prep)*
- **Do:** enumerate the ~20 routes using the Supabase service-role key; for each, confirm it filters by tenant (`school_id` / equivalent). Produce a table: route → filtered? → risk → exact fix.
- **Fix in place** only the clear-cut missing-filter cases; flag ambiguous ones for you.
- **Risk:** low. Read-heavy; fixes are additive `where` clauses.
- **Validate:** lint + manual trace of each touched route's tenant scoping.

### 2. First test layer  *(backlog #10)*
- **Do:** add Vitest + a handful of integration tests around the scariest logic: auth/JWT verification (all 5 systems), billing idempotency on `montree_finance_transactions` `(source, source_ref)`, and media-retention/expiry (`audio_destroyed_at`, Story media expiry cron).
- **Risk:** very low. Pure addition; no runtime path changes.
- **Validate:** tests pass locally; add `test` script to `package.json`.

### 3. `withAuth()` route wrapper  *(backlog #11)*
- **Do:** one documented helper per auth type (super-admin / montree / story / parent / cron). Convert a *small pilot set* of routes (5–10) to prove the pattern, not all 507.
- **Risk:** medium — touches auth. Kept low by piloting, not bulk-converting, and covering each with a test from item 2.
- **Validate:** tests + manual diff of every converted route.

### 4. Middleware role-lookup cache  *(backlog #7)*
- **Do:** short in-memory TTL cache (5–10 min) for `/admin/*` and `/parent/*` role lookups, invalidated on role change.
- **Risk:** medium — a stale cache could briefly mis-scope a role. Mitigate with short TTL + explicit invalidation hook.
- **Validate:** test the cache hit/miss/invalidation; trace invalidation points.

### 5. TypeScript cleanup beachhead  *(backlog #9)*
- **Do:** add a CI-style script that records the current `tsc --noEmit` error count (~5,233) and fails if it rises. Then chip the count down in `lib/` only (highest leverage), targeting a concrete dent (e.g. 200–400 errors).
- **Risk:** low. `ignoreBuildErrors` stays on; nothing ships differently.
- **Validate:** error count strictly lower than baseline; lint clean.

### 6. Split one giant file  *(backlog #12)* — only if time remains
- **Do:** pick the highest-leverage giant (likely `lib/montree/skill-graph.ts`, 2,931 lines — shared, no UI risk) and split into composable modules with no behavior change.
- **Risk:** medium without tests; done last and only if items 1–5 are clean.
- **Validate:** lint + tsc no worse + manual diff.

---

## What I will NOT do overnight (needs you)

These are real P0s but unsafe to ship unattended on a live app holding children's data.

- **#1 Rotate secrets** — external dashboards (Supabase/Stripe/AI/Railway). I'll instead verify `.env.local` is git-ignored and check `git log --all -- .env.local` for past commits, and leave you the exact rotation checklist.
- **#2 Remove `NEXT_PUBLIC_ADMIN_PASSWORD`** — needs a coordinated deploy + super-admin re-auth flow. I'll stage the server-side auth change on the branch; you deploy + set the new server secret.
- **#3 RLS policy tightening (the DB side)** — `USING (true)` → `school_id` filters can lock out real users. I'll write the migration + rollback SQL as files; you apply in the Supabase SQL editor after review.
- **#4 JWT TTL 365d → days/weeks** — logs everyone (incl. you) out and needs refresh/rotation. I'll write it behind a clearly-flagged change; you decide when to ship.
- **#6 Origin stabilization** — Railway replicas/healthcheck/OOM live in the Railway dashboard.

---

## Morning report you'll get

1. **What landed** — per-item: files changed, why, diff summary.
2. **Risk per change** — and what each was validated against.
3. **Your manual steps** — ordered: secrets to rotate, migrations to apply, the deploy sequence for #2/#4.
4. **What I stopped on** — anything I couldn't validate without prod, with the reason.
5. **Branch + how to review** — `git diff main...overnight/hardening-2026-06-06`, merge when satisfied.

---

## Open questions before I run

1. Confirm the local `whale` repo path so Desktop Commander can drive it.
2. OK to add Vitest as a dev dependency? (It's the cheapest test start; nothing ships to users.)
3. For the `withAuth()` pilot — any routes you'd specifically like covered first?
4. Hard time box, or run until the safe list is done?
