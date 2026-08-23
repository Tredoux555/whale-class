# AUDIT — All-Areas Reports + Paper-Scan Layout Learning
**Date:** Aug 23, 2026 · **Scope:** PLAN_ALL_AREAS_REPORTS_AUG22.md Phases 1–8, Agent A (paper-scan layouts) + Agent B (weekly-admin all-areas), integrated for the first time.

Verified on the working tree only — **nothing was committed**. Migration 336 is already applied in production as `montree_observation_sessions` (NOT the legacy `montree_work_sessions`); `period_reports` is enabled for the school; test classroom `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`.

---

## 1. Verification numbers

| Check | Result |
|---|---|
| Scoped `tsc` over every changed/new file (one combined temp tsconfig) | **37 errors, 0 in this build's files.** All 37 are pre-existing, on untouched lines in `curriculum-loader.ts`, `reports/{ai-generator,generator,token-service}.ts`, `platform/camera.ts`, `weekly-admin/doc-generator.ts`, `weekly-wrap/{route,send/route}.ts`, `weekly-admin-docs/{auto-fill,monthly-generate}/route.ts` (confirmed line-by-line against `git show HEAD:`). |
| Vitest — 8 new suites, run in an isolated container with `@/` alias shims | **102 passed / 102** (`paper-scan-sheet` 10, `paper-scan-layout` 16, `paper-scan-session-writer` 15, `period-aggregator` 20, `period-report-view` 15, `period-area-facts` 7, `monthly-all-areas-builder` 6, `weekly-summary-all-areas-builder` 13) |
| `npm run i18n:check:strict` | **12/12 locales pass**, 6103 keys each (was 6099 — +4 from this audit) |
| `npx eslint` over every changed dir | **0 errors**, 5 pre-existing warnings (4 unused style tokens in `WeeklyAdminTab.tsx`, 1 in `weekly-admin-docs/generate/route.ts`) |

`tsconfig.scoped.json` was blanked back to `{}` after use, per convention.

---

## 2. Ship status per phase

| Phase | Area | Status |
|---|---|---|
| 1 | Migration 336 (`montree_sheet_layouts`, extraction widening, `montree_observation_sessions`, `montree_period_reports`, `period_reports` flag) | **Ship.** Every column the aggregator and the commit route read exists exactly as queried. RLS-enabled-zero-policies posture matches 313/314/318. |
| 2 | Printable MT-STD-1 sheet (`sheet/print`, `sheet-template`, `sheet-works`) | **Ship.** Auth + `paper_scan` gate present, `qrcode@^1.5.4` is a real dependency, built-in profile's `template_code` === `SHEET_TEMPLATE_CODE`. |
| 3 | Layer 1 layout learning (`layout-learner/-resolver/-types`, `layouts/*`, 3 routes, `LayoutTeacher`) | **Ship.** Bucket `montree-media` is the same one Paper Scan already writes to. `maxDuration = 120` present on `learn`. Teaching photos are cleaned up on a failed insert. `layouts/[id]` GET is school-scoped (no feature gate — read-only, acceptable). |
| 4 | Layer 2 extraction (`extractor.ts` → `AI_MODEL`, frequency / time_bucket / concentration, template code) | **Ship.** Tool schema ↔ extract-route mapping ↔ PATCH route ↔ review UI agree field-for-field and null-for-null (see §4d). |
| 5 | Commit → `montree_observation_sessions` (`session-writer.ts`) | **Ship, one bug fixed** (§3.1). Idempotency via extraction-id pre-read + 23505 tolerance is correct — `ON CONFLICT` genuinely cannot infer 336's partial unique index. |
| 6 | Period aggregator + `/api/montree/reports/period` + dashboard page | **Ship.** Every source read degrades to a warning; the aggregate is always returned. |
| 7a/7b | Weekly/Monthly all-areas (`?areas=all`, `?engine=aggregator`, Sonnet drafters, WeeklyAdminTab toggles) | **Ship, one bug fixed** (§3.2), i18n completed (§3.3). Both branches are strict short-circuits — the default path is byte-identical to before. |
| 8 | Weekly Wrap uses `aggregatePeriod` for "what changed this week" | **Ship, one bug fixed** (§3.2). |

---

## 3. Bugs found and fixed

### 3.1 Paper-scan commit wrote to columns that do not exist on `montree_behavioral_observations`
**File:** `app/api/montree/paper-scan/[scanId]/commit/route.ts`

