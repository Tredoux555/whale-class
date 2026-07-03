# Photo Recognition — Canonical Global Seed
### Design conversation & handoff (for Fable → to plan for Sonnet)

**Date:** 3 July 2026
**Author of this writeup:** Opus (design conversation with Tredoux)
**Purpose:** Capture the full design discussion so Fable can turn it into a concrete build plan for Sonnet to execute 3×3×3.
**Companion file in this zip:** `curated-visual-memory-SAMPLE.json` — a 5-work format sample of the deliverable.

---

## 1. The problem (Tredoux's framing)

Montree's photo-ID system reads a classroom photo, identifies the Montessori work, the teacher tags the child, and the system backs it against the child's profile/progress to place them on the Montessori path (guided by Guru). It works beautifully **once a classroom is warm** — but recognition has degraded, and the failure surfaced hard **on cold start**.

The root of the degradation: at some point the global/reference definitions were seeded from **Tredoux's own Whale classroom photos**. That's a biased source. A single classroom only ever photographs each work **alone**, from its own angles, in its own light — never beside its look-alike. So the reference descriptions inherit that classroom's quirks and, critically, contain **no discriminative "this is NOT the other one" signal**.

Concrete failure (the "Bright Stars" incident, Jul 3): on a brand-new account with zero classroom visual memory, a standard **Cylinder Block** photo was confidently mis-tagged as **Spindle Boxes** at ~0.85 confidence. The system could not self-correct because the classroom had no moat yet, and the global reference for Cylinder Blocks carried Whale-photo bias with no negative discriminators.

**Baseline requirement Tredoux is asserting:** on a cold start with a brand-new classroom, the system must *at minimum* accurately identify the **standard Montessori works that already exist in the curriculum**. Those are globally standardized, manufactured-to-spec materials — the system has no excuse to miss them.

---

## 2. The proposal (Tredoux's idea)

Not a rebuild — a **better data source for the reference definitions**:

1. For each standard curriculum work, gather several reference images (≥5) of what that work actually looks like.
2. Have **Opus author a canonical checklist** per work — the common denominators of what the work looks like ("what it IS"), plus explicit "what it ISN'T."
3. Put the **sharpest effort on the look-alike pairs** — compare the confusable works and write clear, distinguished differences.
4. That checklist becomes what **Haiku backs the photo against** when deciding which work to tag.

The result is the same self-learning system, but the **cold-start reference layer** is built from canonical material specs instead of one teacher's classroom. Teachers can still add works, and Haiku's description still becomes the definition for genuinely new/custom works — that pipeline is unchanged.

---

## 3. Opus's honest assessment

**The idea is sound, and lower-risk than "a revamp from the ground up."** It is a **seed-data-quality swap** into infrastructure that already exists — same table, same idempotent seed script, same privacy contract. We are changing *where the reference text comes from*, not rebuilding the pipeline.

**Why it directly fixes the cold-start defect:** the Jul 3 Fable "Master Brain v1" work (migration 281) already made the global visual memory feed the **image-arbitration stage (Pass 2b)** as candidates *on cold classrooms*. So better global descriptions are **exercised immediately** on a brand-new school. The lever is already wired; only the data quality is weak.

**The one honest ceiling — flagged so nobody oversells it:** the hardest cases are confusion pairs (Cylinder Blocks vs Spindle Boxes, Red Rods vs Number Rods). In *text*, their descriptions naturally converge; in *images* they are obviously different. Better canonical descriptions raise the floor substantially, and the **discriminative negatives are the actual weapon**. But the durable win is those checklists **plus** the Pass 2b image-arbitration stage firing on cold classrooms — which is exactly what Fable's Jul 3 fix already began (global VM → Pass 2b candidates + cross-area counterpart injection). **They are complementary, not either/or.** Predicted output:
- **Near-certain win** on visually distinctive works (Pink Tower, Brown Stair, Golden Beads, Red Rods).
- **Meaningful-but-verify** on the confusion pairs — which is why we pilot on the hard ones first and *measure* before scaling.

---

## 4. Method decision (important for the plan)

Tredoux's picture was "scan the internet, pull 5 photos per work, average the common denominators." The agreed refinement:

