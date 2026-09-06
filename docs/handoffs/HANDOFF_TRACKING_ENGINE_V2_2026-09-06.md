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
