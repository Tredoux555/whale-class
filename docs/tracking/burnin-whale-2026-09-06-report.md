# Burn-in report — Whale Class, 2026-09-06

Input: `docs/tracking/burnin-whale-2026-09-06.json`, taken from the live classroom.
Reader under test: `lib/montree/tracking/resolve.ts` (`resolveWorkName`), the same
function the door, the photo audit, the AI matcher and the corrections route now call.
Law: `docs/tracking/TRACKING_CONSTITUTION.md`.

| | |
|---|---|
| Journal events with no `work_key` | **1,145** |
| Distinct legacy work names in them | **388** |
| Classroom curriculum works to match against | **651** |
| Children | 19 |
| Other invariant issues | 42 |

## 1. How the 388 names resolve

| Verdict | Names | Events |
|---|---:|---:|
| **exact** (normalised name, unique) | 374 | 1,122 |
| **alias** (parenthetical gloss / plural / punctuation, unique) | 2 | 2 |
| **resolved, total** | **376 (96.9%)** | **1,124 (98.2%)** |
| unknown — *ambiguous* (a tie; rule 5) | 5 | 13 |
| unknown — *no-match* (not in this curriculum) | 7 | 8 |

Zero names needed the fuzzy pass. The legacy spellings are not typos; they are the
curriculum's own names with the punctuation and glosses moved around.

### Resolved by alias (the resolver was improved to catch these)

| Legacy name | Curriculum work |
|---|---|
| `Command Cards` | `la_command_cards` — "Command Cards (Action Reading)" |
| `Color Box 2` | `se_color_box_2` — "Color Box 2 (Secondary Colors)" |

Both are the same shape: the classroom row carries a parenthetical gloss the teacher
does not type. The pre-burn-in reader had exact-then-fuzzy and nothing between, and
Jaro-Winkler on "color box 2" vs "color box 2 secondary colors" is 0.879 — below the
0.93 floor, and rightly so. The fix is not a looser fuzzy pass; it is a new
**alias pass** that compares *canonical forms* (§3).

### Genuinely unknown — 12 names, 21 events

**Ambiguous (5 names, 13 events)** — the classroom carries the name twice or more.
The reader refuses, correctly, and invariant `duplicate-work-name` names the culprits.

| Name | Rows it answers to |
|---|---|
| `Clock Work` (5 events) | `ma_clock`, `cu_clock` |
| `Calendar Work` (5) | `ma_calendar`, `cu_calendar` |
| `Montessori Bells` (1) | `se_bells`, `cu_bells`, `custom_cultural_1776219405178` |
| `Cylinder Block` (1) | `se_cylinder_block_1…4` |
| `Cylinder Blocks` (1) | `se_cylinder_block_1…4` |

The two Cylinder entries are the reader working exactly as intended: a teacher who
writes "Cylinder Block" has not said *which* block, and guessing block 1 would be a
fabricated observation. Migration 349 §8 renames the duplicate Clock/Calendar/Bells
rows so each is typeable from now on — but deliberately does **not** re-resolve the
historical rows (see §5).

**No match (7 names, 8 events)** — a real Montessori work this classroom's curriculum
does not contain. These belong in the review queue, and a teacher either picks the
right work or adds the missing one:

`Linear Counting 6` (2) · `Frog Life Cycle` · `Puzzle of the Flower` ·
`Number and Quantity Correspondence` · `Map of China` · `Peeling Practice` ·
`Pink Series Sentence Strips`

Near-misses worth noting, and why the reader is right to refuse each:
`Frog Life Cycle` is not `Plant Life Cycle` or `Animal Life Cycles`;
`Peeling Practice` is not `Peeling - Easy Items` or `Tweezing Practice`;
`Puzzle of the Flower` is not `Parts of a Flower`;
`Pink Series Sentence Strips` is a different material from `Pink Series (CVC Words)`.

