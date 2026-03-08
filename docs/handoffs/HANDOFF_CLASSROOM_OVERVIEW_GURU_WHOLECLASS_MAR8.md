# Handoff: Classroom Overview Print Page + Guru Whole-Class Mode + Audit Fixes

**Date:** March 8, 2026 (Late Night Session)
**Status:** CODE COMPLETE — NOT YET DEPLOYED. Push from Mac to deploy.
**Commits needed:** All changes are local, need `git push origin main`

---

## Features Built

### Feature 1 — Classroom Overview Print Page

**What:** A4 landscape print-optimized page showing ALL children with their focus works and large writing spaces for teacher notes.

**Route:** `/montree/dashboard/classroom-overview`
**Access:** 📋 icon in DashboardHeader nav bar (teachers only, hidden for homeschool parents)

**Layout:**
- 2×2 grid (4 children per page) with automatic page breaks
- Each child card: name, photo, 5 area focus works (with Chinese names when locale=zh), large empty writing space
- Print-optimized CSS: white background, no shadows, compact on paper

**Files:**
- `app/montree/dashboard/classroom-overview/page.tsx` — NEW (~200 lines)
- `app/api/montree/focus-works/batch/route.ts` — NEW (batch fetch all children + focus works)
- `components/montree/DashboardHeader.tsx` — MODIFIED (added 📋 icon link)

### Feature 2 — Guru "Whole Class" Mode

**What:** Teachers can select "👥 Whole Class" from the Guru child dropdown. The Guru then has context for ALL students and can suggest teaching groups, compare progress, and help plan lessons across the entire classroom.

**How it works:**
1. Teacher selects "Whole Class" from dropdown → `child_id='whole_class'` sent to API
2. API detects `isWholeClassMode`, skips per-child auth, validates classroom instead
3. `buildClassroomContext()` fetches ALL children + focus works + progress + observations
4. `buildClassroomModePrompt()` creates a classroom-specialist system prompt
5. Tools work via `student_name` parameter — model provides student name, `resolveStudentName()` maps to child_id
6. `executeTool()` accepts optional `classroomIdOverride` for classroom-wide tools

**Files:**
- `lib/montree/guru/classroom-context-builder.ts` — NEW (~120 lines)
- `app/api/montree/guru/route.ts` — MODIFIED (major: whole-class branching throughout)
- `lib/montree/guru/conversational-prompt.ts` — MODIFIED (added `buildClassroomModePrompt`)
- `lib/montree/guru/tool-definitions.ts` — MODIFIED (added `student_name` to 4 tools)
- `lib/montree/guru/tool-executor.ts` — MODIFIED (added `classroomIdOverride` param)
- `components/montree/guru/GuruChatThread.tsx` — MODIFIED (isWholeClassMode prop)
- `app/montree/dashboard/guru/page.tsx` — MODIFIED (whole_class option in dropdown)

**i18n:** 9 new keys added to both en.ts and zh.ts (nav.classroomOverview, print.*, guru.wholeClass/wholeClassWelcome/wholeClassPlaceholder)

**Timeouts:** MAX_TOOL_ROUNDS=4, API_TIMEOUT_MS=35s, TOTAL_REQUEST_TIMEOUT_MS=90s (up from 2/35s/55s — classroom-wide ops need more rounds)

---

## Audit Fixes (5 bugs found and fixed)

### 1. CRITICAL: `batch/route.ts` — `auth.classroomId` undefined breaks ALL requests
- **Was:** `if (classroomId !== auth.classroomId)` — `auth.classroomId` is optional in JWT, undefined for principals
- **Fix:** DB lookup verifying `classroom.school_id === auth.schoolId`

