# Guru Improvements — 8-Phase Implementation Plan

## Overview
8 improvements to the Montree Guru system, building on the existing concern-based home parent experience. All changes gated behind `isHomeschoolParent()` unless noted.

---

## Phase 1: Conversation Memory (Auto-Thread Per Child)
**Impact:** HIGH | **Effort:** MEDIUM | **New files:** 1 | **Modified:** 2

The Guru currently rebuilds context from scratch every call. We'll make it remember.

**How it works:**
- On every Guru call, fetch the last 5 `montree_guru_interactions` for that `child_id` (already fetched by `buildChildContext` but only used as text summary)
- Change the Claude API call in `app/api/montree/guru/route.ts` from single user message to multi-turn:
  ```
  messages: [
    { role: 'user', content: pastQ1 },
    { role: 'assistant', content: pastA1 },
    { role: 'user', content: pastQ2 },
    { role: 'assistant', content: pastA2 },
    ...
    { role: 'user', content: currentQuestion }
  ]
  ```
- Add a "memory summary" line to the system prompt: "You have spoken with this parent before. Here is your conversation history."
- Past interactions already stored in `montree_guru_interactions` — no new table needed
- `context-builder.ts` already fetches `past_interactions` (last 5) — we just need to restructure them into messages instead of a text block

**Files:**
- MODIFY `app/api/montree/guru/route.ts` — Build multi-turn messages array from past interactions
- MODIFY `lib/montree/guru/context-builder.ts` — Return raw Q&A pairs (not just formatted text) for message building
- MODIFY `lib/montree/guru/prompt-builder.ts` — Add memory awareness to system prompt

---

## Phase 2: End-of-Day Nudge
**Impact:** HIGH | **Effort:** LOW | **New files:** 2 | **Modified:** 1

After a parent logs progress, show a gentle summary on next dashboard visit.

**How it works:**
- New API: `GET /api/montree/guru/end-of-day?child_id=X`
- Checks if child had any progress updates today (query `montree_child_work_progress` for `updated_at >= today`)
- If yes + no cached nudge for today → Haiku generates 3-sentence summary:
  1. What went well today
  2. What to try tomorrow
  3. One encouragement
- Cached in `montree_guru_interactions` with `question_type: 'end_of_day'`
- New component: `EndOfDayNudge.tsx` — renders as a warm banner below the daily plan on dashboard
- Only triggers if child has progress from today (no spam for inactive days)

**Files:**
- CREATE `app/api/montree/guru/end-of-day/route.ts` — Haiku endpoint with daily cache
- CREATE `components/montree/guru/EndOfDayNudge.tsx` — Banner component (collapsible, HOME_THEME)
- MODIFY `app/montree/dashboard/page.tsx` — Add EndOfDayNudge to home parent Today view

---

## Phase 3: Voice Notes
**Impact:** HIGH | **Effort:** HIGH | **New files:** 3 | **Modified:** 1

Hands-free Guru interaction via voice recording + Whisper transcription.

**How it works:**
- Install `react-media-recorder` (64K weekly downloads, hook-based)
- New component: `VoiceNoteButton.tsx` — replaces/augments the QuickGuruFAB for home parents
  - Tap to record (shows waveform animation)
  - Tap again to stop
  - Audio blob → POST to new transcription API
  - Transcribed text → sent to existing Guru chat endpoint
  - Response displayed in the same QuickGuru modal
- New API: `POST /api/montree/guru/transcribe` — receives audio blob, sends to OpenAI Whisper (`OPENAI_API_KEY` already set), returns text
- Audio NOT stored permanently — transcribe and discard (privacy + storage)
- Falls back to text input if microphone permission denied

**Dependencies:**
- `npm install react-media-recorder`
- Uses existing `OPENAI_API_KEY` for Whisper ($0.006/min)

**Files:**
- CREATE `components/montree/guru/VoiceNoteButton.tsx` — Recording UI with waveform
- CREATE `app/api/montree/guru/transcribe/route.ts` — Whisper transcription endpoint
- MODIFY `components/montree/guru/QuickGuruFAB.tsx` — Integrate voice button alongside text input
- Note: iOS Safari 18.4+ supports WebM/Opus. Older iOS gets text-only fallback.

---

## Phase 4: Proactive Suggestions (Stale Progress Detection)
**Impact:** HIGH | **Effort:** MEDIUM | **New files:** 3 | **Modified:** 1

