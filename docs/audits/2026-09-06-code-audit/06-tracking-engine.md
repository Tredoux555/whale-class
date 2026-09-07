# Audit — Montree Tracking Engine v2 (commit 071fa5fab, shipped 2026-09-06)

Read-only static review of `/tmp/montree` plus live execution of the pure engine
(`/tmp/engine-scratch`, `tsx`) against edge cases. Nothing under `/tmp/montree` was modified.

## Executive summary (10 lines)

1. The **pure engine is genuinely good**: `ledger`/`resolve`/`derive`/`summary` are I/O-free, well-reasoned, and the 40-word cap, the ladder, the same-day dedupe and the name-reader all behave as documented when executed directly.
2. **The constitution's own acceptance scenarios pass** — I re-ran the typed-name forms, the summary templates, the ribbon and the caps in isolation and they match the prose.
3. But the engine is **wired to a journal that cannot be replayed back into the same answer**. Teacher downgrades are journalled with a raw legacy `source` and no `reason`, so on replay `applyEvent` rejects them — every derived read silently reverts the correction (verified by execution).
4. The JS rebuild (`rebuiltRowsFor`, full replay) and the SQL rebuild (`montree_rebuild_child_progress`, last-change-wins) are documented as "deliberately equivalent". **They are not** — they disagree on exactly those correction rows, so whichever runs last decides a child's record.
5. **The tracker's main endpoint is unusable at real scale**: a 22-child, 30-week classroom (3,300 events) takes **23.5 s** of pure CPU in the derivations alone (`flags()` 9.9 s, `englishSummary` 6.6 s). Measured, not estimated.
6. `curriculum/duplicates` — the one *sanctioned* exception to rule 2 — renames and **deletes `montree_child_progress` rows by `work_name` with no school or classroom filter**. Merging duplicates in one classroom mutates children's progress in every other school. Cross-tenant data destruction.
7. **Everything is hard-UTC.** The school is Beijing (UTC+8). `dayOf()`, the week buckets and the same-day dedupe all cut at 08:00 local, so a Monday-morning tick lands in last week's report and two morning photos are not deduped. `lib/montree/school-time.ts` exists and is not used.
8. **Rule 10 will be red from night one**: `status-without-event` flags every pre-migration-314 progress row as an *error*, and its suggested fix (rebuild) does not fix them. Alert fatigue by construction.
9. **Rule 2's guard test only guards one table** (`montree_child_progress`) in four roots, with a 400-character window and a literal string match — it cannot see `montree_progress_events`, `montree_child_focus_works`, RPC calls, the worker directories, or a write 500 characters below its read.
10. Verdict: **excellent design, several load-bearing integration defects.** The one-door inventory is genuinely clean (no undetected bypass writer to the progress cache) — the danger is not bypass, it is that the journal and its consumers disagree.

---

## Invariant matrix

| # | Invariant (constitution) | Stated where | Enforced by | Verdict |
|---|---|---|---|---|
| 1 | ONE WORK, ONE KEY. Nothing writes progress without a key | CONSTITUTION.md:1 | `write-progress.ts:436-457` (queue when no key); `ledger.ts:120` (`no-key`); `344:83`/`346:44` partial unique on `(classroom_id, work_key)` | **PARTIAL** — enforced on the write path, but the cache's unique key is `(child_id, work_name)` (migration 111), *not* work_key, so one child can hold two rows for one key (see F-04). `curriculum/duplicates` journals `work_key: null` (F-02). |
| 2 | ONE DOOR into `montree_child_progress` | CONSTITUTION.md:2 | `tests/progress/one-door.test.ts` | **HELD, WEAKLY GUARDED** — the inventory below is clean; the *test* is easy to slip past (F-06). |
| 3 | EVERY CHANGE IS AN EVENT; current table = rebuildable cache | CONSTITUTION.md:3 | `write-progress.ts:872-897` (`appendEvents`); `ledger.rebuildCurrent`; `346` SQL rebuild | **BROKEN** — journal append is best-effort and non-transactional (F-03); the two rebuilds disagree (F-01b); rebuild nulls `school_id` (F-05). |
| 4 | Forward-only; downgrade = correction + reason | CONSTITUTION.md:4 | `ledger.applyEvent:127-140`; `progress/event/route.ts:86-91` (400 without reason) | **BROKEN IN THE JOURNAL** — the *route* is correct, but the door journals `source: entry.source` raw and `reason` may be null, so replayed corrections are rejected (F-01). |
| 5 | UNKNOWN NAMES NEVER WRITE → review queue | CONSTITUTION.md:5 | `write-progress.ts:436-457`; `tests/progress/unknown-never-writes.test.ts` | **HELD, with a leak** — the queue insert is a bare `.insert()` against a unique index; a same-day repeat 23505s and silently drops the whole batch (F-07). |
| 6 | ONE NAME-READER, forgiving on typos, strict on ties | CONSTITUTION.md:6 | `resolve.ts:81-127`; `tests/tracking/resolve.test.ts` | **HELD** — verified by execution: `t w3`, `T-Work-3`, `t dark phonics work 3`, `ck w2`, `qu work 1`, `ws3`, `tray 3` all resolve; `tt work 3`, `t work 33`, `t work 0`, `ws 9` correctly refuse. |
| 7 | SEQUENCE IS DATA; letter mastered = 5 works; gaps flagged not filled | CONSTITUTION.md:7 | `derive.ribbon:37-52`, `derive.flags:200-240` | **HELD in derivation**, but "next letter" skips unbuilt books out of order (F-08). "Main book" is **hardcoded in code**, not data (`tracker-works.ts:117-155`). |
| 8 | EVERYTHING A HUMAN READS IS DERIVED; 1–128 pointer RETIRED | CONSTITUTION.md:8 | readers all call `loadReaderLedger`; `tests/readers/no-legacy-sequence.test.ts`; `dashboard/english-progress` PATCH → 410 | **HELD for readers**; two evaluation files still read the pointer and conflict with rule 10's "delete the row" fix (F-09). |
| 9 | TEMPLATES BEFORE AI; hard 40-word cap counted in code | CONSTITUTION.md:9 | `summary.ts:52-70` (`capToWords`), `summary.ts:145-204` | **HELD** — executed: every template ≤ 40 words, the single-sentence overflow path trims to exactly 40 and restores the stop. |
| 10 | IT CHECKS ITSELF nightly | CONSTITUTION.md:10 | `invariants.ts`; `tracking/health/route.ts`; `.github/workflows/tracking-health.yml` | **PRESENT BUT WILL CRY WOLF** (F-10) and may not even reach the app (F-11). |
| 11 | NOTHING IS LOST, NOTHING IS GUESSED (digital/live 'done') | CONSTITUTION.md:11 | `done-signal.ts:32-95` (skips without child or key) | **HELD** — and honestly documented: BookWorks has no child identity and writes nothing. |

