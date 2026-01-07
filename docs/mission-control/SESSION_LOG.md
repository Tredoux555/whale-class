# WHALE SESSION LOG

## How This Works
Every session, Claude reads this + mission-control.json to understand where we are.
Every session end, Claude updates both files.
This is the brain. New thoughts get added here.

---

## 2026-01-08 Session 2 (PER-SCHOOL CURRICULUM - DEPLOYED)

### Context
Pivoted from per-classroom to **per-school** curriculum because:
- No `classrooms` table exists in database
- Children link directly to `schools` via `school_id`
- Simpler architecture for current needs

### Database Changes (APPLIED TO PRODUCTION)

**1. Created `school_curriculum` table**
```sql
- id, school_id (FK), master_work_id
- area_id, category_id, name, chinese_name, description, sequence
- materials (JSONB), direct_aims, indirect_aims, control_of_error, levels
- is_active (soft delete), materials_on_shelf (teacher toggle)
- custom_notes, is_custom
- UNIQUE(school_id, master_work_id)
```

**2. Created clone function & cloned data**
```sql
SELECT clone_curriculum_to_school('00000000-0000-0000-0000-000000000001');
-- Result: 342 works cloned to Beijing International School
```

**3. Added column to child_work_completion**
```sql
ALTER TABLE child_work_completion ADD COLUMN school_work_id UUID;
ALTER TABLE child_work_completion ADD CONSTRAINT unique_child_school_work 
  UNIQUE (child_id, school_work_id);
```

### API Routes Created
- `app/api/school/[schoolId]/curriculum/route.ts`
  - GET: Fetch school curriculum (filter by area, active status)
  - PATCH: Update work (toggle materials_on_shelf, is_active, notes)
  
- `app/api/students/[studentId]/quick-place/route.ts`
  - GET: Get current positions + curriculum dropdown options per area
  - POST: Set positions (marks previous as mastered, selected as practicing)

### Pages Created
- `app/teacher/curriculum/page.tsx` - Teacher curriculum editor
  - 5 area tabs (Practical Life, Sensorial, Math, Language, Cultural)
  - Toggle "On Shelf" / "Not Available" per work
  - Search works, hide inactive
  
- `app/teacher/students/[studentId]/quick-place/page.tsx`
  - 5 dropdowns (one per area)
  - Select current work → all previous = Mastered
  - Visual feedback on changes

### Build Fix
Supabase client was initialized at module level, causing Railway build failure.
Fixed with lazy initialization:
```typescript
function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
```

### Commits
- `9ab64e8` - feat: per-school curriculum system with quick placement
- `895f63f` - feat: add quick-place page  
- `e847a11` - fix: lazy init supabase client to fix build

### Test URLs
- `/teacher/curriculum` - Teacher toggles materials
- `/teacher/students/795aa63d-2f73-4843-addb-35457436334a/quick-place` - Quick place Marina

### Status: DEPLOYED ✅

---

## 2026-01-08 Session 1 (PER-CLASSROOM CURRICULUM - DESIGN ONLY)

### Context
Initial design session for per-classroom curriculum system.
This was later pivoted to per-school in Session 2.

### What Was Designed (NOT DEPLOYED)
- `classroom_curriculum` table concept
- `clone_curriculum_to_classroom()` function concept
- API routes designed but not implemented

### Files Created (LOCAL ONLY)
```
migrations/022_classroom_curriculum.sql (not applied)
app/api/classroom/[classroomId]/curriculum/route.ts (replaced)
app/api/students/[studentId]/quick-place/route.ts (updated)
app/teacher/curriculum/page.tsx
app/teacher/students/[studentId]/quick-place/page.tsx
HANDOFF_JAN8_2026.md
```

### NEXT STEP: Run Migration in Supabase

1. Go to Supabase SQL Editor
2. Copy contents of `migrations/022_classroom_curriculum.sql`
3. Run
4. Verify: `SELECT COUNT(*) FROM classroom_curriculum;`

### After Migration
- Test `/teacher/curriculum`
- Test `/teacher/students/[id]/quick-place`
- Add links from teacher dashboard

---

## 2026-01-07 Session 4 (AUDIO FIX SESSION)

### Context
User reported horrible mixed audio in games - robot voice, their voice, and AI voice all playing together. The ElevenLabs audio was generated but not properly integrated into all game files.

