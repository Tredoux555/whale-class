# Handoff: Visual Shelf Redesign + Onboarding Guides Hidden

**Date:** Feb 27, 2026 (late session)
**Status:** Audited, ready to push
**Files changed:** 7 (1 full rewrite, 5 guide hides, 1 CLAUDE.md update)

---

## 1. Visual Shelf Redesign — ShelfView.tsx Full Rewrite

### What Changed

Rewrote `components/montree/home/ShelfView.tsx` from a vertical list of 5 wooden planks (one per Montessori area) into an actual 3-plank visual Montessori shelf with works as tappable 3D objects.

### Architecture

```
Parent taps work on shelf
  → openWorkGuide(workName)
  → Fetches /api/montree/works/guide?name=X&classroom_id=Y
  → Opens QuickGuideModal (SAME component teachers use)
    → "Full Details" button → FullDetailsModal (step-by-step presentation guide)
    → "Watch Video" button → YouTube search
```

### Visual Design

- **3 horizontal wooden planks** with CSS wood-texture gradients (`BIO.shelf` theme)
- **Up to 3 works per plank** (9 slots total), distributed top-down via `distributeToShelves()`
- **Each work**: area-colored border, 3D emoji icon (60+ mappings in `BIO.workIcon`), work name, area label
- **Status indicators**: mastered ⭐ sparkle, practicing/presented glow dots
- **Empty slots**: dashed `+` icon → tapping asks Guru for suggestions
- **Shelf frame**: side rails, top/bottom caps, subtle shadows

### Key Components

| Component | Role |
|-----------|------|
| `ShelfView` | Main component — fetches shelf data, manages modal state |
| `ShelfPlank` | Renders 1 row of 3 slots + wooden plank underneath |
| `ShelfObject` | Renders 1 work (3D icon) or empty slot (+) |
| `QuickGuideModal` | Existing teacher component — zero changes |
| `FullDetailsModal` | Existing teacher component — zero changes |

### Audit Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | Dead `AREA_ORDER` constant never used | Removed |
| 2 | Race condition in `fetchShelf()` if child switches | Added `AbortController` + abort-on-unmount |
| 3 | Race condition in `openWorkGuide()` if tapped rapidly | Added `AbortController` + abort-on-unmount |
| 4 | No cleanup on unmount for in-flight fetches | Added cleanup `useEffect` that aborts both controllers |
| 5 | Missing `aria-label` on all buttons | Added to empty slots + work objects |
| 6 | React key using array index | Changed to `work.work_name` or `empty-${idx}` |
| 7 | Guide fetch error set `{ error: true }` object | Now sets `null` (cleaner fallback in modals) |

### Data Flow

- Shelf data: `GET /api/montree/shelf?child_id=X` → max 5 works (one per area)
- Guide data: `GET /api/montree/works/guide?name=X&classroom_id=Y` → QuickGuideData type
- Both use AbortController for safe cancellation

---

## 2. Onboarding Guides — ALL HIDDEN (Not Deleted)

### Decision

User decided onboarding guides are unnecessary — "People will have to learn how to use the system themselves. Its intuitive enough."

### Approach

All guide renders wrapped with `false &&` so they never execute. Code and components preserved for potential reinstatement.

### Files Modified (5)

| File | What was hidden |
|------|----------------|
| `app/montree/dashboard/page.tsx` | WelcomeModal + DashboardGuide renders |
| `app/montree/dashboard/[childId]/page.tsx` | WeekViewGuide render |
| `app/montree/dashboard/students/page.tsx` | StudentFormGuide render + auto-open bulk form |
| `app/montree/principal/setup/page.tsx` | PrincipalSetupGuide (`isVisible={false && ...}`) + welcome overlay |
| `app/montree/admin/layout.tsx` | PrincipalAdminGuide render |

### To Re-enable

```bash
# Find all hidden guides
grep -rn "HIDDEN: onboarding guides disabled" app/
# Remove the `false &&` from each match
```

### Components Preserved (Not Deleted)

- `components/montree/onboarding/WeekViewGuide.tsx`
- `components/montree/onboarding/StudentFormGuide.tsx`
- `components/montree/onboarding/PrincipalSetupGuide.tsx`
- `components/montree/onboarding/PrincipalAdminGuide.tsx`
- `components/montree/onboarding/DashboardGuide.tsx`
- WelcomeModal (inline in dashboard/page.tsx)

---

## 3. Push Command

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add \
  components/montree/home/ShelfView.tsx \
  app/montree/dashboard/page.tsx \
  app/montree/dashboard/\[childId\]/page.tsx \
  app/montree/dashboard/students/page.tsx \
  app/montree/principal/setup/page.tsx \
  app/montree/admin/layout.tsx \
  CLAUDE.md \
  docs/handoffs/HANDOFF_SHELF_REDESIGN_GUIDES_HIDDEN_FEB27.md
git commit -m "feat: visual 3-plank shelf redesign + hide all onboarding guides"
git push origin main
```

---

## 4. What's NOT Changed

- `QuickGuideModal.tsx` — zero changes (reused as-is)
- `FullDetailsModal.tsx` — zero changes (reused as-is)
- `/api/montree/shelf/route.ts` — zero changes (same API)
- `/api/montree/works/guide/route.ts` — zero changes (same API)
- `bioluminescent-theme.ts` — zero changes (BIO.shelf, BIO.workIcon already existed)
- All onboarding component FILES preserved (only renders disabled)
