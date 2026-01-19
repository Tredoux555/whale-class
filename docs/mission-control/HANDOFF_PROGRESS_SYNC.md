# HANDOFF: Progress Sync & Backfill Feature

**Date:** January 18, 2026  
**Status:** ✅ COMPLETE - Ready for Testing

---

## 🎯 Problem Solved

Teacher observed: YueZe has "Number Rolls" this week but Math progress shows **0% mastered**. 

**Root Cause:** When weekly plans are uploaded, fuzzy matching fails ~90% of the time. Works get created in `weekly_assignments` with `work_id = NULL`. The backfill logic only runs when `work_id` exists, so progress never gets populated.

**Solution:** Added a "Sync from This Week" button that:
1. Matches unlinked weekly assignments to curriculum works
2. Creates `child_work_progress` records
3. **Backfills ALL preceding works as mastered**

---

## 📁 Files Created/Modified

### NEW: Sync API
```
/app/api/classroom/child/[childId]/progress/sync/route.ts
```
- POST endpoint that syncs weekly assignments to curriculum
- Fuzzy matching (exact → contains → word-based)
- Auto-backfills preceding works in same area as mastered

### MODIFIED: Student Detail Page
```
/app/admin/classroom/student/[id]/page.tsx
```
- Added sync button UI to ProgressTab
- Added `handleSync()` function
- Added `handleWorkClick()` for tap-to-toggle mastered
- Work cards now clickable (tap = toggle mastered)

### ALSO EXISTS (created earlier)
```
/app/api/classroom/child/[childId]/progress/[workId]/route.ts
```
- PATCH: Update status or link to curriculum
- DELETE: Remove progress record

---

## 🔄 Data Flow

```
weekly_assignments (work_name, work_id = NULL)
         ↓
    [Sync Button]
         ↓
Fuzzy match to curriculum_roadmap
         ↓
Update weekly_assignment.work_id
         ↓
Create child_work_progress (status: 2 = practicing)
         ↓
BACKFILL: All works with lower sequence_order → status: 3 (mastered)
```

---

## 🖥️ UI Changes

### Progress Tab Now Has:

1. **Blue Sync Banner** (top of tab)
   - Gradient blue-to-indigo
   - "🔄 Sync from This Week"
   - "🚀 Sync" button
   - Shows result message after sync

2. **Clickable Work Cards**
   - Tap = toggle between mastered (green) ↔ not started
   - Green cards = mastered (with white text)
   - Blue border = practicing
   - Yellow = presented
   - White = not started

3. **Tip Text**
   - "💡 Tap any work to toggle mastered"

---

## 🧪 Testing Checklist

- [ ] Go to any child's Progress tab
- [ ] See blue "Sync from This Week" banner
- [ ] Click "🚀 Sync"
- [ ] See success message with counts
- [ ] Check Math area - should show mastered works
- [ ] Expand Math area
- [ ] Tap a work card - should toggle green/white
- [ ] Verify progress percentages updated

---

## 🔧 Technical Details

### Fuzzy Matching Logic (in sync/route.ts)
```typescript
// 1. Exact match
if (currName === normalizedName) return match

// 2. Contains match
if (currName.includes(normalizedName) || normalizedName.includes(currName)) return match

// 3. Word-based (2+ words match)
const matchCount = nameWords.filter(word => currName.includes(word)).length
if (matchCount >= 2) return match
```

### Backfill Logic
```typescript
// Get all works in same area, sorted by sequence
const areaWorks = worksByArea.get(match.area)

// Mark all BEFORE current as mastered
for (const prevWork of areaWorks) {
  if (prevWork.sequence < match.sequence) {
    upsert({ work_id: prevWork.id, status: 3 }) // mastered
  }
}
```

### Status Codes
- 0 = Not Started
- 1 = Presented
- 2 = Practicing
- 3 = Mastered

---

## ⚠️ Known Limitations

1. **Fuzzy matching not perfect** - Some Chinese names may not match. Unmatched works need manual linking via the orphaned works UI (amber banner).

2. **No undo** - Backfill doesn't have an undo. If wrong work is matched, progress must be manually corrected.

3. **Single child** - Sync only works for currently viewed child. No "sync all children" yet.

---

## 🚀 Future Improvements

1. **Batch Sync** - Add button to sync all children at once
2. **Better Chinese matching** - Use curriculum's Chinese names for matching
3. **Manual work picker** - When no match found, show dropdown to pick
4. **Undo support** - Track what was backfilled, allow reversal

---

## 📍 Entry Points

- **Progress Tab:** `/admin/classroom/student/[id]` → Progress tab
- **Sync API:** `POST /api/classroom/child/{childId}/progress/sync`
- **Update API:** `PATCH /api/classroom/child/{childId}/progress/{workId}`

---

## ✅ Ready for Use

The feature is complete and ready for teacher testing. Refresh the page and try the sync button on YueZe's Progress tab!
