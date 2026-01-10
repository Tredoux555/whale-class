# 🏔️ MONTREE UNIFICATION MASTERPLAN
## A Masterpiece of Synchronized Simplicity

**Created:** January 12, 2026  
**Author:** Claude (Mission Partner)  
**Vision:** One child, one journey - visible to everyone who matters

---

## 🎯 THE VISION

Imagine a parent opening Montree Home on their phone:

> "Good morning, Sarah! 🌅
> 
> **Today at school, Amy learned:**
> - 📖 Sandpaper Letters (Letter 'm') - *Presented today*
> - 🔢 Number Rods 1-5 - *Practicing*
> 
> **Recommended home activities:**
> - 🎮 Play **Letter Tracer** to practice writing 'm'
> - 🎮 Play **Letter Sounds** to hear the 'm' sound
> 
> Amy has mastered 23 works this term! 🌟"

This is what we're building. The teacher taps once at school. The parent sees it instantly at home. The games are suggested automatically. Magic to the user. Elegant engineering underneath.

---

## 🧠 WORKING PROTOCOL

### Checkpoint Discipline
```
⏰ Every 5 minutes    → Update this file's PROGRESS section
📍 Every chunk done   → Git commit with clear message
🧪 Every feature      → Test before moving on
📝 Every decision     → Document the "why"
```

### Session Structure
```
1. Read MASTERPLAN first
2. Check PROGRESS section for where we are
3. Work on current chunk
4. Checkpoint every 5 min
5. Commit when chunk complete
6. Update PROGRESS
7. Move to next chunk
```

---

## 📐 ARCHITECTURE DESIGN

### Current State (BROKEN)
```
┌─────────────────┐         ┌─────────────────┐
│  TEACHER WORLD  │         │  PARENT WORLD   │
├─────────────────┤         ├─────────────────┤
│ children        │   🚫    │ home_children   │
│ child_work_     │ NO SYNC │ home_child_     │
│   progress      │         │   progress      │
│ curriculum_     │         │ home_curriculum_│
│   roadmap       │         │   master        │
└─────────────────┘         └─────────────────┘
         │                           │
         ▼                           ▼
    Teacher sees              Parent sees
    their updates             NOTHING
```

### Target State (UNIFIED)
```
┌──────────────────────────────────────────────────────┐
│              SINGLE SOURCE OF TRUTH                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  children   │  │ curriculum_ │  │   families   │ │
│  │             │  │  roadmap    │  │              │ │
│  │ - family_id │  │             │  │ - email      │ │
│  │ - class_id  │  │ (342 works) │  │ - children[] │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┘ │
│         │                │                           │
│         ▼                ▼                           │
│  ┌────────────────────────────┐                     │
│  │    child_work_progress     │ ◄── SINGLE TABLE    │
│  │                            │                     │
│  │ - child_id                 │                     │
│  │ - work_id                  │                     │
│  │ - status (0-3)             │                     │
│  │ - updated_by (teacher/     │                     │
│  │              parent)       │                     │
│  │ - dates                    │                     │
│  └────────────────────────────┘                     │
│                │                                     │
│                ▼                                     │
│  ┌────────────────────────────┐                     │
│  │  game_curriculum_mapping   │ ◄── NEW TABLE       │
│  │                            │                     │
│  │ - game_id                  │                     │
│  │ - work_id                  │                     │
│  │ - relevance_score          │                     │
│  └────────────────────────────┘                     │
│                                                      │
└──────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
    ┌─────────┐         ┌──────────┐     ┌─────────┐
    │ TEACHER │         │  PARENT  │     │  GAMES  │
    │ writes  │         │  reads   │     │ linked  │
    │ progress│         │ + plays  │     │ to work │
    └─────────┘         └──────────┘     └─────────┘
```

---

## 🗂️ DATABASE UNIFICATION STRATEGY

### Decision: Extend Existing Tables (Not Replace)

**Why?** 
- Teacher system already has data
- 342 curriculum works already loaded
- Amy has demo progress
- Safer than rebuilding

### Step 1: Extend `children` table
```sql
-- Add family connection to existing children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE children ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4F46E5';
```

