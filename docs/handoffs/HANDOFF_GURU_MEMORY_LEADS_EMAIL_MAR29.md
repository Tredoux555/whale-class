# Handoff: Guru Conversation Memory Fix + Leads Email + Dashboard Sections (Mar 29, 2026)

## Summary

Three features shipped in this session:

1. **Guru Conversation Memory Fix (3×3×3 Audited)** — The Guru was immediately forgetting previous conversations in whole-class mode. 5 independent bugs identified and fixed across 3 files. 9 audit agents, 3 cycles, all CLEAN.

2. **Leads Email Collection** — Trial signups weren't storing email in the leads table (column existed but was never populated). Fixed + enrichment for existing leads.

3. **Dashboard Collapsible Sections** — Intelligence panels on teacher dashboard now collapsible with localStorage persistence.

---

## 1. Guru Conversation Memory Fix

### Problem
When using whole-class Guru mode, the AI would give a detailed classroom analysis, then when asked a follow-up referencing the previous conversation, respond "I don't have a record of a previous conversation with you."

### Root Cause — 5 Independent Bugs

| # | Severity | Bug | File |
|---|----------|-----|------|
| 1 | CRITICAL | GET handler returned `[]` for `child_id=whole_class` | route.ts |
| 2 | CRITICAL | POST handler never fetched past whole-class interactions | route.ts |
| 3 | CRITICAL | `conversationMessages` section explicitly skipped whole-class mode | route.ts |
| 4 | CRITICAL | `buildClassroomContext` never fetched history | context-builder.ts |
| 5 | HIGH | Locale filter in context-builder dropped cross-language history | context-builder.ts |

### Fixes Applied

**`app/api/montree/guru/route.ts` — 4 edits:**
1. Added parallel query for whole-class history in POST handler's Promise.all — fetches last 5 whole-class interactions by `question_type='whole_class'` + `classroom_id`
2. Hoisted `wholeClassHistory` variable to function scope so it's accessible in the conversationMessages section
3. Updated `conversationMessages` section to populate history for whole-class mode — injects up to 3 past interactions as alternating user/assistant messages (oldest first for natural flow)
4. Fixed GET handler to query whole-class history by `question_type` + `classroom_id` instead of returning empty array

**`lib/montree/guru/context-builder.ts` — 1 edit:**
- Removed locale filter from past_interactions query — conversation memory now persists across language switches

**`components/montree/guru/GuruChatThread.tsx` — 2 edits:**
1. Added `classroom_id` to GET request URL params for whole-class mode
2. Added `classroomId` to useEffect dependency array (re-fetches history when classroom context changes)

### Audit Summary
- 3×3×3 methodology: 3 cycles × 3 parallel agents = 9 independent audit agents
- Cycle 1: Research — identified all 5 bugs
- Cycle 2: 3 agents verified fix (1 LOW issue found: missing classroomId in useEffect deps — fixed)
- Cycle 3: 3 agents final verification — ALL CLEAN (end-to-end flow, per-child regression, streaming path)

---

## 2. Leads Email Collection

### Problem
Trial signups collected email on the form but never stored it in `montree_leads.email`. The column existed, the TypeScript interface included it, the LeadsTab already rendered it with a mailto link — but the INSERT never populated it.

### Fixes Applied

**`app/api/montree/try/instant/route.ts` — 3 edits:**
- Added `email: email?.trim() || null` to all 3 lead insert blocks (homeschool_parent, teacher, principal)

**`app/montree/try/page.tsx` — 1 edit:**
- Changed email field label from "Email (optional)" to "Email"
- Changed hint from "Only used to recover your code" to "So we can help you get started and recover your code"

**`app/api/montree/leads/route.ts` — 1 edit:**
- Added email enrichment in GET handler: for leads with no email but a login code in notes, looks up the teacher record by code and backfills the email (filters out placeholder `@montree.app` emails)

---

## 3. Dashboard Collapsible Sections

**`app/montree/dashboard/page.tsx`:**
- Intelligence panels (Attendance, Stale Works, Conference Notes, Evidence, Pulse) now wrapped in collapsible sections
- Collapse state persisted to localStorage per panel
- Click header to toggle — chevron rotates on collapse

**`components/montree/DailyBriefPanel.tsx`:**
- Minor layout adjustment for collapsible integration

**`lib/montree/i18n/en.ts` + `zh.ts`:**
- 2 new keys for collapse/expand labels

---

## Files Modified (10)

1. `app/api/montree/guru/route.ts` — Whole-class memory (4 edits)
2. `lib/montree/guru/context-builder.ts` — Remove locale filter (1 edit)
3. `components/montree/guru/GuruChatThread.tsx` — Client-side classroom_id (2 edits)
4. `app/api/montree/try/instant/route.ts` — Email in lead inserts (3 edits)
5. `app/montree/try/page.tsx` — Email field prominence (1 edit)
6. `app/api/montree/leads/route.ts` — Email enrichment for existing leads (1 edit)
7. `app/montree/dashboard/page.tsx` — Collapsible sections
8. `components/montree/DailyBriefPanel.tsx` — Layout adjustment
9. `lib/montree/i18n/en.ts` — 2 new keys
10. `lib/montree/i18n/zh.ts` — 2 matching Chinese keys

## Deploy

- ✅ PUSHED — commits `dd323a4f` + `861cf7eb`
- No migrations needed
- Railway auto-deploying
