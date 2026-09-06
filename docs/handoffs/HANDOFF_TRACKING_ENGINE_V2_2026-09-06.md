# Handoff — Montree Tracking Engine v2 (2026-09-06)

Law: `docs/tracking/TRACKING_CONSTITUTION.md`. Plan: `docs/tracking/ENGINE_V2_PLAN.md`.
Built by four parallel agents (engine, door+API, readers, guidance, UI), then closed
out and integration-checked. NOT committed — the `git add` list is at the end.

## What shipped
- **Pure engine** `lib/montree/tracking/*` — types, ledger (ladder + same-day dedupe),
  resolve (ONE name-reader), derive (ribbon / ticks / flags / next), summary (40-word
  template), guidance (multi-area `nextWorks`), invariants, persistence, plus the two
  loaders `readers-ledger.ts` and `guidance-ledger.ts`. No I/O inside the rules.
- **One door** `lib/montree/progress/write-progress.ts` — the only writer of
  `montree_child_progress`; ten bypass writers rerouted. Unknown names land in
  `montree_progress_review_queue`; every change journals to `montree_progress_events`.
- **API** `POST /api/montree/progress/event` and `/api/montree/tracking/{class,
  class-week, child, invariants, rebuild, review-queue/resolve, health}`.
- **Readers** weekly-admin-docs auto-fill, weekly-wrap, parent report, batch
  narratives, classroom-overview, language-tracker — all derived from the journal.
  `montree_child_english_progress` + `english-sequence/lesson-map` are RETIRED from
  every reader tree, guarded by `tests/readers/no-legacy-sequence.test.ts`.
- **Guidance** replan-child, guru work-sequencer and both focus-works routes call
  `guidance.nextWorks`; `montree_child_focus_works` is now a DERIVED CACHE.
- **UI** `/montree/dashboard/tracker` (week grid, ribbon, Writing Shelf, review queue,
  corrections), `/tracker/child/[childId]`, `/tracker/health`. ShelfPlayer + BookWorks
  emit 'done' via `done-signal.ts`. Nightly `.github/workflows/tracking-health.yml`.

