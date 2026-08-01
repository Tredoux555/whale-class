# Montree Institutions — Master Plan

**The institutional layer: one organisation, many schools, clean data all the way up.**
Author: Fable (orchestrator) · Inputs: 6 Sonnet scouts across two sessions + system health audit (1 Aug 2026) · Status: ready for Monday kickoff

---

## 1. What we're building and why now

An **Institution** is any body that owns or oversees many Montree schools: a training foundation like FAMM, a school group, a franchise, a district, an NGO network. Today Montree's world ends at `montree_schools`; the only cross-school actor is your own super-admin. The FAMM demo proved the appetite — and the sales motion changes fundamentally: instead of onboarding one school at a time, one institutional deal onboards **10–100 schools at once**, each with a principal, each principal with teachers, every teacher generating child-level data that must roll up cleanly.

The product promise, in one sentence: **a teacher marks a triangle on paper; that mark becomes a child's progress, the class's rhythm, the school's health, and the institution's map — with nothing lost or distorted on the way up.**

## 2. Design principles (non-negotiable)

1. **Clean at the source, or not at all.** Aggregation never fixes dirty data; it amplifies it. Every cleanliness rule lives at the write path, not the report layer. This is why Phase 0 below is data cleanup, not features.
2. **One canonical truth.** One progress formula (the sequence-position model), one curriculum spine with stable IDs, one write primitive, one area colour map. Today there are three of each; institutions make that untenable.
3. **Coverage before judgment.** A school that isn't logging data is *Unknown*, never *failing*. Every metric at every level carries a coverage tier (Reliable ≥80% / Partial 50–79% / Low <50% of children with a recent observation). This protects trust in the numbers — and protects schools from unfair comparison during adoption.
4. **Visuals first, numbers second, analysis third.** Every screen at every level reads the same way: simple bar charts you understand in three seconds → the raw numbers table for those who want them → an AI-written analysis below (Guru narrates what the bars mean and what to do). Same doctrine for teacher, principal, and institution — only the subject changes (child → class → school).
5. **Each level sees one level down in detail, two levels down on demand.** Institution sees schools (and can drill to a child); principal sees classes and children; teacher sees children. Raw observation notes and photos stay school-scoped by default — institutions see progress, not surveillance.

## 3. The hierarchy and roles

```
Institution  (e.g. "FAMM Network", "Bright Path Group")
 └─ School   (principal — role exists today)
     └─ Classroom  (teacher — exists today)
         └─ Child  (exists today)
```

| Role | Sees | Can do |
|---|---|---|
| Teacher | Own classroom's children | Log observations, mark progress, manage own menu (if Give Control) |
| Principal | All classrooms + children in school | Everything teacher + school features, teachers, reports |
| **Institution admin** (new: `org_admin`) | All schools in institution; drill to child (progress only) | Read dashboards, bulk-enable features, bulk-onboard schools, invite principals |
| **Institution viewer** (new: `org_viewer`) | Same, read-only | Read dashboards, export reports |
| Super-admin (you) | Everything | Everything (move to per-admin credentials before adding staff) |

Auth: extend the existing JWT role enum (`lib/montree/server-auth.ts`) with the two org roles; token carries `organizationId`; new `verifyOrganizationRequest()` guard mirrors `verifySchoolRequest()` and **every org query filters by the institution's school set**. Same service-role + zero-RLS pattern as the rest of the app.

## 4. Data model

### 4a. New tables

```sql
montree_organizations           (id, name, slug, logo_url, country, settings jsonb, plan_type, created_at)
montree_organization_schools    (organization_id, school_id, added_at)   -- join, PK(org,school)
montree_org_admins              (id, organization_id, name, email, login_code, password_hash,
                                 role 'org_admin'|'org_viewer', is_active, last_login_at)
montree_progress_events         (id, child_id, school_id, classroom_id, work_id, work_name,
                                 area, old_status, new_status, source, created_at)  -- append-only
montree_school_metrics_daily    (school_id, metric_date, spi, children_active, coverage_pct,
                                 area_avgs jsonb, subject_avgs jsonb, flags jsonb, PK(school,date))
```

Billing hook: the dormant `plan_type='district'` tier (migration 028) becomes the institutional plan.

### 4b. The curriculum spine — the single most important structural change

Today each classroom owns an independent curriculum copy with its own sequence numbers (migration 099, by design). That was right for single classrooms; it makes cross-school comparison impossible ("60%" means different things in every room).

**Add `montree_master_works`:** one global row per work — stable `work_id`, canonical English name, Chinese/Spanish names, area, **global sequence**, age band. Classroom curriculum rows gain a `master_work_id` FK and become *overlays* (local name, local notes, local activation) on the spine. `montree_child_progress` gains `work_id`. Backfill with the Jaro-Winkler matcher that already exists (`lib/montree/paper-scan/work-matcher.ts`) + a one-time review screen for the unmatched tail. Custom classroom works keep `master_work_id NULL` — they count in the child's own progress but are excluded from cross-school congruence (correct behaviour, and it makes the "congruent with the established curriculum" claim honest).

This is exactly what makes "Math and English progress congruent with the established curriculum" a real query instead of string-matching: every child's position is a point on the same AMI-ordered spine.

### 4c. One write primitive

Generalise `advance-on-confirm.ts` into `writeProgress()`: rank-gated (never-downgrade unless explicit teacher correction), stamps `school_id`/`classroom_id`/`work_id` at write time (transfer-safe), appends to `montree_progress_events`, normalises names. All 15+ current writers converge on it; direct upserts deleted. This is the choke point that keeps institutional data clean forever after.

## 5. Metrics (same definitions at every level)

