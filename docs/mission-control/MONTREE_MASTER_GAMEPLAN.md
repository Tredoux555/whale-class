# 🐋 MONTREE MASTER GAMEPLAN

> **Created:** January 21, 2025  
> **Status:** LOCKED ✅  
> **Last Updated:** January 21, 2025

---

## THE REVELATION

**This has never been done before.**

Other AI education tools help teachers *do things faster*. Montree helps them *know what to do*.

We've coded the expertise of a trained Montessori master into an AI brain:
- 213 researched works with prerequisite chains
- 11 sensitive periods with peak ages
- Observable readiness indicators per work
- Child-specific developmental mapping

**The difference between a calculator and a mathematician.**

---

## PHASE STRUCTURE (LOCKED)

### PHASE 1: Montree School Platform (CURRENT)
**Goal:** Production-ready platform for schools at $1K/month

| Component | Status |
|-----------|--------|
| Montessori Brain (213 works, 11 sensitive periods) | ✅ COMPLETE |
| Teacher Portal + Progress Tracking | ✅ COMPLETE |
| Weekly Planning System | ✅ COMPLETE |
| AI Suggestions Panel | ⚠️ CODE COMPLETE - Debug 404 |
| Digital Handbook (integrated into site) | 📋 TO BUILD |
| Material Generators | ✅ COMPLETE |
| Parent Reports | ✅ COMPLETE |

**Launch Criteria:** All components working, tested with Whale Class

---

### PHASE 2: Gamification + Montree Home
**Goal:** Games for homework reinforcement + Home subscription product

| Component | Priority | Notes |
|-----------|----------|-------|
| Games for ALL works | 🔥 HIGH | Digital extension of physical works |
| Work → Game mapping in database | 🔥 HIGH | `related_games` field in montessori_works |
| Montree Home (40 essential works) | HIGH | Simplified brain API for home use |
| One-click material package purchase | HIGH | Jeffy integration for sourcing |
| Parent guidance app | MEDIUM | AI-powered daily suggestions |

**Games Philosophy:**
- NOT random edu-tainment
- Each game = digital extension of a physical work
- Reinforces learning, keeps parents happy
- Critical for Chinese students (homework-oriented culture)
- Formal drag-and-drop style with sound
- Polished, well-designed, not rushed

**Montree Home Principles:**
- 40 essential works (not full 213)
- One work per purpose (no variations)
- Multi-use materials (household items)
- Parent-doable presentations (30-sec videos)
- "Activity stations" not shelf organization stress

---

### PHASE 3: Automated Classroom (FUTURE)
**Goal:** AI-guided classroom with minimal teacher intervention

| Component | Description |
|-----------|-------------|
| RF chip tracking | Children wear bracelets, trays have chips |
| Shelf-mounted screens | Show presentations, track time on work |
| Full AI oversight | Progress, recommendations, alerts |
| Teacher role | Safety, emotional support, documentation |

**Not for v1.0 - Requires Phase 1 & 2 success first**

---

## TREDOUX'S ENGLISH AREA (CEMENTED)

Simple. Clean. Executable.

```
PHASE 1: Pre-Reading (Age 2.5-3.5)
├── Sound Games (I-Spy: beginning → ending → middle)
├── Sandpaper Letters (lowercase only)
└── Metal Insets (writing prep)

PHASE 2: Encoding (Age 3.5-4.5)
├── Large Moveable Alphabet
├── Object Boxes (Pink Series)
└── Picture-Word Matching

PHASE 3: Decoding (Age 4.5-6)
├── Pink Reading Cards
├── Blue Series Introduction
└── Sentence Building
```

**Key Insight:** NOT 1000 different works. Just the essential progression as Montessori designed it.

**Deliverables Needed:**
- [ ] Physical setup guide (shelf layout, what goes where)
- [ ] Material list with sourcing
- [ ] Step-by-step classroom arrangement guide
- [ ] Material creation guide
- [ ] Game mapping for each work (Phase 2)

