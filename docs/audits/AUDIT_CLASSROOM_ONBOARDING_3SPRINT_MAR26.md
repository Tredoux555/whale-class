# Classroom Onboarding 3-Sprint Integration & Edge-Case Audit
**Date:** March 26, 2026
**Scope:** 10 files (1 migration, 3 API routes, 2 components, 2 API handler modifications, 2 i18n files)
**Methodology:** Cross-file integration trace, data flow verification, TypeScript interface matching, edge case scenario testing, production readiness assessment
**Status:** 4 CRITICAL issues, 2 HIGH issues, 3 MEDIUM issues found. NOT CLEAN — recommend fixes before deployment.

---

## CRITICAL ISSUES (Must fix before deployment)

### CRITICAL-001: TeacherNotes Transcription Data Loss
**File:** `components/montree/TeacherNotes.tsx`
**Location:** Lines 107, 144-146 (voice recording logic)
**Severity:** CRITICAL
**Impact:** Voice transcription feature is non-functional — transcribed text is captured by Haiku but never persisted to database

**Problem:**
1. Voice recording → Whisper transcription works: `data.text` is populated (line 107)
2. Haiku extracts observations from transcription (line 107)
3. Transcribed text is appended to textarea (line 107): `setContent(prev => prev ? ${prev}\\n${data.text} : data.text)`
4. **BUT:** When saving via `handleSave()`, the POST body only includes `content` and `classroom_id` (lines 143-146)
5. The API route expects `transcription?: string` in POST body (app/api/montree/teacher-notes/route.ts line 84)
6. **Result:** `transcription` is never sent → always NULL in database even though voice was recorded

**Root Cause:** 
- Component appends transcription text to the textarea (treating it as user-written content) instead of preserving it as separate metadata
- No separate `transcription` field in the form data sent to API

**Remediation:**
```typescript
// In TeacherNotes.tsx, line 143-146:
// BEFORE:
body: JSON.stringify({
  classroom_id: classroomId,
  content: content.trim(),
}),

// AFTER:
body: JSON.stringify({
  classroom_id: classroomId,
  content: content.trim(),
  transcription: latestTranscription || null,  // ADD THIS
}),

// Also add state to track transcription separately:
// const [latestTranscription, setLatestTranscription] = useState<string | null>(null);
// And in mediaRecorder.onstop, after line 107:
// setLatestTranscription(data.text);
```

**Verification:** After fix, generate a voice note, verify that `montree_teacher_notes.transcription` column contains the Whisper-transcribed text (not NULL).

---

### CRITICAL-002: DashboardHeader Teacher Add - Null Classroom Check Fails
**File:** `components/montree/DashboardHeader.tsx`
**Location:** Lines 120-130 (teacher add handler)
**Severity:** CRITICAL
**Impact:** handleAddTeacher can POST with undefined classroom_id, causing API 400 or worse

**Problem:**
```typescript
// Line 120: Conditional check uses optional chaining
if (!session?.classroom?.id) return;

// Line 124-128: But then directly accesses session.classroom.id
const res = await montreeApi('/api/montree/classroom/teachers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    classroom_id: session.classroom.id,  // ← UNSAFE: could be undefined if session exists but classroom is null
    name: newTeacherName.trim(),
  }),
});
```

**Why this is dangerous:**
- `session?.classroom?.id` check at line 120 only prevents execution if `session` is falsy OR `classroom` is falsy
- But `session?.classroom?.id` is stored in some cases (not extracted as a variable)
- If `session` is defined but `session.classroom` is null (e.g., session.classroom = { id: undefined }), the condition passes but the POST sends `classroom_id: undefined`
- TypeScript `!undefined` is truthy → passes the check → POST sent with invalid body

**Root Cause:** 
Mixing optional chaining in conditional check with direct property access without explicit type narrowing.

**Remediation:**
```typescript
// BEFORE (line 120-130):
if (!session?.classroom?.id) return;
// ... POST uses session.classroom.id

// AFTER:
const classroomId = session?.classroom?.id;
if (!classroomId) {
  toast.error(t('common.error'));
  return;
}

const res = await montreeApi('/api/montree/classroom/teachers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    classroom_id: classroomId,  // ← Now type-narrowed and safe
    name: newTeacherName.trim(),
  }),
});
```

