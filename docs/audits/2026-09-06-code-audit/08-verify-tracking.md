# Verification pass — Tracking Engine v2

Sceptical second review of `/tmp/montree-audit/06-tracking-engine.md`, against
`/tmp/montree` (read-only, untouched — `git status` clean) and the constitution at
`docs/tracking/TRACKING_CONSTITUTION.md`.

Method: full-file reads of the door, the engine and every named route, plus **live
execution** of the pure engine *and of the real `writeProgress` door* under a faked
Supabase client in `/tmp/engine-verify` (tsx, Node 22). Every "confirmed" below has a
runnable reproduction, not a reading. One claim was tested against the live host.

---

## Verdict table

| # | Finding (as filed) | Verdict | Severity (mine) | Decisive evidence |
|---|---|---|---|---|
| 1 | `curriculum/duplicates` renames/deletes progress cross-tenant | **CONFIRMED** | CRITICAL | `route.ts:192,201,222,226,58` — 5 unscoped statements; `verifySchoolRequest` = any teacher, not super-admin; `UNIQUE (child_id, work_name)` (111:61) is global |
| 2 | Corrections lost on replay | **CONFIRMED — and broader** | CRITICAL | Ran the real door: journals `source:'teacher_update', reason:null`, cache `practicing`, replay derives `mastered`. **3** caller shapes, not 2 |
| 2b | *(new)* `guru` `correcting_downward` has the same defect | **NEW — CONFIRMED** | HIGH | `tool-executor.ts:198-206` → `source:'guru'` → `normaliseSource` → `'ai'` → `backward-without-correction` |
| 2c | *(scope correction)* the **new tracker UI is clean** | **AUDIT OVERSTATED** | — | `tracker-actions.ts:112-118` uses `progress/event` with mandatory reason and round-trips. Only the 8 legacy surfaces on `progress/update` are broken |
| 3 | JS `rebuiltRowsFor` vs SQL 346 disagree | **CONFIRMED** | HIGH → **downgraded to MEDIUM on impact** | Executed both: JS `mastered`, SQL `practicing`. But `montree_rebuild_child_progress` has **zero callers** (grep: comments only) — latent footgun, not a live divergence |
| 3b | SQL aborts on duplicate work names | **CONFIRMED as mechanism, UNPROVEN as reachable** | LOW-MEDIUM | `PARTITION BY work_key` + `ON CONFLICT (child_id, work_name)` (346:154,181) → PG 21000 if two keys share a name. No demonstrated path that creates that pair |
| 4 | Class endpoint ~23 s CPU | **CONFIRMED — worse** | HIGH | Independent fixture (22 children / 30 weeks / 3,300 events): **29,045 ms**. `flags()` 10.4 s, `englishSummary` 9.8 s, `planLanguageCell` 6.6 s |
| 4b | *(fix correction)* "memoise `replay` on array identity = two-line stopgap" | **REFUTED as sufficient** | — | Identity memo alone: 29,045 → 9,953 ms (`englishSummary`/`planLanguageCell` pass a *fresh filtered array* each call). Adding a cutoff-keyed cache: **35 ms** |
| 4c | "`tracking/health` is worse" | **REFUTED** | — | `checkInvariants` on the same fixture: **230 ms**. Health-route cost is I/O, not CPU |
| 5 | Hard-UTC day/week/dedupe | **CONFIRMED** | HIGH | Executed both boundary repros. `school-time.ts` imported by 14+ routes, **zero** references in `lib/montree/tracking/**`, `lib/montree/progress/**`, `app/api/montree/tracking/**` |
| 5b | *(magnitude re-cast)* | **PARTIALLY DOWNGRADED / PARTIALLY WORSENED** | — | Beijing's exposed window is 00:00–08:00 local (largely out of hours). For any school **west** of UTC the split lands mid-afternoon — in-hours. The audit anchored on the weaker case |
| 6a | Journal append non-transactional / best-effort | **CONFIRMED** | HIGH | `write-progress.ts:899` after the committed upsert at `:807`; `appendEvents:982` cannot throw; `ProgressResult` (`:142-164`) has no `journalled` field |
| 6b | Review-queue resolve creates a 2nd row per `work_key` | **CONFIRMED** | HIGH | `resolve/route.ts:137` passes `workName: row.raw_work_name`; conflict target is `(child_id, work_name)`; **no** unique index on `(child_id, work_key)` in 111/311/314/344/345/346 |
| 6c | Duplicate unknown name 23505s the whole batch | **CONFIRMED** | MEDIUM | `queueForReview:954` bare `.insert(rows)`, whole array, one statement; handler special-cases only `42P01` (`:956`); dedup index is 345:88-89 |
| 7 | One-door guard scans one table / literal strings | **CONFIRMED** | MEDIUM | My own 1,500-char scan over 11 roots: `montree_progress_events` **1** writer, `montree_child_focus_works` **11 live files / 15 sites**, `montree_progress_review_queue` **2**, `montree_game_progress` **2** — none guarded |
| 7b | "no undetected bypass writer to `montree_child_progress`" | **INDEPENDENTLY CONFIRMED** | — | My wider scan surfaced 3 extra hits (`fill-shelf:175`, `guru/concern:174`, `advance-shelf:54`); all three are **reads** followed by a write to a *different* table. Audit was right |
| 8a | Rule 10 flags every pre-314 row; rebuild won't fix | **CONFIRMED-CONDITIONAL, magnitude DOWNGRADED** | MEDIUM | `loadCurrentTable` (`health/route.ts:186`) **skips `work_key IS NULL`**, so untouched legacy rows are *not* flagged. It fires on rows stamped by `backfill-work-keys.mjs` (which writes **no** events). `applyRebuiltProgress:1079` upserts and never deletes → genuinely unfixable by rebuild |
| 8b | Workflow curls an apex host that 403s | **REFUTED** | — | Live now: `GET https://montree.xyz/api/montree/tracking/health` → **401** with `{"error":"Unauthorized"}` — the app's own body. Transport works; the CLAUDE.md note is stale |
| 8c | `===` on the cron secret | **CONFIRMED, downgraded to NIT** | LOW | `health/route.ts:73` |
| 9 | Missing journal round-trip test | **CONFIRMED — sketch written and executed** | — | 6 cases; 2 pass, 4 fail today for the right reasons; all but one pass under a 3-line fix |

