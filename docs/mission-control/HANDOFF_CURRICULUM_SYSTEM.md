# HANDOFF: Classroom Curriculum System
**Date**: January 19, 2026
**Status**: IN PROGRESS - Phase 2 of 4 Complete

---

## 🎯 THE VISION

Every Montessori classroom is unique. When curriculum is imported, it **BELONGS** to that classroom. Teachers can:
- Add custom works specific to their classroom
- Edit/rename works to match their terminology  
- Delete works they don't use
- Have orphaned weekly plan works auto-added to curriculum

**Core Principle**: We all use the same Montessori curriculum, but it is FLEXIBLE per classroom.

---

## 📊 CURRENT DATABASE ARCHITECTURE

### Correct Tables (NEW - Use These)
```
montree_classrooms
└── montree_classroom_curriculum_areas (5 areas per classroom)
    └── montree_classroom_curriculum_works (268 works for Whale Class)

montree_children (linked to classroom)
└── child_work_progress (tracks mastery status 0-3)
└── weekly_assignments (weekly plan works, may have work_id or be orphaned)
```

### Key IDs
- **Whale Classroom**: `bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6`
- **Areas**: practical_life, sensorial, mathematics, language, cultural

### Status Codes
- 0 = not started (white)
- 1 = presented (yellow)
- 2 = practicing (blue)
- 3 = mastered (green)

---

## ✅ COMPLETED WORK

### Phase 1: Progress API (DONE)
**File**: `/app/api/classroom/child/[childId]/progress/route.ts`
- Now uses `montree_classroom_curriculum_works` instead of global `curriculum_roadmap`
- Returns works from classroom curriculum with progress status
- Returns orphaned works (weekly assignments not linked to curriculum)
- Area normalization (math→mathematics, culture→cultural)

### Phase 2: Sync API (DONE)
**File**: `/app/api/classroom/child/[childId]/progress/sync/route.ts`
- Matches weekly assignments to classroom curriculum via fuzzy matching
- **AUTO-ADDS** missing works to classroom curriculum
- Backfills preceding works as mastered
- Uses classroom areas for proper categorization

### Phase 3: Curriculum CRUD APIs (DONE)
**Files Created**:
```
/app/api/admin/curriculum/route.ts          # GET (list), POST (add)
/app/api/admin/curriculum/[id]/route.ts     # GET, PATCH, DELETE
/app/api/admin/curriculum/orphaned/route.ts # GET orphaned works
/app/api/admin/curriculum/sync-all/route.ts # POST sync ALL children
```

### Phase 4: Curriculum Editor UI (DONE)
**File**: `/app/admin/curriculum-editor/page.tsx`
- Area tabs with work counts (Practical Life, Sensorial, Math, Language, Cultural)
- Search functionality
- Add/Edit/Delete works with modals
- Orphaned works alert banner with one-click add
- "Sync All Children" button
- Clean, professional design

---

## ❌ NOT YET TESTED/VERIFIED

1. **Curriculum Editor UI** - Need to verify it loads at `/admin/curriculum-editor`
2. **Sync All API** - Need to verify it processes all children
3. **Auto-add on import** - Weekly plan import should auto-sync
4. **Progress tab integration** - UI needs to use new progress API correctly

---

## 🔧 NEXT STEPS (Priority Order)

### Step 1: Test Curriculum Editor
```bash
# Navigate to: http://localhost:3000/admin/curriculum-editor
# Should see:
# - 268 works loaded
# - 5 area tabs
# - Orphaned works alert if any exist
```

### Step 2: Test Sync All
```bash
curl -X POST "http://localhost:3000/api/admin/curriculum/sync-all"
# Should return: matched count, auto-added count, children synced
```

### Step 3: Update Progress Tab in Montree Dashboard
The Progress tab in `/app/montree/dashboard/student/[id]/page.tsx` needs to:
- Use the new progress API response format
- Display works from classroom curriculum
- Show orphaned works separately
- Keep tap-to-toggle functionality

