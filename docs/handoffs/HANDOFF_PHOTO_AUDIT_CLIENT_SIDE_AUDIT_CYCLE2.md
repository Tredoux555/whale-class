# Photo Audit Page Client-Side Behavior Audit (Cycle 2)

## EXECUTIVE SUMMARY

**User Report:** "After a teacher confirms or corrects a photo, the photo doesn't disappear from the audit view. It stays visible even though it's now marked as GREEN/correct."

**Audit Finding:** The code is **partially working but incomplete**.

| Check | Status | Detail |
|-------|--------|--------|
| 1. Local state updates immediately after confirm/correct? | ✅ YES | `setPhotos()` updates zone to 'green' immediately |
| 2. Page filters out GREEN zone from display? | ✅ YES | `filteredPhotos` logic filters by zone correctly |
| 3. Corrected photos disappear visually? | ❌ NO | They disappear ONLY on 'amber'/'red' tabs, NOT on 'all' tab |
| 4. Zone counts update after correction? | ❌ NO | `setCounts()` never called after correction |

---

## FINDING 1: Local State Updates Immediately ✅

### After `handleConfirm()` (Line 620-646):
```typescript
setPhotos(prev => prev.map(p =>
  p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
));
```
✅ **Works correctly**: Photo's zone updated to 'green' immediately.

### After `handleWorkSelected()` (Line 699-733):
```typescript
setPhotos(prev => prev.map(p =>
  p.id === correctingPhoto.id
    ? { ...p, work_id: work.id, work_name: work.name, area: effectiveArea, zone: 'green' as const, confidence: 1.0 }
    : p
));
```
✅ **Works correctly**: All fields updated, zone set to 'green'.

### After `handleBatchConfirm()` (Line 736-769):
```typescript
setPhotos(prev => prev.map(p =>
  p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
));
```
✅ **Works correctly**: Zone updated to 'green' for each photo in batch.

---

## FINDING 2: Zone Filtering Works ✅

### Zone Filter Logic (Line 1104-1107):
```typescript
const filteredPhotos = useMemo(() => {
  if (zone === 'all') return photos;
  return photos.filter(p => p.zone === zone);
}, [photos, zone]);
```
✅ **Correctly filters**: When zone='amber', only photos with zone='amber' are shown.

### Zone Tabs (Line 1121-1127):
```typescript
const ZONE_TABS = [
  { key: 'all', ... count: counts.green + counts.amber + counts.red + counts.untagged },
  { key: 'red', ... count: counts.red },
  { key: 'amber', ... count: counts.amber },
  { key: 'untagged', ... count: counts.untagged },
  { key: 'green', ... count: counts.green },
];
```
✅ **Tab system works**: 5 zones available, all filtered correctly.

### Default Zone (Line 412):
```typescript
const [zone, setZone] = useState<Zone>('all');
```
⚠️ **Important**: Default is `'all'`, showing ALL photos including green ones.

---

## FINDING 3: The Two Real Issues ❌

### Issue A: Corrected Photos Stay Visible on `zone='all'`

**Scenario:**
1. Teacher views page (default `zone='all'`)
2. Teacher confirms an AMBER photo
3. Photo's `zone` updates to 'green' in state
4. **Photo is STILL VISIBLE** because `zone='all'` shows everything

**Visual Result:** User clicks "Confirm", sees success toast, but photo doesn't move/disappear. Looks like nothing happened.

**Why It Happens:** The filtering logic shows ALL photos when `zone='all'`:
```typescript
if (zone === 'all') return photos;  // Returns all photos, including green ones
```

**On Other Tabs:**
- If teacher was on `zone='amber'` tab, photo DOES disappear immediately (correct!)
- If teacher was on `zone='green'` tab, photo DOES appear (correct!)

### Issue B: Zone Tab Counts Never Update ❌

**Evidence:** After `handleConfirm()`, `handleCorrect()`, or `handleBatchConfirm()`:
- ✅ `setPhotos()` IS called (line 637-639, 720-724, 762-764)
- ❌ **`setCounts()` is NEVER called**

**Code Flow:**
```
Teacher clicks "Confirm"
  → handleConfirm() called
    → API POST to /api/montree/guru/corrections ✅
    → setPhotos() updates zone to 'green' ✅
    → [NO setCounts() call] ❌
    → Toast success ✅
  → counts state STILL SHOWS OLD VALUES
  → Zone tabs display wrong numbers
```

**Where setCounts() IS Called:**
- Line 601 in `fetchPhotos()` — ONLY on initial load or after full refetch
- **NEVER after individual corrections**

**Visual Result:**
- Tab shows "amber (47)" but only 46 photos visible
- "all (147)" count is now wrong
- No visual feedback that counts changed

---

## FINDING 4: No Server Refresh After Correction ❌

**Current Flow:**
```
Correction Handlers (handleConfirm/handleCorrect/handleBatchConfirm)
  └── Call /api/montree/guru/corrections ✅
  └── Update local photos state ✅
  └── [NO fetchPhotos() call] ❌
```

