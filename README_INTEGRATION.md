# Montree Milestones — integration guide (D4)

Everything in this folder mirrors a real path in the Montree repo. Copy it in as-is, run one
migration, change three lines in one file, add the i18n keys, and turn the flag on for one
pilot school.

Public name: **Montree Milestones**. Internal feature key: `child_evaluation`. Child-facing
name for a sitting: **Discovery Time**. The words *test, exam, quiz, score, grade, mark, pass,
fail, wrong, percentile, rank, above/below average* must never appear on a child-, parent- or
teacher-facing surface — see `forbidden-terms.ts`, which is machine-checkable.

---

## 1. What goes where

```
migrations/314_montree_evaluation_system.sql          ← paste into the Supabase SQL editor
scripts/evaluation/merge-item-bank.mjs                ← regenerates the bank; run on bank changes
lib/montree/evaluation/
  item-bank.json          1.5 MB  THE single source of truth (426 items · 168 milestones · 241 stimuli)
  types.ts                        bank shape + DB row shapes + the tablet payload contract
  bank.ts                         loads and indexes the bank once per process
  scoring.ts                      pure scoring: bands, coverage, MAP, growth, cohort aggregation
  benchmark-map.ts                ELOF / EYFS / China-MoE crosswalk + say / never-say rules
  forbidden-terms.ts              banned vocabulary, EN + ZH
  constants.ts                    feature key, windows, thresholds, school-year helper
  montree-bridge.ts        ★      the ONLY file you edit — three lines (see §3)
  route-helpers.ts                auth → flag → child check → migration-pending, shared by every route
  session-service.ts              persistence + finalisation shared by /complete and /import
app/api/montree/evaluation/
  sessions/route.ts                       POST start / GET list
  sessions/[sessionId]/items/route.ts     POST batch submit / GET stored responses
  sessions/[sessionId]/complete/route.ts  POST finalise → bands, summary, narrative
  child/[childId]/report/route.ts         GET  Growth Story
  cohort/report/route.ts                  GET  Cohort Milestone Report (funder, aggregate only)
  import/route.ts                         POST tablet-export JSON → a stored check-in
_verify/                  the reproducible harness — see _verify/README.md
  prereq.sql                      stub Montree tables, so the migration can be run standalone
  tsconfig.json · tsconfig.emit.json · smoke.mjs
  fixtures/                       three tablet-export payloads for D2 and auditors
```

**Bank in this build: `1.1.0`, `sha256:e09c3f97…a6aa543e`.** Full value in §6.

No UI is included. This is the data and API layer; the teacher surface belongs under
`app/montree/dashboard/evaluation/` and is a separate piece of work.

---

## 2. Install, in order

1. **Run the migration.** Paste `migrations/314_montree_evaluation_system.sql` into the
   Supabase SQL editor in full. It is idempotent — safe to paste twice — and additive only.
   Verify:
   ```sql
   SELECT table_name FROM information_schema.tables
    WHERE table_name LIKE 'montree_evaluation%' ORDER BY table_name;   -- expect 4 rows
   SELECT feature_key, default_enabled FROM montree_feature_definitions
    WHERE feature_key = 'child_evaluation';                            -- expect false
   ```
2. **Copy the files** to the paths above.
3. **Do the merge step** in `montree-bridge.ts` (§3). Three lines.
4. **Add the i18n keys** (§7) in all 12 locales, or the pre-commit hook rejects the commit.
5. **Turn the flag on for ONE pilot school**: super-admin → Schools → ⚙️ Features →
   Montree Milestones. Or:
   ```sql
   INSERT INTO montree_school_features (school_id, feature_key, enabled)
   VALUES ('<school-uuid>', 'child_evaluation', true)
   ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;
   ```
6. **Runtime-audit before calling it done.** Lint and `tsc` are necessary and not sufficient
   here — the walk-through in §8 is the actual gate.

Nothing breaks before step 1: every route returns a friendly `503 { available:false,
migration_pending:true }` when the tables are absent, and `503 { available:false,
reason:'feature_off' }` when the flag is off. No 500s, ever, for either state.

---

## 3. The merge step — the only code you change