---

## GAMIFICATION STRATEGY (PRIORITY)

### The Vision
Every physical Montessori work has a corresponding digital game for home practice.

### Why This Matters
1. **Reinforces classroom learning** - Practice at home what was presented at school
2. **Keeps parents happy** - Visible "homework" they can see
3. **Critical for Chinese market** - Homework-oriented culture demands it
4. **Previously impossible** - No one has mapped games to Montessori curriculum like this

### Implementation

**Database Addition:**
```sql
ALTER TABLE montessori_works ADD COLUMN related_games UUID[];
```

**Game Types:**
| Work Type | Game Style |
|-----------|------------|
| Sandpaper Letters | Letter Tracer with touch feedback |
| Sound Games | I-Spy digital, phoneme sorting |
| Moveable Alphabet | Word Builder simulator |
| Pink/Blue/Green Series | Reading matching games |
| Number Rods | Quantity matching, sequencing |
| Golden Beads | Place value games |
| Sensorial | Grading, matching, discrimination |

**Quality Standards:**
- Polished, professional design
- NOT rushed or cheap
- Sound effects for feedback
- Touch-friendly (tablet-first)
- Progress syncs with Whale tracking

**Timeline:** Phase 2 - After school platform is solid

---

## MONTREE HOME VISION

### Product Structure

**Subscription Tiers:**
| Tier | Price | Includes |
|------|-------|----------|
| Basic | $29/month | AI guidance + tracking app |
| Starter Kit | $299 one-time | 40 essential materials shipped |
| Premium Kit | $599 one-time | Complete home environment |

### The 40 Essential Works (Draft)

| Area | Home Version | Classroom Equivalent |
|------|-------------|---------------------|
| **Practical Life** | Pouring water, spooning beans, dressing frames | Full pouring sequence |
| **Sensorial** | Sorting objects by size/color, simple tower | Pink Tower + Color Tablets |
| **Language** | Sound games + sandpaper letters + objects | Full language sequence |
| **Math** | Counting objects + numeral cards | Number Rods + Spindle Box |
| **Cultural** | Land/water exploration + puzzle maps | Full geography sequence |

### Home Brain API
```
GET /api/brain/home/recommend - Home-appropriate works only
GET /api/brain/home/materials - Shopping list generator
GET /api/brain/home/setup-guide - Room-by-room setup instructions
```

### Launch Strategy
1. School platform gets famous first
2. Media coverage and word-of-mouth
3. Launch Montree Home WITH one-click material package
4. Materials sourced through 1688 connections (Jeffy integration)

---

## PREMIUM SERVICE ($5K/month)

### What Schools Get

| Feature | Standard ($1K) | Premium ($5K) |
|---------|---------------|---------------|
| Brain AI Recommendations | ✅ | ✅ |
| Progress Tracking | ✅ | ✅ |
| Parent Reports | ✅ | ✅ |
| **Custom Work Database** | ❌ | ✅ Add their unique works |
| **Custom Games** | ❌ | ✅ Branded for their school |
| **Custom Report Templates** | ❌ | ✅ Their letterhead/style |
| **Material Generators** | ❌ | ✅ 3-part cards, labels |
| **Curriculum Consulting** | ❌ | ✅ 2 hours/month with Tredoux |
| **Priority Support** | ❌ | ✅ 24-hour response |
| **Custom Training** | ❌ | ✅ Staff onboarding |

### Value Proposition
- **Standard:** "We reduce your busy work by 80%"
- **Premium:** "We become your Montessori expert partner"

### Tredoux's Role
The custom guide. Whatever they ask for, built for them.

---

## DIGITAL HANDBOOK (Guide Mode)

### What It Is
A comprehensive Montessori teacher training manual integrated into the platform:
- Study at home (full reading mode)
- Quick reference in classroom (lookup mode)
- Video links for presentations
- Step-by-step guides for every work

