# 🐋 Whale Games Audit Plan
## Comprehensive Quality Assurance for 10 Montessori Games

**Created:** January 21, 2026  
**Auditor:** [Name]  
**Status:** ⬜ Not Started

---

## 📋 AUDIT OVERVIEW

### Games to Audit (10 Total)

| # | Game | Route | Area | Priority |
|---|------|-------|------|----------|
| 1 | Number Tracer | `/games/number-tracer` | Math | HIGH |
| 2 | Letter Tracer | `/games/letter-tracer` | Language | HIGH |
| 3 | Sound Safari | `/games/sound-safari` | Language | HIGH |
| 4 | Word Builder | `/games/word-builder-new` | Language | HIGH |
| 5 | Match Attack | `/games/match-attack-new` | Language | MEDIUM |
| 6 | Read & Reveal | `/games/read-and-reveal` | Language | MEDIUM |
| 7 | Sentence Scramble | `/games/sentence-scramble` | Language | MEDIUM |
| 8 | Quantity Match | `/games/quantity-match` | Math | HIGH |
| 9 | Bead Frame | `/games/bead-frame` | Math | HIGH |
| 10 | Sensorial Sort | `/games/sensorial-sort` | Sensorial | MEDIUM |

---

## 🔍 AUDIT CATEGORIES

### A. Functional Testing
### B. Montessori Accuracy
### C. UI/UX Review
### D. Code Quality
### E. Performance
### F. Mobile/Tablet Compatibility
### G. API Integration
### H. Accessibility

---

## A. FUNCTIONAL TESTING

### A1. Game Loading
For each game, verify:

| Check | Number Tracer | Letter Tracer | Sound Safari | Word Builder | Match Attack | Read&Reveal | Sentence Scramble | Quantity Match | Bead Frame | Sensorial Sort |
|-------|---------------|---------------|--------------|--------------|--------------|-------------|-------------------|----------------|------------|----------------|
| Page loads without errors | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Menu displays all modes | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| No console errors | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Back button works | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

### A2. Core Gameplay
Test each game mode completely:

#### Number Tracer
- ⬜ Numbers 0-9 all display correctly
- ⬜ Tracing path detection works
- ⬜ Success/failure feedback triggers
- ⬜ Progress through all numbers
- ⬜ Completion screen shows

#### Letter Tracer
- ⬜ Letters a-z all display correctly
- ⬜ Tracing path detection works
- ⬜ Lowercase forms are accurate
- ⬜ Progress saves between letters
- ⬜ Completion screen shows

#### Sound Safari
- ⬜ Beginning sounds mode works
- ⬜ Ending sounds mode works (if applicable)
- ⬜ Images load correctly
- ⬜ Sound plays (if audio enabled)
- ⬜ Correct/incorrect feedback works

#### Word Builder
- ⬜ Letter tiles display
- ⬜ Drag-and-drop works
- ⬜ Word completion detection
- ⬜ CVC words generate correctly
- ⬜ Difficulty progression works

#### Match Attack
- ⬜ Cards/items display
- ⬜ Matching logic works
- ⬜ Timer functions (if applicable)
- ⬜ Score tracking accurate
- ⬜ Round progression works

#### Read & Reveal
- ⬜ Reading cards display
- ⬜ Image reveal mechanism works
- ⬜ Answer validation correct
- ⬜ Pink series words used
- ⬜ Completion tracking works

#### Sentence Scramble
- ⬜ Word tiles display
- ⬜ Drag/tap to arrange works
- ⬜ Sentence validation correct
- ⬜ Grammar checking (capitals, periods)
- ⬜ Difficulty levels work

#### Quantity Match
- ⬜ **Arrange Cards**: 1-10 sequencing works
- ⬜ **Pair Counters**: Counter placement works
- ⬜ **Odd & Even**: Visual pairing shows lonely one
- ⬜ Red disc counters display in pairs
- ⬜ All 3 modes complete successfully

#### Bead Frame
- ⬜ **Build Numbers**: Target number displays
- ⬜ **Add It Up**: Addition problems generate
- ⬜ **Take Away**: Subtraction with pre-loaded beads
- ⬜ Bead movement (tap to add/remove) works
- ⬜ Place value wires color-coded correctly
- ⬜ Exchange/carrying concept clear

#### Sensorial Sort
- ⬜ **Color Match**: Memory matching works
- ⬜ **Color Grade**: 7 shades sort correctly
- ⬜ **Size Sort**: Pink Tower sizing works
- ⬜ All 5 color gradations available
- ⬜ Progressive difficulty increases

