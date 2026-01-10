# Cursor Integration Instructions - Montree Progress System
**Date:** January 10, 2026

## Files to Create (in order)

### 1. Shared Types
**Path:** `lib/montree/progress-types.ts`
**Source:** WBC-1 types.ts (uploaded)
**Action:** Create new file

### 2. Progress Summary API
**Path:** `app/api/whale/student/[studentId]/progress-summary/route.ts`
**Source:** WBC-2 route.ts (uploaded)
**Action:** Create directory structure + file

### 3. Real-time Hook
**Path:** `lib/hooks/useStudentProgressRealtime.ts`
**Source:** WBC-4 useStudentProgressRealtime.ts (uploaded)
**Action:** Create hooks directory if needed + file

### 4. Progress Bars Component
**Path:** `components/progress/StudentProgressBars.tsx`
**Source:** WBC-1 StudentProgressBars.tsx (uploaded)
**Action:** Create progress directory + file

### 5. Principal Classroom Page
**Path:** `app/principal/classrooms/[id]/page.tsx`
**Source:** WBC-3 page.tsx (uploaded)
**Action:** REPLACE existing file

---

## Cursor Prompt

Copy this to Cursor:

```
I have 5 files from WBC parallel development that need integration for the Montree progress visualization system.

FILES TO CREATE:

1. Create `lib/montree/progress-types.ts` with the types.ts content
2. Create `app/api/whale/student/[studentId]/progress-summary/route.ts` with the route.ts content
3. Create `lib/hooks/useStudentProgressRealtime.ts` with the useStudentProgressRealtime.ts content
4. Create `components/progress/StudentProgressBars.tsx` with the StudentProgressBars.tsx content
5. REPLACE `app/principal/classrooms/[id]/page.tsx` with the page.tsx content

The uploaded files contain production-ready code. Create the directory structures as needed.

After creating files, verify imports resolve correctly.
```

---

## Post-Integration Test

1. `npm run build` - should pass
2. Visit `/principal/classrooms/[any-classroom-id]` 
3. Verify student grid displays
4. Click student → slide-in panel should show progress bars

---

## Games Audit Action Items (separate task)

Phase 1 fixes (30 min):
- Fix 4 hub link mismatches in Games Hub page
- Create `/app/games/sentence-match/page.tsx` route
