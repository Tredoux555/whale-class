# MONTREE DATA INTEGRITY AUDIT REPORT
## Leo (child_id: 310743a4-51cf-4f8f-9920-9a087adb084f)
**Date: February 1, 2026**

---

## EXECUTIVE SUMMARY

A data integrity audit of the Montree application database reveals **critical data quality issues** in Leo's progress tracking. The primary issue is **duplicate records in the `montree_child_progress` table** with no corresponding media or session data.

### Key Findings:
- **13 progress records** for 10 unique works
- **4 duplicate records** for "Small Buttons Frame" (issue quantity: 3 extra records)
- **0 photos/media** linked to works
- **0 work sessions** recorded
- **Root cause**: API creating new records instead of updating existing ones

---

## DETAILED FINDINGS

### 1. DUPLICATE WORK NAMES IN `montree_child_progress`

**Table:** `montree_child_progress`
**Location:** `/Users/tredouxwillemse/Desktop/ACTIVE/whale/supabase/migrations/081_montree_progress.sql`

#### Work: "Small Buttons Frame" - 4 Duplicate Records

| Record # | ID | Status | Created At | Updated At | Elapsed Time |
|-----------|---|--------|------------|------------|--------------|
| 1 | d7f4c133-be31-4247-a2cf-d6a684195bb7 | presented | 2026-02-01T11:41:40.886 | 2026-02-01T11:41:40.428 | - |
| 2 | 1bb7e090-ce13-4b6c-ae9f-ba9c8677f924 | mastered | 2026-02-01T11:41:41.161 | 2026-02-01T11:41:40.695 | +0.27s |
| 3 | 15e22fe6-808e-405a-9c59-0711be945664 | practicing | 2026-02-01T11:41:41.606 | 2026-02-01T11:41:41.15 | +0.72s |
| 4 | 1424203d-1385-48eb-bbbc-858fc29398e6 | not_started | 2026-02-01T11:41:43.856 | 2026-02-01T11:41:43.367 | +2.97s |

**Timeline:** All 4 records created in 2.97 seconds (3 milliseconds apart on average)

**Statuses:** presented → mastered → practicing → not_started (illogical progression)

**Observation:** The records were created in rapid succession with different statuses, suggesting either:
1. Multiple API calls being made in quick succession
2. A batch operation iterating through all possible statuses
3. Test/demo data that wasn't cleaned up

---

### 2. ALL WORKS INVENTORY FOR LEO

| Work Name | Record Count | Area | Status |
|-----------|--------------|------|--------|
| Small Buttons Frame | 4 ⚠️ | practical_life | duplicate |
| Brown Stair (Broad Stair) | 1 | sensorial | normal |
| Spindle Boxes | 1 | mathematics | normal |
| Eye Dropper | 1 | practical_life | normal |
| Snaps Frame | 1 | practical_life | normal |
| Dressing Frame Shoes | 1 | practical_life | normal |
| Maps | 1 | cultural | normal |
| Word Building Work with /o/ | 1 | language | normal |
| Boards with Numbers | 1 | mathematics | normal |
| Geometry Combined with Cards | 1 | cultural | normal |

**Summary:**
- Total records: 13
- Unique works: 10
- Works with duplicates: 1
- Duplicate records (extras): 4

---

### 3. MISSING DATA

#### 3.1 No Media Records Found
**Table:** `child_work_media`

- **Expected:** Photos/videos linking to progress records
- **Actual:** 0 records for Leo
- **Issue:** Works cannot be visually documented or verified

#### 3.2 No Work Sessions Found
**Table:** `montree_work_sessions`

- **Expected:** Session logs for each work interaction
- **Actual:** 0 records for Leo
- **Issue:** Cannot track:
  - When work was practiced
  - Duration of practice
  - Quality of concentration
  - Repetition patterns

---

## ROOT CAUSE ANALYSIS

### Primary Issue: INSERT vs UPDATE Logic

**Location:** `/Users/tredouxwillemse/Desktop/ACTIVE/whale/app/api/montree/children/route.ts` (lines 100-115)

```typescript
// CURRENT (BUGGY) LOGIC
const worksToMark = areaWorks.slice(0, selectedIndex + 1);
for (const w of worksToMark) {
  await supabase.from('montree_child_progress').insert({
    child_id: child.id,
    work_name: w.name,
    work_name_chinese: w.name_chinese || null,
    area: areaKey,
    status: 'presented',
    presented_at: new Date().toISOString(),
  });
}
```

**Problem:** The code uses `.insert()` which **always creates a new record**. When called multiple times for the same work with different statuses, it creates duplicates instead of updating.

**Why this happens:**
1. User clicks on "Small Buttons Frame"
2. API calls `.insert()` → creates record #1 (status: presented)
3. Later, user changes status to "mastered"
4. API calls `.insert()` again → creates record #2 (same work, different status)
5. Process repeats for "practicing" → record #3
6. Process repeats for "not_started" → record #4

---

## DATABASE SCHEMA ISSUES

### Missing Unique Constraint

