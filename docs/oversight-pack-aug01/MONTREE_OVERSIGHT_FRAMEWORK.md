# Montree Oversight — Multi-School Supervision Framework

**Author:** Fable (orchestrator) · Scouted by Sonnet against the live codebase · Prototype built by Opus
**Date:** 1 August 2026
**Companion files:** `oversight-dashboard.html` (working prototype), `observation-sheet.pdf`, `progress-sheet.pdf`

---

## 1. What this is

A supervisor ("regional director") oversees 20–60 Montessori schools running Montree. She needs to know, at a glance: which schools are performing how and where, which areas need improvement and focus, and which individual children are falling through the cracks — without visiting every school and without drowning in raw observation data.

Montree already has the hardest part: per-child, per-work progress data flowing in from photo recognition, voice observations, and now the Paper Scan handwriting pipeline. What's missing is everything **above** the school: the org layer, the roles, the rollups, and the reading discipline. This document specifies all four.

## 2. The single most important design principle

**Coverage before judgment.** In a network of 60 schools, adoption is uneven. A school with a low progress score and low observation volume is not a failing school — it's an *unknown* school. If the dashboard doesn't make this distinction structurally, supervisors will punish schools for not logging data and the whole system loses trust on day one.

Therefore every metric in this framework carries a **coverage tier** (Reliable ≥80% · Partial 50–79% · Low <50% of children with ≥1 observation in the trailing 14 days), and a school with Low coverage is displayed as status **Unknown** — never Action/failing — with the intervention being "get data flowing," not "fix teaching."

## 3. Metric definitions (canonical)

These reconcile the three divergent progress formulas that currently coexist in the codebase (`/progress/bars` sequence-position model, `useChildProgress` count model, and the PDF generator's palette-only model). **The sequence-position model from `/api/montree/progress/bars` is declared canonical** — it's the one wired to the live bar chart and it matches Montessori pedagogy (shelf position, not checkbox count).

| Metric | Definition | Source |
|---|---|---|
| **Child area %** | Sequence-position model: highest-sequence work with any progress marks the position; lower-sequence works count complete; current work counts only when `mastered`. `completed / totalWorks` per area. | `montree_child_progress` × `montree_classroom_curriculum_works.sequence` |
| **Child overall %** | Mean of the child's five area percentages. | derived |
| **School Progress Index (SPI)** | **Median** child overall % in the school. Median, not mean — one advanced classroom or a few new enrollees shouldn't move the school's number. | rollup |
| **Momentum** | Δ SPI over trailing 30 days. Requires the event log (§5) — `montree_child_progress` stores only current status + `presented_at`/`mastered_at`, not history. | rollup |
| **Observation coverage** | % of active children with ≥1 observation (paper scan, voice, photo, manual) in trailing 14 days. | `montree_behavioral_observations`, `montree_paper_scan_extractions`, media |
| **Area balance** | Per-area school average vs the school's own mean — flags systemic neglect (e.g. Cultural at 60% of the school's own norm). | rollup |

### Attention flags (rule-generated, ranked by severity)

| Flag | Rule | Severity |
|---|---|---|
| Stalled children | No status change in 45+ days (child-level, surfaced as a school count + drill-down list) | Action |
| Low coverage | Coverage <50% for 14+ days | Action |
| Declining momentum | SPI Δ < −3 pts / 30 days with Reliable coverage | Watch |
| Area neglect | Any area avg < 60% of school's own mean area avg | Watch |
| New school onboarding | School < 8 weeks on Montree — suppress performance judgment, show onboarding checklist instead | Info |

Every flag renders with an **evidence sentence** ("14 children in Casa 2 with no status change in 45+ days") and a **suggested next step**. Flags are the supervisor's inbox; the tables are for exploration.

## 4. Data model additions

The current hierarchy tops out at `montree_schools` — there is nothing above it, and the only cross-school actor is Montree's own shared-secret `super_admin`. Additions (one migration):

```sql
-- 3xx_organizations.sql
CREATE TABLE montree_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_email text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE montree_organization_schools (
  organization_id uuid REFERENCES montree_organizations(id) ON DELETE CASCADE,
  school_id uuid REFERENCES montree_schools(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (organization_id, school_id)
);

CREATE TABLE montree_supervisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES montree_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  login_code text UNIQUE,          -- mirror montree_teachers auth pattern
  password_hash text,
  role text DEFAULT 'supervisor',  -- future: 'org_admin'
  is_active boolean DEFAULT true,
  last_login_at timestamptz
);
```

Join table (not a plain FK on schools) so a school can move between groups cleanly and so franchise/consultant arrangements (one advisor, several small groups) don't require schema surgery later. The dormant `montree_schools.plan_type = 'district'` ($199 tier from migration 028) is the natural billing hook — an organization is what a "district" plan actually buys.

### The event log (prerequisite for momentum + stalled detection)

```sql
CREATE TABLE montree_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL,
  classroom_id uuid,
  school_id uuid,
  work_name text NOT NULL,
  area text,
  old_status text,
  new_status text NOT NULL,
  source text,                     -- 'photo' | 'voice' | 'paper_scan' | 'manual'
  created_at timestamptz DEFAULT now()
);
```

