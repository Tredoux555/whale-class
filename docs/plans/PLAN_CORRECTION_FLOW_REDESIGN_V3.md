# Plan v3: Photo Audit Correction Flow Redesign

## Changes from v2 (based on 3-agent audit — UX, Data, Architecture)

### Critical fixes from audit:
1. **visual_description → montree_visual_memory** (not curriculum table). No migration needed. The `visual_description` column doesn't exist on `montree_classroom_curriculum_works` — and it shouldn't. CLIP reads from `montree_visual_memory` (per-classroom), not from curriculum. Plan v2 said "feeds CLIP" but never specified HOW. Now explicit.
2. **Enrichment preview made OPTIONAL** — Plan v2 had a 7-step flow with 30s AI wait. Teachers in classrooms need speed. New flow: save immediately with name + optional description, fire-and-forget enrichment in background (existing pattern). Preview is a SECONDARY action ("Preview AI Descriptions" link) for teachers who want to review before saving.
3. **"+ Add custom work" button made prominent** — Plan v2 buried it. Now: when search returns 0 results, show big emerald button: "➕ Add '[query]' as a custom work" with query pre-filled as work name.
4. **Line count estimates corrected** — 80 → 140 lines for inline form (7 state vars + form JSX + API calls + error handling + i18n).
5. **Data validation checklist added for Sprint 2** — 39 works across 4 files must be validated for key uniqueness, prerequisite validity, sequence ordering, Chinese parity.

---

## Problem Statement (unchanged)

Three issues:
1. Teacher stuck in wrong area during photo audit corrections
2. No AI enrichment when teacher adds custom works
3. Need granular curriculum entries (individual blends, phonograms) for progress tracking + parent reports

---

## Plan: 2 Sprints

### Sprint 1: Fix Area Lock-In + Add-Work-With-Description Flow

**Goal:** Teachers can always find any work across all areas AND add new works with AI-enriched descriptions.

#### Part A: Remove Area Lock-In + Inline Add Form

The current flow has TWO paths from "Fix" button:
1. Search → find work → done (works great, cross-area already via AreaPickerWithSearch)
2. Pick area → WorkWheelPicker opens (LOCKED to that area — broken)

**Fix:** Add inline "Add custom work" form directly in AreaPickerWithSearch. Teachers never need to enter a locked WorkWheelPicker for corrections.

**Changes to AreaPickerWithSearch in `photo-audit/page.tsx`:**

1. **When search returns 0 results**, replace "No works found" dead-end with:
   - Big emerald button: "➕ Add '[search query]' as a custom work"
   - Tapping opens inline form WITHIN AreaPickerWithSearch (no modal switch)
   - Work name pre-filled from search query

2. **Always show at bottom of search results** (even when results exist):
   - Small link: "+ Add a custom work" (secondary action, not prominent)

3. **Inline add form (when opened):**
   - Work name (text input, required, pre-filled from search query)
   - Area selector (dropdown of 6 areas, defaults to current `pickerArea` or auto-detected from query)
   - Brief description (textarea, optional, max 500 chars, placeholder: "Describe in 1-2 sentences — e.g., 'Children learn to blend st sound using objects'")
   - **"Save" button** (primary action — saves immediately, enrichment runs in background)
   - **"Preview AI Descriptions" link** (secondary action — calls enrich-preview endpoint, shows editable preview before save)

4. **Save flow (primary — fast path, ~2 seconds):**
   - POST to `/api/montree/curriculum` with name + area + description
   - Fire-and-forget `enrichCustomWorkInBackground()` generates full descriptions in background
   - Fire-and-forget INSERT into `montree_visual_memory` (visual_description generated in background enrichment)
   - Immediately: `handleWorkSelected()` assigns the new work to the photo
   - Toast: "Blue Series Blends 'st' added and tagged!"
   - Photo card updates

