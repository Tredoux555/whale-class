# MONTREE END-TO-END TEST CHECKLIST
## Session 91 - January 25, 2026

---

## TEST 1: Fresh School Onboarding

### Steps:
1. [ ] Go to `/montree/onboarding`
2. [ ] Enter school name: "Test Academy"
3. [ ] Click Continue
4. [ ] Add classroom: "🦁 Lion Cubs"
5. [ ] Add classroom: "🐘 Elephant Room"
6. [ ] Click Continue
7. [ ] Add teacher "Alice" to Lion Cubs
8. [ ] Add teacher "Bob" to Elephant Room
9. [ ] Click Finish Setup
10. [ ] Verify login codes appear for both teachers

### Expected:
- Two login codes shown (e.g., "lioncubs-1234", "elephantroom-5678")
- Copy buttons work

---

## TEST 2: Teacher First Login (Code Flow)

### Steps:
1. [ ] Go to `/montree/login`
2. [ ] Enter code from Test 1 (e.g., "lioncubs-1234")
3. [ ] Set password (e.g., "test123")
4. [ ] Confirm password
5. [ ] Click "Start Teaching"

### Expected:
- Redirects to `/montree/dashboard`
- Shows "🦁 Lion Cubs" in header
- Shows "0 students • Alice"
- Empty state with "Add Students" button

---

## TEST 3: Teacher Returning Login (Password Flow)

### Steps:
1. [ ] Logout (click classroom name → Logout)
2. [ ] Go to `/montree/login`
3. [ ] Click "Already have an account? Login here"
4. [ ] Enter name: "Alice"
5. [ ] Enter password: "test123"
6. [ ] Click Login

### Expected:
- Redirects to `/montree/dashboard`
- Shows same classroom

---

## TEST 4: Admin Panel

### Steps:
1. [ ] Go to `/montree/admin`
2. [ ] Verify school name shows
3. [ ] Verify both classrooms appear
4. [ ] Verify teacher names + login codes visible
5. [ ] Click "Copy" on a login code
6. [ ] Verify "Copied" feedback

### Expected:
- Classrooms grid shows both
- Each has teacher name, student count, login code

---

## TEST 5: Student Management

### Steps:
1. [ ] Go to `/montree/admin/students`
2. [ ] Click "+ Add Student"
3. [ ] Enter name: "Emma"
4. [ ] Select classroom: "🦁 Lion Cubs"
5. [ ] Click "Add Student"
6. [ ] Add 2 more students to Lion Cubs
7. [ ] Add 1 student to Elephant Room
8. [ ] Verify filter tabs work
9. [ ] Edit a student's name
10. [ ] Move a student to different classroom

### Expected:
- Students appear in list
- Filter tabs show correct counts
- Edit/move works

---

## TEST 6: Dashboard Shows Classroom Students Only

### Steps:
1. [ ] Login as Alice (Lion Cubs teacher)
2. [ ] Go to `/montree/dashboard`
3. [ ] Verify only Lion Cubs students appear
4. [ ] Logout
5. [ ] Login as Bob (Elephant Room teacher)
6. [ ] Verify only Elephant Room students appear

### Expected:
- Each teacher sees ONLY their classroom

---

## TEST 7: Progress Tracking

### Steps:
1. [ ] From dashboard, click 📈 (progress)
2. [ ] Select a student
3. [ ] Tap a work to cycle status
4. [ ] Verify toast notification
5. [ ] Change area tab
6. [ ] Verify works load

### Expected:
- Status cycles: Not Started → Presented → Practicing → Mastered
- Toast shows change

---

## TEST 8: Reports

### Steps:
1. [ ] From dashboard, click 📊 (reports)
2. [ ] Verify week selector works
3. [ ] Verify only classroom students shown
4. [ ] Click "Generate" on a student
5. [ ] Verify report generates

### Expected:
- Reports filtered by classroom
- Generation works

---

## TEST 9: Existing Whale Class

### Steps:
1. [ ] Go to `/montree/login`
2. [ ] Enter code: "whaleclass-7a4b"
3. [ ] Set password if not already set
4. [ ] Verify 18 students appear
5. [ ] Check progress tracking works
6. [ ] Check reports work

### Expected:
- Whale Class data intact
- 18 students show
- All features work

---

## BUGS FOUND

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## RESULTS

- [ ] All tests pass
- [ ] Ready for Session 92 (Polish)