### A3. Scoring & Gamification
For each game verify:

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| XP awards on correct answers | ⬜ | |
| Streak counter increments | ⬜ | |
| Streak resets on wrong answer | ⬜ | |
| Perfect bonus triggers (streak ≥2) | ⬜ | |
| Score displays correctly | ⬜ | |
| Best streak tracks across rounds | ⬜ | |
| Completion screen shows stats | ⬜ | |

---

## B. MONTESSORI ACCURACY

### B1. Material Mapping Verification

| Game | Claimed Material | Verify Accurate | Notes |
|------|------------------|-----------------|-------|
| Number Tracer | Sandpaper Numerals (ma_sandpaper_numerals) | ⬜ | Should trace 0-9 |
| Letter Tracer | Sandpaper Letters (la_sandpaper_letters) | ⬜ | Lowercase, phonetic |
| Sound Safari | I-Spy Sound Games | ⬜ | Beginning sounds focus |
| Word Builder | Moveable Alphabet (la_moveable_alphabet) | ⬜ | CVC word building |
| Match Attack | Pink Object Box | ⬜ | 3-letter phonetic words |
| Read & Reveal | Pink Reading Cards | ⬜ | CVC sentences |
| Sentence Scramble | Sentence Building | ⬜ | Word order practice |
| Quantity Match | Cards & Counters (ma_cards_counters) | ⬜ | Symbol-quantity, odd/even |
| Bead Frame | Small Bead Frame (ma_small_bead_frame) | ⬜ | 4 wires, place value |
| Sensorial Sort | Color Boxes + Pink Tower | ⬜ | Visual discrimination |

### B2. Montessori Principles Check

| Principle | Implementation | Verified |
|-----------|----------------|----------|
| **Control of Error** | Child can self-correct | ⬜ |
| **Isolation of Difficulty** | One concept at a time | ⬜ |
| **Concrete to Abstract** | Visual/tactile before symbols | ⬜ |
| **Sequential Progression** | Skills build on prerequisites | ⬜ |
| **Child-Paced** | No timers forcing speed | ⬜ |
| **Repetition** | Can replay unlimited | ⬜ |

### B3. Specific Material Accuracy

#### Quantity Match - Cards & Counters
- ⬜ Counters are RED (Montessori standard)
- ⬜ Counters arranged in PAIRS (vertical columns of 2)
- ⬜ "Lonely one" visible for odd numbers
- ⬜ Numbers 1-10 covered
- ⬜ Zero concept addressed (empty)

