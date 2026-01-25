# SESSION 91: End-to-End Test Checklist

## Date: January 25, 2026

Run `npm run dev` and test each flow:

---

## ✅ TEST 1: Teacher Login (Existing)

**URL:** `http://localhost:3000/montree/login`

1. [ ] Enter code: `whaleclass-7a4b`
2. [ ] If first time: Set password (4+ chars)
3. [ ] If returning: Enter name "Tredoux" + password
4. [ ] Should redirect to `/montree/dashboard`
5. [ ] Should see: 🐋 Whale Class • 18 students • Tredoux

---

## ✅ TEST 2: Dashboard Features

**URL:** `http://localhost:3000/montree/dashboard`

1. [ ] Header shows classroom icon + name
2. [ ] Shows student count
3. [ ] Student grid displays all students
4. [ ] Click student → goes to student page
5. [ ] 📈 button → Progress tracking
6. [ ] 📊 button → Reports
7. [ ] 🖼️ button → Media
8. [ ] Click classroom name → Logout dropdown appears
9. [ ] Logout → redirects to login

---

## ✅ TEST 3: Progress Tracking

**URL:** `http://localhost:3000/montree/dashboard/progress`

1. [ ] Shows list of students
2. [ ] Click student → Shows area tabs
3. [ ] Click area tab → Shows works
4. [ ] Tap work → Status cycles (0→1→2→3→0)
5. [ ] Toast notification appears
6. [ ] Back button returns to student list

---

## ✅ TEST 4: Reports

**URL:** `http://localhost:3000/montree/dashboard/reports`

1. [ ] Week selector works
2. [ ] Shows classroom name in header
3. [ ] Filters by student work
4. [ ] "Generate" buttons appear for students without reports

---

## ✅ TEST 5: Admin Panel

**URL:** `http://localhost:3000/montree/admin`

1. [ ] Shows school name
2. [ ] Shows classrooms grid
3. [ ] Each classroom shows:
   - Icon + Name
   - Teacher name
   - Student count
   - Login code + Copy button
4. [ ] Copy button works
5. [ ] Quick links work (Parent Codes, Reports, Media, Games)

---

## ✅ TEST 6: Student Management

**URL:** `http://localhost:3000/montree/admin/students`

1. [ ] Shows all students
2. [ ] Filter by classroom works
3. [ ] "+ Add Student" opens modal
4. [ ] Add student with name + classroom
5. [ ] Edit student works
6. [ ] Remove student (with confirm) works
7. [ ] Back to Admin link works

---

## ✅ TEST 7: New School Onboarding

**URL:** `http://localhost:3000/montree/onboarding`

1. [ ] Step 1: Enter school name
2. [ ] Step 2: Add classroom(s) with icon/color
3. [ ] Step 3: Assign teacher names
4. [ ] Submit → Shows login codes
5. [ ] Copy code button works
6. [ ] New teacher can login with generated code

---

## ✅ TEST 8: Demo Mode

**URL:** `http://localhost:3000/montree/dashboard?demo=true`

1. [ ] Works without login
2. [ ] Shows demo classroom
3. [ ] All features accessible

---

## RESULTS

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Teacher Login | | |
| 2. Dashboard | | |
| 3. Progress | | |
| 4. Reports | | |
| 5. Admin | | |
| 6. Students | | |
| 7. Onboarding | | |
| 8. Demo Mode | | |

---

## SQL Verification

Run in Supabase:
```sql
-- Schools
SELECT * FROM montree_schools;

-- Classrooms with teachers
SELECT c.name, c.icon, t.name as teacher, t.login_code
FROM montree_classrooms c
LEFT JOIN simple_teachers t ON c.teacher_id = t.id;

-- Children count
SELECT classroom_id, COUNT(*) FROM children GROUP BY classroom_id;
```
