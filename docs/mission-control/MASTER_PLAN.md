# 🏔️ WHALE MASTER PLAN
## The Grand Unification - A Masterpiece in the Making

**Version:** 2.0 - The Unification Era  
**Created:** January 12, 2026  
**Authors:** Claude & Tredoux (Mission Partners)  
**Purpose:** Build something exceptional for thousands of teachers and schools

---

## 🌟 THE VISION

> "One child, one journey - visible to everyone who matters."

When a teacher at Beijing International School taps "Presented" on "Sandpaper Letters" at 9:00 AM, a mother in her office across the city sees at 9:01 AM:

```
📱 Montree Home

Good morning, Sarah! ☀️

━━━━━━━━━━━━━━━━━━━━━━
TODAY AT SCHOOL
━━━━━━━━━━━━━━━━━━━━━━

Amy learned something new! 🎉

📖 Sandpaper Letters (Letter 'm')
   Status: Presented today by Teacher T

━━━━━━━━━━━━━━━━━━━━━━
PRACTICE AT HOME
━━━━━━━━━━━━━━━━━━━━━━

🎮 Letter Tracer
   Practice writing 'm' with your finger
   [Play Now →]

🎮 Letter Sounds  
   Hear the 'm' sound with pictures
   [Play Now →]

━━━━━━━━━━━━━━━━━━━━━━

Amy has mastered 23 works this term! 🌟
```

**This is what we're building together.**

---

## 🤝 OUR PARTNERSHIP

This is not Claude building for Tredoux.  
This is not Tredoux directing Claude.  

**This is two minds creating something neither could alone.**

- **Tredoux** brings: Vision, educational expertise, user understanding, the WHY
- **Claude** brings: Technical architecture, implementation, the HOW
- **Together** we create: A masterpiece used by thousands

### Our Commitments
1. We think deeply before we build
2. We build for excellence, not just "working"
3. We checkpoint constantly to never lose progress
4. We course-correct when we find better paths
5. We celebrate the wins together

---

## 🧠 WORKING PROTOCOL

### The 5-Minute Rule
```
⏰ Every 5 minutes of work → Update PROGRESS section below
📍 Every chunk complete → Git commit with clear message  
🧪 Every feature built → Test before moving on
💡 Every great idea → Just do it (then document)
🔄 Every course correction → Update the plan
```

### Session Start Ritual
```
1. Read this MASTER_PLAN.md first
2. Check PROGRESS section for current state
3. Identify current chunk
4. Work with full focus
5. Checkpoint every 5 minutes
```

### Session End Ritual
```
1. Update PROGRESS section
2. Git commit all changes
3. Note any new ideas or course corrections
4. Update memory if needed
```

---

## 📐 THE ARCHITECTURE

### The Problem We're Solving

Currently, Whale has TWO SEPARATE WORLDS:

```
┌─────────────────┐         ┌─────────────────┐
│  TEACHER WORLD  │   🚫    │  PARENT WORLD   │
├─────────────────┤ BROKEN  ├─────────────────┤
│ children        │         │ home_children   │
│ child_work_     │ NO SYNC │ home_child_     │
│   progress      │         │   progress      │
│ curriculum_     │         │ home_curriculum_│
│   roadmap       │         │   master        │
└─────────────────┘         └─────────────────┘
```

Teachers update progress. Parents see NOTHING.

### The Solution: Single Source of Truth

```
┌──────────────────────────────────────────────────────────┐
│                  UNIFIED WHALE SYSTEM                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐ │
│   │  children   │   │  families    │   │  curriculum_ │ │
│   │             │   │              │   │   roadmap    │ │
│   │ + family_id │◄──│ - id         │   │              │ │
│   │ + class_id  │   │ - email      │   │ (342 works)  │ │
│   └──────┬──────┘   │ - name       │   └──────┬───────┘ │
│          │          └──────────────┘          │         │
│          │                                    │         │
│          ▼                                    ▼         │
│   ┌────────────────────────────────────────────────┐   │
│   │           child_work_progress                   │   │
│   │                                                 │   │
│   │  - child_id       (FK → children)              │   │
│   │  - work_id        (FK → curriculum_roadmap)    │   │
│   │  - status         (0=none, 1=presented,        │   │
│   │                    2=practicing, 3=mastered)   │   │
│   │  - updated_by     ('teacher' or 'parent')      │   │
│   │  - presented_date                              │   │
│   │  - practicing_date                             │   │
│   │  - mastered_date                               │   │
│   │  - updated_at                                  │   │
│   └────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│   ┌────────────────────────────────────────────────┐   │
│   │         game_curriculum_mapping                 │   │
│   │                                                 │   │
│   │  - game_id         (e.g., 'letter-tracer')     │   │
│   │  - game_name       (e.g., 'Letter Tracer')     │   │
│   │  - game_url        (e.g., '/games/letter-tracer')│  │
│   │  - game_icon       (e.g., '✏️')                 │   │
│   │  - work_id         (FK → curriculum_roadmap)   │   │
│   │  - relevance       (1-10, higher = better match)│  │
│   │  - area            ('language' for games)      │   │
│   └────────────────────────────────────────────────┘   │
│                                                         │
│          │              │              │                │
│          ▼              ▼              ▼                │
│    ┌──────────┐  ┌───────────┐  ┌────────────┐        │
│    │ TEACHER  │  │  PARENT   │  │   GAMES    │        │
│    │  writes  │  │   reads   │  │  suggested │        │
│    │ progress │  │ + plays   │  │ by mapping │        │
│    └──────────┘  └───────────┘  └────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### How Data Flows

```
1. TEACHER at school opens /teacher/progress
2. TEACHER selects Amy, taps "Sandpaper Letters"
3. TEACHER taps "Presented" → writes to child_work_progress
4. SYSTEM looks up game_curriculum_mapping for work_id
5. SYSTEM finds: letter-tracer (relevance 9), letter-sounds (relevance 7)
   