## Rules now enforced in code, not prose
1 + 5 no key → no row (the door queues; the queue resolver additionally refuses a
work_key that is not in that classroom's curriculum). 2 one door
(`tests/progress/one-door.test.ts`). 3 every change is journalled. 4 a downgrade needs
source 'correction' AND a reason — the event route 400s without one. 7 sequence is
data. 8 readers derive. 9 the 40-word cap is counted in code. 10 nightly invariants.
11 digital/live 'done' is written only when the child is known.

## Migrations — 344, 345, 346 ALREADY APPLIED to Supabase by Tredoux
`344_dark_phonics_tracker.sql` (dp seed + class-week), `345_progress_review_queue.sql`
(queue + `events.reason`), `346_tracking_engine_v2.sql` (ws:1..8 seed, rebuild
function, event indexes). Their semantics are FROZEN. Writing Shelf rows are
`name = 'Writing Shelf tray N'` with `description = <tray material>`, so the engine now
carries `description` on `CurriculumWork`; summary + tracker UI read it, with the old
" — " split kept only as a fallback for hand-made rows.

## How to run the checks
    npx vitest run          # 56 files / 1169 tests, all green
    npx eslint <files>      # 0 new errors (2 pre-existing @ts-nocheck errors)
    npx tsc --noEmit -p tsconfig.json   # see gaps below; needs a big heap
`next build` does NOT type-check: `next.config.ts` sets `typescript.ignoreBuildErrors:
true`, so the pre-existing tsc errors cannot block a Railway deploy.

## Known gaps (deliberate, not bugs)
- **BookWorks cannot know the child.** The live activity stage carries no child
  identity, so `emitDone` returns 'skipped' there and nothing is written rather than
  guessed (rule 11). Threading a child id into the live stage is the follow-up.
- **`lib/montree/evaluation/session-service.ts` and
  `app/api/montree/evaluation/child/[childId]/report/route.ts` still READ
  `montree_child_english_progress`.** Read-only and outside the reader trees rule 8
  names, so the guard test does not cover them — but the invariants job flags any
  surviving pointer row. Retire them next.
- **Menu.** 'tracker' is in `CORE_VISIBLE`, and `sanitizeMenuConfig` now hands a NEW
  core item to teachers whose saved config predates it (a teacher who explicitly hid
  it stays hidden). Covered by `tests/menu-config.test.ts`.
- **`lib/montree/curriculum-loader.ts` (17 errors) plus `billing.ts`,
  `curriculum-data.ts`, `guru/photo-*` are PRE-EXISTING tsc errors** — byte-identical
  on HEAD. This wave introduced ZERO new tsc errors and removed 6.
- **`npx tsc -p tsconfig.json` OOMs on a 4GB machine** because `tsconfig.json` includes
  `**/*.ts`, sweeping in ~2,500 duplicated sources under `.next/standalone`. Excluding
  `.next` lets it finish. Worth fixing in `tsconfig.json`, separately from this wave.
- **Stray scratch files** the wave left at the repo root (the sandbox forbids deleting
  them — remove by hand, none are in the commit list): `tsconfig.tracker.tmp.json`,
  `tsconfig.tracking-engine.tmp.json`, `tsconfig.onedoor.tmp.json`,
  `tsconfig.engineC/D/E/F.tmp.json`, `tsconfig.integration.tmp.json`,
  `tsconfig.tracker.tmp.tsbuildinfo`, and under `_to_delete/`:
  `engineD_scratch_2026-09-06`, `tsc-engine-evalfix.log`,
  `tsconfig.engineF.probe.tmp.json`. `tests/` has no leftover probe files.

## The commit — ONLY this wave
Everything else uncommitted belongs to other sessions. Do NOT `git add -A`:
`materials-out/**/*.pdf`, `docs/outreach/**`, `evaluation-kit/**`, `.dp-scratch/**`,
`_verify*/`, `__pycache__/` and the root `.tar`/`.png` files are not ours.

Deletions (each replaced by a `.DEPRECATED.mjs` copy in the list below):

    git rm scripts/run_replan_all_whale.mjs scripts/run_replan_all_whale_zh.mjs scripts/run_replan_kevin.mjs

Additions and modifications:

    git add lib/montree/tracking app/montree/dashboard/tracker tests/tracking tests/progress tests/readers tests/guidance tests/tracker-ui tests/dark-phonics app/api/montree/tracking app/api/montree/progress/event docs/tracking
    git add .github/workflows/tracking-health.yml app/admin/english-progress/page.tsx app/api/montree/admin/import-students/route.ts app/api/montree/admin/import/route.ts app/api/montree/children/[childId]/onboard/route.ts
    git add app/api/montree/children/[childId]/route.ts app/api/montree/children/bulk/route.ts app/api/montree/children/route.ts app/api/montree/curriculum/duplicates/route.ts app/api/montree/dashboard/curriculum-gaps/route.ts
    git add app/api/montree/dashboard/english-progress/route.ts app/api/montree/dashboard/focus-list/route.ts app/api/montree/dashboard/language-tracker/route.ts app/api/montree/focus-works/batch/route.ts app/api/montree/focus-works/route.ts
    git add app/api/montree/guru/photo-enrich/route.ts app/api/montree/guru/photo-insight/route.ts app/api/montree/guru/snap-identify/route.ts app/api/montree/intelligence/evidence/route.ts app/api/montree/onboarding/students/route.ts
    git add app/api/montree/paper-scan/[scanId]/commit/route.ts app/api/montree/parent/report/[reportId]/route.ts app/api/montree/photo-audit/resolve/route.ts app/api/montree/progress/update/route.ts app/api/montree/reports/batch-narratives/route.ts
    git add app/api/montree/reports/weekly-wrap/approve/route.ts app/api/montree/reports/weekly-wrap/route.ts app/api/montree/shelf-autopilot/route.ts app/api/montree/voice-notes/route.ts app/api/montree/voice-observation/[sessionId]/commit/route.ts
    git add app/api/montree/weekly-admin-docs/auto-fill/route.ts app/montree/dashboard/classroom-overview/page.tsx app/montree/dashboard/language-tracker/page.tsx app/montree/dashboard/photo-audit/page.tsx app/montree/library/dark-phonics/page.tsx
    git add app/montree/parent/report/[reportId]/page.tsx components/montree/dark-phonics-live/activities/BookWorks.tsx components/montree/dark-phonics-live/v2-shelf/ShelfPlayer.tsx components/montree/dark-phonics-live/v2-shelf/stages.ts
    git add lib/montree/companion/next-step.ts lib/montree/dark-phonics/tracker-works.ts lib/montree/dark-phonics/v2-shelf/works.ts lib/montree/english-sequence/client-helper.ts lib/montree/english-sequence/lesson-map.ts lib/montree/guru/progress-analyzer.ts
    git add lib/montree/guru/tool-executor.ts lib/montree/guru/work-sequencer.ts lib/montree/menu/config.ts lib/montree/menu/registry.tsx lib/montree/progress/advance-on-confirm.ts lib/montree/progress/seed-recommended-work.ts
    git add lib/montree/progress/write-progress.ts lib/montree/reports/narrative-generator.ts lib/montree/reports/reading-position.ts lib/montree/reports/replan-child.ts lib/montree/weekly-admin/language-narrative.ts
    git add lib/montree/weekly-admin/weekly-auto-fill-aggregator.ts lib/montree/work-matching.ts migrations/344_dark_phonics_tracker.sql migrations/345_progress_review_queue.sql migrations/346_tracking_engine_v2.sql
    git add scripts/curriculum/book-works/build_book_works.py scripts/curriculum/book-works/emit_tracker_seed_sql.ts scripts/run_replan_all_whale.DEPRECATED.mjs scripts/run_replan_all_whale_zh.DEPRECATED.mjs scripts/run_replan_kevin.DEPRECATED.mjs
    git add tests/menu-config.test.ts tsconfig.json docs/handoffs/HANDOFF_TRACKING_ENGINE_V2_2026-09-06.md

## Audit note (Sonnet pre-commit audit, 2026-09-06)
Rule 2 ("one door") has ONE deliberate, documented exception inside this wave: `app/api/montree/curriculum/duplicates/route.ts` renames/deletes `montree_child_progress.work_name` during a curriculum MERGE (not a status change) and writes its own journal row via `appendEvents` (source 'correction', reason 'duplicate-merge'). It is listed in the guard test's EXCEPTIONS with a reason. Two pre-existing scripts (`scripts/institutions/backfill-work-keys.mjs`, `scripts/run-migration-111.js`) are also excepted. Everything else passed: 1169/1169 tests, no new eslint errors, no legacy sequence in readers, auth on all new routes, cron secret parity, 40-word cap in code, immutable index expressions.

---

# Wave 4 — audit fixes (2026-09-06)

Fixes for the CONFIRMED findings of the independent verification pass in
`docs/audits/2026-09-06-code-audit/08-verify-tracking.md` (which re-tested
`06-tracking-engine.md` against commit `071fa5fab`; every finding below was
re-verified against wave 3, `4cee1ef86`, before being fixed).

**One migration to paste: `migrations/348_tracking_engine_fixes.sql`.**

| # | Finding | Fix | Test |
|---|---|---|---|
| 1 | `curriculum/duplicates` renamed and DELETED other schools' progress rows (`montree_child_progress` is keyed per child, not per school; any teacher can call it) | Every progress select/update/delete in the route is scoped `.in('child_id', <this classroom's roster>)`, including the GET count. A merge that deletes a child's row now journals the REAL transition (`old = row.status → new = 'not_started'`, source `correction`, reason `duplicate-merge`) instead of an old-equals-new "rename", and carries the WINNER's `work_key` instead of `null` | `tests/progress/one-door.test.ts` (the route stays a documented exception); the deletion itself is now visible to rule 10 via `cache-row-missing` |
| 2 | **CRITICAL** — corrections were journalled with the CALLER's raw source/reason, so replay refused the very row the door accepted: cache said `practicing`, the ribbon/summary/parent report derived `mastered`, forever | `Planned` now carries the `engineEvent` the door asked `applyEvent()` about, and the journal is written from it (`source: p.engineEvent.source`, `reason: p.engineEvent.reason`). `allowDowngrade` therefore always journals `source:'correction'` with a reason (given or synthesised). Reasons added at the two callers that sent none: `lib/montree/guru/tool-executor.ts` (`correcting_downward`) and `app/api/montree/intelligence/evidence/route.ts` (revoke) | `tests/progress/journal-roundtrip.test.ts` — the real `writeProgress` against a fake builder for EVERY caller shape (P/P/M picker, evidence revoke, guru `correcting_downward`, reasonless variants, tap/photo/ai/import/digital/live forward writes, review-queue resolve), asserting `replay(journalRows)` derives exactly the cached status |
| 3 | `montree_rebuild_child_progress` (346) and JS `rebuiltRowsFor` disagreed on backward rows (SQL `practicing` vs JS `mastered`); the SQL could also abort with PG 21000 | Migration 348 `CREATE OR REPLACE`s the function: a correction without a reason is skipped, a backward move counts ONLY when it is `source='correction'` AND `reason IS NOT NULL`, and the partition is `COALESCE(work_key, work_name)` plus a `DISTINCT ON (work_name)` stage so the `ON CONFLICT (child_id, work_name)` target is never hit twice | `tests/tracking/rebuild-parity.test.ts` — a TypeScript mirror of 348's selection rule, asserted equal to `rebuiltRowsFor()` on seven fixtures, plus a case proving the mirror can disagree (and that 346's rule did) |
| 4 | Class route: 29,045 ms of CPU on 22 children / 30 weeks / 3,300 events (`flags` 10.4 s, `englishSummary` 9.8 s, `planLanguageCell` 6.6 s) | Three additive changes in `ledger.ts`: a `WeakMap` replay cache keyed on (events identity, timezone); a `replayBefore(events, cutoffDay, tz)` cache keyed on the cutoff — the fresh filtered array per call is what defeated an identity memo alone; and a fold that mutates its OWN state instead of copying two maps per event (the copy made a replay quadratic in the number of (child, work) pairs). `summary.ts` and `derive.ts` call `replayBefore`. `rebuildCurrent()` returns a copy, since the cached state is now shared | `tests/tracking/class-route-perf.test.ts` — the same fixture shape, budget 500 ms. Measured after: **~50 ms** |
| 5 | Every day and week boundary was UTC. Beijing 07:30 + 08:30 = two "days" (ladder advanced twice in one morning); west of UTC the seam lands mid-afternoon, in school hours | `Ledger.timezone` (IANA) threaded through `dayOf`, `dedupeSameDay`, `applyEvent`, `replay`, `inWeek`, `weekTicks`, `flags`, `planLanguageCell`, `englishSummary`, `mondayOf`, `weekStartsBetween`, `windowStartFor` and the invariants. `loadLedger()` resolves it once from the school row via `lib/montree/school-time.ts` (`DEFAULT_SCHOOL_TZ = 'Asia/Shanghai'` when the classroom has no readable school; `getSchoolTimezone` still ends at `'UTC'`). The door reads today's journal over a 36-hour window and dedupes on the SCHOOL day. Pure-function defaults stay `'UTC'`, so an untouched caller behaves exactly as before | `tests/tracking/timezone.test.ts` — the audit's two repros (Beijing 07:30/08:30, US-Pacific 15:00/17:30) plus week bucketing and the tz-keyed replay cache |
| 6a | The journal was appended AFTER the committed cache upsert, best-effort, invisible — leaving the cache permanently ahead of its own source, which the rebuild tool then ERASES | Order inverted: journal first, cache second. `appendEvents` reports `failed` / `tableMissing`; anything other than the known missing-column retries, a 23505, or "migration 314 not pasted" makes the entry `outcome: 'failed'` with NO cache write. `ProgressResult.journalled: boolean` added | `tests/progress/journal-roundtrip.test.ts` — asserts the insert order and that an unknown journal error writes no cache row |
| 6b | Review-queue resolve wrote the teacher's RAW typed name, creating a SECOND row for a work the child already held (one key, two rows, two statuses) | The resolver writes the CANONICAL curriculum name for the chosen `work_key` (the raw string stays on the queue row and in `reason`). Migration 348 de-duplicates existing `(child_id, work_key)` rows — keeping the highest rung, inheriting the earliest stamps, journalling every retired row — then adds `UNIQUE (child_id, work_key) WHERE work_key IS NOT NULL` | covered by the resolve route's own tests; the constraint is asserted by the migration's VERIFICATION block |
| 6c | One duplicate in a `queueForReview` batch 23505'd the WHOLE statement, silently dropping every other queued observation | In-memory dedupe of the batch, then per-row retry on 23505 with ON-CONFLICT semantics (duplicates ignored, everything else lands) | — |
| 7 | The one-door guard watched ONE table with a literal string scan | Parameterised: `montree_progress_events` (door only), `montree_progress_review_queue` (door + resolve route), `montree_child_focus_works` (the current **11** writers as a FROZEN allow-list — a twelfth fails the build, a stale entry fails the build, and the count may only go down) | `tests/progress/one-door.test.ts`, now 15 tests |
| 8a | Rule 10's cache check was one-directional (never journal-ahead-of-cache), and health skipped `work_key IS NULL` rows blindly | New invariant `cache-row-missing` (journal replays a status, no cache row) with fix "rebuild child". `health/route.ts` no longer discards keyless cache rows: they are reported as `no-key` errors, listed to a cap of 50 with a total line | `tests/tracking/invariants.test.ts` (existing suite re-run), `tests/tracking/simulated-term.test.ts` |
| 8c | `===` on the cron secret | `crypto.timingSafeEqual` behind a length check | — |

Findings the audit REFUTED (8b apex-host 403, 4c "health is worse", the tracker UI's
downgrade path) were re-checked and left alone.

## Timezone: what the database guards and what the code guards
Migration 347's `idx_montree_progress_events_one_move_per_day` keys on the **UTC**
day and stays that way — an index expression must be IMMUTABLE, so it cannot consult
a row's school. It is a **coarse concurrency backstop**: its job is to stop two
simultaneous writers journalling the same rung twice. The **authoritative** same-day
rule is `lib/montree/tracking/ledger.ts dedupeSameDay()`, which reads the day in the
school's timezone. Where they disagree (Beijing 07:30 and 08:30 — one school day, two
UTC days) the code refuses the second move and the index simply does not object. The
code is the stricter of the two; that is the intended direction. This is documented
in the header of 348 as well.

## The commit — wave 4 only
    git add lib/montree/tracking/ledger.ts lib/montree/tracking/derive.ts lib/montree/tracking/summary.ts lib/montree/tracking/invariants.ts lib/montree/tracking/persistence.ts lib/montree/tracking/types.ts
    git add lib/montree/progress/write-progress.ts lib/montree/guru/tool-executor.ts
    git add app/api/montree/tracking/class/route.ts app/api/montree/tracking/child/route.ts app/api/montree/tracking/health/route.ts app/api/montree/tracking/review-queue/resolve/route.ts
    git add app/api/montree/curriculum/duplicates/route.ts app/api/montree/intelligence/evidence/route.ts
    git add migrations/348_tracking_engine_fixes.sql tsconfig.engineW4.tmp.json
    git add tests/progress/journal-roundtrip.test.ts tests/progress/one-door.test.ts tests/progress/same-day-race.test.ts tests/progress/unknown-never-writes.test.ts
    git add tests/tracking/timezone.test.ts tests/tracking/rebuild-parity.test.ts tests/tracking/class-route-perf.test.ts
    git add docs/handoffs/HANDOFF_TRACKING_ENGINE_V2_2026-09-06.md

Verification: `npx vitest run` → **1289 passed / 71 files**; scoped
`npx tsc --noEmit -p tsconfig.engineW4.tmp.json` → clean; eslint on the changed
files → 0 errors (one pre-existing `_opts` unused-arg warning).