Spellings the reader already handled and still does: `Moveable Alphabet`,
`Red Rods (Long Rods)`, `Brown Stair (Broad Stair)`, `Pink Series (CVC Words)`,
`Sound Games (I Spy)`, `Cylinder Block 1…4`, `Classified Cards (Nomenclature Cards)`.

## 2. What changed in the resolver

`lib/montree/tracking/resolve.ts` is now **the** name-reader (rule 6), with a
generic row type so every caller keeps its own shape, and a result that carries
`{ key, name, confidence, method, candidates? }` alongside the older
`{ kind, work, via }` fields.

1. **Alias pass (new, `method: 'alias'`)** — between exact and fuzzy. Compares
   *canonical forms*: lowercase, `&` spelled out, punctuation to spaces,
   British/house spellings folded (`moveable→movable`, `colour→color`, `grey→gray`,
   `practise→practice`), every word singularised by conservative rules, and then the
   same again with parenthetical glosses and `" - …"` suffixes removed — on **both**
   sides. Accepted only when it lands on exactly one work.
2. **Area as the one tie-breaker** — `opts.area`. `Clock Work` alone is a tie;
   `Clock Work` + `mathematics` is `ma_clock`. Nothing else breaks a tie; there is no
   first-registered-wins path left anywhere in the app.
3. **`literal` mode** — exact on case and whitespace only, no alias, no fuzzy. One
   caller uses it: the door's *static-catalog* fallback, because a work that exists
   only in the global catalog is not in this classroom (rule 1). This is what keeps
   the constitution's `"Blue Series blends" → queue` scenario true.
4. **Fuzzy compares canonical forms** too, so a plural or a stray comma is not spent
   from the 0.93 typo budget. Floor and margin unchanged.
5. **One Jaro-Winkler**, not two. `work-matching.ts` had a second implementation with
   a different transposition count; it now calls the reader's.

Tests: `tests/tracking/resolve-burnin.test.ts` — 82 real names → expected keys, the
12 refusals with their reason, the area tie-break, and **"no two resolvers disagree"**,
which pushes 400+ real inputs through every public entry point.

## 3. The other 42 issues

**33 × `status-without-event`.** All 33 are `custom_*` keys, all `practicing`, across
14 children. 14 of them are teacher-created *Dark Phonics* duplicates
(`custom_dark_phonics_work_3_sentence_building_…`) — works that already exist as
`dp:<letter>:<n>`, created because the custom name carries no letter and so never
parsed. Root cause: pre-engine bypass writers (the ten the audit found), not a live
one — `tests/progress/one-door.test.ts` passes, so nothing writes around the door
today. Fix: **migration 347 §4's journal backfill, still pending**. 349 does not
duplicate it; it is a status question, not a key question.

**2 × `cache-journal-drift`** — `pl_carrying_mat`, cached `presented` while the
journal replays `practicing`, for two children. A lost cache write; the journal is
ahead, so nothing is missing. Fix in **349 §9**: it calls
`montree_rebuild_child_progress()` for exactly those children, and *skips* any child
who still holds a status the journal cannot prove (a rebuild would erase it).

**3 × `duplicate-work-name`** — `montessori bells` (`se_bells`, `cu_bells`,
`custom_cultural_1776219405178`), `clock work` (`ma_clock`, `cu_clock`),
`calendar work` (`ma_calendar`, `cu_calendar`). Root cause: the curriculum seed copies
one work into two areas under one name, and a teacher hand-created a third Bells row.
Fix in **349 §8**: rename the non-primary copies (`Montessori Bells (Music)`,
`Clock Work (Time of Day)`, `Calendar Work (Months and Seasons)`,
`Montessori Bells (Classroom Copy)`). Nothing is deleted, no progress row moves.

**4 × `no-observation-10d`** — Henry and Stella (88 days), Raye and Winnie (15).
Not a data fault. It is the check doing its job; it belongs on the teacher dashboard.

## 4. Health output, made human

`no-key` was one violation per row: 1,145 identical lines for one classroom. It is now
**one line per distinct work name**, biggest first, carrying the row count, the child
count, up to five child ids, and the reader's verdict —

