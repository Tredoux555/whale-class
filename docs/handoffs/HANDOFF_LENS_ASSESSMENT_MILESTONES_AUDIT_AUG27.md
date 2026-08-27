# Montree Lens Assessment — Milestones duplicated, audited, hardened

**2026-08-27 · Claude Cowork (subagents).** Three same-day passes, in order: **(A)** built a
full duplicate of the Montree Milestones assessment inside Montree Lens, for the
supervisor/observer product; **(B)** an independent fresh-eyes instrument audit against six
external standards, evidence review only, no code; **(C)** a same-day improvement round that
hardened Lens's new assessment layer (including one real data-corruption bug), closed the
audit's findings across both products and the shared scoring engine, and shipped supporting
docs + tooling. Read this before touching `lib/lens/assessment/*`,
`lib/montree/evaluation/*`, `app/lens/assessment/*`, or `app/api/lens/assessment/*`.

Commits: **`87e178a7c`** (Session A, pushed) and **`cde170815`** (Session C, 48 files, pushed).
Session B produced no commit — it's a review, folded into Session C's fixes and into
`docs/evaluation/EVIDENCE_STATUS.md`.

## A. Lens Assessment build — `87e178a7c`

Montree Lens (the standalone observer/supervisor app, see
`docs/handoffs/HANDOFF_MONTREE_LENS_LAUNCH_AUG26.md`) gets its own copy of the Montree
Milestones assessment, for a visiting consultant to run a check-in without a classroom roster.

**Architecture — shared engine, new Lens-owned layer:**
- The pure scoring engine, `lib/montree/evaluation/*`, is **shared** — imported by Lens, never
  copied or forked. Any scoring-logic fix in Session C landed once and applies to both products.
- New Lens-owned layer: `lib/lens/assessment/{types,bridge,session-service}.ts`, on three new
  tables — `lens_assessment_sessions`, `lens_assessment_item_responses`,
  `lens_assessment_milestone_results` — added by `migrations/340_lens_assessment.sql`.
  **Migration 340 is ALREADY RUN in Supabase (Tredoux) and is live.**
- Children are **free-text `child_alias`**, not roster rows — deliberate, since Lens has no
  roster concept and a visiting observer doesn't necessarily know a child's system ID.
- Entry point: a standalone "Check-ins" ghost link + secondary CTA on the Lens home page —
  not folded into the existing visit-report flow.

**Routes and pages:**
- 10 API routes under `app/api/lens/assessment/*`, all `requireObserver`-gated,
  observer-scoped, and wrong-owner → 404 (never a distinguishable 403 — existence ≠ ownership,
  same house pattern as CMS/RLS elsewhere in this repo).
- Pages: `app/lens/assessment/{index,new,run/[id],paper/[id],results/[id]}`.

**Three entry modes, one scoring path:**
1. **Digital runner** — reuses Montree's own `ItemStage`/`ObservationPanel`/`HoldButton`
   components rather than rebuilding them.
2. **Paper entry** — printable packs served via an allowlisted paper-pack route; marks are
   keyed in afterward and scored server-side (never scored client-side from paper).