`lib/montree/evaluation/montree-bridge.ts` is the seam between this module and the repo. It
was written outside the repo and must typecheck standalone, so every Montree dependency
passes through this one file. Replace the three `notWired()` bodies:

```ts
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest as montreeVerify } from '@/lib/montree/verify-request';
import { isEnabled } from '@/lib/montree/features';

export function getSupabaseClient(): SupabaseLike { return getSupabase(); }

export async function verifySchoolRequest(request: Request): Promise<SchoolAuth | null> {
  const auth = await montreeVerify(request);          // adapt to whatever it actually returns
  if (!auth?.schoolId) return null;
  return { userId: auth.userId, schoolId: auth.schoolId, classroomId: auth.classroomId ?? null, role: auth.role };
}

export async function isFeatureEnabled(schoolId: string, featureKey: string): Promise<boolean> {
  return isEnabled(schoolId, featureKey);             // MUST fail closed on error
}
```

Exact paths and return shapes vary by repo revision — grep `verifySchoolRequest(` in
`app/api/montree/work-rhythm/route.ts` and copy whatever that route does.

`verifyChildBelongsToSchool()` is **already implemented** in the same file, against
`montree_children` with a `montree_classrooms` fallback for older rows that carry no
`school_id`. If the repo already exports its own, delete the local one and re-export the
repo's — the query is deliberately identical in effect.

### What the routes assume the caller has done

Every route in this module performs its own checks, in this order, before touching data:

| Step | Helper | Failure |
|---|---|---|
| 1 | `verifySchoolRequest()` | `401 { error:'unauthorized' }` |
| 2 | `isFeatureEnabled(schoolId, 'child_evaluation')` | `503 { available:false, reason:'feature_off' }` |
| 3 | `verifyChildBelongsToSchool()` on every `childId`; `verifyClassroomBelongsToSchool()` on every `classroomId` | `403` + a `[SECURITY]` log line |
| 4 | `assertSchemaReady()` — a zero-row probe of each target column before any write | `503 { migration_pending:true }` |

Step 3 is the hard rule from `CLAUDE.md`: RLS in this codebase is `USING (true)` and will not
stop a cross-tenant read on its own. Step 4 is the mechanical form of the migration-311
lesson — verify the target schema **before** the commit path runs, not after data is gone.
Every query is also filtered by `school_id` explicitly, in addition to the guard.

---

## 4. The scoring rules, in one place

From `ARCHITECTURE.md` §2, implemented in `scoring.ts` and verified by the smoke test:

```
coverage = administered evidence items / declared evidence items (for the session's form)
coverage < 0.5                        → "unassessed" — leaves every denominator
ratio    = points earned / points possible over the administered evidence
ratio ≥ 0.80                          → secure
0.40 ≤ ratio < 0.80                   → developing
ratio < 0.40                          → emerging

MAP% = round_to_5( 100 × met / expected_assessed )
  expected_assessed = expectation 'expected' AND at the child's own band AND not unassessed
  met               = band_final 'secure'
  exceeded          = band_final 'secure' on an 'extension' milestone (band above)
```

Suppression, all of it deliberate:

- `expected_assessed < 12` → **no percentage**, and the response says why in plain words.
- **EFL below A5 → always suppressed.** The n<12 rule already forces this (the bank carries
  6 expected EFL milestones at A3 and 8 at A4), but `EFL_MAP_ELIGIBLE_BANDS` states it
  explicitly so a future bank edit cannot silently start publishing an English percentage
  for a three-year-old.
- Per-domain figures below n=6 → a band chip only, never a number.
- Cohort figures below 12 children → nothing, and it says why.
- EFL MAP is computed and reported **separately** and is never merged into the core figure.
- `unassessed` counts are always returned. Selective reporting is a build defect.

`exceeded` counts only extension milestones declared at the child's **own** band — those are
the ones whose evidence sits in the band above. An extension milestone belonging to a younger
band (reading CVC words is an extension at A3) is ordinary at-band work for a four-year-old, and
counting it would inflate the figure with things the child did not exceed. Milestones from
another band that picked up evidence in the sitting are still kept in the record — nothing
administered is dropped — they simply never reach an at-band denominator.

