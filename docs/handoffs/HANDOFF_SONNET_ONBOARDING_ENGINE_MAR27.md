# Handoff: Sonnet Onboarding Engine — Plan v4 FINAL

**Date:** March 27, 2026
**Status:** DESIGN COMPLETE — Ready to build
**Plan-Audit Cycles:** 3 complete (v1→audit→v2→audit→v3→audit→v4)
**Priority:** HIGH — Solves cold start problem for all new classrooms

---

## Problem Statement

New classrooms have empty visual memory. CLIP signatures are generic (270 works, not classroom-specific). Result: ~95% of photos land in AMBER zone on the photo audit page. The current classroom has 86 amber photos out of 90 total.

At scale (1000 schools), this means every new school's first impression is a page full of unconfirmed photos. No "wow factor." Teachers lose trust before the system has a chance to learn.

## Solution: Sonnet as the Onboarding Engine

Sonnet processes the FIRST batch of photos for each new classroom with ~90-95% accuracy. Each classification builds visual memory (per-classroom learned descriptions). After the first batch, CLIP + Haiku handle everything autonomously at near-zero cost.

**Key principle:** Sonnet is the onboarding engine, not a permanent layer. It fires intensively for the first 50-100 photos, then the system self-calibrates and stops needing it.

**Cost:** $1.50-6.00 per classroom, one-time. At 1000 schools: $1,500-6,000 total (not recurring).

---

## Architecture

### Self-Calibrating Routing

```
Photo arrives
  → Check cache (existing)
  → Check skip-if-tagged (existing)
  → Try CLIP (always — it's free)
  → If CLIP GREEN (≥0.85):
      Accept classification
      BONUS: fire-and-forget visual memory generation (onboarding only)
  → If CLIP not GREEN:
      Check classroom onboarding status
      → If onboarding mode (coverage < 30%):
          Route to SONNET DIRECT (skip Haiku two-pass)
      → If NOT onboarding:
          Route to existing Haiku two-pass pipeline
```

Onboarding mode = visual memory covers < 30% of the classroom's active curriculum works. As Sonnet classifies photos and builds visual memory, coverage increases. At 30%, onboarding mode turns off automatically. No manual flag, no arbitrary photo count — self-calibrating.

### Sonnet's Jobs During Onboarding

1. **Classify** the photo against the classroom's curriculum (270 standard + any custom works)
2. **Propose a custom work** if no curriculum match (name, area, description, materials)
3. **Trigger visual memory generation** (Haiku generates 150-token visual description, stored permanently)
4. **Trigger CLIP embedding invalidation** (classroom embeddings rebuilt with new visual memory)
5. **Feed brain learning** (cross-classroom pattern recognition)

### Batch Reprocess for Existing Photos

For the 86 existing amber photos (and any future backlog):
- "Reclassify All" button on photo audit page
- Client-side sequential processing (~10s per photo, ~14 minutes for 86)
- Real-time progress UI: "Reclassifying 15/86... 12 identified, 2 need review, 1 custom work"
- Teacher can cancel anytime — partial progress saved
- Each photo POSTs to existing photo-insight endpoint with `force_onboarding: true`

---

## Build Plan — 4 Sprints

### Sprint 1: Onboarding Mode Detection + Sonnet Routing

**1A: Onboarding Status Function**
- File: `lib/montree/classifier/classroom-embeddings.ts`
- New function: `getClassroomOnboardingStatus(classroomId)`
- Two parallel count queries:
  - `SELECT COUNT(DISTINCT work_key) FROM montree_visual_memory WHERE classroom_id = $1`
  - `SELECT COUNT(*) FROM montree_classroom_curriculum_works WHERE classroom_id = $1`
- Returns: `{ isOnboarding: boolean, coveragePercent: number, vmCount: number, curriculumCount: number }`
- Threshold: `ONBOARDING_COVERAGE_THRESHOLD` env var, default `0.30`
- Module-level Map cache with 5-min TTL per classroom
- Cache invalidated when visual memory is written (add call in `generateAndStoreVisualMemory`)

**1B: Sonnet Direct Path**
- File: `app/api/montree/guru/photo-insight/route.ts`
- After cache check + skip-if-tagged + CLIP attempt:
  - If CLIP GREEN → accept + fire-and-forget `generateAndStoreVisualMemory()` (onboarding bonus — builds visual memory from CLIP hits too)
  - If CLIP not GREEN → call `getClassroomOnboardingStatus(classroomId)`
  - If onboarding → Sonnet direct path (skip Haiku two-pass entirely)
  - If NOT onboarding → existing Haiku two-pass pipeline (unchanged)
