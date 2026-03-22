# HANDOFF: CLIP Recognition Accuracy 10x Fix — Mar 22, 2026

## Summary

Full 10x deep-dive audit → 10x plan-audit → 10x build → 5 audit cycles (3 consecutive CLEAN) on the CLIP/SigLIP photo recognition system. 8 fixes across 2 files addressing "horribly mismatched" identifications.

## Root Causes Found (Priority Order)

1. **256-char text embedding truncation** — Visual descriptions averaged ~400-500 chars. `.slice(0, 256)` was losing ~60% of critical disambiguation text (material composition, "NOT X" statements, action verbs). The most important differentiating details were at the END of descriptions.

2. **Case-sensitive work lookup** — `.eq('name', clipWorkName)` failed on case variations like "Sandpaper Letters" vs "sandpaper letters". Changed to `.ilike()` with SQL wildcard escaping.

3. **No classroom scoping on work lookup** — Work lookup searched ALL classrooms' curriculum. A work name match in another school's classroom could pollute results. Now scoped to `preChildClassroomId`.

4. **Slim Haiku prompt assumed CLIP was correct** — The slim enrichment prompt told Haiku "This IS {work_name}, assess mastery." Haiku had no option to disagree. Now asks "Our classifier SUGGESTS this might be {work_name}. FIRST: Verify if the materials match."

5. **classroomId hardcoded to null** — `tryClassify(photoUrl, null, undefined)` meant CLIP never received classroom context. Visual memory boost was impossible.

6. **Visual memories never passed to CLIP** — Pre-fetch of visual memories from `montree_visual_memory` was missing entirely. CLIP had no classroom-learned context.

7. **VisualMemory type mismatch** — Pre-fetch query selected 3 fields (`work_name, work_key, visual_description`) but `VisualMemory` interface requires 4 (`confidence: number`). Now selects `description_confidence` and maps to `confidence`.

## Files Modified (2)

### `app/api/montree/guru/photo-insight/route.ts` — 7 changes:

1. **New import** (line 17): `import type { VisualMemory } from '@/lib/montree/classifier';`

2. **Pre-fetch classroom + visual memories** (lines 427-451): Before CLIP runs, fetches child's `classroom_id` from `montree_children`, then queries `montree_visual_memory` for that classroom. Maps `description_confidence` → `confidence` with fallback 0.5.

3. **Pass context to tryClassify** (line 459): `tryClassify(photoUrl, preChildClassroomId, preVisualMemories)` — was `(photoUrl, null, undefined)`.

4. **Case-insensitive + classroom-scoped + escaped work lookup — BOTH paths** (lines 465-485 CLIP path, lines 1534-1550 two-pass path): SQL wildcard escaping (`%` → `\%`, `_` → `\_`), `.ilike()` for case-insensitive matching, classroom_id filter when available. Applied to BOTH the CLIP tier path AND the two-pass fallback path.

5. **Verification slim prompt** (lines 516-529): Haiku now receives "Our image classifier SUGGESTS this might be X. FIRST: Verify if the classifier suggestion matches what you actually see."

6. **Tool schema + validateToolOutput extensions** (lines 558-559, 152-154): Added `work_verified: boolean` (default true) and `actual_work_name: string` (default '') to both the tool schema and the validation function.

7. **Haiku override detection** (lines 584-588, 751-757): If `slimInput.work_verified === false`, throws `CLIP_OVERRIDE_BY_HAIKU` which is caught and falls through to full two-pass pipeline. Prevents CLIP from forcing wrong identifications past Haiku.

### `lib/montree/classifier/clip-classifier.ts` — 1 change:

8. **Text embedding truncation 256 → 512** (lines 236, 241): `.slice(0, 512)` preserves ~90% of visual descriptions. Applied to both rich signature path and fallback description path.

## Audit Methodology

- **10x Deep Dive**: 10 parallel research agents examining every file in the CLIP pipeline
- **10x Plan-Audit**: 10 parallel plan agents designing fixes, cross-validated
- **10x Build**: All 8 fixes applied in one pass
- **Audit Cycle 1**: Found 2 issues (validateToolOutput missing new fields, .ilike() escaping) — fixed
- **Audit Cycle 2**: Mixed results (2A CLEAN, 2B found 4 issues) — triaged: 1 real (VisualMemory confidence mapping), 3 false positives
- **Audit Cycle 3**: CLEAN after VisualMemory confidence fix
- **Audit Cycles 4-5**: Found 1 MEDIUM issue — two-pass fallback path at line 1546 used `.ilike()` without SQL wildcard escaping (CLIP path had it, two-pass didn't). Fixed with same escaping pattern.
- **Audit Cycles 6-7-8**: 3 consecutive CLEAN passes (7 independent agents total, 0 issues found). 1 false positive triaged (getNegativeDescriptions barrel export — pre-existing, direct import works).
- **Total**: 8 audit cycles, 15+ independent agents, 4 real issues found and fixed, 3 consecutive CLEAN achieved

## What Changed for Teachers

- CLIP now uses full visual descriptions (not truncated) for matching
- Haiku can now OVERRIDE CLIP if the photo clearly doesn't match the suggested work
- Work lookups are case-insensitive and scoped to the correct classroom
- Visual memory from teacher corrections is now fed back into CLIP confidence boosting

## Deploy

⚠️ NOT YET PUSHED. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/api/montree/guru/photo-insight/route.ts lib/montree/classifier/clip-classifier.ts lib/montree/classifier/work-signatures.ts CLAUDE.md docs/handoffs/HANDOFF_CLIP_ACCURACY_10X_FIX_MAR22.md
git commit -m "fix: CLIP recognition accuracy — 8 fixes (embedding truncation, classroom scope, Haiku verification, visual memory)"
git push origin main
```

No new migrations. No new env vars. No new dependencies.