- **Author from standardized material specs** (these works are manufactured to a known spec that Opus knows precisely), **verified against reference images where a work is genuinely ambiguous or has manufacturer variants worth capturing.** This produces sharper, more discriminative checklists than a blind scrape/average.
- **Flag any work where human eyes are genuinely needed** rather than guessing.
- **The stored artifact is TEXT only** — the authored checklist. No photos are stored. This preserves the existing privacy/copyright posture (per the Jul 3 privacy contract, the global table holds only generic descriptions of standard materials — no photos, no child data, no classroom names).

**Same deliverable Tredoux pictured** (a positives-and-negatives checklist per work), higher fidelity, and no photo-storage/copyright exposure.

---

## 5. Grounded architecture map (from reading the live code)

This is the technical reality Sonnet will build against. All facts below were read from the repo, not assumed.

### 5.1 Global table
- **Table:** `montree_global_visual_memory` (migration `281_global_visual_memory.sql`).
- **Columns:** `id`, `work_key TEXT NOT NULL UNIQUE`, `work_name TEXT`, `area TEXT`, `visual_description TEXT NOT NULL`, `key_materials TEXT[]`, `negative_descriptions TEXT[]`, `source TEXT` (`'whale_seed' | 'curated'`), `source_classroom_id UUID` (provenance only, no FK), `description_confidence NUMERIC DEFAULT 0.85`, `is_active BOOLEAN DEFAULT TRUE`, timestamps.
- **Keyed by `work_key` (UNIQUE)** — one row per standard work.
- Index: `idx_global_vm_active_work_key` on `(work_key) WHERE is_active`.
- RLS deny-all; service-role reads bypass. **Runtime read-only** — no school writes to it (no poison vector).
- Telemetry columns added to `montree_pipeline_telemetry`: `global_vm_injected_count`, `has_global_vm_for_match`.

### 5.2 Seed script
- **File:** `scripts/seed-global-visual-memory.mjs` — idempotent (`ON CONFLICT (work_key) DO UPDATE`), has `--dry-run`.
- **Current sources, in precedence:**
  1. **Whale classroom** rows from `montree_visual_memory` (classroom_id = Whale), `is_custom=false`, `source IN ('teacher_setup','correction')`, `confidence >= 0.80`, non-`custom_%` work_keys. Descriptions <40 chars skipped; confidence capped at 0.95.
  2. **`CURATED_ENTRIES`** — a hardcoded array of only **~8** hand-authored works today, injected **only if Whale doesn't already have that work_key.**
  3. **`CURATED_NEGATIVES`** — a `work_key → string[]` map of confusion-pair discriminators, merged onto both Whale and curated rows (60-char-prefix dedupe, cap 50).
- **Canonical guard:** every work_key is validated against the static curriculum map loaded from `lib/curriculum/data/*.json` (`work.id`). Non-canonical/retired keys are rejected.
- `visual_description` cap ~900 chars (`DESC_CAP`), scrubbed of roster names; supports multi-fingerprint entries joined by ` || `.

> **The precedence is the thing to flip.** Today Whale is primary and curated is fallback. The proposal makes **curated authoritative for standard works**, with Whale demoted to fallback/augmentation only. That precedence flip is a core plan decision (see §7).

### 5.3 Confusion registry
- **File:** `lib/montree/work-matching.ts`.
- `CROSS_AREA_CONFUSION_WORK_NAMES` (Set) and `CROSS_AREA_CONFUSION_COUNTERPARTS` (Record) currently register **only cross-area pairs:**
  - Red Rods (sensorial) ↔ Number Rods (mathematics)
  - Metal Insets (language) ↔ Geometric Cabinet (sensorial)
  - Cylinder Blocks 1–4 / combined (sensorial) ↔ Spindle Boxes (mathematics)
- Helpers: `isCrossAreaConfusable(...)`, `getCrossAreaCounterparts(...)`.
- **Same-area** confusions (e.g. Color Box 1/2/3) are handled by Pass 2b per-area candidate fill, not this registry.

