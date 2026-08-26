# Montree Milestones — Evidence Status

**Version 1.0 · 2026-08-26 · bank `1.11.0`**
**Audience:** internal, funders, prospective school partners, and anyone conducting diligence.
**Register:** this is a technical document. It uses psychometric vocabulary — *cut score*,
*standard setting*, *differential item functioning* — that is deliberately excluded from every
child-, parent- and teacher-facing surface (see `lib/montree/evaluation/forbidden-terms.ts`).

This document answers one question plainly: **what evidence stands behind Montree Milestones
today?** The short answer is that the design is careful and the empirical base is empty. Nothing
below is hedged to look better than it is.

---

## 1. Intended uses and interpretation claims

Montree Milestones is a **criterion-referenced developmental check-in** for children aged three to
seven, administered one-to-one by the child's own teacher three times a year and combined with a
structured teacher-observation checklist rated across the term.

**It is intended for:**

- a **formative milestone check-in** — a periodic, structured look at what a child can currently
  do, against a published list of milestones a school can inspect;
- **within-child growth** — the same child's own movement across windows, which is the only
  comparison this design supports well;
- **translating a Montessori record into language a funder or a mainstream-schooled parent can
  read**, with the caveats printed alongside.

**It is explicitly not for, and must not be used for:**

| Not for | Why not |
|---|---|
| **Diagnosis** of any kind, developmental or otherwise | No clinical validation, no reference population, no diagnostic thresholds. A concern raised here is a reason to refer to a qualified professional, never a finding. |
| **Placement, admission, or streaming** decisions | No predictive validity evidence exists. Nothing here forecasts anything. |
| **Comparing schools, classrooms, or teachers** | Denominators differ by child; no sampling frame exists; no cross-school surface is built, and building one would be an architectural decision, not a configuration change. |
| **Ranking children**, or deriving percentiles, age-equivalents, or "months ahead/behind" | The instrument is criterion-referenced. There is no norm sample from which any of those could be computed. Attempting it is an error, not an extension. |
| **Attributing a change to a programme** | No control group, no randomization, no counterfactual. Contribution language only. |

The interpretation the design will support is: *"against this published list of milestones, on these
occasions, this teacher and this check-in together judged this child to be at this band."* Every
claim beyond that sentence is currently unevidenced.

---

## 2. Evidence that exists today

### 2.1 Empirical evidence: none

Stated plainly, so that no reader has to infer it:

- **There is no calibration sample.** No child has been assessed for the purpose of estimating item
  properties. No item has an empirical difficulty. No milestone has an empirical discrimination.
- **The cut scores are conventional, not derived.** `secure ≥ 0.80`, `developing ≥ 0.40`, minimum
  coverage `0.5` — these are the values because they are the customary values, not because a panel
  or a dataset produced them. `CUT_SCORE_PANEL_PROTOCOL.md` is the procedure for replacing them.
- **Forms A and B are content-matched, not equated.** Each form covers the same strands with the
  same item counts, formats and construct specifications. That is content matching; it is not
  equated difficulty. A child who finds one form harder shows movement that belongs to the form.
- **The observation strands have no inter-rater reliability evidence.** 112 of the 230 milestones —
  just under half the bank — are a single band judgement by the teacher who taught the child. That
  is the right method for pouring, turn-taking and persistence, and it is also entirely unstudied.
  We do not know how often two teachers rating the same child would agree.
- **There is no tablet/paper mode-equivalence study.** Equivalence is asserted by construction: one
  bank, one wording, one order, the only permitted difference being response mode. The general
  literature on visual pointing tasks supports the assertion. We have not tested our own instrument.
- **There is no English/Chinese differential item functioning analysis.** Stimuli were checked for
  greyscale legibility and cultural neutrality **by expert review only**. No empirical DIF work has
  been done, and none can be until there is a sample.
- **The item bank is thinner than the three-band model implies.** The August 2026 structural audit
  (`BANK_AUDIT_2026-08.md`) found that 102 of 118 direct milestones rest on two or fewer items per
  form, 41 on exactly one, and that at current item counts `secure` is only reachable on a flawless
  run. This is a design exposure, not a data error, and it constrains what any future study can find.

### 2.2 Design-level safeguards that do exist

