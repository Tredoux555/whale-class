# Site Cleanup Plan - Remove Obsolete Student/Teacher Features

## STEP 1: Files to Remove

### Student Section (7 files):
- `app/student/dashboard/page.tsx`
- `app/student/games/letter-tracer/page.tsx`
- `app/student/games/letter-match/page.tsx`
- `app/student/games/sentence-builder/page.tsx`
- `app/student/games/letter-sounds/page.tsx`
- `app/student/games/word-builder/page.tsx`
- `app/student/games/sentence-match/page.tsx`

### Teacher Section (2 files):
- `app/teacher/dashboard/page.tsx`
- `app/teacher/layout.tsx`

### Auth Pages (3 files):
- `app/auth/student-login/page.tsx`
- `app/auth/student-signup/page.tsx`
- `app/auth/teacher-login/page.tsx`

### Student API Routes (3 files):
- `app/api/student/badges/route.ts`
- `app/api/student/game-progress/route.ts`
- `app/api/student/progress-summary/route.ts`

**Total: 15 files to delete**

---

## STEP 2: Files to Update

### Home Page:
- `app/page.tsx` - Remove student and teacher login links (lines 295-307)

### Middleware:
- `middleware.ts` - Remove `/auth/teacher-login` and `/auth/student-login` from public paths (lines 49-51)

---

## STEP 3: Files to Check (May Have References)

### Components:
- `components/StudentPasswordManager.tsx` - May be used elsewhere, check first
- `components/04-LetterTracer.tsx` - Check if used

### Hooks:
- `lib/hooks/useStudentDetail.ts` - May be used by admin, check first
- `lib/hooks/useTeacherStudents.ts` - May be used by admin, check first

### API Routes (Keep - Used by Admin):
- `app/api/whale/teacher/*` - Keep (used by admin)
- `app/api/auth/student-login/route.ts` - Check if used
- `app/api/auth/student-signup/route.ts` - Check if used
- `app/api/auth/check-teacher-role/route.ts` - Check if used

---

## STEP 4: What Will Remain

✅ **Keep:**
- `/admin/*` - Admin dashboard
- `/games/*` - English learning games
- `/parent/*` - Parent login/dashboard
- `/story/*` - Secret message system
- `/api/whale/*` - Backend APIs for admin features
- Videos system

❌ **Remove:**
- `/student/*` - Obsolete student portal
- `/teacher/*` - Broken teacher dashboard
- `/auth/student-login` - Obsolete
- `/auth/student-signup` - Obsolete
- `/auth/teacher-login` - Obsolete
- `/api/student/*` - Obsolete student APIs

---

## Notes:
- Database tables will NOT be deleted
- API routes used by admin will be kept
- Only UI/pages will be removed

