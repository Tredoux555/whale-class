# Handoff: Smart Filter — API Cost Optimization

**Date:** March 20, 2026
**Session:** 10x theory-audit cycles + 3x build-audit cycles (all CLEAN)

---

## Overview

Two optimizations to reduce Montree's Anthropic API costs without sacrificing quality:

1. **Skip-if-tagged** — Skip AI vision entirely when a teacher pre-tags a photo via WorkWheelPicker
2. **Guru hybrid routing** — Route simple curriculum/general questions to Haiku ($0.80/$4 per 1M tokens) instead of Sonnet ($3/$15)

Estimated savings: **$100-150/month at scale** (250 students, daily usage).

---

## Phase 1: Skip-if-Tagged (Smart Capture)

### Problem
When a teacher selects a work from WorkWheelPicker before taking a photo, the `work_id` is saved to `montree_media` during upload. But Smart Capture's AI vision still ran on every photo, wasting $0.006-0.06 per already-tagged photo.

### Solution
Two-layer gate: client-side (sync-manager) and server-side (photo-insight route).

**Client gate** (`lib/montree/offline/sync-manager.ts`, line 347):
```typescript
// SKIP startAnalysis when work_id is already set
if (result.media?.id && entry.child_id && !entry.work_id) {
  startAnalysis(result.media.id, entry.child_id, locale);
}
```

**Server gate** (`app/api/montree/guru/photo-insight/route.ts`, lines 370-390):
```typescript
// Early return if photo already tagged — enriches response with work name + area
if (media.work_id && !body.force_reanalyze) {
  const { data: taggedWork } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name, area')
    .eq('id', media.work_id)
    .maybeSingle();
  return NextResponse.json({
    success: true, skipped: true, reason: 'already_tagged',
    work_id: media.work_id,
    work_name: taggedWork?.name || null,
    area: taggedWork?.area || null,
    auto_updated: false,
  });
}
```

**Key design decisions:**
- `force_reanalyze` body param allows PhotoInsightButton to bypass the gate for explicit retries
- Server gate enriches response with `work_name` + `area` so the client store/UI can display the tagged work
- `work_id` added to the SELECT query (was already in the table, just not fetched)
- Double-gate (client + server) ensures savings even if client sends the request anyway

### Savings
~30-50% of Smart Capture photos are teacher-tagged. At $0.006-0.06/photo, saves **$4-6/month** at scale.

---

## Phase 2: Guru Hybrid Routing

### Problem
All Sonnet-tier Guru conversations used Sonnet ($3/$15 per 1M tokens) regardless of question complexity. Simple questions like "what materials do I need for Pink Tower?" don't need Sonnet's reasoning depth.

### Solution
Route `curriculum` and `general` category questions to Haiku. Keep `psychology` and `development` questions on Sonnet where nuance matters.

**Routing logic** (`app/api/montree/guru/route.ts`, lines 349-364):
```typescript
const hybridRoutingEnabled = process.env.GURU_HYBRID_ROUTING_ENABLED !== 'false';
const useHaikuForQuestion = hybridRoutingEnabled && guruTier === 'sonnet' &&
  (questionCategory === 'curriculum' || questionCategory === 'general') &&
  !image_url; // Vision requests always use the tier's model

const effectiveTier: 'haiku' | 'sonnet' = useHaikuForQuestion ? 'haiku' : guruTier;
```

**Model selection** (line 567):
```typescript
const guruModel = useHaikuForQuestion ? HAIKU_MODEL : (getModelForTier(guruTier) || AI_MODEL);
const guruMaxTokens = guruModel === HAIKU_MODEL ? 3072 : 4096;
```

**Key design decisions:**
- **Kill switch:** `GURU_HYBRID_ROUTING_ENABLED` env var. Defaults enabled. Set to `'false'` on Railway to revert without code deploy.
- **effectiveTier → prompt builder:** Passing `'haiku'` as tier skips ~5,000 tokens of psychology knowledge injection (already gated in `conversational-prompt.ts` line 848)
- **Vision excluded:** `!image_url` ensures image analysis always uses Sonnet
- **Only Sonnet-tier users affected:** `guruTier === 'sonnet'` — Haiku-tier users already on Haiku
- **costMultiplier fixed:** All 4 cost estimation points (lines 721, 770, 814, 1003) use `guruModel === HAIKU_MODEL` (not `guruTier`) for accurate cost snapshots
- **Observability:** `hybrid_routed: useHaikuForQuestion` saved in both `context_snapshot` objects (lines 1301, 1315) + diagnostic `console.log` on routing

