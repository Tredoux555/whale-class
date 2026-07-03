# PHOTO-ID COLD-START AUDIT + MASTER-BRAIN PROPOSAL — Jul 3, 2026 (Cowork)

**No code changes.** A read-only investigation into why a very standard Montessori work (a **Cylinder Block**) showed as "Untagged" on a brand-new account (Bright Stars / Sarah). Plus a theorised proposal for a cross-school "master brain" to kill cold starts, and a ready-to-hand brief for **Fable** (the upper model) to (A) review the photo-ID function for efficiency and (B) design the master-brain architecture.

---

## 1. What actually happened (evidence from prod)

Photo `montree_media` id `d7af53f8-7796-4e7e-bd64-a96544a44ae0`, captured 2026-07-03T09:23:23, `identification_attempted_at` 09:23:28 (pipeline ran ~5s later — NOT a failure to run).

`sonnet_draft` on the row:
```json
{
  "area": "mathematics",
  "_source": "haiku_pass2",
  "confidence": 0.85,
  "proposed_name": "Spindle Boxes",
  "haiku_work_name": "Spindle Box",
  "top_candidates": [{ "workName": "Spindle Boxes", "workKey": "ma_spindle_box", "score": 1 }],
  "visual_description": "No child is present... A long wooden board... recessed circles carved into the wood, each with a wooden knob inside..."
}
```
`identification_status = 'haiku_drafted'`, `identification_confidence = 0.850` (column), `work_id = null`, `teacher_confirmed = false`. Classroom curriculum IS seeded (39 sensorial works incl. Cylinder Block 1–4, Knobless Cylinders). `montree_visual_memory` = **0 rows** (day-one account, no learned moat).

**Diagnosis: a MISIDENTIFICATION the system couldn't self-correct, driven by cold-start.** Pass 1 (Haiku vision) described the block accurately; Pass 2 (Haiku text→match) confidently but wrongly matched **"Spindle Boxes" (Mathematics)** for a **Cylinder Block (Sensorial)** at 0.85.

### Why it couldn't auto-tag or self-correct (code paths, verified by subagent)

- **Auto-match gate** `HAIKU_TRUST_CONFIDENCE = 0.85` at `app/api/montree/photo-identification/process/route.ts:102`; the `haikuTrusted` branch is `:425-436`. Two paths:
  - **Path 1** (`conf >= 0.85 && twoPassResult.hasVisualMemoryForMatch`) — FAILS because visual memory is empty (`hasVisualMemoryForMatch=false`, `two-pass.ts:657`). **A brand-new classroom can never satisfy Path 1.**
  - **Path 2** (`is_curriculum_work !== false && matchScore >= 1.0 && conf >= EXACT_FIRST_SIGHT_CONFIDENCE(0.90)`) — FAILS because conf 0.85 < 0.90 (one hundredth short; `process/route.ts:110`).
  - Both fail → correctly writes `haiku_drafted` (`process/route.ts:653-670`).
- **Pass 2b** (the image re-examination discriminator that could catch Cylinder-Block-vs-Spindle-Box) builds its candidate list ONLY from classroom visual memory (`two-pass.ts:290`), and requires `>= 2` candidates (`:695`). With 0 VM rows → 0 candidates → **Pass 2b never ran** (the photo never got a second, image-based look).
- **Cylinder Block ↔ Spindle Boxes is NOT a registered confusion pair.** `CROSS_AREA_CONFUSION_WORK_NAMES` (`lib/montree/work-matching.ts:186-196`) holds only red-rods/number-rods and metal-insets/geometric-cabinet. So `forcePass2bCrossArea` was false; the VISUAL_ID_GUIDE describes both works but never pairs them as a discriminator.
- **`photo_pipeline_v2`** (default TRUE via migration 224) does not change the outcome here — its confidence floor only gates the `is_curriculum_work=false` "Other" path, and top_candidates is written on the haiku_drafted path regardless.

### The UI "Untagged" appearance (secondary)