### Step 2: Create/Extend `families` table
```sql
-- Families table (may already exist partially)
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 3: Extend `child_work_progress` table
```sql
-- Add tracking for who made the update
ALTER TABLE child_work_progress ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'teacher';
ALTER TABLE child_work_progress ADD COLUMN IF NOT EXISTS notes TEXT;
```

### Step 4: Create Game Mapping Table
```sql
CREATE TABLE IF NOT EXISTS game_curriculum_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,           -- e.g., 'letter-tracer'
  game_name TEXT NOT NULL,         -- e.g., 'Letter Tracer'
  game_url TEXT NOT NULL,          -- e.g., '/games/letter-tracer'
  game_icon TEXT,                  -- e.g., '✏️'
  work_id UUID NOT NULL,           -- FK to curriculum_roadmap
  relevance INTEGER DEFAULT 5,     -- 1-10 (10 = perfect match)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, work_id)
);

CREATE INDEX idx_game_mapping_work ON game_curriculum_mapping(work_id);
CREATE INDEX idx_game_mapping_game ON game_curriculum_mapping(game_id);
```

### Step 5: Migrate Home Data (if any real data exists)
```sql
-- Check if home tables have real data that needs migrating
-- If so, create migration to merge into unified tables
-- Otherwise, deprecate home_* tables
```

---

## 🎮 GAME-TO-CURRICULUM MAPPING

### English/Language Area Games

| Game | Game ID | Curriculum Categories | Works to Map |
|------|---------|----------------------|--------------|
| Letter Sounds | `letter-sounds` | Phonemic Awareness, Letter Recognition | Sandpaper Letters, Letter Sounds |
| Beginning Sounds | `beginning-sounds` | Phonemic Awareness | I Spy Beginning Sounds |
| Middle Sounds | `middle-sounds` | Phonemic Awareness | I Spy Middle Sounds |
| Ending Sounds | `ending-sounds` | Phonemic Awareness | I Spy Ending Sounds |
| Combined I-Spy | `combined-i-spy` | Phonemic Awareness | Sound Games Mastery |
| Letter Match | `letter-match` | Letter Recognition | Sandpaper Letters, Letter Matching |
| Letter Tracer | `letter-tracer` | Handwriting | Sandpaper Letters, Metal Insets |
| Word Builder | `word-builder` | Word Building | Moveable Alphabet, Pink Series |
| Vocabulary Builder | `vocabulary-builder` | Vocabulary | Object Boxes, Classified Cards |
| Grammar Symbols | `grammar-symbols` | Grammar | Grammar Symbols Introduction |
| Sentence Builder | `sentence-builder` | Sentence Work | Sentence Building |
| Sentence Match | `sentence-match` | Reading Comprehension | Sentence Reading |

### Mapping Logic
```
When: Teacher marks Language work with status 1, 2, or 3
Then: System finds games where work_id matches
And:  Returns games sorted by relevance score
Show: Top 2-3 most relevant games to parent
```

---

## 📦 WORK CHUNKS

### PHASE 1: DATABASE UNIFICATION
**Goal:** Single source of truth for all data

| Chunk | Task | Est. Time | Dependencies |
|-------|------|-----------|--------------|
| 1.1 | Audit existing table structures | 15 min | None |
| 1.2 | Create migration SQL file | 20 min | 1.1 |
| 1.3 | Create game_curriculum_mapping table | 10 min | 1.2 |
| 1.4 | Seed game-to-curriculum mappings | 30 min | 1.3 |
| 1.5 | Test database changes locally | 15 min | 1.4 |
| 1.6 | Apply to production | 10 min | 1.5 |

**Checkpoint after Phase 1:** All tables unified, game mappings seeded

---

### PHASE 2: API UNIFICATION  
**Goal:** Parent APIs read from teacher tables

| Chunk | Task | Est. Time | Dependencies |
|-------|------|-----------|--------------|
| 2.1 | Create unified child lookup API | 20 min | Phase 1 |
| 2.2 | Update parent activities API to use curriculum_roadmap | 30 min | 2.1 |
| 2.3 | Add game recommendations to activities API | 25 min | 2.2 |
| 2.4 | Create "today's school updates" API | 20 min | 2.2 |
| 2.5 | Test all API endpoints | 20 min | 2.4 |

**Checkpoint after Phase 2:** APIs unified, game recommendations working

---

### PHASE 3: PARENT UI ENHANCEMENT
**Goal:** Beautiful, informative parent experience

| Chunk | Task | Est. Time | Dependencies |
|-------|------|-----------|--------------|
| 3.1 | Update parent child page to show school updates | 30 min | Phase 2 |
| 3.2 | Add game recommendation cards | 25 min | 3.1 |
| 3.3 | Add "What Amy learned today" section | 20 min | 3.2 |
| 3.4 | Polish UI/UX | 20 min | 3.3 |
| 3.5 | Test parent flow end-to-end | 15 min | 3.4 |

**Checkpoint after Phase 3:** Parent sees teacher updates + game recs

---

### PHASE 4: TEACHER UI POLISH
**Goal:** Ensure teacher updates flow to parents

| Chunk | Task | Est. Time | Dependencies |
|-------|------|-----------|--------------|
| 4.1 | Add "visible to parents" indicator | 15 min | Phase 3 |
| 4.2 | Add family assignment to children | 20 min | 4.1 |
| 4.3 | Test teacher→parent flow | 15 min | 4.2 |

**Checkpoint after Phase 4:** Complete teacher→parent sync

---

### PHASE 5: INTEGRATION TESTING
**Goal:** Everything works together flawlessly

| Chunk | Task | Est. Time | Dependencies |
|-------|------|-----------|--------------|
| 5.1 | Create test scenarios document | 15 min | Phase 4 |
| 5.2 | Test: Teacher updates → Parent sees | 10 min | 5.1 |
| 5.3 | Test: Parent plays game → Progress tracked | 15 min | 5.2 |
| 5.4 | Test: Multiple children per family | 10 min | 5.3 |
| 5.5 | Test: Production deployment | 15 min | 5.4 |

**Checkpoint after Phase 5:** Production-ready unified system

---

### PHASE 6: DOCUMENTATION & CLEANUP
**Goal:** Professional, maintainable codebase

| Chunk | Task | Est. Time | Dependencies |
|-------|------|-----------|--------------|
| 6.1 | Document API endpoints | 20 min | Phase 5 |
| 6.2 | Create user guide for each portal | 30 min | 6.1 |
| 6.3 | Deprecate/remove old home_* tables | 15 min | 6.2 |
| 6.4 | Final code cleanup | 20 min | 6.3 |
| 6.5 | Update README | 15 min | 6.4 |

**Checkpoint after Phase 6:** MASTERPIECE COMPLETE

---

## 📊 PROGRESS TRACKER

### Current Phase: NOT STARTED
### Current Chunk: ---
### Last Checkpoint: Initial plan created

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Database Unification | ⬜ Not Started | | |
| 2. API Unification | ⬜ Not Started | | |
| 3. Parent UI Enhancement | ⬜ Not Started | | |
| 4. Teacher UI Polish | ⬜ Not Started | | |
| 5. Integration Testing | ⬜ Not Started | | |
| 6. Documentation | ⬜ Not Started | | |

---

## 🔄 SESSION LOG

### Session 9 - Jan 12, 2026
- [x] Deep dive audit completed
- [x] Identified critical issues (two databases, no game mapping)
- [x] Created UNIFICATION_MASTERPLAN.md
- [ ] Begin Phase 1...

---

## 🎯 SUCCESS CRITERIA

When we're done, these must all be TRUE:

1. ✅ Teacher updates progress → Parent sees it within seconds
2. ✅ Language works → Show relevant game recommendations
3. ✅ One database → No duplicate/conflicting data
4. ✅ Parent UX → Simple, delightful, informative
5. ✅ Teacher UX → No extra work to share with parents
6. ✅ Principal UX → Can see family engagement
7. ✅ Games → Track when played from recommendations
8. ✅ Production → Stable, fast, reliable

---

## 💡 DESIGN PRINCIPLES

1. **Single Source of Truth** - One table for each concept
2. **Write Once, Read Many** - Teacher writes, everyone reads
3. **Progressive Disclosure** - Simple surface, depth on demand
4. **Instant Feedback** - Updates visible immediately
5. **Intelligent Recommendations** - Right game at right time
6. **Graceful Degradation** - Works even if parts fail
7. **Mobile First** - Designed for phones/tablets

---

## 🚀 READY TO BEGIN

**Next Action:** Start Phase 1, Chunk 1.1 - Audit existing table structures

**Command to begin:**
```
Read current database schema from Supabase
Document exact column names and types
Identify gaps vs target state
```

---

*"Simplicity is the ultimate sophistication." - Leonardo da Vinci*