The note insert (copied verbatim from the voice-observation commit) wrote `content`, `observation_text`, `teacher_id`, `source`, `created_at`. **None of those columns exist.** The table (110_guru_tables.sql, + 154/176) is `behavior_description` (**NOT NULL**), `observed_by`, `observed_at`, `classroom_id`, `activity_during`, … — which is exactly the shape `observations/route.ts`, `guru/tool-executor.ts` and `guru/snap-identify` all write, and exactly what `period-aggregator.ts` reads back (`behavior_description, observed_at`).

Effect: every teacher note on a scanned sheet failed its insert (NOT NULL on `behavior_description`), the teacher saw `Observation failed for extraction …`, and the note therefore never reached the period report's notes column **nor** the Phase 8 `observations` feed into the teacher report. This is the exact break the Phase 8 wiring was built on top of.

Fixed to the canonical column set (`behavior_description` capped at 4000 like `guru/tool-executor`, `observed_by`, `observed_at`, `activity_during` = the work name).

### 3.2 `aggregatePeriod()` called without `utcOffsetHours` in all three new call sites
**Files:** `app/api/montree/reports/weekly-wrap/route.ts`, `app/api/montree/weekly-admin-docs/monthly-auto-fill/route.ts`, `lib/montree/weekly-admin/weekly-auto-fill-aggregator.ts`

`aggregatePeriod` turns an inclusive `YYYY-MM-DD` range into `timestamptz` filters for `created_at` / `observed_at` / `captured_at`. Left at its `0` default, a **+8 school loses the first eight hours of every Monday and gains the last eight of the previous Sunday** — so Weekly Wrap, the weekly/monthly admin docs and the period-report page disagreed about what "this week" contained. The period-report API route was the *only* caller passing the offset, and Phase 8's whole claim was that Weekly Wrap and the period-report page now agree.

Fixed by extracting the period route's private `schoolUtcOffset()` into a shared, reusable module and calling it from all four sites:

- **New:** `lib/montree/reports/school-timezone.ts` — `schoolUtcOffsetHours(supabase, schoolId)` + `DEFAULT_UTC_OFFSET_HOURS = 8`. Never throws; unknown/missing zone falls back to +8 (Whale Class).
- `app/api/montree/reports/period/route.ts` now imports it instead of carrying its own copy (behaviour identical).

### 3.3 Two `TODO(i18n)` hardcoded English strings in the new WeeklyAdminTab toggles
**Files:** `components/montree/reports/WeeklyAdminTab.tsx`, `scripts/weekly-admin-engine-i18n.mjs` (new), `lib/montree/i18n/*.ts` (12 files)

Added `scripts/weekly-admin-engine-i18n.mjs`, mirroring the idempotent `scripts/period-report-i18n.mjs` convention exactly (KEYS array + per-locale value arrays, anchored on `'weeklyAdmin.autoFillFailed'`, skips a file that already has the keys). It inserts four keys into all 12 locales:

`weeklyAdmin.engineLegacy`, `weeklyAdmin.engineAggregator`, `weeklyAdmin.areasLanguageOnly`, `weeklyAdmin.areasAll`

Model names (Haiku / Sonnet) are proper nouns and stay untranslated — they are the teacher's cost/latency signal. Both toggles now call `t()`; both `TODO(i18n)` comments are gone. Re-running the script is a clean no-op (verified). 6099 → 6103 keys, strict check green.

---

## 4. Integration audit — findings per checkpoint

**(a) commit route ↔ session-writer ↔ aggregator.** Agree end-to-end. `area` enum, `time_bucket` (`short|medium|long`), `concentration` (lower-cased `wd|wc|dc`), `frequency ≥ 1`. Bucket maths agree: `BUCKET_MINUTES = {short:10, medium:22, long:40}` is declared identically in `session-writer.ts` and `period-types.ts`, and the aggregator uses the **stored** `minutes_est` when present, so `× frequency` is never applied twice. `occurred_on` is `sheet_date ?? scan.created_at` and never "today at commit time" — a Friday sheet reviewed on Monday still lands on Friday. The `work_key → area_key` hop resolves against `montree_classroom_curriculum_areas.area_key`, whose values (099) are exactly the five enum strings.

**(b) Aggregator ↔ migration 336.** Every column in the `montree_observation_sessions` select (`child_id, work_key, work_name, area, occurred_on, frequency, time_bucket, minutes_est, concentration, status_mark`), plus the `classroom_id` filter and the `id` ordering, exists verbatim in 336. Checked the other five sources too: `montree_child_progress.{presented_at,mastered_at,updated_at,work_key}` (archive + 311), `montree_media.{classroom_id,captured_at,teacher_confirmed,identification_status,work_id}`, `montree_media_children.{media_id,child_id,id}` (050), `montree_paper_scan_extractions.classroom_id` (308) — all present.

