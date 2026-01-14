# Game Progress Tracking Integration Plan
## Created: January 14, 2026
## Purpose: Link games to teacher UI with progress tracking

---

## 🎯 OBJECTIVES

1. **Connect games to database** - Persist game progress (not just localStorage)
2. **Teacher visibility** - See student game sessions, time played, completion
3. **Number Writing Game** - New game for 0-9 number tracing
4. **Capital Letter Tracer** - New game for A-Z uppercase tracing
5. **Fix navigation flow** - Seamless student detail → classroom navigation

---

## 📊 CURRENT STATE ANALYSIS

### Existing Infrastructure
- `game_curriculum_mapping` table links games to curriculum works
- `/api/unified/games` POST endpoint exists but doesn't persist
- `LetterTraceGame.tsx` - Canvas tracing with stroke validation
- `letter-strokes.ts` - Stroke data for lowercase a-z
- Teacher progress page at `/teacher/progress`

### What's Missing
- `game_sessions` table for tracking game plays
- `student_game_progress` table for tracking mastery
- API endpoints for syncing progress
- Teacher UI for viewing game stats
- Number strokes data (0-9)
- Uppercase letter strokes (A-Z)

---

## 🗄️ DATABASE SCHEMA

### New Tables Required

```sql
-- Track individual game sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  items_completed INTEGER DEFAULT 0,
  items_total INTEGER DEFAULT 0,
  score INTEGER,
  level_reached INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_child ON game_sessions(child_id);
CREATE INDEX idx_game_sessions_game ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_date ON game_sessions(started_at);

-- Track overall progress per game per child
CREATE TABLE student_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  highest_level INTEGER DEFAULT 0,
  items_mastered JSONB DEFAULT '[]',
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, game_id)
);

CREATE INDEX idx_sgp_child ON student_game_progress(child_id);
CREATE INDEX idx_sgp_game ON student_game_progress(game_id);
```

---

## 📁 FILES TO CREATE

### 1. Database Migration
**File:** `/migrations/035_game_progress_tracking.sql`

### 2. Number Strokes Data  
**File:** `/lib/games/number-strokes.ts`
- Stroke paths for numbers 0-9
- Similar structure to letter-strokes.ts

### 3. Uppercase Letter Strokes
**File:** `/lib/games/uppercase-strokes.ts`
- Stroke paths for A-Z capitals
- Adjust coordinates for taller letterforms

### 4. Number Writing Game Component
**File:** `/components/games/NumberTraceGame.tsx`
- Based on LetterTraceGame.tsx
- Uses number-strokes.ts
- Numbers 0-9 with quantity images

### 5. Capital Letter Game Component
**File:** `/components/games/CapitalLetterTraceGame.tsx`
- Based on LetterTraceGame.tsx
- Uses uppercase-strokes.ts

### 6. Game Pages
**Files:**
- `/app/games/number-tracer/page.tsx`
- `/app/games/capital-letter-tracer/page.tsx`

### 7. Game Progress API
**File:** `/app/api/games/progress/route.ts`
- POST: Start/end session, update progress
- GET: Fetch student game progress

### 8. Teacher Game Progress Component
**File:** `/components/teacher/StudentGameProgress.tsx`
- Shows game sessions for selected student
- Time played, games played, items mastered

---

## 🎮 GAME UPDATES (app/games/page.tsx)

Add to READING_GAMES array:
```typescript
{ 
  id: 'number-tracer', 
  name: 'Number Tracer', 
  description: 'Practice writing numbers 0-9', 
  icon: '🔢', 
  route: '/games/number-tracer', 
  color: 'purple', 
  gradient: 'from-purple-500 to-pink-500',
  isNew: true 
},
{ 
  id: 'capital-letter-tracer', 
  name: 'Capital Letters', 
  description: 'Trace uppercase A-Z', 
  icon: '🔠', 
  route: '/games/capital-letter-tracer', 
  color: 'amber', 
  gradient: 'from-amber-500 to-orange-500',
  isNew: true 
},
```

---

## 🔧 GAME COMPONENT UPDATES

### Required Changes to Each Game

Every game component needs to:

1. **Accept optional childId prop** (from URL params or parent login)
2. **Call API on session start:**
```typescript
const startSession = async () => {
  if (!childId) return null;
  const res = await fetch('/api/games/progress', {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'start',
      childId, 
      gameId: 'letter-tracer',
      gameName: 'Letter Tracer'
    })
  });
  return (await res.json()).sessionId;
};
```

3. **Call API on progress updates:**
```typescript
const updateProgress = async (sessionId, data) => {
  await fetch('/api/games/progress', {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'update',
      sessionId,
      itemsCompleted: data.completed,
      score: data.score
    })
  });
};
```

