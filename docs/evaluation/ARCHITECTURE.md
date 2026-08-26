# Montree Milestones — System Architecture

**A developmental milestone check-in for Montessori classrooms, ages 3–5, with an English-as-a-Foreign-Language track.**

Version 1.0. Consumers: Phase-3 builders of D1–D4. Every number here is a build target, not a suggestion.

---

## 0. Naming and vocabulary (binding)

| Concept | Public name | Internal identifier |
|---|---|---|
| The system | **Montree Milestones** | `child_evaluation` (feature key) |
| A child sitting with a teacher | **a check-in** (child-facing: "Discovery Time") | `evaluation_session` |
| Three-times-a-year cadence | **check-in window** (Autumn / Winter / Spring) | `window_code` |
| Parent output | **Growth Story** | `child_report` |
| Funder output | **Cohort Milestone Report** | `cohort_report` |

**Forbidden words in any child-, parent- or teacher-facing string:** test, exam, quiz, score, grade,
mark, pass, fail, wrong, percentile, rank, above/below average, behind. Enforced by a lint list in
`lib/montree/evaluation/forbidden-terms.ts` and checked in D1/D2/D3 copy review. Rationale: report 02
§2.4.5 — Montessori schools reject the testing register outright, and they are the adopters we need.

---

## 1. Theoretical frame

### 1.1 Anchor structure

**Five domains, ELOF-shaped** (US Office of Head Start, public domain — zero licensing risk, strong
US-funder legibility), populated with **plain-language, age-banded milestone statements in the EYFS
Development Matters register** (short, concrete, observable, "can…" phrasing).

**All milestone wording is original.** We attribute the frameworks; we do not reproduce their text.
Every milestone carries crosswalk *codes* pointing at ELOF goals, EYFS ELG/Development Matters bands,
and the China MoE 3–6 Guide objectives — codes are citations, not copied content. This keeps us
clean under OGL v3.0 / US public domain / MoE reference use while giving funders a verifiable
alignment table.

**China MoE 3–6岁儿童学习与发展指南 crosswalk is an appendix, not the spine** — its five 领域
(健康/语言/社会/科学/艺术) map onto our five domains in a published table (D1 Appendix C) plus a
localized report header for the China market.

**IDELA and OECD IELS are cited for credibility only** — as evidence that the domains we track are
the domains the donor and OECD communities themselves measure. We do not reuse IDELA protocols or
claim IELS alignment. (Report 01 §4, §6.)

### 1.2 Domains and strands

Twenty-two core strands + six EFL strands. `D` = direct assessment, `O` = teacher observation.

| Domain | Code | Strands |
|---|---|---|
| Approaches to Learning & Self-Regulation | `ATL` | ATL-A Engagement & persistence `O` · ATL-B Initiative & choice-making `O` · ATL-C Flexible thinking & problem-solving `O` · ATL-D Self-regulation & impulse control `O` (+ optional `ATL-X Focus Games` `D`, extension module) |
| Social & Emotional Development | `SED` | SED-A Relationships with adults `O` · SED-B Peer interaction & cooperation `O` · SED-C Emotional knowledge & expression `O` · SED-D Grace, courtesy & community `O` |
| Language, Communication & Literacy | `LCL` | LCL-A Receptive language & listening `D` · LCL-B Expressive language & vocabulary `D` · LCL-C Phonological awareness `D` · LCL-D Print & alphabet knowledge `D` · LCL-E Emergent writing `O` |
| Cognition: Mathematics & Exploration | `COG` | COG-A Number sense & counting `D` · COG-B Quantity, comparison & early operations `D` · COG-C Shape, space & pattern `D` · COG-D Measurement, sorting & classification `D` · COG-E Scientific & world exploration `O` |
| Physical Development & Practical Life | `PPL` | PPL-A Fine motor & hand control `O` · PPL-B Gross motor & coordination `O` · PPL-C Self-care & independence `O` · PPL-D Care of environment & tool use `O` |
| **English (EFL track — parallel, separately reported)** | `EFL` | E1 Receptive vocabulary `D` · E2 Listening & instruction-following `D` · E3 Phonological awareness (English) `D` · E4 Letter–sound knowledge (SATPIN) `D` · E5 Word reading / CVC `D` · E6 Spoken production `D` (teacher-scored) |

Practical Life, gross/fine motor and social-emotional are **observation-only by design** (report 04
§5.2 — a tablet cannot measure pouring, buttoning, or real turn-taking; a tablet "empathy" item
measures emotion labelling, not social behaviour, and must not be sold as the latter).

`ATL-X Focus Games` is an **optional extension module** (2 tap-based executive-function tasks). It is
never part of the ≤15-minute core sitting and never required for a complete profile. It exists
because EF is the strongest non-academic signal in the Montessori literature (report 02 §1.2–1.3)
and funders ask for it.

### 1.3 Age bands

`A3` = 3;0–3;11 · `A4` = 4;0–4;11 · `A5` = 5;0–5;11 · `G1` = 6;0–7;11 (**Montree Canopy**, added at bank
`1.11.0` and gated per school by the `child_evaluation_g1` flag), computed from `age_months` at session start.
A child is assessed at their chronological band. If they ceiling (all items correct in a strand), the
extension rule administers up to 4 items from the band above — this is how "exceeded" is evidenced.

### 1.4 Milestone inventory

The table below is the **original three-band build target**. The shipped bank (`1.11.0`) carries a fourth
band, `G1` / Canopy, and A5 was extended with additional milestones, so the as-built totals are larger.
Both are given; the as-built column is the one to quote.

| Strand class | Strands | Build target (A3/A4/A5) | **As built, bank `1.11.0`** |
|---|---:|---:|---:|
| Direct core (LCL-A…D, COG-A…D) | 8 | 48 | **69** (A3 16 · A4 16 · A5 21 · G1 16) |
| Observation core (ATL×4, SED×4, PPL×4, LCL-E, COG-E) | 14 | 84 | **112** (28 per band × 4) |
| EFL (E1…E6) | 6 | 36 | **49** (A3 12 · A4 12 · A5 13 · G1 12) |
| **Total** | **28** | **168** | **230 milestones** |

