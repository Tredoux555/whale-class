# Handoff: Session 130 - Onboarding Flow & Audit

## Date: 2026-01-31

## Summary
Built the complete teacher onboarding flow from first login through to dashboard. Fixed several issues and removed Chinese text from curriculum display.

---

## COMPLETED WORK

### 1. Teacher Account Setup Flow
Created complete first-time login experience:

**New Files:**
- `app/montree/setup/page.tsx` - Account setup (username/password) after first code login
- `app/montree/dashboard/students/page.tsx` - Year-round student management page

**Updated Files:**
- `app/montree/login/page.tsx` - Updated redirect logic based on state
- `app/api/montree/auth/teacher/route.ts` - Added `onboarded` flag (checks if students exist)
- `app/api/montree/auth/set-password/route.ts` - Sets password hash for teacher

**Flow:**
1. Teacher enters 6-char code → Login API checks `password_set_at`
2. First login (no password) → Redirect to `/montree/setup`
3. Setup page → Create username + password → Redirect to `/montree/onboarding`
4. After adding students → Redirect to `/montree/dashboard`
5. Returning teacher (password set, has students) → Direct to dashboard

### 2. Onboarding Page Improvements
- Added search bar to curriculum pickers
- Added click-outside to close dropdowns
- Added long-press/right-click on sequence numbers to insert custom works
- Custom works now persist to database (not just local state)
- Updated welcome message: "Welcome to Montree! A system designed to make your life easy, pleasant, and splendid."

### 3. Principal Setup Status Messages
Added friendly animated status messages during classroom creation:
- "Creating your classrooms..."
- "Setting up Montessori curriculum..."
- "Adding learning activities..."
- "Creating teacher accounts..."
- "Generating secure login codes..."
- "Almost there, finishing up..."

### 4. Removed Chinese Text
**File:** `components/montree/WorkWheelPicker.tsx`
- Removed display of `name_chinese` field (lines 181-183)
- Chinese names still exist in JSON data files but are no longer displayed

---

## KNOWN ISSUES (FOR NEXT SESSION)

### 1. Students Not Saving Properly
**Issue:** User added 3 students during onboarding but only 1 (Rachel) appeared
**Likely Cause:** UX issue - users must click "Add Student" button for EACH student before clicking "Save All Students". If they just fill in a form and hit Save, only students already in the `students` array are saved.
**Fix Needed:** Either auto-add student when form is filled, or clearer UX

### 2. Progress Bars May Show Wrong Data
**Issue:** Progress bars API only counts `status === 'mastered'` as completed
**Context:** Onboarding saves works with `status: 'presented'`
**Files to check:**
- `app/api/montree/progress/bars/route.ts` - May need to count presented/practicing works
- `app/api/montree/onboarding/students/route.ts` - Currently saves as 'presented'

### 3. Week View vs Progress View Confusion
**Issue:** User expected to see all 5 curriculum areas on child page
**Reality:** Week view shows "This Week's Focus" (active works), not all areas
**The Progress tab SHOULD show all areas** - verify this works correctly

---

## KEY FILES REFERENCE

### Auth Flow
```
app/montree/login/page.tsx          # Login (code or email/password)
app/montree/setup/page.tsx          # First-time username/password setup
app/montree/onboarding/page.tsx     # Add students + set curriculum progress
app/api/montree/auth/teacher/route.ts    # Login API
app/api/montree/auth/set-password/route.ts  # Password setup API
```

### Dashboard
```
app/montree/dashboard/page.tsx           # Class grid view
app/montree/dashboard/[childId]/page.tsx # Child week view
app/montree/dashboard/students/page.tsx  # Student management
```

### Curriculum
```
lib/montree/stem/practical-life.json    # Contains chineseName field (not displayed)
lib/montree/stem/sensorial.json
lib/montree/stem/math.json
lib/montree/stem/language.json
lib/montree/stem/cultural.json
```

---

## STATUS VALUES REMINDER
- `not_started` - Work not yet introduced
- `presented` - Teacher presented the work
- `practicing` - Child is practicing
- `mastered` - Child has mastered (alias: 'completed' in some places)

---

## NEXT STEPS
1. Fix student saving UX - auto-add when form is filled
2. Verify Progress tab shows all 5 curriculum areas
3. Consider if progress bars should show presented/practicing counts
4. Git commit all changes (was blocked by lock files)