**Missing Step:**
- `fetchPhotos()` is defined on line 581
- It's called automatically when `zone` or `dateRange` change (line 613)
- **It's NEVER called after a correction**

**Consequence:**
- Server database has the correction stored
- Client state is updated locally
- But if user navigates away and returns, they see fresh data from server
- During same session, client and server can be out of sync

---

## FINDING 5: Detailed Photo Disappearance Scenarios

### Scenario 1: User on `zone='all'` confirms AMBER photo
```
BEFORE:
  ├─ zone='all'
  ├─ photos visible: 147 (all zones)
  ├─ tab counts: all(147) amber(47) red(23) untagged(77) green(0)
  └─ one photo shown with zone='amber'

CONFIRM CLICKED:
  ├─ photo.zone → 'green'
  ├─ photo visible: YES (still in 'all')
  ├─ counts: UNCHANGED (still amber=47, green=0) ❌
  └─ visual result: "confirmed" toast, but photo looks unchanged

EXPECTED:
  ├─ counts should be: amber=46, green=1
  └─ page should show visual feedback of tab counts changing
```

### Scenario 2: User on `zone='amber'` confirms AMBER photo
```
BEFORE:
  ├─ zone='amber'
  ├─ photos visible: 47 (amber only)
  ├─ tab count: amber(47)
  └─ one amber photo visible

CONFIRM CLICKED:
  ├─ photo.zone → 'green'
  ├─ filter applied: zone='amber' now returns 46 photos ✅
  ├─ photo DISAPPEARS visually ✅
  ├─ counts: UNCHANGED (still amber=47) ❌
  └─ visual result: photo gone, but "amber (47)" tab still shows 47

AFTER (User Perspective):
  ├─ tab shows "amber (47)" but only 46 visible
  └─ feels like a bug (count doesn't match visible)
```

### Scenario 3: User clicks 'green' tab after confirm
```
BEFORE:
  ├─ zone='all' (user just confirmed a photo)
  └─ photo is still visible in 'all'

CLICK GREEN TAB:
  ├─ zone → 'green'
  ├─ filter applied: returns photos with zone='green'
  ├─ confirmed photo NOW APPEARS in 'green' tab ✅
  ├─ counts updated: now shows "green (1)"
  └─ visual result: photo "moved" to green tab
```

---

## ROOT CAUSE SUMMARY

| Issue | Root Cause | Location |
|-------|-----------|----------|
| Photos don't disappear on 'all' tab | Default zone is 'all', filter returns all photos | Line 412, 1104-1107 |
| Counts don't update | `setCounts()` only called on page load, not after corrections | Line 601, missing in 620-646/699-733/736-769 |
| No visual feedback | No auto-navigate to green tab after confirm | All handlers |
| Server-client drift | No `fetchPhotos()` call after correction | Missing in all handlers |

---

## REQUIRED FIXES (Priority Order)

### Fix 1: Update Zone Counts After Correction (HIGH)

Add this after every `setPhotos()` call in correction handlers:

```typescript
// After line 639 in handleConfirm()
// After line 724 in handleWorkSelected()
// After line 764 in handleBatchConfirm()

setCounts(prev => {
  const oldZone = photo.zone as 'amber' | 'red' | 'untagged' | 'green';
  return {
    ...prev,
    [oldZone]: Math.max(0, prev[oldZone] - 1),
    green: prev.green + 1,
  };
});
```

**Impact:**
- ✅ Zone tab counts immediately accurate
- ✅ User sees visual feedback of counts changing
- ⚠️ Still doesn't hide photos on 'all' tab, but at least counts are right

### Fix 2: Auto-Navigate to Green Tab (MEDIUM)

Add this after successful confirmation (simplest UX fix):

```typescript
// After line 640 in handleConfirm()
// After line 725 in handleWorkSelected()
// After line 765 in handleBatchConfirm()

toast.success(t('audit.confirmed'));
setZone('green');  // Auto-navigate so user sees the photo move
```

**Impact:**
- ✅ Corrected photos visibly disappear from current view
- ✅ User auto-navigates to 'green' tab to see the result
- ✅ Very clear visual feedback

**Alternative:** Just set `setZone('all')` to refresh the view (less elegant but simpler).

### Fix 3: Refresh from Server After Correction (OPTIONAL)

Call `fetchPhotos()` after correction for total sync:

```typescript
// After line 640 in handleConfirm()
await fetchPhotos();  // Sync with server, update counts
```

**Impact:**
- ✅ Complete server-client sync
- ✅ Counts definitely accurate (from server)
- ❌ Adds extra network call (might be visible delay)

**Recommendation:** Combine with Fix 1 (update counts locally) + auto-navigate to green. Only call `fetchPhotos()` if user stays on page long-term (e.g., batch correction).

### Fix 4: Change Default Zone to 'amber' (OPTIONAL)

