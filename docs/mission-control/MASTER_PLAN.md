# WHALE MASTER PLAN

## The Vision

Whale is not just a classroom tool. It's the education backbone for the Jeffy Schools mission.

**Every school funded by Jeffy Commerce will run on Whale.**

When a merit-selected student walks into a Jeffy School on Tredoux's family farm, their teacher uses Whale to:
- Track their Montessori progress
- Plan their week
- Report to their family
- Document their journey

This is the system that proves education done right.

---

## Current Reality (Jan 2026)

**1 school, 22 kids, Beijing International**

Tredoux uses this daily with his kindergarten class. Real usage, real feedback, real iteration.

---

## 🚨 PRIORITY TODO (Jan 9, 2026)

1. **FIX**: Daily Summary page API (activity_photos.uploaded_at column error)
2. **REBUILD**: Word audio files - one sound per day, verify each manually
3. **BUILD**: Curriculum-to-Games mapping system
4. **BUILD**: 3-part cards for each curriculum step  
5. **BUILD**: Parent game recommendation notifications

---

## 🎮 GAMES-CURRICULUM INTEGRATION (THE BIG VISION)

### The Flow
```
Teacher logs work → System maps to games → Parent gets notification → Child reviews at home
```

### How It Works

1. **Teacher records**: "Leo practiced S sounds today" (with photo)
2. **System looks up**: Activity X → Game Y (Phase Z)
3. **Parent receives**: "Leo learned S sounds! Play 'I Spy Beginning' (Phase 1) at home to practice"
4. **Child plays**: Game at home with parent
5. **Progress syncs**: Both classroom + home progress in one view

### Requirements

| Requirement | Description | Status |
|-------------|-------------|--------|
| Games match curriculum EXACTLY | Every game phase = curriculum step | 🔜 TO BUILD |
| 3-part cards for each step | Physical + digital materials match | 🔜 TO BUILD |
| Missing games built | If curriculum step has no game, build it | 🔜 TO BUILD |
| Parent notification system | Auto-push game recommendations | 🔜 TO BUILD |
| Progress tracking | Combined classroom + home view | 🔜 TO BUILD |

### Database Tables Needed

```sql
-- Maps curriculum activities to games
curriculum_game_mapping (
  activity_id UUID REFERENCES activities(id),
  game_type TEXT,  -- 'sound-games-beginning', 'sound-games-ending', etc
  game_phase TEXT, -- 'phase1', 'phase2', 'vowel', etc
  game_url TEXT
)

-- Tracks recommendations sent to parents
parent_game_recommendations (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES children(id),
  activity_id UUID,
  game_type TEXT,
  game_url TEXT,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- 3-part card materials for each activity
three_part_cards (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  word TEXT,
  image_url TEXT,
  audio_url TEXT,
  category TEXT
)
```

### English Curriculum → Game Mapping

The games MUST match the English Guide progression exactly:

| Curriculum Step | Game | Phase |
|-----------------|------|-------|
| Introduction to sounds | I Spy Beginning | 1 |
| Beginning sound isolation | I Spy Beginning | 1-3 |
| Ending sound isolation | I Spy Ending | 1-3 |
| Middle sound (vowels) | Middle Sound Match | vowel |
| Sound blending | Sound Blending | - |
| Sound segmenting | Sound Segmenting | - |
| Pink series reading | Pink Reading Games | - |
| Sight words | Sight Word Games | - |

---

## Sound Games Status (Jan 8, 2026)

### What Works
- ✅ Letter sounds (a-z) - Fresh recordings, properly split
- ✅ Game logic - Race conditions fixed
- ✅ Images on Supabase - All verified

### What's Broken  
- ❌ Word audio (245 files) - ALL mismatched/garbled
- ❌ Instruction audio - 11 seconds too long, disabled
- ❌ Phonemes (sh, ch, th) - Need verification

### Rebuild Plan: One Sound Per Day

**Why daily?** Bulk recording + splitting failed TWICE. Do it right.

**Daily Workflow:**
1. Pick ONE sound (start with S)
2. Record 6 words clearly with 2-sec gaps
3. Split carefully, VERIFY each file manually
4. Create 3-part cards PDF
5. Deploy and test in actual game
6. Mark complete, move to next

**Phase Order:**
```
Phase 1 (Easy):  s, m, f, n, p, t, c, h  (8 days)
Phase 2 (Medium): b, d, g, j, w, y       (6 days)
Phase 3 (Hard):  v, th, r, l, z, sh, ch  (7 days)
Vowels:          a, e, i, o, u           (5 days)
                                    TOTAL: 26 days
```

---

## Phase 1: Perfect for One (NOW)

- [x] Weekly planning
- [x] Classroom progress tracking  
- [x] Montree curriculum tree
- [x] Teacher tablet interface
- [x] Photo/video capture per child
- [x] Sound games (letters working, words rebuilding)
- [ ] Daily Summary view (API needs fix)
- [ ] Parent reports (AI-generated)
- [ ] Parent view portal
- [ ] Curriculum-game mapping
- [ ] Parent game notifications

---

## Phase 2: Scale to Four (Q1 2026)

4 school slots ready. No code changes needed, just data.

---

## Phase 3: Franchise Model (Future)

School slugs, admin hierarchy, centralized curriculum.

---

## Phase 4: Jeffy Schools Integration (Future)

Whale = official LMS for all Jeffy-funded schools.

---

## Design Principles

1. **Teacher-first** - If it doesn't help the teacher, delete it
2. **Works offline** - PWA support for bad wifi
3. **One tap** - Progress tracking = one tap
4. **Montessori native** - Not adapted from traditional ed-tech
5. **Games match curriculum** - Digital + physical materials identical

---

## Technical Philosophy

- Claude writes ALL code
- Cursor copies, never generates
- Supabase for data
- Railway for hosting
- Handoff files for continuity
- VERIFY before deploy (learned the hard way)

---

## The Long Game

When Jeffy Schools opens, students learn on a platform built by a teacher who used it himself.

That's the story. That's the mission.