5. **Preview flow (secondary — optional, ~10-15 seconds):**
   - Teacher clicks "Preview AI Descriptions" link
   - Calls `POST /api/montree/curriculum/enrich-preview`
   - Shows spinner (15s timeout, NOT 30s — classroom context)
   - Returns editable fields: parent_description, why_it_matters, description, visual_description
   - Teacher can edit any field
   - "Save with these descriptions" button → POST to curriculum with all fields pre-filled
   - No fire-and-forget enrichment needed (descriptions already generated)
   - INSERT into `montree_visual_memory` with the `visual_description`

6. If teacher picks an area tile (without searching), WorkWheelPicker still opens (unchanged behavior)

**Why zero WorkWheelPicker changes:** The add form lives entirely inside AreaPickerWithSearch. WorkWheelPicker is untouched. Zero regression risk for gallery, week view, curriculum pages.

#### Part B: AI-Enriched Custom Work Creation

**New endpoint: `POST /api/montree/curriculum/enrich-preview`**

Purpose: Generate descriptions from work name + teacher description, return preview (NOT saved to DB yet).

Request:
```json
{
  "work_name": "Blue Series Blends 'st'",
  "area_key": "language",
  "teacher_description": "Children learn to blend 'st' sound using objects like strawberry, stick, starfish"
}
```

Response:
```json
{
  "parent_description": "Your child is exploring consonant blends through the Blue Series...",
  "why_it_matters": "Consonant blend recognition is a critical step in reading fluency...",
  "description": "Montessori phonics work focusing on the 'st' consonant blend...",
  "visual_description": "Small basket containing miniature objects: red strawberry, brown wooden stick, orange starfish...",
  "quick_guide": "Present the 'st' sound. Child matches objects to the 'st' blend card...",
  "direct_aims": ["Consonant blend recognition", "Phonemic awareness"],
  "indirect_aims": ["Reading fluency preparation", "Vocabulary expansion"],
  "materials": ["Blend card 'st'", "Miniature objects starting with 'st'", "Basket"]
}
```

Implementation:
- Reuses retry + timeout logic from `generateWorkEnrichment()` in work-enrichment.ts
- Adds `teacherDescription` as seed context in the Sonnet prompt
- Adds `visual_description` field to `WorkEnrichmentResult` interface
- Rate limited: 30/15min per IP (higher than describe — text-only, cheaper than vision)
- Timeout: 15s with AbortController (NOT 30s — classroom context demands speed)
- Cost: ~$0.01-0.02 per call (Sonnet text, ~200 input + ~800 output tokens)
- POST method is correct (large text body, generative operation)

**Changes to `lib/montree/guru/work-enrichment.ts`:**
1. Add `teacherDescription?: string` to options parameter (backwards compatible — optional)
2. Add `visual_description` to `WorkEnrichmentResult` interface
3. Update Sonnet prompt to include teacher description as seed context when provided
4. Add `visual_description` to tool schema output

