# Handoff: Session 131 - UI Cleanup & Role Separation

**Date:** January 31, 2026
**Status:** ✅ COMPLETE

## Summary

Simplified teacher dashboard to be minimal and focused. Removed unnecessary clutter (footer icons, tools page, settings page from main UI). Teachers just need: student grid + camera.

## Issues Fixed

### 0. Teacher Dashboard - Removed Footer Completely
**Problem:** Footer with icons (👥 📚 🎮 ⚙️) was unnecessary clutter
**Solution:** Removed entire footer. Dashboard is now just:
- Header: Classroom name + 📷 Camera + Logout
- Main: Student grid with "+" tile to add students

**File:** `app/montree/dashboard/page.tsx`
```
Before: Footer with 4 icons linking to students, curriculum, games, settings
After: No footer. Clean full-screen student grid.
```

The tools (`/montree/dashboard/tools`) and settings (`/montree/dashboard/settings`) pages still exist but are not linked from main UI.

### 1. Teacher Settings Page - Admin Features Removed
**Problem:** Teacher settings showed admin/principal features (School Settings, Manage Students, Curriculum, Weekly Planning)
**Solution:** Removed admin features, now shows only teacher-appropriate items

**File:** `app/montree/dashboard/settings/page.tsx`
```typescript
// Before: Had links to /montree/admin, /montree/admin/students, etc.
// After: Only shows Media Gallery, Reports, Curriculum Games
const SETTINGS_ITEMS = [
  { emoji: '🖼️', title: 'Media Gallery', desc: 'View captured photos', href: '/montree/dashboard/media' },
  { emoji: '📊', title: 'Reports', desc: 'View student reports', href: '/montree/dashboard/reports' },
  { emoji: '🎮', title: 'Curriculum Games', desc: 'Practice activities', href: '/montree/dashboard/games' },
];
```

### 2. Camera Button Moved to Top Right
**Problem:** Camera was in the footer, user wanted it in top right
**Solution:** Moved 📷 button to header, next to logout button

**File:** `app/montree/dashboard/page.tsx`
- Camera now in header: `<Link href="/montree/dashboard/capture?class=true">`
- Removed from footer

### 3. Parent Dashboard - Games Link Added
**Problem:** Parents couldn't access games for their children
**Solution:** Added prominent "Practice Games" card

**File:** `app/montree/parent/dashboard/page.tsx`
```tsx
<Link href="/montree/dashboard/games" className="bg-gradient-to-r from-purple-500 to-pink-500 ...">
  <span className="text-3xl">🎮</span>
  <h3>Practice Games</h3>
  <p>Fun activities to practice at home</p>
</Link>
```

### 4. Admin Settings Page Created (was 404)
**Problem:** `/montree/admin/settings` showed 404
**Solution:** Created full settings page for principals

**File:** `app/montree/admin/settings/page.tsx`
- School information editing
- Principal account settings
- Password change
- Subscription status display
- Sign out option

### 5. Admin Teachers Data Fix
**Problem:** Admin overview showed "2 Teachers" but teachers page showed "No teachers yet"
**Solution:** Simplified API query to match overview API

**File:** `app/api/montree/admin/teachers/route.ts`
```typescript
// Before: Complex join on montree_teacher_classrooms (was failing)
// After: Simple query matching overview API
const { data: teachers } = await supabase
  .from('montree_teachers')
  .select('id, name, email, classroom_id, is_active, created_at')
  .eq('school_id', schoolId)
  .eq('is_active', true);
```

### 6. Admin Students - Age Picker Instead of DOB
**Problem:** Admin students page used Date of Birth picker, inconsistent with onboarding
**Solution:** Changed to age dropdown matching teacher onboarding

**File:** `app/montree/admin/students/page.tsx`
```typescript
const AGE_OPTIONS = [
  { value: '', label: 'Select age' },
  { value: 2, label: '2 years old' },
  { value: 2.5, label: '2½ years old' },
  // ... up to 6.5 years old
];
```

## Files Modified

| File | Change |
|------|--------|
| `app/montree/dashboard/settings/page.tsx` | Removed admin features, added session data display |
| `app/montree/dashboard/page.tsx` | Moved camera to header, removed from footer |
| `app/montree/parent/dashboard/page.tsx` | Added games link card |
| `app/montree/admin/settings/page.tsx` | **NEW** - Admin settings page |
| `app/api/montree/admin/teachers/route.ts` | Simplified query to fix data inconsistency |
| `app/montree/admin/students/page.tsx` | Changed DOB to age picker |
| `app/api/montree/children/route.ts` | **ADDED POST handler** - fixes "Failed to add student" |
| `app/montree/dashboard/students/page.tsx` | Fixed API endpoint to use `/api/montree/children` |

### 7. "Failed to add student" API Fix
**Problem:** Adding a student showed "Failed to add student" error, console showed 404 for `/api/montree/onboarding/students`
**Solution:** Added POST handler to `/api/montree/children/route.ts` and updated students page to use this endpoint

**File:** `app/api/montree/children/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { classroomId, name, age, progress } = await request.json();
  const { data: child, error } = await supabase
    .from('montree_children')
    .insert({ classroom_id: classroomId, name: name.trim(), age: age || 3.5 })
    .select().single();
  // Also creates progress records if provided
  return NextResponse.json({ success: true, child });
}
```

**File:** `app/montree/dashboard/students/page.tsx`
```typescript
// Changed from /api/montree/onboarding/students to /api/montree/children
const res = await fetch('/api/montree/children', {
  method: 'POST',
  body: JSON.stringify({ classroomId, name, age, progress }),
});
```

### 8. Quick Guides Discovery
**Location:** `supabase/migrations/090_quick_guide_columns.sql` (Session 110)
**Purpose:** 10-second scan style instructions for each work
**Columns:**
- `quick_guide` - 3-5 bullet point instructions for teachers
- `video_search_term` - YouTube search term for demonstration videos
**Coverage:** 220 works have these populated

## Role Separation Now Clear

| Role | Dashboard | Settings Access |
|------|-----------|-----------------|
| **Teacher** | `/montree/dashboard` | Media, Reports, Games only |
| **Principal** | `/montree/admin` | Full school management |
| **Parent** | `/montree/parent/dashboard` | View progress, access games |

## Navigation Flow

```
Teacher Login → Dashboard (students grid)
                ├── 📷 Camera (top right)
                ├── 👥 Students
                ├── 📚 Curriculum
                ├── 🎮 Games
                └── ⚙️ Settings (teacher-only options)

Principal Login → Admin Dashboard
                  ├── 📊 Overview
                  ├── 👧 Students
                  ├── 👩‍🏫 Teachers
                  └── ⚙️ Settings (school management)

Parent Login → Parent Dashboard
               ├── 📊 Weekly Reports
               ├── 📈 Stats
               └── 🎮 Practice Games
```

## Testing Checklist

- [ ] Teacher settings no longer shows admin links
- [ ] Camera button visible in top right of teacher dashboard
- [ ] Parent dashboard shows games card
- [ ] Admin settings page loads (no more 404)
- [ ] Admin teachers page shows correct count
- [ ] Admin students uses age picker, not DOB
- [ ] Adding a student from dashboard works (no more "Failed to add student" error)
- [ ] "+" tile in student grid navigates to students page

## Next Steps

- Consider adding more teacher-specific settings (notification preferences, display options)
- Parent games could track which games were played
- Admin could have curriculum management features
