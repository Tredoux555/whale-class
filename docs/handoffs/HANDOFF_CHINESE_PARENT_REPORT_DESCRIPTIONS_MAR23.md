# Handoff: Chinese Parent Report Descriptions — Static Map Fix

**Date:** March 23, 2026
**Status:** BUILD COMPLETE, 3 AUDIT AGENTS CLEAN, ⚠️ NOT YET PUSHED
**Methodology:** 3 plan-audit cycles (9 agents) + build + 2 verification audits (4 agents) = 13 total agents

---

## Problem

When a teacher switches locale to Chinese and generates a parent report preview, the `parent_description` and `why_it_matters` fields displayed in English instead of Chinese. The old fix attempted runtime Anthropic API translation (~$0.01+ per parent view, slow, no caching) — this was unreliable and expensive.

## Root Cause

All 3 report routes (preview, send, parent view) read descriptions from English-only sources:
- `loadAllCurriculumWorks()` → static JSON files (always English)
- `montree_classroom_curriculum_works` DB table (always English)
- The `findBestDescription()` function's locale parameter only affected step 5 (area-level generic fallback), not steps 1-4 which do the actual work-level matching

## Solution — Plan v3 FINAL

Static Chinese description map + locale-aware override in 3 route files. Zero DB changes, zero runtime API calls, zero new dependencies.

**Key insight:** Override the `staticDescriptions`/`dbDescriptions` Maps BEFORE downstream code reads from them — all existing matching logic works unchanged.

## Files Created (1)

### `lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts` (~550 lines)
- Static TypeScript map of 106 Montessori work descriptions translated to Chinese
- Keyed by lowercase English work name for case-insensitive lookup
- Exports:
  - `getChineseParentDescription(workName)` → single work lookup
  - `getChineseDescriptionsMap()` → full Map for bulk override
- Coverage: 16 Practical Life + 28 Sensorial + 19 Mathematics + 23 Language + 20 Cultural = 106 works
- Each entry: `{ parent_description: string; why_it_matters: string }`

## Files Modified (3)

### `app/api/montree/reports/preview/route.ts` — 2 edits
1. Added import: `import { getChineseDescriptionsMap } from '@/lib/curriculum/comprehensive-guides/parent-descriptions-zh'`
2. After `staticDescriptions` Map is built from `loadAllCurriculumWorks()`, added Chinese override block:
   ```typescript
   if (locale === 'zh') {
     const zhDescriptions = getChineseDescriptionsMap();
     for (const [name, zh] of zhDescriptions) {
       staticDescriptions.set(name, {
         description: zh.parent_description,
         why_it_matters: zh.why_it_matters,
       });
     }
   }
   ```
   This override happens BEFORE the curriculum works loop that builds `dbDescriptions` and `workIdToInfo`, so all downstream lookups (including `findBestDescription()`) automatically get Chinese descriptions.

### `app/api/montree/reports/send/route.ts` — 3 edits
1. Added import for `getChineseDescriptionsMap`
2. After `dbDescriptions` Map is built from curriculum works, added same Chinese override pattern when `locale === 'zh'`
3. Added `report_locale: locale` to the `reportContent` object saved to DB — so the parent route knows if descriptions were already baked in the correct language

### `app/api/montree/parent/report/[reportId]/route.ts` — Major refactor
1. **REMOVED** `import { Anthropic } from '@anthropic-ai/sdk'` — no more Anthropic dependency
2. **REMOVED** entire `translateDescriptionsToZh()` function (~80 lines) — expensive runtime API translation
3. Added import: `import { getChineseParentDescription } from '@/lib/curriculum/comprehensive-guides/parent-descriptions-zh'`
4. **Replaced translation call site 1** (saved content path): Checks `savedLocale !== 'zh'` before overriding (avoids double-translating reports already baked in Chinese). Uses static `getChineseParentDescription(w.work_name)` lookup with graceful fallback to English if work not in map.
5. **Replaced translation call site 2** (fallback/old report path): Simple `locale === 'zh'` check with same static lookup pattern.

## WYSIWYG Principle

The design is WYSIWYG (What You See Is What You Get):
- Teacher switches locale to Chinese → previews report → sees Chinese descriptions
- Teacher sends report → Chinese descriptions are BAKED into saved content (with `report_locale: 'zh'`)
- Parent opens report → sees the exact Chinese content that was baked at send time
- For old reports (saved before this fix, no `report_locale`): parent route applies Chinese static map at read time

## Edge Cases

- **~222 works lack parent_descriptions entirely** (only ~107 of 329 have them) — fall through to area-level Chinese fallback (`AREA_DESCRIPTIONS_ZH` in preview route). Acceptable.
- **Custom works** won't have Chinese descriptions in the static map — show English. Acceptable.
- **Old reports** (pre-fix, saved in English) — parent route detects `savedLocale !== 'zh'` and applies Chinese static map at read time.

## Cost Impact

- **Before:** ~$0.01+ per parent report view in Chinese (Anthropic API call with claude-opus-4-6)
- **After:** $0.00 (static map lookup, zero API calls)

## Deploy

Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add lib/curriculum/comprehensive-guides/parent-descriptions-zh.ts app/api/montree/reports/preview/route.ts app/api/montree/reports/send/route.ts app/api/montree/parent/report/\[reportId\]/route.ts docs/handoffs/HANDOFF_CHINESE_PARENT_REPORT_DESCRIPTIONS_MAR23.md CLAUDE.md
git commit -m "fix: Chinese parent report descriptions — static map replaces runtime API translation"
git push origin main
```

No migrations needed. No new env vars.

## Audit Results

- **3 plan-audit cycles** (9 independent agents): Converged on Plan v3 FINAL
- **Build verification audit** (1 agent): All 4 files verified, zero issues
- **Post-build audit** (3 independent agents): All CLEAN — field mappings correct, no remaining Anthropic references, edge cases handled
- **Total: 13 independent audit agents, 0 unfixed issues**
