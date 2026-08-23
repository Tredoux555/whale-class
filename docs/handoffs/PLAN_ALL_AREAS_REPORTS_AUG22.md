# PLAN — All-Areas Visual Reports + Two-Layer Sonnet Sheet Reading (Aug 22, 2026)

Owner: Tredoux (Whale Class, 稻香湖幼儿园). Architect plan; each phase is sized for one implementation agent. File paths are repo-relative. Line numbers cite the code as of 2026-08-22.

---

## 1. Goal & principles

1. **Visual first.** The primary output is a weekly/monthly one-pager per classroom: a children × 5-area heatmap plus a card per child. A teacher should glance and see (a) where each child spends time, (b) how their status moved. Text is optional garnish (≤20 words per child).
2. **All five areas**, always: `practical_life, sensorial, mathematics, language, cultural` (the canonical keys in `lib/montree/paper-scan/extractor.ts:23` and `montree_classroom_curriculum_areas.area_key`). Nothing new is Language-only.
3. **Frequency + rough time, not minutes.** The unit of record becomes a *work session*: child × work × day, with `time_bucket ∈ {short (<15), medium (15–30), long (30+)}` and an optional concentration code. Exact `time_minutes` stays as an optional field but is never required. Estimated minutes for charts = bucket midpoint (10 / 22 / 40).
4. **Two-layer Sonnet reading.** Layer 1 learns a sheet *layout profile* once per classroom (any school's sheet, or the Montree Standard). Layer 2 extracts each photographed sheet with that profile injected. Both use `AI_MODEL` (`claude-sonnet-4-6`, `lib/ai/anthropic.ts:13`), `temperature: 0`, forced tool use — the house rule stated at `extractor.ts:13-15`.
5. **Docx/PPTX are derived views** of the same aggregated data (`period-aggregator.ts`), not separate pipelines.
6. **Teacher approval gate unchanged.** Nothing reaches a child's record without the existing review → commit flow.

---

## 2. Data model changes

Next free migration number: **336** (`migrations/` currently ends at `335_potato_scenes.sql`). Hand-applied SQL, idempotent, service-role-only RLS per the 313/314 posture (`ENABLE ROW LEVEL SECURITY`, zero policies).

### Decision summary
- **New `montree_sheet_layouts`** — learned layout profile per classroom (or school-wide). JSONB profile + version + status. Justification: the profile is a reusable prompt artefact, not per-scan data; `montree_paper_scans.format_description` (308) is per-scan free text and cannot be injected reliably.
- **New `montree_observation_sessions`** (named *observation* sessions because a legacy `montree_work_sessions` table from migration 060 already exists in production with a different shape) — the frequency/time fact table. Justification: `montree_progress_events` (314) is a *status-change* journal and must stay that way (a child practising the same work 4 days running produces zero events). `montree_child_progress` is current-state only. `montree_paper_scan_extractions` is a staging table whose rows carry review state and are logically pre-commit. Work Rhythm (`app/api/montree/work-rhythm/route.ts:199-221`) reads extractions directly *because nothing else existed*; sessions fix that properly and also allow photo/voice/manual sources later.
- **Widen `montree_paper_scan_extractions`** with `frequency`, `time_bucket`, `concentration` (additive, nullable).
- **Add `montree_period_reports`** rather than widening `montree_weekly_reports`: the latter has `CHECK (report_type IN ('teacher','parent'))`, `week_start/week_end NOT NULL`, and a UNIQUE on `(child_id, week_start, report_type)` (`migrations/050_weekly_reports_media_system.sql:83-110`); monthly classroom-level snapshots don't fit and altering the CHECK on a production table used by weekly-wrap's upserts (`weekly-wrap/route.ts:588-600`) is needless risk. The new table caches the aggregator output + AI lines per classroom × period so the dashboard loads instantly and docx generation is deterministic.
- `montree_progress_events` is confirmed referenced by `lib/montree/progress/write-progress.ts:590` with a graceful warning at `:594` if the table is missing. **Whether 314 is applied in prod is unknown** — Phase 0 must verify (`select count(*) from montree_progress_events`) and apply 314 if not.

### `migrations/336_sheet_layouts_and_work_sessions.sql`

```sql
-- 336_sheet_layouts_and_work_sessions.sql — idempotent, safe to paste twice.

-- 1. Learned observation-sheet layout profiles (Layer 1)
CREATE TABLE IF NOT EXISTS montree_sheet_layouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        uuid NOT NULL,
  classroom_id     uuid,                      -- NULL = school-wide default
  name             text NOT NULL,             -- "Montree Standard v1", "Whale Class paper form"
  source           text NOT NULL DEFAULT 'learned'
                     CHECK (source IN ('builtin','learned','edited')),
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','active','retired')),
  version          int  NOT NULL DEFAULT 1,
  template_code    text,                      -- printed/QR code e.g. "MT-STD-1"; NULL for foreign sheets
  profile          jsonb NOT NULL,            -- SheetLayoutProfile (see §3)
  sample_paths     text[] NOT NULL DEFAULT '{}', -- storage paths of the 1-3 teaching photos (kept, unlike scan photos)
  model            text,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sheet_layouts_classroom ON montree_sheet_layouts (classroom_id, status);
CREATE INDEX IF NOT EXISTS idx_sheet_layouts_school    ON montree_sheet_layouts (school_id, status);
-- at most one ACTIVE profile per classroom
CREATE UNIQUE INDEX IF NOT EXISTS uq_sheet_layouts_active_classroom
  ON montree_sheet_layouts (classroom_id) WHERE status = 'active' AND classroom_id IS NOT NULL;
ALTER TABLE montree_sheet_layouts ENABLE ROW LEVEL SECURITY;

-- 2. Extraction staging: frequency / bucket / concentration (Layer 2)
ALTER TABLE montree_paper_scan_extractions ADD COLUMN IF NOT EXISTS frequency     int;   -- tally count on the sheet, NULL = not marked
ALTER TABLE montree_paper_scan_extractions ADD COLUMN IF NOT EXISTS time_bucket   text CHECK (time_bucket IS NULL OR time_bucket IN ('short','medium','long'));
ALTER TABLE montree_paper_scan_extractions ADD COLUMN IF NOT EXISTS concentration text CHECK (concentration IS NULL OR concentration IN ('wd','wc','dc'));
ALTER TABLE montree_paper_scans ADD COLUMN IF NOT EXISTS layout_id uuid;   -- profile used for this scan (NULL = generic)

-- 3. Observation sessions — the frequency/time fact table. One row = child did work on a day.
CREATE TABLE IF NOT EXISTS montree_observation_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      uuid NOT NULL,
  classroom_id   uuid NOT NULL,
  child_id       uuid NOT NULL,
  work_key       text,
  work_name      text NOT NULL,
  area           text NOT NULL CHECK (area IN ('practical_life','sensorial','mathematics','language','cultural')),
  occurred_on    date NOT NULL,
  frequency      int  NOT NULL DEFAULT 1 CHECK (frequency >= 1),   -- tally marks that day
  time_bucket    text CHECK (time_bucket IS NULL OR time_bucket IN ('short','medium','long')),
  minutes_est    int,                         -- bucket midpoint (10/22/40) × frequency, or exact minutes when written
  concentration  text CHECK (concentration IS NULL OR concentration IN ('wd','wc','dc')),
  status_mark    text CHECK (status_mark IS NULL OR status_mark IN ('presented','practicing','mastered')),
  source         text NOT NULL DEFAULT 'paper_scan',  -- paper_scan | photo | voice | manual
  scan_id        uuid,
  extraction_id  uuid,
  note           text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_observation_sessions_classroom_day ON montree_observation_sessions (classroom_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_observation_sessions_child_day     ON montree_observation_sessions (child_id, occurred_on DESC);
-- re-committing the same extraction must not double count
CREATE UNIQUE INDEX IF NOT EXISTS uq_observation_sessions_extraction ON montree_observation_sessions (extraction_id) WHERE extraction_id IS NOT NULL;
ALTER TABLE montree_observation_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Cached period reports (classroom × week|month), aggregator output + AI lines
CREATE TABLE IF NOT EXISTS montree_period_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL,
  classroom_id  uuid NOT NULL,
  period_type   text NOT NULL CHECK (period_type IN ('week','month')),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  data          jsonb NOT NULL,          -- PeriodAggregate (see §6)
  ai_lines      jsonb NOT NULL DEFAULT '{}', -- { child_id: "≤20-word line" }
  generated_at  timestamptz NOT NULL DEFAULT now(),
  generated_by  uuid,
  UNIQUE (classroom_id, period_type, period_start)
);
ALTER TABLE montree_period_reports ENABLE ROW LEVEL SECURITY;

-- 5. Feature flag (mirrors 327 column list; ON CONFLICT DO NOTHING like 308/325/327)
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES ('period_reports', 'Weekly & Monthly Report',
        'Visual one-pager per classroom: where each child spent time across the five areas and how their work moved.',
        'BarChart3', 'reports', false, false)
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO montree_migrations (filename) VALUES ('336_sheet_layouts_and_work_sessions.sql') ON CONFLICT DO NOTHING;
```

---

## 3. Layer 1 — Sheet layout learning

### Profile schema (`lib/montree/paper-scan/layout-types.ts`)
```ts
export interface SheetLayoutProfile {
  schema_version: 1;
  sheet_name: string;                 // what the teacher calls it
  orientation: 'portrait' | 'landscape';
  language: string[];                 // e.g. ['en','zh']
  unit: 'class_per_day' | 'child_per_week' | 'child_per_day' | 'other';
  header: { fields: Array<{ label: string; meaning: 'date'|'class'|'teacher'|'week'|'other'; position: string }> };
  structure: {
    kind: 'grid' | 'per_child_block' | 'journal' | 'checklist';
    child_locator: string;            // how to find a child: "name pre-printed in left column of each row"
    columns: Array<{ header_verbatim: string; meaning: 'work'|'area'|'status'|'time'|'tally'|'concentration'|'note'|'other'; area_key?: string }>;
    rows_per_child: number | 'variable';
    work_locator: string;             // "pre-printed work names in 3 slots per area; blank 4th slot is handwritten"
  };
  legend: {
    status_marks: Array<{ mark: string; status: 'presented'|'practicing'|'mastered' }>;  // "▷ one side" etc.
    time_marks: Array<{ mark: string; time_bucket?: 'short'|'medium'|'long'; minutes?: number }>;
    tally_convention: string | null;  // "each vertical stroke = one session; 5th stroke crosses"
    concentration_codes: Array<{ code: string; value: 'wd'|'wc'|'dc' }>;
    area_abbreviations: Record<string, string>;  // "PL" -> practical_life
    other_symbols: Array<{ mark: string; meaning: string }>;
  };
  machine_marks?: { fiducials: boolean; qr: boolean; template_code?: string };
  reading_instructions: string;       // 5-15 imperative sentences Sonnet wrote for its future self
  pitfalls: string[];                 // "handwritten Chinese notes in the Notes column are NOT work names"
}
```

### Routes
- `POST app/api/montree/paper-scan/layouts/learn/route.ts` — body: `{ classroom_id, name, photo_paths: string[] (1-3, already uploaded via existing upload route with `purpose=layout` form field, which skips extraction), notes?: string }`. Calls `learnSheetLayout()` in new `lib/montree/paper-scan/layout-learner.ts`: Sonnet (`AI_MODEL`), `temperature: 0`, images + prompt, forced tool `describe_sheet_layout` whose `input_schema` is the profile above. The prompt reuses the "transcriber not interpreter" stance from `extractor.ts:168-174` but asks for *layout* only — no child data is transcribed at this step (privacy: teaching photos may be blank sheets; if filled, the tool schema has no place for names). Inserts `montree_sheet_layouts` as `status='draft'`, stores `sample_paths`.
- `GET app/api/montree/paper-scan/layouts/route.ts?classroom_id=` — list profiles (builtin + classroom + school).
- `GET/PATCH/DELETE app/api/montree/paper-scan/layouts/[id]/route.ts` — PATCH accepts `{ status: 'active' }` (retires any other active for that classroom: update-then-insert inside one request; the partial unique index is the backstop), `{ profile }` edits (source→`'edited'`, version+1).
- Auth: `verifySchoolRequest` as in `commit/route.ts:32`; classroom must belong to `auth.schoolId`.

### Built-in default
`lib/montree/paper-scan/layouts/montree-standard-v1.ts` exports a hand-written `SheetLayoutProfile` for the sheet in §5 with `template_code: 'MT-STD-1'`. Resolution order in the extract route: `montree_paper_scans.layout_id` → active classroom profile → active school-wide profile → if QR/text on page matches `MT-STD-1` (Sonnet reports `detected_template_code` in the new tool) → builtin → **none = today's generic prompt, unchanged**.

### Prompt injection
`buildSheetExtractionPrompt()` (`extractor.ts:148`) gains `layout?: SheetLayoutProfile`. When present, append a block:
```
KNOWN SHEET LAYOUT — this classroom has taught Montree its sheet. Use it to locate fields and decode marks. If the page clearly does not match this layout, say so in format_description and fall back to reading it on its own terms.
<layout json: structure, legend, reading_instructions, pitfalls>
```
The generic legend paragraphs (triangle/letter/tick, AMI codes, area abbreviations, time) remain; the profile overrides them where it speaks.

### UI
`app/montree/dashboard/paper-scan/page.tsx` — add a "Teach Montree your sheet" card on the `home` state (`PageState` at `:22`): pick 1-3 photos → learn → show the returned profile as a readable summary (legend table + reading_instructions) with "Activate" / "Edit" / "Re-learn with another photo". Shows the active profile name in the upload header thereafter. Component: `components/montree/paper-scan/LayoutTeacher.tsx`.

---

## 4. Layer 2 — Extraction upgrade

File: `lib/montree/paper-scan/extractor.ts`.
1. `model: HAIKU_MODEL` (`:262`) → `AI_MODEL`. Return `model: AI_MODEL` (`:286`). Remove the Haiku import. Keep `temperature: 0`, `MAX_TOKENS` → 12000 (Sonnet is more verbose in notes; truncation already retried at `:291-295`).
2. `EXTRACTION_TOOL` entry schema (`:69-78`) adds:
   - `frequency: { type: ['integer','null'], description: 'Number of tally strokes / ticks / repeated marks for this work on this sheet. null if the sheet has no tally.' }`
   - `time_bucket: { type: ['string','null'], enum: ['short','medium','long', null], description: '<15 / 15-30 / 30+ minute bubble or equivalent. null when not marked.' }`
   - `concentration: { type: ['string','null'], enum: ['wd','wc','dc', null] }`
   - top-level `detected_template_code: { type: ['string','null'] }` and `layout_match: { type: 'string', enum: ['matches','partial','mismatch','no_profile'] }`.
   - Update the TIME paragraph (`:189`): buckets go to `time_bucket`, tallies to `frequency`; `time_minutes` only for exact written minutes/clock ranges. Update the AMI paragraph (`:184`): codes go to `concentration` *and* are no longer copied into note.
3. `types.ts`: extend `SheetEntry`, `PaperScanExtractionRow/Insert`, `PaperScanExtractionPatchBody` (`frequency`, `time_bucket`, `concentration`), `SheetExtraction` (`detected_template_code`, `layout_match`).
4. `extract/route.ts`: resolve layout (§3), pass to `extractSheet`, map new fields in `buildExtractionRows`, write `layout_id` on the scan. Comment at `:1-10` about the "ported verbatim" harness must be updated: add `scripts/paper-scan/eval-extraction.mjs` that runs the extractor against `evaluation-kit/` images and prints per-field accuracy (Phase 2 acceptance).
5. Review UI (`page.tsx` review state ~`:750+`) shows three compact controls per row: tally stepper, bucket segmented control (S/M/L), concentration chip; PATCH via `extraction/[extractionId]` (extend its allowed fields).
6. **Null-area fix** — `commit/route.ts:89` `area: ext.area || 'practical_life'`. Replace with: resolve area from `work_key` via `montree_classroom_curriculum_works → montree_classroom_curriculum_areas.area_key` (the same hop work-rhythm does at `:258-259`); if still null, **skip the progress write**, count as `skipped`, and push `Area unknown for extraction ${ext.id}` into `errors`. The review UI must flag rows with null area as "needs area" and block Commit until assigned (cheap: the row already has an area dropdown).
7. **Persist sessions at commit** — in the same loop, after the progress write (success or noop), insert into `montree_observation_sessions`: `occurred_on = scan.sheet_date ?? scan.created_at::date`, `frequency = ext.frequency ?? 1`, `time_bucket`, `minutes_est = ext.time_minutes ?? BUCKET_MID[time_bucket] * frequency ?? null`, `concentration`, `status_mark = finalStatus`, `scan_id`, `extraction_id`, `note`. Needs `created_at, sheet_date` added to the scan select at `:35`. Use `upsert(..., { onConflict: 'extraction_id', ignoreDuplicates: true })`. Response gains `sessions_created`.
8. Helper `lib/montree/paper-scan/session-writer.ts` exporting `BUCKET_MINUTES = { short: 10, medium: 22, long: 40 }` and `buildSessionRow()` (pure, unit-tested).

---

## 5. Montree Standard Observation Sheet v1

**Decision: one A4 *landscape* sheet per classroom per day, per-child rows × five area-coloured column groups.** Reasons: (a) a teacher scanning the room writes against a *name*, so rows = children is the fastest lookup; (b) area columns make "where is time going" visible on paper itself; (c) a regular grid is the easiest thing for vision to read and for a layout profile to describe; (d) 19 children fits at ~12 mm row height; >16 children splits alphabetically across 2 pages (same conclusion as `PLAN_CELLPHONELESS_CLASSROOMS_JUL30.md:56`). The per-child block design in `docs/oversight-pack-aug01/observation-sheet.html` is retained as the *weekly per-child* variant for a later phase.

### Per-child row, per area cell
Each area cell (≈50 mm wide) contains:
- up to **2 pre-printed current works** (the child's `practicing` works in that area, else most recent `presented`), each with a ▷ triangle (mark 1 side / 2 sides / fill = P / Pr / M) and a **tally box** (`| | | |`, freeform strokes),
- one **blank work slot** (boxed, 8 mm high) for an unplanned work, with its own ▷ and tally box,
- a **time-bubble trio** `○<15 ○15-30 ○30+` for the area as a whole,
- a **concentration trio** `○wd ○WC ○DC`.
Right column: one free-text line per child (10 mm). Left column: name pre-printed + small child-number box (child index, helps matching when names are Chinese/English mixed).

### Machine chrome
4 solid 8 mm corner fiducials; QR (22 mm) top-right encoding `MT-STD-1|{classroom_id}|{date}|{page}/{pages}`; the same string printed in text beside it; all content inside the central 90 %; pure black on white with area colour as a 6 % tint band in each header only (survives contrast normalisation; matches `AREA_COLORS` in `lib/montree/types/curriculum.ts:214-220`).

### ASCII sketch (landscape, one row shown)
```
■  Montree Record Sheet  ·  Whale Class  ·  Fri 2026-09-05  ·  page 1/2   [QR]  MT-STD-1 ■
+----+----------+----------------+----------------+----------------+----------------+----------------+------------------+
| #  | Child    | PRACTICAL LIFE | SENSORIAL      | MATHEMATICS    | LANGUAGE       | CULTURAL       | Note             |
+----+----------+----------------+----------------+----------------+----------------+----------------+------------------+
| 01 | Amy      | ▷ Pouring  [ ] | ▷ Pink Tower[ ]| ▷ Spindles  [ ]| ▷ Sandpaper [ ]| ▷ Land&Water[ ]|                  |
|    |          | ▷ Spooning [ ] | ▷ Brown St. [ ]| ▷ Cards&Ctr [ ]| ▷ Mov. Alph [ ]| ▷ Puzzle Map[ ]| ________________ |
|    |          | ▷ ________ [ ] | ▷ ________ [ ] | ▷ ________ [ ] | ▷ ________ [ ] | ▷ ________ [ ] |                  |
|    |          | ○<15○15-30○30+ | ○<15○15-30○30+ | ○<15○15-30○30+ | ○<15○15-30○30+ | ○<15○15-30○30+ |                  |
|    |          | ○wd ○WC ○DC    | ○wd ○WC ○DC    | ○wd ○WC ○DC    | ○wd ○WC ○DC    | ○wd ○WC ○DC    |                  |
+----+----------+----------------+----------------+----------------+----------------+----------------+------------------+
| 02 | Ben      | ...
■  Legend: ▷ 1 side = presented · 2 sides = practicing · filled = mastered · [ ] tally strokes = times worked today   ■
```
Row ≈ 24 mm → 10 children per page → Whale Class (19) = 2 pages. If the owner prefers 1 page, drop to 1 pre-printed work + 1 blank per area (row ≈ 16 mm, 14 children/page) — make `worksPerArea` a print option (default 2).

### Generator
`GET app/api/montree/paper-scan/sheet/print/route.ts?classroom_id=&date=YYYY-MM-DD&works_per_area=2` → HTML (print CSS `@page { size: A4 landscape; margin: 8mm }`), opened in a new tab and printed to PDF by the browser — no server-side PDF dependency (the repo's existing pdf-generator is report-specific). Data: roster from `montree_children` (ordered by `lib/montree/weekly-admin/child-order.ts`), current works from `montree_child_progress` filtered `status='practicing'` then `'presented'`, sorted by `updated_at DESC`, area via `work_key`/`area`. Template in `lib/montree/paper-scan/sheet-template.ts` (pure function `renderStandardSheetHtml(input)`), QR via the `qrcode` npm package as an SVG data URI (verify in `package.json`; add if absent). Button "Print today's sheet" on the paper-scan home card.

---

## 6. Aggregation service — `lib/montree/reports/period-aggregator.ts`

Pure data; no AI. Signature:
```ts
export async function aggregatePeriod(supabase, { classroomId, schoolId, periodType: 'week'|'month', periodStart: string /*YYYY-MM-DD*/ }): Promise<PeriodAggregate>
export function computePeriodBounds(periodType, anchorDate, weekStartsOn = 1): { start, end }
```
Reads (all scoped to classroom + date range):
1. `montree_children` (active roster).
2. `montree_observation_sessions` `occurred_on BETWEEN` — primary frequency/time source.
3. `montree_progress_events` `created_at BETWEEN` — transitions. **Fallback**: if the table is missing (PGRST205/42P01, same check as `write-progress.ts:594`) or returns 0 rows for the classroom, derive transitions from `montree_child_progress.updated_at BETWEEN` using `(presented_at, mastered_at, status)`: `mastered_at` in range → `→mastered`; `presented_at` in range → `→presented`; else `updated_at` in range and status `practicing` → `→practicing`. Flag `data.sources.transitions = 'events' | 'progress_fallback'`.
4. `montree_behavioral_observations` `created_at BETWEEN` — notes (count + last 3 snippets per child).
5. `montree_paper_scan_extractions` approved/edited rows from scans committed before 336 (legacy) — only if `montree_observation_sessions` has zero rows for the range, to keep Work Rhythm parity. Flag `sources.sessions = 'sessions' | 'legacy_extractions'`.
6. Optional photos proxy (`montree_media` + `montree_media_children` with the work→area hop from work-rhythm `:251-259`) counted as `photo_moments`, never as minutes.

Output:
```ts
interface PeriodAggregate {
  classroom_id; period_type; period_start; period_end; generated_at; sources;
  areas: AreaKey[];                                  // fixed order
  children: Array<{
    child_id; name;
    by_area: Record<AreaKey, { sessions: number; minutes_est: number; works: Array<{work_key,work_name,sessions,minutes_est}>;
                               concentration: { wd: number; wc: number; dc: number }; photo_moments: number }>;
    transitions: Array<{ work_name; work_key; area; from; to; at }>;
    status_counts: { presented: number; practicing: number; mastered: number };   // movement in period
    notes: { count: number; snippets: string[] };
    top_area: AreaKey | null; total_sessions; total_minutes_est;
    next_works: Record<AreaKey, string | null>;   // from §8 recommendNextWork generalised
  }>;
  class_totals: Record<AreaKey, { sessions; minutes_est; children_active: number }>;
  heatmap: number[][];                              // children × areas, sessions
}
```
Unit tests (`tests/period-aggregator.test.ts`) drive it with a stubbed supabase like `tests/photo-onboarding-reconcile.test.ts` does.

---

## 7. Visual weekly/monthly report

**API** `app/api/montree/reports/period/route.ts`
- `GET ?classroom_id=&period=week|month&start=YYYY-MM-DD&refresh=0|1` — returns cached `montree_period_reports.data` + `ai_lines` if present and `refresh=0`; otherwise runs `aggregatePeriod`, upserts cache, returns.
- `POST` body `{ classroom_id, period, start, ai: true }` — regenerate and (optionally) produce AI lines: one Sonnet call for the whole class (`AI_MODEL`, forced tool `child_lines` → `{ [child_id]: string }`, instruction "≤20 words, plain, what they did and one next step, no adjectives"), input = the aggregate only. Model selection via `lib/montree/reports/resolve-model.ts` if it already routes per school tier; otherwise `AI_MODEL`.
- Auth `verifySchoolRequest`; feature gate `period_reports`.

**Page** `app/montree/dashboard/period-report/page.tsx` (client), classroom-scoped via the same classroom resolution `work-rhythm/page.tsx` uses.
Components in `components/montree/period-report/`:
- `PeriodToggle` — Week/Month + prev/next arrows.
- `ClassHeatmap` — table children × 5 areas; cell background = area colour at alpha scaled by `sessions / max(sessions)` (5 steps), number inside; column footer = class totals. Colours from `AREA_COLORS` in `lib/montree/types/curriculum.ts:214` (note it uses `math` not `mathematics` — map via a small `areaKeyToColorKey`).
- `ChildCard` — name; 5 horizontal bars (minutes_est, same colours) with session count at the end ("4×"); `StatusChips` — `P→Pr`, `Pr→M` chips listing work names (max 3, "+n"); top works line; optional AI line; notes count.
- `PrintSheet` — `@media print` layout: heatmap on page 1, cards 6-per-page; "Print / Save PDF" button uses `window.print()`.
- Empty state when sources are empty: "Nothing recorded for this period — scan a sheet first" + link to paper-scan.
Export link: "Download Weekly Summary (.docx)" / "Monthly Summary (.docx)" buttons call §8 routes with the same period.

---

## 8. Docx/PPTX outputs derived from the aggregator

- **Weekly Plan** (`lib/montree/weekly-admin/doc-generator.ts` `generateWeeklyPlan` `:340`; already 7 columns/all areas `:90-93`). Change the feeder, `app/api/montree/weekly-admin-docs/auto-fill/route.ts` (~`:601-760`): for each child × area, "next works" = `aggregate.children[i].next_works[area]` plus current practicing works, replacing the photo-led heuristics at `:753-759`. Chinese row (`chineseNote`) untouched.
- **Weekly Summary** (`generateWeeklySummary` `:162` takes `ChildNotes.englishSummary` + `chineseSummary`). Note: the current generator renders a 2-column Child|Narrative table (`:48-50`), *not* the 3×8 grid of `docs/samples/Weekly Summary - 26.docx` — implementation agent must add `generateWeeklySummaryGrid()` (3 cols × 8 rows, one child per cell, English sentence + `日常/感官/数学/语言/文化` lines) and keep the old one behind `layout=table`. English sentence from a new pure builder `lib/montree/weekly-admin/weekly-sentence-builder.ts: buildWeeklySentence(childAggregate)` — template: "{Name} worked most in {top area} ({n} sessions), also {area2}; {moved to practicing X} / {mastered Y}." Chinese per-area lines: **option A** blank (default), **option B** AI-drafted by the same Sonnet call as §7 with a `zh_area_lines` field — ship A, expose B behind a checkbox in the weekly-admin-docs page; flag for owner decision.
- **Monthly Summary** (`lib/montree/weekly-admin/monthly-summary-builder.ts`, Language-only by contract `:1-5`, `:54`; feeder `monthly-auto-fill/route.ts:116-179` filters `area_key='language'` and `area='language'`). Generalise: `buildChildSummaryParagraph(input, { areaLabel })` where `ChildSummaryInput.sessions` comes from `montree_observation_sessions` (not photos), `mastered/practicing` from `montree_child_progress` for that area, `recommendNextWork` (`:91`) unchanged per area. New `buildChildAllAreasParagraph(childAggregate, perAreaInputs)` = one sentence per area where the child had ≥1 session, then one mastery sentence across areas, then "Next, we can look at …" for the lowest-session area with a recommendation. `monthly-doc-generator.ts generateMonthlySummaryDoc` (`:49`) unchanged except `DEFAULT_TITLE` loses "Language". Keep the Language-only path callable via `?area=language` for the existing school doc.
- **Newsletter PPTX slides 1-3 / semester report** (`app/api/montree/reports/language-semester/generate`, `public/templates/language-semester-report.pptx`): unchanged this build. Record as follow-up: feed slide 2 "area balance" chart from `class_totals`.

---

## 9. Fix weekly-wrap data source

`app/api/montree/reports/weekly-wrap/route.ts:407-417` selects `montree_child_progress` by `created_at` — a work presented in March and moved to practicing this week is invisible. Replace both queries with `aggregatePeriod(...).children[child].transitions` (events, with the §6 fallback) and pass `sessions` + `notes.snippets` into `TeacherReportInput` (`teacher-report-generator.ts:15`) as new optional fields `sessions_by_area` and `observations`, rendered as an "Area balance" line in the teacher report and as context in `narrative-generator.ts`. The `ProgressRecord` types at `:432-433` become the aggregator's transition type. Keep the 4-week history query but key it on `updated_at`.

---

## 10. Menu, flag, i18n, tests, rollout, phases

- **Menu**: `lib/montree/menu/registry.tsx:45` add `period_reports: { id:'period_reports', labelKey:'periodReport.menuLabel', label:'Weekly & Monthly Report', route:'/montree/dashboard/period-report', icon: BarChart3 }`; `lib/montree/menu/config.ts:22-27` and `:82-83` add `'period_reports'` next to `work_rhythm`. `lib/montree/features/types.ts:36` add `| 'period_reports'`.
- **i18n**: new prefixes `periodReport.*` (~25 keys), `paperScan.layout.*` (~18 keys), `paperScan.sheetPrint.*` (~8), `paperScan.fields.{frequency,timeBucket,concentration,...}` (~10). Add to `lib/montree/i18n/en.ts` and all 11 other locales; follow the deterministic script pattern of `scripts/work-rhythm-i18n.mjs` or run `npm run i18n:fill-ui` then `npm run i18n:check:strict` (pre-commit hook via `.githooks`).
- **Tests (vitest, `tests/`)**: `paper-scan-session-writer.test.ts` (bucket maths, idempotent upsert row), `paper-scan-layout-prompt.test.ts` (prompt contains profile block; no profile = byte-identical to current prompt), `period-aggregator.test.ts` (heatmap, transitions from events vs fallback, legacy extraction fallback), `weekly-sentence-builder.test.ts`, `monthly-all-areas-builder.test.ts`, `commit-null-area.test.ts` (null area → skipped, no `practical_life` default).
- **Rollout order**: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Owner validation happens after Phase 2 (print + scan a real sheet) and Phase 5 (dashboard). Feature flag `period_reports` stays OFF until Phase 5 passes on Whale Class.

### Phases (each = one implementation agent)

**Phase 0 — Schema & prod check.** Write `migrations/336_sheet_layouts_and_work_sessions.sql` (§2); verify in prod that `montree_progress_events` exists (apply 314 if not); apply 336. Acceptance: `select` on all four tables succeeds with service role; RLS enabled; flag row present.

**Phase 1 — Standard sheet printer.** `lib/montree/paper-scan/sheet-template.ts`, `app/api/montree/paper-scan/sheet/print/route.ts`, print button on paper-scan home, builtin profile file `layouts/montree-standard-v1.ts`. Acceptance: Whale Class prints 2 pages, every child present with their current practicing works, QR decodes to `MT-STD-1|…`. **Owner step**: print, fill during one full work cycle, photograph each page.

**Phase 2 — Extractor to Sonnet + new fields + commit fixes.** §4 items 1-8, `scripts/paper-scan/eval-extraction.mjs`. Acceptance: scanning the owner's filled sheet yields ≥90 % correct (child, work, status, bucket, tally) on manual check; null-area rows cannot commit; `montree_observation_sessions` rows created once per extraction even on re-commit; old Haiku path gone. **Owner step**: scan the sheets from Phase 1, review, commit, compare against paper.

**Phase 3 — Layout learning (Layer 1).** `layout-types.ts`, `layout-learner.ts`, `layouts/*` routes, `LayoutTeacher.tsx`, prompt injection, resolution order. Acceptance: teaching with the blank Standard sheet reproduces a profile semantically matching the builtin; teaching with the old `docs/oversight-pack-aug01/observation-sheet.pdf` produces a per-child-block profile whose legend maps MARK triangle + wd/WC/DC + START–END clock; scans with an active profile show `layout_match` and read measurably better on that sheet (eval script, both sheets).

**Phase 4 — Aggregator + API.** `period-aggregator.ts`, `reports/period/route.ts`, tests. Acceptance: for a week with committed scans, heatmap totals equal `count(*)` grouped in SQL; transitions source flag correct; runs <1.5 s for 20 children.

**Phase 5 — Dashboard page.** §7 components, menu, flag, i18n. Acceptance: week/month toggle, print one-pager on A4 with no clipping, empty state, AI lines optional and ≤20 words. **Owner step**: open for Whale Class after a scanned week; confirm it matches their sense of the room.

**Phase 6 — Docx derivations.** §8: grid Weekly Summary, sentence builder, all-areas monthly builder, auto-fill feeders on aggregator. Acceptance: generated docx opens in Word; Weekly Plan shows next works in all 5 columns; monthly paragraph mentions every area with sessions; Language-only variant still produced via `?area=language`.

**Phase 7 — Weekly-wrap fix.** §9. Acceptance: a work transitioned this week but created earlier appears in the teacher report; existing tests pass.

---

## 11. Open risks / questions

1. **Migration 314 in prod unknown** — if absent, `progress_events` fallback path is exercised for all historical weeks; fine, but Phase 0 must settle it.
2. **Sonnet cost per scan** ~3-4× Haiku; 2 pages/day × 20 school days ≈ 40 calls/month per classroom — acceptable; eval script tells us if Haiku-with-profile is good enough later.
3. **Photos of filled sheets are deleted at commit** (`commit/route.ts:176-191`). Layout teaching photos are kept in `sample_paths` — owner should teach with *blank or anonymised* sheets, or accept retention; the learn tool schema carries no child data regardless.
4. **Sheet density vs legibility** — 2 works per area per child on landscape A4 is tight; owner should choose `works_per_area=1|2` after printing once.
5. **Tally semantics** — is a tally "times chosen today" or "days this week"? Plan assumes per-day sheet, so tally = repetitions that day; a weekly per-child variant would change `occurred_on` handling.
6. **Chinese cells in Weekly Summary** — blank vs AI-drafted is an owner decision (§8).
7. **`AREA_COLORS` key drift** (`math` vs `mathematics`) exists in two places; don't fix globally, map locally.
8. **Monthly Language doc format is "locked"** (`monthly-summary-builder.ts:7`) — the all-areas builder is a new function beside it, not a rewrite, so the school's existing doc does not drift.
9. **QR decoding client-side** (pre-upload routing) is deferred; Sonnet reads the printed code text in v1.
