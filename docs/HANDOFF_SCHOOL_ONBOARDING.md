# HANDOFF: School Onboarding - Session 85

## Date: January 25, 2026

---

## WHAT WAS BUILT

### 1. Clean Database Migration
`migrations/067_school_onboarding_clean.sql`

Creates/ensures:
- `montree_schools` - school records
- `montree_classrooms` - with `teacher_id` linking to teachers
- `montree_school_admins` - principals
- Adds `classroom_id` to `simple_teachers`
- Adds `classroom_id` to `children`
- Migrates existing Whale Class data

### 2. Onboarding Wizard UI
`app/montree/onboarding/page.tsx`

3-step flow:
1. **School Name** → auto-generates slug
2. **Add Classrooms** → Supabase-style grid, click to add, emoji picker
3. **Assign Teachers** → name + email per classroom

### 3. Onboarding API
`app/api/montree/onboarding/route.ts`

Creates school + classrooms + teachers in one POST request.

---

## THE DATA MODEL (SIMPLE)

```
montree_schools
    │
    ├── montree_classrooms (has teacher_id)
    │       │
    │       └── children (has classroom_id)
    │
    └── simple_teachers (has classroom_id)
```

**One teacher = One classroom = Their students**

---

## TO RUN THIS

### Step 1: Run Migration in Supabase

Copy and paste the entire contents of:
```
migrations/067_school_onboarding_clean.sql
```
Into Supabase SQL Editor and run it.

### Step 2: Test the Onboarding Flow

```
npm run dev
```

Open: `http://localhost:3000/montree/onboarding`

1. Enter school name
2. Add classrooms with + button
3. Assign teachers
4. Click Finish

### Step 3: Verify in Supabase

```sql
SELECT * FROM montree_schools;
SELECT * FROM montree_classrooms;
SELECT name, classroom_id FROM simple_teachers;
```

---

## WHAT'S NOT DONE YET

1. **Connect dashboard to classroom_id** - Currently shows all children, needs to filter by logged-in teacher's classroom
2. **Principal login** - Needs auth flow for `montree_school_admins`
3. **Student management** - Add/remove students from classrooms

---

## FILES CREATED

```
migrations/067_school_onboarding_clean.sql    # Database migration
app/montree/onboarding/page.tsx               # 3-step wizard UI
app/api/montree/onboarding/route.ts           # API endpoint
```

---

## ARCHITECTURE DECISIONS

| Decision | Choice | Why |
|----------|--------|-----|
| Table naming | `montree_` prefix | Separates from old tables (schools, classrooms) |
| Teacher-Classroom | 1:1 via teacher_id on classroom | Simpler than junction table |
| Children-Classroom | Direct `classroom_id` on children | No enrollment table needed for now |
| Auth | Simple password (like simple_teachers) | No Supabase Auth needed yet |

---

## WEB VS NATIVE

**Same tables work for both:**
- Web: Data in Supabase, fetched on demand
- Native: Same schema in local SQLite, synced via PowerSync

No architecture changes needed when going native. Just add sync layer.

---

## SUCCESS CRITERIA

- [x] Migration created
- [x] Onboarding UI built  
- [x] API endpoint working
- [ ] Migration run in Supabase (YOU DO THIS)
- [ ] Test flow works end-to-end
- [ ] Dashboard filters by classroom

---

*Ready to run migration and test.*
