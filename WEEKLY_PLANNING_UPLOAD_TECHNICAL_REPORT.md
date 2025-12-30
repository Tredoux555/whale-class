# Weekly Planning Upload - Technical Report for Opus

**Date:** December 30, 2025  
**Status:** Implementation Complete - Ready for Testing  
**Author:** AI Assistant

---

## Executive Summary

This report documents the implementation and debugging setup for the Weekly Planning Upload functionality. A new upload route has been created with extensive debug logging to identify why assignments aren't being created when uploading Word documents.

**Key Findings:**
- ✅ Upload route created at `/app/api/weekly-planning/upload/route.ts`
- ✅ Debug logging added throughout the assignment creation process
- ⚠️ Production site has different implementation (Chinese translation, auto week detection)
- ⚠️ Suspected issue: Area field mapping (`math` vs `mathematics`)

---

## 1. Implementation Details

### 1.1 Files Created

#### `/app/api/weekly-planning/upload/route.ts`
- **Purpose:** Handle Word document uploads and create weekly assignments
- **Dependencies:** `mammoth` (for docx parsing), `@/lib/auth`, `@/lib/supabase`
- **Endpoint:** `POST /api/weekly-planning/upload`
- **Features:**
  - File validation (.docx/.doc only)
  - Document text extraction using mammoth
  - Plan parsing (children names, works, areas)
  - Assignment creation in `child_work_completion` table
  - Extensive debug logging

#### `/app/admin/weekly-planning/page.tsx` (Modified)
- **Changes:** Added upload button and file input handler
- **Location:** Upload button in controls section, next to week selector
- **UI Features:**
  - Upload button: "📤 Upload Plan"
  - Success/error message display
  - Automatic data refresh after upload

### 1.2 Dependencies Added

```json
{
  "mammoth": "^1.x.x"  // Installed for docx parsing
}
```

---

## 2. Debug Logging Implementation

### 2.1 Logging Points Added

The `createAssignments` function includes comprehensive logging at every step:

#### A. Initial Setup
```typescript
console.log('[createAssignments] Starting assignment creation...');
console.log('[createAssignments] Plan week:', plan.weekStart, 'to', plan.weekEnd);
console.log('[createAssignments] Children in plan:', plan.children.length);
```

#### B. Database Queries
```typescript
// All children from DB
console.log('[createAssignments] All children from DB:', JSON.stringify(dbChildren, null, 2));
console.log('[createAssignments] Total children in DB:', dbChildren?.length || 0);

// Child name mapping
console.log('[createAssignments] Child name map:', Array.from(childMap.entries()));

// All curriculum works
console.log('[createAssignments] Total works in DB:', works?.length || 0);
console.log('[createAssignments] Work name map sample (first 10):', ...);

// Area mapping
console.log('[createAssignments] Area mapping:', Array.from(areaNameMap.entries()));
```

#### C. Per-Child Processing
```typescript
console.log(`[createAssignments] Processing child: "${planChild.name}"`);
console.log(`[createAssignments] Parsed childName: "${planChild.name}"`);
console.log(`[createAssignments] Found child ID: ${childId} for "${planChild.name}"`);
```

#### D. Per-Work Processing
```typescript
console.log(`[createAssignments] Processing work: "${work.workName}" in area: "${work.area}"`);
console.log(`[createAssignments] Found work by partial match: "${name}" -> ${workId.id}`);
console.log(`[createAssignments] Using work's area_id: ${areaId}`);
console.log(`[createAssignments] Mapped 'math' to 'mathematics', areaId: ${areaId}`);
```

#### E. Assignment Object Before Insert
```typescript
console.log(`[createAssignments] Assignment object before insert:`, JSON.stringify(assignment, null, 2));
```

#### F. Insert Results
```typescript
// Success
console.log(`[createAssignments] ✅ Assignment created successfully:`, assignmentData);

// Errors with full details
console.error(`[createAssignments] ${errorMsg}`);
console.error(`[createAssignments] Full Supabase error:`, JSON.stringify(insertError, null, 2));
console.error(`[createAssignments] Assignment data that failed:`, JSON.stringify(assignment, null, 2));