- Sonnet call uses BOTH existing tool schemas:
  - `tag_photo` (existing) — for classifying against curriculum
  - `PROPOSE_CUSTOM_WORK_TOOL` (existing from Mar 22) — for proposing new custom works
  - Sonnet decides which tool to use based on what it sees
- Enhanced system prompt for onboarding mode: "Classify this Montessori material against the curriculum. If you cannot find a match, propose a new custom work with name, area, description, and materials."
- On Sonnet success — 4 fire-and-forget calls (all existing functions):
  1. `generateAndStoreVisualMemory()` — Haiku vision → 150 token description → upsert to visual_memory
  2. `invalidateClassroomEmbeddings()` — marks CLIP cache stale for rebuild
  3. `feedBrainLearning()` — cross-classroom pattern learning
  4. Update `media.work_id` via Supabase update (existing logic)
- If custom work proposed → route to `add-custom-work` endpoint (existing)

**1C: force_onboarding Parameter**
- New body parameter on photo-insight: `force_onboarding: boolean`
- Server validation: ONLY accepted when:
  - Classroom IS in onboarding mode, OR
  - Request comes from super-admin (via `verifySuperAdminAuth` check)
- If accepted → routes to Sonnet direct path regardless of CLIP result
- Used by batch reprocess UI (Sprint 2)

### Sprint 2: Batch Reprocess UI

**2A: "Reclassify All" Button**
- File: `app/montree/dashboard/photo-audit/page.tsx`
- New button visible when non-green photo count > 0
- Filter options: "Amber Only", "Red + Untagged", "All Non-Green"
- Confirmation dialog:
  - "This will reclassify [N] photos using Sonnet vision."
  - "Estimated cost: ~$[N × 0.04]"
  - "Estimated time: ~[N × 10 / 60] minutes"
  - "You can cancel anytime — progress is saved."

**2B: Client-Side Orchestration**
- Collect photo IDs from current zone filter
- Filter out photos with no `child_id` (cannot process without child context)
- Sequential processing (one at a time — avoids rate limits, simplifies error handling)
- Each request: POST to `/api/montree/guru/photo-insight` with body `{ force_onboarding: true, media_id, child_id }`
- After each photo completes: refetch that photo's data from audit API, update in list
- Progress state: `{ processing: boolean, current: number, total: number, results: { green: number, amber: number, red: number, custom: number, errors: number } }`
- Progress UI bar with live counts
- Cancel button sets `processing = false`, loop exits on next iteration

**2C: Rate Limit + Error Handling**
- If photo-insight returns 429: wait 5 seconds, retry that photo once
- If second 429: stop batch, show "Rate limited — try again in a few minutes"
- If photo-insight returns 500: log error, skip photo, continue to next
- If network error: stop batch, show "Connection lost"
- Natural pace (~10s per Sonnet call) = ~6 requests/min, well under Anthropic limits

**2D: i18n Keys**
- `audit.reclassifyAll` / `审核.重新分类全部`
- `audit.reclassifyAmber` / `审核.重新分类待确认`
- `audit.reclassifyConfirm` / `审核.确认重新分类`
- `audit.reclassifyProgress` / `审核.重新分类进度`
- `audit.reclassifyComplete` / `审核.重新分类完成`
- `audit.reclassifyCost` / `审核.预计费用`
- `audit.reclassifyCancel` / `审核.取消重新分类`
- `audit.reclassifyError` / `审核.重新分类错误`

### Sprint 3: Custom Work Bilingual Creation

**3A: Migration 149**
- File: `migrations/149_onboarding_chinese.sql`
```sql
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_zh TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_description_zh TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS why_it_matters_zh TEXT DEFAULT NULL;
```
- Nullable columns — Chinese is optional, no data migration needed
- Standard works continue using static `parent-descriptions-zh.ts` (reviewed, high quality)
- Custom works get Chinese written to these columns at creation time