### Root Cause Found
There were TWO different sound-utils files:
- `/lib/games/sound-utils.ts` - OLD file using browser speechSynthesis
- `/lib/sound-games/sound-utils.ts` - Fixed file using ElevenLabs

GameWrapper.tsx, LetterTracer.tsx, and other components were importing from the OLD file.

### What We Fixed

**Phase 1: Core Audio Utilities**
1. `lib/games/sound-utils.ts` - COMPLETE REWRITE to use GameAudio
2. `lib/sound-games/sound-utils.ts` - Already fixed from previous session

**Phase 2: Sound Games (5 games)** - All now use ElevenLabs
3. `app/games/sound-games/beginning/page.tsx`
4. `app/games/sound-games/ending/page.tsx`
5. `app/games/sound-games/middle/page.tsx`
6. `app/games/sound-games/blending/page.tsx`
7. `app/games/sound-games/segmenting/page.tsx` (+ fixed wrong answer bug)

**Phase 3: Other Game Components (4 games)** - All now use ElevenLabs
8. `components/07-LetterSoundMatchingGame.tsx` (+ fixed shake animation)
9. `components/08-WordBuildingGame.tsx` (+ fixed 5-letter distractors)
10. `components/09-SentenceMatchingGame.tsx`
11. `components/10-SentenceBuilderGame.tsx`

**Phase 4: Remaining Components**
12. `components/04-LetterTracer.tsx` - Fixed playAudio()
13. `components/12-BigToSmallLetterMatchingGame.tsx` - Fixed playLetterSound()

### Verification
```bash
# Zero speechSynthesis remaining
grep -r "speechSynthesis" --include="*.tsx" --include="*.ts" . | grep -v node_modules
# Returns: NOTHING (all removed)
```

### Commits Made
- `d23e7c8` - Initial sound games fix (earlier in session)
- `0153ea7` - Fix: Remove ALL remaining speech synthesis
- `c773d54` - docs: Final audio fix checkpoint

### Key Changes
- **ALL** games now use `GameAudio` class from `/lib/games/audio-paths.ts`
- **ZERO** browser speechSynthesis anywhere in codebase
- All audio from `/audio-new/` directory (ElevenLabs Rachel voice)

### Audio Files Available
- `/audio-new/letters/` - 26 phonetic letter sounds (a-z)
- `/audio-new/words/pink/` - 223 CVC words
- `/audio-new/words/blue/` - 50 blend words
- `/audio-new/words/green/` - 41 digraph words
- `/audio-new/sight-words/` - 61 high-frequency words
- `/audio-new/ui/` - correct, wrong, celebration, complete sounds

### Bug Fixes Applied
1. ✅ Segmenting game - proper wrong answer handling
2. ✅ Letter Sound game - shake animation + wrong sound
3. ✅ Word Builder - distractor letters for 5-letter words
4. ✅ All games - removed speechSynthesis

### Files Changed (13 total)
See `/docs/GAME_AUDIO_FIX_CHECKPOINT.md` for complete list.

---

## 2026-01-07 Session 3

### Context
User requested Activity Guide feature - when tapping a work in classroom view dropdown, show a comprehensive description/guide for that activity similar to the English Guide format.

### What We Built

1. **Work Description API** (`/app/api/curriculum/work-description/route.ts`)
   - Searches all 5 curriculum JSON files for work by name
   - Returns rich data: description, chineseName, materials, directAims, indirectAims, controlOfError, levels
   - Fuzzy matching to handle slight naming variations

2. **WorkDescription Component** (`/app/admin/classroom/WorkDescription.tsx`)
   - Beautiful display component for activity guides
   - Shows: header with name/Chinese, quick stats, aims (direct/indirect), materials, control of error, progression levels
   - Loading and error states
   - Color-coded sections (green for direct aims, purple for indirect, amber for materials, red for control of error, blue for levels)

3. **Updated SwipeableWorkRow** (`/app/admin/classroom/SwipeableWorkRow.tsx`)
   - Added activity guide section below notes and action buttons
   - Fetches description when dropdown opens (lazy load)
   - Increased max-height to 600px to accommodate guide content
   - Resets description when work changes via swipe

