# English Games ↔ Curriculum Alignment Analysis
**Date:** January 9, 2026  
**Status:** ✅ COMPREHENSIVE ALIGNMENT VERIFIED

---

## Executive Summary

The games **DO mirror the English Guide** with excellent fidelity. The alignment follows the authentic Montessori AMI sequence, and the data structures are properly unified through `master-words.ts`. 

**Key Finding:** Games are well-structured for parent notification system integration.

---

## Side-by-Side: English Guide → Games Mapping

### Stage 1: Oral Language (Ages 2-3)
| Guide Skill | Game/Feature | Status |
|-------------|--------------|--------|
| 100+ word vocabulary | 3-Part Card Generator `/admin/card-generator` | ✅ Tool exists |
| Understands instructions | Circle Planner `/admin/circle-planner` | ✅ Tool exists |
| Names common objects | Vocabulary Flashcards `/admin/vocabulary-flashcards` | ✅ Tool exists |
| Participates in songs | Circle Planner | ✅ Tool exists |
| **PARENT GAME** | ❌ None yet | 🔶 **GAP: No direct game for vocab building at home** |

### Stage 2: Sound Games (Ages 3-4) ⭐ CRITICAL FOUNDATION
| Guide Skill | Game | Status |
|-------------|------|--------|
| Beginning sounds | `/games/sound-games/beginning` | ✅ **PERFECT MATCH** |
| Ending sounds | `/games/sound-games/ending` | ✅ **PERFECT MATCH** |
| Middle sounds | `/games/sound-games/middle` | ✅ **PERFECT MATCH** |
| Sound blending | `/games/sound-games/blending` | ✅ **PERFECT MATCH** |
| Sound segmenting | `/games/sound-games/segmenting` | ✅ **PERFECT MATCH** |

**Data Alignment:** `BEGINNING_SOUNDS` in `sound-games-data.ts` has:
- Phase 1 (Easy): s, m, f, n, p, t, c, h (8 sounds × 6 words = 48 words)
- Phase 2 (Medium): b, d, g, j, w, y (6 sounds × 6 words = 36 words)
- Phase 3 (Hard/ESL): v, th, r, l, z, sh, ch (7 sounds × 6 words = 42 words)
- Vowels: a, e, i, o, u (5 sounds × 6 words = 30 words)
- **TOTAL: 156 words for beginning sounds**

### Stage 3: Sandpaper Letters (Ages 4-5)
| Guide Skill | Game | Status |
|-------------|------|--------|
| Traces letters correctly | `/games/letter-tracer` | ✅ MATCH |
| Says sound after tracing | `/games/letter-sounds` | ✅ MATCH |
| Knows consonants | Letter Sounds (grouped progression) | ✅ MATCH |
| Knows vowels | Letter Sounds (GROUP_VOWELS first) | ✅ MATCH |
| Knows phonograms (sh, ch, th) | Green Series in game-data.ts | ✅ MATCH |

**Data Alignment:** `LETTER_GROUPS` in `game-data.ts`:
- GROUP_VOWELS: a, e, i, o, u (5 letters)
- GROUP_EASY: s, m, t, p, n (5 letters)
- GROUP_NEXT: c, r, d, g, b (5 letters)
- GROUP_MORE: h, l, f, j, k (5 letters)
- GROUP_ADVANCED: w, v, y, z, x, q (6 letters)

### Stage 4: Moveable Alphabet (Ages 4-5)
| Guide Skill | Game | Status |
|-------------|------|--------|
| Builds CVC words | `/games/word-builder` | ✅ **PERFECT MATCH** |
| Spells from objects | Word Builder with images | ✅ MATCH |
| Spells from pictures | Picture Match game | ✅ MATCH |
| Short phrases | Sentence Match | ✅ MATCH |
| Simple sentences | `/games/sentence-builder` | ✅ MATCH |

### Stage 5: Pink Series - CVC Reading (Ages 4-5)
| Guide Skill | Game | Status |
|-------------|------|--------|
| Short A words | Word Builder + Picture Match | ✅ 6 words |
| Short E words | Word Builder + Picture Match | ✅ 6 words |
| Short I words | Word Builder + Picture Match | ✅ 6 words |
| Short O words | Word Builder + Picture Match | ✅ 6 words |
| Short U words | Word Builder + Picture Match | ✅ 6 words |

**Data Alignment:** `MASTER_CVC_WORDS` - 30 total CVC words (6 per vowel):
```
Short A: cat, hat, bat, map, pan, bag
Short E: bed, pen, hen, net, leg, web
Short I: pig, pin, bin, lip, wig, fin
Short O: dog, pot, mop, box, fox, log
Short U: cup, bug, rug, sun, bus, nut
```

### Stage 6: Blue Series - Blends (Ages 5-6)
| Guide Skill | Game | Status |
|-------------|------|--------|
| Beginning blends (bl, cr, st) | Word Builder with `BLUE_SERIES` | ✅ 16 blends |
| Ending blends (nd, mp, lk) | Word Builder | ✅ Included |
| CCVC words | Word Builder progression | ✅ Included |
| CVCC words | Word Builder progression | ✅ Included |