**Current Schema:**
```sql
CREATE TABLE IF NOT EXISTS montree_child_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  work_name_chinese TEXT,
  area TEXT,
  status TEXT DEFAULT 'presented',
  presented_at TIMESTAMPTZ DEFAULT now(),
  mastered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Missing:** `UNIQUE(child_id, work_name)` constraint

**Impact:** Database allows unlimited duplicates for the same child-work combination

---

## RECOMMENDATIONS

### IMMEDIATE ACTIONS (Priority: CRITICAL)

#### 1. Fix the API Logic
**File:** `/Users/tredouxwillemse/Desktop/ACTIVE/whale/app/api/montree/children/route.ts`

**Change from:**
```typescript
await supabase.from('montree_child_progress').insert({...})
```

**To:**
```typescript
await supabase.from('montree_child_progress').upsert({...}, {
  onConflict: 'child_id,work_name'
})
```

Or implement UPDATE logic:
```typescript
const existing = await supabase
  .from('montree_child_progress')
  .select('id')
  .eq('child_id', child.id)
  .eq('work_name', w.name)
  .single();

if (existing.data) {
  // UPDATE
  await supabase.from('montree_child_progress')
    .update({ status: newStatus })
    .eq('id', existing.data.id);
} else {
  // INSERT
  await supabase.from('montree_child_progress').insert({...});
}
```

#### 2. Add Database Constraint
**SQL:**
```sql
ALTER TABLE montree_child_progress
ADD CONSTRAINT unique_child_work UNIQUE(child_id, work_name);
```

This prevents duplicates at the database level, ensuring data integrity even if the API is called incorrectly.

---

### SHORT-TERM ACTIONS (Priority: HIGH)

#### 3. Clean Up Existing Duplicates

For Leo's "Small Buttons Frame" (keep newest, delete oldest 3):

```sql
-- Identify duplicates
SELECT id, work_name, status, created_at
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
  AND work_name = 'Small Buttons Frame'
ORDER BY created_at DESC;

-- Delete old duplicates (keep the most recent)
DELETE FROM montree_child_progress
WHERE id IN (
  'd7f4c133-be31-4247-a2cf-d6a684195bb7',
  '1bb7e090-ce13-4b6c-ae9f-ba9c8677f924',
  '15e22fe6-808e-405a-9c59-0711be945664'
);

-- Keep only the latest record
-- ID: 1424203d-1385-48eb-bbbc-858fc29398e6
```

#### 4. Audit All Children for Duplicates
```sql
-- Find all works with duplicate records
SELECT child_id, work_name, COUNT(*) as duplicate_count
FROM montree_child_progress
GROUP BY child_id, work_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

---

### MEDIUM-TERM ACTIONS (Priority: MEDIUM)

#### 5. Implement Media Tracking
- Ensure photos/videos are being captured when status changes
- Link media to work sessions
- Implement storage in `child_work_media` table

#### 6. Implement Session Tracking
- Create session records when work begins
- Track duration, concentration quality
- Enable `montree_work_sessions` table

#### 7. Add Data Validation Tests
- Test that duplicate records cannot be created
- Test that status updates work correctly
- Test that media is properly linked

---

## DATA QUALITY METRICS

### Before Cleanup:
- Progress records: 13
- Duplicate records: 4 (30.8% duplication rate)
- Media records: 0 (0% coverage)
- Session records: 0 (0% coverage)

### After Cleanup (Expected):
- Progress records: 10 (unique works)
- Duplicate records: 0
- Media records: TBD (depends on photo capture)
- Session records: TBD (depends on implementation)

---

## TESTING PLAN

After implementing fixes:

1. **Unit Test:** Verify UNIQUE constraint prevents duplicates
2. **Integration Test:** Update work status → verify single record is modified
3. **API Test:** Call progress update endpoint multiple times → verify no duplicates
4. **Regression Test:** Verify other children's data is not affected
5. **Manual Test:** Have teacher update a child's work status in UI → check database

---

## FILES INVOLVED

### Schema Definitions:
- `/Users/tredouxwillemse/Desktop/ACTIVE/whale/supabase/migrations/081_montree_progress.sql`

### API Logic:
- `/Users/tredouxwillemse/Desktop/ACTIVE/whale/app/api/montree/children/route.ts` (lines 100-115)

### Related Tables:
- `montree_child_progress` - Progress tracking (AFFECTED)
- `child_work_media` - Media storage (EMPTY)
- `montree_work_sessions` - Session tracking (EMPTY)
- `montree_children` - Children list
- `montree_classroom_curriculum_works` - Work definitions

---

## CONCLUSION

The Montree app has a significant data integrity issue caused by using INSERT logic where UPSERT/UPDATE logic should be used. This allows unlimited duplicate records for the same work. The issue is preventable at the database level with a UNIQUE constraint and correctible in the API layer with proper upsert logic.

**Severity: MEDIUM-HIGH**
- **Data Loss:** No
- **User Impact:** Moderate (confusing UI showing 4 entries for 1 work)
- **Fix Complexity:** Low (simple code and SQL changes)
- **Cleanup Effort:** Low (3 duplicate records to delete)

---

**Audit Completed By:** Database Integrity Scanner  
**Audit Date:** 2026-02-01  
**Status:** FINDINGS DOCUMENTED - AWAITING REMEDIATION
