# Handoff: Guru Improvements — 8 Phases (Feb 25, 2026)

## What This Is

8 improvements to the Montree Guru AI system for homeschool parents. Plan is fully designed and approved. Ready to build.

**Plan file:** `.claude/plans/guru-improvements-v1.md` — read this first, it has all the details.

---

## Context You Need

### What Was Just Built (This Session + Previous)

The **Home Guru Revamp** (commit `bd774ec3` + bugfix `71ea39e4`) added:

1. `lib/montree/guru/concern-mappings.ts` — 10 parent concerns mapped to Montessori work clusters
2. `lib/montree/guru/prompt-builder.ts` — Rich 8-rule HOMESCHOOL_ADDENDUM (replaced minimal 12-line version)
3. `app/api/montree/guru/concern/route.ts` — Concern guide API (Haiku, cached per child/concern/day)
4. `app/api/montree/guru/quick/route.ts` — Quick-fire 2-sentence answers (Haiku, 5s timeout)
5. `app/api/montree/guru/weekly-review/route.ts` — Weekly progress review (Haiku, cached per ISO week)
6. `components/montree/guru/ConcernCardsGrid.tsx` — 2-column grid of 10 concern cards
7. `components/montree/guru/ConcernDetailModal.tsx` — Full-screen modal with custom markdown renderer
8. `components/montree/guru/QuickGuruFAB.tsx` — Floating 🌿 button for quick questions
9. `components/montree/guru/WeeklyReview.tsx` — Collapsible weekly summary banner
10. `app/montree/dashboard/page.tsx` — New "Today" view for home parents (child selector, daily briefing, weekly review, concern cards, quick link to week view)
11. `app/montree/dashboard/curriculum/browse/page.tsx` — Recommended filter with difficulty badges

### Existing Guru System Architecture

**Core files:**
- `lib/montree/guru/context-builder.ts` — Builds ChildContext from 7 parallel DB queries (child info, mental profile, progress, observations, past interactions, teacher notes)
- `lib/montree/guru/prompt-builder.ts` — System prompt with persona, few-shot examples, output format, homeschool/principal addendums
- `lib/montree/guru/knowledge-retriever.ts` — Topic-indexed retrieval from 8 Montessori books
- `lib/montree/guru/concern-mappings.ts` — 10 static concern-to-work-cluster mappings

**Main chat endpoint:** `app/api/montree/guru/route.ts`
- POST: Single question → buildChildContext → retrieveKnowledge → buildGuruPrompt → Claude Sonnet → parseGuruResponse → save to montree_guru_interactions
- GET: Returns conversation history (read-only)
- Currently STATELESS — no multi-turn messages, each question stands alone
- Freemium gating for homeschool parents (3 free prompts, then paywall)

**Haiku endpoints (homeschool only):**
- `guru/daily-plan` — GET, cached per child per day
- `guru/work-guide` — POST, step-by-step presentation guide
- `guru/concern` — GET, cached per child/concern/day
- `guru/quick` — POST, fire-and-forget 2-sentence answers
- `guru/weekly-review` — GET, cached per ISO week

**Database:** `montree_guru_interactions` table stores ALL interactions with:
- `question_type`: 'behavior', 'focus', 'social', 'academic', 'general', 'daily_plan', 'end_of_day', etc.
- `context_snapshot`: JSONB with child state at question time
- `response_insight`: Main response text
- Used for caching (query by child_id + question_type + date range)

**Security pattern:** Every route MUST call `verifySchoolRequest()` + `verifyChildBelongsToSchool()`.

---

## The 8 Phases to Build

### Build Order (approved):

| # | Phase | Effort | Key Insight |
|---|-------|--------|-------------|
| 1 | **Conversation Memory** | MEDIUM | Change Sonnet call from single-message to multi-turn using past 5 interactions. `context-builder.ts` already fetches `past_interactions` — restructure into messages array instead of text block. |
| 2 | **FAQ Cache** | LOW | Static `faq-cache.ts` with 10 pre-written Q&As. Accordion component on dashboard. Zero API calls. |
| 3 | **Contextual Tips** | LOW | `GuruContextBubble.tsx` + `page-tips.ts`. Floating speech bubble per page, dismissed via localStorage. Role-aware tips. |
| 4 | **End-of-Day Nudge** | LOW | Haiku call after progress logged today. 3 sentences: what went well, try tomorrow, encouragement. Cached per day. |
| 5 | **Proactive Suggestions** | MEDIUM | Detect stale works (2+ weeks same status). `progress-analyzer.ts` helper. `GuruSuggestionCard.tsx` on dashboard. |
| 6 | **Photo-Aware** | MEDIUM | Sonnet vision on child photos. Tap-to-reveal `PhotoInsightButton.tsx` on photo strip. ~$0.015/image, user-initiated only. |
| 7 | **Knowledge Base** | MEDIUM | Expand `knowledge-retriever.ts` keyword mappings + `topic_index.json`. User has 3 books to add (need text files). |
| 8 | **Voice Notes** | HIGH | `react-media-recorder` + OpenAI Whisper ($0.006/min). `VoiceNoteButton.tsx` integrated into QuickGuruFAB. iOS Safari 18.4+ required. |