4. **Call API on session end:**
```typescript
const endSession = async (sessionId) => {
  await fetch('/api/games/progress', {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'end',
      sessionId,
      itemsTotal: totalItems,
      levelReached: currentLevel
    })
  });
};
```

---

## 👩‍🏫 TEACHER UI ADDITIONS

### Update StudentDetailModal.tsx

Add "Game Activity" section showing:
- Recent game sessions
- Time spent per game
- Games with most progress
- Quick stats: Total time, Sessions today, Items mastered

### Add to Teacher Dashboard

New panel: "Today's Game Activity"
- Which students played games today
- Time spent
- Link to full progress view

---

## 🔄 NAVIGATION FIX

### Issue
Student detail modal → close → not returning to classroom view properly

### Solution
Update StudentDetailModal.tsx onClose handler:
```typescript
const handleClose = () => {
  onClose();
  // If we came from classroom, ensure we stay there
  if (window.location.pathname.includes('/classroom')) {
    // Already on classroom, just close modal
    return;
  }
  // Otherwise navigate back
  router.back();
};
```

Also add explicit "Back to Class" button in modal footer.

---

## 📋 IMPLEMENTATION ORDER

### Phase 1: Database & API (30 min)
1. Create migration 035_game_progress_tracking.sql
2. Create /api/games/progress/route.ts
3. Test with Postman/curl

### Phase 2: Number Tracing Game (45 min)
1. Create number-strokes.ts (0-9 stroke paths)
2. Create NumberTraceGame.tsx (copy from LetterTraceGame)
3. Create /app/games/number-tracer/page.tsx
4. Update games hub page

### Phase 3: Capital Letter Game (30 min)
1. Create uppercase-strokes.ts (A-Z stroke paths)
2. Create CapitalLetterTraceGame.tsx
3. Create /app/games/capital-letter-tracer/page.tsx
4. Update games hub page

### Phase 4: Game Integration (45 min)
1. Add session tracking to LetterTraceGame
2. Add session tracking to NumberTraceGame
3. Add session tracking to CapitalLetterTraceGame

### Phase 5: Teacher UI (30 min)
1. Create StudentGameProgress.tsx component
2. Add to StudentDetailModal
3. Fix navigation issues

---

## 📝 NUMBER DATA

```typescript
// Numbers 0-9 with quantity representations
const NUMBER_DATA = [
  { number: 0, word: 'zero', image: '⭕', quantity: 0 },
  { number: 1, word: 'one', image: '1️⃣', quantity: 1 },
  { number: 2, word: 'two', image: '2️⃣', quantity: 2 },
  { number: 3, word: 'three', image: '3️⃣', quantity: 3 },
  { number: 4, word: 'four', image: '4️⃣', quantity: 4 },
  { number: 5, word: 'five', image: '5️⃣', quantity: 5 },
  { number: 6, word: 'six', image: '6️⃣', quantity: 6 },
  { number: 7, word: 'seven', image: '7️⃣', quantity: 7 },
  { number: 8, word: 'eight', image: '8️⃣', quantity: 8 },
  { number: 9, word: 'nine', image: '9️⃣', quantity: 9 },
];
```

---

## ✅ SUCCESS CRITERIA

- [ ] Games persist progress to database
- [ ] Teacher can see which games students played
- [ ] Teacher can see time spent per student per game
- [ ] Number Tracer game works for 0-9
- [ ] Capital Letter Tracer works for A-Z
- [ ] Navigation from student detail flows seamlessly
- [ ] Games hub shows new games with "NEW" badge

---

## 🔧 AUDIT FIXES (Jan 14)

### Fix 1: Navigation - Progress page ignores `?child=` param
Add to `/app/teacher/progress/page.tsx`:
```typescript
// After children are loaded, check URL for pre-selected child
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const childParam = params.get('child');
  if (childParam && children.length > 0) {
    const child = children.find(c => c.id === childParam);
    if (child) setSelectedChild(child);
  }
}, [children]);
```

### Fix 2: Games need to read studentSession
Each game must check localStorage for logged-in student:
```typescript
const [childId, setChildId] = useState<string | null>(null);

useEffect(() => {
  const session = localStorage.getItem('studentSession');
  if (session) {
    const { childId } = JSON.parse(session);
    setChildId(childId);
  }
}, []);
```

### Fix 3: Explicit "Back to Classroom" button
Add to progress page when child is selected.

---

## 🚀 READY FOR CURSOR

This plan is complete. Next step: Generate the actual code files for Cursor to implement.