**(c) Weekly Wrap.** `utcOffsetHours` was missing → fixed (§3.2). Response shape to the UI is unchanged: the aggregator's transitions are mapped back into the pre-existing `ProgressRecord` shape (`work_name/area/status/created_at`) before `analyzeWeeklyProgress`, and `sessions_by_area` / `observations` are new **optional** fields on `TeacherReportInput`. `week_start` is Monday-based everywhere (`week-key.ts`, `school-time.ts`), so `computePeriodBounds`'s Monday snap is a no-op.

**(d) Extractor ↔ extract route ↔ PATCH ↔ review UI.** Verified round-trip. Schema `required` lists all three new fields; the extract route's `buildExtractionRows` normalises them (and correctly writes `frequency/time_bucket/concentration: null` on the child-only "no entries" row). PATCH validates and, crucially, treats explicit `null` as "clear the field" for all three. The review UI's clear affordances (− past 1, tapping the selected pill) send exactly that `null`. UI caps frequency at 20, route at 99 — UI is the stricter one, no mismatch.

**(e) Layout routes auth + storage.** All three run `verifySchoolRequest`; `learn` and `[id]` PATCH also gate on `paper_scan`; the classroom is re-verified against `auth.schoolId` before any read. `PAPER_SCAN_BUCKET = 'montree-media'` is the same bucket `child-onboarding`, `photo-onboarding` and the paper-scan upload route use. Teaching photos go to `paper_scan_layouts/{schoolId}/{layoutId}/{n}.jpg` and are removed on a failed insert.

**(f) Page fetch paths ↔ route paths.** `/montree/dashboard/period-report` → `GET|POST /api/montree/reports/period` ✓. `LayoutTeacher` → `/api/montree/paper-scan/layouts`, `/layouts/learn`, `/layouts/{id}` ✓ (multipart deliberately bypasses `montreeApi` so the boundary survives; same-origin `fetch` still sends the auth cookie).

**(g) No server-only code in client components.** `period-report/page.tsx`, `paper-scan/page.tsx`, `LayoutTeacher.tsx` and `WeeklyAdminTab.tsx` import only pure modules (`period-types`, `period-report-view`, `layout-types`, `i18n`, `api`). No `period-aggregator`, `features/server`, `supabase-client`, `@/lib/ai/*` or `verify-request` anywhere in the client tree.

**(h) Both toggles hit routes whose params match.** `?engine=aggregator` is read by `auto-fill/route.ts`, and `buildAggregatorWeeklySuggestions` returns `{childId, childName, summaryEnglish, summaryChinese, planAreas, planAreasZh}` — field-for-field identical to the legacy branch, with plan keys in `AREA_ORDER` which matches the tab's own `AREAS` list. `?areas=language|all` is read by `monthly-auto-fill`, whose all-areas branch returns `{childId, childName, body}` — exactly what the tab consumes. `{mode: 'language'|'all'}` in the `monthly-generate` POST body drives `titleOverride` + filename only (`monthly-doc-generator` already had `titleOverride`).

---

## 5. Known limitations and remaining risks (report only — no code change)

1. **Voice-observation commit has the same broken observation insert.** `app/api/montree/voice-observation/[sessionId]/commit/route.ts` still writes `content` / `observation_text` / `teacher_id` / `created_at`. It is out of this build's scope, but it is the same bug as §3.1 and should get the same fix.
2. **Sonnet drafter token budget.** `draftMonthlyAllAreasParagraphs` and `draftWeeklySummaries` ask for the **whole classroom** in one 4000-token call. A 20-child class at ~200 words each will truncate; on truncation the drafters keep the deterministic fallback for every child that did not come back, so the failure is graceful but silent. Consider chunking to ~8 children per call.
3. **Concentration is counted per row, sessions per tally.** The aggregator does `sessions += frequency` but `concentration[code] += 1`. Defensible (one code per sheet entry) but the two numbers are not on the same scale in the UI.
4. **Menu row visibility for teachers with a saved menu config.** `period_reports` was enabled for the school *before* the `FEATURE_MENU_MAP` pair existed. `menu-sync` only writes on a flag transition, so a teacher whose `settings.menu` is already saved will not see the row until the flag is toggled **off then on** in the switchboard. Teachers with no saved menu config get it immediately from the legacy `isEnabled('period_reports')` branch in `DashboardHeader`.
5. **Cost.** The extractor moved from Haiku to `AI_MODEL` (Sonnet) at `max_tokens: 12000`, ~3–4× per scan — accepted in the plan's §11.2, but worth watching on the first real month.
6. **`utcOffsetHours` is a fixed offset, not a zone.** `tzOffsetHours()` resolves the offset *at call time*, so a report generated on one side of a DST change and refreshed on the other can shift by an hour. Irrelevant for Asia/Shanghai (no DST).
7. **`estimateMinutes` with an exact written time ignores frequency** (25 min × 3 tallies = 25, not 75). Documented in `session-writer.ts`; flagging it because the heatmap reads those minutes.