### 5.4 Two-pass pipeline + where global VM lands in the prompt
- **File:** `lib/montree/photo-identification/two-pass.ts` (+ `context-loader.ts`).
- **Pass 1** (Haiku + image): describes the photo (`visualDescription`, ≤600 chars).
- **Pass 2** (Haiku + text): matches the description to curriculum. System prompt = cached static prefix (`PASS2_STATIC_INSTRUCTIONS` + `VISUAL_ID_GUIDE`, ~3–4K tokens) **+** dynamic suffix (per-locale + corrections + classroom `visualMemoryContext` + `globalVisualMemoryContext`). Two ephemeral cache breakpoints.
- **Pass 2b** (Haiku + image, the discriminator): re-examines the actual image against A/B/C candidates. **Fires when:** cross-area confusable **OR** confidence < 0.85 **OR** no classroom visual memory for the match. `buildPass2bCandidates()` (MAX 5) prioritises: Haiku's guess → **cross-area counterparts (uses GLOBAL entries — the cold-start fix)** → same-area classroom → other-area classroom → matcher top candidates → **same-area global fillers (cold-start path).**
- **Prompt render format of a global VM row** (this is what the authored fields become):
  ```
  LIBRARY-VERIFIED WORKS (baseline descriptions of STANDARD Montessori materials):

  - "Work Name" (area):
    LOOKS LIKE: <visual_description>
    KEY MATERIALS: <key_materials, comma-sep>
    DISTINGUISH FROM: <negative_descriptions, semicolon-sep>
  ```
- **Budget:** shared ~20KB char budget (v2) across classroom + global blocks, 40-entry ceiling; **discriminator-carrying entries (confusion pairs) are packed first**; classroom-present works deduped out of the global block.
- **`montree_global_visual_memory` NEVER satisfies Gate A Path 1 in v1** — `hasVisualMemoryForMatch` stays classroom-only. Global is a Pass 2 hint + Pass 2b candidate source, not an auto-file authority. (Design guardrail from Jul 3; keep it.)

### 5.5 Standard-works source of truth
- **Files:** `lib/curriculum/data/{practical-life,sensorial,math,language,cultural}.json`; loader `lib/montree/curriculum-loader.ts` (`loadAllCurriculumWorks()`).
- **`work_key = work.id`** in the JSON (e.g. `se_cylinder_block_1`, `ma_spindle_box`). Pattern `{area_prefix}_{slug}`.
- **Counts:** Practical Life 83, Sensorial 35, Math 57, Language 45, Cultural 50 → **~270 standard (non-custom) works total.** (Migration 281 seeded ~235 rows; the gap between 235 and 270 is part of the scope question.)

### 5.6 Per-classroom table (mirrors the global one)
- `montree_visual_memory` (migration 138): per-classroom moat. Same `visual_description` / `key_materials` / `negative_descriptions` fields render into the identification prompt the same way. Adds `classroom_id`, usage metrics, `source ('correction'|'first_capture'|'teacher_manual')`. This is unchanged by the proposal — it's the warm-classroom moat that keeps growing per school.

---

## 6. The build arc (disciplined sequence)

Full database is the destination; the smart path there is batched, with a measured checkpoint. **Batch 1 is the first slice of the full run, not a detour.**

1. **Author a small format sample** (5 works incl. the exact failure pair) → *done, see companion JSON.*
2. **Format sign-off** from Tredoux (or Fable) before scaling authoring.
3. **Author full confusion set + distinctive basics (batch 1, ~15–20 works).**
4. **Wire curated data into the seed script** — extract to a data file the script reads; **flip precedence so curated is authoritative for standard works.**
5. **Dry-run seed** (`--dry-run`); confirm every curated `work_key` resolves against the canonical curriculum; review the upsert report.
6. **Seed prod + re-test the real Bright Stars cold-start** (Cylinder Block that got tagged Spindle Boxes). **Measure old-seed vs new-seed.** This number decides scaling.
7. **Scale to the full ~270 standard works** on the approved template, then re-seed.

**Rationale for measuring at step 6:** if the new descriptions flip Bright Stars to correct, the description layer was the lever and the full run is clearly worth it. If they *don't*, the bottleneck is Pass 2b image-arbitration firing/quality on cold classrooms — and we've saved authoring 250+ checklists that wouldn't have moved the needle.

---

## 7. Decisions locked vs open (for Fable to resolve into the plan)