**Data Alignment:** `BLUE_SERIES` - 16 blends × 3 words = 48 blend words:
```
bl, cl, fl, gl, pl, sl (L-blends)
br, cr, dr, fr, gr, tr (R-blends)
st, sp, sn, sw (S-blends)
```

### Stage 7: Green Series - Phonograms (Ages 5-6)
| Guide Skill | Game | Status |
|-------------|------|--------|
| ai/ay words | Word Builder with `GREEN_SERIES` | ✅ MATCH |
| ee/ea words | GREEN_SERIES | ✅ MATCH |
| oa/oo words | GREEN_SERIES | ✅ MATCH |
| sh/ch/th | GREEN_SERIES | ✅ MATCH |

**Data Alignment:** `GREEN_SERIES` - 9 phonograms × 3 words = 27 phonogram words

### Stage 8: Grammar (Ages 5-6)
| Guide Skill | Game | Status |
|-------------|------|--------|
| Simple sentences | `/games/sentence-builder` | ✅ MATCH |
| Sentence structure | `/games/sentence-match` | ✅ MATCH |
| Sight words | `/games/sight-flash` | ✅ 3 levels × 20 words |

---

## Comprehensive Word Count Summary

| Series | Source File | Word Count |
|--------|-------------|------------|
| Beginning Sounds | `sound-games-data.ts` | 156 words |
| Ending Sounds | `sound-games-data.ts` | 36 words |
| CVC (Middle Sounds) | `sound-games-data.ts` | 40 words |
| Pink Series (CVC) | `master-words.ts` | 30 words |
| Blue Series (Blends) | `game-data.ts` | 48 words |
| Green Series (Phonograms) | `game-data.ts` | 27 words |
| Sight Words | `game-data.ts` | 60 words |
| Sentences | `game-data.ts` | 15 sentences |

**Total Unique Words in Games:** ~300+ words

---

## Identified Gaps

### 1. No Oral Language Stage Game 🔶
**Problem:** Stage 1 (Oral Language) has admin tools but no parent-facing game.
**Recommendation:** Create a simple "Vocabulary Builder" game that uses Three-Part Card format.

### 2. Combined Beginning + Ending Sound Game 🔶
**Problem:** Guide Stage 2 mentions "I spy something that begins with /c/ and ends with /t/" - this combined skill isn't a dedicated game.
**Recommendation:** Add "Advanced I Spy" level that combines beginning AND ending sounds.

### 3. Missing Letter Game Uses Different Data Source
**Observation:** `missing-letter-data.ts` exists separately - verify it pulls from master-words.

### 4. Grammar Stage Underserved
**Problem:** Grammar stage in guide has rich content (grammar symbols, function of words) but games only cover sentence building.
**Recommendation:** Future phase: Add "Grammar Symbol" games.

---

## Parent Notification System Architecture

### The Goal
When a child completes a classroom work, automatically notify parent which HOME GAME to play that reinforces the skill.

### Mapping Structure (for database/system)

```typescript
// Suggested mapping table structure
interface ClassroomToHomeGame {
  classroomWorkId: string;      // From curriculum_activities table
  curriculumStage: 'oral' | 'sound' | 'sandpaper' | 'moveable' | 'pink' | 'blue' | 'green' | 'grammar';
  skill: string;                // Specific skill within stage
  homeGameId: string;           // Game route
  homeGameLevel?: string;       // Optional: specific level within game
  reinforcementType: 'practice' | 'review' | 'extend';
}

// Example mappings:
const CLASSROOM_TO_GAME_MAP: ClassroomToHomeGame[] = [
  // SOUND GAMES STAGE
  { classroomWorkId: 'i-spy-beginning', curriculumStage: 'sound', skill: 'beginning-sounds', 
    homeGameId: 'sound-games/beginning', reinforcementType: 'practice' },
  { classroomWorkId: 'i-spy-ending', curriculumStage: 'sound', skill: 'ending-sounds',
    homeGameId: 'sound-games/ending', reinforcementType: 'practice' },
  
  // SANDPAPER LETTERS STAGE
  { classroomWorkId: 'sandpaper-letters-sat', curriculumStage: 'sandpaper', skill: 'traces-letters',
    homeGameId: 'letter-tracer', homeGameLevel: 'vowels', reinforcementType: 'practice' },
  { classroomWorkId: 'sandpaper-letters-consonants', curriculumStage: 'sandpaper', skill: 'knows-consonants',
    homeGameId: 'letter-sounds', homeGameLevel: 'easy', reinforcementType: 'review' },
  
  // MOVEABLE ALPHABET / PINK SERIES
  { classroomWorkId: 'moveable-alphabet-cvc', curriculumStage: 'moveable', skill: 'builds-cvc',
    homeGameId: 'word-builder', homeGameLevel: 'pink-series', reinforcementType: 'practice' },
  { classroomWorkId: 'pink-short-a', curriculumStage: 'pink', skill: 'short-a-words',
    homeGameId: 'word-builder', homeGameLevel: 'short-a', reinforcementType: 'practice' },
  { classroomWorkId: 'pink-short-a', curriculumStage: 'pink', skill: 'short-a-words',
    homeGameId: 'picture-match', homeGameLevel: 'short-a', reinforcementType: 'review' },
  
  // BLUE SERIES
  { classroomWorkId: 'blue-bl-blend', curriculumStage: 'blue', skill: 'beginning-blends',
    homeGameId: 'word-builder', homeGameLevel: 'bl', reinforcementType: 'practice' },
  
  // GREEN SERIES  
  { classroomWorkId: 'green-ai-ay', curriculumStage: 'green', skill: 'ai-ay-words',
    homeGameId: 'word-builder', homeGameLevel: 'ai', reinforcementType: 'practice' },
  
  // SENTENCES
  { classroomWorkId: 'sentence-building', curriculumStage: 'grammar', skill: 'simple-sentences',
    homeGameId: 'sentence-builder', reinforcementType: 'practice' },
];
```

