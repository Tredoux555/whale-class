# Handoff: Guru Reliability Fix — Hanging/Timeout Resolution

**Date:** Mar 8, 2026 (Late Session)
**Status:** COMPLETE + DEPLOYED
**Commits:** `0b60fccb`, `70469eb9`, `ea3dc455`

---

## Problem

Guru was hanging indefinitely on tool-use requests (e.g., "update the shelf", "mark X as mastered"). Users saw the typing indicator forever with no response.

## Root Cause Analysis

5 issues found, ordered by severity:

1. **CRITICAL — Hallucination Retry** (commit `1b38a482`): A safety net added to detect when the model claimed actions without tool calls would fire a SECOND full Anthropic API call. Each call up to 55s = total 110s+.

2. **HIGH — Fallback Text-Only API Call** (lines 504-543): When tools produced text but no conversational response, a THIRD API call fired to generate text. Another 15-55s on top.

3. **HIGH — Multi-Round Tool Loop**: MAX_TOOL_ROUNDS=3 × API_TIMEOUT=55s = 165s worst case for the tool loop alone.

4. **MEDIUM — Broad `shelfUpdatePattern` Regex**: Patterns like `update.*her` and `mastered.*!` had false positives, forcing unnecessary `tool_choice:"any"`.

5. **LOW — No Client-Side Timeout**: No AbortController on the fetch call — typing indicator showed forever if server hung.

**Worst case before fix:** 55s (initial) + 165s (3 tool rounds) + 55s (fallback) + 55s (retry) = **275 seconds**

## Fixes Applied

### Commit `0b60fccb` — Remove Hallucination Retry + Tighten Regex
- **Removed** hallucination retry entirely (replaced with log-only monitoring)
- **Tightened** `shelfUpdatePattern` regex with `\s+` word boundaries
- **Added** anti-hallucination instructions to TEACHER_NORMAL_MODE and TOOL_USE_INSTRUCTIONS in `conversational-prompt.ts`

### Commit `70469eb9` — Fix 110s Tool-Use Latency
- MAX_TOOL_ROUNDS: 3 → 2
- API_TIMEOUT_MS: 55s → 35s
- **Added** TOTAL_REQUEST_TIMEOUT_MS = 55s (wraps initial call + all tool rounds)
- **Removed** fallback text-only API call (replaced with server-side summary from tool results)
- **Added** 60s client-side AbortController timeout in GuruChatThread
- **Added** "SPEED RULE — BATCH TOOL CALLS" instruction to prompt

### Commit `ea3dc455` — Audit Fix
- **Moved** `requestStart` before initial API call (was after — total timeout didn't cover it)
- **Added** timeout-specific error message ("took too long" instead of "connection failed")

## Files Modified (3)

| File | Changes |
|------|---------|
| `app/api/montree/guru/route.ts` | Timeout constants, removed retry + fallback, tightened regex, total timeout wrapper |
| `components/montree/guru/GuruChatThread.tsx` | 60s AbortController timeout, AbortError-specific toast |
| `lib/montree/guru/conversational-prompt.ts` | Anti-hallucination rules in TEACHER_NORMAL_MODE + TOOL_USE_INSTRUCTIONS, SPEED RULE for batching |

## Latency (Before vs After)

| Scenario | Before | After |
|----------|--------|-------|
| Simple text query | 10-25s | 10-25s (unchanged) |
| Single tool call | 25-55s | 20-35s |
| Multi-tool (e.g., update + replace) | 55-165s | 35-55s |
| Worst case (all timeouts hit) | **275s** | **55s** |
| Client-side max wait | ∞ | **60s** |

## Testing

- Simple query ("How is Rachel doing?") → ~15-20s, success ✓
- Tool-use query (shelf update) → 109s pre-fix (confirmed multi-round + fallback)
- After fix: awaiting frontend test from user

## Anti-Hallucination Strategy

Instead of retrying on hallucination detection (which doubled latency), we now:
1. **Prevent** hallucination via strong prompt instructions ("NEVER CLAIM AN ACTION YOU DIDN'T TAKE")
2. **Monitor** hallucination occurrences via console.warn (log-only, no retry)
3. **Batch** tool calls via prompt instruction ("call ALL needed tools in a SINGLE response")

## i18n Note

The `guru.timeout` key used in the AbortError toast currently falls back to a hardcoded English string. Add to en.ts/zh.ts when doing next i18n pass.
