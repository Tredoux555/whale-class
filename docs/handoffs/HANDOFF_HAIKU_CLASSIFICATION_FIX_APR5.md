# Handoff: Haiku Classification Fix — Visual Memory Feedback Loop

**Date:** April 5, 2026
**Commit:** `cf039f04` (+ earlier commits same session for Haiku batch speed-up and P/P/M system)
**Status:** PUSHED, deploying via Railway auto-deploy. User testing in progress.

---

## What Was Done

### Problem
Teachers could "Teach the AI" via Photo Audit — Sonnet would generate a rich 5-field description (visual_description, key_materials, negative_descriptions, etc.) and store it in `montree_visual_memory` with confidence 1.0. But during Haiku identification, these descriptions were **silently discarded** by an `is_custom` filter (line 863 of photo-insight/route.ts). Only works with `is_custom=true` were injected into prompts. Most teacher-taught works had `is_custom=false` because their work_id didn't start with `custom_`.

Database showed 12 teacher_setup entries (confidence 1.0, with rich key_materials and negative_descriptions) being thrown away. Meanwhile Haiku was misclassifying "Chalk Board Writing - No lines" as "Metal Insets" because:
1. Pass 1 described accessories (pink cards, sponges) equally with the primary chalkboard work
2. Pass 2 never saw the teacher's Sonnet-generated description
3. Visual memory was buried at the bottom of a 280-line prompt even when injected

### Root Cause
March 20, 2026 debiasing removed standard work visual memory injection because auto-generated (`first_capture`/`onboarding`) descriptions reinforced misidentification errors. This was correct — but it also blocked teacher-validated (`teacher_setup`/`correction`) descriptions, which are high-quality ground truth.

### Fix (4 changes, 1 file)

**File:** `app/api/montree/guru/photo-insight/route.ts`

1. **Pass 1 prompt reordered** — HANDS & PRIMARY WORK moved to item #1 (was #3). Old "OBJECTS" renamed to "SECONDARY OBJECTS" at #3. Final instruction says "Lead with the PRIMARY work the hands are engaged with."

2. **Visual memory query expanded** — SELECT now includes `key_materials, negative_descriptions, source, description_confidence`. Ordered by `description_confidence DESC` first so teacher_setup (1.0) entries come before lower-quality ones.

3. **Filter logic replaced** — Old: `if (m.is_custom)`. New: `if (m.is_custom || isTeacherValidated)` where `isTeacherValidated = (source IN teacher_setup/correction) AND confidence >= 0.9`. This:
   - Keeps all 6 currently-injected custom entries (no regression)
   - Adds 12 teacher_setup standard entries that were previously discarded
   - Still excludes onboarding/first_capture auto-descriptions (the original bias problem)

4. **Visual memory moved to TOP of Pass 2 prompt** — Removed `${visualMemoryContext}` from both systemPrompt constructions (lines 1214, 1297). Injected directly into Pass 2 prompt at line 1592, BEFORE the visual ID guide. Rich format:
   ```
   CLASSROOM-VERIFIED WORKS (teacher has confirmed these):
   - "Chalk Board Writing - No lines" (Language):
     LOOKS LIKE: [300-char Sonnet description]
     KEY MATERIALS: dark slate-green chalkboard, white chalk, natural sponge eraser
     DISTINGUISH FROM: NOT a lined chalkboard; NOT sandpaper letters
   ```

### Also in this session

- **Haiku batch speed-up**: 3 photos in parallel with 500ms delay (was 1 sequential with 3000ms delay). Photo Audit page, `handleRunHaiku` function.

- **Dual P/P/M system**: Photo Audit seeds progress statuses from DB, defaults to "practicing". `no_downgrade` param on progress update API with STATUS_RANK guard. Multi-child group photos auto-mark "presented" silently.

---

## Key Files Modified

| File | Changes |
|------|---------|
| `app/api/montree/guru/photo-insight/route.ts` | All 4 classification fixes |
| `app/montree/dashboard/photo-audit/page.tsx` | Haiku batch parallelism, P/P/M seeding |
| `app/api/montree/progress/update/route.ts` | `no_downgrade` param |
| `app/api/montree/audit/photos/route.ts` | Progress status in photo response |
| `lib/montree/offline/sync-manager.ts` | Auto-presented for group photos |

---

## Testing

User is currently testing the Haiku classification changes on production. Key test:
1. Go to Photo Audit → Haiku Test tab
2. Select chalkboard writing photos that were previously misclassified as "Metal Insets"
3. Run Haiku → should now match "Chalk Board Writing - No lines" using the teacher-taught description

If results are still poor, possible next steps:
- Increase `desc` truncation from 300 to 500 chars (currently caps Sonnet descriptions)
- Add area-filtering for the visual ID guide to reduce noise
- Consider Sonnet escalation for low-confidence Haiku results

---

## Database State (Whale Class visual_memory)

37 total entries in `montree_visual_memory` for classroom `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`:
- 12 entries: `source=teacher_setup`, `confidence=1.0`, with key_materials + negatives (NOW INJECTED)
- 6 entries: `is_custom=true` (already injected before, still injected)
- 19 entries: `source=onboarding`, `confidence=0.8` (still excluded — bias risk)

No migration needed — all changes are prompt/query logic in the API route.