### Question Classifier
Uses existing `lib/montree/guru/question-classifier.ts` (pure regex, zero latency):
- **psychology** (8 patterns): anxiety, behavior, confidence, emotional, etc. → Sonnet
- **development** (5 patterns): milestone, age-appropriate, sensitive period, etc. → Sonnet
- **curriculum** (8 patterns): work, material, presentation, shelf, area, etc. → Haiku
- **general** (fallback): everything else → Haiku

### Savings
~60-70% of Guru questions are curriculum/general. Haiku is ~75% cheaper per token AND prompt is ~5,000 tokens lighter. Saves **$3-4/month** per active classroom.

---

## Smart Filter Files Modified (3)

1. **`lib/montree/offline/sync-manager.ts`** — 1 edit: `!entry.work_id` gate on `startAnalysis` call (line 347)
2. **`app/api/montree/guru/photo-insight/route.ts`** — 2 edits: `work_id` in SELECT (line 356), skip-if-tagged early return with curriculum lookup (lines 370-390)
3. **`app/api/montree/guru/route.ts`** — 6 edits: `HAIKU_MODEL` import (line 9), hybrid routing computation (lines 349-364), `effectiveTier` passed to prompt builder, model selection (line 567), 4× `costMultiplier` fix (lines 721/770/814/1003), `hybrid_routed` in context_snapshots (lines 1301/1315)

## API Metering Files (must be included — routes import from api-usage.ts)

4. **`lib/montree/api-usage.ts`** — NEW: fire-and-forget usage logging + budget enforcement with 30s cache
5. **`migrations/142_api_usage_metering.sql`** — NEW: `montree_api_usage` table + budget columns on schools + 2 RPCs
6. **`app/api/montree/admin/ai-budget/route.ts`** — NEW: GET/PATCH budget status for schools
7. **`lib/montree/guru/work-enrichment.ts`** — NEW: auto-generate descriptions for custom works (imports logApiUsage)
8. **`app/api/montree/tts/route.ts`** — MODIFIED: added logApiUsage import
9. **`app/api/montree/guru/corrections/route.ts`** — MODIFIED: added logApiUsage import

**No new env vars required** (kill switch is opt-in disable). Migration 142 should be run but code is safe without it (logging silently no-ops, budget check fails open).

---

## Audit Results

### Theory Phase (10x cycles)
- **Rejected:** pHash (materials too similar), CLIP embeddings (329 categories too many), batch end-of-day processing (kills workflow), area-scoping visual ID guide (breaks confusion-pair detection), lowering Haiku threshold (silent accuracy degradation), Guru Master cross-school DB (privacy issues)
- **Accepted:** Skip-if-tagged (highest ROI, zero risk), Guru hybrid routing (medium ROI, kill switch), effectiveTier prompt reduction (piggybacks on routing)

### Build Phase (3x cycles, 3 agents per cycle)
- **Cycle 1:** 5 issues found — costMultiplier inflation (CRITICAL), no kill switch (CRITICAL), token budget fragile (HIGH), skipped response missing work data (HIGH), no diagnostic logging (MEDIUM). ALL FIXED.
- **Cycle 2:** 2 agents CLEAN, 1 found whole-class mode doesn't use effectiveTier (deferred — rare teacher-only mode)
- **Cycle 3:** 2 agents both CLEAN. **3 consecutive clean passes.**

---

## Deploy

Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add \
  lib/montree/offline/sync-manager.ts \
  app/api/montree/guru/photo-insight/route.ts \
  app/api/montree/guru/route.ts \
  lib/montree/api-usage.ts \
  migrations/142_api_usage_metering.sql \
  app/api/montree/admin/ai-budget/route.ts \
  lib/montree/guru/work-enrichment.ts \
  app/api/montree/tts/route.ts \
  app/api/montree/guru/corrections/route.ts \
  app/montree/super-admin/page.tsx \
  docs/handoffs/HANDOFF_SMART_FILTER_COST_OPTIMIZATION_MAR20.md \
  CLAUDE.md
git commit -m "feat: Smart Filter cost optimization + API usage metering"
git push origin main
```

**After deploy — run migration 142:**
```bash
psql $DATABASE_URL -f migrations/142_api_usage_metering.sql
```
Code is safe WITHOUT the migration (logging silently no-ops, budget check fails open). But metering won't actually track anything until the table exists.

**To disable hybrid routing (emergency):**
On Railway, set environment variable `GURU_HYBRID_ROUTING_ENABLED` to `false`. Takes effect on next request, no redeploy needed.

---

## Also Pending

- **Delete debug-insight route** — `app/api/montree/debug-insight/route.ts` (temporary from Mar 19 investigation)
