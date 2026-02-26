# Handoff: Guru Improvements (8 Phases) + Library Redesign — Feb 25, 2026

## Summary

This session completed two major bodies of work:
1. **8-phase Guru AI improvements** for homeschool parents — conversation memory, FAQ cache, contextual tips, end-of-day nudge, proactive suggestions, photo insights, knowledge expansion, and voice notes
2. **Library browse page redesign** — tab-based navigation with sticky area tabs and a Miscellaneous catch-all tab
3. **English Corner navigation fix** — added discoverable link from library welcome page

---

## Guru Improvements — 8 Phases Complete

### Phase 1: Conversation Memory
- **File:** `app/api/montree/guru/route.ts`
- Multi-turn context from last 5 interactions per child fetched from `montree_guru_interactions`
- Injected into system prompt via `CONVERSATION MEMORY` section in `prompt-builder.ts`

### Phase 2: FAQ Cache
- **Files:** `lib/montree/guru/faq-cache.ts`, `components/montree/guru/GuruFAQSection.tsx`
- 10 static pre-written Q&As covering common Montessori parenting questions
- Accordion component, zero API calls, instant answers

### Phase 3: Contextual Page Tips
- **Files:** `lib/montree/guru/page-tips.ts`, `components/montree/guru/GuruContextBubble.tsx`
- Per-page floating tip bubble with dismiss via localStorage
- Integrated on dashboard, child week view, progress, and curriculum pages

### Phase 4: End-of-Day Nudge
- **Files:** `app/api/montree/guru/end-of-day/route.ts`, `components/montree/guru/EndOfDayNudge.tsx`
- Haiku-generated summary when progress is logged today
- Cached per child per day in `montree_guru_interactions`

### Phase 5: Proactive Suggestions
- **Files:** `lib/montree/guru/progress-analyzer.ts`, `app/api/montree/guru/suggestions/route.ts`, `components/montree/guru/GuruSuggestionCard.tsx`
- Detects stale works (2+ weeks no progress) and periods of inactivity
- Dismissible card on dashboard, localStorage-tracked

### Phase 6: Photo-Aware Observations
- **Files:** `app/api/montree/guru/photo-insight/route.ts`, `components/montree/guru/PhotoInsightButton.tsx`
- Sonnet vision API analyzes child work photos
- Button appears on progress page photo strip (home parents only)

### Phase 7: Knowledge Base Expansion
- **File:** `lib/montree/guru/knowledge-retriever.ts`
- ~20 new keyword mappings added covering practical life, sensorial, math, cultural studies
- Broader coverage for parent questions across all curriculum areas

### Phase 8: Voice Notes
- **Files:** `app/api/montree/guru/transcribe/route.ts`, `components/montree/guru/VoiceNoteButton.tsx`
- Native browser MediaRecorder API (no npm dependency needed)
- OpenAI Whisper transcription via existing `OPENAI_API_KEY`
- Integrated into QuickGuruFAB — microphone button between input and Ask button
- Audio NOT stored (privacy) — transcribe and discard

### Dashboard Integration
- `app/montree/dashboard/page.tsx` — EndOfDayNudge, GuruSuggestionCard, GuruFAQSection, GuruContextBubble, QuickGuruFAB all wired
- `app/montree/dashboard/[childId]/page.tsx` — GuruContextBubble on child week view
- `app/montree/dashboard/[childId]/progress/page.tsx` — GuruContextBubble + PhotoInsightButton
- `app/montree/dashboard/curriculum/page.tsx` — GuruContextBubble

### Audit Result
Full audit of all 8 phases: **zero bugs found**. All security patterns correct (`verifySchoolRequest`, `verifyChildBelongsToSchool`), all imports clean, all HOME_THEME usage consistent.

---

## Library Browse Page Redesign

### What Changed
- **File:** `app/montree/library/browse/page.tsx` — complete rewrite
- Replaced collapsible accordion sections with **tab-based navigation**
- 6 sticky tabs at top: Practical Life, Sensorial, Math, Language, Cultural, Miscellaneous
- Each tab shows works grouped by category with area-colored accents
- Miscellaneous tab catches any works with unknown/unrecognized area values
- Improved card design: rounded-xl, shadows, material chips, SVG chevrons
- Better empty states per area
- Search switches to correct tab when result found
- Hidden scrollbar CSS for horizontal tab overflow on mobile

### Design Details
- AREA_CONFIG extended with `short`, `gradient`, `bgLight`, `bgSubtle` properties
- Miscellaneous uses slate color scheme (#64748b)
- Active tab has colored underline indicator
- Works within tabs grouped by category headers

---

## English Corner Navigation Fix

### What Changed
- **File:** `app/montree/library/page.tsx` — added English Corner card
- Third navigation path on library welcome page (between Tools and Browse)
- Pink/rose color accent matching the language curriculum theme
- Links to existing `/montree/library/english-corner` page
- Previously the English Corner existed but was undiscoverable (no navigation link)

---

## Files Changed (This Session)

### New Files
- `lib/montree/guru/faq-cache.ts`
- `lib/montree/guru/page-tips.ts`
- `lib/montree/guru/progress-analyzer.ts`
- `components/montree/guru/GuruFAQSection.tsx`
- `components/montree/guru/GuruContextBubble.tsx`
- `components/montree/guru/EndOfDayNudge.tsx`
- `components/montree/guru/GuruSuggestionCard.tsx`
- `components/montree/guru/PhotoInsightButton.tsx`
- `components/montree/guru/VoiceNoteButton.tsx`
- `app/api/montree/guru/end-of-day/route.ts`
- `app/api/montree/guru/suggestions/route.ts`
- `app/api/montree/guru/photo-insight/route.ts`
- `app/api/montree/guru/transcribe/route.ts`

### Modified Files
- `app/api/montree/guru/route.ts` — conversation memory
- `lib/montree/guru/prompt-builder.ts` — HOMESCHOOL_ADDENDUM rewrite + conversation memory section
- `lib/montree/guru/knowledge-retriever.ts` — expanded keyword mappings
- `components/montree/guru/QuickGuruFAB.tsx` — VoiceNoteButton integration
- `app/montree/dashboard/page.tsx` — all guru component integrations
- `app/montree/dashboard/[childId]/page.tsx` — GuruContextBubble
- `app/montree/dashboard/[childId]/progress/page.tsx` — GuruContextBubble + PhotoInsightButton
- `app/montree/dashboard/curriculum/page.tsx` — GuruContextBubble
- `app/montree/library/browse/page.tsx` — complete redesign with tabs
- `app/montree/library/page.tsx` — English Corner navigation link

---

## Deploy Notes
- All changes are Next.js client components or API routes — no migrations needed
- Voice notes require `OPENAI_API_KEY` (already set in Railway)
- Photo insights require `ANTHROPIC_API_KEY` (already set in Railway)
- No new npm dependencies (MediaRecorder is native browser API)
