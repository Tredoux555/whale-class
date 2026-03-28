# Plan v2: Photo Audit Correction Flow Redesign

## Changes from v1 (based on 3-agent audit)

### Major pivots:
1. **Dropped Sprint 1** (cross-area search in WorkWheelPicker) — AreaPickerWithSearch already does this. Instead: improve AreaPickerWithSearch to be the ONLY path.
2. **Dropped Sprint 3** (Quick Add Templates) — replaced with pre-seeded granular works in curriculum.
3. **Added enrichment preview** — teacher sees AI-generated descriptions before save, can edit.
4. **Added `visual_description`** to enrichment output — feeds CLIP classifier for custom works.
5. **Fixed column choice** — teacher seed goes in `description` field, not `teacher_notes`.

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

#### Part A: Remove Area Lock-In (AreaPickerWithSearch improvement)

The current flow has TWO paths from "Fix" button:
1. Search → find work → done (works great, cross-area already)
2. Pick area → WorkWheelPicker opens (LOCKED to that area — broken)

**Fix:** When no search results match AND teacher wants to add a custom work, let them do it from AreaPickerWithSearch directly — never force them into a locked WorkWheelPicker.

**Changes to AreaPickerWithSearch in `photo-audit/page.tsx`:**
1. Add "+ Add custom work" button that appears when search returns 0 results OR always at bottom
2. Tapping "+ Add custom work" opens an inline form (within AreaPickerWithSearch):
   - Work name (text input, required)
   - Area selector (dropdown, defaults to most relevant based on search query)
   - Brief description (textarea, optional, max 500 chars, placeholder: "Describe in 1-2 sentences")
   - "Preview Descriptions" button → calls AI → shows generated parent_description + why_it_matters (editable)
   - "Save" button → creates work + assigns to photo in one action
3. If teacher picks an area tile (without searching), WorkWheelPicker still opens (unchanged behavior) — but this path is rare for corrections

**Why this is better than v1:** No changes to WorkWheelPicker at all. Zero regression risk for gallery, week view, curriculum pages.

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
- Reuses logic from `generateWorkEnrichment()` in work-enrichment.ts
- Adds `teacher_description` as seed context in the Sonnet prompt
- Adds `visual_description` field to enrichment output (for CLIP)
- Rate limited: 20/15min per IP (same as describe endpoint)
- Timeout: 30s with AbortController
- Cost: ~$0.015-0.03 per call (Sonnet, small prompt)

**Changes to `lib/montree/guru/work-enrichment.ts`:**
1. Add `teacherDescription?: string` parameter to `generateWorkEnrichment()`
2. Add `visual_description` to `WorkEnrichmentResult` interface
3. Update Sonnet prompt to include teacher description as context
4. Add visual_description to tool schema