Each milestone carries `expectation`:
- `expected` — typically expected in mainstream settings at this band. **Only these enter the
  comparative denominator.**
- `emerging_edge` — appears in some children at this band; informative, not expected.
- `extension` — belongs to the band above (e.g. E5 CVC decoding at A3). Reported as "exceeded" if met.

---

## 2. Scoring model

### 2.1 Three bands, criterion-referenced

**Emerging · Developing · Secure.** No percentiles, no peer ranking, no norm tables, ever. (Report 04
§4.1–4.2: single-school n is far too small for norms; EYFS Profile and GOLD both reject percentile
language for parents.)

### 2.2 From items to milestone bands

Each milestone declares its evidence: `evidence.itemIds[]` (direct) **or** it *is* an observation
checklist item (observation strands, 1:1).

```
points_earned  = Σ item points awarded
points_possible= Σ item max points over administered evidence
coverage       = administered evidence items / declared evidence items

if coverage < 0.5           → band = "unassessed"      (excluded from all denominators)
else ratio = earned/possible
  ratio ≥ 0.80              → "secure"
  0.40 ≤ ratio < 0.80       → "developing"
  ratio < 0.40              → "emerging"
```

Observation milestones: the teacher selects the band directly against three written descriptors
(one per band), using EYFS **best-fit** judgement — not a checkbox tally. An optional evidence note
(free text, ≤300 chars) may be attached; a photo may be linked by `montree_media.id`.

### 2.3 Teacher override (non-negotiable)

Any direct-derived milestone band may be overridden by the teacher with a required reason. Stored as
`band_final`, `band_source ∈ {direct, observation, teacher_override}`, `override_reason`. The
system augments teacher observation; it never overrules it (report 02 §2.4.6). Overrides are
flagged in funder reports as a transparency count, not hidden.

### 2.4 The comparative claim — Milestone Attainment Profile (MAP)

```
expected_assessed = milestones where expectation='expected'
                    AND age_band = child's band
                    AND band_final ≠ 'unassessed'
met               = band_final = 'secure'
exceeded          = band_final = 'secure' on an 'extension' milestone (band above)

MAP% = round_to_5( 100 × (met) / expected_assessed )
```

Rendered as: *"At this check-in, **{name}** has securely met **{MAP}%** of the
**{expected_assessed}** milestones typically expected of a {age} year-old in mainstream early-years
settings, and has additionally secured **{exceeded}** milestones from the next age band."*

Rules baked into the renderer:
- MAP% is rounded to the nearest 5 and always shown with `expected_assessed` (the n).
- If `expected_assessed < 12`, MAP% is **suppressed** and replaced with the milestone list only.
- `unassessed` counts are always printed. Nothing is silently dropped.
- Never rendered per-domain below n=6; domains fall back to a band chip (Emerging/Developing/Secure).
- EFL MAP% is computed and reported **separately** and never merged into the core figure.

### 2.5 Within-child growth — the primary evidence

For every milestone assessed in ≥2 windows, compute the band transition. Report:

> *"Since the Autumn check-in, {name} has moved up a band on **{n}** milestones, holds steady on
> **{m}**, and we are watching **{k}**."*

Growth is the headline in the parent Growth Story; MAP% is secondary context. Report 02 §4.2 and
report 04 §4.2 both point the same way: individual trajectory is defensible at small n, cross-
sectional comparison is not.

### 2.6 Defensible-claims language rules (funder-facing, binding)

Shipped as D1 §9 and as a machine-checkable list in `benchmark-map.ts`.

**Say:**
- "milestones typically expected at this age in mainstream early-years settings, as described in
  publicly available frameworks (UK EYFS Development Matters; US Head Start ELOF)"
- "consistent with", "in line with", "contributed to"
- "children in this cohort moved up a band on X% of tracked milestones over the year"
- "teacher-observed and directly-checked evidence, collected three times a year"

**Never say:**
- "proves", "caused", "because of our program" → use contribution language only (report 02 §4.2).
- any percentile, rank, IQ-like number, or "X months ahead".
- "Montessori outperforms traditional classrooms" as a blanket claim. Domain-specific, hedged,
  fidelity-scoped claims only — the Campbell review (Randolph 2023, ~0.25 SD academic / 0.33 SD
  non-academic) and the French RCT (reading d=0.68, math/EF/social comparable) both require this.
- "aligned with OECD IELS / IDELA" as an alignment claim. We cite them as domain validity, nothing more.

**Must appear in every funder report footer:** the method statement, the n, the unassessed count,
the caveat that these are criterion-referenced classroom check-ins and not psychometrically normed
instruments, the framework attributions (UK Crown/OGL v3.0; US HHS Office of Head Start; PRC MoE),
and — where flat or negative results exist — those results. Selective reporting is a build defect.

---

## 3. Administration model (Montessori-authentic)

| Parameter | Rule | Source |
|---|---|---|
| Mode | 1-on-1, teacher-administered, adult sits with child | R04 §2 |
| Setting | quiet space, never the open work floor | R04 §2 |
| Module length | ≤5 min incl. practice | R04 §2 |
| Sitting length | ≤15 min (up to 3 modules) | R04 §2 |
| Full profile | may be built across several days in one window | R04 §2 |
| Practice | 2 unscored practice items per module, feedback allowed **only here** | R04 §1.4, §2 |
| Feedback in scored items | neutral acknowledgement only (soft tone + gentle highlight); never right/wrong | R04 §3.3 |
| Close | positive closing screen for every child regardless of performance | R04 §3.3 (eFun rule) |
| Rewards | no badges, stars, points, streaks, leaderboards, or accumulating economy | R04 §3.4 |
| Narration | consistent guide character, audio for every instruction; no reading required | R04 §3.3 |
| Windows | 3× per school year: Autumn / Winter / Spring | R04 §2 |
| Interruption | teacher may pause or end at any time; partial sessions are valid data | Montessori autonomy |

