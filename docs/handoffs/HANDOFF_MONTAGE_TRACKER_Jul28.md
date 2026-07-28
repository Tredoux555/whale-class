# Montage Tracker (MM) — full handoff — Jul 28, 2026

**Status: SHIPPED AND LIVE.** Migration 305 has been run on Supabase, the
`montage-worker` Railway service has been redeployed with the new
`db.ts`/`media.ts`, and the feature is live at
`/montree/dashboard/montage-tracker`. No further deploy steps are pending.

Commits: `dbb99645` (the feature — 24 files, +2075/−47), `73b5957b`
(`CLAUDE.md` permanent-rules update + this session's log entry), `8767ce33`
(permanent rule #4: paste SQL in chat). All pushed via Desktop Commander (the
Cowork device bridge has no network — permanent rule #1, see `CLAUDE.md`).

## What shipped, in one paragraph

A teacher-facing, **zero-AI** tool at `/montree/dashboard/montage-tracker`
that answers three questions the AI-confirmation pipeline was never designed
to answer fast: *has every child been photographed today?*, *has every child
hit 8 photos this week?*, and *can a teacher make a quick montage of one
child or one class without waiting on confirmation?* It ships a daily
coverage board, a weekly coverage board (worst-first, with a shared
"who needs more photos" list visible to the whole team, school-wide across
every classroom), and a minimal two-path montage creator (**Child** or
**Class**, over **Day / Week / Month / Custom** date ranges).

## Why this exists (the product problem)

The existing montage/report pipeline only ever counts a photo once a teacher
has **confirmed** it (`teacher_confirmed = true`) — that's correct for
parent-facing weekly reports and Montage Studio, where accuracy matters more
than speed. But it means nobody could answer "did we actually photograph
every kid today?" without waiting for the confirmation queue to drain, and
there was no cross-classroom view of which children were falling behind on
photo coverage for the week. Montage Tracker is a **fork of the counting
rule, not a fork of the pipeline**: it counts a photo the instant it's tagged
with a child, confirmed or not.

## Architecture — how the fork works

**The fork is narrow and explicit.** Photos are captured and tagged exactly
as before; the existing AI identification/confirmation pipeline is
**completely untouched** and keeps running in parallel — only confirmed
photos ever flow into it. Montage Tracker never imports from it and never
writes to any of its tables.

1. **Boards (`lib/montree/montage-tracker/coverage.ts`, read-only).** Counts
   *every* row in `montree_media` where `media_type = 'photo'` and the child
   is tagged, in the requested date range. **No `teacher_confirmed` filter
   and no `parent_visible` filter** — the board measures what the teacher
   actually shot, not what's been reviewed or what a parent will ever see.
   This is the single most important thing to understand about this
   feature, and it produces the intended UX quirk documented below.

2. **Montage creation rides the existing job system.** Tracker montages are
   still `montree_montage_jobs` rows, processed by the same `montage-worker`
   Railway service as Montage Studio and weekly reports. The only new thing
   is migration 305's `require_confirmed` column
   (`NOT NULL DEFAULT true`) — `false` only on tracker jobs, meaning "draw
   from every tagged photo, not just confirmed ones." Every existing caller
   (report montages, Montage Studio) inserts nothing for this column and
   keeps behaving byte-for-byte as before.

3. **`parent_visible = true` is NOT part of the fork — it is still enforced
   everywhere a montage is actually rendered:** in
   `lib/montree/montage/enqueue.ts`'s count query, in the worker's
   `getScopedEligiblePhotos` SQL, and in the worker's
   `assertAllParentVisible()` final re-assert before render.
   **Confirmed/Studio/report paths and their safety filters are
   byte-identical to before this feature shipped** — the tracker path is
   additive, not a rewrite.

4. **Month preset maps to `kind='custom'`** on the job — there is no
   separate "month" montage kind in the job system, so the UI's Month
   preset just computes a calendar-month date range and submits it as a
   custom-range job (see `page.tsx`'s `preset === 'month' ? currentMonthRange()
   … kind = preset === 'day' ? 'daily' : preset === 'week' ? 'weekly' : 'custom'`).

### Junction-aware counting (the trickiest part)

Photos can be tagged with more than one child (group shots), so there are
two places a child's photo tags live: `montree_media.child_id` (first-tagged
child) and the `montree_media_children` junction table (every tag,
including group shots). **Both the boards and the montage-creation bypass
path have to union these two sources and dedupe by media id**, or the board
says "8 photos" for a child while her montage only finds 3.

- **Boards** (`coverage.ts`): fetches all media in range, then all junction
  rows for those media ids (paged + chunked), and dedupes into a
  `Map<childId, Set<mediaId>>` — a two-query union done in application code.
- **Worker** (`montage-worker/src/db.ts`, `getScopedEligiblePhotos`): for a
  tracker child job, the SQL predicate becomes
  `(m.child_id = $childId OR EXISTS (SELECT 1 FROM montree_media_children mc
  WHERE mc.media_id = m.id AND mc.child_id = $childId))` — a single query,
  SQL-side `OR EXISTS`.
- **Enqueue count-check** (`lib/montree/montage/enqueue.ts`,
  `countTrackerChildPhotos`): a two-query union (primary child_id page-read,
  then junction page-read, then a batched re-filter of the junction's media
  ids against the same school/date/parent_visible predicates), because it
  runs against PostgREST rather than raw SQL.

All three implementations are deliberately kept separate rather than shared,
because they run in three different environments (client-side app code,
worker-side raw SQL, PostgREST-constrained enqueue code) — but they must
stay logically identical. If you touch one, check the other two.

**Pagination note:** `montree_media_children` has no single unique column,
so every paged read of it orders on the composite `(media_id, child_id)` (or
`(child_id, media_id)` in the enqueue path, where `child_id` is already
fixed by the filter) — ordering on `media_id` alone is unstable across pages
for a group shot with many rows per media_id, and would silently skip or
duplicate rows. Same pattern as
`app/api/montree/dashboard/class-progress/route.ts`. `MAX_PAGES = 20` caps
every unbounded read (`coverage.ts`'s roster/media/junction reads, and
`enqueue.ts`'s tracker-count reads) as a hard safety valve against a runaway
loop hammering the DB.

## Files

**New:**
- `lib/montree/montage-tracker/coverage.ts` — school-wide coverage
  aggregation (`buildCoverage`), the junction-union dedupe, paged reads.
- `lib/montree/montage-tracker/weekRange.ts` — dependency-free date-range
  helpers (today / current week Mon–Sun / current month / exclusive end
  date for half-open range queries / short range label). Browser-local
  calendar math throughout, **never `toISOString()`** — that shifts the day
  backwards in timezones ahead of UTC (e.g. Asia/Shanghai) and would hand a
  teacher yesterday's board. Same rule as `MontageStudio.tsx`.
- `lib/montree/montage-tracker/README.md` — the module's own scope doc; see
  "What's next" below for why it exists.
- `app/api/montree/montage-tracker/coverage/route.ts` — `GET
  ?date_start&date_end&mode=daily|weekly`, teacher/principal only, calls
  `buildCoverage`. Read-only, touches no AI code.
- `app/montree/dashboard/montage-tracker/page.tsx` (779 lines) — daily
  board, weekly board (worst-first + team "needs more photos" list), the
  Child/Class × Day/Week/Month/Custom creator, and a "Tracker montages"
  recent-jobs list. Dark-forest inline tokens, matching `MontageStudio.tsx`'s
  house style.
- `migrations/305_montage_tracker.sql` — the `require_confirmed` column
  (see architecture above). Idempotent (`ADD COLUMN IF NOT EXISTS`),
  documented rollback included in the file's own header comment.

**Modified:**
- `lib/montree/montage/enqueue.ts` — new optional `requireConfirmed` arg on
  `EnqueueScopedArgs` (default true = unchanged behavior for every existing
  caller); `countTrackerChildPhotos` for the junction-union bypass count;
  `enqueueScopedMontage` only writes `{ require_confirmed: false }` into the
  insert when the caller asks for it, so a pre-305 school's Studio path is
  never touched by a missing column.
- `app/api/montree/montage/route.ts` — new `bypass_confirmation` POST param
  (only valid for `scope_type` child/classroom); the duplicate-job lookup
  now **includes `require_confirmed` in the dup-check identity** (a tracker
  montage and a Studio montage over the identical scope/kind/range are
  different films and must not collide) with a `42703`
  (`isMissingSchema`)-safe fallback to the unfiltered lookup on pre-305
  schools; GET now also selects `require_confirmed` (optimistic + same
  missing-schema fallback) so the client can tell tracker jobs apart from
  Studio jobs in the recent-jobs list.
- `montage-worker/src/db.ts` / `montage-worker/src/media.ts` — worker reads
  `job.require_confirmed`; drops the `teacher_confirmed` predicate only when
  it's explicitly `false`; a pre-305 row (column absent, `undefined`) is
  treated as confirmed-only, same as always. `assertAllParentVisible` is
  **unconditional** — untouched by any of this.
- `components/montree/DashboardHeader.tsx` — `ListChecks` icon (lucide),
  new pinned menu row (pinned outside the customizable-menu-config branch,
  same reasoning as the existing Montage Studio row: a brand-new surface
  isn't in any teacher's saved menu config yet, so it would otherwise be
  invisible to every school).
- `app/montree/dashboard/tools/page.tsx` — new tool card
  (`teacherTools.montageTracker` / `…Desc`).
- i18n: `montageTracker.*` (~30 keys — board/creator copy, see
  `lib/montree/i18n/en.ts` around line 5936) and
  `teacherTools.montageTracker` / `teacherTools.montageTrackerDesc`, added
  to **all 12 locales** (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru) — the
  pre-commit i18n hook is strict and rejects a commit with any locale
  missing a key.

## Review findings, fixed before ship

An independent review pass over the diff before commit caught three things,
all fixed:

1. **Studio↔Tracker dup-job collision.** The POST duplicate-suppression
   query originally matched on scope/kind/range alone, so a Studio montage
   and a Tracker montage over the identical child+range would collide and
   the second request would just get handed back the first job — wrong
   film, wrong photo set. Fixed by folding `require_confirmed` into the
   dup-check identity, with the `42703`-safe fallback described above.
2. **Junction pagination needed a composite order key.** An early version
   ordered junction reads on `media_id` alone; fixed to
   `(media_id, child_id)` / `(child_id, media_id)` per the note above.
3. **Roster query wasn't paged.** `fetchRoster` in `coverage.ts` now pages
   like everything else — a school (or a shared/multi-campus `school_id`)
   over 1000 active children would otherwise silently truncate the roster
   and the board would show phantom full coverage for the missing kids.

`MAX_PAGES = 20` was added everywhere as a blanket safety cap, and the
tracker's "insufficient photos" i18n message
(`montageTracker.create.needMore`) was given an explicit note that
parent-hidden photos are counted on the board but never render in a montage
— see the UX quirk below, this is the string that explains it to the
teacher in the moment she hits it.

## Known UX quirk — documented and intended, not a bug

**Board counts ignore `parent_visible`; montage rendering enforces it.** A
child can show 8/8 on the weekly board and still get an "insufficient
photos" error when a teacher tries to build her a montage, if enough of
those 8 photos are hidden from parents. This is intentional: the board's
job is to tell the teacher whether the *photography* is happening, and a
parent-hidden photo is still real photography. The montage creator's job is
to make something a parent will actually see, which is a stricter bar.
Don't "fix" this by adding `parent_visible` to the board query — that would
make the daily/weekly accountability view silently miss photos a teacher
took but chose to keep private (student mid-tantrum, bathroom mishap,
etc.), which defeats the board's whole purpose.

## What's next / product intent

Tredoux's plan is to **extract Montage Tracker into its own standalone app**
later — that's why the module lives in isolation at
`lib/montree/montage-tracker/` rather than being spread across the existing
montage code, and why its `README.md` explicitly enumerates its only three
touchpoints into the rest of Montree (read `montree_media` +
`montree_media_children` + `montree_children`/`montree_classrooms`; the
`/api/montree/montage` job API via `bypass_confirmation`; the two nav entry
points). When that extraction happens, start from that README — it's meant
to be the complete dependency map.

Nothing is currently blocking or pending from this session. If a future
session wants to extend it: the weekly board's "needs more photos" list
currently has no notification/reminder hook (it's pull, not push) — that
would be a natural next increment if Tredoux asks for it.