**Changes to `app/api/montree/curriculum/route.ts` POST handler:**
1. Accept `description` field (teacher's seed description) — store in `description` column
2. Accept `parent_description`, `why_it_matters`, `visual_description` from preview
3. When these fields are provided (from preview), save directly — no fire-and-forget enrichment needed
4. When NOT provided (backwards compat), fire enrichCustomWorkInBackground as before

#### Part C: Wire Into Photo Audit Correction Flow

After teacher saves new work via AreaPickerWithSearch inline form:
1. Work created in curriculum
2. Correction saved (same `handleWorkSelected` flow)
3. Visual memory updated with `visual_description` (for CLIP learning)
4. Toast: "Blue Series Blends 'st' added and tagged!"
5. Photo card updates to show new work name + area

**Estimated changes:**
- `photo-audit/page.tsx`: ~80 lines (inline add form in AreaPickerWithSearch)
- `lib/montree/guru/work-enrichment.ts`: ~30 lines (teacher description + visual_description)
- NEW `app/api/montree/curriculum/enrich-preview/route.ts`: ~80 lines
- `app/api/montree/curriculum/route.ts`: ~15 lines (accept enriched fields)
- `lib/montree/i18n/en.ts`: ~12 new keys
- `lib/montree/i18n/zh.ts`: ~12 matching keys

### Sprint 2: Pre-Seed Granular Language Works

**Goal:** Teacher never has to manually add individual blends, phonograms, or CVC works. They're already in the curriculum, searchable, with proper descriptions.

**Approach:** Add ~60 granular Language works to the static curriculum JSON + comprehensive guides.

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
   - `work_key`: e.g., `la_blue_blend_st`
   - `name`: "Blue Series Blends 'st'"
   - `chineseName`: "蓝色系列混合音 'st'"
   - `category_name`: "Language - Blue Series Blends" / "Language - Green Series Phonograms" / "Language - Pink Series CVC"
   - `age_range`: "primary_year1" (Pink), "primary_year2" (Blue), "primary_year2" (Green)
   - `sequence`: after existing Language works
   - `description`: Brief description
   - `materials`: ["Blend card", "Miniature objects", "Basket"]
   - `prerequisites`: ["la_blue_object_box"] (or appropriate)

2. **Add to comprehensive guides** — `lib/curriculum/comprehensive-guides/language-guides.json`:
   - `parent_description` for each
   - `why_it_matters` for each
   - `quick_guide` for each
   - `presentation_steps` for each

3. **Add CLIP signatures** — `lib/montree/classifier/signatures-language.ts`:
   - `visual_description` for each blend (what objects look like in photos)
   - These feed directly into the CLIP classifier at $0.00/photo

4. **Add Chinese descriptions** — `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts`:
   - Chinese translations for all 39 works

5. **Reseed classrooms** — When existing classrooms fetch curriculum next, new works appear automatically (curriculum loader reads from JSON, DB curriculum is populated from JSON on seed)

**Note:** Existing classrooms won't auto-get new works until reseed. Options:
- A: Teacher taps "Reseed Curriculum" button (already exists on curriculum page)
- B: Auto-detect new works on curriculum GET and offer "39 new works available — tap to add"
- C: Background auto-seed on dashboard load (risky, could overwrite custom ordering)

**Recommended:** Option A (manual reseed) for now. Add a "New works available!" banner in Sprint 3 (future).

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
1. `app/montree/dashboard/photo-audit/page.tsx` — Inline add-work form in AreaPickerWithSearch
2. `lib/montree/guru/work-enrichment.ts` — Teacher description + visual_description
3. `app/api/montree/curriculum/route.ts` — Accept enriched fields on POST
4. `lib/curriculum/data/language.json` — 39 new granular works
5. `lib/curriculum/comprehensive-guides/language-guides.json` — Descriptions for 39 works
6. `lib/montree/classifier/signatures-language.ts` — CLIP signatures for 39 works
7. `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts` — Chinese descriptions

### i18n (2):
8. `lib/montree/i18n/en.ts` — ~12 new keys
9. `lib/montree/i18n/zh.ts` — ~12 matching Chinese keys

### No Migrations Needed
- All required columns already exist (migration 144)
- New curriculum works added via static JSON (no DB migration)

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| WorkWheelPicker regression | ELIMINATED | Zero changes to WorkWheelPicker |
| Enrichment preview slow (>10s) | MEDIUM | Show spinner + 30s timeout + fallback to save without descriptions |
| Pre-seeded works bloat curriculum | LOW | Only 39 new works (Language only). Existing 270 → 309. Modest. |
| CLIP signatures for new works | LOW | Same pattern as existing 270 works. Copy-paste from phonics data. |
| Reseed required for existing classrooms | MEDIUM | Manual reseed button already exists. Add "new works available" banner later. |
| Cost of preview endpoint | LOW | $0.015-0.03 per preview. Teacher adds maybe 5-10 custom works/month. |

---

## Implementation Order

1. Sprint 1 Part B first (enrich-preview endpoint + work-enrichment.ts changes)
2. Sprint 1 Part A (AreaPickerWithSearch inline form)
3. Sprint 1 Part C (wire into correction flow)
4. Sprint 2 (pre-seed 39 Language works — data entry, can be parallelized)
5. 3×3×3 audit across all changes
6. Push + deploy