**3B: Chinese Generation for Custom Works**
- File: `app/api/montree/guru/photo-insight/add-custom-work/route.ts`
- After creating the English work entry, fire-and-forget Sonnet call:
  - Input: English name + description + materials
  - System prompt includes Montessori Chinese glossary (Sprint 3D)
  - Output: name_zh, parent_description_zh, why_it_matters_zh
  - Upsert Chinese columns on the work record
  - Non-blocking: if translation fails, work exists in English only

**3C: Report Routes — Read Chinese from DB**
- Files: `reports/preview/route.ts`, `reports/send/route.ts`
- After building `dbDescriptions` Map from curriculum works:
  - For locale 'zh': batch query all work_keys for zh columns
  - Priority: DB `parent_description_zh` → static map `getChineseParentDescription()` → English fallback
  - Single SELECT for all work_keys (not N+1)
- No change to `parent/report/[reportId]/route.ts` — it reads baked content from send time

**3D: Montessori Chinese Glossary**
- File: `lib/montree/classifier/montessori-glossary-zh.ts`
- ~50 key term mappings used in Sonnet translation prompts:
  - Area names: Practical Life=日常生活, Sensorial=感官, Mathematics=数学, Language=语言, Cultural=文化
  - Common materials: Pink Tower=粉红塔, Brown Stair=棕色梯, Moveable Alphabet=活动字母, Sandpaper Letters=砂纸字母, Golden Beads=金珠, Number Rods=数棒, Red Rods=红棒, Cylinder Blocks=圆柱体组, Knobless Cylinders=彩色圆柱体, Metal Insets=金属嵌板, Geometric Cabinet=几何图形橱, Color Tablets=色板, Binomial Cube=二项式, Trinomial Cube=三项式, Stamp Game=邮票游戏, Bead Frame=串珠架
  - Pedagogical terms: presentation=展示, sensitive period=敏感期, normalization=正常化, prepared environment=预备环境, control of error=错误控制, points of interest=兴趣点, direct aim=直接目的, indirect aim=间接目的
- Exported as `MONTESSORI_GLOSSARY_ZH: Record<string, string>`
- Injected into Sonnet translation prompt: "Use these established Montessori terms in Chinese: [glossary]"

### Sprint 4: Testing + Audit

**4A: Manual Test with 86 Amber Photos**
- Run batch reprocess on current classroom (login code V8F8V9)
- Verify:
  - GREEN rate (expect ~85-90%)
  - Custom works created (expect 0-5)
  - Visual memory populated (check `montree_visual_memory` count)
  - Chinese descriptions generated for any custom works
  - Report preview works in both EN and ZH with new descriptions

**4B: Transition Verification**
- After batch: verify onboarding mode has turned OFF
  - `SELECT COUNT(DISTINCT work_key) FROM montree_visual_memory WHERE classroom_id = '...'`
  - Should be ≥30% of curriculum
- Take a new photo → verify it routes through CLIP + Haiku (NOT Sonnet)
- Verify CLIP accuracy has improved with new visual memory

**4C: 3×3 Audit**
- 3 parallel agents:
  - Agent 1: Security — force_onboarding abuse, rate limit bypass, cross-school access
  - Agent 2: Data flow — visual memory generation, CLIP invalidation, cache superseding, Chinese descriptions
  - Agent 3: Cost + performance — Sonnet call costs tracked in context_snapshot, onboarding status cache TTL, batch timing
- Target: 3 consecutive CLEAN passes

---

## Files Summary

### New (3):
1. `migrations/149_onboarding_chinese.sql` — zh columns on curriculum_works
2. `lib/montree/classifier/montessori-glossary-zh.ts` — Chinese term glossary (~50 terms)
3. *(No new API routes — reuses existing photo-insight + add-custom-work)*

### Modified (8):
1. `app/api/montree/guru/photo-insight/route.ts` — Onboarding routing + force_onboarding param + visual memory on CLIP GREEN
2. `lib/montree/classifier/classroom-embeddings.ts` — getClassroomOnboardingStatus() + cache + cache invalidation
3. `app/montree/dashboard/photo-audit/page.tsx` — Reclassify button + progress UI + confirmation dialog
4. `app/api/montree/guru/photo-insight/add-custom-work/route.ts` — Chinese generation on custom work creation
5. `app/api/montree/reports/preview/route.ts` — DB zh lookup before static map for locale 'zh'
6. `app/api/montree/reports/send/route.ts` — Same DB zh lookup
7. `lib/montree/i18n/en.ts` — ~8 new keys for reprocess UI
8. `lib/montree/i18n/zh.ts` — ~8 matching Chinese keys

