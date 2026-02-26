# Handoff: Focus Work Persistence Fix

**Date:** Feb 1, 2026
**Session:** Late Night / Early Morning

## Summary

Fixed critical bug where focus work changes weren't persisting after page reload. Also simplified WorkWheelPicker UI.

## What Was Broken

When teachers changed a focus work using the wheel picker:
1. UI updated optimistically ✅
2. API call returned 200 ✅
3. **But after reload, the old focus work came back** ❌

### Root Cause Analysis

The dashboard sent `is_focus: true` to `/api/montree/progress/update`, but:

1. **The `is_focus` flag was completely ignored** - The endpoint didn't save it anywhere
2. **`montree_child_progress` table has NO `is_focus` column** - The flag couldn't be saved there
3. **Separate `montree_child_focus_works` table exists** - But it was NEVER being updated when changing focus via wheel picker
4. **Dashboard's focus logic used status priority only** - It didn't read from the focus_works table

### Data Flow Before Fix

```
Wheel Picker → POST /api/montree/progress/update (is_focus: true)
                    ↓
              Save to montree_child_progress (is_focus IGNORED!)
                    ↓
              GET /api/montree/progress (no is_focus data)
                    ↓
              Dashboard picks focus by status priority only
```

### Data Flow After Fix

```
Wheel Picker → POST /api/montree/progress/update (is_focus: true)
                    ↓
              Save to montree_child_progress
                    ↓
              ALSO save to montree_child_focus_works ← NEW!
                    ↓
              GET /api/montree/progress
                    ↓
              Fetch montree_child_focus_works ← NEW!
                    ↓
              Mark progress items with is_focus: true/false ← NEW!
                    ↓
              Dashboard respects is_focus flag
```

## Files Modified

### 1. `/app/api/montree/progress/update/route.ts`

**Changes:**
- Extract `is_focus` from request body
- After saving progress, if `is_focus: true` and `area` is provided:
  - Upsert to `montree_child_focus_works` table
  - Uses `onConflict: 'child_id,area'` to ensure one focus per area

```typescript
// If is_focus is true, also update the focus-works table
if (is_focus && area) {
  try {
    const { error: focusError } = await supabase
      .from('montree_child_focus_works')
      .upsert({
        child_id,
        area: area,
        work_name: workNameToSave,
        set_at: now,
        set_by: 'teacher',
        updated_at: now,
      }, {
        onConflict: 'child_id,area',
      });
    // ... error handling
  }
}
```

### 2. `/app/api/montree/progress/route.ts`

**Changes:**
- Fetch focus works from `montree_child_focus_works` table
- Build a Map of `area → focus_work_name`
- Add `is_focus: true/false` to each progress item based on whether it matches the focus work for its area

```typescript
// Fetch focus works to mark which progress items are focus
const focusMap = new Map<string, string>();
try {
  const { data: focusWorks, error: focusError } = await supabase
    .from('montree_child_focus_works')
    .select('area, work_name')
    .eq('child_id', childId);

  if (!focusError && focusWorks) {
    for (const fw of focusWorks) {
      focusMap.set(fw.area, fw.work_name?.toLowerCase());
    }
  }
} catch (e) {
  console.warn('Focus works fetch failed, continuing without focus flags:', e);
}

// Later, when building response:
const isFocus = focusWorkName === p.work_name?.toLowerCase();
```

### 3. `/components/montree/WorkWheelPicker.tsx`

**Changes:**
- Removed duplicate "Select" button from bottom bar
- Now only shows "Add Work" button
- Clicking highlighted work = change focus (already worked)
- "Add Work" button = add as extra work

## Database Tables Involved

### `montree_child_progress`
- Tracks progress on individual works
- Has: child_id, work_name, area, status, presented_at, mastered_at, notes
- Does NOT have: is_focus column

### `montree_child_focus_works`
- Tracks ONE designated focus work per area per child
- Has: child_id, area, work_name, set_at, set_by
- Unique constraint: (child_id, area)
- Created in migration 050_ai_analyst_schema.sql

## Testing Done

1. ✅ Opened wheel picker for Practical Life
2. ✅ Selected "Shoe Polishing" as new focus
3. ✅ Verified UI updated immediately
4. ✅ Reloaded page
5. ✅ **"Shoe Polishing" persisted as focus** - FIXED!

## Related Earlier Fixes (Same Session)

### Photo-Work Association

The Capture button now passes work context so photos are linked to works:

**File:** `/app/montree/dashboard/[childId]/page.tsx`
- Capture button URL includes: `workName=${work.work_name}&area=${work.area}`

**File:** `/app/montree/dashboard/capture/page.tsx`
- Reads workName and area from URL params
- Passes them to upload as `caption` and `tags`

**File:** `/app/api/montree/reports/preview/route.ts`
- Uses caption as fallback for work_name when matching photos

## Gotchas

1. **Area normalization** - Frontend may use "math", API expects "mathematics"
   - Dashboard handles this: `const area = wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea`

2. **Focus works table has CHECK constraint** - Area must be one of:
   - 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural'

3. **Two tables, one truth** - Focus is now stored in `montree_child_focus_works`, not `montree_child_progress`

## Next Steps

- [ ] Test full flow: Add student → Assign focus → Change focus → Verify persistence
- [ ] Verify reports show correct focus works
- [ ] Consider: Should changing focus also update progress status?
