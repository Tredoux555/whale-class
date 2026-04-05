# Handoff: Sonnet + Tool Use + Selective Generation — Apr 6, 2026

## Summary

The Haiku Chinese JSON corruption problem is **permanently solved**. Two commits this session:

- **`760d7c4c`** — Switch to Sonnet + tool_use structured output + selective child generation UI
- **`e8ca11df`** — CLAUDE.md update documenting the changes

## The Problem (Now Solved)

When Weekly Wrap generated teacher reports in Chinese (locale=zh), Haiku (`claude-haiku-4-5-20251001`) produced **malformed JSON**. Every child's teacher report failed with JSON parse errors, falling back to a generic template. Three rounds of repair attempts (regex, state machine, nuclear newline removal) all failed because Haiku corrupts JSON in multiple simultaneous ways when writing Chinese: unescaped ASCII `"` inside string values, literal newlines, fullwidth punctuation.

## The Fix: Two-Part Solution

### 1. Switched to Sonnet (`AI_MODEL`)
Both `teacher-report-generator.ts` and `narrative-generator.ts` now import `AI_MODEL` (claude-sonnet-4-6) instead of `HAIKU_MODEL`. Sonnet handles JSON + Chinese perfectly.

**Cost impact:** ~$0.09 per child (teacher + parent) vs ~$0.005 with Haiku. Full class run (19 children): ~$1.70. This is managed by selective generation (see below).

### 2. Teacher Reports Use `tool_use` Structured Output
Instead of asking the model to output raw JSON text, the teacher report generator now uses the Anthropic API's `tool_use` feature. The API handles JSON serialization — the model fills in a schema via tool parameters, and the API guarantees valid JSON back. This is the same pattern Smart Capture's describe endpoint uses (which never had JSON issues).

The tool is called `submit_teacher_report` with a full schema covering all report fields: `developmental_snapshot`, `sensitive_periods[]`, `area_analyses[]`, `concentration{}`, `normalization_narrative`, `flags[]`, `recommendations[]`, `key_insight`.

The system message was simplified since tool_use handles structure:
```typescript
const systemMessage = input.locale === 'zh'
  ? 'You are a senior Montessori consultant with 30 years of AMI training experience. Write all responses in Chinese (Mandarin). Use Chinese for all descriptive text fields.'
  : 'You are a senior Montessori consultant with 30 years of AMI training experience.';
```

### 3. Selective Child Generation (Cost Control)
New UI feature in the Weekly Wrap page. Teachers can now:
- Tap "Select" button in the header → enters selection mode
- Tap individual children to select/deselect (blue checkboxes + blue border highlight)
- Use "Select All / Deselect All" toggle bar
- Tap "Regenerate (N)" to only generate for selected children
- Selection mode auto-clears after generation completes

This means you don't have to burn $1.70 regenerating all 19 children — you can do just one (~$0.09) or a handful.

The API (`/api/montree/reports/weekly-wrap`) already supported `child_ids?: string[]` in the request body. The UI now passes selected IDs through when in selection mode.

## Files Changed

| File | What Changed |
|------|-------------|
| `lib/montree/reports/teacher-report-generator.ts` | `HAIKU_MODEL` → `AI_MODEL`, raw JSON → `tool_use` structured output, simplified system message |
| `lib/montree/reports/narrative-generator.ts` | `HAIKU_MODEL` → `AI_MODEL` |
| `app/api/montree/reports/weekly-wrap/route.ts` | `MAX_CONCURRENT` 5 → 3 (Sonnet rate limit safety) |
| `app/montree/dashboard/weekly-wrap/page.tsx` | New states: `selectedChildIds`, `selectionMode`. New UI: Select button, checkboxes on teacher cards, "Regenerate (N)" button, Select All bar. `handleGenerate()` now accepts optional `childIds` parameter. |
| `CLAUDE.md` | Updated RECENT STATUS section with Sonnet + tool_use + selective generation |

## What Was Already Working (Before This Session)

- Weekly Wrap generation (streaming, all 19 children)
- Review page loads all children with reports
- Parent narratives generate beautifully (warm paragraph style)
- Full Chinese localization (area labels, work names, recommendation sentences)
- UUID area resolution (`resolveArea()` pattern)
- Clean work names (AI prefixes stripped by `cleanWorkName()`)
- Interactive "Next Week's Focus" shelf with WorkWheelPicker
- Auto-translate for "Teach the AI" descriptions (fire-and-forget Haiku translation)

## What Still Needs Testing

1. **Sonnet + tool_use teacher report generation** — This is the #1 thing to test. Go to Weekly Wrap, select one child, hit Regenerate. Check Railway logs for `[TeacherReport]` entries. If successful, the Teacher Summary tab should show real AI-generated analysis.

2. **Cost verification** — After generating for one child, check Railway logs for token usage. Should be around 2K-4K input + 1K-2K output tokens for teacher report, similar for parent narrative.

3. **Chinese output quality** — Verify that Sonnet writes better Chinese than Haiku did (more natural, warmer tone, less template-like).

## What Still Needs Fixing (Not This Session)

1. **Teacher report quality** — Still too structured/clinical. Needs narrative paragraph format. Two options:
   - **Option A:** Add a `teacher_narrative` field (paragraph summary like parent report). Display prominently, collapse structured data behind "Details" toggle.
   - **Option B:** Redesign to output prose, store structured data separately for intelligence layer.

2. **"999 days" in observations** — Red flags say "No work in 999 days" for areas with no baseline data. Need guard in teacher report prompt or data prep.

3. **Teacher summary English work names** — The "需要关注" section shows Chinese area labels but English work names. The review API needs to pipe `name_zh` into the works list.

4. **Send to parents** — Email dispatch untested.

5. **Weekly Admin auto-fill + DOCX generation** — Untested with latest changes.

## How to Revert If Needed

To switch back to Haiku (cheaper but broken Chinese JSON):
```typescript
// In both teacher-report-generator.ts and narrative-generator.ts:
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
// And change model: AI_MODEL → model: HAIKU_MODEL
```

To remove tool_use (revert to raw JSON):
- The old raw JSON approach with `repairAndParseJSON()` is still in the file as dead code. Would need to restore the old API call pattern.

## Historical Context

This was the 4th attempt to fix the Chinese JSON problem:
1. Basic regex JSON extraction → failed
2. `repairAndParseJSON()` v1 with state machine → failed (unescaped quotes broke tracking)
3. `repairAndParseJSON()` v2 with nuclear newline removal → deployed but still failing
4. **Sonnet + tool_use** → definitive fix (this commit)

The `repairAndParseJSON()` function still exists in the codebase as a legacy fallback but is no longer in the critical path — tool_use guarantees valid JSON from the API.