- **Child area % / overall %** — sequence-position model against the master spine (canonical, already live in `/progress/bars`).
- **Class / School Progress Index** — *median* child overall % (median resists outliers and new enrolees).
- **Momentum** — Δ over trailing 30 days, from the event log.
- **Coverage** — % of active children with ≥1 observation in 14 days, at class, school, institution level.
- **Subject tracks** — Mathematics and English (english_program feature exists) get dedicated congruence views: each child as a point on the subject sequence vs the expected band for age → Ahead / On track / Needs support.
- **Attention flags** — stalled child (45+ days no change), low coverage, area neglect (area < 60% of school's own mean), declining momentum, new-school onboarding (informational, suppresses judgment). Every flag = evidence sentence + suggested action.

Nightly job (`jobs/rollup-school-metrics`) computes school-day rows; institution numbers aggregate from those at read time. Dashboards never touch raw tables. Historical trend = free (one row per school per day). School timezone (new column) governs "day."

## 6. The reading layer — visuals → numbers → AI

Every dashboard page at every level is the same three stacked bands:

1. **BARS.** Simple horizontal bar charts. Institution: schools ranked by SPI, area heatmap. Principal: classes side by side, children ranked within class. Teacher: children's five areas. No exotic chart types; bars, and the FAMM-style time-stacked bars for "who spends time where."
2. **NUMBERS.** The exact table behind the bars (sortable, exportable CSV). Raw counts, percentages, dates. Nothing shown in a bar that can't be verified in the table.
3. **ANALYSIS.** Guru-written narrative scoped to the level: *"Casa 2's Language average fell 4 points this month; 6 of the 9 stalled children are in the same classroom; coverage there dropped to 40% after the teacher change — this is a data gap, not a performance drop. Suggested action: …"* Cached nightly with the rollup; regenerated on demand.

Institution UI surface (`app/montree/org/*`): **Overview** (KPIs + school table with coverage badges + status chips) · **Areas** (heatmap schools × 5 areas) · **Math & English** (congruence lanes, the FAMM prototype's view, English version) · **Students** (cross-school search, time-by-area, flagged children) · **Flags inbox** · **School drill-down** (principal's view, read-only). The two existing prototypes (`oversight-dashboard.html`, `famm-tracker.html`) are the pixel spec.

## 7. Bulk onboarding — 10/100 schools at a time

- **School Blueprint:** a named template = minimal feature set + curriculum template + default classrooms + locale/timezone. Institution onboarding = CSV of schools (name, city, principal name/email, classes, timezone) → provisioner creates schools from blueprint, generates principal + teacher login codes, links to the institution — one job, idempotent, resumable, with a dry-run report ("will create 43 schools, 61 principals; 2 rows invalid").
- **Roster import** per school: children CSV (name, DOB, class) with validation (dedupe, age sanity) at import time — clean at the source.
- **Feature control:** org-level bulk toggle ("enable Paper Scan for all my schools") extending the existing `set_all` pattern; per-school Give Control stays as today.
- **Login distribution:** printable one-pager per school (codes + QR) — reuse the login-codes surface you already have.

## 8. What has to be true first — Phase 0 (from the health audit)

1. Fix the P0 commit-route bug (paper-scan/voice writing nonexistent columns — possible live data loss).
2. Gate `/api/media`; rate-limit the community inject route.
3. Master works spine + `work_id` on progress (4b) — the long pole; start Monday.
4. `writeProgress()` consolidation (4c).
5. School timezone column; stamp school/classroom on progress rows.
6. Migration ledger; quarantine stale `supabase/migrations/` tree.
7. Minimal signup defaults + menu/flag fixes (already specced in the audit — small, ship alongside).

## 9. Phase plan (Monday kickoff)

| Phase | Scope | Output | Est. sessions |
|---|---|---|---|
| **0. Foundations** | Audit P0s + curriculum spine + writeProgress + timezone/stamping | Clean, aggregable write path; no data loss | 2–3 |
| **1. Org layer** | Tables, roles, verifyOrganizationRequest, org login page | An institution exists; org admin can log in and see her school list | 1–2 |
| **2. Rollups + events** | Event log backfill, nightly metrics job, coverage tiers | school_metrics_daily populated for all schools | 1–2 |
| **3. Institution dashboard** | `app/montree/org/*` — Overview, Areas, Math & English, Flags, drill-down (bars → numbers → AI) | Live institutional dashboard on real data | 2–3 |
| **4. Bulk onboarding** | Blueprint, CSV provisioner, roster import, org feature bulk-toggle | Onboard 50 schools in one afternoon | 1–2 |
| **5. Polish + pilot** | Guru analysis narratives, CSV/PDF exports, weekly org email digest; pilot with FAMM/first group | First institutional customer live | 1–2 |

Sequencing rule: **Phase 0 is not skippable.** Every later phase compounds whatever Phase 0 leaves dirty. Phases 1–2 can run partly parallel to late Phase 0. Demo checkpoint: after Phase 3 you can sell; Phase 4 is what lets you *deliver* a 100-school deal without a week of manual setup.

## 10. Open decisions for you (Monday, 5 minutes)

1. **Institution ↔ school exclusivity:** can a school belong to two institutions (e.g. a foundation *and* a district)? Join table supports it; recommend enforcing ONE owner-institution + optional viewer-institutions to keep billing sane.
2. **Who pays** — institution pays per school (district plan), or schools keep paying individually with the institution as a free oversight layer? Affects provisioning defaults.
3. **Child-level visibility for institutions:** progress-only (recommended, default) or include observation text? Privacy posture matters to AMI-affiliated buyers.
4. **English track scope:** build congruence on the existing `english_program` feature's scope, or define a new bilingual scope per institution?
5. Blueprint content for the minimal default feature set (the audit lists today's accidental 14 default-ON flags — pick the keepers).