---

## Cost Model

| Item | Cost |
|------|------|
| Sonnet per photo (onboarding) | ~$0.03-0.06 |
| Onboarding per classroom (50-100 photos) | $1.50-6.00 one-time |
| Chinese translation per custom work | ~$0.01 (Sonnet) |
| Post-onboarding per photo (CLIP + Haiku) | ~$0.001 |
| 1000 schools onboarding total | $1,500-6,000 one-time |

---

## Design Decisions + Audit Trail

### Plan v1 → v2 (Audit findings):
- Changed threshold from absolute count (20) to coverage-based (30% of active curriculum)
- Changed batch reprocess from async server job to client-side orchestration (avoids Railway 30s timeout complexity)
- Added: still try CLIP first in onboarding mode (free classifications shouldn't be wasted)
- Changed: custom work Chinese stored in DB columns, not static file (can't write to TS files at runtime)
- Changed: Sonnet for Chinese translation instead of Haiku (user requirement: "flawless")

### Plan v2 → v3 (Audit findings):
- Changed batch from 3-concurrent to sequential (simpler, avoids rate limit issues, ~14 min acceptable for one-time onboarding)
- Added: force_onboarding server-side validation (prevent cost abuse)
- Added: rate limit handling (429 → wait 5s → retry once → stop)
- Added: Montessori Chinese glossary for translation consistency
- Added: report routes batch-query DB zh columns (not N+1)

### Plan v3 → v4 FINAL (Audit findings):
- Added: skip photos without child_id in batch reprocess (would fail on photo-insight)
- Added: super-admin bypass for force_onboarding (for post-onboarding edge cases)
- Added: cost estimate in confirmation dialog (transparency)
- Confirmed: reuse existing PROPOSE_CUSTOM_WORK_TOOL schema (no new tool definition needed)
- Confirmed: UNIQUE constraint on visual_memory means correction overwrites onboarding entry (correct behavior)
- Confirmed: existing cache-bust logic handles reprocessed photos (new interaction supersedes old)
- Confirmed: CLIP GREEN threshold stays at 0.85 in onboarding (teacher corrections handle false positives)

---

## Risks + Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sonnet misclassifies during onboarding | MEDIUM | Teacher sign-off via photo audit page; corrections overwrite visual memory at higher confidence (0.9) |
| Chinese translation quality for custom works | MEDIUM | Sonnet (best available model) + Montessori glossary in prompt; teacher can edit |
| Rate limits during batch reprocess | LOW | Sequential processing (~6 req/min); 429 handling with backoff |
| CLIP GREEN generates wrong visual memory | LOW | Teacher corrects on audit page; correction overwrites; self-healing |
| Onboarding threshold too low/high | LOW | Configurable via env var; can adjust without code deploy |
| Batch takes too long (14 min for 86 photos) | LOW | One-time per classroom; teacher sees real-time progress; can cancel |

---

## Context: What NOT to Build

- **Dynamic multi-language translation system** — Deferred. English + Chinese hardcoded for now. Translation architecture discussed in session but agreed to build after China launch and financial independence.
- **Server-side batch processing job** — Rejected in Plan v2. Client-side orchestration is simpler and avoids Railway timeout issues.
- **Permanent Sonnet review layer** — Rejected by design. Sonnet is onboarding only, not a permanent cost center.
- **Internet search for unknown works** — Deferred. Sonnet's training data covers virtually all standard Montessori materials. Custom/DIY works are described from the photo itself.

---

## Quick Start for Next Session

1. Read this handoff
2. Read `app/api/montree/guru/photo-insight/route.ts` (main file to modify)
3. Read `lib/montree/classifier/classroom-embeddings.ts` (onboarding status function goes here)
4. Read `app/api/montree/guru/photo-insight/add-custom-work/route.ts` (Chinese generation goes here)
5. Start Sprint 1A: `getClassroomOnboardingStatus()` function
6. Run migration 149 via Supabase SQL Editor
7. Build Sprint 1B: Sonnet routing in photo-insight
8. Build Sprint 2: Batch reprocess UI
9. Build Sprint 3: Chinese for custom works
10. Test with the 86 amber photos
11. 3×3 audit

**Estimated build time:** 4-6 hours across Sprints 1-3, plus 1-2 hours for Sprint 4 (testing + audit).
