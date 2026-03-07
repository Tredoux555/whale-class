# Handoff: Guru Curriculum Browsing Tools — Mar 8, 2026

## Summary

Added 3 read-only curriculum tools to the Guru so it can browse, search, and check progress against the full 329-work Montessori curriculum. Previously the Guru could SET focus works but couldn't SEE what was available — it was flying blind.

## What Was Built

### 3 New Guru Tools (read-only, no DB writes)

1. **`browse_curriculum`** — Browse works by area with optional category filter. Returns name, category, age range, description. Capped at 30 results.

2. **`get_child_curriculum_status`** — See a child's progress in any area. Returns every work with its status (mastered/practicing/presented/not_started) and whether it's the current focus work.

3. **`search_curriculum`** — Free-text keyword search across all 329 works. Matches names, descriptions, materials, categories. Capped at 20 results.

### Files Modified (3 files, 180 insertions)

- `lib/montree/guru/tool-definitions.ts` — 3 new tool schemas added (browse_curriculum, get_child_curriculum_status, search_curriculum)
- `lib/montree/guru/tool-executor.ts` — 3 new case blocks in executeTool switch. All read-only. Area enum validation, try-catch on curriculum loading, token-optimized output.
- `lib/montree/guru/conversational-prompt.ts` — Added CURRICULUM BROWSING section to TOOL_USE_INSTRUCTIONS (6 lines)

### Audit Fixes (separate commit)

- Area enum validation on browse_curriculum and get_child_curriculum_status (prevents silent empty results)
- try-catch around `loadAllCurriculumWorks()` in all 3 tools (graceful failure)
- Reduced browse cap from 50→30, descriptions from 100→80 chars
- Removed internal `sequence` field from browse output

### Marketing Quote Added

Added "Killer Quotes" section to Nerve Center marketing page (`nerve-center/page.tsx`) with 3 Guru value proposition quotes for use in marketing campaigns.

## Architecture Notes

- No changes needed to `route.ts` — existing tool loop handles new tools automatically
- Tools are available in SETUP, INTAKE, CHECKIN, NORMAL modes (same as existing tools)
- REFLECTION mode intentionally excluded (lightweight chats, no tools)
- `loadAllCurriculumWorks()` is called per tool invocation (no caching) — fast enough since it reads from static JSON imports
- Token overhead per tool call: ~550-1,000 tokens (negligible)

## Commits

- `45b6aedf` — feat: add 3 curriculum browsing tools to Guru
- `bd90c3ba` — fix: audit fixes for curriculum tools — enum validation, try-catch, token cap

## Guru Performance Context

Guru response time (10-30s) is normal given the architecture:
- System prompt is ~13,000 tokens (teacher base + 12 tool definitions + psychology knowledge + language progression + ESL + sensitive periods + mode instructions + shelf context)
- Total input per call: ~20-25K tokens
- Each Sonnet call: 5-15s. Tool rounds add 5-15s each (max 3 rounds).
- Biggest prompt bloat: psychology knowledge (5,000 tokens dumped in full every time — `getRelevantPsychologyKnowledge()` returns everything). Future optimization: make it topic-selective.

## Deploy

✅ Pushed to main, Railway auto-deploy.
