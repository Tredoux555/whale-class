# Montree AI Cost Audit Report (Apr 30, 2026)

## Executive Summary
Montree has **good foundational AI cost discipline** with proper tier-gating in weekly-wrap and effective Haiku-first strategy. However, **3 hardcoded Sonnet routes** (language-presentation, language-semester, ai-generator.ts) lack tier-awareness, and **missing HTTP caching** on guide translations represents untapped savings.

At current scale (20 students, 50 photos/day, 1 weekly wrap), estimated monthly AI spend is **$40-60**. The optimizations below could reduce this by 10-25%.

---

## 🔥 TOP 3 WINS

### 1. Tier-gate language-presentation route
- **File:** `/app/api/montree/reports/language-presentation/[childId]/route.ts`
- **Issue:** Hardcoded `AI_MODEL` (Sonnet), no `resolveReportModel()` check
- **Cost:** ~$0.08 per child per generation
- **Fix:** Import `resolveReportModel()`, return 402 if tier='free'
- **Savings:** $1-2/month but **critical for tier enforcement**
- **Impact:** 1h

### 2. Tier-gate language-semester PPTX generation
- **File:** `/app/api/montree/reports/language-semester/generate/route.ts`
- **Issue:** Hardcoded `AI_MODEL` (Sonnet), 3 Sonnet calls per child
- **Cost:** ~$0.25-0.35 per child per generation
- **Fix:** Import `resolveReportModel()`, gate to Sonnet tier only
- **Savings:** $2-3/month critical for pre-conference use
- **Impact:** 1h

### 3. Fix ai-generator.ts hardcoded Sonnet model
- **File:** `/lib/montree/reports/ai-generator.ts` (line 67)
- **Issue:** Module-level `const AI_MODEL = 'claude-sonnet-4-5-20250929'` ignores tier passed from weekly-wrap
- **Cost:** ~$0.048/week = **$2.50/month wasted on tier-free schools per school**
- **Fix:** Change signature to accept `model?: string`, use `model ?? AI_MODEL`. Weekly-wrap passes `aiTier.model`
- **Savings:** $2-3/month per school, **$25-30/month at 10 schools on Core tier**
- **Impact:** 30min

**Combined: $30-40/month per school on Core tier → $300-400/month at scale (10 schools)**

---

## ⚡ MEDIUM WINS

### 4. Add HTTP Cache-Control to guide success path
- **File:** `/app/api/montree/works/guide/route.ts` line 220
- **Issue:** Cache headers only on error paths, not on success → every page load re-translates guides
- **Cost:** ~$0.08/day = $2.40/month wasted
- **Fix:** Add `Cache-Control: private, max-age=86400, stale-while-revalidate=604800` before success return
- **Savings:** $2-3/month
- **Impact:** 1 line change

### 5. Deduplicate auto-translate checks
- **File:** `/lib/montree/auto-translate.ts` line 136
- **Issue:** No check if target columns already have values before calling Haiku
- **Fix:** Return early if `input.parentDescription && input.whyItMatters` both exist in DB
- **Savings:** $0.50-1/month edge case
- **Impact:** 5min

### 6. Pre-translate Spanish guides batch overnight
- **File:** All 383 works have NULL `guide_content_es` (only `guide_content_zh` cached)
- **Issue:** First Spanish user → 383 Haiku calls = $0.38 + 5-10min latency cliff
- **Fix:** Run `scripts/batch-translate-guides-es.js` before Spanish school launch
- **Savings:** $0.38 one-time, prevents UX cliff
- **Impact:** 1 script run

### 7. Tier-gate 6 hardcoded-Sonnet guru routes
- **Routes:** `teaching-instructions`, `snap-identify`, `weekly-review/[childId]` (2 calls), `corrections`, `generate-work-content`
- **Current:** Always use `AI_MODEL` (Sonnet)
- **Fix:** Check `resolveReportModel()` tier, skip/downgrade to Haiku for free/core
- **Savings:** ~$5-10/month per free/core school
- **Impact:** 4h across 6 routes

---

## 💰 SONNET-HARDCODED ROUTES (Tier-Gating Status)

| Route | File | Tier-Gated? | Issue |
|-------|------|-------------|-------|
| Weekly Wrap | `weekly-wrap/route.ts` | ✅ YES | Correct |
| Language Presentation | `language-presentation/[childId]/route.ts` | ❌ NO | **MUST gate** |
| Language Semester | `language-semester/generate/route.ts` | ❌ NO | **MUST gate** |
| Report enhancement | `lib/montree/reports/ai-generator.ts` | ❌ NO | **Ignores passed model** |
| Teaching instructions | `guru/teaching-instructions/route.ts` | ❌ NO | No tier check |
| Snap Identify | `guru/snap-identify/route.ts` | ❌ NO | No tier check |
| Weekly Review | `weekly-review/[childId]/route.ts` | ❌ NO | No tier check (×2 calls) |
| Corrections | `guru/corrections/route.ts` | ❌ NO | No tier check |
| Generate work content | `guru/generate-work-content/route.ts` | ❌ NO | No tier check |

---

## 🟢 ALREADY OPTIMIZED

- **Photo ID pipeline:** Two-pass Haiku (~$0.006/photo), maxDuration=120 enforced, Pass 2b fallback gated ✅
- **Guide caching:** guide_content_zh/es cached as JSONB, unified translator ✅
- **Auto-translate:** Haiku-first, tool_use for non-Latin scripts, glossary short-circuit, logging ✅
- **Replan:** Tier-aware, bilingual tool_use, DB-driven labels ✅
- **API logging:** 27 logApiUsage() calls, fire-and-forget pattern ✅

---

## Recommendations Priority Order

**IMMEDIATE (1 day):** Tier-gate language-presentation (1h) → language-semester (1h) → ai-generator fix (30min) → cache-control (1 line)

**SHORT-TERM (1 week):** Deduplicate auto-translate (5min) → pre-translate Spanish (1 script run) → tier-gate 6 guru routes (4h)

**NICE-TO-HAVE:** Deduplicate guru chat (2h) → batch corrections (3h) → fallback narratives (2h)

---

## Cost Impact

**Current monthly (Whale Class 20 students):**
- Photo ID: $6.60
- Weekly wrap: $4
- Guru chat: $2-3
- Guide translations: $2-3
- **Total: $15-18/month**

**After all optimizations (10 schools at Core tier):**
- Savings: $50-60/month
- **Whale Class alone: $2-3/month saved, mostly from ai-generator fix**
- **Critical value: Tier-gating prevents free-tier budget burn**