### How It Works
1. Teacher taps work in `/admin/classroom`
2. Dropdown opens with Notes, Photo/Video/Demo buttons
3. Activity Guide loads below with full teaching reference
4. Guide shows description, aims, materials, control of error, and progression levels

### Files Created
- `/app/api/curriculum/work-description/route.ts` - API endpoint
- `/app/admin/classroom/WorkDescription.tsx` - Display component
- `/HANDOFF_JAN7_2026_SESSION2.md` - Handoff document

### Files Modified
- `/app/admin/classroom/SwipeableWorkRow.tsx` - Integrated activity guide

### Data Source
Curriculum data from `/lib/curriculum/data/*.json`:
- practical-life.json (5 categories, 50+ works)
- sensorial.json (7 categories, 40+ works)
- math.json (full math curriculum)
- language.json (oral, writing, reading, grammar)
- cultural.json (geography, science, art, music)

### Testing
1. Go to `/admin/classroom`
2. Select week with assignments
3. Tap any work (e.g., "Spooning", "Pink Tower", "Sound Games")
4. Scroll down in dropdown to see Activity Guide

---

## 2026-01-07 Session 2

### Context
User reported SwipeableWorkRow issues:
1. Horizontal swipe was moving the whole page (not native feel)
2. Dropdown panel (swipe-down gesture) wasn't working reliably

Also requested English Guide alignment check.

### What We Fixed

1. **SwipeableWorkRow Native Feel** (`/app/admin/classroom/SwipeableWorkRow.tsx`)
   - Added `touch-action: pan-y` - tells browser "you handle vertical scroll, I handle horizontal"
   - Changed dropdown from swipe-down gesture to **tap toggle** (much more reliable)
   - Tap the work name OR the chevron arrow to open/close panel
   - Added hint text "← swipe →" so users know they can swipe works
   - Better swipe detection (1.5x horizontal ratio threshold)
   - Cleaner 150ms transitions

2. **Language Curriculum Alignment** (`/lib/curriculum/data/language.json`)
   - Compared English Guide (8 stages, 37 skills) with language.json
   - Found gap: Sound Blending and Sound Segmenting were in English Guide but NOT in curriculum
   - **Fixed:** Added Level 5 (Sound Blending) and Level 6 (Sound Segmenting) to la_sound_games
   - Added Elkonin boxes and counters/chips to materials list
   - Sound Games now has 7 levels matching all skills

### Alignment Summary

| English Guide Skill | Curriculum Level | Status |
|---------------------|------------------|--------|
| Beginning sounds | Level 1-2 | ✅ |
| Ending sounds | Level 3 | ✅ |
| Middle sounds | Level 4 | ✅ |
| Sound blending | Level 5 | ✅ ADDED |
| Sound segmenting | Level 6 | ✅ ADDED |
| Sound boxes | Level 7 | ✅ |

### Commits
- `17c3f6b` - fix: SwipeableWorkRow - native feel with touch-action, tap to toggle panel
- `e2bb103` - fix: add Sound Blending and Segmenting to language curriculum (align with English Guide)

### Files Changed
- `/app/admin/classroom/SwipeableWorkRow.tsx` - Native touch handling, tap-to-toggle
- `/lib/curriculum/data/language.json` - Added blending/segmenting levels

---

## 2026-01-07 Session 1

### Context
Classroom page UI improvements requested - swipe gestures and notes functionality

### What We Did

1. **Updated SwipeableWorkRow component** (`/app/admin/classroom/SwipeableWorkRow.tsx`)
   - Removed permanent 📷 and ▶️ buttons from each row
   - Added **swipe-down gesture** to reveal action panel with:
     - 📝 Notes text input (auto-saves to database with debounce)
     - 📷 Photo button
     - 🎥 Video button 
     - ▶️ Demo button
   - Kept swipe-left/right for changing works in curriculum sequence
   - Added 📝 indicator on row when notes exist
   - Notes save to `weekly_assignments.notes` column (already exists in DB)

2. **Curriculum Audit** - Created `/docs/mission-control/CURRICULUM_AUDIT.md`
   - Reviewed all 5 curriculum JSON files against montree structure
   - **RESULT: All curriculum data is correctly structured**
   - Practical Life: 8 categories, ~80 works ✅
   - Sensorial: 8 categories, ~45 works ✅
   - Math: 9 categories, ~70 works ✅
   - Language: 5 categories, ~60 works ✅ (aligned with English Guide stages)
   - Culture: 7 categories, ~70 works ✅
   - If order appears wrong in UI, issue is display logic not data