Child-facing prompt language = the school's **assessment language** (`assessment_locale`, usually the
language of instruction). EFL items are always spoken in **English**, by design — that is the construct.

---

## 4. Item blueprint (exact build targets)

### 4.1 Modules

| Module | Code | Domain coverage | Scored items | Practice | Target minutes |
|---|---|---|---|---|---|
| Word & Sound Play | `M-LIT` | LCL-A…D | 16 | 2 | ≤5 |
| Number & Shape Play | `M-MATH` | COG-A…D | 16 | 2 | ≤5 |
| English Time | `M-EFL` | E1…E6 | 18 | 2 | ≤5 |
| Focus Games (optional) | `M-FOCUS` | ATL-X | 6 | 2 | ≤3 |

Core sitting = M-LIT + M-MATH + M-EFL = **50 scored items, ≤15 minutes**. Stop rules typically cut
this to 35–45 administered.

> **Scope note (2026-08).** Sections 4.1–4.3 are the original build spec for bands A3/A4/A5. Band `G1`
> (Canopy) was authored later against the same module and strand shape, so the per-module counts below
> repeat at G1 rather than being replaced by it. Where the spec and the bank disagree, the bank is
> authoritative — run `node scripts/evaluation-bank-audit.mjs` for the counts as built.

### 4.2 Items per strand × age band (per form)

**M-LIT (16 each band)** — LCL-A 4 (`tap_choice`, `listen_do`) · LCL-B 3 (`teacher_scored_oral`) ·
LCL-C 4 (`tap_choice`) · LCL-D 5 (`tap_choice`)

**M-MATH (16 each band)** — COG-A 5 · COG-B 4 · COG-C 4 · COG-D 3 (all `tap_choice`, plus one
`teacher_scored_oral` rote-counting item inside COG-A at each band)

**M-EFL (18 each band)**

| Strand | A3 | A4 | A5 | Types |
|---|---|---|---|---|
| E1 Receptive vocabulary | 6 | 6 | 6 | `tap_choice` (4-picture: target + phonological + semantic + unrelated distractor — ACCE-V design, R03 §3.2) |
| E2 Listening & instruction-following | 4 | 4 | 3 | `listen_do` |
| E3 Phonological awareness (English) | 3 | 3 | 3 | `tap_choice` |
| E4 Letter–sound (SATPIN order) | 3 | 3 | 3 | 2 `tap_choice` + 1 `teacher_scored_oral` |
| E5 Word reading / CVC | 0 | 1 | 2 | `tap_choice` (word→picture) |
| E6 Spoken production | 2 | 1 | 1 | `teacher_scored_oral` (GESE Grade-1 register) |

**M-FOCUS (6, single form, A4/A5 only recommended)** — 3 inhibition (`tap_choice` go/no-go framing)
+ 3 visuo-spatial working memory (`tap_choice` on a location grid).

**Observation checklist: 84 items** = the 84 observation milestones, 1:1. Delivered in the Montree
teacher UI and on paper; rated over the whole window, not in a sitting.

### 4.3 Forms and bank totals

Two parallel forms (**A**, **B**) per age band for M-LIT / M-MATH / M-EFL. Autumn→A, Winter→B,
Spring→A. Forms are content-matched strand-by-strand and difficulty-matched by construct spec, not
by empirical calibration (we have no calibration sample — say so in D1).

| Bucket | Build target (3 bands) | **As built, bank `1.11.0`** |
|---|---:|---:|
| M-LIT scored | 96 | **128** |
| M-MATH scored | 96 | **128** |
| M-EFL scored | 108 | **144** |
| M-FOCUS scored (single form) | 18 | **24** |
| Practice items (form-shared) | 24 | **32** |
| Observation checklist items | 84 | **112** |
| **Total item records in the bank** | **426** | **568** |
| Stimulus records (SVG/raster, deduplicated across items) | ~180 | **348** |

The gap between target and built is the fourth band plus the A5 extension milestones, not scope creep in
the original three. `scripts/evaluation-bank-audit.mjs` prints these counts from the bank itself, along
with the evidence-thinness findings recorded in `BANK_AUDIT_2026-08.md` — which are the reason the
per-milestone item counts here should be read as a floor to raise, not a target that has been met.

### 4.4 Construct specs for item writers (so items are writable without re-reading research)

Each entry: what the construct is · the required item shape · one example at each band.

- **LCL-A Receptive language & listening.** Spoken comprehension, no reading. Narrator says a sentence
  or 2-sentence story; child taps the matching picture or a tap sequence. A3: *"Tap the picture where
  the child is sleeping."* A4: *"The cat is under the table — tap the picture that shows it."* A5:
  *"Nina put on her coat, then opened the door. Tap what she did first."*
- **LCL-B Expressive language & vocabulary.** Child produces language, teacher rubric 0/1/2. A3: name
  three pictured objects. A4: *"Tell me about this picture"* (utterance length/detail). A5: *"What
  happened first, next, last?"* on a 3-panel scene (sequencing + connectives).
- **LCL-C Phonological awareness.** Audio-only prompt, 4 picture options. A3 rhyme match · A4
  initial-sound match · A5 initial-sound isolation + final sound.
- **LCL-D Print & alphabet knowledge.** A3: *"Tap the one that has writing on it."* A4: *"Tap the letter
  that makes /s/."* A5: *"Tap the word that says 'sat'."* Taught letters only (SATPIN order).
- **COG-A Number sense & counting.** A3 subitise 2 · A4 tap the numeral 5 · A5 count aloud to 20
  (teacher-scored) + "one more than four".
- **COG-B Quantity, comparison & operations.** A3 more · A4 fewer · A5 *"Three birds, two fly away —
  tap what is left."*
- **COG-C Shape, space & pattern.** A3 tap the circle · A4 next in an AB pattern · A5 next in AAB;
  positional language (*behind*).
- **COG-D Measurement, sorting & classification.** A3 longest · A4 odd-one-out · A5 sorted by two
  attributes (colour **and** size).