3. **Tablet JSON import** — includes bank-drift checks (an imported response set is rejected
   or flagged if it doesn't match the current item bank).

All three modes converge on **one** `finalizeSession`/`scoreSession` path — no mode has its own
scoring logic, which matters for the co-rating gate added in Session C (see below).

**Build config:** `next.config.ts`'s `outputFileTracingIncludes` was extended so the Lens paper
PDFs ship with the build.

## B. Independent instrument audit (review only, no commit)

A fresh-eyes expert review of the whole Milestones/Lens assessment against six external
references: **AERA/APA/NCME** Standards for Educational and Psychological Testing, **NAEYC/DEC**
position statements, **EYFS** (England), **IDELA**, **Teaching Strategies GOLD**, and
**Cambridge Pre-A1**.

**Verdict:**
- **Design quality is at-or-above standard.** The forbidden-terms register, the no-norms
  stance, the suppression rules, and override-disclosure all beat GOLD/IDELA practice in this
  reviewer's assessment.
- **The evidence base is NOT yet international-standard.** No calibration sample, no
  inter-rater reliability (IRR) study, no A/B form-equating study, no mode-equivalence study
  (paper vs digital vs tablet-import), and the 0.80/0.40 mastery cuts are conventional
  round numbers, not empirically derived.

This verdict is the reason Session C exists — it is the direct input to
`docs/evaluation/EVIDENCE_STATUS.md` and to the bank audit below.

## C. Improvement round — `cde170815` (48 files, pushed)

### Lens hardening

- **`window_code` data-corruption bug, fixed.** It was **frozen at `'autumn'`** regardless of
  actual date — every session, whenever run, was scored as if it happened in autumn. Now
  derived from the real date (Sep–Dec → autumn, Jan–Mar → winter, Apr–Aug → spring), with the
  observer able to confirm or override the derived value.
- **Co-rating gate.** `summary_json.co_rated` — the observation module (**M-OBS**) is
  suppressed from scoring unless the observer confirms they rated alongside the child's own
  teacher. Enforced in **two places** (defense in depth, after the audit found a re-import
  bypass): at every write route, AND again at score time inside `finalizeSession`. The
  actual mechanism is `voidObservationEvidence()`: sets `administered=false`,
  `skipped_reason='observation_voided_not_co_rated'`. **Voiding is one-way** — once voided,
  evidence cannot be un-voided back into scoring by a later edit.
- **"Single-session snapshot — not a full milestone profile"** framing added throughout the
  Lens results UI.
- **MAP% (mastery-against-profile percentage)** is **fully suppressed** for any non-co-rated
  session, and **demoted** (shown but de-emphasized, never the headline number) for co-rated
  sessions.
- **Alias-match growth, made non-automatic.** A `child_alias` from a new session that looks
  like a past one surfaces only as an **unconfirmed `possibleMatches`** entry, requiring a
  per-comparison confirmation from the observer. Growth is **never auto-computed** from an
  alias match alone.
- **Comparability flags** — band-changed and different-forms flags surface wherever two
  sessions for the same (confirmed) child are compared.
- **"Didn't join in" control** — `administered=false`, `skipped_reason='did_not_engage'` — so a
  child who disengaged doesn't score as a failure on items never actually attempted.

### Shared engine + Montree product (both consume the same fix)

- **Unassessed-by-discontinue is now its own category** (`unassessedReason='discontinue_rule'`
  rather than folded into a generic "not administered"), with an explicit **>15% bias caveat**
  surfaced in child, cohort, school, and org-level reports — discontinue-rule skips are not
  randomly missing data and reports must say so.
- **`listen_do` component diagnostics** — new `touchedIds`, `componentsCorrect`,
  `orderCorrect` fields recorded per response. **Credit is still all-or-nothing** — this is
  diagnostic detail for review, not a partial-credit scoring change.
- **Growth deltas restricted to same-form A→A.** Cross-form comparisons are shown **side by
  side, explicitly labeled "not as change"** rather than as a computed delta; cross-band
  comparisons are flagged rather than silently computed.
- **MAP% demoted below the band profile** on every surface it appears on: teacher, principal,
  parent, and super-admin views alike.
- **New feature flag `english_medium_literacy`.** The locale gate now accepts this option;
  `LCL-C`/`LCL-D` become schedulable under the `zh` locale for bilingual schools. **Fails
  closed** if the flag row is missing. The SQL seed for `montree_feature_definitions` was
  **given to Tredoux in chat — status unconfirmed, may not be run yet. Check with him before
  assuming this flag exists in production.**
- **Age-band confirm + adjacent-band chips at session start** — `derivedAgeBand` and
  `ageBandOverridden` are now recorded server-side inside `summary_json`, so an override is
  auditable after the fact, not just a UI-moment decision.
- **`did_not_engage` ported into the Montree runner too** — `ItemStage` gained this as an
  optional prop, so the same control exists in both products.

### Docs & paper materials

- **`docs/evaluation/EVIDENCE_STATUS.md`** (new) — states intended uses, states plainly that
  there is **no validation evidence yet**, and lays out a 4-study roadmap:
  - pilot, n≈300, item analysis
  - IRR study, n≈50, target κ≥.70
  - A/B form-equating, n≈120, OR keep the current same-form-only (A→A) policy instead of
    running it
  - mode-equivalence (paper vs digital vs tablet), n≈60
  Also states an interim claim policy (what the product is and is not allowed to claim about
  itself until these studies exist).
- **`docs/evaluation/CUT_SCORE_PANEL_PROTOCOL.md`** (new) — a one-day remote modified-Angoff
  panel protocol, 6–8 Montessori guides, to replace the conventional 0.80/0.40 cuts with
  empirically set ones.
- **`docs/evaluation/BANK_AUDIT_2026-08.md`** (new) + repeatable script
  `scripts/evaluation-bank-audit.mjs`. Key findings:
  - **86.4% of direct milestones have ≤2 items/form** — 41 of those have **exactly 1 item**,
    making the "developing" (partial-credit) rating mathematically unreachable for them.
  - At ≤4 items/milestone, the **0.80 cut behaves as if it were 1.00** in practice (you can't
    score 80% of 4 items without scoring 100% or ≤75%).
  - **14 EFL strand/band/form combinations** where the discontinue rule can never fire as
    written.
  - **24 M-FOCUS items sit on a pseudo-strand `ATL-X`** with no stop rule and no milestone
    links at all.
  This is now the **biggest concrete content gap** — see Outstanding #2 below.
- **`D1_framework.md`** — 6 places labeled **"Illustrative example — synthetic data"**
  (the Amara / Little Trees / n=59 example was always fictional, now explicitly marked as
  such) + the stale `.docx` export regenerated via `pandoc` (the exact command is now recorded
  in the D1 changelog so it isn't lost again).
- **`ARCHITECTURE.md`** accuracy pass — G1 added; corrected a claim that the EFL booklet is a
  standalone document (it's actually embedded inside the band packs).
- **G1 paper packs, built:** `D3_paper_pack_G1_formA.pdf` (6.17 MB / 96pp) and
  `D3_paper_pack_G1_formB.pdf` (6.71 MB / 95pp). Root cause of why these hadn't rendered
  before: a regex bug in `render.mjs`'s `outputNameFor`.
- **`evaluation-kit/paper`** gained `BUILD.md`, `package.json`, `.gitignore`, and
  `render-one.mjs` — previously undocumented/unscripted.

## Outstanding — human actions, in priority order

1. ~~Verify the `english_medium_literacy` SQL seed~~ **DONE — Tredoux confirmed it ran in
   Supabase, 2026-08-27.** The flag is live in `montree_feature_definitions` (default off;
   per-school opt-in via the ordinary `montree_school_features` override).
2. **Author new bank items for the thin milestones** identified in
   `docs/evaluation/BANK_AUDIT_2026-08.md` — the biggest content gap (86.4% of direct
   milestones at ≤2 items/form, 41 at exactly 1).
3. **Run the cut-score panel** per `docs/evaluation/CUT_SCORE_PANEL_PROTOCOL.md` to replace the
   conventional 0.80/0.40 cuts with empirically derived ones.
4. **Run the pilot + IRR + mode-equivalence studies** per
   `docs/evaluation/EVIDENCE_STATUS.md`'s roadmap (n≈300 / n≈50 κ≥.70 / n≈60; the A/B
   form-equating study is optional if the same-form-only policy is kept instead).
5. `lens_assessment` migration 340 — **already run and live**, no action needed, listed here
   only so a fresh session doesn't waste time re-checking it.
6. **Cosmetic, low priority:** temp `tsconfig` files were parked in `_to_delete/` during this
   work and are still sitting there (archive-never-delete-immediately house norm — fine to
   leave, or sweep next time `_to_delete/` gets cleared).

## Files touched this pass (Session C, on top of Session A's new layer)

Shared engine: `lib/montree/evaluation/*` (unassessed-by-discontinue category, `listen_do`
diagnostics, growth-delta form/band rules, MAP% demotion). Montree UI: `ItemStage`
(`did_not_engage` prop), teacher/principal/parent/super-admin report surfaces (MAP% demotion),
locale gate + `montree_feature_definitions` seed (SQL, unrun — see Outstanding #1). Lens:
`lib/lens/assessment/*` (window_code fix, co-rating gate, `voidObservationEvidence`,
possible-match confirmation flow, comparability flags), Lens results UI (snapshot framing,
MAP% suppression). Docs: `docs/evaluation/EVIDENCE_STATUS.md` (new),
`docs/evaluation/CUT_SCORE_PANEL_PROTOCOL.md` (new),
`docs/evaluation/BANK_AUDIT_2026-08.md` (new), `scripts/evaluation-bank-audit.mjs` (new),
`D1_framework.md`, `ARCHITECTURE.md`. Paper: `evaluation-kit/paper/{BUILD.md,package.json,
.gitignore,render-one.mjs}` (new), `D3_paper_pack_G1_formA.pdf`, `D3_paper_pack_G1_formB.pdf`
(both newly rendered, `render.mjs` `outputNameFor` regex fixed).
