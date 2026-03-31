# Handoff: Principal Admin Guru — Answer Quality Fix

**Date:** Mar 30, 2026
**Status:** ⚠️ NOT YET PUSHED (part of Principal Admin Guru feature, no migrations needed)
**Methodology:** 3×3×3 (3 cycles × 3 parallel agents = 9 independent audits, ALL CLEAN)

---

## Problem

The Principal Admin Guru was producing unusable output. When asked "can you show me who's logged into their classrooms in the last 24 hours?", the response showed:
- Raw intermediate narration of the query process ("Let me query the teachers table...")
- 4 opaque tool call indicators with function names
- **No synthesized, human-readable answer**

The principal said: "This information means nothing to me."

## Root Causes (5)

1. **System prompt** had no instructions about always producing a clear final summary after using tools
2. **Route** emitted ALL text blocks identically — intermediate narration and final answers looked the same (both `type: 'text'`)
3. **No forced synthesis** mechanism when tool rounds exhausted without a final text answer
4. **Frontend** rendered all text as plain `whitespace-pre-wrap` with no distinction between thinking and answer
5. **Tool calls** displayed as opaque function names with no human-readable labels

## Fix (3 files, 3×3×3 audited)

### File 1: `lib/montree/admin/guru-prompt.ts` (1 edit)

Added "## Response Format — CRITICAL" section with 6 rules between "Formatting" and "Safety & Privacy" sections:
1. Always end with a clear, direct answer to the question
2. Lead with the answer, not the process — minimize narration of what you're doing
3. Frame as actionable recommendations when appropriate
4. Batch related queries into single tool calls to minimize rounds
5. Format for quick scanning — use tables, bullet lists, bold for key numbers
6. Highlight exceptions and anomalies (e.g., "0 logins" is more important than "5 logins")

### File 2: `app/api/montree/admin/guru/chat/route.ts` (restructured SSE streaming)

**Thinking vs Answer distinction:**
- Text emitted during rounds where `hasToolUse === true` → `{ type: 'thinking' }` SSE event
- Text emitted during rounds where `hasToolUse === false` → `{ type: 'text' }` SSE event
- Text is buffered per round in `roundTextParts[]`, then emitted as the correct type after all blocks are processed

**Forced synthesis round:**
- After the main while loop, if `lastRoundHadToolUse` is true (model hit MAX_TOOL_ROUNDS or timeout without writing a final answer), one additional API call is made WITHOUT tools to force Claude to summarize everything it found
- Synthesis text emitted as `{ type: 'text' }` so frontend renders it as the final answer
- Timeout bounded by remaining time: `Math.min(API_TIMEOUT_MS, Math.max(5000, remaining - 1000))`
- Non-fatal: wrapped in try-catch, falls back to whatever text accumulated during tool rounds

**State tracking added:**
- `lastRoundHadToolUse: boolean` — tracks whether the most recent round had tool_use blocks
- `roundTextParts: string[]` — buffers text blocks per round before emitting

### File 3: `app/montree/admin/guru/page.tsx` (complete rewrite ~740 lines)

**New SSE event handling:**
- `StreamEvent` union type includes `{ type: 'thinking'; text: string }`
- `Message` interface has `thinkingContent?: string` field
- Separate accumulators: `assistantContent` for answer, `thinkingContent` for thinking
- Text events always merge with existing assistant message (no split messages)
- Done handler merges all accumulated data (content, thinkingContent, toolCalls) into final message

**Human-readable tool labels:**
- `getToolLabel(name, input)` maps all 12 tool names to readable labels:
  - `query_school_data` → "Querying {table}" (uses input.table_name)
  - `get_student_detail` → "Looking up student details"
  - `get_classroom_detail` → "Checking classroom"
  - etc.
- Graceful fallback: unknown tools → `name.replace(/_/g, ' ')`

**Markdown rendering:**
- `renderMarkdown(text)` renders tables, bullet lists, numbered lists, headings (h1-h4), paragraphs
- `renderInlineMarkdown(text)` renders **bold** and `code` inline
- Table parser preserves empty cells (strips only outer pipe delimiters)
- Handles empty/whitespace-only text gracefully

**ThinkingBlock component:**
- Collapsible block showing intermediate reasoning
- Open while streaming, auto-collapses when streaming finishes
- Chevron toggle, muted styling to distinguish from answer

**Message layout:**
1. Tool steps — compact progress indicators with ✓/✗/spinner icons and human-readable labels
2. Thinking — collapsible ThinkingBlock (auto-collapsed after streaming)
3. Answer — prominent section with full markdown rendering
4. Fallback — "Preparing response..." if nothing above rendered yet

## Audit Summary

| Cycle | Agents | Findings | Status |
|-------|--------|----------|--------|
| 1 | 3 (build) | Built all 3 files | COMPLETE |
| 2 | 3 (audit) | 6 findings: 1 CRITICAL, 2 HIGH, 1 MEDIUM (false positive), 1 MEDIUM, 1 LOW | ALL FIXED |
| 3 | 3 (verify) | 0 findings | ALL CLEAN ✅ |

**Cycle 2 fixes applied (5):**
1. **CRITICAL:** Synthesis timeout not bounded by remaining time → `Math.min(API_TIMEOUT_MS, Math.max(5000, remaining - 1000))`
2. **HIGH:** `text` event created new message when toolCalls existed → always merge with existing assistant message
3. **HIGH:** `done` handler filter+replaced message → merge with spread of existing fields
4. **MEDIUM:** `renderMarkdown` didn't handle whitespace-only text → added `!text.trim()` check
5. **LOW:** Table `parseRow` used `.filter(Boolean)` dropping empty cells → strip only outer pipe delimiters

## Files Modified (3)

1. `lib/montree/admin/guru-prompt.ts` — 1 edit: Response Format CRITICAL section (~20 lines added)
2. `app/api/montree/admin/guru/chat/route.ts` — Restructured SSE streaming (thinking vs text distinction, forced synthesis, bounded timeout)
3. `app/montree/admin/guru/page.tsx` — Complete rewrite (~740 lines): markdown rendering, ThinkingBlock, tool labels, message merging

## Deploy

⚠️ NOT YET PUSHED. Part of the Principal Admin Guru feature (5 files created Mar 30). No migrations needed.

## User Experience After Fix

**Before:** Raw tool call indicators + intermediate narration. No answer.

**After:**
- Compact tool progress: "✓ Querying montree_teachers" / "✓ Looking up student details"
- Collapsible "Thinking..." block (open while streaming, auto-collapses)
- Clear, formatted final answer with tables, bold numbers, bullet points
- Actionable recommendations highlighted