- **E1 Receptive vocabulary (EFL).** 4-picture array, English audio: target + phonological distractor
  (cat/cap) + semantic distractor (dog) + unrelated. Vocabulary **only from what the classroom teaches**
  (Montree Phonics / SATPIN / CVC line / class themes), coverage-checked against the ACCE-V 18-category
  taxonomy. **Never embed Cambridge Starters or Oxford wordlists** — copyrighted (R03 §4.1).
- **E2 Listening & instruction-following.** TPR ladder: 1-step supported → 1-step unsupported → 2-step →
  2-step with prepositions. Tablet analog is a tap sequence: *"Touch the ball, then the box."*
- **E3 Phonological awareness (English).** LCL-C shapes on taught English words only.
- **E4 Letter–sound (SATPIN).** Receptive: hear /s/, tap the letter. Expressive: see `s`, say the sound
  (teacher-scored). House order s a t p i n, then m d g o c k…
- **E5 Word reading / CVC.** Only words the phonics sequence has reached; word → 4 pictures. `extension` at A3.
- **E6 Spoken production.** GESE Grade-1 register (name, age, *"What is this?"*, *"What colour?"*), rubric
  0/1/2 on intelligibility + appropriateness. **Never ASR-scored** — child L2 recognition is unreliable (R03 §2).
- **Observation strands (ATL/SED/PPL/LCL-E/COG-E).** Each item = one milestone with three written band
  descriptors, observable in the normal work cycle, never a contrived task. Example (ATL-A, A4):
  *Emerging* — settles to a chosen work with adult support for a few minutes. *Developing* — chooses a
  work and stays with it through one full cycle most days. *Secure* — returns to a self-chosen work over
  several days, refining it unprompted.

---

## 5. The single source of truth: item-bank JSON schema

One file, `lib/montree/evaluation/item-bank.json`, consumed by (a) the tablet HTML app (embedded at
build/copy time), (b) the paper-pack generator, (c) the Montree API/DB. **No consumer may hold its own
copy of item content.** A checksum of this file is recorded on every session row.

```jsonc
{
  "schemaVersion": "1.0",
  "bankVersion": "1.0.0",                 // semver; bumped on ANY content change
  "bankChecksum": "sha256:…",             // of the canonicalised bank minus this field
  "generatedAt": "2026-08-02T00:00:00Z",
  "assessmentLocales": ["en", "zh"],      // languages child prompts exist in
  "attribution": {
    "elof": "US HHS, Office of Head Start — Early Learning Outcomes Framework (public domain)",
    "eyfs": "UK DfE — EYFS / Development Matters, Open Government Licence v3.0",
    "chinaMoe": "PRC Ministry of Education — 3–6岁儿童学习与发展指南 (2012)",
    "note": "Milestone wording in this bank is original. Framework codes are citations, not reproduced text."
  },

  "domains": [{
    "id": "LCL",
    "name": { "en": "Language, Communication & Literacy", "zh": "语言、沟通与读写" },
    "track": "core",                      // "core" | "efl"
    "colorToken": "language",             // reuses Montree area palette
    "sequence": 3
  }],

  "strands": [{
    "id": "LCL-C",
    "domainId": "LCL",
    "name": { "en": "Phonological awareness", "zh": "语音意识" },
    "method": "direct",                   // "direct" | "observation"
    "sequence": 3,
    "constructSpec": "Awareness of the sound structure of spoken words, independent of print.",
    "stopRule": { "type": "consecutive_incorrect", "n": 3, "scope": "strand" }
  }],

  "milestones": [{
    "id": "LCL-C.A4.1",
    "strandId": "LCL-C",
    "ageBand": "A4",                      // "A3" | "A4" | "A5"
    "expectation": "expected",            // "expected" | "emerging_edge" | "extension"
    "statement": {                        // ORIGINAL wording, EYFS register, parent-readable
      "en": "Hears when two words start with the same sound.",
      "zh": "能听出两个词的开头音相同。"
    },
    "bandDescriptors": {                  // required for observation milestones; optional for direct
      "emerging": { "en": "…" }, "developing": { "en": "…" }, "secure": { "en": "…" }
    },
    "evidence": { "itemIds": ["IT.LCL-C.A4.A.01", "IT.LCL-C.A4.A.02"], "minCoverage": 0.5 },
    "crosswalk": {
      "elof": ["P-LIT 2"],
      "eyfs": { "area": "Literacy", "band": "3-4", "elg": null },
      "chinaMoe": ["语言.阅读与书写准备.目标1(4-5岁)"],
      "montessori": { "areaKeys": ["language"], "workKeys": ["la_sound_games"] },
      "montreeEnglish": { "phase": "pink", "lessonRange": [1, 12] }
    }
  }],

  "stimuli": [{
    "id": "ST.cat.01",
    "kind": "picture",                    // picture | letter | word | numeral | quantity | shape | scene
    "label": { "en": "cat", "zh": "猫" },
    "altText": { "en": "a sitting cat" },
    "render": {
      "svgSymbolId": "sym-cat",           // <symbol id="sym-cat"> in the app's inline sprite
      "viewBox": "0 0 100 100",
      "printMinMm": 60,                   // minimum printed size on paper cards
      "monochromeSafe": true              // must remain identifiable in greyscale
    },
    "tags": ["animals", "cvc-at"]
  }],

  "items": [{
    "id": "IT.LCL-C.A4.A.01",
    "strandId": "LCL-C",
    "ageBand": "A4",
    "form": "A",                          // "A" | "B" | "P" (practice)
    "moduleId": "M-LIT",
    "sequence": 9,
    "type": "tap_choice",                 // tap_choice | listen_do | teacher_scored_oral | observation_checklist
    "promptLang": "assessment",           // "assessment" (school language) | "en" (EFL, fixed)
    "prompt": {
      "audio":   { "en": "Which one starts with the same sound as 'sun'?", "zh": "哪一个和 sun 的开头音一样？" },
      "onScreen":{ "en": "same first sound as SUN" },        // teacher-visible, small
      "teacherScript": { "en": "Say: 'Which one starts with the same sound as sun?' Repeat once if asked." }
    },
    "options": [                          // 3 or 4; default 4; ≥2cm targets enforced by renderer
      { "id": "o1", "stimulusId": "ST.sock.01" },
      { "id": "o2", "stimulusId": "ST.cat.01" },
      { "id": "o3", "stimulusId": "ST.moon.01" },
      { "id": "o4", "stimulusId": "ST.dog.01" }
    ],
    "scoring": {
      "method": "auto_key",               // auto_key | teacher_rubric | teacher_band
      "correctOptionIds": ["o1"],
      "maxPoints": 1,
      "rubric": null
    },
    "timing": { "maxSeconds": null, "advanceOn": "response" },  // never a visible timer
    "repeatAllowed": true, "repeatMax": 1,
    "paper": { "cardsPerRow": 2, "responseMode": "child points, teacher circles" }
  }],

  "modules": [{
    "id": "M-LIT",
    "name": { "en": "Word & Sound Play" },
    "strandIds": ["LCL-A","LCL-B","LCL-C","LCL-D"],
    "practiceItemIds": ["IT.PRACTICE.LIT.A4.01","IT.PRACTICE.LIT.A4.02"],
    "targetMinutes": 5,
    "optional": false,
    "stopRule":      { "type": "consecutive_incorrect", "n": 5, "scope": "module" },
    "extensionRule": { "trigger": "all_correct_in_strand", "administerBandUp": true, "maxItems": 4 }
  }],

  "observationChecklists": [{
    "id": "OBS.ATL.A4",
    "domainId": "ATL",
    "ageBand": "A4",
    "milestoneIds": ["ATL-A.A4.1", "ATL-A.A4.2", "…"],
    "guidance": { "en": "Rate from what you have seen in the work cycle this term. Best fit, not a checklist." }
  }],

  "scoring": {
    "bands": ["emerging","developing","secure"],
    "milestoneThresholds": { "secure": 0.80, "developing": 0.40 },
    "minCoverage": 0.5,
    "mapSuppressionMinN": 12,
    "domainBandMinN": 6
  }
}
```