### Key Implementation Details Per Phase

**Phase 1 (Memory) — The core change:**
```typescript
// Current: single message
messages: [{ role: 'user', content: userPrompt }]

// New: multi-turn with history
const pastInteractions = childContext.past_interactions; // already fetched
const messages = [];
for (const interaction of pastInteractions) {
  messages.push({ role: 'user', content: interaction.question });
  messages.push({ role: 'assistant', content: interaction.response_insight });
}
messages.push({ role: 'user', content: userPrompt });
```
Files: `guru/route.ts`, `context-builder.ts`, `prompt-builder.ts`

**Phase 2 (FAQ) — Static data, no AI:**
10 hardcoded Q&As with markdown answers. Accordion component. Links to Guru chat for deeper questions.

**Phase 3 (Tips) — Static tips per page:**
```typescript
const PAGE_TIPS: Record<string, TipConfig[]> = {
  dashboard: [{ text: "Tap on a child to see their week view", role: 'both' }],
  weekView: [{ text: "Try presenting no more than 2 new works per day", role: 'parent' }],
  // ...
};
```

**Phase 4 (End-of-Day) — Trigger condition:**
Check `montree_child_work_progress.updated_at >= today` for the child. If any progress today + no cached nudge → generate.

**Phase 5 (Suggestions) — Stale detection:**
```sql
SELECT * FROM montree_child_work_progress
WHERE child_id = $1 AND status IN ('practicing', 'presented')
AND updated_at < NOW() - INTERVAL '14 days'
```

**Phase 6 (Photo) — Vision API:**
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'url', url: photoUrl } },
      { type: 'text', text: `Look at this photo of ${childName} (age ${age})...` }
    ]
  }]
});
```

**Phase 8 (Voice) — Recording flow:**
1. `useReactMediaRecorder({ audio: true })` → start/stop
2. `onStop` callback gets audio Blob
3. POST blob to `/api/montree/guru/transcribe` as FormData
4. Server sends to `https://api.openai.com/v1/audio/transcriptions` with model `whisper-1`
5. Returns text → pipe into existing Guru chat

---

## What NOT to Touch

- Teachers see ZERO changes — everything gated behind `isHomeschoolParent()`
- Don't modify the main Guru chat UI (`app/montree/dashboard/guru/page.tsx`) — it works, leave it
- Don't change the knowledge-retriever indexing format — just add more entries
- Don't modify the freemium/billing system

## Environment

- `ANTHROPIC_API_KEY` — already set (for Haiku + Sonnet calls)
- `OPENAI_API_KEY` — already set (for Whisper transcription in Phase 8)
- No new env vars needed

## Push Method

Use Desktop Commander MCP to run git commands on user's Mac:
```bash
cd /Users/tredouxwillemse/Desktop/Master\ Brain/ACTIVE/whale
git add [files] && git commit -m "message" && git push origin main
```

Or if VPN issues: use `scripts/push-to-github.py` with user's GitHub PAT.

## Dashboard Layout After All 8 Phases

Home parent "Today" view order (top to bottom):
1. Child selector pills (if multiple children)
2. **GuruContextBubble** (Phase 3) — floating, dismissible
3. GuruDailyBriefing (existing)
4. **EndOfDayNudge** (Phase 4) — only if progress logged today
5. **GuruSuggestionCard** (Phase 5) — only if stale works detected
6. WeeklyReview (existing)
7. ConcernCardsGrid (existing)
8. **GuruFAQSection** (Phase 2) — expandable accordion
9. Quick link to week view
10. **QuickGuruFAB** with **VoiceNoteButton** (Phase 8) — floating bottom-right
