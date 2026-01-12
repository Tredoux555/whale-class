# 🎯 WHALE ASSESSMENT SYSTEM - MASTER BUILD PLAN

## Priority: #1 (Above all other work)
## Codename: "Whale Test"
## Target: Pre-K to K English Readiness Assessment

---

## OVERVIEW

Build a tablet-friendly assessment system that repurposes existing phonics games into a structured test format. Children tap their name, complete 6-7 mini-tests (modified versions of existing games), and results are saved for teachers/principals to review.

**Key Principles:**
- Reuse existing game components (don't rebuild from scratch)
- Add `testMode` prop to games for assessment behavior
- Simple child-facing UI (tap name → do test → celebration)
- Powerful admin dashboard for results analysis

---

## ARCHITECTURE

### Database Schema (New Tables)

```sql
-- Assessment Sessions
CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id),
  child_name TEXT NOT NULL,
  classroom_id UUID,
  teacher_id UUID,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Overall Results
  total_score INTEGER,
  total_possible INTEGER,
  overall_percentage DECIMAL(5,2),
  overall_level TEXT CHECK (overall_level IN ('proficient', 'developing', 'emerging')),
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Skill Results
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  
  -- Skill Info
  skill_code TEXT NOT NULL,  -- 'letter_sounds', 'beginning_sounds', etc.
  skill_name TEXT NOT NULL,  -- 'Letter Sounds', 'Beginning Sounds', etc.
  skill_order INTEGER,       -- Order in test sequence
  
  -- Results
  correct_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  percentage DECIMAL(5,2),
  level TEXT CHECK (level IN ('proficient', 'developing', 'emerging')),
  
  -- Detailed Item Data (JSON array of each question)
  items_data JSONB,  -- [{item: 'letter_a', correct: true, attempts: 1, time_ms: 2300}, ...]
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_child ON assessment_sessions(child_id);
CREATE INDEX idx_sessions_classroom ON assessment_sessions(classroom_id);
CREATE INDEX idx_sessions_completed ON assessment_sessions(completed_at);
CREATE INDEX idx_results_session ON assessment_results(session_id);
CREATE INDEX idx_results_skill ON assessment_results(skill_code);
```

### Route Structure

```
/assessment                    -- Child-facing: Start assessment
/assessment/[sessionId]        -- Child-facing: Active test session
/assessment/[sessionId]/complete -- Child-facing: Completion celebration

/admin/test                    -- Admin tab: Overview dashboard
/admin/test/sessions           -- All assessment sessions
/admin/test/sessions/[id]      -- Single session detail
/admin/test/children           -- Children list with latest scores
/admin/test/children/[id]      -- Individual child history
/admin/test/classes            -- Class-level overview
/admin/test/classes/[id]       -- Single class breakdown
```

### API Routes

```
/api/assessment/sessions       -- GET (list), POST (create)
/api/assessment/sessions/[id]  -- GET (detail), PATCH (update), DELETE
/api/assessment/results        -- POST (save skill result)
/api/assessment/children       -- GET (children with scores)
/api/assessment/classes        -- GET (class summaries)
/api/assessment/export/[id]    -- GET (PDF export for session)
```

---

## SKILL MODULES (Test Sequence)

Each skill maps to an existing game component with a `testMode` prop.

| Order | Skill Code | Display Name | Existing Game | Items |
|-------|------------|--------------|---------------|-------|
| 1 | `letter_recognition` | Letter Recognition | Letter Match | 8 |
| 2 | `letter_sounds` | Letter Sounds | Letter Sounds | 6 |
| 3 | `beginning_sounds` | Beginning Sounds | Beginning Sounds | 6 |
| 4 | `ending_sounds` | Ending Sounds | Ending Sounds | 5 |
| 5 | `middle_sounds` | Middle Sounds | Middle Sounds | 4 |
| 6 | `blending` | Sound Blending | Sound Blending | 5 |
| 7 | `segmenting` | Sound Segmenting | Sound Segmenting | 4 |

**Total: 38 items, ~12-15 minutes**

### Test Mode Behavior Changes

When `testMode={true}`:
- **No retries** - One attempt per item, then move on
- **No hints** - Just gentle "Let's try the next one!"
- **Limited items** - Only 4-8 items per skill (not unlimited)
- **Track everything** - Record correct/incorrect, time per item
- **No score display** - Child doesn't see percentages
- **Callback on complete** - `onComplete(results)` fires when done

---

## UI/UX DESIGN

### Child-Facing Assessment Flow

```
┌─────────────────────────────────────────────────┐
│  🐋 WHALE TEST                                  │
│                                                 │
│  "Hi! Let's play some games together!"          │
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Amy    │ │  Ben    │ │  Chloe  │           │
│  │   🧒    │ │   👦    │ │   👧    │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  David  │ │  Emma   │ │  Frank  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  [🔍 Search...]                                 │
└─────────────────────────────────────────────────┘
```

**After name selection:**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         🐋                                      │
│                                                 │
│    "Great, Amy! Let's start!"                   │
│                                                 │
│    ○ ○ ○ ○ ○ ○ ○  (7 stops on the path)        │
│                                                 │
│         [ ▶️ Start ]                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**During test (game fills screen):**
- Progress dots at top showing current position
- Game component in test mode fills rest of screen
- Audio instructions play automatically

**Completion:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🎉 ⭐ 🎉                           │
│                                                 │
│         "Amazing job, Amy!"                     │
│                                                 │
│      "You finished all the games!"              │
│                                                 │
│              🐋 ✨                               │
│                                                 │
│         [ 🏠 All Done ]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Admin Dashboard Design

**Main Overview (/admin/test):**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Assessment Dashboard                    [+ New Assessment]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Stats                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    42    │  │    38    │  │   91%    │  │    3     │        │
│  │ Assessed │  │ Complete │  │ Avg Score│  │ This Week│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
│  Recent Assessments                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👧 Amy Chen      │ Today 10:30am  │ 🟢 87%  │ View →   │   │
│  │ 👦 Ben Smith     │ Today 10:15am  │ 🟡 62%  │ View →   │   │
│  │ 👧 Chloe Wang    │ Today 9:45am   │ 🟢 94%  │ View →   │   │
│  │ 👦 David Liu     │ Yesterday      │ 🔴 41%  │ View →   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Class Overview                                                 │
│  ┌────────────────────────────────────────────┐                │
│  │ 🏫 Pre-K A (Ms. Chen)  │ 18/20 │ 78% avg │                 │
│  │ 🏫 Pre-K B (Mr. Liu)   │ 15/18 │ 71% avg │                 │
│  └────────────────────────────────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Individual Child Result:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                              Amy Chen - Jan 12, 2026    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overall: 🟢 87% Proficient          Duration: 11 min 23 sec   │
│                                                                 │
│  Skill Breakdown                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Letter Recognition    ████████████████░░  8/8   🟢 100% │   │
│  │ Letter Sounds         ████████████░░░░░░  5/6   🟢 83%  │   │
│  │ Beginning Sounds      ██████████████░░░░  5/6   🟢 83%  │   │
│  │ Ending Sounds         ████████████░░░░░░  4/5   🟢 80%  │   │
│  │ Middle Sounds         ██████░░░░░░░░░░░░  2/4   🟡 50%  │   │
│  │ Blending              ████████████████░░  5/5   🟢 100% │   │
│  │ Segmenting            ██████████░░░░░░░░  3/4   🟢 75%  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ Focus Areas:                                                │
│  • Middle Sounds - Needs practice with medial vowels           │
│                                                                 │
│  [📄 Export PDF]  [🔄 Retake Test]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PHASES

### Phase 1: Database & API Foundation (Day 1)
- [ ] Create migration file `034_assessment_system.sql`
- [ ] Create `/api/assessment/sessions` route (GET, POST)
- [ ] Create `/api/assessment/sessions/[id]` route (GET, PATCH)
- [ ] Create `/api/assessment/results` route (POST)
- [ ] Test API endpoints

### Phase 2: Test Mode for Games (Day 1-2)
- [ ] Create `useTestMode` hook for shared test logic
- [ ] Add `testMode` prop to Letter Match game
- [ ] Add `testMode` prop to Letter Sounds game
- [ ] Add `testMode` prop to Beginning Sounds game
- [ ] Add `testMode` prop to Ending Sounds game
- [ ] Add `testMode` prop to Middle Sounds game
- [ ] Add `testMode` prop to Sound Blending game
- [ ] Add `testMode` prop to Sound Segmenting game
- [ ] Create `TestModeWrapper` component for consistent behavior

### Phase 3: Child-Facing Assessment Flow (Day 2)
- [ ] Create `/assessment/page.tsx` - Child name selection
- [ ] Create `/assessment/[sessionId]/page.tsx` - Active test runner
- [ ] Create `/assessment/[sessionId]/complete/page.tsx` - Celebration
- [ ] Create `AssessmentProgress` component (dots/path)
- [ ] Create `TestTransition` component (between skills)
- [ ] Add audio instruction support
- [ ] Test full child flow

### Phase 4: Admin Dashboard (Day 2-3)
- [ ] Add "Test" tab to admin navigation
- [ ] Create `/admin/test/page.tsx` - Overview dashboard
- [ ] Create `/admin/test/sessions/page.tsx` - All sessions list
- [ ] Create `/admin/test/sessions/[id]/page.tsx` - Session detail
- [ ] Create `/admin/test/children/page.tsx` - Children with scores
- [ ] Create `/admin/test/children/[id]/page.tsx` - Child history
- [ ] Create skill breakdown visualization component
- [ ] Add filtering and search

### Phase 5: Polish & PWA (Day 3)
- [ ] Ensure all pages work offline-first
- [ ] Add loading states and error handling
- [ ] Test on actual tablet devices
- [ ] Add PDF export for individual results
- [ ] Performance optimization
- [ ] Final testing

---

## FILE STRUCTURE

```
app/
├── assessment/
│   ├── page.tsx                    # Child name selection
│   └── [sessionId]/
│       ├── page.tsx                # Active test runner
│       └── complete/
│           └── page.tsx            # Celebration screen
├── admin/
│   └── test/
│       ├── page.tsx                # Dashboard overview
│       ├── sessions/
│       │   ├── page.tsx            # All sessions
│       │   └── [id]/
│       │       └── page.tsx        # Session detail
│       ├── children/
│       │   ├── page.tsx            # Children list
│       │   └── [id]/
│       │       └── page.tsx        # Child history
│       └── classes/
│           ├── page.tsx            # Class overview
│           └── [id]/
│               └── page.tsx        # Class detail
├── api/
│   └── assessment/
│       ├── sessions/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts        # GET, PATCH, DELETE
│       ├── results/
│       │   └── route.ts            # POST save result
│       ├── children/
│       │   └── route.ts            # GET children with scores
│       └── export/
│           └── [id]/
│               └── route.ts        # GET PDF export

components/
├── assessment/
│   ├── ChildSelector.tsx           # Name selection grid
│   ├── TestRunner.tsx              # Orchestrates test flow
│   ├── TestProgress.tsx            # Progress dots/path
│   ├── TestTransition.tsx          # Between-skill screens
│   ├── TestCelebration.tsx         # Completion celebration
│   └── SkillBreakdown.tsx          # Results visualization

hooks/
├── useTestMode.ts                  # Shared test mode logic
└── useAssessmentSession.ts         # Session management

lib/
└── assessment/
    ├── skills.ts                   # Skill definitions & config
    ├── scoring.ts                  # Scoring logic
    └── items.ts                    # Test item banks

migrations/
└── 034_assessment_system.sql       # Database schema
```

---

## AUDIO RECORDINGS NEEDED

For each skill section, you'll need to record:

### Introduction Audio
- `intro_welcome.mp3` - "Hi! Let's play some games together!"
- `intro_start.mp3` - "Great! Let's start!"

### Skill Intros (one per skill)
- `skill_letter_recognition.mp3` - "Let's find some letters!"
- `skill_letter_sounds.mp3` - "Listen to the sound and find the letter!"
- `skill_beginning_sounds.mp3` - "What sound does this word start with?"
- `skill_ending_sounds.mp3` - "What sound does this word end with?"
- `skill_middle_sounds.mp3` - "What sound is in the middle?"
- `skill_blending.mp3` - "Put the sounds together!"
- `skill_segmenting.mp3` - "Break the word into sounds!"

### Transitions
- `transition_great.mp3` - "Great job! Let's try another game!"
- `transition_next.mp3` - "Here comes the next one!"
- `transition_almost.mp3` - "Almost done! One more game!"

### Completion
- `complete_celebration.mp3` - "Amazing! You finished all the games!"
- `complete_done.mp3` - "You did such a great job!"

---

## SCORING LOGIC

```typescript
// Scoring thresholds
const LEVELS = {
  proficient: { min: 80, color: 'green', label: 'Proficient' },
  developing: { min: 50, color: 'yellow', label: 'Developing' },
  emerging: { min: 0, color: 'red', label: 'Emerging' }
};

function calculateLevel(percentage: number): string {
  if (percentage >= 80) return 'proficient';
  if (percentage >= 50) return 'developing';
  return 'emerging';
}

function calculateOverall(results: SkillResult[]): OverallResult {
  const totalCorrect = results.reduce((sum, r) => sum + r.correct_count, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.total_count, 0);
  const percentage = (totalCorrect / totalPossible) * 100;
  
  return {
    total_score: totalCorrect,
    total_possible: totalPossible,
    overall_percentage: percentage,
    overall_level: calculateLevel(percentage)
  };
}
```

---

## SUCCESS CRITERIA

### For Children
- [ ] Can tap their name and start test without adult help
- [ ] Completes all 7 skills in under 15 minutes
- [ ] Never sees a "failure" message
- [ ] Ends with celebration

### For Teachers
- [ ] Can see all children's results at a glance
- [ ] Can identify which skills need focus per child
- [ ] Can compare across class
- [ ] Can export results

### Technical
- [ ] Works offline after initial load (PWA)
- [ ] Handles interruptions gracefully (can resume)
- [ ] Fast load times on tablet
- [ ] No data loss

---

## NEXT SESSION INSTRUCTIONS

1. **Start with database** - Run migration 034
2. **Build API routes** - Sessions and results
3. **Add testMode to ONE game first** - Letter Match as prototype
4. **Build child flow** - Name selection → test → celebration
5. **Build admin dashboard** - Overview and detail views
6. **Add remaining games** - One by one with testMode
7. **Polish and test**

**Estimated Total Time: 2-3 days of focused work**

---

*Created: January 12, 2026*
*Priority: #1*
*Status: PLAN COMPLETE - Ready for Implementation*
