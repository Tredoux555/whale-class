# ENGLISH GAMES IMPROVEMENT PLAN
## Project: Complete English Guide ↔ Games Alignment
**Created:** January 9, 2026
**Priority:** 🔴 #1 - Work until complete
**Status:** 🟡 IN PROGRESS

---

## OVERVIEW

### Goal
Bring English Games system from 87% → 100% coverage of English Guide curriculum.

### Gaps to Close
1. **Green Series:** Missing 7 phonograms (ou, ow, ar, or, er, ir, ur)
2. **Blue Series:** Missing ending blends data (nd, nt, mp, nk, lk)
3. **Stage 1:** No parent-facing Vocabulary Builder game
4. **Stage 8:** No Grammar Symbols game
5. **Word Builder:** No level selector (all 58 words in one sequence)
6. **System:** No progress tracking for games

### Success Criteria
- [ ] Green Series: 16 phonograms (currently 9)
- [ ] Blue Series: Beginning + Ending blends complete
- [ ] Vocabulary Builder game functional
- [ ] Grammar Symbols game functional
- [ ] Word Builder has level selection
- [ ] All changes documented and tested

---

## PHASE 1: DATA COMPLETION (Quick Wins)
**Estimated Time:** 30 minutes
**Risk:** LOW - Data only, no UI changes

### Task 1.1: Add Green Series Phonograms
**File:** `/lib/games/game-data.ts`
**Action:** Add 7 new phonogram groups to GREEN_SERIES

```
New phonograms to add:
- ou: cloud, house, mouse (3 words)
- ow: cow, owl, brown (3 words)
- ar: car, star, farm (3 words)
- or: corn, horse, fork (3 words)
- er: her, water, tiger (3 words)
- ir: bird, girl, shirt (3 words)
- ur: fur, turtle, purple (3 words)

Total: 7 phonograms × 3 words = 21 new words
```

**Checkpoint:** Save file, verify no syntax errors
**Validation:** Import in test file, count ALL_GREEN_WORDS

### Task 1.2: Add Ending Blends Data
**File:** `/lib/games/game-data.ts`
**Action:** Create new ENDING_BLENDS export

```
New blends to add:
- nd: hand, sand, pond (3 words)
- nt: ant, tent, plant (3 words)
- mp: lamp, jump, stamp (3 words)
- nk: pink, sink, think (3 words)
- lk: milk, walk, talk (3 words)

Total: 5 blends × 3 words = 15 new words
```

**Checkpoint:** Save file, verify exports work
**Validation:** Check ALL_BLUE_WORDS includes new data

### Task 1.3: Update Word Counts in Docs
**File:** `/docs/DEEP_AUDIT_GAMES_VS_ENGLISH_GUIDE.md`
**Action:** Update word counts to reflect additions

**PHASE 1 CHECKPOINT:**
- [ ] game-data.ts updated with new phonograms
- [ ] game-data.ts updated with ending blends
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Commit message: "feat: complete Green Series phonograms and ending blends data"

---

## PHASE 2: VOCABULARY BUILDER GAME (Stage 1 Gap)
**Estimated Time:** 2-3 hours
**Risk:** MEDIUM - New component

### Task 2.1: Create Data Structure
**File:** `/lib/games/vocabulary-data.ts` (NEW)
**Action:** Define vocabulary categories and words

```typescript
Categories:
- Animals (20 words): cat, dog, bird, fish, etc.
- Food (20 words): apple, bread, milk, egg, etc.
- Body (15 words): hand, foot, eye, nose, etc.
- Home (15 words): bed, chair, door, window, etc.
- School (15 words): book, pen, desk, bag, etc.
- Nature (15 words): tree, flower, sun, rain, etc.

Total: 100 vocabulary words
```

**Checkpoint:** Save file, verify types compile

### Task 2.2: Create Game Component
**File:** `/components/games/VocabularyBuilderGame.tsx` (NEW)
**Action:** Build Three-Part Card style game

```
Features:
- Show picture + hear word
- Tap to replay audio
- Swipe/tap for next word
- Category selector
- Progress indicator (X of 10)
- Celebration at end
```

**Checkpoint:** Component renders without errors

### Task 2.3: Create Game Route
**File:** `/app/games/vocabulary-builder/page.tsx` (NEW)
**Action:** Create page wrapper

### Task 2.4: Add to Dynamic Loader
**File:** `/app/games/[gameId]/page.tsx`
**Action:** Add 'vocabulary-builder' to GAME_COMPONENTS

### Task 2.5: Generate Audio (if needed)
**Action:** Use ElevenLabs to generate vocabulary word audio
**Location:** `/public/audio/vocabulary/`

