# Handoff: Performance Audit + Tab Consolidation (Mar 16, 2026)

## Session Summary

Full performance audit of the Montree PWA app (user reported lag), followed by implementation of tab consolidation as first major fix.

## Part 1 — Deep Performance Audits (3 parallel audits, research only)

### Audit A: API Route Performance (18 issues found)
- 6 CRITICAL: No Cache-Control headers on any route, progress/summary double-fetches curriculum, O(N^2) area summary loop, media GET sequential queries, Guru redundant JWT verifications, focus-works Chinese name duplication
- 8 HIGH: children GET redundant classroom lookups, progress GET sequential queries, enrichWithChineseNames called 6x, media in-memory sorting O(N log N), Guru no early return for unpaid, rate limiter fire-and-forget, verifyChildBelongsToSchool no TTL cache, Guru sequential greeting queries
- 4 MEDIUM: progress/summary .single() no error handling, focus-works POST no work validation, media fetches curriculum unnecessarily, Guru UTC timezone daily limits

### Audit B: PWA + Frontend Performance (25+ issues found)
- DashboardHeader: 2 API calls on every mount, 8 useState + complex hook structure
- ShelfView: loads ALL 300+ curriculum works on mount, no debounce on search
- PortalChat: TTS creates new Audio on every play, image compression blocks UI
- FocusWorksSection: touch event timers stack up, heavy inline JSX in loops
- Child Week Page: 9+ state variables, unoptimized Guru settings fetch
- I18N: full 1373-key bundle loaded globally, regex created on every translate call

### Audit C: Database Query Patterns
- Covered in API audit above

## Part 2 — Tab Consolidation Implementation (4 tabs -> 2 tabs)

### What Changed

Consolidated the child week view from 4 tabs (Week / Gallery / Progress / Reports) down to 2 tabs (Week / Progress). The gallery page now serves as the unified Progress tab, incorporating photos + area progress bars.

### Files Modified (5)

1. **`app/montree/dashboard/[childId]/layout.tsx`** — Complete tab rewrite:
   - `tabs` array reduced from 4 entries to 2 (Week + Progress)
   - Progress tab href points to `/gallery` route
   - `getActiveTab()` maps both `/gallery` and `/progress` to 'progress' tab ID
   - Old routes (`/progress`, `/reports`, `/profile`, `/observations`) still functional but hidden from tab bar

2. **`app/montree/dashboard/[childId]/gallery/page.tsx`** — TDZ fix:
   - Moved `useEffect` (lightbox index clamping) AFTER `filteredPhotos` useMemo declaration
   - Was referencing `filteredPhotos` before it was declared — caused Temporal Dead Zone error
   - Added progress data fetch (bar graph) to gallery page

3. **`components/montree/home/ShelfView.tsx`** — Navigation link update:
   - Line ~556: Changed `/montree/dashboard/${childId}/progress` to `/montree/dashboard/${childId}/gallery`

4. **`app/montree/dashboard/snap/page.tsx`** — Navigation link update:
   - Line ~864: Changed "View Progress" link from `/progress` to `/gallery`

5. **`components/montree/onboarding/WeekViewGuide.tsx`** — Stale reference cleanup:
   - Removed `tab-gallery` step (Step 11) — tab no longer exists
   - Removed `tab-reports` step (Step 12) — tab no longer exists
   - `tab-progress` step remains and covers the consolidated Progress tab

### Architecture Notes

- Old `/progress/page.tsx` and `/reports/page.tsx` still exist as files — accessible via direct URL but not in tab bar
- The gallery page IS the Progress tab now — shows photos + area progress bars + AI photo insight
- Reports are accessible from within the gallery/progress view (not a separate tab)
- `data-guide="tab-progress"` attribute on the Progress tab works for onboarding

### Build Audit Results

3-pass audit across all 5 modified files:
- Pass 1: Verified hook order in gallery page (TDZ fix correct)
- Pass 2: Verified all navigation links updated, no stale /progress refs in components
- Pass 3: Found and fixed WeekViewGuide stale tab-gallery/tab-reports references
- Final: CLEAN — no remaining issues

### Deploy

Commit `912fb559` — pushed from Mac. Includes WeekViewGuide fix (1 file changed, 2 insertions, 18 deletions).

Note: VM disk was completely full (ENOSPC) throughout this session. All work done via Read/Write/Edit/Grep tools only — no Bash available.

### Remaining Performance Work (from audits, not yet implemented)

Priority order for future sessions:
1. Add Cache-Control headers to all API routes (2-3h, biggest single impact)
2. Parallelize sequential DB queries in progress/media/guru routes (1.5h)
3. Fix progress/summary double-fetch + O(N^2) loop (45min)
4. Fix focus-works Chinese name duplication (15min)
5. Add debounce to ShelfView search (15min)
6. Consolidate DashboardHeader API calls (30min)
7. Add TTL to verifyChildBelongsToSchool cache (15min)
8. Move image compression to Web Worker in PortalChat (1h)
