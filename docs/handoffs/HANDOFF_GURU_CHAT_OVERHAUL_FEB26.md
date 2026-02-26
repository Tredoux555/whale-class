# Handoff: Guru Chat Overhaul — WhatsApp-Style Conversational UI — Feb 26, 2026

## Summary

Transformed the Guru experience for homeschool parents from a structured Q&A form into a **personal coaching chat** (WhatsApp-style). Teachers keep the existing structured UI — zero changes.

**Commit:** `d3a78e2c` (pushed via GitHub REST API)
**Test account:** Code ZYNXER, child "Marina"

---

## What Was Built

### 1. Concern Picker Onboarding
- **File:** `app/api/montree/guru/concerns/route.ts` (~95 lines)
- GET: Fetches child's saved concerns from `montree_children.settings` JSONB
- POST: Saves selected concern IDs (1-5 max) with validation
- Both handlers have `verifySchoolRequest()` + `verifyChildBelongsToSchool()` security
- Merges into existing settings JSONB without overwriting other fields
- **No migration needed** — uses existing `settings` column

### 2. Conversational Prompt Builder
- **File:** `lib/montree/guru/conversational-prompt.ts` (~130 lines)
- `CONVERSATIONAL_SYSTEM_PROMPT` — natural chat persona, warm personal coach tone
- `buildConversationalPrompt()` — builds prompt with concern context + child context + knowledge
- `buildGreetingPrompt()` — opening greeting after onboarding (uses child's first name)
- `buildFollowUpPrompt()` — return visit greeting (references days since last chat)
- Critical rules: never structured headers, always conversational paragraphs, 3-5 short paragraphs max

### 3. Guru Route — Conversational Mode
- **File:** `app/api/montree/guru/route.ts` (modified)
- Added `conversational?: boolean` to request/response interfaces
- New branching: `const isConversational = conversational && isParentRole`
- Conversational path: fetches child settings for concerns, uses `buildConversationalPrompt()`, saves with `question_type: 'chat'`, returns raw text
- Non-conversational path: unchanged (teachers use existing `buildGuruPrompt()` + `parseGuruResponse()`)
- GET handler: added `question_type` to SELECT for history retrieval

### 4. Chat UI Components

**ChatBubble.tsx** (~95 lines)
- Single message bubble with simple markdown rendering (bold, bullets, numbered lists)
- User: right-aligned, cream background (`bg-[#F5E6D3]`)
- Guru: left-aligned, white with 🌿 avatar in dark teal circle
- Relative timestamps

**ConcernPills.tsx** (~30 lines)
- Row of small pills showing selected concerns with icon + title
- Uses `getConcernById()` from existing `concern-mappings.ts`

**GuruOnboardingPicker.tsx** (~130 lines)
- Multi-select grid of 10 concern cards (max 3 selectable)
- Visual feedback: green border + checkmark when selected
- Counter: "2 of 3 selected"
- Saves via POST to `/api/montree/guru/concerns`
- "Skip for now" option
- Full-screen botanical-themed layout

**GuruChatThread.tsx** (~260 lines) — Core component
- Three states: `loading` → `onboarding` → `chat`
- On mount: fetches concerns → if onboarded, fetches 20 messages of history
- Converts history to ChatMessage format (user/guru bubbles)
- Follow-up greeting if >2 days since last chat
- Welcome greeting if first visit after onboarding
- Sends with `conversational: true` flag
- Typing indicator (three bouncing dots animation)
- Voice transcription via existing VoiceNoteButton
- Enter to send, Shift+Enter for newline
- Auto-scroll to bottom, auto-resize textarea
- Fixed bottom input bar

### 5. Guru Page — Parent Branch
- **File:** `app/montree/dashboard/guru/page.tsx` (modified)
- Early return for `isParent` — renders full-screen chat layout
- Paywall modal, free trial banner, child selector (multi-child parents only)
- Auto-selects first child
- `onGuruLimitReached` callback triggers paywall
- Teacher UI completely unchanged below the parent branch

### 6. English Corner Redirect Fix
- **File:** `app/montree/library/english-corner/page.tsx` (rewritten)
- Was: iframe embed blocked by X-Frame-Options security headers ("refused to connect")
- Now: redirects directly to `/tools/english-corner-master-plan.html`
- **Needs separate push** (not included in main commit)

---

## Flow

1. Parent opens Guru → `GuruChatThread` mounts
2. First visit: no concerns saved → shows `GuruOnboardingPicker` (10 concerns, pick up to 3)
3. After picking → saves to `montree_children.settings.concerns` → generates greeting message
4. Subsequent visits: loads 20 messages of history → shows follow-up greeting if >2 days gap
5. Parent types message → sent with `conversational: true` → API uses conversational prompt builder
6. Response rendered in ChatBubble with markdown formatting

---

## Audit Findings (Fixed)

1. **CRITICAL:** `firstName` in useEffect dependency array caused infinite re-renders (derived value recomputed each render). Fixed: changed to `childName`.
2. **TypeScript:** Added missing `conversational?: boolean` to `GuruResponse` interface.

---

## Files Created (6 new)
- `app/api/montree/guru/concerns/route.ts`
- `lib/montree/guru/conversational-prompt.ts`
- `components/montree/guru/ChatBubble.tsx`
- `components/montree/guru/ConcernPills.tsx`
- `components/montree/guru/GuruOnboardingPicker.tsx`
- `components/montree/guru/GuruChatThread.tsx`

## Files Modified (3)
- `app/api/montree/guru/route.ts` — conversational mode branching
- `app/montree/dashboard/guru/page.tsx` — parent chat UI branch
- `app/montree/library/english-corner/page.tsx` — iframe → redirect (separate push)

## Bug Fixes (commit `6de6ad86`)
- `lib/montree/guru/progress-analyzer.ts` — wrong table name `montree_child_work_progress` → `montree_child_progress` (2 occurrences, lines 36 + 55)
- `app/api/montree/guru/photo-insight/route.ts` — missing `classroom_id` in insert (NOT NULL column)
- `app/montree/library/page.tsx` — English Corner rename
- `app/montree/library/english-corner/page.tsx` — iframe → redirect

## Dashboard Consolidation (commit `944348c7`)

**Problem:** Dashboard auto-fired 4 separate API calls on load (end-of-day, suggestions, weekly-review, daily-plan status). Each was a separate component with its own fetch. Slow, noisy, and 4x the HTTP overhead.

**Solution:** Single consolidated endpoint + single component.

### New files (2):
- **`app/api/montree/guru/dashboard-summary/route.ts`** (~165 lines) — Single endpoint replacing 3 auto-fired calls. Runs 5 parallel DB queries via `Promise.all()`. Only calls Haiku when cache misses. Returns `{ endOfDay, suggestion, weeklyReview }`.
- **`components/montree/guru/GuruDashboardCards.tsx`** (~210 lines) — Single component replacing `GuruDailyBriefing`, `EndOfDayNudge`, `GuruSuggestionCard`, `WeeklyReview`. One fetch on mount. Daily plan remains on-demand (button click). Handles dismiss logic.

### Modified files (3):
- `app/montree/dashboard/page.tsx` — Removed 4 component imports, added 1 `GuruDashboardCards`
- `app/api/montree/guru/end-of-day/route.ts` — Added `classroom_id` to child select + insert
- `app/api/montree/guru/suggestions/route.ts` — Added `classroom_id` to child select + insert

### Old components now unused (can be deleted):
- `components/montree/guru/GuruDailyBriefing.tsx`
- `components/montree/guru/EndOfDayNudge.tsx`
- `components/montree/guru/GuruSuggestionCard.tsx`
- `components/montree/guru/WeeklyReview.tsx` (if it existed as separate file)

---

## Dependencies
- Uses existing `concern-mappings.ts` (10 concerns with IDs, icons, titles, descriptions)
- Uses existing `VoiceNoteButton` for voice transcription
- Uses existing `montree_guru_interactions` table for history
- Uses existing `montree_children.settings` JSONB for concern storage
- No new npm packages, no new migrations needed