**Changes to `app/api/montree/curriculum/route.ts` POST handler:**
1. Accept `description` field (teacher's seed description) — store in `description` column
2. Accept `parent_description`, `why_it_matters` from preview
3. When these fields are provided (from preview), save directly — no fire-and-forget enrichment needed
4. When NOT provided (fast path), fire `enrichCustomWorkInBackground` as before (backwards compat)
5. **NEW:** After work creation, if `visual_description` is provided, INSERT into `montree_visual_memory`:
   ```sql
   INSERT INTO montree_visual_memory (classroom_id, work_name, work_key, area, is_custom, visual_description, source, description_confidence)
   VALUES ($1, $2, $3, $4, true, $5, 'teacher_enrichment', 0.8)
   ON CONFLICT (classroom_id, work_name) DO UPDATE SET visual_description = $5, description_confidence = 0.8
   ```

#### Part C: Wire Into Photo Audit Correction Flow

After teacher saves new work via AreaPickerWithSearch inline form:
1. Work created in curriculum (POST returns work_id + work_key)
2. Correction saved (same `handleWorkSelected` flow, passing the new work)
3. **Visual memory updated:** If enrichment was previewed, visual_description already saved via curriculum POST. If fast path, `enrichCustomWorkInBackground()` generates descriptions AND upserts visual_memory (fire-and-forget).
4. Toast: "Blue Series Blends 'st' added and tagged!"
5. Photo card updates to show new work name + area
6. `fetchCurriculum()` called via `onWorkAdded` to refresh curriculum cache

**Visual memory flow (explicit):**
- **Fast path:** Teacher saves without preview → `enrichCustomWorkInBackground()` fires → generates descriptions → updates curriculum work record → ALSO upserts `montree_visual_memory` with visual_description + confidence 0.8
- **Preview path:** Teacher previews → saves with enriched fields → curriculum POST handler upserts `montree_visual_memory` directly → no fire-and-forget needed

Both paths result in visual_description reaching `montree_visual_memory`, which CLIP's `getClassroomAwareSignatures()` already queries.

**Estimated changes:**
- `photo-audit/page.tsx`: ~140 lines (inline add form + preview flow in AreaPickerWithSearch)
- `lib/montree/guru/work-enrichment.ts`: ~40 lines (teacherDescription + visual_description + visual_memory upsert in background)
- NEW `app/api/montree/curriculum/enrich-preview/route.ts`: ~80 lines
- `app/api/montree/curriculum/route.ts`: ~25 lines (accept enriched fields + visual_memory upsert)
- `lib/montree/i18n/en.ts`: ~15 new keys
- `lib/montree/i18n/zh.ts`: ~15 matching keys

### Sprint 2: Pre-Seed Granular Language Works

**Goal:** Teacher never has to manually add individual blends, phonograms, or CVC works. They're already in the curriculum, searchable, with proper descriptions.

**Approach:** Add ~39 granular Language works to the static curriculum JSON + comprehensive guides.

**New works to add:**

Blue Series Blends (~19 works):
- Blue Series Blends 'st', 'bl', 'cr', 'fl', 'gr', 'pl', 'sl', 'sp', 'tr', 'br', 'cl', 'dr', 'fr', 'gl', 'pr', 'sk', 'sm', 'sn', 'sw'

Green Series Phonograms (~15 works):
- Green Series Phonograms 'sh', 'ch', 'th', 'ai', 'ee', 'oa', 'oo', 'ou', 'ow', 'oi', 'ar', 'er', 'or', 'igh', 'tion'

Pink Series CVC by Vowel (~5 works):
- Pink Series CVC 'a', 'e', 'i', 'o', 'u'

Total: ~39 new works in Language area

**Implementation:**

1. **Add to `lib/curriculum/data/language.json`** — 39 new entries with:
   - `id`: e.g., `la_blue_blend_st` (matches work_key convention)
   - `name`: "Blue Series Blends 'st'"
   - `chineseName`: "蓝色系列混合音 'st'"
   - Category: nested under new categories "Blue Series Blends", "Green Series Phonograms", "Pink Series CVC"
   - `ageRange`: "primary_year1" (Pink), "primary_year2" (Blue, Green)
   - `sequence`: after existing Language works, sequential within each group
   - `description`: Brief description
   - `materials`: ["Blend card", "Miniature objects", "Basket"] (etc.)
   - `prerequisites`: ["la_blue_object_box"] (or appropriate existing work)
   - `directAims`, `indirectAims`: Phonics-specific aims

2. **Add to comprehensive guides** — `lib/curriculum/comprehensive-guides/language-guides.json`:
   - `parent_description` for each (warm, parent-facing)
   - `why_it_matters` for each (developmental significance)
   - `quick_guide` for each (step-by-step presentation)
   - `presentation_steps` for each

3. **Add CLIP signatures** — `lib/montree/classifier/signatures-language.ts`:
   - `visual_description` for each (what objects look like in photos — material-first, camera-specific)
   - `negative_descriptions` for disambiguation
   - `confusion_pairs` where relevant (e.g., Blue blend 'st' vs 'sp' — different object sets)
   - These feed directly into the CLIP classifier at $0.00/photo

4. **Add Chinese descriptions** — `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts`:
   - Chinese parent_description + why_it_matters for all 39 works

5. **Reseed classrooms** — Manual reseed button already exists on curriculum page (Option A).

**Data Validation Checklist (MUST RUN before shipping):**
```
□ All 39 work_keys are unique (no collision with existing 45 Language works)
□ All prerequisite work_keys reference existing works in language.json
□ Sequence values are unique within Language area and correctly ordered
□ All 39 works have matching entries in language-guides.json
□ All 39 works have matching entries in signatures-language.ts
□ All 39 works have matching entries in parent-descriptions-zh.ts
□ Chinese names have properly escaped apostrophes (no Turbopack parse errors)
□ CLIP signature visual_descriptions are material-first, camera-specific (not conceptual)
□ Total Language works: existing 45 + 39 new = 84 (verify count)
```

**Estimated changes:**
- `lib/curriculum/data/language.json`: ~39 new entries (~400 lines)
- `lib/curriculum/comprehensive-guides/language-guides.json`: ~39 entries (~600 lines)
- `lib/montree/classifier/signatures-language.ts`: ~39 entries (~300 lines)
- `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts`: ~39 entries (~200 lines)

---

## Files Summary

### New Files (1):
1. `app/api/montree/curriculum/enrich-preview/route.ts` — Preview endpoint for AI enrichment

### Modified Files (7):
1. `app/montree/dashboard/photo-audit/page.tsx` — Inline add-work form in AreaPickerWithSearch (~140 lines)
2. `lib/montree/guru/work-enrichment.ts` — teacherDescription + visual_description + visual_memory upsert
3. `app/api/montree/curriculum/route.ts` — Accept enriched fields on POST + visual_memory upsert
4. `lib/curriculum/data/language.json` — 39 new granular works
5. `lib/curriculum/comprehensive-guides/language-guides.json` — Descriptions for 39 works
6. `lib/montree/classifier/signatures-language.ts` — CLIP signatures for 39 works
7. `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts` — Chinese descriptions

### i18n (2):
8. `lib/montree/i18n/en.ts` — ~15 new keys
9. `lib/montree/i18n/zh.ts` — ~15 matching Chinese keys

### No Migrations Needed
- All required columns already exist (migration 099 for curriculum, migration 138 for visual_memory)
- `visual_description` is stored in `montree_visual_memory` table (already has the column), NOT in curriculum table
- New curriculum works added via static JSON (no DB migration)

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| WorkWheelPicker regression | ELIMINATED | Zero changes to WorkWheelPicker |
| Enrichment preview slow (>10s) | LOW | Preview is OPTIONAL. Fast path saves immediately. Preview has 15s timeout. |
| Curriculum POST regression (3 callers) | MEDIUM | Test all 3 callers: AddWorkModal, photo-audit inline form, principal setup. Optional fields = backwards compatible. |
| Pre-seeded works bloat curriculum | LOW | Only 39 new works (Language only). Existing 270 → 309. Modest. |
| CLIP signatures for new works | LOW | Same pattern as existing 270 works. Validated by checklist. |
| Reseed required for existing classrooms | MEDIUM | Manual reseed button already exists. |
| visual_memory upsert fails silently | LOW | Fire-and-forget with console.error logging. CLIP falls back to static signatures. |
| Cost of preview endpoint | LOW | ~$0.01-0.02 per preview. Teacher adds maybe 5-10 custom works/month. Optional use. |

---

## Implementation Order

1. Sprint 1 Part B (enrich-preview endpoint + work-enrichment.ts changes + visual_memory upsert logic)
2. Sprint 1 Part A (AreaPickerWithSearch inline form — fast path first, then preview flow)
3. Sprint 1 Part C (wire into correction flow + visual_memory integration test)
4. Sprint 2 (pre-seed 39 Language works — data entry across 4 files)
5. Data validation checklist (run all 9 checks)
6. 3×3×3 audit with specific focus areas:
   - Cycle 1: API contracts + curriculum POST backwards compat + i18n
   - Cycle 2: UI integration + data integrity + CLIP visual_description flow
   - Cycle 3: Cross-system (custom work → visual_memory → CLIP) + edge cases + regression
7. Push + deploy
