# Montree Brain

> Say "read the brain" at session start. Say "update brain" at session end.

## Current State (Jan 31, 2026)

**App**: Montree - Montessori classroom management
**Stack**: Next.js 16, React 19, TypeScript, Supabase, Tailwind
**Deployed**: Railway (API) + Vercel (frontend) at teacherpotato.xyz
**Status**: Working, English phonics curriculum complete

## Recent Changes

### Session - Jan 31, 2026 (English Curriculum Build)
- **Onboarding Simplified**: Landing page now has "Set Up School" + "Login" dropdown (Teacher/Principal)
- **Curriculum Ordering Fixed**: `/api/montree/curriculum/route.ts` now preserves brain's `sequence_order`
- **Complete English/Phonics Curriculum Created**:
  - 6-shelf layout covering consonants → free reading (age 3-5)
  - Shelf 1: Sound Foundations (sandpaper letters, I-spy)
  - Shelf 2: Pink Series CVC (short a, e, i, o, u word families)
  - Shelf 3: Blue Series (digraphs sh/ch/th + all blends)
  - Shelf 4: Green Series Part 1 (Magic E + core vowel teams)
  - Shelf 5: Green Series Part 2 (diphthongs, R-controlled vowels)
  - Shelf 6: Comprehension (sentences, stories, reading baskets)
- **6 Decodable Stories Created** with comprehension worksheets:
  1. "The Big Red Hat" - CVC focus
  2. "Chip and the Fish" - Digraphs
  3. "Frog on a Log" - Blends
  4. "The Bee in the Tree" - Vowel Teams
  5. "The Cake by the Lake" - Magic E
  6. "Time to Read!" - Mixed patterns
- **Digital Phonics Game**: `/app/montree/games/phonics-challenge/page.tsx` (if created)
- **Materials Created**:
  - `CVC_Curriculum_English.xlsx` - Complete word lists, sentences, stories
  - `English_Corner_Works_Layout.xlsx` - 114 works across 6 shelves × 4 levels
  - `English_Corner_Shelf_Diagram.html` - Visual layout diagram
  - Story PDFs with comprehension + answer key
  - All bundled in `Montessori_Phonics_Curriculum.zip`

### Session - Jan 30, 2026 (Continued)
- **AI Analysis Fix**: Now uses FULL learning journey data (not just 4 weeks)
- AI reads notes from `montree_work_sessions` table (previously missed)
- AI "thinks like a teacher who's known the child for years"
- WorkWheelPicker simplified: single "Select" button, defaults to `not_started`
- **Curriculum Fix**: New classrooms auto-assign full curriculum during onboarding
- Created backfill endpoint: `/api/montree/admin/backfill-curriculum`

### Session - Jan 30, 2026 (Earlier)
- Replaced all whale emojis (🐋) with tree emojis (🌳) across 44 source files + 5 icon SVGs
- Skipped historical docs to preserve project history

### Previous Sessions
- Progress display bug fixed - status values are `not_started`, `presented`, `practicing`, `mastered`
- WorkWheelPicker created (`components/montree/WorkWheelPicker.tsx`) - drum picker triggered by long-press on area icons
- Student grid auto-resize fixed with CSS Grid
- Suspense fix pushed (wrapped `useSearchParams()` in curriculum-import page)

## Key Files

| File | Purpose |
|------|---------|
| `components/montree/WorkWheelPicker.tsx` | Drum picker for curriculum navigation |
| `app/montree/dashboard/[childId]/page.tsx` | Student detail with wheel picker |
| `app/montree/dashboard/page.tsx` | Student grid (auto-resizing) |
| `app/admin/curriculum-import/page.tsx` | Onboarding wizard |
| `app/montree/principal/register/page.tsx` | School registration |
| `app/montree/principal/setup/page.tsx` | School setup flow |
| `app/api/montree/principal/setup/route.ts` | Setup API (auto-assigns curriculum) |
| `app/api/montree/analysis/route.ts` | AI analysis API |
| `app/api/montree/admin/backfill-curriculum/route.ts` | Backfill curriculum for existing classrooms |
| `lib/montree/ai/weekly-analyzer.ts` | AI analysis engine |
| `lib/montree/db.ts` | Database operations |
| `lib/montree/curriculum-data.ts` | Static curriculum definitions |

## Database

**Supabase Project**: dmfncjjtsoxrnvcdnvjq

### Key Tables
- `schools` - School records
- `classrooms` - Classrooms per school
- `montree_children` - Students
- `children` - Legacy children table (FK target)
- `montree_child_progress` - Progress tracking (status per work)
- `montree_work_sessions` - Teacher notes/observations (detailed session logs)
- `montree_classroom_curriculum_works` - Curriculum assigned to classrooms
- `montree_weekly_analysis` - Cached AI analysis results
- `curriculum_areas` - Area definitions
- `curriculum_works` - Work items

### Status Values
Progress uses: `not_started` → `presented` → `practicing` → `mastered`
(NOT `completed` - that was the old bug)

## Demo Logins
- `butter1` = Butterfly Class
- `rainbo2` = Rainbow Class

## Architecture Notes

### Curriculum Flow
1. Static curriculum in `curriculum-data.ts` (fallback)
2. Schools can customize via `school_curriculum` table
3. Classrooms inherit from school or override via `classroom_curriculum`
4. Progress tracked in `child_work_completion`

### Auth Flow
- Teachers log in with class code
- Principals register schools, create classrooms
- Parents get invite codes from teachers

## Pending / Next Up
- [ ] Push commits (git auth issue - needs manual `git push` from local machine)
- [ ] Test new school onboarding to confirm curriculum auto-assigns
- [ ] Test AI analysis with teacher notes integration
- [ ] Consider running backfill for existing classrooms missing curriculum

## Gotchas
- `useSearchParams()` must be wrapped in Suspense boundary (Next.js 16)
- Foreign key: `child_work_completion.child_id` → `children.id` (not montree_children!)
- Progress status mapping in `lib/montree/db.ts` - don't use 'completed'
- Railway rebuilds can take a few minutes

## URLs
- **Production**: teacherpotato.xyz
- **Teacher Dashboard**: teacherpotato.xyz/montree
- **Admin**: teacherpotato.xyz/admin