**English-medium strands.** LCL-C (phonological awareness) and LCL-D (print & alphabet) carry
`englishMedium: true`: their rhymes, letters and printed words are English in the Roman alphabet.
They band exactly like any other strand and count normally toward the core figure. What changes
is the China-MoE crosswalk — see §10.

Growth directions, since a parent reads the totals: **moved_up** the band rose · **steady**
unchanged at developing or secure · **watching** the band fell, or is unchanged at emerging ·
**new** / **no_longer_assessed** assessed in only one of the two windows, reported not hidden.

Three things the server never does: trust a client's arithmetic (it re-scores every response
and stores the client's number only as `client_points_awarded`); let a practice item move a
band (`form: 'P'` contributes 0 possible points); accept an override without a reason (the
API rejects it and a DB CHECK constraint backs that up).

**A note worth carrying into D1:** a direct-only A4 sitting yields `expected_assessed = 16` —
just above the reporting minimum. The observation checklist is what makes a profile
substantial; without it, roughly 29 of the child's at-band milestones stay `unassessed`.

---

## 5. Route reference

### `POST /api/montree/evaluation/sessions`
```jsonc
{ "childId":"uuid", "windowCode":"autumn", "schoolYear":"2026-2027",
  "ageMonths":52, "formCode":"A", "modules":["M-LIT","M-MATH","M-EFL"],
  "deliveryMode":"tablet", "assessmentLocale":"en" }
```
`ageMonths` is derived from the child's date of birth when omitted; `ageBand` from
`ageMonths`; `formCode` from the window (Autumn→A, Winter→B, Spring→A). Starting the same
check-in twice returns the same row with `resumed: true` — a teacher who taps start again
after a dropped connection resumes rather than forking the record.

`GET` the same path lists sessions, filtered by `childId`, `schoolYear`, `windowCode`,
`status`, `classroomId`.

### `POST /api/montree/evaluation/sessions/{id}/items`
```jsonc
{ "responses":[{ "itemId":"IT.LCL-C.A4.A.01", "optionIds":["o1"],
                 "latencyMs":4210, "replayCount":1, "administered":true }],
  "observations":[{ "milestoneId":"ATL-A.A4.1", "band":"developing", "note":"…" }] }
```
Batch, up to 500 records. Idempotent on `(session_id, item_id)`. Bands are **not** computed
here. Unknown item ids come back in `unknownItemIds` rather than failing the batch.

### `POST /api/montree/evaluation/sessions/{id}/complete`
```jsonc
{ "overrides":[{ "milestoneId":"COG-A.A4.2", "band":"developing", "reason":"required" }],
  "durationSeconds":840, "status":"completed", "childName":"Segina" }
```
Re-scores everything from stored raw evidence, writes one row per milestone, stamps the
session summary, and returns ready-made narrative sentences. `status:"abandoned"` still
scores and stores what was gathered — partial sittings are valid data. Idempotent: call it
again after a teacher edits an override or adds a late observation. Previously stored
overrides are re-applied automatically, so re-running never discards a teacher's judgement.

### `GET /api/montree/evaluation/child/{childId}/report?schoolYear=&windowCode=`
The Growth Story: growth headline first, MAP second, per-domain chips, the full milestone
list with its statements and band descriptors, the history of every window, the read-only
classroom position from `montree_child_progress` + `montree_child_english_progress`, and the
method footer.

### `GET /api/montree/evaluation/cohort/report?schoolYear=&windowCode=&classroomId=&compareWindow=`
Aggregate only — **no child ids and no child names, ever**. Carries the mandatory
transparency block (unassessed, overrides, abandoned sittings, observation-only sittings,
children whose own figure was suppressed) and the method statement with the attributions.

Also returns `chinaMoeCrosswalk`: the same cohort viewed through the China-MoE appendix, with
the EFL track and the English-medium literacy strands removed from **both** the numerator and
the denominator and listed under `excludedByDesign` with the reason. See §10.

### `POST /api/montree/evaluation/import` — the tablet path
```jsonc
{ "childId":"uuid", "payload": { /* the file montree-milestones.html downloaded */ },
  "acceptBankDrift": false }
```