6. PARENT opens /parent/home on phone
7. PARENT sees "Today at School: Sandpaper Letters - Presented"
8. PARENT sees "Play at Home: Letter Tracer, Letter Sounds"
9. PARENT taps game, child plays
10. (Future: track game plays, show to teacher)
```

---

## 🎮 GAME-TO-CURRICULUM MAPPING

### The 12 Games and Their Curriculum Links

| Game | ID | Maps to Curriculum Works | Area |
|------|-----|-------------------------|------|
| Letter Sounds | `letter-sounds` | Sandpaper Letters, Letter Sounds | Language |
| Beginning Sounds | `beginning-sounds` | I Spy Beginning, Sound Games | Language |
| Middle Sounds | `middle-sounds` | I Spy Middle, Vowel Sounds | Language |
| Ending Sounds | `ending-sounds` | I Spy Ending, Sound Games | Language |
| Combined I-Spy | `combined-i-spy` | Sound Games Mastery | Language |
| Letter Match | `letter-match` | Letter Recognition, Matching | Language |
| Letter Tracer | `letter-tracer` | Sandpaper Letters, Handwriting | Language |
| Word Builder | `word-builder` | Moveable Alphabet, Pink Series | Language |
| Vocabulary Builder | `vocabulary-builder` | Object Boxes, Classified Cards | Language |
| Grammar Symbols | `grammar-symbols` | Grammar Introduction | Language |
| Sentence Builder | `sentence-builder` | Sentence Building | Language |
| Sentence Match | `sentence-match` | Sentence Reading | Language |

### Smart Recommendation Logic

When a Language work is updated:
1. Find all games where work_id matches OR category matches
2. Sort by relevance score (highest first)
3. Return top 2-3 games
4. Only suggest games where child hasn't mastered the work yet

---

## 📦 WORK PHASES & CHUNKS

### PHASE 1: DATABASE UNIFICATION 🗄️
**Goal:** Single source of truth for all data  
**Estimated:** 1.5 hours

| Chunk | Task | Est. | Status |
|-------|------|------|--------|
| 1.1 | Audit current table structures | 15m | ⬜ |
| 1.2 | Create migration SQL (extend children, create families) | 20m | ⬜ |
| 1.3 | Create game_curriculum_mapping table | 10m | ⬜ |
| 1.4 | Seed game-to-curriculum mappings (all Language) | 30m | ⬜ |
| 1.5 | Test database changes locally | 15m | ⬜ |
| 1.6 | Apply to production (Supabase) | 10m | ⬜ |

**Checkpoint:** Tables unified, game mappings exist

---

### PHASE 2: API UNIFICATION 🔌
**Goal:** Parent APIs read from teacher tables  
**Estimated:** 2 hours

| Chunk | Task | Est. | Status |
|-------|------|------|--------|
| 2.1 | Create /api/unified/family endpoint | 20m | ⬜ |
| 2.2 | Create /api/unified/child-progress endpoint | 25m | ⬜ |
| 2.3 | Create /api/unified/game-recommendations endpoint | 25m | ⬜ |
| 2.4 | Create /api/unified/school-updates endpoint | 20m | ⬜ |
| 2.5 | Test all endpoints with real data | 20m | ⬜ |

**Checkpoint:** APIs return unified data + game recs

---

### PHASE 3: PARENT UI ENHANCEMENT 📱
**Goal:** Beautiful, informative parent experience  
**Estimated:** 2 hours

| Chunk | Task | Est. | Status |
|-------|------|------|--------|
| 3.1 | Redesign child page with "Today at School" section | 30m | ⬜ |
| 3.2 | Add game recommendation cards with Play buttons | 25m | ⬜ |
| 3.3 | Add progress sync indicators | 15m | ⬜ |
| 3.4 | Polish animations and loading states | 20m | ⬜ |
| 3.5 | Mobile-responsive testing | 15m | ⬜ |
| 3.6 | End-to-end parent flow test | 15m | ⬜ |

**Checkpoint:** Parents see teacher updates + game recommendations

---

### PHASE 4: TEACHER UI ENHANCEMENTS 👩‍🏫
**Goal:** Teacher sees their updates flow to parents  
**Estimated:** 1 hour

| Chunk | Task | Est. | Status |
|-------|------|------|--------|
| 4.1 | Add family assignment UI for children | 20m | ⬜ |
| 4.2 | Add "Shared with parents ✓" indicator | 15m | ⬜ |
| 4.3 | Show which games will be recommended | 15m | ⬜ |
| 4.4 | Test teacher→parent flow | 10m | ⬜ |

**Checkpoint:** Teacher confident updates reach parents

---

### PHASE 5: INTEGRATION & TESTING 🧪
**Goal:** Everything works flawlessly together  
**Estimated:** 1 hour

| Chunk | Task | Est. | Status |
|-------|------|------|--------|
| 5.1 | Create test scenario document | 15m | ⬜ |
| 5.2 | Test: Teacher updates → Parent sees (5 scenarios) | 15m | ⬜ |
| 5.3 | Test: Multiple children per family | 10m | ⬜ |
| 5.4 | Test: Game recommendations accuracy | 10m | ⬜ |
| 5.5 | Production deployment and verification | 10m | ⬜ |

**Checkpoint:** All integration tests pass

---

### PHASE 6: POLISH & DOCUMENTATION 📚
**Goal:** Professional, monetization-ready  
**Estimated:** 1.5 hours

| Chunk | Task | Est. | Status |
|-------|------|------|--------|
| 6.1 | API documentation | 20m | ⬜ |
| 6.2 | User guides (Teacher, Parent, Principal) | 30m | ⬜ |
| 6.3 | Clean up deprecated home_* tables | 15m | ⬜ |
| 6.4 | Code cleanup and comments | 20m | ⬜ |
| 6.5 | Update README with new architecture | 10m | ⬜ |

**Checkpoint:** MASTERPIECE COMPLETE 🎉

---

## 📊 PROGRESS TRACKER

### Current Session
- **Phase:** 1 - Database Unification
- **Chunk:** 1.1 - Audit current tables
- **Started:** Jan 12, 2026, ~evening
- **Last Checkpoint:** Plan created

### Overall Progress
| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Database | 🟡 In Progress | Jan 12 | |
| 2. APIs | ⬜ Not Started | | |
| 3. Parent UI | ⬜ Not Started | | |
| 4. Teacher UI | ⬜ Not Started | | |
| 5. Testing | ⬜ Not Started | | |
| 6. Polish | ⬜ Not Started | | |

### Session Log
```
Jan 12, 2026 - Session 9
- [x] Deep dive audit completed
- [x] Discovered two separate databases (critical issue)
- [x] Discovered no game mapping (critical issue)
- [x] Created UNIFICATION_MASTERPLAN.md
- [x] Updated MASTER_PLAN.md to grand unified plan
- [x] Updated Claude's memory
- [ ] Starting Phase 1...
```

---

## 💡 IDEAS & COURSE CORRECTIONS

### Excellent Ideas to Implement
*(Add ideas here as they come up)*

1. **Notification system** - Push notifications when teacher updates
2. **Game progress tracking** - Show teacher how games help
3. **Principal dashboard** - Family engagement metrics
4. **Weekly digest email** - Summary for busy parents

### Course Corrections Made
*(Document when we change direction)*

1. *None yet*

---

## ✅ SUCCESS CRITERIA

When we're done, ALL of these must be true:

| Criterion | Target | Status |
|-----------|--------|--------|
| Teacher updates → Parent sees in <30 sec | ✅ | ⬜ |
| Language works → Game recommendations appear | ✅ | ⬜ |
| One database for all data | ✅ | ⬜ |
| Parent UX is delightful | ✅ | ⬜ |
| Teacher has zero extra work | ✅ | ⬜ |
| Works on mobile/tablet | ✅ | ⬜ |
| Production stable | ✅ | ⬜ |
| Code is clean & documented | ✅ | ⬜ |

---

## 🎯 DESIGN PRINCIPLES

1. **Single Source of Truth** - One table for each concept
2. **Write Once, Read Many** - Teacher writes, everyone reads
3. **Progressive Disclosure** - Simple surface, depth on demand
4. **Instant Feedback** - Updates visible immediately
5. **Intelligent Recommendations** - Right game at right time
6. **Mobile First** - Designed for phones and tablets
7. **Graceful Degradation** - Works even if parts fail
8. **Beautiful Defaults** - Looks great without configuration

---

## 🚀 LET'S BUILD THIS MASTERPIECE

**Next Action:** Phase 1, Chunk 1.1 - Audit existing database tables

We're going to create something exceptional. Something that will be used by thousands of teachers and schools. Something that makes education better.

Let's go.

---

*"Simplicity is the ultimate sophistication." - Leonardo da Vinci*

*"The details are not the details. They make the design." - Charles Eames*

*"Make it work, make it right, make it fast." - Kent Beck*