If a child has been stuck on the same works for 2+ weeks, the Guru surfaces a suggestion without being asked.

**How it works:**
- New API: `GET /api/montree/guru/suggestions?child_id=X`
  - Query `montree_child_work_progress` for works with status 'practicing' or 'presented' where `updated_at < 14 days ago`
  - If stale works found → Haiku generates a suggestion card (why they might be stuck, what to try, alternative works)
  - Cached per child per week in `montree_guru_interactions` with `question_type: 'proactive_suggestion'`
  - Returns null if no stale works (component renders nothing)
- New component: `GuruSuggestionCard.tsx` — Card with warm message + specific action items
  - "Maya has been working on Sandpaper Letters for 3 weeks. Here's what might help..."
  - Dismissible (localStorage key)
- Additional detection: child with 0 progress entries in last 7 days → "Haven't seen Maya this week! Here are some quick 5-minute activities..."

**Files:**
- CREATE `app/api/montree/guru/suggestions/route.ts` — Stale progress detection + Haiku suggestion
- CREATE `components/montree/guru/GuruSuggestionCard.tsx` — Proactive suggestion card
- CREATE `lib/montree/guru/progress-analyzer.ts` — Helper to detect stale/inactive patterns
- MODIFY `app/montree/dashboard/page.tsx` — Add GuruSuggestionCard to Today view

---

## Phase 5: Photo-Aware Observations
**Impact:** MEDIUM | **Effort:** MEDIUM | **New files:** 2 | **Modified:** 1

The Guru looks at a child's photo and comments on what it observes about the activity.

**How it works:**
- New API: `POST /api/montree/guru/photo-insight` with `{ child_id, media_id }`
  - Fetches photo URL from `montree_media` + Supabase storage
  - Fetches child context (name, age, current works)
  - Sends photo + context to Sonnet (vision-capable) with prompt:
    "Look at this photo of [child] working. What Montessori activity do you see? Comment on their concentration, grip, technique. Keep it warm and specific — 2-3 sentences."
  - Returns insight text
  - Cached per media_id in `montree_guru_interactions` with `question_type: 'photo_insight'`
- New component: `PhotoInsightButton.tsx` — Small 🌿 icon on photo thumbnails in gallery/progress views
  - Tap → loading shimmer → shows Guru's observation inline below photo
- Cost consideration: Sonnet with vision is ~$0.01-0.02 per image. Only triggered on explicit tap, never auto-generated.

**Files:**
- CREATE `app/api/montree/guru/photo-insight/route.ts` — Vision API endpoint
- CREATE `components/montree/guru/PhotoInsightButton.tsx` — Tap-to-reveal insight on photos
- MODIFY `app/montree/dashboard/[childId]/progress/page.tsx` — Add PhotoInsightButton to photo strip

---

## Phase 6: Contextual Page Tips (GuruContextBubble)
**Impact:** MEDIUM | **Effort:** LOW | **New files:** 2 | **Modified:** 4-5

Small floating tips that change based on which page you're on.

**How it works:**
- New component: `GuruContextBubble.tsx` — Small floating speech bubble (bottom-left, above nav)
  - Shows a page-specific tip on first visit to each page
  - Dismissible per page (localStorage: `guru_tip_dismissed_{pageKey}`)
  - Tips rotate if user revisits (shows next tip from array)
  - Botanical theme, 🌿 icon, subtle slide-in animation
- New data file: `lib/montree/guru/page-tips.ts` — Static tip definitions per page
  - Dashboard: "Tap on a child to see their week view and log today's work"
  - Week view: "Try presenting no more than 2 new works per day"
  - Curriculum browse: "Works with ⭐ are ones {childName} has mastered"
  - Progress: "Tap an area bar to filter the timeline"
  - Guru chat: "The Guru remembers your past conversations about each child"
  - Capture: "Photos help you track progress and share with parents"
- Some tips personalized with child name/progress (passed as props)
- Teachers get teacher-specific tips; home parents get parent-specific tips

**Files:**
- CREATE `components/montree/guru/GuruContextBubble.tsx` — Floating tip component
- CREATE `lib/montree/guru/page-tips.ts` — Static tip definitions (role-aware)
- MODIFY `app/montree/dashboard/page.tsx` — Add bubble
- MODIFY `app/montree/dashboard/[childId]/page.tsx` — Add bubble
- MODIFY `app/montree/dashboard/curriculum/page.tsx` — Add bubble
- MODIFY `app/montree/dashboard/[childId]/progress/page.tsx` — Add bubble