**PHASE 2 CHECKPOINT:**
- [ ] vocabulary-data.ts created with 100 words
- [ ] VocabularyBuilderGame.tsx functional
- [ ] Route accessible at /games/vocabulary-builder
- [ ] Audio files exist or fallback works
- [ ] Tested on mobile viewport
- [ ] Commit message: "feat: add Vocabulary Builder game for Stage 1"

**🔄 HANDOFF POINT 1:** After Phase 2, save all work, update HANDOFF.md

---

## PHASE 3: WORD BUILDER LEVEL SELECTOR
**Estimated Time:** 2 hours
**Risk:** MEDIUM - Modifying existing component

### Task 3.1: Create Level Selection UI
**File:** `/app/games/word-builder/page.tsx`
**Action:** Add level selector before game starts

```
UI Structure:
├── Pink Series (CVC)
│   ├── Short A (6 words)
│   ├── Short E (6 words)
│   ├── Short I (6 words)
│   ├── Short O (6 words)
│   └── Short U (6 words)
├── Blue Series (Blends)
│   ├── L-blends (18 words)
│   ├── R-blends (18 words)
│   └── S-blends (12 words)
└── Green Series (Phonograms)
    ├── Long E: ee/ea (6 words)
    ├── Long A: ai/ay (6 words)
    └── ... etc
```

### Task 3.2: Update WordBuildingGame Component
**File:** `/components/08-WordBuildingGame.tsx`
**Action:** Accept `level` and `words` props

```typescript
interface Props {
  level?: string;
  words?: WordData[];
  onComplete?: () => void;
}
```

### Task 3.3: Create Level Data Mapping
**File:** `/lib/games/word-builder-levels.ts` (NEW)
**Action:** Map level IDs to word arrays

**PHASE 3 CHECKPOINT:**
- [ ] Level selector UI functional
- [ ] Can select specific vowel/blend/phonogram
- [ ] WordBuildingGame accepts filtered word list
- [ ] "All Words" option still works
- [ ] Commit message: "feat: add level selector to Word Builder"

---

## PHASE 4: GRAMMAR SYMBOLS GAME (Stage 8 Gap)
**Estimated Time:** 3-4 hours
**Risk:** MEDIUM - New game concept

### Task 4.1: Create Grammar Data
**File:** `/lib/games/grammar-data.ts` (NEW)
**Action:** Define sentences with word classifications

```typescript
interface GrammarWord {
  word: string;
  type: 'noun' | 'verb' | 'adjective' | 'article' | 'preposition' | 'other';
}

interface GrammarSentence {
  id: number;
  words: GrammarWord[];
  level: 1 | 2 | 3;
}

// Example:
{
  id: 1,
  words: [
    { word: 'The', type: 'article' },
    { word: 'cat', type: 'noun' },
    { word: 'sat', type: 'verb' },
  ],
  level: 1
}
```

### Task 4.2: Create Game Component
**File:** `/components/games/GrammarSymbolsGame.tsx` (NEW)
**Action:** Build word-tapping game

```
Game Flow:
1. Show instruction: "Tap all the NAMING words (nouns)"
2. Display sentence with tappable words
3. Child taps words they think are nouns
4. Correct = word gets black triangle ▲
5. Wrong = gentle shake, try again
6. Complete = celebration, next sentence
```

### Task 4.3: Create Montessori Symbols
**Action:** SVG or emoji symbols for parts of speech

```
Noun = Black Triangle ▲ (or 🔺)
Verb = Red Circle ● (or 🔴)
Adjective = Blue Triangle 🔷
Article = Light Blue Triangle
Preposition = Green Crescent 🌙
```

### Task 4.4: Create Game Route
**File:** `/app/games/grammar-symbols/page.tsx` (NEW)

### Task 4.5: Add to Dynamic Loader
**File:** `/app/games/[gameId]/page.tsx`
**Action:** Add 'grammar-symbols' to GAME_COMPONENTS

**PHASE 4 CHECKPOINT:**
- [ ] grammar-data.ts has 15+ classified sentences
- [ ] GrammarSymbolsGame.tsx functional
- [ ] 3 levels: Nouns only → Nouns+Verbs → All types
- [ ] Montessori symbols display correctly
- [ ] Route accessible
- [ ] Commit message: "feat: add Grammar Symbols game for Stage 8"

**🔄 HANDOFF POINT 2:** After Phase 4, save all work, update HANDOFF.md

---

## PHASE 5: COMBINED I SPY GAME (Enhancement)
**Estimated Time:** 1-2 hours
**Risk:** LOW - Extends existing pattern

### Task 5.1: Add Advanced Level to Sound Games
**File:** `/app/games/sound-games/combined/page.tsx` (NEW)
**Action:** Create beginning + ending sound game