---

## Per-finding detail

### 1 — Cross-tenant destruction in `curriculum/duplicates`. CONFIRMED, CRITICAL.

I tried to disprove this three ways and failed on all three.

**Is it super-admin only?** No. `route.ts:126` calls `verifySchoolRequest`, which
(`lib/montree/verify-request.ts:96-142`) accepts any valid `montree-auth` cookie —
role `teacher` is enough. There is no role check anywhere in the POST handler.

**Is `work_name` per-school?** No. `migrations/111_fix_data_integrity.sql:60-61` is
`ADD CONSTRAINT unique_child_work UNIQUE (child_id, work_name)` — unique per *child*,
not per school. `montree_child_progress` has no tenancy in its key at all;
`school_id`/`classroom_id` are nullable stamps added later (311:28-30). Every school's
classroom curriculum is seeded from the same shared Montessori vocabulary, so
`work_name = 'Pink Tower'` exists verbatim across the instance.

**Does it filter by the classroom's curriculum anywhere?** Only for the *works*, never
for the *progress*. `:148-164` correctly scope winner and losers with
`.eq('classroom_id', classroomId)`. Then:

```
:189  supabase.from('montree_child_progress').select('id, child_id, work_name, status')
:192    .eq('work_name', loserName)                      ← no child/classroom/school
:198  .from('montree_child_progress').select('child_id')
:201    .eq('work_name', winner.name)                    ← no scope
:222  .from('montree_child_progress').delete().eq('id', lp.id)
:226  .from('montree_child_progress').update({ work_name: winner.name }).eq('id', lp.id)
:55-58 the GET count query — also global
```

**Reproduction.** School A and School B both have a child with a `montree_child_progress`
row named `Sandpaper Letters`. School B's child also holds `Sandpaper Letters (Lower)`.
A teacher at **School A** merges `Sandpaper Letters (Lower)` → `Sandpaper Letters`:

