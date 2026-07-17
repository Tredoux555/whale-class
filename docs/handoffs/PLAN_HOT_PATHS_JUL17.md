# PLAN — HOT-PATH HARDENING (Jul 17, 2026) — BINDING CONTRACT

**Author: Fable (director). Builders: Opus (2 sequential builds). Auditor: Sonnet fresh-eyes per
build. Final gate: Fable reads every diff before push.** Context: Tredoux's ruling — real schools
are about to onboard; the deferred hot-path items get fixed NOW, while the data still belongs to
test schools. "It needs to be clockwork."

Ground rules identical to PLAN_OPTIMAL_GAPS_JUL17.md: touch only named files, skip-and-report any
git-dirty file, forbidden Founding-Sunset file list applies unchanged, no new deps, eslint 0 new
errors, never weaken auth/rate limits/the shelf invariant.

---

## PHASE 1 (Build A — small, ships first): lock enforcement + pagination

### A1. locked_at check in the auth hot path

File: `lib/montree/verify-request.ts` (+ it may import from a NEW tiny helper file
`lib/montree/school-lock.ts` — preferred, keeps verify-request lean).

Design (Fable's, follow exactly):
- New `lib/montree/school-lock.ts`: `isSchoolLocked(schoolId): Promise<boolean>` reading
  `montree_schools.locked_at` via `getSupabase()`, with an in-process Map cache
  `{ lockedAt, at }`, TTL **60s**. **FAIL-OPEN**: any DB error / timeout → return false (an
  outage must never lock out the world). Export `invalidateSchoolLock(schoolId?)`.
- In `verifySchoolRequest`, AFTER a token verifies successfully (both cookie and Bearer paths —
  factor the check so it runs once): if `role !== 'agent'` (agent schoolId is INERT — Phase 7b
  rule in the file header) and `await isSchoolLocked(payload.schoolId)` → return
  `NextResponse.json({ error: 'This account has been locked.', code: 'school_locked' }, { status: 403 })`.
- `getSchoolIdFromRequest` is NOT changed (read-only helper used by soft paths).
- Super-admin lock/unlock PATCH (`app/api/montree/super-admin/schools/route.ts`): after a
  successful lock/unlock write, call `invalidateSchoolLock(schoolId)` fire-and-forget. If that
  file is git-dirty, SKIP the invalidation wiring and report (60s TTL covers it).
- Perf budget: at most ONE cheap indexed SELECT per school per 60s per process. No other
  request-path cost.
- 🚨 Cache the NEGATIVE result too (unlocked schools are the 99.9% case) — that's the whole point.

### A2. class-progress pagination

File: `app/api/montree/dashboard/class-progress/route.ts` (~line 197): the class-wide `.in()`
query silently truncates at the PostgREST 1000-row default. Fix: loop with
`.range(offset, offset + 999)` accumulating until a page returns < 1000 rows; hard safety cap 20
pages. Behavior for small classrooms byte-identical.

### Phase 1 gates
- eslint 0 new errors on touched files.
- Runtime proof (Jun-14 rule): builder runs a local logic harness for the cache (mock supabase:
  locked school → 403 shape; DB-throw → allowed; TTL expiry → refetch; agent role → skipped).
  Report the harness output. (No live login test available in-sandbox — Fable/Tredoux verify on
  device post-deploy.)

---

## PHASE 2 (Build B — the big one): timezone-correct week keys

### The bug (Fable-verified, exact)
Client `getCurrentMonday()` (3 copies: `components/montree/reports/WeeklyWrapTab.tsx:130`,
`components/montree/reports/WeeklyAdminTab.tsx:140`, `app/montree/dashboard/weekly-admin-docs/page.tsx:1148`)
computes LOCAL Monday 00:00 then serializes via `.toISOString()` → **UTC** date string. For any
device east of UTC (China = the entire target market) local Mon 00:00 is still Sunday in UTC, so
the week key is the SUNDAY date — one day early. That key is sent to the server, used as the DB
key (`week_start` in reports/weekly-admin tables) AND as `captured_at` boundary filters. On
Sundays, "today" falls outside the computed week (`week_end` = Saturday) — today's photos vanish
from This Week. `DashboardHeader` shares the same serialization (the comment at
WeeklyWrapTab.tsx:131 documents the coupling — find and migrate it too).

### B1. ONE canonical client helper

NEW `lib/montree/week-key.ts` (client-safe, zero imports):
```ts
// Week keys are LOCAL calendar dates, never UTC serializations.
export function currentWeekStart(at = new Date()): string   // local Monday as YYYY-MM-DD via getFullYear/getMonth/getDate — NO toISOString
export function shiftWeek(ws: string, weeks: number): string // pure date-string math (UTC-safe internally is fine — input/output are plain dates)
export function weekEnd(ws: string): string                  // ws + 6 days
```
`currentWeekStart` MUST build the string from local date parts:
`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`.

### B2. Migrate every producer/consumer

- Replace the 3 local `getCurrentMonday` definitions + their local `shiftWeek`/`getWeekEnd`
  twins with imports from `lib/montree/week-key.ts`. Delete the local copies.
- Find `DashboardHeader`'s week serialization (the coupling partner) and route it through the
  same helper.
- `grep -rn "toISOString().split('T')[0]"` and `toISOString().slice(0, 10)` across
  `app/montree/` + `components/montree/` for OTHER week/day-key producers that feed
  `week_start`/`week_end`/date-keyed API params from a LOCAL-midnight Date. Migrate ONLY sites
  that (a) start from a local-time Date and (b) feed a persisted key or query param. Sites
  serializing already-UTC instants (timestamps, captured_at math) are CORRECT — leave them.
  List every site you examined with migrate/leave verdict in the report.
- Server routes that ACCEPT week_start from the client stay unchanged (key is now correct at the
  source). The laterWeekBanner guard-rail in WeeklyWrapTab stays (harmless safety net).

### B3. Migration 298 — normalize historical Sunday keys

NEW `migrations/298_normalize_week_keys.sql` (idempotent, Tredoux runs in Supabase; site is safe
pre-run — old rows just stay one day early until it runs):
- For every week-keyed table (enumerate them by grepping the repo for `week_start` writes:
  expected ≥ `montree_reports` (child_id,week_start,report_type), weekly-admin docs/notes/monthly
  tables, `paperwork_current_week` column if date-keyed — builder enumerates and lists ALL):
  `UPDATE <t> SET week_start = (week_start::date + 1)::text WHERE EXTRACT(DOW FROM week_start::date) = 0;`
  (a Sunday week_start can ONLY come from this bug — weeks start Monday by definition).
- Same-shape fix for any `week_end` columns: `+1 WHERE DOW = 6` (Saturday ends → Sunday ends)
  ONLY on tables where week_end is stored alongside week_start (keep the pair consistent).
- 🚨 UNIQUE-collision safety: where a UNIQUE constraint includes week_start, guard each UPDATE:
  skip rows whose target key already exists (`AND NOT EXISTS (...)`) and leave a
  `-- skipped-duplicates` comment documenting that the newer row wins by being left in place.
  NEVER delete data in this migration.
- Wrap in BEGIN/COMMIT.

### B4. What Phase 2 must NOT touch
- `lib/montree/school-time.ts` (already correct — server-side authority).
- Server week computations already routed through school-time.ts.
- Anything in the forbidden list. Any git-dirty file → skip + report.

### Phase 2 gates
- eslint 0 new errors.
- Logic harness: run `node` with the new week-key.ts logic simulating TZ offsets (process.env.TZ
  = 'Asia/Shanghai', 'America/New_York', 'UTC'): assert currentWeekStart returns the LOCAL
  Monday date in all three, including the Sunday-evening China case (the original bug repro:
  a Date of Sunday 23:00 +08 must yield the PREVIOUS Monday, and Monday 00:30 +08 must yield
  THAT Monday). Report the assertions.
- Report `git diff --stat` + the full examined-sites table.

---

## PHASE 0 (parallel, Sonnet, investigation ONLY): guru shelf-fill early-stop

Reproduce/diagnose why Guru's shelf-fill sometimes stops at 2/5 areas with works marked
"Presented" (contradicting start-at-zero). Read `lib/montree/guru/tool-executor.ts` fill paths +
the tool-loop driver in `app/api/montree/guru/route.ts` (max tool iterations? early return?
token budget?). Deliver a diagnosis + minimal-fix proposal. NO code changes.

## Sequencing
Build A → Sonnet audit A → Fable review → push. Then Build B → Sonnet audit B → Fable review →
push. Phase 0 runs alongside Build A. Migration 298 SQL pasted in chat for Tredoux (standing
rule: everything runs from the chat).
