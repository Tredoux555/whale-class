# Handoff: Performance Audit + Tab Revert (Mar 16, 2026)

## ⚠️ TAB CONSOLIDATION REVERTED

The initial tab consolidation (4→2 tabs) was **reverted by user request**. User wanted Gallery and Reports tabs preserved. Current state: **3 tabs (Week / Gallery / Reports)**. Progress tab hidden from tab bar but route still accessible.

Additionally, parent report page fixed: duplicate photos in `all_photos` grid filtered out when already shown inline with work cards.

## Session Summary

Full performance audit of the Montree PWA app (user reported lag), followed by tab consolidation attempt (reverted) and parent report photo fix.

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

## Part 2 — Tab Revert + Parent Report Fix (current state)

### What Changed

Initial consolidation (4→2 tabs) was reverted. Restored 3 visible tabs: Week / Gallery / Reports. Progress tab hidden from tab bar but route still functional. Parent report page fixed to prevent duplicate photos.

### Files Modified (6)

1. **`app/montree/dashboard/[childId]/layout.tsx`** — Restored 3 tabs:
   - `tabs` array: Week + Gallery + Reports
   - `getActiveTab()` handles `/gallery` → 'gallery', `/reports` → 'reports', `/progress` → 'progress'
   - `data-guide` attributes: `tab-week`, `tab-gallery`, `tab-reports`

2. **`app/montree/dashboard/[childId]/gallery/page.tsx`** — TDZ fix preserved:
   - `filteredPhotos` useMemo declared BEFORE useEffect that references it
   - Comment header corrected to "Gallery"
   - Progress bars/stats in gallery are ORIGINAL features (pre-consolidation), kept as-is

3. **`components/montree/home/ShelfView.tsx`** — Nav link correct:
   - Line ~556: Points to `/montree/dashboard/${childId}/progress` (route, not tab)

4. **`app/montree/dashboard/snap/page.tsx`** — Nav link correct:
   - Line ~864: Points to `/montree/dashboard/${resultChild.id}/progress` (route, not tab)

5. **`components/montree/onboarding/WeekViewGuide.tsx`** — Restored + cleaned:
   - Restored `tab-gallery` step (Step 10) and `tab-reports` step (Step 11)
   - Removed stale `tab-progress` step (Progress tab not in tab bar)
   - Fixed step numbering comments (0-17, 18 steps total)
   - Updated header comment from "20-step" to "18-step"

6. **`app/montree/parent/report/[reportId]/page.tsx`** — Duplicate photo fix:
   - `all_photos` grid now filters out photos already shown inline with work cards
   - Builds Set of `photo_url` from `works_completed`, excludes matching URLs from `all_photos`
   - If no extra photos remain after filtering, section is not rendered

### Build Audit Results

3 audit cycles across all 6 modified files:
- Cycle 1: Fixed step numbering comments in WeekViewGuide (cosmetic). Verified all other files correct.
- Cycle 2: Fixed "20-step" → "18-step" comment. Grep confirmed zero `tab-progress` references in codebase. CLEAN.
- Cycle 3: Full re-read of all files. CLEAN — zero issues.

### Deploy

⚠️ NOT YET PUSHED. Previous commit `912fb559` (consolidation) needs to be overwritten with revert changes. Push from Mac with VPN off.

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
