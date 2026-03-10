# Handoff: Smart Capture Rewrite + Whole-Class Guru Fix + FeedbackButton Removal — Mar 10, 2026

## Summary

Three changes this session:

1. **Smart Capture / Photo Insight — Complete Rewrite** with "self-driving car" teacher override model. Guru auto-tags photos and upgrades progress; teacher can override anytime on the shelf. 3x3 audit-build system (3 audit cycles × 3 parallel auditors = 9 audit passes, all clean).

2. **Whole-Class Guru 404 Fix** — Fixed "No students found in classroom" error. Root cause: missing error tracking in classroom-context-builder.ts. 3x3 audit-build system applied (6 audit passes, all clean).

3. **FeedbackButton Removal** — Removed from all 3 layouts (dashboard, admin, parent).

## Smart Capture — What Changed

### `app/api/montree/guru/photo-insight/route.ts` — Complete Rewrite (~420 lines)

**Before:** Sonnet vision returned free-text descriptions ("Untagged" label, verbose paragraphs). No curriculum matching. No progress updates. No media tagging.

**After:** Sonnet vision with `tool_use` returns structured JSON. Auto-matches to 329-work curriculum. Auto-tags media with `work_id`. Auto-upgrades progress (never downgrades).

Key architecture:
- **Anthropic tool_use**: `tool_choice: { type: 'tool', name: 'tag_photo' }` forces structured extraction (work_name, area, mastery_evidence, confidence 0-1, observation)
- **Curriculum fuzzy matching**: `fuzzyScore()` from `lib/montree/work-matching.ts` matches Sonnet's identified work against curriculum (0.7+ threshold for auto-update)
- **Media tagging via work_id**: Looks up UUID from `montree_classroom_curriculum_works` table by classroom_id + name, then updates `montree_media.work_id` (NOT work_name/area — those columns don't exist)
- **Status upgrade-only protection**: `STATUS_RANK` mapping (not_started=0, presented=1, practicing=2, mastered=3). Only upgrades, never downgrades. Teacher manual edits always win.
- **Notes prefixed**: `[Guru Smart Capture]` prefix on auto-generated observation notes
- **Cache**: Results cached in `montree_guru_interactions` with full `context_snapshot`
- **Locale-aware**: System prompt switches to Chinese when `locale=zh`
- **All `.maybeSingle()`**: No `.single()` calls — graceful 404 on missing records

### `components/montree/guru/PhotoInsightButton.tsx` — Complete Rewrite (~170 lines)

**Before:** Showed verbose AI text + "Untagged" label.

**After:** Clean structured display:
- AreaBadge (colored circle with P/S/M/L/C) + work name
- Status pill (mastered=emerald, practicing=amber, presented=blue) with colors
- Brief 1-sentence observation
- Auto-update indicator: "✓ Progress auto-updated (override anytime on the shelf)"
- `onProgressUpdate` callback notifies parent component to refresh data
- AbortController cleanup on unmount

### `app/montree/dashboard/[childId]/progress/page.tsx` — Wiring Fix

- Extracted `fetchAll` from `useEffect` closure to `useCallback` — was inaccessible to JSX (CRITICAL bug caught in Audit Cycle 3)
- Added `useCallback` import
- Wired `onProgressUpdate={fetchAll}` on PhotoInsightButton
- Removed homeschool-only gate — Smart Capture now available to ALL users (teachers + parents)

### `lib/montree/i18n/en.ts` + `zh.ts` — 1 New Key Each

```
photoInsight.progressAutoUpdated: '✓ Progress auto-updated (override anytime on the shelf)'
photoInsight.progressAutoUpdated: '✓ 进度已自动更新（可在书架中手动调整）'
```

## Whole-Class Guru Fix

### `lib/montree/guru/classroom-context-builder.ts`
- Added individual try/catch around each of 4 parallel DB queries
- Added error tracking array — logs which queries fail
- Added null/empty guards on all data arrays before processing
- Returns `{ context, studentCount, errors }` instead of just `{ context, studentCount }`

### `app/api/montree/guru/route.ts`
- Distinguishes between actual errors (500) vs empty classroom (empty context with guidance)
- Logs classroom context errors for debugging

### `components/montree/guru/GuruChatThread.tsx`
- Client-side guard: shows "select a classroom first" if classroomId missing for whole-class mode

## FeedbackButton Removal

### 3 Files Modified
- `app/montree/dashboard/layout.tsx` — Removed FeedbackButton import + render
- `app/montree/admin/layout.tsx` — Removed FeedbackButton import + render
- `app/montree/parent/layout.tsx` — Removed FeedbackButton import + render

## 3x3 Audit Results

### Smart Capture (3 cycles × 3 auditors = 9 passes)

**Cycle 1** — 12 issues found, all fixed:
- CRITICAL: `montree_media` has `work_id` not `work_name`/`area` columns
- CRITICAL: `onProgressUpdate` callback not wired
- HIGH: Duplicate DB query for classroom_id
- HIGH: Cache uses `.single()` instead of `.maybeSingle()`
- MEDIUM: Hardcoded Chinese string, missing URL validation, locale not validated, tool input not validated, cache error not logged

**Cycle 2** — 2 issues found, all fixed:
- Media fetch `.single()` → `.maybeSingle()`
- Child fetch `.single()` → `.maybeSingle()`

**Cycle 3** — 2 issues found, all fixed:
- CRITICAL: `fetchAll` defined inside `useEffect` closure, inaccessible to JSX → extracted to `useCallback`
- MEDIUM: Fallback text response unbounded → `.slice(0, 200)` truncation

### Whole-Class Guru (6 audit passes, all clean after fixes)

## Self-Driving Car Model

The design principle: **Guru drives until the teacher takes over.**

- Guru auto-tags photos with work name + area (via curriculum matching)
- Guru auto-upgrades progress status (presented→practicing→mastered)
- Guru NEVER downgrades status (upgrade-only protection)
- Teacher can manually change any status on the shelf at any time
- Auto-update indicator tells teacher: "override anytime on the shelf"
- All auto-updates prefixed with `[Guru Smart Capture]` in notes for traceability

## Deploy

⚠️ NOT YET PUSHED. All changes local. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: smart capture rewrite + whole-class guru fix + feedbackbutton removal" && git push origin main
```

No new migrations needed.