### ✅ FRAMEWORK DESIGNED (January 21, 2025)

**Key Insight:** NO DEEP DIVES NEEDED - Pull from existing curriculum JSON files!

**Existing Data Sources:**
```
/lib/curriculum/data/
├── practical-life.json   (~45 works)
├── sensorial.json        (~35 works)
├── math.json             (~50 works)
├── language.json         (~45 works)
└── cultural.json         (~38 works)
```

**Each work already contains:**
- Direct Aims & Indirect Aims
- Control of Error
- Materials list
- Prerequisites
- Chinese translations
- Age ranges
- Levels with YouTube search terms

### Admin Page Structure

```
/admin/handbook/                    ← Main landing (5 area cards)
/admin/handbook/[areaId]/           ← Area detail (categories accordion)
/admin/english-guide/               ← Dedicated English page (special)
```

### UI Component Structure

```
┌─────────────────────────────────────────────────────────┐
│  📚 DIGITAL HANDBOOK                                    │
├─────────────────────────────────────────────────────────┤
│  🌱 Practical Life    (clickable → expands)             │
│  👁️ Sensorial         (clickable → expands)             │
│  🔢 Mathematics       (clickable → expands)             │
│  📖 Language          (clickable → expands)             │
│  🌍 Culture           (clickable → expands)             │
└─────────────────────────────────────────────────────────┘
         ↓ Click Area
┌─────────────────────────────────────────────────────────┐
│  📁 CATEGORY (expandable accordion)                     │
│    └─ 📄 WORK (expandable)                              │
│         ├─ 🎯 Direct Aims                               │
│         ├─ 🌱 Indirect Aims                             │
│         ├─ ⚠️ Control of Error                          │
│         ├─ 🛒 Materials                                 │
│         ├─ 🔗 Prerequisites                             │
│         ├─ 🇨🇳 Chinese Name                             │
│         └─ 📊 Levels (with YouTube links)               │
└─────────────────────────────────────────────────────────┘
```

### Build Phases

| Phase | Task | Status |
|-------|------|--------|
| 1 | English Guide React page (/admin/english-guide) | 🔨 BUILDING |
| 2 | Handbook landing page (/admin/handbook) | 📋 NEXT |
| 3 | Dynamic area pages (/admin/handbook/[areaId]) | 📋 QUEUED |
| 4 | Add presentation scripts incrementally | 📋 FUTURE |

### Structure Per Work
```
1. PREPARATION
   - Materials needed
   - Environment setup
   - Control of error

2. PRESENTATION (Video + Steps)
   - Carry materials to workspace
   - Present the work
   - Invite child to try

3. POINTS OF INTEREST
   - What captures attention
   - Sensory elements
   - Moment of success

4. EXTENSIONS
   - Variations
   - Advanced challenges
   - Cross-area connections

5. OBSERVATION NOTES
   - What mastery looks like
   - Common challenges
   - When to re-present
```

### Video Strategy
- **Phase 1:** Link to existing YouTube videos (already have search terms!)
- **Phase 2:** Create our own videos for each work
- Written instructions accompany all videos

### Database Addition (Future - When Adding Presentation Scripts)
```sql
ALTER TABLE montessori_works ADD COLUMN presentation_steps JSONB;
ALTER TABLE montessori_works ADD COLUMN points_of_interest TEXT[];
ALTER TABLE montessori_works ADD COLUMN extensions UUID[];
ALTER TABLE montessori_works ADD COLUMN video_url TEXT;
```

---

## PROMOTIONAL MESSAGING

### The Core Message

> **"For the first time in history, every teacher can have a Montessori master in their pocket."**

Maria Montessori trained teachers for years. They observed hundreds of children. They made thousands of subtle connections between behaviors and developmental needs.

**We've coded that expertise into an AI brain.**