### Step 4: Auto-sync on Weekly Import
File to modify: `/app/api/weekly-planning/upload/route.ts`
- After parsing weekly plan, call sync-all endpoint
- This makes progress automatic when importing

### Step 5: Add Curriculum Editor Link
Add navigation link to curriculum editor from:
- Admin dashboard
- Montree dashboard teacher view
- Settings menu

---

## 🔗 FILE LOCATIONS

```
APIS:
/app/api/classroom/child/[childId]/progress/route.ts      # Progress data
/app/api/classroom/child/[childId]/progress/sync/route.ts # Per-child sync
/app/api/classroom/child/[childId]/progress/[workId]/route.ts # Toggle work
/app/api/admin/curriculum/route.ts                        # Curriculum CRUD
/app/api/admin/curriculum/[id]/route.ts                   # Single work CRUD
/app/api/admin/curriculum/orphaned/route.ts               # Orphaned works
/app/api/admin/curriculum/sync-all/route.ts               # Sync all children

UI:
/app/admin/curriculum-editor/page.tsx                     # Curriculum editor
/app/montree/dashboard/student/[id]/page.tsx              # Student progress view
```

---

## 🐛 KNOWN ISSUES

1. **Two Child Systems**: `weekly_assignments` uses different child IDs than `montree_children`
   - Lucky in weekly_assignments: `9f6967b8-ffd7-41dc-a691-bdba03ae975a`
   - Lucky in montree_children: `7d0d2c43-b1b5-445e-b923-67504abf173e`
   - Current workaround: Progress APIs accept either ID

2. **Area Naming Inconsistency**: 
   - Weekly plans use: `math`, `culture`
   - Curriculum uses: `mathematics`, `cultural`
   - Fixed with normalization function in APIs

3. **Progress UI Still Using Old Data**: 
   - The Montree dashboard Progress tab may need updates to match new API response

---

## 🧪 TEST COMMANDS

```bash
# Test curriculum API
curl -s "http://localhost:3000/api/admin/curriculum" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Works:', len(d.get('works',[])), 'Areas:', len(d.get('areas',[])))"

# Test orphaned works
curl -s "http://localhost:3000/api/admin/curriculum/orphaned" | python3 -m json.tool

# Test sync all
curl -X POST "http://localhost:3000/api/admin/curriculum/sync-all" | python3 -m json.tool

# Test progress for a child
curl -s "http://localhost:3000/api/classroom/child/9f6967b8-ffd7-41dc-a691-bdba03ae975a/progress" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Works:', len(d.get('works',[])), 'Orphaned:', len(d.get('orphanedWorks',[])))"
```

---

## 💡 DESIGN DECISIONS

1. **Classroom-owned curriculum**: Each classroom has its own copy of works that can be customized
2. **Auto-add on sync**: Missing works are automatically added to curriculum when syncing
3. **Fuzzy matching**: Work names are matched using multiple strategies (exact, contains, word-based)
4. **Backfilling**: When a work is synced, all preceding works in that area are marked as mastered
5. **Orphan detection**: Weekly plan works not in curriculum are surfaced for easy addition

---

## 📝 BRAIN.JSON UPDATE NEEDED

Add this to brain.json CORE_LAWS or PROJECT_STATE:
```json
{
  "curriculum_system": {
    "principle": "Classroom-owned, teacher-editable curriculum",
    "tables": ["montree_classroom_curriculum_works", "montree_classroom_curriculum_areas"],
    "never_use": ["curriculum_roadmap (global table)"],
    "sync_behavior": "Auto-add missing works to classroom curriculum",
    "status": "Phase 2 of 4 complete"
  }
}
```

---

**HANDOFF COMPLETE** - Next chat should start by testing the curriculum editor at http://localhost:3000/admin/curriculum-editor