> `"Farm" — 16 keyless rows across 9 children; the name resolves to custom_farm_1773931138372 ("Farm", exact).`
> `"Clock Work" — 5 keyless rows across 5 children; the name does not resolve to exactly one work in this classroom (2 works answer to it).`

with the fix line saying either *"repairable in place — migration 349"* or *"not
repairable automatically (rule 5): review queue"*. 1,145 lines become 388, and the
first twenty are the whole story. Implemented as `groupKeyless()` in
`lib/montree/tracking/invariants.ts` (used by `checkInvariants` for journal rows and
by both API routes for cache rows); the health route's cap now applies to *names*, not
rows, and the overflow line counts the rows it stands for.

## 5. Migration 349

`migrations/349_progress_keys_backfill.sql`. Repairs `work_key` on **both**
`montree_progress_events` and `montree_child_progress`, in three passes (exact →
canonical → alias), each only when the classroom answers with exactly one work.
`montree_canonical_work_name()` / `montree_base_work_name()` are the SQL mirrors of
the reader's `canonicalName()`.

Verified on a scratch Postgres 16 seeded from the burn-in JSON — the SQL reproduces
the TypeScript reader exactly:

```
[349] montree_child_progress work_key repaired: 374 exact, 0 canonical, 2 alias (total 376)
[349] montree_progress_events work_key repaired: 1122 exact, 0 canonical, 2 alias (total 1124)
[349] 4 duplicate curriculum work name(s) disambiguated
[349] REMAINING: 21 journal event(s) over 12 distinct name(s); 12 cache row(s) still keyless
```

Runs 2 and 3 repair nothing. §8's renames deliberately do not unblock a later repair:
`montree_burnin_ambiguous_name()` keeps Clock/Calendar/Bells out of every pass for
ever, because nobody knows which shelf a 2026 "Clock Work" observation happened on.

Also repaired: the one-move-per-day guard. Two keyless events that resolve to the same
key on the same day would collide with 347 §3's unique index, so §7 demotes the later
ones to evidence rows (`old_status = new_status`) — which is what the ledger already
replays them as. Nothing is deleted (rule 11).

## 6. The 19 children, read as a teacher

**The summary lied to eighteen of nineteen parents.** Every child whose week had no
Dark Phonics or Writing Shelf tick got

> "*Name* continued with the Dark Phonics 's' book this week."

Fourteen of them have never had a single `s` event, and four of those
(Henry, Stella, Raye, Winnie) were flagged as unseen for 15–88 days. "Continued" is a
*fact about a week that did not happen* — rule 9 lets AI rephrase what the template
produces and never add to it, so the template must not invent it either (rule 11).

Fixed in `lib/montree/tracking/summary.ts`: the class-letter fallback now has two
branches. A child who **has** been presented at least one work of the class letter
still reads "continued with the Dark Phonics 's' book this week" (the constitution's
"Amir absent" case, and true). A child with **nothing** on that letter reads

> "*Name* has not started the Dark Phonics 's' book yet. Next week we will introduce 's' work 1."

which is honest, and is also the instruction the teacher needs. Tests updated in
`tests/tracking/simulated-term.test.ts` and `tests/readers/narrative-selection.test.ts`
(both directions asserted).

Everything else read correctly: Brilla's "did Dark Phonics 's' work 1 … starting to
recognise the characters and follow the story" is right for `dp:s:1` presented;
`plan` = "s Dark Phonics work 1" is the right next work for every child in the class;
`current` maps hold real works with real statuses; no child shows a later letter
mastered with an earlier one untouched; the four `no-observation` flags are the four
children who genuinely have not been seen.

One thing that *looks* wrong and is not: the ribbon shows `x` as `not-started` while
`f l j v w y z qu` are `coming`. `x` is the 27th and last letter of the Dark Phonics
order and its five books have been produced, while f–qu have not. That is a content
fact, not an engine bug — but it will read oddly to a teacher, and the ribbon may want
a "produced but out of order" affordance later.