### 2. CRITICAL: `classroom-context-builder.ts` — wrong table name
- **Was:** `montree_child_work_progress` (doesn't exist)
- **Fix:** Changed to `montree_child_progress` (the actual table from migration 081)
- **Impact:** This was likely the root cause of the 404 on POST guru in production

### 3. HIGH: `guru/route.ts` — no school-level verification for whole-class mode
- **Was:** Accepted any classroom_id without checking ownership
- **Fix:** Added DB lookup verifying `classroom.school_id === auth.schoolId`

### 4. HIGH: `tool-executor.ts` — classroom tools fail in whole-class mode
- **Was:** `get_classroom_overview` and `group_students` look up classroom via `childId`, but `childId='whole_class'` → no child found → tool error
- **Fix:** Added `classroomIdOverride` parameter to `executeTool()`. Route passes `classroom_id` in whole-class mode. Both tools use override when available.

### 5. LOW: `batch/route.ts` — redundant getSupabase() calls
- **Fix:** Consolidated to single `supabase` const

---

## Production Bugs Seen (Screenshots)

### Guru Whole-Class "No students found" + 404
- **Error:** "No students found in classroom (id: 51e7adb6-cd18-4e03-b707-eceb0a1d2e69)"
- **Console:** `net::ERR_CONNECTION_CLOSED` on `/api/montree/guru` + 404 on second attempt
- **Root cause:** Wrong table name in `classroom-context-builder.ts` → query fails → 0 children → 404
- **Status:** FIXED locally (table name + auth fixes), needs deploy

### `{count}m ago` timestamp not rendering
- **Location:** GuruChatThread welcome message timestamp
- **Likely cause:** Template literal not being interpolated — check for literal `{count}` in the timestamp formatting code
- **Status:** NOT FIXED — add to next session

---

## Next Session Priorities

### Priority #0 — DEPLOY (push from Mac)
All audit fixes need to go live. The Guru whole-class mode and classroom overview are completely broken in production without these fixes.

### Priority #1 — i18n Work Names Not Translating to Chinese
**Problem:** When Chinese language is selected, UI labels translate correctly (headers show 本周焦点任务, 每周行政, etc.) but **work names stay in English** (e.g. "Dropper Water Transfer" instead of Chinese).

**Root cause analysis:**
1. **FocusWorksSection** — Logic EXISTS and is correct: `locale === 'zh' && focusWork.chineseName ? focusWork.chineseName : focusWork.work_name`. BUT it depends on the API returning `chineseName` in the response. The progress API does this via `enrichWithChineseNames()` — need to verify the focus works fetch also enriches.

2. **Weekly Admin Generator** (`/api/montree/children/[childId]/weekly-admin/route.ts`) — Passes English work names to Claude even in zh locale. The focus works query (`montree_child_focus_works`) returns `work_name` (English) without Chinese enrichment. Need to add `getChineseNameMap()` lookup before passing to Claude prompt.

3. **Weekly Admin UI** — The generated narrative text (paragraphs about "YueZe") stays English because Claude receives English work names in context. Fix: enrich work names with Chinese before passing to Claude, and ensure the `outputLang` directive actually reaches the prompt.

**Fix plan:**
- `weekly-admin/route.ts`: Import `getChineseNameMap()`, enrich focus work names before building Claude prompt
- Verify `FocusWorksSection` receives `chineseName` from its data source (the child page fetches focus works separately from progress)
- Check if the child dashboard page's focus works fetch includes Chinese name enrichment
- The child page (`[childId]/page.tsx`) likely fetches focus works via a different API than the progress route — that API may not call `enrichWithChineseNames()`

### Priority #2 — `{count}m ago` Timestamp Bug
The Guru welcome message shows literal `{count}m ago` instead of an actual time. Check GuruChatThread timestamp formatting — likely a missing interpolation or i18n key issue.

### Priority #3 — Guru Whole-Class Timestamp in Welcome Message
The welcome message shows `{count}m ago` as a literal string. This is separate from i18n — it's a rendering bug in GuruChatThread's timestamp display.

---

## Files Changed This Session (Summary)

| File | Status | What |
|------|--------|------|
| `app/montree/dashboard/classroom-overview/page.tsx` | NEW | Print page for classroom overview |
| `app/api/montree/focus-works/batch/route.ts` | NEW | Batch fetch children + focus works |
| `lib/montree/guru/classroom-context-builder.ts` | NEW | Builds context for all children in classroom |
| `app/api/montree/guru/route.ts` | MODIFIED | Whole-class mode branching + auth fix |
| `lib/montree/guru/conversational-prompt.ts` | MODIFIED | Added buildClassroomModePrompt |
| `lib/montree/guru/tool-definitions.ts` | MODIFIED | student_name on 4 tools |
| `lib/montree/guru/tool-executor.ts` | MODIFIED | classroomIdOverride param |
| `components/montree/guru/GuruChatThread.tsx` | MODIFIED | isWholeClassMode prop |
| `app/montree/dashboard/guru/page.tsx` | MODIFIED | Whole class dropdown option |
| `components/montree/DashboardHeader.tsx` | MODIFIED | 📋 nav icon |
| `lib/montree/i18n/en.ts` | MODIFIED | 9 new keys |
| `lib/montree/i18n/zh.ts` | MODIFIED | 9 new keys |