**Schema invariants** (validated by `scripts/curriculum/validate-item-bank.mjs`, exit-code gated):
1. Every `item.strandId`, `milestone.strandId`, `strand.domainId` resolves.
2. Every `evidence.itemIds[]` entry exists **and** shares the milestone's `ageBand` (or is an
   extension item explicitly tagged).
3. Every `option.stimulusId` resolves; every stimulus has an `svgSymbolId` present in the app sprite.
4. Every `tap_choice` has 3–4 options and ≥1 `correctOptionIds`.
5. Every `teacher_scored_oral` has a `rubric` with exactly the score levels 0,1,2.
6. Every observation milestone has all three `bandDescriptors`.
7. Item counts per module × band × form match §4.2 exactly.
8. Every milestone has non-empty `crosswalk.elof` **and** `crosswalk.eyfs` (China codes may be null in v1).
9. No milestone statement or descriptor contains a forbidden term (§0).
10. `assessmentLocales` coverage: every `prompt.audio` and `milestone.statement` present in every locale.

---

## 6. Deliverable specifications

### D1 — Methodology & Framework document (~15–25 pp, funder + parent facing)

Two builds from one source: **D1-F (funder, full)** and **D1-P (parent, 4-page extract)**.

1. **What this is, in one page** — a developmental check-in, not a test; three times a year; 15 minutes; one-on-one.
2. **Why we built it** — the market gap: no Montessori record system translates a child's progress into
   language a funder or a parent from a mainstream background can read (R02 §3).
3. **The evidence base** — Lillard & Else-Quest 2006; Lillard 2017 (equalisation); Randolph 2023 Campbell
   review (~0.25/0.33 SD, fidelity-conditional); PNAS 2025 national RCT (>0.20 SD by end of kindergarten,
   ~$13k/child lower cost); Courtier French RCT (reading d=0.68, other domains comparable — printed, not hidden).
4. **The frameworks we anchor to** — ELOF structure, EYFS register, China MoE crosswalk, IDELA/IELS as
   domain-validity citations. Licensing and attribution table.
5. **Domain and strand map** — the table from §1.2, with a plain-English gloss per strand.
6. **How a check-in runs** — administration rules (§3), what the child experiences, what the teacher does.
7. **How we score** — three bands, milestone→band rule, coverage/unassessed handling, teacher override.
8. **What "compared to a traditional classroom" means and does not mean** — the MAP definition (§2.4),
   worked example with numbers, and an explicit "what this figure is not" box.
9. **Defensible claims — our rules** — the say/never-say table (§2.6) reproduced verbatim, plus the
   contribution-vs-attribution explanation and the fidelity caveat.
10. **Growth over time** — why within-child trajectory is our primary evidence at small n.
11. **The English track** — separate reporting, criterion-referenced to what the classroom teaches,
    no CEFR/Cambridge level claims at this age and why (R03 §1.4).
12. **Privacy & data** — what is stored, what is deleted, who can see it, tenancy.
13. **Limitations, honestly** — no calibration sample, forms matched by construct not psychometrics,
    observation strands depend on teacher judgement, small n, no causal inference.
14. **Appendix A** — full milestone list, all 168, with band and expectation.
15. **Appendix B** — ELOF/EYFS crosswalk table.
16. **Appendix C** — China MoE 3–6 Guide crosswalk (五大领域 × 3 age bands).
17. **Appendix D** — administration script (identical to the tablet/paper script).
18. **Appendix E** — references.

D1-P (parents) = sections 1, 5, 6, 7, 8's "what this is not" box, 10, 12 — rewritten warm, no jargon,
in the register of Montree's existing parent reports ("Not templates. Genuine, detailed accounts").

### D2 — Tablet app: ONE self-contained HTML file

**File:** `evalsys/build/montree-milestones.html` (target ≤700 KB, hard ceiling 1.2 MB).
No build step, no npm, no CDN, no external images, no network calls after first load. Opens by
double-click or from a USB stick; works in iPad Safari and Android Chrome, offline.

