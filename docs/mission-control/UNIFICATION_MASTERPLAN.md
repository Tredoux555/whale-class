# 🌳 INDEPENDENT MONTREE - UNIFICATION MASTERPLAN

**Created:** January 11, 2026  
**Status:** Phase 1 Ready  
**Priority:** HIGH - Path to financial freedom

---

## 🎯 THE VISION

Transform the Whale platform into a standalone, multi-tenant Montessori progress tracking system that can be:
1. Licensed to schools worldwide
2. Packaged as a mobile app
3. White-labeled for different brands
4. **Generating recurring revenue = financial freedom**

---

## 🚨 CRITICAL ISSUES DISCOVERED

### Issue 1: DATA LEAKAGE (CRITICAL)
**Problem:** Teacher John clicks on "Progress" and sees ALL students including Tredoux's Whale Class children.

**Root Cause:**
```javascript
// /api/teacher/classroom/route.ts
const { data: children } = await supabase
  .from('children')
  .select('*')  // ← NO FILTERING BY TEACHER!
  .order('name');
```

**Solution:** Create `teacher_children` junction table and filter all queries.

### Issue 2: VIDEO URL DECAY
**Problem:** Direct YouTube URLs in `curriculum_roadmap.video_url` break over time (videos removed, made private, etc.)

**Solution:** Store `video_search_term` instead:
- Old: `youtube.com/watch?v=XYZ123` (brittle)
- New: `Montessori Pink Tower presentation` (generates fresh search)

### Issue 3: FEATURE PARITY GAP
**Problem:** Admin Circle Planner has buttons (Video Cards, 3-Part Cards, Flashcards) that teacher version lacks.

**Solution:** Match all admin features in teacher portal.

---

## 📊 DATA ARCHITECTURE

### Current State (BROKEN)
```
children (table)
    ↑
    ALL visible to ALL teachers (no filtering)
```

### Target State (FIXED)
```
simple_teachers
       │
       │ 1:many
       ▼
teacher_children (NEW)
       │
       │ many:1
       ▼
children
       │
       │ 1:many
       ▼
child_work_progress
```

### New Table: teacher_children
```sql
CREATE TABLE teacher_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES simple_teachers(id),
  child_id UUID NOT NULL REFERENCES children(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, child_id)
);
```

---

## 🔧 6-PHASE IMPLEMENTATION

### Phase 1: Database Schema ✅ READY
- [x] Design teacher_children table
- [x] Create migration file: `027_independent_montree.sql`
- [x] Add video_search_term column
- [x] Populate initial search terms (342 works)
- [ ] **RUN MIGRATION IN SUPABASE**

### Phase 2: Teacher Data Isolation
- [ ] Update `/api/teacher/classroom/route.ts` to filter by teacher
- [ ] Update `/api/teacher/progress/route.ts` to filter by teacher
- [ ] Create "Add Student" API for teachers
- [ ] Create "Transfer Student" API (principal only)
- [ ] Test: Login as John → sees ONLY John's students

### Phase 3: Video Search Terms
- [ ] Update curriculum detail modal to use search terms
- [ ] Replace "▶️ Watch Video" with "🔍 Find Video"
- [ ] Generate YouTube search URL dynamically
- [ ] Review and fill gaps in search terms

### Phase 4: Feature Parity
- [ ] Add missing buttons to teacher Circle Planner
- [ ] Give teachers Classroom View (filtered to their data)
- [ ] Match admin progress tracking features
- [ ] Ensure print functionality works for teachers

### Phase 5: Parent Portal Integration
- [ ] Link parents to children via teacher assignment
- [ ] Parent sees ONLY their children
- [ ] Teacher generates parent invite codes
- [ ] Weekly progress reports

### Phase 6: App Packaging
- [ ] PWA manifest and service worker
- [ ] Mobile-optimized views
- [ ] Multi-school tenant architecture
- [ ] Stripe integration for licensing
- [ ] White-label branding

---

## 📁 KEY FILES TO MODIFY

### APIs (Data Isolation)
```
/app/api/teacher/classroom/route.ts   ← ADD teacher filtering
/app/api/teacher/progress/route.ts    ← ADD teacher filtering
/app/api/teacher/students/route.ts    ← CREATE (add/remove students)
```

### Pages (Feature Parity)
```
/app/teacher/circle-planner/page.tsx  ← ADD missing buttons
/app/teacher/classroom/page.tsx       ← MATCH admin view (filtered)
/app/teacher/progress/page.tsx        ← VERIFY filtering works
```

### Curriculum (Video Fix)
```
/app/teacher/curriculum/page.tsx      ← Use video_search_term
/lib/curriculum/curriculum-data.ts    ← Reference search terms
```

---

## 🔐 ROLE HIERARCHY

```
PRINCIPAL (Super Admin - Tredoux)
├── Can see ALL teachers
├── Can see ALL students
├── Can transfer students between teachers
├── Can access /admin/* routes
└── Manages curriculum, schools, system settings

TEACHER (John, Jasmine, etc.)
├── Can see ONLY their assigned students
├── Can add students to their classroom
├── Can track progress for their students
├── Can access /teacher/* routes
└── Cannot see other teachers' students

PARENT
├── Can see ONLY their children
├── Can view progress reports
├── Can access /parent/* routes
└── Linked via teacher assignment
```

---

## 🧪 TEST SCENARIOS

### Test 1: Teacher Data Isolation
1. Login as Tredoux (admin) → `/admin/classroom`
2. Should see ALL students (22+ children)
3. Login as John (teacher) → `/teacher/progress`
4. Should see ONLY John's students (0 initially)
5. Assign Mia to John via teacher_children
6. John now sees ONLY Mia

### Test 2: Video Search
1. Go to `/teacher/curriculum`
2. Click on "Pink Tower"
3. Should show "🔍 Find Video" button
4. Button opens: `youtube.com/results?search_query=Montessori+Pink+Tower+presentation`
5. Always finds fresh videos!

### Test 3: Parent Isolation
1. Login as demo@test.com (parent)
2. Should see ONLY Amy (their child)
3. Should NOT see any other children

---

## 📋 SQL TO RUN (Phase 1)

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/027_independent_montree.sql
```

After running, verify:
```sql
-- Check teacher_children created
SELECT * FROM teacher_children;

-- Check video_search_term added
SELECT name, video_search_term 
FROM curriculum_roadmap 
WHERE video_search_term IS NOT NULL
LIMIT 10;
```

---

## 🚀 IMMEDIATE NEXT STEPS

1. **Run Migration:** Execute `027_independent_montree.sql` in Supabase
2. **Update API:** Modify `/api/teacher/classroom` to filter by teacher
3. **Test:** Login as John, verify isolation works
4. **Deploy:** Push to Railway, verify on production

---

## 💰 BUSINESS MODEL (Future)

### Pricing Tiers
- **Free:** 1 teacher, 10 students, basic features
- **School:** $29/month - 10 teachers, 200 students, full features
- **District:** $199/month - Unlimited, white-label, support

### Revenue Projection
- 100 schools × $29/month = $2,900/month
- 10 districts × $199/month = $1,990/month
- **Total:** $4,890/month = $58,680/year

This is the path to financial freedom. Build it right, license it wide.

---

*Last Updated: January 11, 2026*
*Session: 15*