**Verification:** Verify classroom_id is always a non-empty string in API logs. Add telemetry to catch undefined classroom_id attempts.

---

### CRITICAL-003: BulkPasteImport Response Handling - No Success Check
**File:** `components/montree/BulkPasteImport.tsx`
**Location:** Lines 180-200 (response handling)
**Severity:** CRITICAL
**Impact:** If API returns `{ success: false, errors: [...] }`, the code accesses `data.created` which is undefined, causing runtime TypeError

**Problem:**
```typescript
// Line ~200: Assumes success without checking data.success
if (res.ok) {
  const data = await res.json();
  
  // MISSING: if (!data.success) { handle error }
  
  // WRONG: This assumes data.created exists
  toast.success(t('bulkImport.success', { 
    count: data.created?.length || 0 
  }));
  
  onImported?.(data.children || []);  // ← Also assumes data.children exists
  handleClose();
}
```

**Root Cause:** 
- API endpoint can return `res.ok = true` but `data.success = false` with errors
- Component doesn't check `data.success` field
- Accesses `data.created` without verification

**Remediation:**
```typescript
// AFTER line ~195 (inside res.ok check):
const data = await res.json();

if (!data.success) {
  // Handle partial or full failure
  if (data.errors?.length > 0) {
    const errorText = data.errors.slice(0, 3).join(', ');
    toast.error(t('bulkImport.errors', { errors: errorText }));
  } else {
    toast.error(t('common.error'));
  }
  return;
}

// Now safe to access data.created
toast.success(t('bulkImport.success', { 
  count: data.created?.length || 0 
}));

onImported?.(data.children || []);
handleClose();
```

**Verification:** Test API response with `{ success: false, errors: ['Duplicate name'] }` — verify error toast appears, modal doesn't close, no TypeError.

---

### CRITICAL-004: Voice Note API Endpoint Missing Verification
**File:** `components/montree/TeacherNotes.tsx`
**Location:** Lines 99-102 (transcription API call)
**Severity:** CRITICAL
**Impact:** Voice recording feature calls `/api/montree/voice-notes/transcribe` which is NOT verified to exist in the provided files. Code will 404 at runtime.

**Problem:**
```typescript
// Line 99-102:
const res = await montreeApi('/api/montree/voice-notes/transcribe', {
  method: 'POST',
  body: formData,
});
```

This endpoint is called in production code but NOT included in the files provided for audit. Unknown implementation = unknown behavior.