| | before | after |
|---|---|---|
| A/child, `Sandpaper Letters (Lower)` | `practicing` | renamed → `Sandpaper Letters` (intended) |
| **B/child, `Sandpaper Letters (Lower)`** | `mastered`, `mastered_at 2026-03-04` | **row DELETED** (`:222`, because B's child already holds the winner name) |
| **C/child, `Sandpaper Letters (Lower)`** | `presented` | **renamed** to A's winner string (`:226`) |

The journal row written for B's child (`:231-247`) sets `old_status === new_status`, so
it reads as a *rename*, not a destroyed rung — and `work_key: null` (`:235`), so it also
trips invariant #1 forever. Nothing in the nightly check detects the deletion: check #2
only iterates the **cache** (`health/route.ts:186`), so a cache row the journal *does*
account for but which no longer exists is invisible.

Extra beyond the original filing: the invariant asymmetry above means *any* cache-row
deletion is undetectable by rule 10, not just this one.

**Minimal fix** (5 lines, no schema change):

```ts
// after :164, once
const { data: kids } = await supabase
  .from('montree_children').select('id').eq('classroom_id', classroomId);
const childIds = (kids || []).map(k => k.id);
if (childIds.length === 0) { /* nothing to merge */ }
// then add .in('child_id', childIds) to :192, :201, :222 (or .eq('child_id', lp.child_id)), :226, :58
```
Plus: journal the delete as a real transition (`old_status: lp.status`,
`new_status: 'not_started'`) and stop writing `work_key: null`.

---

### 2 — Corrections are journalled un-replayably. CONFIRMED, CRITICAL. Broader than filed.

I executed the **real door** (`writeProgress` imported unmodified from `/tmp/montree`)
against a faked Supabase, then fed the rows it emitted back through the **real**
`toProgressEvent` + `replay`:

```
door outcome  : written → cache status practicing
journal row   : {"work_key":"dp:t:3","old_status":"mastered","new_status":"practicing",
                 "source":"teacher_update","reason":null, ...}
replay verdicts: [ ACCEPTED, ACCEPTED, REJECTED:backward-without-correction ]
  derived      : mastered
  cache        : practicing
  ❌ JOURNAL AND CACHE DISAGREE
```

The mechanism is exactly as filed and I could not break it: the door builds
`engineEvent` with `source: entry.allowDowngrade ? 'correction' : …` and a synthesised
reason (`write-progress.ts:702-712`), asks `applyEvent`, gets an accept — then throws
that event away and journals the caller's raw fields (`:874-877`):

```ts
source: p.entry.source || 'unknown',
reason: p.entry.reason ?? null,
```

**Three shipped callers, not two** — the audit missed the guru path:

| caller | `source` sent | `reason` | `normaliseSource` → | replay verdict |
|---|---|---|---|---|
| `progress/update:126-135` (the P/P/M picker) | `teacher_update` | none | `tap` | `backward-without-correction` |
| `intelligence/evidence:179-187` (revoke mastery) | `correction` | none | `correction` | `correction-without-reason` |
| **`guru/tool-executor:198-206`** (`correcting_downward`) | `guru` | none | `ai` | `backward-without-correction` |

All three verified by execution.

**Scope correction the audit got wrong in the other direction.** The *new* tracker grid
is clean: `app/montree/dashboard/tracker/components/tracker-actions.ts:112-118` posts to
`progress/event`, which rejects a reasonless correction at `route.ts:86-91`, and forwards
`source:'correction'` + the reason. I round-tripped that path and it passes. The damage is
confined to the eight legacy surfaces still calling `progress/update` —
`photo-audit`, `weekly-wrap`, `voice-onboarding`, `ShelfView`, `WeeklyWrapTab`,
`PhotoInsightPopup`, `PhotoInsightButton`, `TeachGuruWorkModal` — plus the two above.
`ShelfView.tsx:276-280` sends an arbitrary `newStatus` with no `no_downgrade` and no
reason, so the repro is the default path there.

**Minimal fix — 3 lines, validated by execution.** Carry the engine's decision:

```ts
interface Planned { …; engineEvent: EngineEvent; }              // +1
const p: Planned = { …, engineEvent };                           // +1 (write-progress.ts:781)
source: p.engineEvent.source,                                    // :874
reason: p.engineEvent.reason ?? null,                            // :877
```

I applied exactly that to my copy and re-ran the sketch: **all three failing cases pass**,
the two healthy cases still pass, and the only remaining failure is the separate
`school_id: null` bug (§3). Follow it with the `progress/event` guard generalised into
the door: reject `allowDowngrade: true` with no reason rather than synthesising one.

---

### 3 — Two rebuilds, two answers. CONFIRMED; impact downgraded.

I ported migration 346's function faithfully to JS (`changes` = rows where
`old_status IS DISTINCT FROM new_status`; latest per `work_key` by `created_at`) and ran
both against the same journal:

```
JS  rebuiltRowsFor : dp:s:1=mastered   school_id=null
SQL 346            : dp:s:1=practicing school_id=s1
```

The migration's equivalence argument (`346:134-137`) is *"backward moves … are never
journalled as CHANGES — the door writes an EVIDENCE row instead"*. That is false for
precisely the §2 rows: the door **accepts** those downgrades (its in-memory event is a
correction), so they are journalled as real changes with `old ≠ new`. The SQL takes the
latest; the JS re-evaluates and refuses. Whichever ran last decides the child's record.

**Why I downgrade the severity.** `montree_rebuild_child_progress` is called from
**nowhere**: grep across `.ts/.tsx/.mjs/.js/.yml` returns only comments in
`rebuild/route.ts:12`, `persistence.ts:18`, `write-progress.ts:1047` and the migration
itself. The live rebuild button and the nightly workflow both use the TypeScript path.
So today this is a support-engineer footgun, not a running divergence — real, but it
cannot fire on its own.

**3b, the abort.** Mechanically confirmed: `PARTITION BY e.work_key` (346:154) with
`ON CONFLICT (child_id, work_name)` (346:181) means two `latest` rows sharing a
`work_name` raise PG `21000` and abort the whole child. My port reproduces the condition.
But I could not construct a *reachable* path that creates two distinct `work_key`s under
one `work_name` for one child: §6b's duplicate is the mirror image (one key, two names),
which `PARTITION BY work_key` collapses safely. **Unproven as reachable — keep the
`DISTINCT ON` guard as cheap insurance, not as a live defect.**

**Fix:** delete one implementation. If 346 survives, partition by `work_name` (or add
`DISTINCT ON (work_name)`) and add a fixture test running both and asserting equality.