**Structure inside the single file**
- `<style>` — all CSS, no framework.
- `<svg style="display:none">` — one sprite of `<symbol>` stimuli (all ~180), authored in-file.
- `<script type="application/json" id="item-bank">` — the full item bank JSON, verbatim from §5.
- `<script>` — the whole app: router, session engine, scorer, exporter. Vanilla ES2020, no modules.

**Screens**
1. **Home** — EN/中文 toggle (teacher chrome only), child name (free text or "Demo child"), date of
   birth → auto age band (override allowed), window selector, form A/B (auto by window, overridable),
   module checkboxes, **Demo mode** switch (no login, nothing persisted, export disabled to avoid
   fake data reaching Montree).
2. **Teacher briefing** — the verbatim script for the selected modules, printable, and a
   "check the sound" button that speaks a test sentence via Web Speech API.
3. **Practice** — 2 items per module. Feedback allowed here only: a gentle tick + tone on correct,
   a "let's try that one together" re-show on incorrect. Not scored, not exported as responses.
4. **Item screen** — narrator character (a simple SVG figure, consistent throughout) at top-left;
   prompt auto-spoken on entry; a large **replay** button (speaker icon, ≥96 px); 2×2 option grid
   for `tap_choice`; for `listen_do`, tap targets highlight in sequence-capture mode; for
   `teacher_scored_oral`, the stimulus fills the screen and a **teacher panel** (0/1/2 with rubric
   text) opens behind a 1.5 s long-press on the top-right corner so a child cannot open it.
   No progress bar visible to the child; a small dot counter is visible to the teacher only.
