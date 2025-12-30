# 🐋 Whale Class Weekly Planning System - HANDOFF DOCUMENT
## December 30, 2025

---

## 🎉 WHAT WE BUILT

A complete **Weekly Planning Upload & Classroom View System** that:
1. Accepts Chinese weekly plan documents (.docx)
2. Uses Claude AI to parse, translate, and extract work assignments
3. Stores assignments in Supabase database
4. Displays all children in an interactive classroom grid
5. Allows progress tracking (Not Started → Presented → Practicing → Mastered)
6. Prints A4-friendly classroom sheets

---

## ✅ WORKING FEATURES

### Upload System (`/admin/weekly-planning`)
- Drag-drop or click to upload .docx files
- **Auto-detects week number** from document content (e.g., "Week 17")
- Claude AI parses Chinese table structure
- Extracts: child names, works per area, focus areas (社交/专注力/意志力), observation notes
- Translates Chinese work names to English
- Matches works to curriculum_roadmap database
- Creates ~100 assignments per week (20 kids × 5 areas)

### Classroom View (`/admin/classroom`)
- Grid of all children with progress indicators
- Click child card → detailed view with all works
- Tap status buttons to cycle: ○ → P → Pr → M
- Filter by Montessori area (P/S/M/L/C)
- Week selector dropdown

### Print Function (`/admin/classroom/print`)
- 🖨️ button in classroom header
- A4-optimized layout
- 2-column grid of children
- Works grouped by area with checkboxes
- Auto-opens print dialog

---

## 🗄️ DATABASE SCHEMA

### `weekly_plans` table
- `id`, `week_number`, `year`, `translated_content` (JSONB), `original_filename`, `status`

### `weekly_assignments` table (KEY COLUMNS)
```
id, week_number, year, child_id, work_id, work_name, area, status, 
progress_status, notes, created_at, presented_at, practicing_at, mastered_at
```

**IMPORTANT:** Uses `week_number` + `year` to link assignments - NOT `weekly_plan_id`!

### `children` table
- 22 children in Whale Class (20 active students + 2 test entries)

---

## 🐛 BUGS WE FIXED

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Build failed | `useSearchParams()` not in Suspense | Wrapped components in `<Suspense>` |
| Assignments not created | Area constraint: DB has `math`, code sent `mathematics` | Added mapping `mathematics → math` |
| 500 error on classroom view | Query used `weekly_plan_id` column that doesn't exist | Changed to query by `week_number` + `year` |
| Progress status errors | Column didn't exist in some queries | Removed from SELECT, default to 'not_started' |
| Area colors not showing | AREA_COLORS missing `math` key | Added both `math` and `mathematics` keys |

---

## 📁 KEY FILES

### Frontend Pages
- `app/admin/weekly-planning/page.tsx` - Upload UI with drag-drop
- `app/admin/classroom/page.tsx` - Children grid view
- `app/admin/classroom/[childId]/page.tsx` - Individual child detail
- `app/admin/classroom/print/page.tsx` - A4 print layout

### API Routes
- `app/api/weekly-planning/upload/route.ts` - Handles docx upload, Claude parsing, DB insert
- `app/api/weekly-planning/by-plan/route.ts` - Fetches assignments by week/year
- `app/api/weekly-planning/list/route.ts` - Lists all uploaded plans
- `app/api/weekly-planning/child-detail/route.ts` - Individual child data
- `app/api/weekly-planning/progress/route.ts` - Updates progress status

---

## 🔑 CRITICAL KNOWLEDGE

### Area Mapping
The database `area` column constraint requires: `practical_life`, `sensorial`, `math`, `language`, `culture`

Claude outputs `mathematics` but DB needs `math` - always map this!

### Query Pattern
```typescript
// CORRECT - query by week/year
.eq('week_number', weekNumber)
.eq('year', year)

// WRONG - column doesn't exist
.eq('weekly_plan_id', planId)
```

### Children Table Join
```typescript
.select(`
  id, child_id, work_name, area,
  children(id, name, avatar_emoji)
`)
```

---

## 🚀 DEPLOYMENT

- **Repo:** `Tredoux555/whale-class`
- **Host:** Railway (auto-deploys on push to main)
- **URL:** https://teacherpotato.xyz
- **Database:** Supabase

### Environment Variables (Railway)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (for Claude parsing)

---

## 📋 HOW TO USE

1. **Go to:** `teacherpotato.xyz/admin/weekly-planning`
2. **Drop** your Chinese weekly plan .docx
3. **Wait** ~30 seconds for Claude to parse
4. **Click** "View Week X in Classroom"
5. **See** all 20 children in grid
6. **Tap** status buttons to track progress
7. **Print** using 🖨️ button for classroom use

---

## 🔮 FUTURE ENHANCEMENTS

1. **Pure code parsing** - Remove Claude dependency, use translation lookup table
2. **Progress persistence** - Add `progress_status` column and progress API
3. **Parent view** - Show child's weekly works to parents
4. **Video integration** - Link works to curriculum video URLs
5. **PDF export** - Generate downloadable PDF reports
6. **Historical data** - View/compare progress across weeks

---

## 📊 SESSION STATS

- **Duration:** ~3 hours
- **Commits:** 10+
- **Files created/modified:** 15+
- **Bugs squashed:** 5 major
- **Final result:** Fully working upload → classroom → print pipeline

---

## 🙏 NOTES FOR NEXT SESSION

1. Local repo may have Cursor-generated files - run `git reset --hard origin/main` to clean
2. Always test after Railway deploy (~2 min wait)
3. Check Supabase for actual column names before writing queries
4. The translated_content JSONB in weekly_plans has full parsed data including focus areas and observation notes

---

**Built with 💙 for Whale Class 2025-2026**

*Teacher Tredoux's Montessori classroom at Beijing International School*