---

## 6. Tablet export → import flow

### The bank the server will accept

```
bankVersion   1.1.0
bankChecksum  sha256:e09c3f9787cdeff6f7daf15741b62ed5a74a3d6aa38011e29e79d670a6aa543e
```

A tablet build must embed **this** value and echo it back in `payload.bankChecksum` for the
import to pass without a warning. Confirm what the server holds at any time with:

```bash
node -e "console.log(require('./lib/montree/evaluation/item-bank.json').bankChecksum)"
node scripts/evaluation/merge-item-bank.mjs --check
```

> **Two different checksums exist and they are not interchangeable.** The authored bank folder
> also carries `BANK_CHECKSUM.txt` (`1.1.0 sha256:3e0e509c…`), which hashes the five authored
> *files*. The value above hashes the *merged* bank — canonicalised, with the volatile
> `mergedAt` excluded. Only the merged value is ever stored on a session row or compared at
> import. Publishing the authored one as "the" bank checksum is what made an earlier audit
> find that every real import 409'd; if a document or a tablet build quotes `3e0e509c…`, it is
> quoting the wrong number.

1. A teacher runs a check-in on the standalone `montree-milestones.html` — offline, no login,
   USB stick or double-click.
2. On the Results screen (teacher-only, behind a long-press) they tap **Download JSON**.
3. In Montree they open the import surface, pick the child from their own roster, and upload
   the file. The tablet has no Montree child id, so `childId` comes from that picker and
   `payload.session.childRef` is stored only as a label in `notes`.
4. The server re-scores everything from **its own** bank, writes the responses, and finalises
   the session in one call.

Guards, and why each exists:

| Guard | Behaviour |
|---|---|
| `payload.demo === true` | **Refused.** Demo data must never reach a real child's record. |
| Major bank-version mismatch | **Refused** `400`. The wording a child was checked against must match the wording the report cites. |
| Checksum mismatch, same major | `409` explaining the drift; re-send with `acceptBankDrift:true` to proceed. Both checksums are stored on the session. |
| Practice items in the payload | Dropped, and counted in `imported.practiceItemsIgnored`. |
| Unknown item or milestone ids | Reported in the response, never silently swallowed. |
| Re-importing the same file | Updates the same session (unique on child + year + window + mode) — no duplicate check-in. |

### Handling `409 bank_checksum_mismatch`

```jsonc
{ "error": "bank_checksum_mismatch",
  "detail": { "clientVersion":"1.1.0", "clientChecksum":"sha256:…",
              "serverVersion":"1.1.0", "serverChecksum":"sha256:e09c3f97…",
              "versionMatches": true, "checksumMatches": false, "message": "…" } }
```

The major versions agree, so the wording is compatible enough to import — but the two banks are
not byte-identical, and the server says so rather than filing the check-in quietly. Remediate in
this order:

1. **Compare the two values in `detail`.** If `clientChecksum` is the authored-file checksum
   (`3e0e509c…`), the tablet build is publishing the wrong number — fix the build to embed the
   merged bank's `bankChecksum`. That is a D2 build fix, not something to override per import.
2. **If `clientVersion` is older**, re-export from an up-to-date tablet build. Nothing is lost:
   the check-in is still on the tablet until it imports.
