# Handoff: Guru Speed Optimization (3×3×3×3)

**Date:** Mar 13, 2026 (late session)
**Status:** COMPLETE, NOT YET DEPLOYED
**Methodology:** 3×3×3×3 (3 rounds × 3 cycles each + cross-round verification)
**Files modified:** 3 (route.ts, tool-definitions.ts, conversational-prompt.ts)
**No new migrations.**

---

## Problem

Guru API responses took 10-30s. Input tokens per request: 20,000-24,000. The dominant factor is Anthropic API latency, which is proportional to input token count. Secondary factors: sequential I/O operations and sequential tool execution.

## Solution: 3-Round Optimization

### Round 1 — Mode-Based Tool Injection + Pre-API Parallelization

**Cycle 1: Mode-based tool injection (~1,200 tokens saved)**
- `lib/montree/guru/tool-definitions.ts` — Added `getToolsForMode(mode, isWholeClass)` function
- `MODE_TOOL_MAP` defines which modes each tool is available in
- `WHOLE_CLASS_ONLY_TOOLS` Set for classroom-wide tools (only when isWholeClass=true)
- NORMAL mode: 13 tools (drops save_checkin, save_child_profile, track_guidance_outcome + 3 classroom-wide)
- REFLECTION mode: 0 tools (pure conversation)
- `app/api/montree/guru/route.ts` — `modeTools` replaces static `GURU_TOOLS`, `forceToolUse` guard: `modeTools.length > 0 && ...`

**Cycle 2: Pre-API parallelization (~200-400ms saved)**
- `route.ts` — `Promise.all([buildChildContext, retrieveKnowledge, childSettings query])` runs 3 independent operations concurrently instead of sequentially

**Cycle 3: Conversation memory reduction (~1,000-2,000 tokens saved)**
- `route.ts` — `.slice(0, 3)` instead of `.slice(0, 5)` for past interactions

**Round 1 audit:** 1 issue found (forceToolUse could be true while modeTools empty in REFLECTION mode). Fixed with `modeTools.length > 0` guard. Cross-cycle verification: CLEAN.

### Round 2 — Role-Based Prompt Trimming + Parallel Tool Execution

**Cycle 2: Split TOOL_USE_INSTRUCTIONS (~550 tokens saved for parents)**
- `conversational-prompt.ts` — `TOOL_USE_INSTRUCTIONS` split into:
  - `TOOL_USE_INSTRUCTIONS_BASE` (lines 332-389, shared, all users): shelf updates, tool guide, pattern detection, speed rule, curriculum browsing, custom works
  - `TOOL_USE_INSTRUCTIONS_CLASSROOM` (lines 391-446, teacher-only): classroom-wide tools, cross-child shelf updates, area analytics, photo-aware responses, work creation with photo
- Injection at line 720: `systemPrompt += BASE; if (isTeacher) { systemPrompt += CLASSROOM; }`

**Cycle 3: Parallel tool execution (~100-400ms saved per tool round)**
- `route.ts` — Tool execution loop changed from sequential `for...of` + `await` to `Promise.all(toolPromises.map(async ...))`
- Each tool call resolves independently; results collected via `Promise.all`
- Student name resolution (whole-class mode) happens inside each promise before `executeTool()`

**Round 2 audit:** 0 issues. Cross-cycle verification: CLEAN.

### Round 3 — Analysis + Final Verification

Research confirmed diminishing returns — remaining candidates (mode-specific max_tokens, further prompt deduplication) had poor risk/reward ratios. Full cross-round verification with agent: all 5 scenarios validated, no stale references, no integration issues.

## Token Impact Summary

| Optimization | Tokens Saved | % of Input |
|---|---|---|
| Mode-based tool injection (NORMAL) | ~1,200 | 6% |
| Conversation memory 5→3 | ~1,000-2,000 | 5-10% |
| Question classifier (earlier session) | ~1,000-3,200 | 5-16% |
| Role-based tool instructions (parents) | ~550 | 3% |
| **Total per request** | **~2,750-6,950** | **~14-35%** |

Combined with earlier question classifier: **~30-50% total input token reduction.**

## Latency Impact

| Optimization | Time Saved |
|---|---|
| Pre-API parallelization | ~200-400ms |
| Tool execution parallelization | ~100-400ms per round |
| Token reduction → faster TTFT | ~700-1,750ms |
| **Total estimated** | **~1-3 seconds faster** |

## Files Modified (3)

1. **`lib/montree/guru/tool-definitions.ts`** — Added `getToolsForMode()`, `MODE_TOOL_MAP`, `WHOLE_CLASS_ONLY_TOOLS`, `GuruMode` type
2. **`app/api/montree/guru/route.ts`** — 9 edits: import, variable declarations, 2× Promise.all parallelization, modeTools variable, forceToolUse guard, modeTools in API params, tools_injected metric, memory slice, duplicate fetch removal, parallel tool execution
3. **`lib/montree/guru/conversational-prompt.ts`** — Split `TOOL_USE_INSTRUCTIONS` into `_BASE` + `_CLASSROOM`, conditional injection

## Audit Summary

- **Round 1:** 3 cycles, 9 plan audits, 9 build audits, 1 cross-cycle verification. 1 issue found and fixed.
- **Round 2:** 3 cycles, 9 plan audits, 9 build audits, 1 cross-cycle verification. 0 issues.
- **Round 3:** 1 research cycle + 1 full cross-round agent verification. 0 issues.
- **Total:** 36+ audits, 3 cross-verifications, 1 issue found and fixed. All CLEAN.

## Deploy

⚠️ NOT YET PUSHED. No new migrations. Include in consolidated push.