"Untagged" is the **zone for `work_id IS null`** (`app/api/montree/audit/photos/route.ts:192-193`), independent of draft status. The audit card SHOULD still render the "Spindle Boxes · 85%" Haiku-Draft chip with **✓ Correct / ✏️ Wrong** — the render branch fires on `identification_status === 'haiku_drafted' && identification_confidence !== null` (`app/montree/dashboard/photo-audit/page.tsx:3412`, reads `sonnet_draft.proposed_name` at `:3420`, and the bare-Untagged fallback short-circuits to `return null` when a draft branch rendered, `:3641-3645`). Both conditions hold in the DB. **So the screenshot showing a bare "Untagged" with NO chip is almost certainly a stale client render** (the audit page was loaded while the photo was mid-processing and hasn't refetched). **Action:** pull-to-refresh / reopen the Wrap Up page → the "Spindle Boxes" draft + Correct/Wrong should appear → tap ✏️ Wrong → correct to "Cylinder Block 1". That correction seeds the FIRST visual-memory entry and starts training the moat.

> ⚠️ If, after a genuine hard refresh, the card STILL shows a bare "Untagged" with no draft chip, THAT is a separate real display bug to chase (candidate: an `isPhotoInFlight` poll that stopped before the terminal state landed). Not yet confirmed either way.

---

## 2. The real lesson: cold-start is by design, and it hurts day-one accuracy

The per-classroom **visual-memory moat** (`montree_visual_memory`, scoped `.eq('classroom_id', …)`, loaded in `lib/montree/photo-identification/context-loader.ts`) is THE thing that disambiguates look-alike wooden materials. Whale Class has 65+ trained entries; a new account has 0. So a fresh school will misidentify look-alikes (Cylinder Block ↔ Spindle Box, etc.) until the teacher confirms/corrects enough photos to build the moat. This is the "hidden moat" working as intended — but the day-one experience feels dumb, and a new customer's first impression is exactly when it matters most.

---

## 🔬 FOR FABLE (upper-model brief) — two linked tasks

Hand Fable the whole photo-ID subsystem. Files to read: `app/api/montree/photo-identification/process/route.ts`, `lib/montree/photo-identification/two-pass.ts`, `lib/montree/photo-identification/context-loader.ts`, `lib/montree/work-matching.ts`, `lib/montree/photo-identification/visual-id-guide.ts`, `app/api/montree/guru/corrections/route.ts` (the moat writer), `app/api/montree/audit/photos/route.ts`, `app/montree/dashboard/photo-audit/page.tsx`.

### Task A — Efficiency / improvement review of the photo-ID function
Assess the two-pass (+ Pass 2b + Auto-Sonnet) pipeline for: redundant model calls, prompt-size/latency (the 20KB VM budget, Pass 2 vs Pass 2b), the confidence-gate math (is `Path 2 >= 0.90` too strict? is the 0.85 threshold right?), and correctness gaps (should Cylinder Block ↔ Spindle Box join `CROSS_AREA_CONFUSION_WORK_NAMES`? should Pass 2b be able to run against the GLOBAL moat when the classroom moat is empty?). Deliver concrete, low-risk improvements ranked by impact/effort.

### Task B — Design the "master brain" (cross-school shared moat) to kill cold starts
**Goal:** a new school inherits a baseline moat for STANDARD curriculum works so day-one accuracy matches a mature classroom.

**What my research already establishes (feasibility is real):**
- `montree_visual_memory` rows carry a canonical **`work_key`** (`corrections/route.ts:986, 1205`) — a stable cross-school identifier for standard works. Custom works are school-specific (`is_custom=true`) and must stay private/per-classroom.
- Precedent for a global pool exists: the Guru CHAT brain `montree_guru_brain` (id='global', `corrections/route.ts:1300-1324`) — but that's the conversational advisor, NOT photo-ID. A photo-ID master brain is NEW infrastructure.
- Injection point is clean: `context-loader.loadIdentificationContext()` + the `haikuTrusted` Gate A. A `montree_global_visual_memory` (keyed by `work_key`) could be loaded as a FALLBACK when the classroom moat lacks the matched work, and Gate A Path 1 could accept global-moat support (not just classroom).
- Cheapest bootstrap: seed the global pool from Whale Class's mature 65+ teacher-confirmed standard-work entries immediately → instant cold-start relief.

**Open questions for Fable to design around (this is why it's an upper-model job):**
1. **Poison/abuse resistance** — one school's bad confirmations must not pollute everyone. Consensus gating (N independent schools agree on a work_key's description pattern), reputation weighting, outlier rejection, or human-curated promotion?
2. **Cross-tenant privacy** — pooling descriptions across schools is sensitive (this repo had a cross-tenant security fix THIS session). Constraints: standard works only, teacher-CONFIRMED only, scrub any child references from `visual_description` (Pass 1 sometimes writes "a child is holding…"), ToS/consent implications.
3. **Description robustness** — works vary by manufacturer/region; a global description must generalise (embeddings/multiple exemplars vs a single canonical string?).
4. **Cost/latency** — retrieval so only the relevant `work_key`(s) are injected, not the whole global pool.
5. **Trust math** — should global-moat support auto-match at a HIGHER confidence bar than local (local is teacher-verified for THIS room; global is aggregate)?

Deliverable: an architecture plan doc (schema, write path, injection strategy, trust gating, privacy posture, poison-resistance, bootstrap plan, migration list) that Sonnet can then build 3x3x3-style.

---

## 3. Recommendation (my read)

**Yes — hand the master-brain architecture (Task B) to Fable.** It's cross-tenant + privacy-sensitive + has genuine poison/abuse vectors + is high-leverage (every new school's first impression). That's exactly the class of decision where the upper model's deeper reasoning pays off, and it fits the repo's theorize-first methodology. Bundle it with Task A so Fable reviews the photo-ID subsystem holistically. Then Sonnet executes the build + runtime-audit. A fast, low-risk interim win Fable will likely surface anyway: **seed the global pool from Whale Class's existing moat** — immediate cold-start relief for standard works with almost no new surface area.

---

## Verify / next
- Tell the user to hard-refresh Wrap Up and correct the Cylinder Block photo (→ "Cylinder Block 1"); confirm the draft chip appears (if not, chase the display bug noted in §1).
- Hand Fable this doc (§🔬). On its plan landing, Sonnet builds.
