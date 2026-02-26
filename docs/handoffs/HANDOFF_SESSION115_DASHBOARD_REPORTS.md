# SESSION 115: Dashboard Polish + Reports Fix

## 🎯 ISSUES TO ADDRESS

### 1. Dashboard Grid Alignment
**Problem:** Right-side icons touching screen edge
**Fix:** Add proper padding to the grid container

### 2. One Work Per Area (Focus Mode)
**Problem:** Currently shows all works at once
**Fix:** Show one active work per area, with ability to switch. All logged for weekly review.

### 3. Camera Icon for Class Photos
**Problem:** No communal class photo capture
**Fix:** Add camera icon to dashboard footer for whole-class photos

### 4. Reports Not Working
**Problem:** Parent descriptions exist in code but NOT in database!
**Root cause:** `montessori_works` table lacks parent_explanation columns
**Fix:** Need to run migration and import parent descriptions

### 5. Three Report Types Needed
- **Teacher Report:** Full detail, all notes, progress data
- **Parent Report:** Friendly descriptions, photos, highlights
- **AI Analysis Report:** Recommendations for what to do next

---

## 📋 FILE CHANGES

### 1. Dashboard Grid Fix - `/app/montree/dashboard/page.tsx`
```tsx
// Change line ~109 from:
<main className="flex-1 p-3 overflow-y-auto">

// To:
<main className="flex-1 px-4 py-3 overflow-y-auto">

// And change grid gap from gap-3 to gap-2.5 with proper margin
```

### 2. Add Camera Icon to Footer
```tsx
// In footer, add camera icon:
<Link href="/montree/dashboard/capture?class=true" className="p-2 text-xl hover:scale-110 transition-transform" title="Class Photo">📷</Link>
```

### 3. Database Migration for Parent Descriptions