```typescript
// Line 412
const [zone, setZone] = useState<Zone>('amber');  // Focus on actionable items
```

**Impact:**
- ✅ Teachers start on photos needing review (not all photos)
- ✅ Green photos hidden by default
- ❌ Changes established UX (some users may prefer 'all')

---

## CODE CHANGES REQUIRED

File: `app/montree/dashboard/photo-audit/page.tsx`

### Change 1: handleConfirm (Line 620-646)
```diff
  const handleConfirm = async (photo: AuditPhoto) => {
    setProcessingId(photo.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: photo.id,
          child_id: photo.child_id,
          original_work_name: photo.work_name || '',
          original_work_id: photo.work_id || '',
          original_area: photo.area || '',
          original_confidence: photo.confidence || 0,
          action: 'confirm',
        }),
      });
      if (!res.ok) throw new Error('confirm failed');
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, zone: 'green' as const, confidence: 1.0 } : p
      ));
+     setCounts(prev => ({
+       ...prev,
+       [photo.zone]: Math.max(0, prev[photo.zone as keyof typeof prev] - 1),
+       green: prev.green + 1,
+     }));
      toast.success(t('audit.confirmed'));
+     setZone('green');  // Auto-navigate to green tab
    } catch {
      toast.error(t('audit.confirmFailed'));
    } finally {
      setProcessingId(null);
    }
  };
```

### Change 2: handleWorkSelected (Line 699-733)
```diff
  const handleWorkSelected = async (work: any, _status?: string, areaOverride?: string) => {
    if (!correctingPhoto) return;
    const effectiveArea = areaOverride || pickerArea;
    setProcessingId(correctingPhoto.id);
    try {
      const res = await fetch('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: correctingPhoto.id,
          child_id: correctingPhoto.child_id,
          original_work_name: correctingPhoto.work_name || 'Unknown',
          original_work_id: correctingPhoto.work_id || '',
          original_area: correctingPhoto.area || '',
          original_confidence: correctingPhoto.confidence || 0,
          corrected_work_name: work.name,
          corrected_work_id: work.id,
          corrected_area: effectiveArea,
        }),
      });
      if (!res.ok) throw new Error('correction failed');
      setPhotos(prev => prev.map(p =>
        p.id === correctingPhoto.id
          ? { ...p, work_id: work.id, work_name: work.name, area: effectiveArea, zone: 'green' as const, confidence: 1.0 }
          : p
      ));
+     setCounts(prev => ({
+       ...prev,
+       [correctingPhoto.zone]: Math.max(0, prev[correctingPhoto.zone as keyof typeof prev] - 1),
+       green: prev.green + 1,
+     }));
      toast.success(t('audit.corrected'));
+     setZone('green');  // Auto-navigate to green tab
    } catch {
      toast.error(t('audit.correctionFailed'));
    } finally {
      setProcessingId(null);
      setPickerArea('');
    }
    setCorrectingPhoto(null);
  };
```

### Change 3: handleBatchConfirm (Line 736-780)
```diff
  // Batch confirm — same pattern, update counts in loop
  // After line 764:
+ setCounts(prev => ({
+   ...prev,
+   [photo.zone]: Math.max(0, prev[photo.zone as keyof typeof prev] - 1),
+   green: prev.green + 1,
+ }));
```

---

## TESTING CHECKLIST

After fixes are applied:

- [ ] User on 'all' tab confirms AMBER photo
  - [ ] Photo zone updates to 'green'
  - [ ] Counts update: amber count decreases, green count increases
  - [ ] Auto-navigate to 'green' tab happens
  - [ ] Photo visible in 'green' tab

- [ ] User on 'amber' tab confirms AMBER photo
  - [ ] Photo disappears from 'amber' tab
  - [ ] Auto-navigate to 'green' tab happens
  - [ ] Photo visible in 'green' tab
  - [ ] 'amber' tab count decrements

- [ ] User batch confirms 5 AMBER photos on 'amber' tab
  - [ ] All 5 photos disappear
  - [ ] All counts update correctly
  - [ ] Auto-navigate to 'green' tab
  - [ ] All 5 photos visible in 'green' tab

- [ ] User corrects AMBER photo to different work on 'all' tab
  - [ ] Photo zone updates to 'green'
  - [ ] Counts update
  - [ ] Auto-navigate to 'green' tab
  - [ ] Photo shows corrected work name in 'green' tab

- [ ] Reload page after confirming photos
  - [ ] Server data matches client counts (no discrepancy)

---

## SUMMARY FOR NEXT SESSION

**What's Working:** Zone filtering, local state updates, zone tabs
**What's Broken:** Counts don't update, no auto-navigation, photos stay visible on 'all' tab
**Fix Priority:** Add `setCounts()` calls + auto-navigate to 'green' tab
**Time Estimate:** 30 minutes to implement + test

**Note:** This is not a critical bug (data is saved correctly), just a UX issue where visual feedback is missing.
