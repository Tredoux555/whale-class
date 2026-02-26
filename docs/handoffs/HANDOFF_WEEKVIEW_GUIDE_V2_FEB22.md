# Handoff: WeekViewGuide v2 — 20-Step Full Platform Tour (Feb 22, 2026)

## Summary

Expanded the WeekViewGuide from 17 to 20 steps. Reordered core work interaction steps (area badge, notes, status badge) to come right after the capture explanation — BEFORE tab/nav highlights. Added student photo faces intro, home navigation, and label printing as the grand finale.

## Changes Made

### WeekViewGuide.tsx — Step Reorder + New Steps

**Reorder (steps 7-9 moved up from end):**
- area-badge (selecting/changing a work via wheel picker) — was step 14, now step 7
- notes (recording observations) — was step 15, now step 8
- status-badge (marking Presented/Practicing/Mastered) — was step 16, now step 9

**New steps added (17-19):**
- Step 17: `student-faces-intro` — Centered speech bubble: "Ooohhh! One more thing to finish up — you can give each of your students their own face!"
- Step 18: `nav-home` — Highlights classroom name/logo link: explains go back → Students → Edit → Take Photo → Update
- Step 19: `nav-labels` — Highlights the label printing icon (🏷️): "Print weekly work labels for each student — ready to stick on their work mats!" — **FINAL STEP (Done!)**

### DashboardHeader.tsx — Icon + Attribute Changes

1. Added `data-guide="nav-home"` to the classroom name/logo Link (back to dashboard)
2. Changed print icon from 🖨️ to 🏷️ (label emoji)
3. Changed title from "Print" to "Print Labels"
4. Added `data-guide="nav-labels"` to the label Link

### WorkWheelPicker.tsx — Area Badge Icon Update

Replaced plain text area icon with round colored circle (matching AreaBadge component):
- Main header: `w-12 h-12 rounded-full` with `backgroundColor: areaConfig.color`
- Empty state: `w-16 h-16 rounded-full` with same styling
- Position picker header: same `w-12 h-12` treatment

## Complete 20-Step Flow

| Step | Key | Target | What |
|------|-----|--------|------|
| 0 | focus-block | focus-section | Dashboard overview (expands first work) |
| 1 | work-name | first-work-name | Tap work name to open dashboard |
| 2 | quick-guide-btn | quick-guide-btn | Quick Guide button (opens modal) |
| 3 | quick-guide-content | quick-guide-content | Quick Guide modal content (insideModal) |
| 4 | watch-video | watch-video-btn | YouTube link (closes quick guide, no YT open) |
| 5 | capture | capture-btn | Camera button highlight |
| 6 | capture-info | (centered) | Photo used in reports + records |
| 7 | area-badge | area-badge-first | Change your work (opens wheel picker) |
| 8 | notes | notes-area | Notes + observations → Guru profile |
| 9 | status-badge | status-badge-first | Mark Presented/Practicing/Mastered |
| 10 | tab-progress | tab-progress | Progress overview tab |
| 11 | tab-gallery | tab-gallery | Photo gallery tab |
| 12 | tab-reports | tab-reports | Parent reports tab |
| 13 | nav-guru | nav-guru | AI teaching assistant |
| 14 | nav-curriculum | nav-curriculum | Full curriculum browser |
| 15 | nav-inbox | nav-inbox | Contact us / messaging |
| 16 | feedback-btn | feedback-btn | Bug reports + feedback |
| 17 | student-faces-intro | (centered) | "Ooohhh! Give students their own face!" |
| 18 | nav-home | nav-home | Go to Students → Edit → Photo → Update |
| 19 | nav-labels | nav-labels | Print weekly work labels (Done!) |

## Files Modified (3)

| File | What Changed |
|------|-------------|
| `components/montree/onboarding/WeekViewGuide.tsx` | Reordered steps 7-9, added steps 17-19 (20 total) |
| `components/montree/DashboardHeader.tsx` | Added `data-guide="nav-home"` + `data-guide="nav-labels"`, 🖨️→🏷️ |
| `components/montree/WorkWheelPicker.tsx` | Area icon → round colored circle (3 locations) |

## Known Issues / TEMP Flags

- ⚠️ `showWeekViewGuide = true` on line 88 of `[childId]/page.tsx` — TEMP flag, remove before production
- Guide still not gated behind actual onboarding state (needs migration 131)
- Wheel picker opens during guide (step 7 onAdvance) — user can close it and continue

## Next Steps

- Test all 20 steps end-to-end on mobile
- Run migrations 126, 127, 131
- Gate guide behind onboarding state
- Add `verifyChildBelongsToSchool` to remaining routes: media/upload, reports/generate, reports/pdf, reports/send, weekly-planning/*, focus-works