These are real, they are enforced in code rather than in guidance, and they are the reason a
premature number is hard to produce by accident. They are **not** a substitute for section 3.

- **Server-side re-scoring.** Bands are derived on the server from the bank by `scoring.ts`. A
  client-computed band is never trusted; client points are stored for audit only.
- **Coverage-based unassessed band.** A milestone with less than the required proportion of its
  evidence administered is reported `unassessed` and excluded from every denominator, rather than
  being counted as a shortfall.
- **Suppression rules.** The Milestone Attainment Profile is suppressed entirely below twelve
  expected-and-assessed milestones, and no domain-level figure renders below six. The suppression
  and its reason are printed rather than hidden. The figure is always shown with its denominator
  and rounded to the nearest five, and there is no code path that prints it bare.
- **Teacher override with mandatory disclosure.** A teacher may replace a computed band, but the
  override is rejected without a reason, is stored, and is disclosed in the report and in the
  cohort override count.
- **The forbidden-terms register.** A machine-checkable list of the testing register — in English
  and Chinese — that must not appear on any child-, parent- or teacher-facing surface, with
  context-sensitive phrase rules for the comparative constructions that matter most.
- **Reported flat and negative results.** Selective reporting is treated as a build defect. The
  cohort report footer is mandatory and carries the method statement, the n, and the unassessed count.
- **A versioned, checksummed bank.** Every result records the bank version and checksum used, so a
  figure can be traced to the exact content that produced it.

---

## 3. The validation roadmap

Four studies, in the order they should be run. Each is scoped to what a small company can actually
finance and complete. Each has a decision rule stated in advance, so that the result cannot be
absorbed into a favourable reading after the fact.

### Study 1 — Pilot item analysis

- **Purpose.** Establish whether the items behave — whether they are answerable, whether they
  discriminate, and which of them are broken.
- **Method.** Classical item analysis: proportion-correct (p-value) per item, item–total correlation
  within strand, distractor analysis (is any distractor chosen more often than the key; is any
  distractor never chosen at all), and administration-time distribution per module.
- **Target sample.** n ≈ 300 children, minimum 8 schools, both markets (English-medium and
  Chinese-medium), spread across all four bands, both forms.
- **Decision rule.** An item is **revised** if p < .10 or p > .95 at its own band, or if its
  item–total correlation is below .20; it is **retired** if a revision has already failed once, or
  if a distractor outperforms the key. A milestone left with fewer than three surviving items per
  form is flagged for authoring before the bank ships again.
- **Blocks.** Nothing. This is the first study and everything else depends on it.

### Study 2 — Inter-rater reliability of the observation strands

- **Purpose.** Quantify how much of an observation band is the child and how much is the rater.
  This is the single cheapest study with the largest effect on what half the bank can claim.
- **Method.** Double-rating: two teachers who both know the child well rate the same observation
  checklist independently, within the same window, without conferring.
- **Target sample.** n ≈ 50 children, across at least 3 classrooms and both markets if possible.
- **Analysis.** Exact agreement and quadratically-weighted kappa, **per strand**, not pooled —
  pooling would hide the strands that are worst.
- **Decision rule.** Target weighted kappa **≥ .70** per strand. A strand below .70 gets rewritten
  band descriptors and is re-studied. A strand below .50 stops being reported as a band and is
  reported as a descriptive note until it is fixed.
- **Blocks.** Nothing — this can run in parallel with Study 1.

### Study 3 — Form equivalence (or the documented decision not to claim it)

- **Purpose.** Establish whether Forms A and B are interchangeable, which is what a two-window
  growth comparison currently assumes.
- **Method.** Counterbalanced within-child design: each child takes both forms in the same week,
  order randomized. Compare band distributions and per-milestone agreement across forms.
- **Target sample.** n ≈ 120 children, spread across bands.
- **Decision rule.** Forms are treated as equivalent only if per-milestone band agreement and the
  form-order effect are both within pre-registered bounds. If not, the parallel-form claim is
  dropped rather than adjusted.