### Notification Flow
```
[Teacher marks work complete] 
    → [System lookup: which home game?]
    → [Push to Montree Home parent app]
    → [Parent sees: "Today Emma practiced Beginning Sounds at school! 
        Play 'I Spy Beginning' together to reinforce: /games/sound-games/beginning"]
```

### Database Changes Needed

```sql
-- New table for classroom-to-game mapping
CREATE TABLE classroom_game_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_work_id UUID REFERENCES curriculum_activities(id),
  work_name TEXT NOT NULL,
  curriculum_stage TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  home_game_route TEXT NOT NULL,
  home_game_level TEXT,
  reinforcement_type TEXT DEFAULT 'practice',
  parent_message_template TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert mappings for all works
INSERT INTO classroom_game_links (work_name, curriculum_stage, skill_name, home_game_route, parent_message_template) VALUES
('I Spy - Beginning Sounds', 'sound', 'beginning-sounds', '/games/sound-games/beginning', 'practiced hearing beginning sounds. Play "I Spy Beginning" together!'),
('I Spy - Ending Sounds', 'sound', 'ending-sounds', '/games/sound-games/ending', 'practiced hearing ending sounds. Play "I Spy Ending" together!'),
-- ... continue for all works
;
```

---

## Verification Checklist

### ✅ Sound Games (Stage 2)
- [x] Beginning sounds: 23 sound groups, 6 words each
- [x] Ending sounds: 6 sound groups, 6 words each  
- [x] Middle sounds: 5 vowels, 8 CVC words each
- [x] Blending: Uses CVC_WORDS data
- [x] Segmenting: Uses CVC_WORDS data
- [x] ESL notes for difficult sounds (v, th, r, l, z)

### ✅ Letter Games (Stages 3-4)
- [x] Letter Sounds: 5 groups, progressive unlock
- [x] Letter Tracer: Uses `letter-strokes.ts`
- [x] Letter Match: Uppercase/lowercase

### ✅ Word Building Games (Stages 4-7)
- [x] Word Builder: Pulls from PINK_SERIES → master-words.ts
- [x] Picture Match: Uses same data source
- [x] Blue Series: 16 blends, 3 words each
- [x] Green Series: 9 phonograms, 3 words each

### ✅ Sentence Games (Stage 8)
- [x] Sentence Match: 15 sentences, 3 levels
- [x] Sentence Builder: Same data
- [x] Sight Words: 60 words, 3 levels

---

## Recommendations for Implementation

### Phase 1: Parent Notification (Quick Win)
1. Create `classroom_game_links` table
2. Add API endpoint `/api/parent-notifications`
3. When work logged → lookup game → push to Montree Home

### Phase 2: Smart Recommendations
1. Track which games child has played
2. If weak on short-a, prioritize short-a games
3. Show "recommended for you" section in Montree Home

### Phase 3: Fill Gaps
1. Add Vocabulary Builder game for Stage 1
2. Add Combined Beginning+Ending I Spy level
3. Consider Grammar Symbol games for Stage 8

---

## Files Reference

| Purpose | File Path |
|---------|-----------|
| Master CVC Words | `/lib/data/master-words.ts` |
| Sound Games Data | `/lib/sound-games/sound-games-data.ts` |
| Game Data (Pink/Blue/Green) | `/lib/games/game-data.ts` |
| Game Config | `/lib/games/game-config.ts` |
| English Guide | `/app/admin/english-guide/page.tsx` |
| Curriculum Album | `/ENGLISH_LANGUAGE_ALBUM_COMPLETE.md` |

---

**Conclusion:** Games are comprehensive and well-aligned with the curriculum. Ready for parent notification integration.