### Locked (agreed in the conversation)
- Curated, reference-grounded checklists become the **authoritative** reference for standard works; Whale-derived rows demote to fallback/augmentation.
- **Discriminative negatives ("NOT its look-alike") are the core weapon**, mutual on both sides of every confusion pair.
- **Text-only artifact** — no photos stored; privacy/copyright posture preserved.
- **Batch-1-first with a measured before/after** on the real Bright Stars failure before scaling to ~270.
- **Do not** let global VM satisfy Gate A Path 1 in v1 (keep `hasVisualMemoryForMatch` classroom-only).

### Open (Fable's call in the plan)
1. **Precedence-flip mechanics.** How exactly to make curated authoritative — replace Whale rows for authored work_keys, or keep Whale as a secondary fingerprint appended via ` || `? Preserve Whale's genuine multi-angle fingerprints where they help?
2. **Curated data home.** Extract `CURATED_ENTRIES` from inline JS in the seed script to a reviewable data file (e.g. `scripts/data/*.json`) that the script imports. Recommended, but confirm shape.
3. **Confusion-registry expansion.** Registering a new confusion pair currently means: add to the Set + the counterpart map (both directions) + seed-script negatives + re-run seed. Which additional pairs (same-area ones like Color Box 1/2/3, Knobbed/Knobless Cylinders, Sandpaper Letters/Moveable Alphabet, Pink Tower/Brown Stair) get registered vs handled purely by authored negatives?
4. **Scope of "standard works."** ~270 curriculum works vs the ~235 already seeded — author the full 270, or the subset that actually appears cross-classroom? Which areas first after batch 1?
5. **Live re-test mechanism.** How to run the Bright Stars cold-start re-test cleanly (scripted identification against a fresh/cold classroom vs a device capture) to get a trustworthy before/after.
6. **Confirm Pass 2b actually fires + arbitrates well on a cold classroom** post-seed (the complementary half of the fix). Telemetry to watch: `has_global_vm_for_match`, `global_vm_injected_count`, `pass2bFired`, `pass2bImproved`.
7. **Confidence value** for curated rows (sample uses 0.95) and whether curated should ever be allowed to raise Pass 2 confidence differently from Whale rows.

---

## 8. The format sample (companion JSON)

`curated-visual-memory-SAMPLE.json` contains 5 fully-authored entries:
- `se_cylinder_block_1` (sensorial) ↔ `ma_spindle_box` (mathematics) — **the exact cold-start failure pair**, with mutual "NOT the other" negatives.
- `se_red_rods` (sensorial) ↔ `ma_number_rods` (mathematics) — the cross-area cousins.
- `se_pink_tower` (sensorial) — a distinctive control.

**Per-entry field shape** (what Sonnet authors; `source='curated'` + `description_confidence` set by the seed script):
```json
{
  "work_key": "se_cylinder_block_1",
  "work_name": "Cylinder Block 1",
  "area": "sensorial",
  "visual_description": "<tight LOOKS-LIKE prose, <900 chars>",
  "key_materials": ["<material descriptor>", "..."],
  "negative_descriptions": ["NOT <look-alike>: <sharp difference>", "..."]
}
```

The discriminative core of the failure pair, as it would reach Haiku:
- **Cylinder Block 1** — *LOOKS LIKE:* one solid wooden block, ten round knobbed cylinders seated in drilled wells, no numerals, no colour. *DISTINGUISH FROM:* "NOT Spindle Boxes — Cylinder Blocks are one solid block with knobbed cylinders in drilled holes and show NO numerals."
- **Spindle Boxes** — *LOOKS LIKE:* open compartments with printed numerals 0–9, 45 loose plain knob-less rods. *DISTINGUISH FROM:* "NOT Cylinder Blocks — Spindle Boxes hold loose plain rods in numbered compartments; Cylinder Blocks are a solid block with knobbed cylinders and no numerals."

Both sides now point explicitly *away* from each other — the signal Whale-photo descriptions never had.

---

## 9. One-line summary for the plan

Rebuild the **standard-work rows of `montree_global_visual_memory`** from **Opus-authored, reference-grounded discriminative checklists** (positives + mutual "NOT its look-alike" negatives), flip the seed precedence so curated is authoritative, prove the lift on the real Bright Stars Cylinder-Block failure, then scale to ~270 works — **paired with confirming Pass 2b image-arbitration fires well on cold classrooms**, because descriptions + arbitration together are the durable fix.