Write one row from the single choke point that already exists: `lib/montree/progress/advance-on-confirm.ts` (plus the paper-scan commit route's local variant — which should be refactored to call the shared helper anyway). Backfill roughly from `presented_at`/`mastered_at`. Without this table, momentum and "stalled 45 days" are guesses; with it, they're queries.

### Nightly rollups (dashboards never touch raw rows)

```sql
CREATE TABLE montree_school_metrics_daily (
  school_id uuid, metric_date date,
  spi numeric, children_active int, coverage_pct numeric,
  area_avgs jsonb,        -- {practical_life: 61.2, ...}
  flags jsonb,            -- materialized flag list
  PRIMARY KEY (school_id, metric_date)
);
```

Computed by a nightly job in `jobs/` (same pattern as existing jobs). 60 schools × ~100 children × 5 areas is trivial compute; the point of the rollup is instant dashboards, historical trend lines for free (the 8-week sparklines in the prototype = 56 rows per school), and no load on classroom-serving tables. Org-level numbers are aggregated from this table at read time.

## 5. Auth & access

- Extend the JWT role enum in `lib/montree/server-auth.ts`: `'teacher' | 'principal' | 'homeschool_parent' | 'agent'` → add `'supervisor'`. Token carries `organizationId` (not `schoolId`).
- New guard `verifyOrganizationRequest()` mirroring `verifySchoolRequest()`: validates the supervisor JWT, loads the org's school-ID set, and **every downstream query filters by that set**. A supervisor sees her 20–60 schools and nothing else — this is the structural difference from the existing `super_admin`, which sees everything and must remain Montree-internal only.
- Supervisor access is **read-only aggregate by default**. Drill-down to an individual child shows progress + flags, not raw observation notes/photos (those stay school-scoped; also the Paper Scan privacy ruling — photos deleted after commit — already points this direction). An org-level setting can widen this per group if a customer wants it.
- RLS: keep the established pattern — service-role only, zero RLS policies, all access through the verify guard.

## 6. API surface

```
GET  /api/montree/org/overview            → KPIs + school list w/ metrics (from rollups)
GET  /api/montree/org/heatmap             → schools × areas matrix
GET  /api/montree/org/flags               → flag inbox, grouped by severity
GET  /api/montree/org/schools/[schoolId]  → drill-down: trend, classrooms, flagged children
GET  /api/montree/org/schools/[schoolId]/children/[childId] → child progress (read-only)
POST /api/montree/org/features            → bulk feature toggle across schools
                                            (extend SchoolFeaturesModal's set_all pattern)
```

All behind `verifyOrganizationRequest`. UI lives at `app/montree/org/*` — the prototype (`oversight-dashboard.html`) is the spec for these pages: Overview, Area heatmap, Rankings, Flags inbox, School drill-down.

## 7. How the whole loop closes

This is why the three deliverables in this pack are one system, not three features:

1. **Observation sheet** (printed by Montree per class per day, roster + current works pre-printed) → teacher marks triangles by hand all morning, phone stays in the drawer.
2. **Paper Scan** photographs the sheet at day's end → extractions → `montree_child_progress` + observations. The sheet is designed to the extractor's exact strengths (triangle marks, PL/Sens/Math/Lang/Cult codes, clock-range times), so accuracy is engineered in at the paper layer.
3. **Progress sheet** prints per child from the same canonical data — parents and principals see the identical numbers the supervisor sees.
4. **Nightly rollup** turns child rows into school metrics into org metrics.
5. **Oversight dashboard** turns metrics into decisions: which school to visit this week, which area to run training on, which children are stalled.

The paper layer feeds the data layer; the data layer feeds the oversight layer; the oversight layer justifies the "district" price tier. Each printed sheet a teacher fills in is, indirectly, a row on a regional director's screen.

## 8. Build order

| Phase | Work | Depends on |
|---|---|---|
| **0. Prerequisites** | Run migration 308 (paper scan — currently NOT run, flag default OFF). Resolve `children` vs `montree_children` FK drift (`montree_behavioral_observations.child_id` still points at legacy `children`). Declare `/progress/bars` the canonical % formula and one area color map (bars palette) app-wide. | — |
| **1. Org layer** | Organizations + join + supervisors migration; JWT role; `verifyOrganizationRequest`; minimal org login. | 0 |
| **2. Event log + rollups** | `montree_progress_events` write-through in `advance-on-confirm.ts`; backfill; nightly `jobs/rollup-school-metrics`. | 1 |
| **3. Dashboard** | `app/montree/org/*` pages per the prototype; `/api/montree/org/*` routes reading rollups. | 2 |
| **4. Flags + actions** | Flag rules in the nightly job; inbox UI; weekly supervisor email digest; org-wide feature bulk-toggle. | 3 |
| **5. Later** | Cross-org benchmarks ("your group vs Montree network median"), supervisor-annotated school visit notes, CSV/PDF export of the org report. | 4 |

Phases 1–3 are the MVP a 20-school customer can be demoed on; the prototype dashboard is intentionally pixel-close to what Phase 3 should ship.

## 9. Known inconsistencies this framework forces you to settle

1. **Three progress formulas** → canonical: sequence-position (`/progress/bars`).
2. **Three area palettes** (bars route, PDF generator, archived brand guide) → canonical: bars palette `#22c55e / #f97316 / #3b82f6 / #ec4899 / #8b5cf6` (the prototype uses contrast-corrected steps of the same hues for accessibility; adopt those app-wide if you want AA compliance).
3. **Two principal-auth tables** (`montree_teachers.role='principal'` vs legacy `montree_school_admins`) → build supervisors on the `montree_teachers` JWT pattern, retire `montree_school_admins`.
4. **`montree_child_progress` has no history** → the event log fixes this permanently; do it before anyone asks for a trend you can't reconstruct.
