# Home Guru Revamp — Implementation Plan

## The Problem
The Guru is buried behind nav tabs. Parents land on a teacher-style dashboard and have to discover features. Parents think in WORRIES ("my child won't talk"), not curriculum areas.

## The Vision
Guru IS the interface for home parents. Same brain, different voice.

---

## Phase 1: Concern Mappings Data Layer (2 hrs)
**Create `lib/montree/guru/concern-mappings.ts`**

10 worry-to-work-cluster mappings, each with:
- id, icon, title, shortDesc
- developmentalContext (age-specific norms)
- relatedWorks[] (exact names from curriculum JSON, area, why it helps)
- homeActivities[] (DIY with household items)
- redFlags[] (when to seek professional help)

Concerns: speech delay, writing readiness, sharing/social, math readiness, concentration, biting/hitting, reading readiness, shyness, picky eating, independence.

---

## Phase 2: Parent Mode Prompt Upgrade (1 hr)
**Modify `lib/montree/guru/prompt-builder.ts`**

Replace minimal HOMESCHOOL_ADDENDUM with rich 8-rule parent prompt:
1. No jargon without plain English explanation
2. Connect classroom works to parent's real-world concern
3. Home version with household items for every work mentioned
4. Reference child's actual progress data
5. Explain connections across curriculum areas
6. Age-appropriate expectations
7. Professional referral triggers (specific benchmarks)
8. Never diagnose — complement, don't replace therapy

---

## Phase 3: Concern Guide API (3 hrs)
**Create `app/api/montree/guru/concern/route.ts`**

- GET `/api/montree/guru/concern?child_id=X&concern_id=speech_delay`
- Auth: verifySchoolRequest + verifyChildBelongsToSchool
- Pulls concern mapping + child's progress on related works
- Calls Haiku with personalized prompt
- Caches per child per concern per day in montree_guru_interactions
- Returns: developmental context, what child is already doing, 5 home activities, red flags, parent affirmation

---

## Phase 4: Quick-Fire API (2 hrs)
**Create `app/api/montree/guru/quick/route.ts`**

- POST with { child_id, question }
- Haiku with tight prompt: 2 sentences max, under 50 words
- No caching — instant, fresh
- 5s timeout with AbortController

---

## Phase 5: Dashboard "Today" View (4 hrs)
**Modify `app/montree/dashboard/page.tsx`**

For `isHomeschoolParent()` only — teachers see zero changes.

Replace child grid with:
1. **Morning Briefing** — auto-fetch daily plan on mount (no "Generate" button)
2. **Concern Cards** — 10-card grid of "I'm worried about..."
3. **Ask Guru** — free-text input at bottom

New components:
- `components/montree/guru/ConcernCardsGrid.tsx` — 2-col grid, tappable cards
- `components/montree/guru/ConcernDetailModal.tsx` — full-screen modal with personalized guide

Child selector at top if multiple children. Single child auto-selected.

---

## Phase 6: Quick-Fire FAB (2 hrs)
**Create `components/montree/guru/QuickGuruFAB.tsx`**

- Floating 🌿 button (bottom-right)
- Tap → small modal with text input
- Submit → 2-sentence Haiku answer in-place
- Inject into dashboard + curriculum browse + child week view (home parents only)

---

## Phase 7: Weekly Review (2 hrs)
**Create `app/api/montree/guru/weekly-review/route.ts`**
**Create `components/montree/guru/WeeklyReview.tsx`**

- Auto-generates Sunday review from week's progress data
- 3 paragraphs: what went well, patterns observed, next week suggestion
- Shows as banner on dashboard
- Cached per child per week

---

## Phase 8: Curriculum "Recommended" Filter (2 hrs)
**Modify `app/montree/dashboard/curriculum/browse/page.tsx`**

- Default view for home parents: "Recommended for [Child]"
- Filters by age range + excludes mastered works + sorts by prerequisites met
- Plain English labels throughout
- "Start Here" / "Building On" / "Advanced" difficulty badges

---

## Build Order

```
Phase 1 (data) → Phase 2 (prompt) → Phase 3 (concern API) → Phase 5 (dashboard UI)
Phase 4 (quick API) → Phase 6 (FAB)
Phase 7 (weekly) — independent
Phase 8 (curriculum) — independent
```

Total: ~18 hrs across 8 phases.

## Rules
- ALL changes gated behind isHomeschoolParent() — teachers see ZERO changes
- Haiku for all new endpoints (Sonnet only for deep Guru chat)
- All new API routes use verifySchoolRequest + verifyChildBelongsToSchool
- Cache in montree_guru_interactions with question_type field
- HOME_THEME constants for all styling
- Mobile-first (PWA)