3. **Only when neither applies** — a genuine, understood divergence you have decided to accept —
   re-send the same body with `"acceptBankDrift": true`. The import proceeds and BOTH checksums
   are stored on the session (`bank_checksum` = the server's, `client_bank_checksum` = the
   tablet's), so the divergence is auditable forever rather than invisible.

Never set `acceptBankDrift: true` as a default in client code. If it fires on every import the
field stops meaning anything, which is exactly the failure mode it exists to prevent.

Paper packs (D3) enter the same way: create the session with `deliveryMode:"paper"`, type the
transfer block from the scoring sheet through `/items`, then `/complete`. A paper check-in and
a tablet check-in can coexist in one window; they are separate rows by design.

---

## 7. i18n keys to add (12 locales)

Teacher-facing UI strings only. Child prompts and milestone statements come from the bank and
are **not** i18n keys. `en` and `zh-CN` are given; the other ten (es/de/fr/pt/nl/it/ja/ko/uk/ru)
need real translations before the pre-commit hook will pass — English fallbacks are acceptable
as a first pass only if the hook is satisfied.

| Key | `en` | `zh-CN` |
|---|---|---|
| `milestones.title` | Montree Milestones | 萌树成长里程 |
| `milestones.checkIn` | Check-in | 成长记录 |
| `milestones.checkIns` | Check-ins | 成长记录 |
| `milestones.childFacingName` | Discovery Time | 探索时光 |
| `milestones.window.autumn` | Autumn | 秋季 |
| `milestones.window.winter` | Winter | 冬季 |
| `milestones.window.spring` | Spring | 春季 |
| `milestones.band.emerging` | Emerging | 萌芽 |
| `milestones.band.developing` | Developing | 发展中 |
| `milestones.band.secure` | Secure | 稳固 |
| `milestones.band.unassessed` | Not looked at yet | 本次未观察 |
| `milestones.track.core` | Development | 全面发展 |
| `milestones.track.efl` | English | 英语 |
| `milestones.growth.movedUp` | Moved up a band | 上升一档 |
| `milestones.growth.steady` | Holding steady | 保持稳定 |
| `milestones.growth.watching` | We are watching | 持续关注 |
| `milestones.growth.new` | Newly looked at | 本次新增观察 |
| `milestones.profile.title` | Milestone profile | 里程概览 |
| `milestones.profile.suppressed` | Too few milestones for a percentage — the full list is below | 观察项过少，不显示百分比，完整清单见下 |
| `milestones.profile.outOf` | of {n} milestones | 共 {n} 项 |
| `milestones.exceeded` | Secured from the next age band | 已达到下一年龄段 |
| `milestones.unassessed.count` | {n} not looked at this time | 本次有 {n} 项未观察 |
| `milestones.override.action` | Change this band | 调整此评定 |
| `milestones.override.reason` | Why are you changing it? | 调整原因 |
| `milestones.override.required` | Please give a reason | 请填写调整原因 |
| `milestones.override.badge` | Teacher judgement | 教师判断 |
| `milestones.observation.title` | Observation checklist | 观察记录表 |
| `milestones.observation.guidance` | Rate from what you have seen in the work cycle. Best fit, not a checklist. | 请根据工作周期中的观察进行评定，选择最贴近的一档。 |
| `milestones.observation.note` | Evidence note (optional) | 观察补充（选填） |
| `milestones.session.start` | Start a check-in | 开始记录 |
| `milestones.session.resume` | Resume check-in | 继续记录 |
| `milestones.session.finish` | Finish | 完成 |
| `milestones.session.pause` | Take a break | 休息一下 |
| `milestones.session.partial` | Part-finished check-ins still count | 未完成的记录同样有效 |
| `milestones.import.title` | Import from the tablet | 从平板导入 |
| `milestones.import.pickChild` | Which child is this check-in for? | 这份记录属于哪位孩子？ |
| `milestones.import.demoRefused` | This file was made in Demo mode and was not imported | 该文件为演示模式生成，未导入 |
| `milestones.import.bankDrift` | This file came from an older milestone set | 该文件来自较早版本的里程清单 |
| `milestones.report.growthStory` | Growth Story | 成长故事 |
| `milestones.report.cohort` | Cohort Milestone Report | 班级里程报告 |
| `milestones.report.method` | How this was put together | 记录方法说明 |
| `milestones.report.caveat` | These are classroom check-ins, not a standardised measure | 这是课堂内的成长记录，并非标准化测量 |
| `milestones.empty` | No check-in yet | 尚无记录 |
| `milestones.unavailable` | Montree Milestones is not switched on for this school | 本校尚未开启萌树成长里程 |
| `milestones.migrationPending` | Almost ready — one setup step is still outstanding | 即将就绪，还有一项设置未完成 |

Chinese wording note: `分数`/`成绩`/`考试` are on the banned list, so the Chinese strings use
成长记录 (growth record) and 观察 (observation) throughout — never 测评 or 考核.

---

## 8. Runtime audit — the actual gate

There is no test framework in this repo, so walk it by hand on the pilot school:

1. Flag **off** → `GET /api/montree/evaluation/sessions` returns `503 { available:false,
   reason:'feature_off' }`. Not a 404, not a 500.
2. Flag **on**, migration **not** run → the same route returns `503 { migration_pending:true }`.
3. Start a check-in for a real child → a row appears in `montree_evaluation_sessions` with
   `school_id`, `classroom_id` and `bank_checksum` populated.
4. Start it **again** with the same window → the same `id` comes back with `resumed:true`.
5. Post a batch of responses twice → `montree_evaluation_item_responses` holds one row per
   item, not two.
6. Post a response with a deliberately wrong `pointsAwarded` → the stored `points_awarded` is
   the server's number, `client_points_awarded` keeps the client's, and the response reports
   `clientScoreDisagreements: 1`.
7. Complete → milestone rows land, `summary_json` carries both MAP objects with their
   suppression reasons, and the narrative sentences read like sentences.
8. Complete a sitting with only two milestones → `map_percent` is `NULL`, `map_suppressed` is
   true, and the reason names the threshold.
9. Complete at A4 with the whole English module correct → `efl_map_percent` is `NULL` and the
   reason explains the age band, not the n.
10. **Cross-tenant probe** — call `/child/{childId}/report` with a child id from another
    school. Expect `403` and a `[SECURITY]` line in the Railway log. This one is not optional.
11. Cohort report on a class of fewer than 12 → every percentage is `null`, each with a reason,
    and the transparency block is still populated.
12. Import a tablet file exported in Demo mode → `400 demo_export_refused`.

---

## 9. Regenerating the bank

`item-bank.json` is merged from the five authored files. After any content change:

```bash
node scripts/evaluation/merge-item-bank.mjs                    # auto-discovers the authored bank
node scripts/evaluation/merge-item-bank.mjs <authored-bank-dir>
node scripts/evaluation/merge-item-bank.mjs --src <dir>
MONTREE_ITEM_BANK_SRC=<dir> node scripts/evaluation/merge-item-bank.mjs
node scripts/evaluation/merge-item-bank.mjs --check            # CI gate: exit 1 if stale
```

Path resolution is anchored to the script's own location, not the caller's cwd, and needs no
symlink. With no argument it searches the candidate locations listed in its header and, failing
that, prints every path it tried. `--check` prints both the on-disk and the recomputed
version/checksum so a stale file is obvious.

Bump `bankVersion` on **any** content change — the checksum is recorded on every session row,
so a report can always be traced to the exact wording a child was checked against. The tablet
app (D2) and the paper generator (D3) embed the same file; nothing holds its own copy of item
content. Old sessions keep their old `bank_version`/`bank_checksum` and are never re-scored
against new wording.

---

## 10. Deliberate decisions, so nobody "fixes" them

- **Migration 034's `assessment_sessions` / `assessment_results` is superseded, not dropped.**
  314 says so in its header. Confirm 034 holds no production rows before removing it.
- **`montree_child_progress` and `montree_child_english_progress` are read-only here.** The
  report shows the classroom's own position beside the check-in; it never writes to either.
- **Nothing is ever deleted.** No media is stored by this module, so the delete-after-commit
  hazard from migration 311 cannot recur. Responses are append-and-correct only.
- **RLS is on with `USING (true)`** to match house style and keep the Supabase Advisor quiet.
  It is not the security boundary; the API layer is.
- **`M-FOCUS` items evidence no milestone.** The optional Focus Games module is stored for
  telemetry and never enters a band or a denominator. That is by design, not an oversight.
- **The tablet ships EN + ZH only.** The in-Montree surface must supply all 12 Montree locales.
- **The China-MoE crosswalk is deliberately partial, and the gap is a finding.** 48 of 168
  milestones carry no MoE code: the 36 EFL milestones and the 12 English-medium core-literacy
  milestones (LCL-C, LCL-D). 语言.阅读与书写准备 describes readiness for *Chinese* literacy, and
  English rhyme, English letter-sounds and Roman-alphabet print do not speak to it. Every
  consumer must exclude them from the denominator and print the reason —
  `chinaMoeApplicable`, `buildChinaMoeCrosswalkTable()` and `CHINA_MOE_SCOPE_NOTE` in
  `benchmark-map.ts` do this. In-scope coverage is **120 of 120**, complete; quoting "120 of
  168" invents a 48-milestone gap that does not exist. A school teaching in another language
  should leave LCL-C and LCL-D unassessed rather than administer them in translation, and use
  the EFL track for the child's English letters and sounds.
- **The merged bank deliberately omits some authored top-level keys.** `notes`,
  `internalFields`, `taughtLetters`, `heartWords` and the strand-level `constructTags` index
  are authoring metadata; the runtime reads `englishMedium`, `constructTag` and `decodableWord`
  off the individual records instead. Adding one changes `bankChecksum`, which every stored
  session references, so promote a key only alongside a `bankVersion` bump. They are typed as
  optional on `ItemBank`, and the merge script warns loudly about any *new* authored key so one
  can never be dropped silently. See `merge-item-bank.mjs → KNOWN_TOP_LEVEL`.
- **`items[].distractors[].rationale` is internal.** The bank lists it in its own
  `internalFields` and every entry is `internalOnly: true`. It is for item review and the D1
  appendix — never render it to a teacher mid-sitting, because telling an adult what a
  distractor is designed to catch invites coaching.
- **No LLM is used anywhere in this module.** Every band is deterministic and reproducible from
  the bank. If narrative generation is added later, pin `temperature: 0` — durable per-child
  text is subject to the standing determinism rule.

---

## 11. Verification performed on this build

Bank `1.1.0` / `sha256:e09c3f97…a6aa543e`. Every row is reproducible from `_verify/` — see
`_verify/README.md` for the exact commands.

| Check | Result |
|---|---|
| `tsc --noEmit`, strict, over all 15 TS files (9 in `lib/`, 6 in `app/`) | **0 errors** |
| `tsc -p _verify/tsconfig.emit.json` (the smoke-test build) | **exit 0** on TypeScript 6.0.3 |
| Scoring smoke test (`node _verify/smoke.mjs`, 121 assertions) | **121 passed, 0 failed** |
| Item bank current with the authored sources (`merge-item-bank.mjs --check`) | **up to date**, `1.1.0 sha256:e09c3f97…` |
| Bank path resolution — positional, `--src`, `MONTREE_ITEM_BANK_SRC`, auto-discovery, arbitrary cwd | all four resolve; no symlink needed; bad path fails with the paths it tried |
| Migration against a live PostgreSQL 16 cluster with `_verify/prereq.sql`, `ON_ERROR_STOP=1` | **exit 0**, 0 errors |
| Same migration run a second time (idempotency) | **exit 0**, 0 errors, only "already exists, skipping" notices |
| Schema created | 4 tables · 19 indexes · 2 triggers · RLS on all 4 with named policies · 4 table comments · `child_evaluation` seeded `default_enabled=false` |
| CHECK constraints exercised with real rows | override-without-reason rejected · duplicate window rejected · paper-in-same-window allowed · age 120 months rejected |
| China-MoE scope | 48 milestones excluded by design (36 EFL + 12 English-medium), each with a printed reason; in-scope coverage 120/120, 0 missing |
| Tablet-export fixtures | all three score or refuse as intended; the happy-path fixture imports with `checksumMatches: true` and 0 client/server point disagreements |
| Forbidden-vocabulary scan over the whole shipped bank | 168 statements + 252 band descriptors + 426 item prompts and teacher scripts — **clean** |

### Fixed during this pass

- **`exceeded` counted extension milestones from other bands.** An A4 child scored `exceeded: 3`
  where the true figure was 1, because two A3-band extension milestones were satisfied by the
  child's ordinary at-band items. `computeMAP` now scopes `exceeded` to the child's own band.
  Caught by the extension-evidence assertions in `_verify/smoke.mjs` §16.
- **Merge-script path resolution** no longer depends on cwd or a symlink (§9).
- **`_verify/prereq.sql` now ships**, and `tsconfig.emit.json` no longer trips TS 6's
  `moduleResolution` deprecation — the documented recipe runs as written.