---

## 6. Manual test script for the teacher (Whale Class)

Run in this order. Stop at the first step that does not do what it says.

1. **Print.** Dashboard → **Paper Scan** → **Print sheet**. A4 landscape opens with the print dialog. Confirm the QR block top-right reads `MT-STD-1 · <date> · page 1/n`, and that each child's row has pre-printed works with a tally box, a time bubble (`<15 / 15–30 / 30+`) and a `wd / WC / DC` cell.
2. *(Optional, once)* **Teach Montree your own sheet.** Paper Scan → **Teach Montree your sheet** → upload 1–3 photos of a **blank or anonymised** sheet → review the profile it writes back → **Activate**. From then on every scan of this classroom is read with that profile. Skip this if you are using the printed MT-STD-1 sheet.
3. **Fill.** Use the sheet for one full work cycle. Mark tallies, tick one time bubble per entry, write a concentration code where you saw one, and add notes.
4. **Scan.** Paper Scan → photograph the sheet → wait for review. Expect Sonnet, ~20–40s.
5. **Review.** For each row check name, work, area, **tally**, **time bubble**, **concentration**. Correct anything wrong — the − button past 1 and tapping a selected pill both clear the field back to blank (blank is a valid answer). Then **Approve all matched** and fix the unmatched rows by hand.
6. **Commit.** Expect `progress_updated`, `observations_created` **> 0 if you wrote notes** (this is what §3.1 fixed) and `sessions_created` = the number of approved rows that had an area. Any row whose area could not be read comes back as a warning naming the work — that row records progress but no session, on purpose. The sheet photo is deleted at this point and is not recoverable.
7. **Period report.** Dashboard → More → **Weekly & Monthly Report**. Confirm the children × areas heatmap shows the sheet you just scanned, the child cards show your works and minutes, and the footer note about minutes being estimates is visible. Press **Recalculate** if you scanned after opening the page. If the menu row is missing, see risk #4 — toggle `period_reports` off and on in the Feature Switchboard.
8. **Weekly doc.** Reports → **Weekly Admin** → set the engine toggle to **All areas (Sonnet)** → **Auto-fill**. Compare against **Language + Haiku**: the all-areas run should mention areas the Language-only run cannot see. Save, then Generate.
9. **Monthly doc.** Same tab → Monthly → **All areas** → Auto-fill (it fires on the toggle itself) → Save → Generate. The download should be `WhaleClass_<Month>_All_Areas_Summary.docx` with the title "All Areas — Monthly Summary". Re-run with **Language only** and confirm the original `..._Language_Summary.docx` is byte-for-byte the document you had before this build.

---

## 7. Files to delete by hand

The sandbox cannot delete files. All four are inert; none is referenced by anything.

```
rm "app/api/montree/weekly-admin-docs/monthly-generate/route.orig.ts"
rm tsconfig.period-report.tmp.json     # 0 bytes
rm tsconfig.brandscope.tmp.json        # scratch, not from this build
rm tsconfig.scopedorig.json            # 3 bytes
rm testfile.tmp                        # 0 bytes
```

`tsconfig.scoped.json` has been blanked to `{}` and can stay.

---

## 8. Files changed by this audit

| File | Change |
|---|---|
| `app/api/montree/paper-scan/[scanId]/commit/route.ts` | §3.1 — observation insert uses the real columns |
| `app/api/montree/reports/weekly-wrap/route.ts` | §3.2 — passes `utcOffsetHours` |
| `app/api/montree/weekly-admin-docs/monthly-auto-fill/route.ts` | §3.2 — passes `utcOffsetHours` |
| `lib/montree/weekly-admin/weekly-auto-fill-aggregator.ts` | §3.2 — passes `utcOffsetHours` |
| `app/api/montree/reports/period/route.ts` | §3.2 — uses the shared helper instead of its own copy |
| `lib/montree/reports/school-timezone.ts` | **new** — `schoolUtcOffsetHours()` |
| `components/montree/reports/WeeklyAdminTab.tsx` | §3.3 — `t()` on both toggles, TODOs removed |
| `scripts/weekly-admin-engine-i18n.mjs` | **new** — idempotent 4-key inserter |
| `lib/montree/i18n/{en,zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` | §3.3 — +4 keys each |
| `tsconfig.scoped.json` | used for the scoped tsc, blanked back to `{}` |
