# Morning Report — Overnight Hardening Run (2026-06-06)

**Branch:** `overnight/hardening-2026-06-06` (1 commit, `baba8f74`). Nothing pushed to `main`, nothing deployed. Review with:
`git diff main...overnight/hardening-2026-06-06`

---

## Headline

I prioritized the security audit (P0 #3) and it surfaced something important: **the architecture doc undercounts the service-role exposure by ~20×**. The doc says "~20 routes use the service-role key" — the real number is **~466** (essentially every API route), because `getSupabase()` and its aliases all return an RLS-bypassing service-role client.

The good news: despite that, I found **zero open cross-tenant holes** in the high-sensitivity tables. Isolation is enforced consistently, just not by RLS — by the middleware admin-JWT gate plus the `verifySchoolRequest` / `verifyChildBelongsToSchool` helpers. I encoded the audit into a CI guard so this can't silently regress.

## What landed (all additive, branch-only)

1. **`scripts/audit-tenant-scoping.mjs`** — fails CI if any route touches a sensitive tenant table without `school_id` filtering, a verify helper, or the middleware admin gate. Currently: **185 routes checked, 0 violations.** Run: `npm run audit:tenant-scoping`.
2. **`scripts/ts-error-budget.mjs`** + **`ts-error-baseline.json`** (baseline **5,233**, confirmed by full `tsc` run) — one-way ratchet so type errors can only go down. Run: `npm run audit:ts-budget`.
3. **`docs/SECURITY_AUDIT_SERVICE_ROLE_2026-06-06.md`** — full findings, method, and the 4 routes I individually cleared.
4. **`package.json`** — two new npm scripts (only tracked-file change; +3 lines).

Validated: package.json parses, both guards pass, ESLint clean (`--max-warnings=0`), full diff reviewed.

## Verified facts

- **`.env.local` was never committed** — git-ignored, empty history on all refs. The P0 #1 *git-leak* emergency does not apply. (Rotating creds is still good hygiene, not urgent.)
- **TS baseline = 5,233 errors** (matches the doc) — captured so cleanup has a ratchet.

## Your manual to-do (things I can't safely do unattended)

1. **P0 #2 — `NEXT_PUBLIC_ADMIN_PASSWORD`** is in `app/montree/super-admin/page.tsx`. `NEXT_PUBLIC_*` ships in the browser bundle = effectively public. Move super-admin auth fully server-side; make the secret long+random. Needs a coordinated deploy — I can stage the code change next run for your review.
2. **P0 #3 (defense-in-depth) — RLS policies.** Tighten `USING (true)` policies to `school_id`-scoped on `montree_children`, `montree_parents`, `montree_media`. This is a DB migration that can lock users out if wrong — I'll write it as a reviewable migration + rollback, *you* apply it in Supabase.
3. **P0 #1 — rotate creds** if you want belt-and-suspenders (Supabase service-role, Stripe, AI keys, DB password). External dashboards, your call.

## Deferred to a next run (deliberately, not skipped)

The bigger build items — Vitest suite (#10), `withAuth()` route conversions (#11), middleware role cache (#7), giant-file splits (#12) — I held back. They're auth- or behavior-touching, there are still no tests as a safety net, and I'd rather hand you a tight reviewed set than a sprawling half-tested one produced unattended. Say the word and I'll take them one at a time on this branch.

## Honest note on "overnight"

I'm not a detached background process — I run inside our session, so I can't literally grind for 8 hours unattended. What I did instead: the highest-value, lowest-risk slice done properly, committed, audited, and documented. The audit alone corrected a material misconception about the app's security posture, which was worth the run.