// Constraint violations
if (insertError.code === '23505') {
  console.error(`[createAssignments] Constraint violation (duplicate): ${insertError.message}`);
} else if (insertError.code === '23503') {
  console.error(`[createAssignments] Foreign key violation: ${insertError.message}`);
} else if (insertError.code === '23514') {
  console.error(`[createAssignments] Check constraint violation: ${insertError.message}`);
}
```

#### G. Summary
```typescript
console.log('[createAssignments] Summary:', { created, failed, errors: errors.length });
```

### 2.2 Document Parsing Logs

```typescript
console.log('[Weekly Planning Upload] Starting upload:', { filename, size, weekStart });
console.log('[Weekly Planning Upload] Parsing docx...');
console.log('[Weekly Planning Upload] Extracted text length:', text.length);
console.log('[Weekly Planning Upload] First 500 chars:', text.substring(0, 500));
console.log('[Weekly Planning Upload] Parsed plan:', JSON.stringify(plan, null, 2));
```

---

## 3. Database Schema Expectations

### 3.1 Tables Used

#### `children`
- **Fields:** `id` (UUID), `name` (TEXT), `active_status` (BOOLEAN)
- **Query:** `SELECT id, name FROM children WHERE active_status = true`

#### `curriculum_roadmap`
- **Fields:** `id` (UUID), `name` (TEXT), `work_name` (TEXT), `area_id` (UUID)
- **Query:** `SELECT id, name, work_name, area_id FROM curriculum_roadmap`

#### `curriculum_areas`
- **Fields:** `id` (UUID), `name` (TEXT)
- **Query:** `SELECT id, name FROM curriculum_areas`
- **Purpose:** Map area names to area IDs

#### `child_work_completion`
- **Fields:**
  - `child_id` (UUID, FK → children)
  - `curriculum_work_id` (UUID, FK → curriculum_roadmap)
  - `status` (TEXT: 'presented', 'practicing', 'mastered', 'in_progress')
  - `started_at` (DATE)
  - `current_level` (INTEGER)
  - `notes` (TEXT)
- **Insert:** Creates new assignment records

#### `weekly_plans` (Optional)
- **Note:** Code attempts to save plan metadata here, but table may not exist
- **Fields Expected:** `week_start`, `week_end`, `plan_data`, `created_at`
- **Behavior:** If table doesn't exist, logs warning and continues

---

## 4. Area Field Mapping Issue

### 4.1 Suspected Problem

The database constraint expects area values like `'mathematics'`, but the code might be sending `'math'`.

### 4.2 Mapping Logic

```typescript
const areaMap: Record<string, string> = {
  'practical life': 'practical_life',
  'practical-life': 'practical_life',
  'practical_life': 'practical_life',
  'sensorial': 'sensorial',
  'math': 'mathematics',           // ⚠️ Maps to 'mathematics'
  'mathematics': 'mathematics',
  'language': 'language',
  'cultural': 'cultural',
  'culture': 'cultural',
};
```

### 4.3 Additional Mapping in createAssignments

```typescript
// Normalize area: check if it's 'math' vs 'mathematics'
if (work.area === 'math' && !areaId) {
  areaId = areaNameMap.get('mathematics');
  console.log(`[createAssignments] Mapped 'math' to 'mathematics', areaId: ${areaId}`);
}
```

### 4.4 Expected Database Values

The `curriculum_areas` table should have:
- `name: 'Practical Life'` → `id: <uuid>`
- `name: 'Sensorial'` → `id: <uuid>`
- `name: 'Mathematics'` → `id: <uuid>` (NOT 'Math')
- `name: 'Language'` → `id: <uuid>`
- `name: 'Cultural'` → `id: <uuid>`

**Check:** Verify that area names in the database match exactly (case-sensitive matching in `areaNameMap`).

---

## 5. Testing Instructions

### 5.1 Prerequisites

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:**
   ```
   http://localhost:3000/admin/weekly-planning
   ```

3. **Prepare test file:**
   - File: `Week 17 Montessori Plan.docx`
   - Location: `~/iCloud/Week 17/` (or your local path)

### 5.2 Test Steps

1. **Open browser DevTools:**
   - Press `F12` or `Cmd+Option+I`
   - Go to **Network** tab
   - Filter: `weekly-planning`

2. **Upload file:**
   - Click "📤 Upload Plan" button
   - Select `Week 17 Montessori Plan.docx`
   - Wait for upload to complete

3. **Monitor terminal:**
   - Watch `npm run dev` terminal output
   - Look for all `[createAssignments]` and `[Weekly Planning Upload]` logs

4. **Check Network tab:**
   - Find `/api/weekly-planning/upload` request
   - Check **Status Code** (should be 200)
   - Check **Response** tab for JSON

### 5.3 What to Look For

#### ✅ Success Indicators:
- Terminal shows: `[createAssignments] ✅ Assignment created successfully`
- Response shows: `{ "success": true, "assignments": { "created": X, "failed": 0 } }`
- UI shows green success message

#### ❌ Error Indicators:
- Terminal shows: `[createAssignments] Constraint violation`
- Terminal shows: `[createAssignments] Foreign key violation`
- Terminal shows: `[createAssignments] Work not found`
- Terminal shows: `[createAssignments] Child not found`
- Response shows: `{ "error": "...", "assignments": { "created": 0, "failed": X } }`

### 5.4 Key Debug Information to Capture

1. **All children from DB:**
   ```
   [createAssignments] All children from DB: [...]
   ```

2. **Each parsed child name:**
   ```
   [createAssignments] Parsed childName: "ChildName"
   ```

3. **Each assignment object before insert:**
   ```
   [createAssignments] Assignment object before insert: {...}
   ```

4. **Any Supabase errors:**
   ```
   [createAssignments] Full Supabase error: {...}
   ```

5. **Summary:**
   ```
   [createAssignments] Summary: { created: X, failed: Y, errors: [...] }
   ```

---

## 6. Production vs Local Differences

### 6.1 Production Site (`teacherpotato.xyz`)

**Features:**
- ✅ Chinese document support
- ✅ Auto week number detection
- ✅ Translation functionality
- ✅ Calls `/api/weekly-planning/list` endpoint
- ✅ More sophisticated UI with drag-and-drop

**UI Text:**
- "Drop your Chinese weekly plan - week number auto-detected from document"
- "Reading week number, translating works, matching to curriculum"

### 6.2 Local Implementation

**Features:**
- ✅ Basic docx parsing (English only)
- ✅ Manual week selection
- ✅ Simple upload button
- ✅ Debug logging throughout

**Missing:**
- ❌ Chinese translation
- ❌ Auto week detection
- ❌ `/api/weekly-planning/list` endpoint
- ❌ Advanced document parsing

**Conclusion:** Production has a more advanced implementation. The local version is a basic implementation focused on debugging the assignment creation issue.

---

## 7. Known Issues & Limitations

### 7.1 Document Parsing

**Current Implementation:**
- Simple line-by-line parsing
- Heuristic child name detection: `/^[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/`
- Basic area detection from line content

**Limitations:**
- May not handle complex document formats
- Child name matching is case-sensitive
- Work name matching uses partial matching (may have false positives)

### 7.2 Area Mapping

**Potential Issues:**
- Database area names must match exactly (case-sensitive)
- `'math'` vs `'mathematics'` mapping may fail if database has different naming
- Area ID lookup depends on `curriculum_areas.name` matching

### 7.3 Work Matching

**Current Logic:**
1. Exact match (case-insensitive)
2. Partial match (contains)
3. Reverse partial match (work name contains parsed name)

**Limitations:**
- May match wrong works if names are similar
- No fuzzy matching
- No confidence scoring

### 7.4 Error Handling

**Current Behavior:**
- Continues processing even if some assignments fail
- Collects all errors and returns summary
- Logs detailed error information

**Missing:**
- No retry logic
- No validation of document structure before processing
- No rollback on partial failures

---

## 8. Expected Error Scenarios

### 8.1 Child Not Found

**Error Message:**
```
Child not found: "ChildName"
```

**Possible Causes:**
- Child name in document doesn't match database (case, spelling, spacing)
- Child is inactive (`active_status = false`)
- Child name has special characters

**Debug Info:**
- Check `[createAssignments] All children from DB` log
- Compare parsed name with database names

### 8.2 Work Not Found

**Error Message:**
```
Work not found: "WorkName" for child "ChildName"
```

**Possible Causes:**
- Work name in document doesn't match `curriculum_roadmap.name` or `work_name`
- Work doesn't exist in database
- Partial matching failed

**Debug Info:**
- Check `[createAssignments] Work name map sample` log
- Verify work exists in `curriculum_roadmap` table

### 8.3 Constraint Violation (23505)

**Error Message:**
```
Constraint violation (duplicate): ...
```

**Possible Causes:**
- Assignment already exists for this child/work/week
- Unique constraint on `(child_id, curriculum_work_id, started_at)` or similar

**Debug Info:**
- Check existing assignments in `child_work_completion`
- Verify if upsert logic is needed instead of insert

### 8.4 Foreign Key Violation (23503)

**Error Message:**
```
Foreign key violation: ...
```

**Possible Causes:**
- `child_id` doesn't exist in `children` table
- `curriculum_work_id` doesn't exist in `curriculum_roadmap` table
- Referenced record was deleted

**Debug Info:**
- Verify child/work IDs are valid UUIDs
- Check if records exist in referenced tables

### 8.5 Check Constraint Violation (23514)

**Error Message:**
```
Check constraint violation: ...
```

**Possible Causes:**
- `status` value doesn't match allowed values
- `current_level` is out of range
- Date format is invalid

**Debug Info:**
- Check assignment object before insert
- Verify status is one of: `'presented'`, `'practicing'`, `'mastered'`, `'in_progress'`

---

## 9. Next Steps

### 9.1 Immediate Actions

1. **Test upload with Week 17 document:**
   - Follow testing instructions (Section 5)
   - Capture all terminal output
   - Capture network response
   - Document any errors

2. **Analyze debug logs:**
   - Compare parsed child names with database
   - Compare parsed work names with database
   - Check area mapping results
   - Identify exact error messages

3. **Fix identified issues:**
   - Update area mapping if needed
   - Fix child/work name matching
   - Handle constraint violations appropriately

### 9.2 Future Enhancements

1. **Improve document parsing:**
   - Support structured Word documents (tables, sections)
   - Better child name detection
   - Work name normalization

2. **Add Chinese support:**
   - Translation API integration
   - Chinese document parsing
   - Bilingual work name matching

3. **Auto week detection:**
   - Extract week number from document
   - Parse dates from document
   - Validate week range

4. **Add list endpoint:**
   - Create `/api/weekly-planning/list`
   - Return uploaded plans
   - Show plan status and assignment counts

---

## 10. Code Locations

### 10.1 Upload Route
```
/app/api/weekly-planning/upload/route.ts
```

### 10.2 UI Component
```
/app/admin/weekly-planning/page.tsx
```

### 10.3 Related Routes
```
/app/api/admin/weekly-planning/route.ts          # GET children with works
/app/api/admin/weekly-planning/status/route.ts  # POST update work status
```

---

## 11. Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` (via Supabase client)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 12. Dependencies

### 12.1 New Dependency
```json
{
  "mammoth": "^1.x.x"
}
```

**Purpose:** Parse .docx files and extract text content

**Installation:**
```bash
npm install mammoth
```

---

## 13. Testing Checklist

- [ ] Dev server starts without errors
- [ ] Page loads at `/admin/weekly-planning`
- [ ] Upload button is visible and clickable
- [ ] File input accepts .docx files
- [ ] Upload triggers API call to `/api/weekly-planning/upload`
- [ ] Terminal shows debug logs
- [ ] Network tab shows request/response
- [ ] Success message appears on successful upload
- [ ] Error message appears on failed upload
- [ ] Assignments appear in database after upload
- [ ] Assignments visible in weekly planning UI

---

## 14. Contact & Support

For issues or questions:
1. Check terminal logs for `[createAssignments]` and `[Weekly Planning Upload]` prefixes
2. Review Network tab for API response details
3. Verify database records in `child_work_completion` table
4. Compare parsed names with database records

---

**End of Report**