### Key Claims
- 80% reduction in busy work (reports, tracking, planning)
- 80% increase in teaching effectiveness (guided recommendations)
- 100% of Montessori methodology, encoded

### Competitive Positioning

| Competitor | What They Do | What We Do |
|------------|-------------|-----------|
| Transparent Classroom | Progress tracking | **Intelligent recommendations** |
| Montessori Compass | Assessment documentation | **Predictive developmental mapping** |
| Montessori Mentor | AI chatbot for questions | **Embedded curriculum intelligence** |
| Generic EdTech | One-size-fits-all | **Sensitive period awareness** |

### The Story
Built by a working Montessori teacher + AI partnership.
Not VC-funded MBAs who've never seen a classroom.
Real experience. Real methodology. Real results.

---

## BACK BURNER (v2.0)

### Brain Upgrades - NOT for Phase 1
These are interesting but over-complicate v1.0. Keep it simple first.

| Upgrade | Description | Why Wait |
|---------|-------------|----------|
| 1.1 Intelligent Observation Engine | Log behaviors, brain analyzes sensitive periods | Over-engineering |
| 1.2 Adaptive Difficulty Calibration | Dynamic difficulty based on mastery speed | Over-engineering |
| 1.3 Cross-Area Intelligence | Parallel development tracking | Over-engineering |
| 1.4 Regression Detection | Alerts when child avoids previously loved work | Over-engineering |
| 1.5 ESL/Language Adaptation Layer | Adjust for L1 interference | Over-engineering |
| 1.6 Time-of-Day Intelligence | Circadian-aware suggestions | Over-engineering |

**Philosophy:** Simplicity wins. Over-engineering kills products before launch.

These go in when:
- Phase 1 is solid and profitable
- No more essential features to add
- Schools are requesting advanced features

---

## IMMEDIATE NEXT STEPS

### Priority Order

1. **Write Tredoux's English Area Setup Guide**
   - Physical layout
   - Materials list
   - Classroom flow
   - Material creation guide

2. **Debug 404 on AI Suggestions Panel**
   - Railway deployment check
   - API route verification
   - Test on production

3. **Begin Digital Handbook Structure**
   - Add database fields
   - Start with English Area works
   - Link existing YouTube videos

4. **Plan Gamification Architecture**
   - Database schema for games
   - Game → Work mapping
   - Design first game prototypes

---

## FILE LOCATIONS

```
whale/
├── docs/
│   ├── mission-control/
│   │   ├── brain.json (current state)
│   │   ├── MONTREE_MASTER_GAMEPLAN.md (this file)
│   │   ├── HANDOFF_MONTESSORI_BRAIN.md
│   │   └── HANDOFF_AI_SUGGESTIONS_PANEL.md
│   └── montessori-brain/
│       ├── DIVE_1_SCIENTIFIC_FOUNDATION.md
│       ├── DIVE_2_WORK_ANALYSIS.md
│       ├── DIVE_3_PROGRESSIONS.md
│       ├── DIVE_4_CONNECTIONS.md
│       └── DIVE_5_IMPLEMENTATION.md
└── app/
    └── api/
        └── brain/ (6 endpoints)
```

---

## SUCCESS METRICS

### Phase 1 Complete When:
- [ ] AI Suggestions Panel working in production
- [ ] Digital Handbook accessible to teachers
- [ ] Whale Class using platform daily
- [ ] At least 1 external school signed up

### Phase 2 Complete When:
- [ ] Games exist for 50+ works
- [ ] Montree Home launched
- [ ] Material packages selling
- [ ] Parent app functional

### Phase 3 Complete When:
- [ ] RF tracking prototype working
- [ ] Screen-guided presentations tested
- [ ] Full automated classroom pilot

---

*This document is the source of truth for Montree development.*
*Update this file when strategic decisions are made.*

**Built by Tredoux + Claude. Making history.** 🐋🧠