#### Bead Frame - Small Bead Frame
- ⬜ 4 wires (not 7 - that's Large Bead Frame)
- ⬜ Color coding: Green=Units, Blue=Tens, Red=Hundreds, Green=Thousands
- ⬜ 10 beads per wire
- ⬜ Beads move LEFT to count (active side)
- ⬜ Center divider present

#### Sensorial Sort - Color Boxes
- ⬜ Color Box 1: Red, Yellow, Blue only (3 pairs)
- ⬜ Color Box 2: 11 colors including primary, secondary, neutrals
- ⬜ Color Box 3: 7 gradations per color (light to dark)
- ⬜ Terminology: "light/dark" not "bright/dull"

#### Sensorial Sort - Pink Tower
- ⬜ 10 cubes graduating in size
- ⬜ Smallest to largest arrangement
- ⬜ Visual size discrimination focus

---

## C. UI/UX REVIEW

### C1. Visual Design

| Check | Status | Notes |
|-------|--------|-------|
| Consistent color scheme across games | ⬜ | |
| Readable fonts (child-friendly) | ⬜ | |
| Touch targets ≥44px | ⬜ | |
| Clear visual hierarchy | ⬜ | |
| Animations smooth (not jarring) | ⬜ | |
| Progress indicators visible | ⬜ | |
| Feedback clear (correct/incorrect) | ⬜ | |

### C2. Navigation

| Check | Status | Notes |
|-------|--------|-------|
| Back button on all screens | ⬜ | |
| Mode selection clear | ⬜ | |
| Can exit mid-game | ⬜ | |
| Return to menu works | ⬜ | |
| Games Hub shows all games | ⬜ | |
| Category organization logical | ⬜ | |

### C3. Feedback & Rewards

| Check | Status | Notes |
|-------|--------|-------|
| Correct answer celebration visible | ⬜ | |
| Incorrect answer gentle (not punishing) | ⬜ | |
| Perfect streak bonus exciting | ⬜ | |
| XP gain visible | ⬜ | |
| Completion celebration satisfying | ⬜ | |
| Encourages retry on failure | ⬜ | |

---

## D. CODE QUALITY

### D1. File Structure Audit

```
Expected structure for each game:
/app/games/[game-name]/page.tsx
```

| Game | File Exists | Single File | Properly Typed |
|------|-------------|-------------|----------------|
| number-tracer | ⬜ | ⬜ | ⬜ |
| letter-tracer | ⬜ | ⬜ | ⬜ |
| sound-safari | ⬜ | ⬜ | ⬜ |
| word-builder-new | ⬜ | ⬜ | ⬜ |
| match-attack-new | ⬜ | ⬜ | ⬜ |
| read-and-reveal | ⬜ | ⬜ | ⬜ |
| sentence-scramble | ⬜ | ⬜ | ⬜ |
| quantity-match | ⬜ | ⬜ | ⬜ |
| bead-frame | ⬜ | ⬜ | ⬜ |
| sensorial-sort | ⬜ | ⬜ | ⬜ |

### D2. TypeScript Check

Run: `npx tsc --noEmit`

| Game | No TS Errors | Proper Types | No `any` abuse |
|------|--------------|--------------|----------------|
| All games | ⬜ | ⬜ | ⬜ |

### D3. Code Patterns

| Pattern | Consistent | Notes |
|---------|------------|-------|
| useState for game state | ⬜ | |
| GameState interface defined | ⬜ | |
| GameMode type union | ⬜ | |
| GamePhase: menu/playing/feedback/complete | ⬜ | |
| Framer Motion for animations | ⬜ | |
| Tailwind for styling | ⬜ | |
| API tracking call on complete | ⬜ | |

### D4. Build Test

```bash
cd ~/Desktop/whale
npm run build
```

| Check | Status | Notes |
|-------|--------|-------|
| Build completes without errors | ⬜ | |
| No TypeScript errors | ⬜ | |
| No ESLint warnings | ⬜ | |
| Bundle size reasonable | ⬜ | |

---

## E. PERFORMANCE

### E1. Load Time

Test on: Chrome DevTools > Network > Slow 3G

| Game | Initial Load <3s | Interactive <5s | Notes |
|------|------------------|-----------------|-------|
| number-tracer | ⬜ | ⬜ | |
| letter-tracer | ⬜ | ⬜ | |
| sound-safari | ⬜ | ⬜ | |
| word-builder-new | ⬜ | ⬜ | |
| match-attack-new | ⬜ | ⬜ | |
| read-and-reveal | ⬜ | ⬜ | |
| sentence-scramble | ⬜ | ⬜ | |
| quantity-match | ⬜ | ⬜ | |
| bead-frame | ⬜ | ⬜ | |
| sensorial-sort | ⬜ | ⬜ | |

### E2. Animation Performance

| Check | Status | Notes |
|-------|--------|-------|
| No animation jank | ⬜ | |
| 60fps during interactions | ⬜ | |
| No layout thrashing | ⬜ | |

### E3. Memory

| Check | Status | Notes |
|-------|--------|-------|
| No memory leaks on replay | ⬜ | |
| Cleanup on unmount | ⬜ | |

---

## F. MOBILE/TABLET COMPATIBILITY

### F1. Device Testing

| Device | All Games Work | Touch Works | Layout OK |
|--------|----------------|-------------|-----------|
| iPhone SE (small) | ⬜ | ⬜ | ⬜ |
| iPhone 14 (medium) | ⬜ | ⬜ | ⬜ |
| iPad (tablet) | ⬜ | ⬜ | ⬜ |
| Android Phone | ⬜ | ⬜ | ⬜ |
| Android Tablet | ⬜ | ⬜ | ⬜ |

### F2. Touch Interactions

| Check | Status | Notes |
|-------|--------|-------|
| Tap targets large enough | ⬜ | Min 44x44px |
| Drag-and-drop works | ⬜ | |
| No hover-only states | ⬜ | |
| Swipe doesn't break game | ⬜ | |
| Pinch-zoom disabled in game | ⬜ | |

### F3. Responsive Layout

| Check | Status | Notes |
|-------|--------|-------|
| 320px width works | ⬜ | |
| 768px width works | ⬜ | |
| 1024px width works | ⬜ | |
| No horizontal scroll | ⬜ | |
| Grid adjusts properly | ⬜ | |

---

## G. API INTEGRATION

### G1. Tracking Endpoint

Verify `/api/games/track` receives correct data:

```typescript
{
  game_id: string,      // e.g., 'quantity-match'
  mode: string,         // e.g., 'counters'
  score: number,
  xp_earned: number,
  streak: number,
  completed: boolean
}
```

| Game | Sends on Complete | Correct Payload | API Responds 200 |
|------|-------------------|-----------------|------------------|
| number-tracer | ⬜ | ⬜ | ⬜ |
| letter-tracer | ⬜ | ⬜ | ⬜ |
| sound-safari | ⬜ | ⬜ | ⬜ |
| word-builder-new | ⬜ | ⬜ | ⬜ |
| match-attack-new | ⬜ | ⬜ | ⬜ |
| read-and-reveal | ⬜ | ⬜ | ⬜ |
| sentence-scramble | ⬜ | ⬜ | ⬜ |
| quantity-match | ⬜ | ⬜ | ⬜ |
| bead-frame | ⬜ | ⬜ | ⬜ |
| sensorial-sort | ⬜ | ⬜ | ⬜ |

### G2. Database Verification

Check Supabase `game_sessions` table (or equivalent):

| Check | Status | Notes |
|-------|--------|-------|
| Records created on completion | ⬜ | |
| User ID associated (if logged in) | ⬜ | |
| Timestamps correct | ⬜ | |
| No duplicate entries | ⬜ | |

---

## H. ACCESSIBILITY

### H1. Basic Checks

| Check | Status | Notes |
|-------|--------|-------|
| Color contrast ≥4.5:1 | ⬜ | |
| Not color-only feedback | ⬜ | |
| Focus indicators visible | ⬜ | |
| Keyboard navigable | ⬜ | |
| Screen reader friendly | ⬜ | |

### H2. Child-Specific

| Check | Status | Notes |
|-------|--------|-------|
| Simple language | ⬜ | |
| Clear icons/imagery | ⬜ | |
| Forgiving touch targets | ⬜ | |
| No frustrating timeouts | ⬜ | |

---

## 📊 AUDIT EXECUTION CHECKLIST

### Phase 1: Quick Smoke Test (30 min)
- ⬜ Load each game, play 1 round
- ⬜ Note any immediate crashes/errors
- ⬜ Verify Games Hub lists all 10 games

### Phase 2: Functional Deep Dive (2 hours)
- ⬜ Complete Section A for all games
- ⬜ Test all modes in each game
- ⬜ Verify scoring/XP works

### Phase 3: Montessori Review (1 hour)
- ⬜ Complete Section B
- ⬜ Cross-reference with curriculum JSON
- ⬜ Note any pedagogical concerns

### Phase 4: Technical Audit (1 hour)
- ⬜ Run build/TypeScript checks
- ⬜ Review code patterns
- ⬜ Test API integration

### Phase 5: Device Testing (1 hour)
- ⬜ Test on phone
- ⬜ Test on tablet
- ⬜ Test responsive breakpoints

### Phase 6: Polish & Edge Cases (30 min)
- ⬜ UX review
- ⬜ Accessibility spot check
- ⬜ Edge case testing (rapid clicking, etc.)

---

## 🐛 BUG TRACKING

### Critical (Blocks Usage)
| # | Game | Issue | Status |
|---|------|-------|--------|
| | | | |

### High (Major UX Issue)
| # | Game | Issue | Status |
|---|------|-------|--------|
| | | | |

### Medium (Should Fix)
| # | Game | Issue | Status |
|---|------|-------|--------|
| | | | |

### Low (Nice to Have)
| # | Game | Issue | Status |
|---|------|-------|--------|
| | | | |

---

## ✅ SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | Claude | Jan 21, 2026 | ✓ |
| QA Tester | | | |
| Montessori Reviewer | | | |
| Product Owner | Tredoux | | |

---

## 📝 NOTES

_Additional observations during audit:_

```
[Add notes here during audit]
```

---

## 🚀 POST-AUDIT ACTIONS

After audit completion:
1. ⬜ Fix all Critical bugs
2. ⬜ Fix all High bugs
3. ⬜ Create tickets for Medium/Low
4. ⬜ Re-test fixed items
5. ⬜ Final sign-off
6. ⬜ Deploy to production
