# Session 112 FINAL Handoff: Montree PWA - Critical Fix Needed

**Date:** 2025-01-28
**Status:** ⚠️ BLOCKED - Supabase client pattern broken across ALL API routes

---

## THE ONE PROBLEM

Every API route in `/app/api/montree/` uses **module-level Supabase client creation**, which breaks in Next.js 15/16. The fix is simple but must be applied to ALL routes.

### The Bug Pattern (WRONG)
```typescript
// At top of file - BREAKS in Next.js 15/16
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase.from('table')... // FAILS
}
```

### The Fix Pattern (CORRECT)
```typescript
// Create inline helper function
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase(); // Fresh client per request
  const { data } = await supabase.from('table')... // WORKS
}
```

---

## FILES THAT NEED THIS FIX

Run this to find all affected files:
```bash
cd ~/Desktop/ACTIVE/whale
grep -r "^const supabase = createClient" app/api/montree/ --include="*.ts"
```

Known affected routes:
- `/api/montree/auth/teacher/route.ts` ← **LOGIN BROKEN HERE**
- `/api/montree/children/route.ts` ← Fixed earlier today
- `/api/montree/children/[id]/route.ts` ← Fixed earlier today
- `/api/montree/progress/route.ts` ← Fixed earlier today
- `/api/montree/curriculum/route.ts` ← Fixed earlier today
- ALL other routes need checking

---

## WHAT WORKS (Don't touch)

1. **Database schema** - All Supabase tables are correct
2. **Curriculum data** - 220 works with quick_guide in `montessori_works`
3. **Frontend pages** - Dashboard refactor is complete:
   - `/montree/dashboard/` → Child picker grid
   - `/montree/dashboard/[childId]/` → Week tab
   - `/montree/dashboard/[childId]/progress` → Progress bars
   - `/montree/dashboard/[childId]/reports` → Reports
4. **Weekly assignments** - Data flows correctly when APIs work

---

## SYSTEMATIC FIX PROCEDURE

### Step 1: Find all API routes
```bash
find app/api/montree -name "route.ts" -type f
```

### Step 2: For EACH file, apply this pattern
```typescript
// DELETE THIS (if at top of file):
const supabase = createClient(...)

// ADD THIS instead:
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// CHANGE every function to use:
const supabase = getSupabase();
```

### Step 3: Clear cache and restart
```bash
cd ~/Desktop/ACTIVE/whale
rm -rf .next
npm run dev
```

### Step 4: Test the flow
1. Go to `localhost:3000/montree/login`
2. Enter code `f9f312`
3. Should see child picker
4. Click a child → Week tab with works
5. Click Progress tab → Progress bars

---

## ENVIRONMENT

- **Project:** ~/Desktop/ACTIVE/whale
- **Server:** localhost:3000 (or 3001 if 3000 occupied)
- **Login code:** f9f312
- **Supabase:** dmfncjjtsoxrnvcdnvjq.supabase.co

---

## ARCHITECTURE SUMMARY

```
/montree/login                     → Teacher login (code or email)
/montree/dashboard                 → Child picker grid (all students)
/montree/dashboard/[childId]       → Week view (assigned works)
/montree/dashboard/[childId]/progress → Progress bars by area
/montree/dashboard/[childId]/reports  → Weekly reports
/montree/dashboard/curriculum      → Browse/import 220 works
```

Data tables:
- `montree_teachers` - Teacher accounts with login_code
- `montree_children` - Students in classrooms  
- `montree_classrooms` - Classrooms in schools
- `weekly_assignments` - Child's current works
- `montessori_works` - Master curriculum (220 works with quick_guide)
- `montree_classroom_curriculum_works` - School's copy of curriculum

---

## PRIORITY FOR NEXT SESSION

1. **FIX ALL API ROUTES** with inline Supabase client (30 min)
2. **TEST END-TO-END** login → dashboard → progress
3. Then: Add `quick_guide` column to classroom curriculum table
4. Then: Display quick_guide when teacher taps a work

---

## DON'T DO

- Don't rewrite the frontend
- Don't change the database schema
- Don't create new tables
- Don't refactor the architecture

Just fix the Supabase client pattern in every API route. That's it.