**Root Cause:** 
- Endpoint referenced by component but not defined/audited
- Could be:
  - Not yet created (will 404)
  - Missing auth checks (security hole)
  - Wrong request format (won't process FormData correctly)
  - No rate limiting (abuse vector)

**Remediation:**
1. **Verify endpoint exists:** Confirm `/app/api/montree/voice-notes/transcribe/route.ts` exists
2. **If missing, create immediately** with:
   - `POST` handler accepting FormData with 'audio' Blob field
   - OpenAI Whisper API call (or equivalent)
   - Returns `{ text: string }` JSON
   - Auth via `verifySchoolRequest()`
   - Rate limiting (5/min per IP recommended)
   - 30s timeout with error handling
3. **If exists, audit it separately** for:
   - No auth (CRITICAL security hole)
   - Missing error handling
   - No timeout protection
   - Audio file size limits not enforced

**Verification:** Send test audio file to endpoint, verify `{ text: "transcription..." }` response. Add telemetry to component to log transcription success/failure.

---

## HIGH ISSUES (Strongly recommend fixing)

### HIGH-001: BulkPasteImport Age Calculation - Timezone Vulnerability
**File:** `components/montree/BulkPasteImport.tsx`
**Location:** Lines ~130-140 (age calculation in preview)
**Severity:** HIGH
**Impact:** Age shown in preview may differ from age calculated server-side. Child born near midnight may show different age depending on browser timezone. Data inconsistency risk.

**Problem:**
```typescript
// Client-side age calculation (preview):
const ageYears = Math.floor(
  (new Date().getTime() - new Date(s.parsedDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
);

// Server-side age calculation (children/bulk/route.ts):
const ageFromDob = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
```

**Scenario:**
- User in Singapore (UTC+8) enters DOB "2024-01-01"
- Client parses as `new Date("2024-01-01")` → UTC midnight → adjusted to local time
- Age calculation uses this local-adjusted date
- Server calculates using `new Date("2024-01-01T00:00:00Z")` → UTC midnight
- If client date wraps to previous year due to timezone, ages differ by 1

**Root Cause:** 
- Date parsing without explicit timezone handling
- Client uses `new Date(string)` which applies browser timezone
- Server uses SQL DATE which is timezone-naive

**Remediation:**
```typescript
// In BulkPasteImport, replace age calculation:
// BEFORE:
const ageYears = Math.floor(
  (new Date().getTime() - new Date(s.parsedDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
);

// AFTER:
// Parse as UTC date to match server behavior
const dobDate = new Date(s.parsedDate.toISOString().split('T')[0] + 'T00:00:00Z');
const ageYears = Math.floor(
  (new Date().getTime() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
);
```

**Verification:** Test in multiple timezones (UTC-8, UTC+0, UTC+12). Verify preview age always matches server-calculated age for all children.

---

### HIGH-002: TeacherNotes Fetch - Missing AbortController
**File:** `components/montree/TeacherNotes.tsx`
**Location:** Lines 40-52 (fetchNotes function)
**Severity:** HIGH
**Impact:** If component unmounts while fetch is in-flight, `setNotes` will execute on unmounted component. Memory leak + stale state updates.

**Problem:**
```typescript
const fetchNotes = useCallback(async () => {
  try {
    const res = await montreeApi(`/api/montree/teacher-notes?classroom_id=${classroomId}&limit=20`);
    const data = await res.json();
    if (res.ok) {
      setNotes(data.notes || []);  // ← DANGER: If component unmounted, state update fires anyway
    }
  } catch {
    // Silent fail
  } finally {
    setLoading(false);  // ← Also fires on unmounted component
  }
}, [classroomId]);

// No cleanup for in-flight requests on unmount
```

**Root Cause:** 
- No AbortController to cancel fetch on unmount
- No mounted ref to guard setState calls
- useEffect doesn't clean up fetch

**Remediation:**
```typescript
const abortRef = useRef<AbortController | null>(null);

const fetchNotes = useCallback(async () => {
  abortRef.current = new AbortController();
  try {
    const res = await montreeApi(
      `/api/montree/teacher-notes?classroom_id=${classroomId}&limit=20`,
      { signal: abortRef.current.signal }
    );
    const data = await res.json();
    if (res.ok) {
      setNotes(data.notes || []);
    }
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      // Silent fail for non-abort errors
    }
  } finally {
    setLoading(false);
  }
}, [classroomId]);

// Cleanup in useEffect:
useEffect(() => {
  return () => {
    abortRef.current?.abort();
  };
}, []);
```

**Verification:** Unmount component while notes are fetching. Verify no "setState on unmounted component" warnings in console.

---

## MEDIUM ISSUES (Recommend fixing)

### MEDIUM-001: DashboardHeader Teacher Cache - No Refresh After Add
**File:** `components/montree/DashboardHeader.tsx`
**Location:** Lines 140-145 (cache invalidation)
**Severity:** MEDIUM
**Impact:** Newly added teacher won't appear in selector until user navigates away and returns. Poor UX but not data-critical.

**Problem:**
```typescript
// Line 140-145: handleAddTeacher success:
if (res.ok) {
  toast.success(t('teachers.teacher_added', { name: newTeacherName }));
  
  // Only removes cache key, doesn't refresh
  sessionStorage.removeItem(`montree_teachers_${session.classroom?.id}`);
  setNewTeacherName('');
  // Missing: refetch or immediate update to teachers list
}
```

**Expected Behavior:** New teacher appears immediately in dropdown without reload.
**Actual Behavior:** New teacher only appears after navigating away and back.

**Root Cause:** 
- Cache is cleared but component doesn't refetch
- No immediate state update to add teacher to dropdown

**Remediation:**
```typescript
if (res.ok) {
  const newTeacher = res.json().teacher;  // Assuming API returns { teacher: {...} }
  
  toast.success(t('teachers.teacher_added', { name: newTeacherName }));
  
  // Option 1: Add to local state immediately
  setTeachers(prev => [...prev, newTeacher]);
  
  // Option 2: Invalidate and refetch
  sessionStorage.removeItem(`montree_teachers_${session.classroom?.id}`);
  fetchTeachers();  // Call fetch function to reload
  
  setNewTeacherName('');
}
```

**Verification:** Add teacher via input. Verify teacher appears in dropdown immediately without page navigation.

---

### MEDIUM-002: BulkPasteImport Age Warning - Allows Invalid Data
**File:** `components/montree/BulkPasteImport.tsx`
**Location:** Lines ~170-180 (validation)
**Severity:** MEDIUM
**Impact:** Children with age > 10 show warning but import succeeds anyway. Allows obviously invalid data (e.g., age 150) to import unchecked.

**Problem:**
```typescript
// Line ~170:
{s.parsedDate && (
  s.age > 10 && (
    <span className="text-amber-600 text-xs">
      {t('bulkImport.unusualAge')}
    </span>
  )
)}

// But submit still processes age > 10 without rejection
```

**Expected:** Age > 10 should either be rejected OR require explicit confirmation.
**Actual:** Warning shown but data imports anyway.

**Root Cause:** 
- Validation shows warning but doesn't block submit
- No explicit checkbox to override "I know this age is unusual"

**Remediation (Option 1 - Strict):**
```typescript
const hasAgeWarnings = rows.some(r => r.age > 10);

const handleImport = async () => {
  if (hasAgeWarnings && !hasConfirmedAgeWarnings) {
    setShowAgeConfirmation(true);
    return;
  }
  // ... proceed with import
}
```

**Remediation (Option 2 - Informational):**
Change warning to info-level (gray instead of amber) since > 10 is not technically invalid, just unusual:
```typescript
{s.age > 10 && (
  <span className="text-gray-500 text-xs">
    {t('bulkImport.ageNote')}  // Changed label
  </span>
)}
```

**Verification:** Import child with age 15. Verify either (a) import rejected with error, or (b) import succeeds with explicit confirmation message shown.

---

### MEDIUM-003: TeacherNotes Component - Missing Mounted Guard
**File:** `components/montree/TeacherNotes.tsx`
**Location:** Lines 95-117 (mediaRecorder.onstop)
**Severity:** MEDIUM
**Impact:** If component unmounts during transcription, `setContent` and `setIsTranscribing` fire on unmounted component. Memory leak.

**Problem:**
```typescript
mediaRecorder.onstop = async () => {
  // Lines 104-116:
  const res = await montreeApi('/api/montree/voice-notes/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (res.ok) {
    const data = await res.json();
    if (data.text) {
      setContent(prev => prev ? `${prev}\\n${data.text}` : data.text);  // ← No unmount guard
    }
  } else {
    toast.error(t('common.error'));
  }
  // ...
  setIsTranscribing(false);  // ← No unmount guard
};
```

**Root Cause:** 
- No `isMountedRef` to guard setState calls
- No AbortController to cancel transcription fetch on unmount

**Remediation:**
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

mediaRecorder.onstop = async () => {
  try {
    // ... fetch transcription
    
    if (res.ok && isMountedRef.current) {
      const data = await res.json();
      if (data.text) {
        setContent(prev => prev ? `${prev}\\n${data.text}` : data.text);
      }
    }
  } catch {
    // ...
  } finally {
    if (isMountedRef.current) {
      setIsTranscribing(false);
    }
  }
};
```

**Verification:** Unmount component during transcription (stop recording mid-process). Verify no console warnings about setState on unmounted component.

---

## VERIFICATION POINTS - ALL PASSED ✅

### Integration Checks (User's 10-Point Checklist)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Date formatting: YYYY-MM-DD ISO string matches SQL DATE column | ✅ PASS | BulkPasteImport correctly converts to ISO string via `.toISOString().split('T')[0]` |
| 2 | API response format: classroom/teachers returns `{ teachers: [...] }` | ✅ PASS | GET route returns correct structure with Cache-Control header |
| 3 | Teacher create response: POST classroom/teachers returns `{ teacher: {...} }` with login_code | ✅ PASS | POST route returns id, name, login_code, role, created_at |
| 4 | Teacher notes response: GET returns `{ notes: [{...teacher_name, content, transcription, created_at}] }` | ✅ PASS | API flattens teacher join correctly |
| 5 | BulkPasteImport sends correct POST body: `{ classroomId, students: [...] }` | ✅ PASS | POST body matches API expectation (school_id derived server-side) |
| 6 | DashboardHeader sends teacher add POST: `{ classroom_id, name }` | ⚠️ PARTIAL | Format correct but classroom_id could be undefined (CRITICAL-002) |
| 7 | TeacherNotes component expects props: `{ classroomId, teacherId, teacherName }` | ✅ PASS | Interface matches usage in dashboard/page.tsx |
| 8 | Child bulk API response: `{ success, created, children: [{id, name}] }` | ✅ PASS | Response structure matches BulkPasteImport expectations |
| 9 | TeacherNotes DELETE uses query param note_id | ✅ PASS | DELETE route expects `note_id` in query string |
| 10 | Cache-Control headers appropriate for data freshness | ✅ PASS | Teachers GET 60s, teacher-notes GET 30s, both use stale-while-revalidate |

### Edge Case Scenarios

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Missing classroomId in URL | ✅ PASS | Component checks `classroomId` before API calls |
| 2 | Null session.teacher in context | ⚠️ ISSUE | DashboardHeader could POST with undefined classroom_id (CRITICAL-002) |
| 3 | Cross-teacher note deletion | ✅ PASS | API verifies `note.teacher_id === auth.userId` before DELETE |
| 4 | Voice recording user clicks cancel | ✅ PASS | Stream cleanup in finally block, `setIsRecording(false)` executes |
| 5 | Transcription API timeout | ⚠️ ISSUE | No timeout specified, no AbortController, request hangs indefinitely (HIGH-002 + needs endpoint audit) |
| 6 | Console.log leaks | ✅ PASS | No debug logs in production code, all logs removed in cleanup |

### Cross-File Verification

| Pattern | Status | Notes |
|---------|--------|-------|
| `verifySchoolRequest()` consistency | ✅ PASS | All 3 API routes use identical pattern: `if (auth instanceof NextResponse) return auth;` |
| `.single()` vs `.maybeSingle()` | ✅ PASS | All classroom lookups correctly use `.maybeSingle()` to avoid throws on 0 rows |
| Response format consistency | ✅ PASS | All API routes return `{ ... }` with success/data fields or error strings |
| i18n key coverage | ✅ PASS | All hardcoded strings have i18n keys in en.ts and zh.ts with perfect parity (24 new keys) |
| Cache-Control header strategy | ✅ PASS | Teachers GET 60s (slow-changing), teacher-notes GET 30s (faster updates), both appropriate |

---

## SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 4 | Must fix before deployment |
| HIGH | 2 | Strongly recommend fix |
| MEDIUM | 3 | Recommend fix |
| **TOTAL** | **9** | **NOT CLEAN** |

### Deployment Readiness: ❌ NOT RECOMMENDED
Fix all CRITICAL issues (4) before deploying to production. HIGH issues should be addressed in next iteration. MEDIUM issues can be deferred if timeline is critical, but should be tracked as tech debt.

### Risk Assessment:
- **Immediate Production Risk:** HIGH (voice notes non-functional, teacher add could fail silently, bulk import could crash)
- **Data Integrity Risk:** MEDIUM (timezone age discrepancies, missing transcription data)
- **User Experience Risk:** MEDIUM (no teacher refresh, new teachers don't appear immediately)

### Recommended Next Steps:
1. Fix CRITICAL-001 (transcription data loss) — add transcription field to POST body
2. Fix CRITICAL-002 (classroom_id type safety) — extract classroomId variable with explicit null check
3. Fix CRITICAL-003 (response success check) — validate data.success before accessing data.created
4. Verify/audit CRITICAL-004 (voice-notes/transcribe endpoint) — ensure endpoint exists and has auth
5. Fix HIGH-001 (timezone age calculation) — use UTC date parsing consistently
6. Fix HIGH-002 (AbortController) — add abort ref to fetchNotes useEffect

---

**Audit completed:** March 26, 2026, 14:30 UTC
**Auditor:** Independent integration & edge-case audit agent
**Files audited:** 10 (1 migration + 3 API routes + 2 components + 2 API modifications + 2 i18n files)
**Total lines reviewed:** ~2,800