---

## Phase 7: Knowledge Base Expansion
**Impact:** MEDIUM | **Effort:** MEDIUM | **New files:** 0 | **Modified:** 2

Improve response quality by adding more source material to the knowledge retriever.

**How it works:**
- Current state: 8 Montessori books indexed in `topic_index.json` via `knowledge-retriever.ts`
- Expand with:
  1. Age-specific developmental milestones (0-6 year breakdowns)
  2. Common parent mistakes and misconceptions
  3. Home environment setup guide (room by room)
  4. Observation techniques for non-trained parents
  5. When-to-worry developmental benchmarks by age
- Add new keyword mappings to `knowledge-retriever.ts` for new topics
- Rebuild `topic_index.json` with expanded content
- Note: User mentioned 3 new books to add — will need book text files provided

**Files:**
- MODIFY `lib/montree/guru/knowledge-retriever.ts` — Add new keyword mappings + topic categories
- MODIFY or REGENERATE `lib/montree/guru/topic_index.json` — Add new indexed content
- Potentially CREATE new source text files in `lib/montree/guru/sources/`

**Depends on:** User providing the 3 new book text files. Can build the infrastructure now and add books later.

---

## Phase 8: Pre-Generated FAQ Cache
**Impact:** LOW-MEDIUM | **Effort:** LOW | **New files:** 2 | **Modified:** 1

New parents get instant answers to common questions without waiting for an AI call.

**How it works:**
- New data file: `lib/montree/guru/faq-cache.ts` — Pre-written answers to top 10 parent questions
  1. "When should my child start reading?"
  2. "How long should activities last?"
  3. "My child won't sit still — is that normal?"
  4. "How do I set up a Montessori space at home?"
  5. "Should I correct mistakes?"
  6. "How many activities per day?"
  7. "My child keeps repeating the same activity"
  8. "When should I introduce new works?"
  9. "Is my child behind?"
  10. "How do I handle screen time?"
- Each FAQ: question, answer (markdown), related concerns, age ranges
- New component: `GuruFAQSection.tsx` — Expandable FAQ accordion below concern cards on dashboard
- FAQ answers are static (no API call), but link to full Guru chat for deeper questions
- Can be personalized later by injecting child name/age into templates

**Files:**
- CREATE `lib/montree/guru/faq-cache.ts` — Static FAQ data (10 entries)
- CREATE `components/montree/guru/GuruFAQSection.tsx` — Accordion component
- MODIFY `app/montree/dashboard/page.tsx` — Add FAQ section to Today view

---

## Implementation Order

| Order | Phase | Why this order |
|-------|-------|----------------|
| 1 | Phase 1: Conversation Memory | Foundation — everything else benefits from the Guru remembering |
| 2 | Phase 8: FAQ Cache | Quickest win, instant value for new parents |
| 3 | Phase 6: Contextual Tips | Low effort, high polish feel |
| 4 | Phase 2: End-of-Day Nudge | Simple Haiku call, big emotional impact |
| 5 | Phase 4: Proactive Suggestions | Builds on progress data patterns |
| 6 | Phase 5: Photo-Aware | Vision API integration, moderate complexity |
| 7 | Phase 7: Knowledge Base | Depends on user providing books |
| 8 | Phase 3: Voice Notes | Highest effort (npm dep, Whisper API, audio handling, iOS compat) |

## Total Scope

- **New files:** ~15
- **Modified files:** ~10
- **New npm deps:** 1 (`react-media-recorder` — Phase 3 only)
- **New API routes:** 5 (end-of-day, transcribe, suggestions, photo-insight, concern already exists)
- **Estimated Haiku cost per active user/day:** ~$0.005 (end-of-day + suggestion + daily plan)
- **Estimated Sonnet cost per photo insight:** ~$0.015

## Security Checklist (for all new API routes)
- [ ] `verifySchoolRequest()` on every route
- [ ] `verifyChildBelongsToSchool()` on every route with child_id
- [ ] Input validation (length limits, required fields)
- [ ] Generic error messages (no `error.message` leaks)
- [ ] Rate limiting where appropriate