---

## Writer inventory — everything that writes a progress table

Scan performed over `app`, `lib`, `scripts`, `jobs`, `components`, `montage-worker`, `potato-worker`, `supabase`, `db` with a **1,200-character** window (3× the guard test's) plus manual verification of every hit.

### `montree_child_progress` (the cache)

| file:line | op | through the door? |
|---|---|---|
| `lib/montree/progress/write-progress.ts:807, 829, 836, 978, 1081` | upsert / update / insert / delete / upsert | **IS the door** |
| `app/api/montree/curriculum/duplicates/route.ts:222, 226` | delete, update | **NO** — sanctioned exception; also cross-tenant (F-02) |
| `scripts/institutions/backfill-work-keys.mjs:388` | update | NO — excepted, stamps only, `--apply` one-off |
| `scripts/run-migration-111.js:56, 74` | delete, update | NO — excepted, historical runner |
| `scripts/run_replan_all_whale{,_zh}.DEPRECATED.mjs:356/401, 326/370` | upsert | NO — renamed out of the build, skipped by the guard |

Verified false positives (reads only, flagged by the wide window): `app/api/montree/guru/concern/route.ts:174`, `lib/montree/progress/advance-shelf-after-mastery.ts:54`. **No undetected bypass writer to `montree_child_progress` exists in the snapshot** — the ten historical bypasses really were rerouted.

### `montree_progress_events` (the journal) — **UNGUARDED BY ANY TEST**

| file:line | op | note |
|---|---|---|
| `lib/montree/progress/write-progress.ts:1010` | insert | the door (`appendEvents`) |
| `app/api/montree/curriculum/duplicates/route.ts` (via `appendEvents`) | insert | writes `work_key: null` rows |
| `lib/montree/tracking/persistence.ts:315` | select | read |
| `lib/montree/reports/period-aggregator.ts:528` | select | read |

`appendEvents` is **exported**, so any future file can forge journal rows with no test objecting.

### `montree_child_focus_works` — "a derived cache" per the handoff, with 14 direct writers

`fill-shelf:148,203` · `progress/update:269` · `shelf:189` · `weekly-review/apply-shelf:125` · `focus-works:220,284` · `shelf-autopilot:245` · `guru/photo-insight:2186` · `advance-shelf-after-mastery:68` · `replan-child:194` · `guru/tool-executor:108,156` · `guru/post-conversation-processor:199,211`. **None of these go through any door and none are guarded.** Calling it a derived cache is aspirational (F-06).

### Retired / other

`montree_child_english_progress` — **zero writers remain** (clean retirement). Read by `lib/montree/evaluation/session-service.ts:490` and `app/api/montree/evaluation/child/[childId]/report/route.ts`, plus the two invariant loaders.
`montree_game_progress` — `app/api/games/{progress,track}` write it directly; it never reaches the ledger, so game completions are still outside rule 11.
No `rpc()` call to `montree_rebuild_child_progress` exists in application code; no raw-SQL writer outside `migrations/`.

---

## Findings

### [SEV: CRITICAL] Curriculum merge rewrites and deletes progress across every school in the database
**Where:** `app/api/montree/curriculum/duplicates/route.ts:190-193`, `:200-201`, `:222`, `:226`
**What:** The merge action verifies the winner and losers belong to the caller's classroom (`:150-165`), then collects the rows to mutate with `supabase.from('montree_child_progress').select(...).eq('work_name', loserName)` — **no `classroom_id`, no `school_id`, no `child_id` filter**. The same is true of the `existingWinnerProgress` probe at `:200`. Every matching row in the table is then either `.update({ work_name: winner.name })` or, when the child already holds the winner name, `.delete()`. `montree_child_progress.work_name` is generic Montessori vocabulary ("Pink Tower", "Sandpaper Letters") shared verbatim by every school in the instance. The count query at `:55-58` is equally global, so the UI shows the operator an inflated blast radius as reassurance. This is the *one* file the one-door test grants an exception to, so the guard never looks at it.
**Why it matters:** A teacher at School A opens Curriculum → duplicates and merges two "Pink Tower" rows. Every child in Schools B…Z whose progress row is named "Pink Tower" has that row renamed to School A's winner string — and any child who already holds both names has one row **permanently deleted**, losing its `status`, `presented_at` and `mastered_at`. The journal row written for them says `old_status === new_status` ("a rename"), so the destroyed rung leaves no trace and the nightly invariants report nothing. This is the exact class of bug the repo already took a cross-tenant incident over ("existence ≠ ownership", Jul 3 2026).
**Fix:** Scope every progress statement to the classroom's children. Load `montree_children.id WHERE classroom_id = classroomId` once and add `.in('child_id', childIds)` to the select at `:190`, the winner probe at `:200`, the delete at `:222` and the update at `:226` (and to the count at `:55`). Add a regression test that seeds two schools sharing a work name and asserts the second school is untouched. Separately, journal the *deleted* row as a real transition (`old_status: lp.status`, `new_status: 'not_started'`, reason `duplicate-merge: row discarded`) rather than as a no-op rename, and stop writing `work_key: null` (see F-02).

### [SEV: CRITICAL] Teacher downgrades are journalled un-replayably, so every derived read silently reverts them
**Where:** `app/api/montree/progress/update/route.ts:126-135`; `lib/montree/guru/tool-executor.ts:198-206`; `app/api/montree/intelligence/evidence/route.ts:179-187`; journal construction `lib/montree/progress/write-progress.ts:884-893`; replay `lib/montree/tracking/persistence.ts:73-101` + `lib/montree/tracking/ledger.ts:127-140`
**What:** The door builds its *in-memory* engine event with `source: entry.allowDowngrade ? 'correction' : …` and a synthesised default reason (`:706-712`) — but the row it actually **writes to `montree_progress_events`** uses `source: p.entry.source || 'unknown'` and `reason: p.entry.reason ?? null` (`:890-892`). The synthesised correction source and reason never reach the database. `progress/update` — the main teacher P/P/M picker — passes `source: 'teacher_update'`, `allowDowngrade: true` by default and **no reason**. On replay, `persistence.normaliseSource('teacher_update')` → `'tap'`, and `applyEvent` rejects the row with `backward-without-correction`. `intelligence/evidence`'s revoke-mastery passes `source: 'correction'` but **no reason** → rejected with `correction-without-reason`. Executed and confirmed:

```
A) journal [null→mastered src=tap, mastered→presented src=tap]
   replayed status = mastered      (cache table says presented)
B) journal [null→mastered, mastered→practicing src=correction reason=null]
   replayed = mastered   verdict = correction-without-reason
```

**Why it matters:** A teacher taps ✏️ Wrong and moves a child from *mastered* back to *practicing*. The cache updates and the UI looks right. But the ribbon, the week grid, `currentLetter`, `nextLetter`, the weekly summary, the Weekly Plan Language cell and the **parent report** are all derived from the journal at read time (rule 8) — every one of them still says *mastered*. The letter stays green on the ribbon, the parent is told the child "can now build the sentences on their own", and `nextLetter` pushes the child to the next book. Worse, the two rebuilds now disagree (F-01b), so a rebuild either resurrects the wrong rung or cements it.
**Fix:** Journal what the engine decided, not what the caller typed. In `writeProgressBatch`, hold the constructed `engineEvent` alongside each `Planned` row and emit `source: engineEvent.source`, `reason: engineEvent.reason` into the events insert. Make `reason` mandatory whenever `allowDowngrade` is true (reject the write otherwise, as `progress/event/route.ts:86` already does). Add the missing round-trip test: `door write → read the journal rows → toProgressEvent → replay → assert equals the cache`. That single test would have caught this and F-01b.

### [SEV: CRITICAL] The two rebuild implementations use different semantics and can disagree about a child's record
**Where:** `lib/montree/tracking/persistence.ts:432-463` (`rebuiltRowsFor`, full `replay`) vs `migrations/346_tracking_engine_v2.sql:150-200` (`montree_rebuild_child_progress`, `ROW_NUMBER() … ORDER BY created_at DESC` = last-change-wins)
**What:** 346's comment asserts "the newest row that actually changed something wins reaches the same answer" as the engine replay. It does not. The engine *re-evaluates* every row and rejects backward moves whose source is not `'correction'`; the SQL takes the latest row unconditionally. Given F-01's un-replayable downgrade rows, the SQL rebuild writes `practicing` and the JS rebuild writes `mastered` for the same child and work. The SQL function additionally `INSERT … ON CONFLICT (child_id, work_name)` while partitioning by `work_key` — if two work_keys share a `work_name` for one child (which invariant #5 exists to detect, and which F-04 actively creates) Postgres raises *"ON CONFLICT DO UPDATE command cannot affect row a second time"* and the **entire rebuild for that child aborts**.
**Why it matters:** `POST /api/montree/tracking/rebuild` and the nightly job are the designated recovery tool. Running it after a correction either reverts the teacher (JS) or contradicts the other implementation (SQL). A support engineer running "the rebuild" gets a different database depending on which one they reached for.
**Fix:** Delete one of them. Keep the SQL only as a fast path *derived from* the same rules, or drop it and have the nightly job call the JS rebuild per child. Whichever survives, add a test that runs both against the same fixture journal and asserts identical rows. Add `DISTINCT ON (work_name)` protection (or partition by `work_name`) before the `ON CONFLICT` in the SQL version.

### [SEV: HIGH] The tracker's class endpoint takes ~23 seconds of CPU for one real classroom
**Where:** `app/api/montree/tracking/class/route.ts:79-111`; `lib/montree/tracking/derive.ts:135-160` (`weekTicks` calls `replay(events)` over the **whole classroom journal** on every invocation), `:186-247` (`flags` → `highestDpOfWeek` × 3 weeks × N children), `lib/montree/tracking/summary.ts:159-171` (three more full replays per child)
**What:** Every derivation replays the entire classroom journal from scratch. The class route does this per child: `weekTicks` (1 replay), `englishSummary` (1 + 2 filtered replays), `planLanguageCell` (1 + 1), plus `flags()` which internally runs `weekTicks` 3× per child. Measured on the extracted engine with a realistic fixture — 22 children, 30 weeks, 3,300 events, i.e. one term of Whale Class:

```
events = 3300
class-route-equivalent derivations: 23,483 ms
  flags():            9,948 ms
  englishSummary x22: 6,609 ms
  planLanguageCell:   3,155 ms
  weekTicks x22:      3,129 ms
```

Growth is O(children × events) with an O(n log n) `sortEvents` inside each replay; the loader's cap is `EVENT_LIMIT = 20000`, ~6× this fixture.
**Why it matters:** This is the tracker's front door — the screen a teacher opens to tick a cell. It will hit Railway's request timeout partway through the first term, and the failure mode is a blank tracker, not a slow one. `tracking/health` is worse: on cron it sweeps *every classroom in the instance* inside `maxDuration = 300`.
**Fix:** Replay once per request and pass the result down. Change `weekTicks`, `englishSummary`, `planLanguageCell` and `flags` to accept a pre-computed `{ state, rows }` (or add a `replayed` field to `Ledger` populated by `loadLedger`) instead of each calling `replay(ledger.events)`. Memoising `replay` on the events array identity would be a two-line stopgap. Index the replay rows by `child_id` once rather than filtering per child.

### [SEV: HIGH] The engine is hard-UTC while the school is UTC+8 — days, weeks and dedupe all cut at 08:00 local
**Where:** `lib/montree/tracking/ledger.ts:59-61` (`dayOf` → `toISOString().slice(0,10)`); `derive.ts:117-128` (`weekEnd`/`inWeek`); `persistence.ts:141-147` (`mondayOf`, `setUTCDate`); `migrations/345:…` dedupe index `((created_at AT TIME ZONE 'UTC')::date)`; `lib/montree/school-time.ts:39` (`getSchoolTimezone`) exists and is **referenced nowhere in `lib/montree/tracking/**` or `app/api/montree/tracking/**`**
**What:** Every calendar decision — the same-day dedupe key, the week bucket, `inWeek`, the flags' `daysBetween`, the invariants' `asOf` — is computed in UTC. Whale Class is Beijing, UTC+8. Executed:

```
Mon 23:30Z -> 2026-09-07 | Tue 00:30Z -> 2026-09-08
(both are Beijing Tue 2026-09-08, 07:30 and 08:30 — different UTC days)

tick at 2026-09-13T20:00Z (Beijing Mon 14 Sep 04:00)
  → lands in the week starting 2026-09-07, i.e. LAST week's summary
```

**Why it matters:** Two photographs of the same child at the same work, taken at 07:30 and 08:30 on one Beijing morning, are on different UTC days: the dedupe misses and the ladder advances twice, which is the exact scenario the constitution names ("Duplicate photo same morning"). And any tick before 08:00 Beijing on a Monday is filed into the previous week — it disappears from this week's tracker grid, this week's Weekly Plan cell and this week's parent summary, and reappears in a report already sent. CLAUDE.md's own standing rule (#228 / the Jul 5 "current-week guard rail" session) says week calculations must route through `lib/montree/school-time.ts`; this engine does not.
**Fix:** Thread a school timezone through `Ledger` (a `timezone` field, defaulted from `getSchoolTimezone`) and compute `dayOf`, `mondayOf`, `weekEnd` and `daysBetween` in it. The DB dedupe index must move with them: `((created_at AT TIME ZONE 'Asia/Shanghai')::date)` is still immutable for a literal zone, or store a generated `local_day` column written by the door. Until then, document the 08:00 boundary loudly — it is currently invisible.

### [SEV: HIGH] The journal append is best-effort and non-transactional, so the "cache" can outrun its source of truth
**Where:** `lib/montree/progress/write-progress.ts:806-846` (the upsert) then `:899` (`await appendEvents(...)`); `appendEvents:985-1032` — "ALWAYS best-effort: this function cannot throw, and its failure is invisible to the progress write that produced it"
**What:** The cache row is written first and committed; the journal row is appended afterwards in a separate statement whose every failure path is a `console.warn` and a `return`. There is no transaction, no outbox, no retry and no reconciliation. Rule 3 says the current-status table is *a cache of the journal, rebuildable* — but a dropped append makes the cache strictly ahead of the journal, permanently and silently.
**Why it matters:** One transient PostgREST error during a busy Friday and a child's mastery exists only in the cache. Every derived read (rule 8) — ribbon, summary, parent report — is computed from the journal, so the mastery is invisible to the parent even though the teacher can see it on the grid. Then the recovery tool makes it worse: a rebuild regenerates the cache from the journal and **erases the row**. The only detector, invariant `status-without-event`, is drowned by F-10's false positives.
**Fix:** Make the pair atomic. Either write both inside one Postgres function (a `montree_apply_progress_event(...)` RPC that inserts the event and upserts the cache in one statement — which also fixes F-12's race), or write the event **first** and treat the cache as strictly derived. At minimum, promote an append failure to a non-fatal *result field* (`journalled: false`) that the caller surfaces and a retry queue picks up, instead of a log line nobody reads.

### [SEV: HIGH] Resolving a review-queue item creates a second progress row for the same work_key
**Where:** `app/api/montree/tracking/review-queue/resolve/route.ts:131-152` (`workName: row.raw_work_name`, `workKey`, `strict: false`); upsert conflict target `write-progress.ts:809` (`onConflict: 'child_id,work_name'`); unique constraint `migrations/111_fix_data_integrity.sql:60` (`UNIQUE (child_id, work_name)`)
**What:** The resolver deliberately keeps the teacher's *raw* string as `work_name` while attaching the human-chosen `work_key`. But the cache's uniqueness — and the upsert's conflict target — is `(child_id, work_name)`, not `(child_id, work_key)`. So resolving "sandpaper letterz" → `lang_5` for a child who already has a row named "Sandpaper Letters" with key `lang_5` produces **two rows carrying the same key for one child**. There is no unique index on `(child_id, work_key)` anywhere in 111, 344, 345 or 346.
**Why it matters:** Every consumer that counts rows rather than keys double-counts: `progress/bars`, `progress/summary`, `classroom-summary`, `parent/stats`, `curriculum-gaps`, the institutional Progress Index. The two rows can hold *different statuses* and nothing reconciles them. `montree_rebuild_child_progress` partitions by `work_key` and writes the latest `work_name`, so it updates one row and leaves the stale duplicate behind forever. And the duplicate immediately trips invariant #5 (`duplicate-work-name`), an *error*-severity nightly failure with no fix path.
**Fix:** Resolve to the curriculum row's canonical `name`, not the raw string — the raw string belongs in the queue row (it is already preserved there) and in `notes`, not as the row's identity. Add `CREATE UNIQUE INDEX … ON montree_child_progress (child_id, work_key) WHERE work_key IS NOT NULL` and move the door's `onConflict` to it once the data is clean.

### [SEV: HIGH] A same-day duplicate unknown name silently discards the whole queue batch
**Where:** `lib/montree/progress/write-progress.ts:948-972` (`queueForReview` → bare `.insert(rows)`); unique index `migrations/345_progress_review_queue.sql` `idx_montree_progress_review_queue_dedup ON (child_id, LOWER(raw_work_name), ((created_at AT TIME ZONE 'UTC')::date)) WHERE resolved_at IS NULL`
**What:** 345 deliberately makes an *open* queue row unique per child + name + day — good, it bounds growth. But the door inserts with no `onConflict` / `ignoreDuplicates`, and the error handler only special-cases `42P01` (missing table); a `23505` unique violation falls into the generic `console.error(... '(non-fatal)')` branch. Because `.insert()` is given the whole `queued` array in one statement, **one duplicate rejects every row in the batch**, including unrelated children's observations.
**Why it matters:** Rule 5 promises "the observation is NOT discarded — it goes to the review queue". A teacher photographs the same unrecognised work twice in a morning (or a batch import hits the same bad name twice) and the observation vanishes with nothing to show for it — no progress row, no queue row, no error to the caller, because `queueForReview` never surfaces failure into the result. Rules 5 and 11 both broken by one missing clause.
**Fix:** `.upsert(rows, { onConflict: 'child_id,raw_work_name,...', ignoreDuplicates: true })` against the dedup index, or dedupe `queued` in memory before inserting and insert row-by-row on conflict. Either way, surface a queue-insert failure on `ProgressResult` so the route can tell the teacher the observation was lost.

### [SEV: MEDIUM] The one-door guard test cannot catch most of what it claims to
**Where:** `tests/progress/one-door.test.ts:29-31` (`ROOTS = ['app','lib','scripts','jobs']`), `:105-107` (`TABLE_REFERENCE` literal-only regex, `WINDOW = 400`)
**What:** The test is a text scan with four blind spots. (a) **One table.** It scans only `montree_child_progress`; `montree_progress_events` (the source of truth, with an exported `appendEvents`), `montree_progress_review_queue`, `montree_child_focus_works` — which the handoff calls "a DERIVED CACHE" while 14 files write it directly — and `montree_game_progress` are all unguarded. (b) **Four roots.** `components/`, `montage-worker/`, `potato-worker/`, `supabase/`, `db/` and the repo root are never walked. (c) **Literal strings only.** `from(TABLE)`, `rpc('montree_rebuild_child_progress')`, a `pg`/`postgres.js` raw query, or a `supabase-js` call built from a constant all pass. (d) **400 characters.** `lib/montree/progress/advance-shelf-after-mastery.ts` already has a read at :54 and a write 605 characters later — a file with that shape on the *same* table would slip through invisibly.
**Why it matters:** The constitution rests rule 2 on this test ("a test fails the build if any other file references…"). It is the only thing standing between the engine and a repeat of the ten bypass writers, and it is a shallow grep. The clean inventory above is a fact about today's code, not a guarantee about tomorrow's.
**Fix:** Parameterise over a table list (`montree_child_progress`, `montree_progress_events`, `montree_progress_review_queue`, `montree_child_focus_works`), add the missing roots, raise `WINDOW` to end-of-statement (scan to the next `;` or a matching `await`), and add a second scan for `rpc(` with any of the rebuild/seed function names. Do not export `appendEvents` — give the two legitimate callers a narrower named helper.

### [SEV: MEDIUM] Nightly invariants will report thousands of false errors from night one
**Where:** `lib/montree/tracking/invariants.ts:64-83` (check #2); `app/api/montree/tracking/health/route.ts:174-193` (`loadCurrentTable` returns **every** keyed cache row); severity map `:50-58` (`'status-without-event': 'error'`); `.github/workflows/tracking-health.yml:88-91` (any error fails the job)
**What:** Check #2 compares the entire cache table against journal-derived state, treating any row the journal cannot account for as an error. `montree_progress_events` only exists from migration 314; every progress row written before it — years of Whale Class history — has no event. Each one produces `status-without-event`, severity *error*. The prescribed fix ("Rebuild montree_child_progress from montree_progress_events") **does not fix them**: `rebuiltRowsFor` only emits rows for keys the journal has, so those rows are neither corrected nor removed and the same errors reappear tomorrow. `no-key` will likewise fire on every `work_key: null` row that `curriculum/duplicates` journals (F-02).
**Why it matters:** The nightly job emails the repo owner on every failure. A permanently-red workflow with thousands of unfixable rows is functionally the same as no workflow — and the constitution's own reasoning for making "no observation for 10 days" a *warning* ("a red build every time a child is off sick would train everyone to ignore this workflow") applies with far more force here.
**Fix:** Give check #2 a floor: pass the journal's earliest `created_at` (or an explicit `journalStartsAt`) into `InvariantOptions` and skip any cache row whose `updated_at` predates it, or downgrade `status-without-event` to a warning until a one-off backfill has journalled the legacy rows. Better: write that backfill (`source: 'backfill'`, one synthetic event per legacy row) so the journal is genuinely complete and the check can stay an error.

### [SEV: MEDIUM] The nightly health workflow calls a host this repo already documents as returning 403
**Where:** `.github/workflows/tracking-health.yml:45` (`curl … https://montree.xyz/api/montree/tracking/health`); `CLAUDE.md`, session "Aug 18, 2026 (PM)" — *"montree.xyz (apex+www) returns Railway edge 403 (x-railway-fallback) … GitHub Actions engagement cron 401/403s = this"*
**What:** The workflow is modelled on `engagement-cron.yml` and reaches the same apex host by the same method. CLAUDE.md records that this exact pattern has been failing with a Cloudflare/Railway edge 403 and that the cause is unresolved (the apex must stay orange-clouded for China). The workflow correctly fails loudly on a non-200, so it will simply be red every night for a reason unrelated to tracking. The secret comparison is also a plain `===` on `x-cron-secret` (`health/route.ts:71`), not `timingSafeEqual` like `lib/verify-super-admin.ts`.
**Why it matters:** Rule 10's whole value is that somebody is told. If the job fails on transport every night, nobody reads it, and F-01/F-03/F-04 stay invisible.
**Fix:** Point the workflow at the Railway service hostname (the one `www.teacherpotato.xyz` resolves through) or verify the apex path first with a `workflow_dispatch` run before relying on it. Use a constant-time comparison for the cron secret.

### [SEV: MEDIUM] Two teachers (or a photo and a tap) on one cell can lose an update and silently downgrade a child
**Where:** `lib/montree/progress/write-progress.ts:415-441` (pre-read), `:806-812` (unconditional upsert), `:534-556` (`movedToday` pre-read)
**What:** The door is read-decide-write with no transaction, no row lock, no `WHERE status < :new` predicate on the upsert and no version column. Two concurrent writes both read the same `previousStatus`, both pass `applyEvent`, and both upsert unconditionally — last writer wins on the raw value, not on rank. The same-day dedupe is read at `:537` before either has written, so both also miss it.
**Why it matters:** Concrete: a child is at `presented`. The teacher taps *mastered* while the photo-audit pipeline resolves the same work to `practicing`. Both read `presented`; both are accepted (each is a forward move from what it read); the photo write lands last and the row becomes `practicing`. A **downgrade through the door**, with `allowDowngrade` false everywhere, and two journal rows claiming `presented → mastered` and `presented → practicing`. The milder case — two teachers tapping the same cell — writes two duplicate journal rows for one transition, which replay tolerates but which corrupts any event-count metric.
**Fix:** Move the decision into the database. A `montree_apply_progress_event(child, work_key, work_name, status, source, reason, …)` function that reads the current row `FOR UPDATE`, applies the rank gate and the same-day check, upserts the cache and inserts the event in one transaction — which also fixes F-03. Failing that, add `AND montree_child_progress.status IS DISTINCT FROM EXCLUDED.status AND rank(EXCLUDED.status) > rank(montree_child_progress.status)` as a `WHERE` clause on the upsert's `DO UPDATE` and re-read on zero rows affected.

### [SEV: MEDIUM] "Next letter" hands a child the out-of-order `x` book after `b`, skipping f/l/j
**Where:** `lib/montree/dark-phonics/tracker-works.ts:150-155` (`x` appended at the end of `TRACKER_LETTERS` with `status: 'live'`), `:296-304` (`nextLetter` filters to live letters **preserving array order**); mirrored by `lib/montree/tracking/derive.ts:80-88`
**What:** `TRACKER_LETTERS` is documented as "the letters, in book/teaching order", but `x` is placed last (with a comment explaining it is an exception to the plan) while carrying `status: 'live'`. `nextLetter` filters to live letters without re-sorting, so the live sequence is `s a t p i n m d g o c k ck e u r h b **x**`. Executed:

```
after mastering s..b:  nextLetter = x     (book order would say f)
```

**Why it matters:** A child who finishes `b` is guided to *Fox in a Box* rather than the next letter in the teaching sequence. The parent summary then says "Next week we will start the 'x' book". `derive.flags` compounds it: once `x` is mastered, the gap check reports `x` mastered with every one of f, l, j, v, w, y, z, qu "unfinished" — a wall of `gap` flags generated by the engine's own guidance.
**Fix:** Keep `TRACKER_LETTERS` in true book order (move `x` to its curricular position) and let `status: 'live' | 'coming'` alone decide availability. If a `coming` letter must be skipped, say so explicitly in `nextLetter` and suppress the gap flag for skipped-because-unbuilt letters rather than reporting them as teaching gaps.

### [SEV: MEDIUM] "Main book" and mastery are hardcoded in TypeScript, not curriculum data
**Where:** `lib/montree/dark-phonics/tracker-works.ts:117-155` (`TRACKER_LETTERS` literal), `:36-49` (the module's own comment: *"Hardcoded rather than derived at runtime… If lessons.ts/book-works-lessons.ts grow a canonical per-letter index later, prefer deriving"*), plus its documented drift against `lessons.ts` (a/`ant-on-my-apple`), `book-works-lessons.ts` (f/l/j) and the filesystem (x)
**What:** Rule 7 says "SEQUENCE IS DATA", and for the generic curriculum it is (`montree_classroom_curriculum_works.sequence`). But *which book counts toward a letter's mastery* — the thing the ribbon, the parent summary and `nextLetter` all turn on — is a hand-maintained array in code, deliberately duplicating three other data modules and the published-PDF directory. The file already documents four places it has drifted from. A letter with two books (t: `the-sat` **and** `the-tall`) is handled by simply omitting the second, with no data to say so.
**Why it matters:** Adding the `f` work pack means editing TypeScript and redeploying; it cannot be a curriculum-data change or a migration. When it drifts again — and the file records four existing drifts — the ribbon tells a parent their child mastered a letter they never met, and no invariant can see it because `LIVE_LETTERS` is the same constant the checks are written against.
**Fix:** Seed the per-letter definition into the database alongside the `dp:` work rows (migration 344 already seeds the works — add a `montree_dark_phonics_letters` table or a `metadata` column carrying `letter`, `slug`, `is_main_book`, `status`, `order`), have `persistence.loadWorks` return it on the `Ledger`, and reduce `tracker-works.ts` to a fallback. Until then, add a test that asserts `TRACKER_LETTERS` agrees with `lessons.ts` / `book-works-lessons.ts` / the `public/dark-phonics-books/works/` listing, so drift fails the build instead of shipping.

### [SEV: MEDIUM] The rebuild nulls `school_id` on every row it touches
**Where:** `lib/montree/tracking/persistence.ts:456` (`school_id: null` in every `RebuiltRow`); `lib/montree/progress/write-progress.ts:1063-1075` (`applyRebuiltProgress` copies it into the upsert record with no `COALESCE`)
**What:** `rebuiltRowsFor` never reads `school_id` — `montree_progress_events` carries one, but `toProgressEvent` does not map it onto `ProgressEvent` and the type has no field for it. The rebuilt rows therefore always carry `school_id: null`, and `applyRebuiltProgress` upserts them verbatim. `classroom_id` is only slightly better: it comes from the event rows, which the door stamps best-effort. The SQL twin gets this right (`school_id = COALESCE(EXCLUDED.school_id, montree_child_progress.school_id)`, `346:187`); the TypeScript path does not.
**Why it matters:** The door's stated reason #1 for existing is *"a child who transfers schools next term does not take their history out of the rollup with them"*. One rebuild through the TypeScript path strips exactly that stamp from every row it rewrites, and the institutional Progress Index silently loses those rows. There is a repair script (`scripts/institutions/backfill-work-keys.mjs`) — but nothing tells anyone to run it.
**Fix:** Add `school_id` to `ProgressEvent` and `toProgressEvent`, carry it through `rebuiltRowsFor`, and in `applyRebuiltProgress` omit `school_id`/`classroom_id` from the update when the rebuilt value is null (or use the SQL twin's `COALESCE` semantics) so a rebuild can only ever add a stamp, never remove one.

### [SEV: LOW] The retired 1–128 pointer is flagged as an error while two live consumers still read it
**Where:** `lib/montree/tracking/invariants.ts:147-158` (`legacy-pointer-conflict`, fix: *"Delete the row"*); severity `error` at `health/route.ts:57`; consumers `lib/montree/evaluation/session-service.ts:488-503` and `app/api/montree/evaluation/child/[childId]/report/route.ts`
**What:** Retirement is otherwise clean — I found **zero writers** to `montree_child_english_progress` anywhere in the snapshot, `dashboard/english-progress` PATCH returns 410, and `tests/readers/no-legacy-sequence.test.ts` guards the reader tree. But `session-service.loadClassroomPosition` still reads the table into the Milestones/Lens evaluation report's `english` block, and the nightly job tells the operator to delete the very rows that block depends on.
**Why it matters:** Following rule 10's own fix quietly empties a field on the evaluation report. Not following it leaves the nightly job red forever. Either way the operator is being given bad advice by the system that is supposed to be authoritative.
**Fix:** Decide, and encode the decision. Either port `loadClassroomPosition`'s `english` block onto `readingPosition` / the ribbon (`lib/montree/reports/reading-position.ts` already exists for exactly this) and then delete the table, or exempt evaluation from rule 8 and downgrade `legacy-pointer-conflict` to a warning with a fix that says which consumer still needs it.

### [SEV: LOW] Two divergent source-vocabulary mappings; a source that means "correction" on write means "tap" on read
**Where:** `lib/montree/progress/write-progress.ts:269-281` (`toEngineSource`, substring heuristics: `s.includes('correct') → 'correction'`) vs `lib/montree/tracking/persistence.ts:73-104` (`SOURCE_ALIASES`, an exact-match table; anything unknown → `'tap'`)
**What:** The door and the reader normalise the same free-text `source` column with two different, independently-maintained algorithms. `'self_correction'`, `'teacher-correction'` or `'auto_correction'` map to `'correction'` on the way in and to `'tap'` on the way out. `'paper_scan'` → `'photo'` in both, by coincidence of two separately-written tables. Neither has a test asserting they agree.
**Why it matters:** It is the second half of F-01: even a caller who *tries* to signal a correction can have that meaning erased on read. And the asymmetry will drift further every time someone adds a source string to one file.
**Fix:** One exported mapping in `lib/montree/tracking/types.ts` (or a small `sources.ts`), imported by both. Add a property test: for every legacy source string in the repo, `normaliseSource(toEngineSource(s)) === toEngineSource(s)`.

### [SEV: LOW] Games and live BookWorks still fall outside rule 11
**Where:** `app/api/games/progress/route.ts:83,115,147,178` and `app/api/games/track/route.ts:48` write `montree_game_progress` directly; `components/montree/dark-phonics-live/activities/BookWorks.tsx` (per the handoff, `emitDone` returns `'skipped'` — no child identity in the live stage)
**What:** The constitution's audit findings name both ("games keep montree_game_progress"; digital works discard "done"). `done-signal.ts` correctly refuses to guess a child, which is the right call — but the consequence is that a whole category of observed activity never reaches the ledger, and games were never wired at all.
**Why it matters:** Small, and honestly documented in the handoff as a known gap. Worth recording so it is not mistaken for done: rule 11 is currently satisfied by *writing nothing*, not by capturing the observation.
**Fix:** Thread a child id into the live stage (the handoff's own stated follow-up), and give `game_progress` a `work_key` + a `done-signal` emit for the games that map to a tracked work. Until then, list both in the constitution's own "known gaps" section rather than under rule 11 as satisfied.

---

## Tests — what exists, what is missing

**Exists and is good.** `tests/tracking/simulated-term.test.ts` (128 assertions) is the plan's simulated-term harness and it is real: every named scenario is there — Mei racer, Chris steady, Li stalls (stuck-3-weeks), Amir absent (class-letter fallback), Sara mid-year backfill, teacher typing, duplicate photo same morning, downward correction with reason, AI 0.92 vs 0.70, and the old pointer at lesson 54. Plus `resolve.test.ts`, `persistence.test.ts`, `guidance.test.ts`, `tests/progress/*` (34), `tests/readers/*` (20), `tests/tracker-ui/*` (31), `tests/dark-phonics/*` (25).

**Missing, in order of what it would have caught.**
1. **Journal round-trip.** No test writes through the door, reads back the rows it journalled, maps them with `toProgressEvent` and replays them. This single test catches F-01, F-01b and F-03.
2. **The realistic downgrade.** `engine-decides.test.ts:110` only tests `source: 'correction'` **with** a reason — the one path that works. Nothing tests `progress/update`'s actual call (`source: 'teacher_update'`, `allowDowngrade: true`, no reason).
3. **Rebuild parity.** Nothing runs `rebuiltRowsFor` and `montree_rebuild_child_progress` against the same fixture.
4. **Concurrency.** No test issues two overlapping `writeProgress` calls for one cell.
5. **Timezone.** Every fixture timestamp is mid-UTC-day; no test uses a Beijing-morning or Beijing-Monday boundary.
6. **Scale.** No performance assertion anywhere; F-04 is invisible to the suite.
7. **Tenancy on the merge.** No test seeds two schools sharing a work name and merges in one.
8. **Queue conflict.** Nothing exercises two same-day unknown names for one child.