5. **Between-module rest** — "Take a break?" with Continue / Pause / Finish.
6. **Positive close** — always the same warm animation and line ("Thank you for playing with me
   today"), regardless of performance.
7. **Results** — teacher-only, reached by long-press. Shows per-strand band chips, milestone list
   with bands, unassessed count, MAP% (suppressed under n=12 with the reason shown), and a
   "teacher override" control per milestone. Then: **Download JSON** (the session payload, §6-D4 shape)
   and **Print summary** (a `@media print` stylesheet producing a 1-page A4 sheet).

**Interaction rules (hard)**
- Minimum tap target **96 × 96 CSS px** (≈2.5 cm on a 9.7–11" tablet), minimum gap 24 px. Option
  images are 220 px+ where layout allows.
- **Single tap only.** No double-tap, no drag, no swipe, no multi-touch, no pinch. `touch-action:
  manipulation`, `user-select:none`, `-webkit-touch-callout:none`.
- Response registered on `pointerup` with **no dwell-time limit** (children under 4 hold up to 5.1 s)
  and a 12 px movement tolerance.
- Debounce 400 ms after a registered response to prevent accidental double-advance.
- No visible timers. Response latency is recorded silently for telemetry only.
- Landscape-locked layout advisory; layout also works portrait.

**Audio**
- `speechSynthesis` with `lang` from `promptLang` (`en-GB`/`en-US` for EFL; assessment locale otherwise),
  `rate: 0.85`, `pitch: 1.0`. Voice chosen once and cached.
- **Fallback chain:** if `speechSynthesis` is unavailable, blocked, or reports no matching voice, the
  item screen shows the `prompt.teacherScript` in a bordered panel and the teacher reads it aloud.
  The app must be fully usable with audio dead — this is a stated requirement, not a degradation.
- A one-time "tap to enable sound" gate satisfies iOS autoplay policy.

**Persistence & recovery** — session state autosaved to `localStorage` after every response under
`mm.session.<uuid>`; the Home screen offers "Resume unfinished check-in". Demo mode never writes.

**i18n** — teacher chrome strings in `en` + `zh` inside the file. Child-facing prompts come from the
bank. The eventual in-Montree surface must supply all 12 Montree locales; the standalone file ships
EN + ZH and is explicitly labelled as the pilot/standalone build.

### D3 — Paper packs (printable HTML → PDF)

**Generator:** `evaluation-kit/paper/src/build-paper-packs.mjs` reads the **same** `item-bank.json` and
emits one self-contained HTML document per pack; `evaluation-kit/paper/src/render.mjs` prints those to PDF
via headless Chromium (Playwright), unit by unit so each section carries its own `N OF M`. Zero
hand-authored item content — if the bank changes, the packs regenerate. `src/render-one.mjs` renders a
single pack with an on-disk unit cache, for environments that cannot hold a long-running process.

**Output files (as built, 2026-08-26):** eight band packs —
`D3_paper_pack_{A3,A4,A5,G1}_form{A,B}.pdf` — plus `D3_scoring_sheets_only.pdf`, the reprint set of just
the sheets that get written on, covering all eight combinations. The Canopy (`G1`) packs were added on
2026-08-26; before that the renderer's filename pattern matched `A\d` only and silently produced nothing
for G1, which is why the earlier kit shipped six packs rather than eight.

**Sections inside each band pack** — these are sections of one PDF, not separate files:
1. **Teacher script** — verbatim administration script, one item per block, with the single line that
   differs from tablet delivery flagged in the margin (*"on paper: child points, you circle"*). Includes
   practice items and stop-rule instructions.
2. **Stimulus cards (child pages)** — A4, 4 cards per sheet, each card ≥60 mm, cut marks, item ID printed small in
   the corner. Greyscale-safe (no item may depend on colour alone unless colour *is* the construct, in
   which case the item is tagged `requiresColor: true` and the pack prints a colour warning page).
3. **Record sheet** — one A4 per module: item rows with circle-the-response boxes, per-strand
   subtotals, milestone band boxes, and a transfer block (the numbers a teacher types into Montree).
4. **Observation booklet** — the 28 observation milestones for that band, three band descriptors
   printed under each, tick-one-box, plus an evidence-note line.
5. **English Time (`M-EFL`) — script, cards and record sheet, as a section inside the band pack.** There
   is **no standalone EFL booklet.** An earlier revision of this document specified one; it was never
   built, and the EFL material is instead emitted inline by `build-paper-packs.mjs` alongside Word & Sound
   Play and Number & Shape Play, sharing the pack's cover, guide and band-lookup pages. If a school needs
   to hand English Time to a different teacher, the current answer is the scoring-sheets-only reprint plus
   the relevant script pages, not a separate deliverable.

**Equivalence rules (from R04 §5.1):** same stimulus set, same wording, same order, same stop rules;
the *only* permitted difference is response mode (tap vs point-and-circle) and the absence of audio
narration (teacher reads the identical script). Paper must never gain teacher judgement where tablet
is auto-scored, and tablet must never gain scaffolding paper lacks. The generator asserts this by
refusing to emit a pack if any item in scope has `paper.responseMode` missing.

Fonts: house canvas fonts (Andika/Lora/Outfit per the existing pipeline). A4 portrait, 15 mm margins.

### D4 — Montree integration

```
migrations/314_montree_evaluation_system.sql
lib/montree/evaluation/
  types.ts              # TS types generated from the JSON schema (§5) — hand-written, kept in sync
  item-bank.json        # THE single source of truth
  scoring.ts            # itemsToMilestoneBands(), computeMAP(), computeGrowth(), applyOverride()
  benchmark-map.ts      # crosswalk lookups + claims-language constants + forbidden-term list
  forbidden-terms.ts
  validate.ts           # runtime bank validation (same rules as the CLI validator)
app/api/montree/evaluation/
  sessions/route.ts                       # POST start, GET list (school-scoped)
  sessions/[sessionId]/items/route.ts     # POST submit item response (idempotent on itemId)
  sessions/[sessionId]/complete/route.ts  # POST finalize: score → milestone results → summary
  child/[childId]/report/route.ts         # GET Growth Story payload
  cohort/report/route.ts                  # GET Cohort Milestone Report (funder)
README_INTEGRATION.md
```

**Route rules (non-negotiable, from R05 §5):** every route calls `verifySchoolRequest()`; every route
touching a `childId` calls `verifyChildBelongsToSchool()`; every route checks
`isEnabled(schoolId, 'child_evaluation')` and returns a friendly 503 `{ available:false }` when off or
when the migration has not run (42703/42P01 → `{ migration_pending:true }`, never a 500). Reads
`montree_child_progress` and `montree_child_english_progress` for the Montessori/English position side
of the report — **read-only, never written to**. Any LLM call that writes durable narrative pins
`temperature: 0`.

**Ordering rule (migration-311 lesson):** `complete` verifies its target columns exist before writing, and
**nothing is deleted** on commit — this module stores no raw media, so the delete-after-commit hazard cannot recur.

#### DDL sketch — `migrations/314_montree_evaluation_system.sql`

```sql
-- 314_montree_evaluation_system.sql — Montree Milestones. Fully idempotent, safe to paste twice.
-- Supersedes the dormant migration-034 assessment_sessions/assessment_results draft (bare `children` FK).
BEGIN;

CREATE TABLE IF NOT EXISTS montree_evaluation_bank_versions (
  bank_version   TEXT PRIMARY KEY,
  bank_checksum  TEXT NOT NULL,
  item_count     INTEGER NOT NULL,
  milestone_count INTEGER NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS montree_evaluation_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id   UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  child_id       UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  administered_by_role TEXT CHECK (administered_by_role IN ('teacher','principal','system')),
  administered_by_id   UUID,
  school_year    TEXT NOT NULL,                                     -- '2026-2027'
  window_code    TEXT NOT NULL CHECK (window_code IN ('autumn','winter','spring')),
  term_id        UUID,                                              -- optional montree_school_terms
  age_months     INTEGER NOT NULL CHECK (age_months BETWEEN 24 AND 84),
  age_band       TEXT NOT NULL CHECK (age_band IN ('A3','A4','A5')),
  form_code      TEXT NOT NULL DEFAULT 'A' CHECK (form_code IN ('A','B')),
  modules        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  delivery_mode  TEXT NOT NULL DEFAULT 'tablet' CHECK (delivery_mode IN ('tablet','paper','observation_only')),
  assessment_locale TEXT NOT NULL DEFAULT 'en',
  bank_version   TEXT NOT NULL,
  bank_checksum  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress','completed','abandoned')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  duration_seconds INTEGER,
  map_percent           INTEGER,          -- NULL when suppressed
  map_denominator       INTEGER,
  milestones_secure     INTEGER,
  milestones_developing INTEGER,
  milestones_emerging   INTEGER,
  milestones_unassessed INTEGER,
  milestones_exceeded   INTEGER,
  efl_map_percent       INTEGER,
  efl_map_denominator   INTEGER,
  summary_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, school_year, window_code, delivery_mode)
);

CREATE TABLE IF NOT EXISTS montree_evaluation_item_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES montree_evaluation_sessions(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL,            -- denormalised tenancy stamp (mig-311 lesson)
  child_id      UUID NOT NULL,
  item_id       TEXT NOT NULL,            -- stable bank key, never free text
  strand_id     TEXT NOT NULL,
  module_id     TEXT NOT NULL,
  age_band      TEXT NOT NULL,
  form_code     TEXT NOT NULL,
  item_type     TEXT NOT NULL CHECK (item_type IN
                 ('tap_choice','listen_do','teacher_scored_oral','observation_checklist')),
  response      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {optionIds:[], sequence:[], rubricScore:n}
  points_awarded INTEGER NOT NULL DEFAULT 0,
  points_possible INTEGER NOT NULL DEFAULT 1,
  is_correct    BOOLEAN,
  attempts      INTEGER NOT NULL DEFAULT 1,
  replay_count  INTEGER NOT NULL DEFAULT 0,
  latency_ms    INTEGER,
  administered  BOOLEAN NOT NULL DEFAULT TRUE,       -- FALSE = skipped by stop rule
  skipped_reason TEXT,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, item_id)
);

CREATE TABLE IF NOT EXISTS montree_evaluation_milestone_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES montree_evaluation_sessions(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL,
  classroom_id  UUID NOT NULL,
  child_id      UUID NOT NULL,
  milestone_id  TEXT NOT NULL,
  strand_id     TEXT NOT NULL,
  domain_id     TEXT NOT NULL,
  track         TEXT NOT NULL DEFAULT 'core' CHECK (track IN ('core','efl')),
  age_band      TEXT NOT NULL,
  expectation   TEXT NOT NULL CHECK (expectation IN ('expected','emerging_edge','extension')),
  band_computed TEXT CHECK (band_computed IN ('emerging','developing','secure','unassessed')),
  band_final    TEXT NOT NULL CHECK (band_final IN ('emerging','developing','secure','unassessed')),
  band_source   TEXT NOT NULL CHECK (band_source IN ('direct','observation','teacher_override')),
  override_reason TEXT,
  coverage      NUMERIC(4,3),
  points_earned INTEGER, points_possible INTEGER,
  evidence_note TEXT,
  evidence_media_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_meval_sessions_child   ON montree_evaluation_sessions (child_id, school_year, window_code);
CREATE INDEX IF NOT EXISTS idx_meval_sessions_school  ON montree_evaluation_sessions (school_id, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_meval_sessions_class   ON montree_evaluation_sessions (classroom_id, school_year);
CREATE INDEX IF NOT EXISTS idx_meval_responses_session ON montree_evaluation_item_responses (session_id);
CREATE INDEX IF NOT EXISTS idx_meval_results_child    ON montree_evaluation_milestone_results (child_id, milestone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meval_results_school   ON montree_evaluation_milestone_results (school_id, track, band_final);

CREATE OR REPLACE FUNCTION fn_montree_evaluation_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meval_sessions_updated ON montree_evaluation_sessions;
CREATE TRIGGER trg_meval_sessions_updated BEFORE UPDATE ON montree_evaluation_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_montree_evaluation_touch_updated_at();
DROP TRIGGER IF EXISTS trg_meval_results_updated ON montree_evaluation_milestone_results;
CREATE TRIGGER trg_meval_results_updated BEFORE UPDATE ON montree_evaluation_milestone_results
  FOR EACH ROW EXECUTE FUNCTION fn_montree_evaluation_touch_updated_at();

ALTER TABLE montree_evaluation_bank_versions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_item_responses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_milestone_results  ENABLE ROW LEVEL SECURITY;
-- House style: RLS enabled for Advisor hygiene; tenancy is enforced in the API layer.
DROP POLICY IF EXISTS "Service role full access on montree_evaluation_sessions" ON montree_evaluation_sessions;
CREATE POLICY "Service role full access on montree_evaluation_sessions"
  ON montree_evaluation_sessions FOR ALL USING (true) WITH CHECK (true);
-- (repeat the same policy idiom for the other three tables)

INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES ('child_evaluation', 'Montree Milestones',
        'Three-times-a-year developmental milestone check-ins with parent and funder reports.',
        'ClipboardCheck', 'assessment', false, false)
ON CONFLICT (feature_key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      icon = EXCLUDED.icon, category = EXCLUDED.category;

COMMIT;
```

**Session payload contract** (tablet export → `POST /sessions` + item posts, or one bulk import):

```jsonc
{ "bankVersion":"1.0.0", "bankChecksum":"sha256:…",
  "session":{ "childRef":"…","schoolYear":"2026-2027","windowCode":"autumn","ageMonths":52,
              "ageBand":"A4","formCode":"A","modules":["M-LIT","M-MATH","M-EFL"],
              "deliveryMode":"tablet","assessmentLocale":"en","startedAt":"…","completedAt":"…" },
  "responses":[{ "itemId":"IT.LCL-C.A4.A.01","response":{"optionIds":["o1"]},
                 "pointsAwarded":1,"pointsPossible":1,"latencyMs":4210,"replayCount":1,
                 "administered":true }],
  "observations":[{ "milestoneId":"ATL-A.A4.1","band":"developing","note":"…" }] }
```

The server **re-scores from the bank** — it never trusts client-computed bands. Client `pointsAwarded`
is stored for audit but `band_computed` is derived server-side from `scoring.ts`.

---

## 7. Build order and risks

**Order:** bank schema + validator → item authoring (426 records) → D2 tablet (bank embedded) →
D3 generator (same bank) → D4 migration + lib + routes → D1 written last, against what actually shipped.

**Risks the orchestrator should hold:**
1. **No calibration sample.** Forms A/B are matched by construct, not psychometrics; the 0.80/0.40
   thresholds are conventional, not empirical. D1 §13 must say so plainly, and MAP% must never be
   quoted to a funder without the n and the caveat.
2. **The 426-item authoring load is the critical path**, and the SVG stimuli (~180 in-file symbols) are
   the largest single chunk of D2's build.
3. **Milestone wording must be original.** A builder paraphrasing EYFS too closely creates a licensing
   problem the whole funder story rests on. Validator rule 9 catches forbidden terms, not plagiarism —
   this needs a human review pass.
4. **China sensitivity:** the MoE crosswalk is needed for local trust, but the MoE document is explicitly
   *not* an evaluative standard (不是评价标准). Never present the crosswalk as MoE endorsement.
5. **Adoption risk is a copy risk, not a technical one.** If any surface reads like a test, Montessori
   schools reject it regardless of how good the model is.

---

*2026-08-26: accuracy pass — synthetic examples labeled, paper-pack status corrected. §1.3 adds band `G1`; §1.4 and §4.3 now carry as-built counts (230 milestones, 568 items, 348 stimuli) beside the original three-band build targets; §D3 records that the standalone `efl-pack.pdf` was never built and that English Time ships as a section inside each band pack, and that the Canopy (`G1`) packs were rendered on 2026-08-26 after a filename-pattern bug in `render.mjs` was fixed. Companion documents: `EVIDENCE_STATUS.md`, `CUT_SCORE_PANEL_PROTOCOL.md`, `BANK_AUDIT_2026-08.md`.*