3. **Updated classroom page** to pass `onNotesChanged` callback to SwipeableWorkRow

4. **Comprehensive Audit** - Created `/docs/mission-control/AUDIT_REPORT_JAN7.md`
   - Fixed SwipeableWorkRow: removed dead code, added cleanup, added notes sync
   - Fixed Sound Games: corrected audio paths from `/audio/` to `/audio/ui/`
   - All 5 sound games verified working with speech synthesis fallback
   - Audio files documented: UI sounds exist, phonemes need recording

### UI Change Summary
**Before:** Each work row had permanent 📷 and ▶️ buttons
**After:** Clean rows with swipe-down to reveal notes input + action buttons

### Files Changed
- `/app/admin/classroom/SwipeableWorkRow.tsx` - Fixed dead code, added cleanup, added notes sync, added onRecordVideo prop
- `/app/admin/classroom/page.tsx` - Added onNotesChanged prop
- `/lib/sound-games/sound-utils.ts` - Fixed audio paths to `/audio/ui/`
- `/docs/mission-control/CURRICULUM_AUDIT.md` - New file
- `/docs/mission-control/AUDIT_REPORT_JAN7.md` - New comprehensive audit

---

## Session 6: Games Phase 2 - Visual Polish (Jan 7, 2026 Evening)

### Summary
Polished ALL 8 English games with consistent design system, hint systems, and UX improvements.

### Created
- `lib/games/design-system.ts` - Colors, fonts, animations, celebrations
- `components/games/GameShell.tsx` - Reusable wrapper with overlays

### Enhanced Games (8 total)
1. **MissingLetterGame** - Hints after 2 tries, stars, shake animation
2. **SightFlashGame** - Hints, timer bar, stars
3. **PictureMatchGame** - Hints, stars, random celebrations
4. **07-LetterSoundMatchingGame** - Hints, score, overlay celebration
5. **08-WordBuildingGame** - Hints (next letter), click-to-place mobile support
6. **09-SentenceMatchingGame** - Hints, score, celebrations
7. **10-SentenceBuilderGame** - Hints (next word), score
8. **12-BigToSmallLetterMatchingGame** - Click-to-match, hints, score

### Design System Features
- **Hint Pattern**: After 2 wrong tries, show helpful hint
- **Star Ratings**: 3 stars (90%+), 2 (70%+), 1 (50%+)
- **Animations**: shake, pop, float, bounce
- **Touch Targets**: 72px minimum
- **Difficulty Gradients**: Easy→Hard color progression

### Status: COMPLETE ✅
All 10 games (including Sound Games) now polished and production-ready.

---

## CURRENT STATE (Jan 8, 2026)

### What's Working
- `/admin/classroom` - Weekly planning + progress ✅
- `/admin/montree` - Curriculum tree ✅
- `/admin/weekly-planning` - Upload Chinese docs ✅
- `/teacher/progress` - Tablet tracking ✅
- `/teacher/curriculum` - Per-school curriculum editor ✅ NEW
- `/teacher/students/[id]/quick-place` - Bulk placement ✅ NEW
- `/games/sound-games/*` - All 5 games working ✅
- `/games/` - All other games ✅
- Multi-school filtering ✅
- Per-school curriculum (342 works cloned to Beijing) ✅ NEW

### Audio Status
- ✅ ALL games using ElevenLabs pre-recorded audio
- ✅ ZERO speech synthesis in codebase
- ✅ 423 audio files generated and deployed

### Sound Games URLs
- `/games/sound-games` - Hub page
- `/games/sound-games/beginning` - I Spy Beginning Sounds (4 phases)
- `/games/sound-games/ending` - I Spy Ending Sounds
- `/games/sound-games/middle` - Middle Sound Match (color-coded vowels)
- `/games/sound-games/blending` - Sound Blending (visual animation)
- `/games/sound-games/segmenting` - Sound Segmenting (tap counting)

---

## Reading Guide for New Claude Sessions

1. Read `mission-control.json` for current state
2. Read latest session in this file for context
3. Check what's pending
4. Ask Tredoux what's next

The goal: Every Claude instance picks up exactly where we left off.