---

### 4 — Performance. CONFIRMED and worse; the proposed fix is insufficient.

Own fixture, no reuse of the audit's: 22 children, 30 weeks, 5 events/child/week =
**3,300 events**, 31 week-starts, real `dp:` keys from `TRACKER_LETTERS`.

```
children=22 weeks=30 events=3300
  rebuildCurrent x1       481 ms
  flags() x1            10354 ms
  weekTicks x22          3095 ms
  englishSummary x22     9796 ms
  planLanguageCell x22   6550 ms
  TOTAL (class route)   29045 ms
```

**The hot loop**, located precisely: `derive.ts:123` — `weekTicks` opens with
`replay(events)` over the *entire classroom journal*. `flags()` (`:181`) calls
`highestDpOfWeek` (`:169`) three times per child, each of which calls `weekTicks` → so
`flags` alone is `1 + 3N` full replays. `englishSummary` (`summary.ts:127-135`) adds
three more per child (one `weekTicks` + two filtered replays); `planLanguageCell`
(`derive.ts:262,272`) two more. `EVENT_LIMIT = 20000` is ~6× this fixture.

**The audit's fix is only half right, and I can show the gap.** Adding a `WeakMap`
identity memo to `replay`:

```
  flags()              10354 →    40 ms   ✅
  weekTicks x22         3095 →     6 ms   ✅
  englishSummary x22    9796 →  7309 ms   ❌ unchanged
  planLanguageCell x22  6550 →  3385 ms   ❌ unchanged
  TOTAL                29045 →  9953 ms
```

`englishSummary` and `planLanguageCell` call `replay(ledger.events.filter(...))` — a
**fresh array on every call**, so identity memoisation always misses. Still a 10-second
route.

Adding a second cache keyed on the *cutoff day* (the only thing that varies) for the
filtered replays:

```
  TOTAL                29045 →    35 ms   (830×)
```

**Minimal fix:** (a) `WeakMap<readonly ProgressEvent[], {state, rows}>` inside `replay`;
(b) a `replayBefore(events, cutoffDay)` helper with a `WeakMap<events, Map<day, result>>`
cache, used by `summary.ts:128,132` and `derive.ts:272`. Both are additive and pure;
nothing else changes. The structural version (thread a pre-computed `{state, rows}` down
from `loadLedger`) is better but is a signature change across five call sites.

**4c refuted.** `checkInvariants` over the identical fixture is **230 ms**. The nightly
health sweep's cost is database round-trips per classroom, not derivation. "Worse than
the class route" is wrong by two orders of magnitude.

---

### 5 — Hard-UTC. CONFIRMED; magnitude re-cast.

Call sites verified line by line: `ledger.ts:61-63` (`dayOf` → `toISOString()`),
`ledger.ts:85,139` (dedupe key, `movedOn`), `derive.ts:102-111` (`weekEnd`/`inWeek`),
`derive.ts:156-160` + `invariants.ts:44-46` (`daysBetween`), `persistence.ts:142-148,155,158`
(`mondayOf`, `weekStartsBetween` — `setUTCDate`), `write-progress.ts:535`
(`startOfDay = ${now.slice(0,10)}T00:00:00.000Z`),
`migrations/345:88-89` (`((created_at AT TIME ZONE 'UTC')::date)`).

`lib/montree/school-time.ts` exists and is *widely used* — `reports/send`,
`reports/preview`, `reports/photos`, `dashboard/class-progress`,
`dashboard/english-schedule`, `calendar`, `calendar/summary`, `class-documents`,
`cron/engagement` — and is referenced **zero times** in `lib/montree/tracking/**`,
`lib/montree/progress/**` or `app/api/montree/tracking/**`. The tracking engine is the
one subsystem that opted out of the repo's own rule.

**Reproductions (executed):**

```
A) SAME-DAY DEDUPE, Beijing morning
   Beijing Tue 07:30 = 2026-09-07T23:30Z  dayOf -> 2026-09-07
   Beijing Tue 08:30 = 2026-09-08T00:30Z  dayOf -> 2026-09-08
   photo 1: ACCEPTED
   photo 2: ACCEPTED   <-- ladder advanced TWICE in one Beijing morning
   control (Beijing 09:30 + 10:30): photo 2 rejected duplicate-same-day  (correct)

B) WEEK BUCKETING
   tick 2026-09-13T20:00Z = Beijing Monday 14 Sep 04:00
   mondayOf(dayOf(t)) -> 2026-09-07     <-- LAST week
   inWeek(t,'2026-09-14') = false ;  inWeek(t,'2026-09-07') = true
```

**Where I disagree with the audit on magnitude.** For Beijing the broken band is
00:00–08:00 local, i.e. before the school day — a 07:30 photo is possible but not the
norm, so "two morning photos are not deduped" is the *edge* case, not the typical one.
The audit under-sold the other direction, though: for any school **west** of UTC the
local day straddles UTC midnight *during operating hours*. Executed for UTC-7:

```
US Pacific, one school FRIDAY
   15:00 local 2026-09-04T22:00Z -> day 2026-09-04
   17:30 local 2026-09-05T00:30Z -> day 2026-09-05
   same Friday, same work: 2nd photo ACCEPTED  <-- dedupe MISSED
```

Net: severity **HIGH** stands, but the strongest case is the western-hemisphere schools,
not Whale Class.

**Minimal fix:** add `timezone: string` to `Ledger`, defaulted from `getSchoolTimezone`
in `loadLedger`; make `dayOf`, `mondayOf`, `weekEnd`, `daysBetween` take it. The DB index
needs `((created_at AT TIME ZONE <literal>)::date)` or a generated `local_day` column
written by the door. Until then the 08:00 boundary should be a comment in `ledger.ts:60`.

---

### 6 — Journal atomicity, queue duplicates, queue batch loss. All CONFIRMED.

**6a.** `write-progress.ts:806` upserts the cache and commits; `:899`
`await appendEvents(...)` is a separate statement whose every failure path is a
`console.warn`/`console.error` + `return` (`:982-1031`, and its own docstring says *"this
function cannot throw, and its failure is invisible to the progress write that produced
it"*). `ProgressResult` (`:142-164`) has no field a caller could inspect. Rule 3 makes the
cache derived; a dropped append makes it strictly *ahead* of its source, permanently, and
the recovery tool then erases the row. CONFIRMED.
*Minimal fix:* a `montree_apply_progress_event(...)` RPC doing insert-event + upsert-cache
in one transaction (this also closes the read-decide-write race at `:415-441` / `:806`);
or, cheaply, add `journalled: boolean` to `ProgressResult` and an outbox.

**6b.** `resolve/route.ts:137` — `workName: row.raw_work_name`, `workKey` correct,
`strict: false`. The upsert's conflict target is `'child_id,work_name'`
(`write-progress.ts:809`) and the only unique constraint is `(child_id, work_name)`
(111:61). I grepped every migration: there is **no** unique index on `(child_id, work_key)`
— 314:574 creates a *non-unique* `idx_montree_child_progress_work_key`. So resolving
`"sandpaper letterz" → lang_5` for a child who already holds `"Sandpaper Letters"`/`lang_5`
yields two rows, one key, independently mutable statuses. CONFIRMED.
*Minimal fix:* write the curriculum row's canonical `name`; keep the raw string in the
queue row (already preserved) and in `notes`. Then
`CREATE UNIQUE INDEX … ON montree_child_progress (child_id, work_key) WHERE work_key IS NOT NULL`.

**6c.** `queueForReview:954` is a bare `.insert(rows)` over the whole `queued` array in one
statement; the handler special-cases only `42P01` (`:956`), so a `23505` from
`idx_montree_progress_review_queue_dedup` (345:88-89) lands in the generic
`console.error(... '(non-fatal)')` branch and **rejects every row in the statement**. The
per-entry loop (`:668-684`) never dedupes `queued`, so two unresolvable entries for one
child in one batch collide on their own. CONFIRMED as a mechanism; the same-day
cross-request collision is the more likely trigger.
*Minimal fix:* `.upsert(rows, { ignoreDuplicates: true })` against the dedup index plus an
in-memory dedupe of `queued`, and surface the failure on `ProgressResult`.

---

### 7 — The guard test. CONFIRMED. My own writer census.

`tests/progress/one-door.test.ts:30` `ROOTS = ['app','lib','scripts','jobs']`; `:106`
literal-only `from('montree_child_progress')`; `:107-108` `WINDOW = 400`; `:128` `break`
after the first hit per file. All four blind spots as filed.

I ran my own scan — 11 roots (adding `components`, `montage-worker`, `potato-worker`,
`supabase`, `db`, `native`, `tests`), window 1,500:

| table | live writers |
|---|---|
| `montree_child_progress` | **the door + the 3 documented exceptions only** (see 7b) |
| `montree_progress_events` | **1** — `write-progress.ts:1010`. `appendEvents` is exported; exactly **1** external caller today (`curriculum/duplicates:251`) |
| `montree_progress_review_queue` | **2** — `write-progress.ts:954`, `review-queue/resolve:178` |
| `montree_child_focus_works` | **11 files / 15 sites** — `fill-shelf:148,203` · `focus-works:220,284` · `guru/photo-insight:2186` · `progress/update:269` · `shelf-autopilot:245` · `shelf:189` · `weekly-review/apply-shelf:125` · `post-conversation-processor:199,211` · `guru/tool-executor:108,156` · `advance-shelf-after-mastery:68` · `replan-child:194` |
| `montree_game_progress` | **2** — `games/progress:83,115,147,178`, `games/track:48` |
| `montree_child_english_progress` | **0** — clean retirement, independently confirmed |

`docs/handoffs/HANDOFF_TRACKING_ENGINE_V2_2026-09-06.md:22` states
*"`montree_child_focus_works` is now a DERIVED CACHE"*. Fifteen ungated writers say
otherwise. **CONFIRMED.**

**7b — I confirm the audit's clean bill on `montree_child_progress`.** My wider window
surfaced three hits it listed as false positives or omitted:
`fill-shelf/route.ts:175`, `guru/concern/route.ts:174`,
`advance-shelf-after-mastery.ts:54`. I read all three: each is a `.select()` on
`montree_child_progress` followed, within the window, by a write to a **different** table
(`montree_child_focus_works`, or an unrelated insert). No undetected bypass writer exists
in this snapshot. The real weakness of the regex is that it does not bind the write to the
*same builder chain* — it both false-positives at 1,500 chars and false-negatives at 400.

*Minimal fix:* parameterise `TABLE_REFERENCE` over the five tables above, add the missing
roots, scan to end-of-statement rather than a fixed window, add a second scan for
`rpc('montree_rebuild_child_progress')`, and un-export `appendEvents` in favour of a
narrow named helper for the merge route.

---

### 8 — Rule 10. Split verdict.

**8a — CONFIRMED-CONDITIONAL, magnitude downgraded.** The claim *"flags every pre-314
row"* is **wrong**: `loadCurrentTable` (`health/route.ts:186-193`) does
`if (!row.work_key) continue`, so a legacy row with `work_key NULL` — which is every row
untouched since migration 311 added the column, and 311 ships **no backfill** — is
silently skipped. The check fires only on rows that *have* a key but no journal history.
That set is real and is created deliberately by
`scripts/institutions/backfill-work-keys.mjs:388`, which updates `work_key` on legacy rows
and (I grepped) never touches `montree_progress_events`. Every row it stamps becomes a
permanent `status-without-event` **error**.

The "rebuild won't fix it" half is fully confirmed: `rebuiltRowsFor` (`persistence.ts:446`)
only emits rows for keys present in the journal, and `applyRebuiltProgress`
(`write-progress.ts:1079`) is an `upsert` with **no delete** of stale rows. The prescribed
fix is a no-op for exactly these rows.

Two things I'd add that the audit missed:
* Check #1 (`invariants.ts:56-65`) scans `ledger.events` for a missing `work_key`, but the
  constitution's rule 10 says *"rows without key"*. A keyless **cache row** is invisible to
  rule 10 entirely — and `loadCurrentTable` skips it too.
* Check #2 is one-directional: it detects cache-ahead-of-journal, never
  journal-ahead-of-cache. §1's deletions and §6a's dropped appends are both undetectable.

*Minimal fix:* pass `journalStartsAt` (the journal's earliest `created_at`) in
`InvariantOptions` and skip cache rows older than it; or run a one-off backfill emitting a
synthetic `source: 'backfill'` event per legacy row and keep the check an error.

**8b — REFUTED.** I tested the live host rather than trusting the CLAUDE.md note:

```
GET https://montree.xyz/api/montree/tracking/health   → 401  {"error":"Unauthorized"}
GET https://www.montree.xyz/api/montree/tracking/health → 301
```

A 401 with the route's own JSON body proves the request reached the application. The
workflow's transport is fine; the Aug-18 403 note is stale and PoP-dependent, and the
audit generalised it into a standing failure it did not test.

**8c — CONFIRMED, downgraded to a nit.** `health/route.ts:73` uses `header === cronSecret`
rather than `timingSafeEqual`. Real but of negligible practical exposure over HTTP against
a long random secret.

---

### 9 — The missing test, written

Drop-in at `tests/progress/journal-round-trip.test.ts`. It uses the **real** door, the
**real** `toProgressEvent`/`replay`, and the same `fakeSupabase` shape as
`engine-decides.test.ts`, so it needs no new dependency.

I executed it (via a small `describe/it/expect` shim under tsx). **Today:**

```
  PASS  a forward tap round-trips
  PASS  a correction WITH a reason round-trips
  FAIL  a downgrade from progress/update round-trips
          rule 4: a downgrade is journalled as source correction: expected "correction" got "teacher_update"
  FAIL  a downgrade from intelligence/evidence revoke round-trips
          rule 4: a correction carries its reason: expected NOT ""
  FAIL  a downgrade from guru correcting_downward round-trips
          rule 4: a downgrade is journalled as source correction: expected "correction" got "guru"
  FAIL  rebuild parity: expected "practicing" got "mastered"
```

**With the 3-line §2 fix applied:** the first five pass; the sixth fails only on
`school_id` (`expected "3333…" got null`), isolating that bug cleanly.

```ts
// tests/progress/journal-round-trip.test.ts
//
// THE MISSING DECISIVE TEST — rules 3 + 4 of docs/tracking/TRACKING_CONSTITUTION.md.
//
//   Rule 3: "Current-status table = cache of the journal, rebuildable."
//   Rule 4: "Downgrade = explicit teacher correction with a reason, journaled as
//            source 'correction'."
//
// Every other test in tests/progress asserts what the door WRITES. None asserts
// that what it writes can be READ BACK. That gap is load-bearing: rule 8 makes
// every human-facing surface (ribbon, weekly summary, parent report) derived from
// the journal at read time, so a journal row the engine refuses on replay is a
// silent lie on the parent's screen while the cache looks correct.
//
// The contract:
//   writeProgress(...) → the rows appended to montree_progress_events
//                      → toProgressEvent() → replay()
//                      → THE SAME STATUS THE CACHE WAS GIVEN.

import { describe, it, expect } from 'vitest';
import { writeProgress } from '@/lib/montree/progress/write-progress';
import { toProgressEvent, rebuiltRowsFor } from '@/lib/montree/tracking/persistence';
import { replay } from '@/lib/montree/tracking/ledger';
import type { ProgressEvent } from '@/lib/montree/tracking/types';

type Call = { table: string; op: string; payload: unknown };

function fakeSupabase(seed: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      let op = 'select';
      let payload: unknown = null;
      const b: Record<string, unknown> = {
        select() { return b; }, eq() { return b; }, in() { return b; }, is() { return b; },
        gte() { return b; }, order() { return b; }, limit() { return b; }, maybeSingle() { return b; },
        insert(rows: unknown) { op = 'insert'; payload = rows; calls.push({ table, op, payload }); return b; },
        upsert(rows: unknown) { op = 'upsert'; payload = rows; calls.push({ table, op, payload }); return b; },
        update(row: unknown) { op = 'update'; payload = row; calls.push({ table, op, payload }); return b; },
        delete() { op = 'delete'; calls.push({ table, op, payload: null }); return b; },
        then(resolve: (v: { data: unknown; error: null }) => unknown) {
          if (op === 'upsert' || op === 'insert') {
            return Promise.resolve(resolve({ data: seed[`${table}:return`] ?? [], error: null }));
          }
          return Promise.resolve(resolve({ data: seed[table] ?? [], error: null }));
        },
      };
      return b;
    },
  };
  return { client: client as never, calls };
}

const CHILD  = '11111111-1111-1111-1111-111111111111';
const ROOM   = '22222222-2222-2222-2222-222222222222';
const SCHOOL = '33333333-3333-3333-3333-333333333333';
const WORK   = 't Dark Phonics work 3';
const KEY    = 'dp:t:3';

/** The journal as it stood before this write: the child climbed to `upTo`. */
function priorJournal(upTo: 'presented' | 'practicing' | 'mastered'): Record<string, unknown>[] {
  const ladder = ['presented', 'practicing', 'mastered'] as const;
  const days = ['2026-09-01', '2026-09-02', '2026-09-03'];
  const out: Record<string, unknown>[] = [];
  let prev: string | null = null;
  for (let i = 0; i < ladder.length; i++) {
    out.push({
      child_id: CHILD, classroom_id: ROOM, work_key: KEY, work_name: WORK, area: 'language',
      old_status: prev, new_status: ladder[i], source: 'teacher_update', actor: 't',
      created_at: `${days[i]}T02:00:00.000Z`, reason: null, evidence_id: null,
    });
    prev = ladder[i];
    if (ladder[i] === upTo) break;
  }
  return out;
}

function seedAt(status: string, prior: Record<string, unknown>[]) {
  return {
    montree_children: [{ id: CHILD, classroom_id: ROOM }],
    montree_classrooms: [{ id: ROOM, school_id: SCHOOL }],
    montree_child_progress: [{
      id: 'row-1', child_id: CHILD, work_name: WORK, status, area: 'language', work_key: KEY,
      classroom_id: ROOM, school_id: SCHOOL, notes: null,
      presented_at: '2026-09-01T02:00:00.000Z',
      mastered_at: status === 'mastered' ? '2026-09-03T02:00:00.000Z' : null,
    }],
    montree_classroom_curriculum_works: [],
    // The door's same-day pre-read reads this table too; prior rows are on earlier
    // days, so they never suppress today's write.
    montree_progress_events: prior,
    'montree_child_progress:return': [{ id: 'row-1', child_id: CHILD, work_name: WORK, status }],
  };
}

const journalled = (calls: Call[]) =>
  calls
    .filter((c) => c.table === 'montree_progress_events' && c.op === 'insert')
    .flatMap((c) => c.payload as Record<string, unknown>[]);

/** Rule 3, in one function: what does the journal say this child's rung is? */
function derivedStatus(rows: Record<string, unknown>[]): string {
  const events: ProgressEvent[] = rows.map(toProgressEvent);
  return replay(events).state.current.get(CHILD)?.get(KEY) ?? 'not_started';
}

describe('rule 3 — every write round-trips: journal → replay → the cached status', () => {
  it('a forward tap round-trips', async () => {
    const prior = priorJournal('presented');
    const { client, calls } = fakeSupabase(seedAt('presented', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'tap', classroomId: ROOM,
    });
    expect(r.outcome).toBe('written');
    expect(derivedStatus([...prior, ...journalled(calls)])).toBe(r.status);
  });

  it('a correction WITH a reason round-trips', async () => {
    const prior = priorJournal('mastered');
    const { client, calls } = fakeSupabase(seedAt('mastered', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'correction', allowDowngrade: true, reason: 'tagged the wrong child on Tuesday',
    });
    expect(r.outcome).toBe('written');
    expect(derivedStatus([...prior, ...journalled(calls)])).toBe('practicing');
  });

  // ── THE THREE THAT FAIL TODAY ───────────────────────────────────────────────
  // Each is a real, shipped caller. The door ACCEPTS the downgrade (it builds its
  // in-memory engine event with source 'correction' and a synthesised reason,
  // write-progress.ts:702-712) but JOURNALS the caller's raw source and a null
  // reason (write-progress.ts:874-877), so replay refuses the row.
  it.each([
    // app/api/montree/progress/update/route.ts:126-135 — the teacher P/P/M picker
    // (ShelfView, photo-audit, WeeklyWrapTab, voice-onboarding, TeachGuruWorkModal).
    ['progress/update',              { source: 'teacher_update', allowDowngrade: true }],
    // app/api/montree/intelligence/evidence/route.ts:179-187 — revoke_mastery.
    ['intelligence/evidence revoke', { source: 'correction',     allowDowngrade: true }],
    // lib/montree/guru/tool-executor.ts:198-206 — correcting_downward: true.
    ['guru correcting_downward',     { source: 'guru',           allowDowngrade: true }],
  ] as const)('a downgrade from %s round-trips', async (_label, entry) => {
    const prior = priorJournal('mastered');
    const { client, calls } = fakeSupabase(seedAt('mastered', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      classroomId: ROOM, ...entry,
    });

    expect(r.outcome).toBe('written');
    expect(r.status).toBe('practicing');

    const rows = journalled(calls);
    // Rule 4 as a property of the ROW, not of the caller's intent: a row that
    // lowered the rung must be readable back as a correction with a reason.
    const change = rows.find((x) => x.old_status !== x.new_status)!;
    expect(change, 'the downgrade must be journalled at all').toBeTruthy();
    expect(change.source, 'rule 4: a downgrade is journalled as source correction').toBe('correction');
    expect(String(change.reason ?? ''), 'rule 4: a correction carries its reason').not.toBe('');

    // And the whole point: the derived read agrees with the cache.
    expect(
      derivedStatus([...prior, ...rows]),
      'the ribbon, the weekly summary and the parent report all read this',
    ).toBe(r.status);
  });
});

describe('rule 3 — rebuild parity', () => {
  it('rebuiltRowsFor(journal) reproduces the status the door cached', async () => {
    const prior = priorJournal('mastered');
    const { client, calls } = fakeSupabase(seedAt('mastered', prior));
    const r = await writeProgress(client, {
      childId: CHILD, workName: WORK, area: 'language', status: 'practicing',
      source: 'teacher_update', allowDowngrade: true, classroomId: ROOM,
    });
    const rows = rebuiltRowsFor(CHILD, [...prior, ...journalled(calls)].map(toProgressEvent));
    // POST /api/montree/tracking/rebuild writes exactly these rows through the door.
    expect(rows.find((x) => x.work_key === KEY)?.status).toBe(r.status);
    // …and must not strip the stamp the door exists to guarantee (persistence.ts:456).
    expect(rows.find((x) => x.work_key === KEY)?.school_id).toBe(SCHOOL);
  });
});
```

**Two companions worth adding next to it** (cheap, no new deps):
* *Rebuild parity across implementations* — port 346's CTE to a fixture helper and assert
  it equals `rebuiltRowsFor` on the same journal (§3).
* *Source-vocabulary agreement* — for every legacy source string in the repo, assert
  `normaliseSource(toEngineSource(s)) === toEngineSource(s)`; today `'self_correction'`
  → `'correction'` on write and `'tap'` on read.

---

## Where I ended up disagreeing with the first audit

* **Overstated:** the SQL/JS rebuild divergence is real but **unreachable in production**
  (zero callers); rule 10 does **not** flag every pre-314 row (keyless rows are skipped);
  `tracking/health` is **not** CPU-bound; the apex host does **not** 403 today; the new
  tracker UI's downgrade path is **clean**.
* **Understated:** the correction defect has **three** caller shapes, not two; the class
  route is **29 s**, not 23.5 s, and the proposed one-line memo fixes only 45% of it; the
  timezone bug is worse for **west-of-UTC** schools than for Beijing; rule 10's check #2 is
  **one-directional**, so §1's deletions and §6a's dropped appends are undetectable by
  design.
* **Right, and I could not break it:** the cross-tenant merge, the un-replayable
  corrections, the non-transactional journal, the duplicate queue row, the batch-dropping
  queue insert, the shallow one-door guard, and the clean bill on
  `montree_child_progress`'s writer inventory.