```
Game Flow:
1. "I spy something that BEGINS with /c/ and ENDS with /t/"
2. Show 4 picture options
3. Child selects correct one (cat)
4. Audio feedback
```

### Task 5.2: Create Combined Data
**File:** `/lib/sound-games/combined-sounds-data.ts` (NEW)
**Action:** Define word pairs with both beginning and ending sounds

**PHASE 5 CHECKPOINT:**
- [ ] Combined I Spy game functional
- [ ] Uses existing audio assets
- [ ] 20+ word combinations
- [ ] Commit message: "feat: add Combined I Spy advanced sound game"

---

## PHASE 6: DOCUMENTATION & TESTING
**Estimated Time:** 1 hour
**Risk:** LOW

### Task 6.1: Update English Guide
**File:** `/app/admin/english-guide/page.tsx`
**Action:** Add links to new games in each stage

### Task 6.2: Update Games Hub
**File:** `/app/games/page.tsx`
**Action:** Add new games to the games listing

### Task 6.3: Update Alignment Document
**File:** `/docs/ENGLISH_GAMES_CURRICULUM_ALIGNMENT.md`
**Action:** Mark all gaps as resolved

### Task 6.4: Update Deep Audit
**File:** `/docs/DEEP_AUDIT_GAMES_VS_ENGLISH_GUIDE.md`
**Action:** Update coverage scores to 100%

### Task 6.5: Manual Testing Checklist
```
[ ] All sound games load and play audio
[ ] Vocabulary Builder works on mobile
[ ] Word Builder level selector functional
[ ] Grammar Symbols game progression works
[ ] Combined I Spy game functional
[ ] No console errors
[ ] All routes accessible
```

**PHASE 6 CHECKPOINT:**
- [ ] All documentation updated
- [ ] Manual testing complete
- [ ] No broken links
- [ ] Commit message: "docs: update all documentation for 100% curriculum coverage"

---

## PHASE 7: HANDOFF & MEMORY UPDATE
**Estimated Time:** 15 minutes
**Risk:** NONE

### Task 7.1: Create Final Handoff
**File:** `/HANDOFF.md`
**Action:** Document completion status

### Task 7.2: Update Mission Control
**File:** Relevant mission control files
**Action:** Mark English Games as complete

### Task 7.3: Update Claude Memory
**Action:** Use memory_user_edits tool to update status

**FINAL CHECKPOINT:**
- [ ] HANDOFF.md current
- [ ] Memory updated
- [ ] All files committed
- [ ] Ready for next priority

---

## EXECUTION RULES

### Chunking Strategy
1. **Never edit more than 50 lines at once**
2. **Save after every file change**
3. **Verify no errors before moving to next task**
4. **Create checkpoint after each Task (not just Phase)**

### Error Recovery
1. If TypeScript error → Fix immediately before continuing
2. If component won't render → Check imports and props
3. If audio missing → Use fallback or skip audio test

### Context Management
1. **After Phase 2:** Create HANDOFF, refresh context if needed
2. **After Phase 4:** Create HANDOFF, refresh context if needed
3. **At any sign of confusion:** Re-read this plan file

### File Save Points
```
/docs/ENGLISH_GAMES_IMPROVEMENT_PLAN.md  ← This file (current)
/HANDOFF.md                              ← Session handoff
/docs/DEEP_AUDIT_GAMES_VS_ENGLISH_GUIDE.md ← Audit results
```

---

## PROGRESS TRACKER

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Data Completion | ✅ DONE | Jan 9 | Jan 9 |
| Phase 2: Vocabulary Builder | 🟡 NEXT | - | - |
| Phase 3: Word Builder Levels | ⚪ TODO | - | - |
| Phase 4: Grammar Symbols | ⚪ TODO | - | - |
| Phase 5: Combined I Spy | ⚪ TODO | - | - |
| Phase 6: Documentation | ⚪ TODO | - | - |
| Phase 7: Handoff | ⚪ TODO | - | - |

---

## ESTIMATED TOTAL TIME

| Phase | Time |
|-------|------|
| Phase 1 | 30 min |
| Phase 2 | 2-3 hrs |
| Phase 3 | 2 hrs |
| Phase 4 | 3-4 hrs |
| Phase 5 | 1-2 hrs |
| Phase 6 | 1 hr |
| Phase 7 | 15 min |
| **TOTAL** | **10-13 hours** |

**Recommended Sessions:**
- Session 1: Phases 1-2 (3-4 hours)
- Session 2: Phases 3-4 (5-6 hours)
- Session 3: Phases 5-7 (2-3 hours)

---

## NEXT ACTION

**START PHASE 1, TASK 1.1:**
Open `/lib/games/game-data.ts` and add Green Series phonograms.

---

*Plan created: January 9, 2026*
*Last updated: [Current Session]*
