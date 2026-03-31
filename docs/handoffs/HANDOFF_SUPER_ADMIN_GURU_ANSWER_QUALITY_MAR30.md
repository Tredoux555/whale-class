# Handoff: Super-Admin Guru — Answer Quality Fix

**Date:** Mar 30, 2026
**Status:** ⚠️ NOT YET PUSHED (part of Super-Admin Guru feature, no migrations needed)
**Methodology:** Applied same proven pattern as Principal Admin Guru fix (HANDOFF_PRINCIPAL_GURU_ANSWER_QUALITY_MAR30.md)

---

## Problem

The Super-Admin Guru was producing raw intermediate thinking text and opaque tool call indicators instead of clear, human-readable answers. When asking "who's logged in?", the response showed thinking narration ("Let me query...") and function names but no synthesized answer with school names, teacher names, or login times.

## Root Causes (same 5 as Principal Guru)

1. **System prompt** had no instructions about always producing a clear final summary after using tools
2. **Route** emitted ALL text blocks identically — intermediate narration and final answers both `type: 'text'`
3. **No forced synthesis** mechanism when tool rounds exhausted without a final text answer
4. **Frontend** rendered all text as plain `whitespace-pre-wrap` with no distinction between thinking and answer
5. **Tool calls** displayed as opaque function names with no human-readable labels

## Fix (3 files + 1 verification fix)

### File 1: `lib/montree/super-admin/guru-prompt.ts` (1 edit)

Added "## Response Format — CRITICAL" section with 6 rules between "Formatting" and "Safety & Validation" sections:
1. Always end with a clear, direct answer to the question
2. Lead with the answer, not the process
3. Frame as actionable insights when appropriate
4. Batch related queries into single tool calls
5. Format for quick scanning — tables, bullet lists, bold
6. Highlight exceptions and anomalies

### File 2: `app/api/montree/super-admin/guru/route.ts` (restructured SSE streaming)

**Thinking vs Answer distinction:**
- Text emitted during rounds where `hasToolUse === true` → `{ type: 'thinking' }` SSE event
- Text emitted during rounds where `hasToolUse === false` → `{ type: 'text' }` SSE event
- Text is buffered per round in `roundTextParts[]`, then emitted as the correct type after all blocks are processed

**Two-pass block processing:**
- First pass: collects text + detects tool_use, emits text as thinking or text
- Second pass: executes tools (no duplicate collecting)

**Forced synthesis round:**
- After the main while loop, if `lastRoundHadToolUse` is true, one additional API call is made WITHOUT tools to force Claude to summarize everything it found
- Synthesis text emitted as `{ type: 'text' }` so frontend renders it as the final answer
- Timeout bounded by remaining time: `Math.min(API_TIMEOUT_MS, Math.max(5000, remaining - 1000))`
- Non-fatal: wrapped in try-catch, falls back to whatever text accumulated during tool rounds

**State tracking added:**
- `lastRoundHadToolUse: boolean` — tracks whether the most recent round had tool_use blocks
- `roundTextParts: string[]` — buffers text blocks per round before emitting

### File 3: `components/montree/super-admin/SuperAdminGuru.tsx` (complete rewrite ~540 lines)

**New SSE event handling:**
- `StreamEvent` union type includes `{ type: 'thinking'; text: string }`
- `Message` interface has `thinkingContent?: string` field
- Separate accumulators: `assistantContent` for answer, `thinkingContent` for thinking
- All event handlers (thinking, text, tool_call, tool_result, error, done) merge with existing assistant message
- Done handler merges all accumulated data into final message

**Human-readable tool labels:**
- `getToolLabel(name, input)` maps all 15 tool names to readable labels:
  - `query_table` → "Querying {table}" (uses input.table_name)
  - `query_stats` → "Running stats on {table}"
  - `query_custom` → "Running {query_name}"
  - `search_across_tables` → 'Searching for "{term}"'
  - `get_system_health` → "Checking system health"
  - `get_school_detail` → "Getting school details"
  - `get_audit_log` → "Reviewing audit log"
  - `delete_school` → "Deleting school (requires confirmation)"
  - `update_school_settings` → "Updating school settings"
  - `toggle_feature` → "Toggling feature: {name}"
  - `manage_lead` → "Managing lead"
  - `get_lead_overview` → "Getting lead overview"
  - `draft_email` → "Drafting email"
  - `get_campaign_stats` → "Getting campaign stats"
  - `run_named_query` → "Running: {query_name}"
- Graceful fallback: unknown tools → `name.replace(/_/g, ' ')`

**Markdown rendering:**
- `renderMarkdown(text)` renders tables, bullet lists, numbered lists, headings (h1-h4), paragraphs
- `renderInlineMarkdown(text)` renders **bold** and `code` inline
- Table parser preserves empty cells (strips only outer pipe delimiters)
- Handles empty/whitespace-only text gracefully

**ThinkingBlock component:**
- Collapsible block showing intermediate reasoning
- Open while streaming, auto-collapses when streaming finishes via `streamingDone` state
- Chevron toggle, muted styling to distinguish from answer

**Message layout:**
1. Tool steps — compact progress indicators with ✓/✗/spinner icons and human-readable labels
2. Thinking — collapsible ThinkingBlock (auto-collapsed after streaming)
3. Answer — prominent section with full markdown rendering
4. Fallback — "Preparing response..." if nothing above rendered yet

### Verification Fix (1 bug found)

**Error event handler** was creating a new message instead of merging with existing assistant message — fixed to merge when assistant message exists, create new only as fallback.

## Files Modified (3)

1. `lib/montree/super-admin/guru-prompt.ts` — 1 edit: Response Format CRITICAL section (~20 lines added)
2. `app/api/montree/super-admin/guru/route.ts` — Restructured SSE streaming (thinking vs text distinction, forced synthesis, bounded timeout)
3. `components/montree/super-admin/SuperAdminGuru.tsx` — Complete rewrite (~540 lines): markdown rendering, ThinkingBlock, tool labels, message merging, error handler fix

## Deploy

⚠️ NOT YET PUSHED. Part of the Super-Admin Guru feature. No migrations needed.

## User Experience After Fix

**Before:** Raw thinking text + tool function names. No answer.

**After:**
- Compact tool progress: "✓ Querying montree_teachers" / "✓ Getting school details"
- Collapsible "Thinking..." block (open while streaming, auto-collapses)
- Clear, formatted final answer with tables, bold numbers, bullet points
- Actionable insights highlighted (e.g., "3 schools haven't logged in for 30+ days")