- **The interim position, in force now.** Until this study lands, **Montree Milestones claims no
  form equivalence.** The honest interim options are (a) restrict reported growth to like-for-like
  comparisons — A→A, i.e. Autumn to Spring — and treat the Winter window as a formative check-in
  that is not used for a growth claim, or (b) continue the A/B/A rotation and report growth only
  across three windows, never two, with the form difference named in the report. Option (a) is the
  cleaner claim and is the one this document recommends; note that adopting it requires changing the
  default rotation in `lib/montree/evaluation/bank.ts` and `runner-engine.ts`, which currently ship
  A/B/A. Whichever is chosen, it must be written down here and in D1 §13.2 rather than left implicit.

### Study 4 — Mode equivalence (tablet vs paper)

- **Purpose.** Test the assertion that tablet and paper are the same instrument.
- **Method.** Counterbalanced within-child: each child completes one module on tablet and a matched
  module on paper, mode order randomized, same week, same assessor.
- **Target sample.** n ≈ 60 children, weighted toward A3 and A4 where fine-motor and screen-handling
  differences are most likely to bite.
- **Decision rule.** If mode accounts for a systematic band shift, the packs and the app stop being
  described as one instrument and mode is recorded and disclosed on every report that mixes them.
  Delivery mode is already stored per session, so this is reportable the day the study concludes.
- **Blocks.** Should follow Study 1, so that broken items are not mistaken for mode effects.

**Not yet scheduled, and honestly so:** differential item functioning by language and by home
language; locale-specific LCL-C and LCL-D item sets for non-English-medium classrooms; any
predictive or concurrent validity work against an external instrument. Each needs a sample larger
than the four studies above will produce.

---

## 4. Interim claim policy

What may and may not be said, by anyone, until the corresponding study lands. This section is
binding on sales material, funder reports, school-facing decks and the website alike.

| Until this lands | May say | May **not** say |
|---|---|---|
| **Study 1 — item analysis** | "The item bank is built to published construct specifications and schema-validated." · "Item behaviour has not yet been studied in the field; the first pilot is designed to do that." | "Validated items." · "Reliable." · Any statement implying the items are known to work. |
| **Study 2 — inter-rater reliability** | "Observation bands are the judgement of the teacher who knows the child, rated against three published descriptors." | "Objective." · "Consistent between teachers." · Any reliability figure, including a qualitative one. |
| **Study 3 — form equivalence** | "Forms A and B cover the same strands with the same item counts and construct specifications." | "Parallel forms." · "Equated." · "Equivalent." · Presenting a single A→B change as a clean growth measure. |
| **Study 4 — mode equivalence** | "Tablet and paper are generated from one bank and differ only in response mode." · "Mode is recorded on every session." | "Tablet and paper produce the same result." · "Mode makes no difference." |
| **Standard-setting panel** (`CUT_SCORE_PANEL_PROTOCOL.md`) | "The thresholds are conventional values, disclosed as such." | "Calibrated." · "Empirically derived thresholds." · "Benchmarked." |
| **Any norming study — not planned** | "Criterion-referenced against publicly available frameworks." | "Normed." · "Standardized." · Percentiles, age-equivalents, ranks, "months ahead/behind", or any comparison of one child to other children. |

Two standing rules that no study will lift:

1. **Contribution, not attribution.** No figure produced by this system may be used to claim that a
   programme caused a change in a child.
2. **The parent- and teacher-facing register is non-negotiable.** The vocabulary in this document
   belongs in this document. It does not belong in a Growth Story, a report footer, a classroom
   screen, or anything a family reads.

---

## 5. Maintenance

Re-issue this document, with a version bump, whenever any of the following happens: a study
completes; a threshold changes; the bank version changes materially; or a claim in section 4 moves
from the right column to the left. A change to what may be claimed is a change to this file first
and marketing copy second.

**Related documents.** `D1_framework.md` §13 (limitations) · `ARCHITECTURE.md` §2 (scoring model) ·
`BANK_AUDIT_2026-08.md` (structural audit of the evidence base) ·
`CUT_SCORE_PANEL_PROTOCOL.md` (standard-setting procedure) ·
`lib/montree/evaluation/forbidden-terms.ts` (the register).

---

*2026-08-26 — v1.0. First issue. Written as part of the accuracy pass that labelled the synthetic
worked examples in D1 and corrected the paper-pack status in ARCHITECTURE.md.*
