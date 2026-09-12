# 09 — `app/api/whale/*` caller census and legacy cull

**Date:** 2026-09-12 · **Scope:** all 42 route handlers under `app/api/whale/`
**Outcome:** 9 routes deleted (zero callers), 33 kept (live callers), 1 security
finding (07, #9) resolved by deletion rather than by patching.

---

## Why this was done

`/api/whale/*` is the original Whale Class API, predating Montree. Every route in
it sits behind the old admin-cookie gate in `middleware.ts` (`WHALE_ONLY_PREFIXES`,
with `/api/whale/parent/*` and `/api/whale/teacher/*` carved out to use their own
Supabase auth). Security finding 9 of the Sep 2026 audit — a path traversal in
`app/api/whale/photos/route.ts` that writes an attacker-named file to the local
filesystem — was downgraded from Critical to Medium specifically because that
route is gated *and* has no callers.

"No callers" turns out to describe a lot more than one route. An unreferenced
route handler is not dormant code: it is an *exposed* handler that nobody
exercises, nobody tests, and nobody notices when it breaks or when its auth
assumptions rot. The cheapest fix for a vulnerability in code nothing calls is to
delete the code.

## Method

For every route path, the whole first-party tree — `app/`, `components/`, `lib/`,
`hooks/`, `scripts/`, `public/`, `middleware.ts`, `tests/` — was searched for the
literal URL, **excluding `app/api/whale/` itself**. `public/` was added to the
search after the first pass missed a caller living there (see the
`daily-summary` row below) — a plain `.js` file served as a static asset, fetched
from a hand-written `.html` page, neither of which is `app/`, `components/`,
`lib/`, `hooks/`, `scripts/`, or `tests/`. Template-literal call sites
(`` `/api/whale/curriculum/progress/${childId}` ``) were resolved by hand against
the dynamic segments, since a dynamic route's own directory name (`[childId]`)
never appears in caller code and a naive substring match reports it as dead.

A route counts as CALLED if any non-whale source file fetches it. Prefix matches
were discarded: `/api/whale/children` as a substring also matches
`/api/whale/children/[id]/progress`, so each path was checked against the exact
set of URLs the codebase actually builds.

---

## Deleted — 9 routes, zero callers

| Path | Verbs | Lines | Note |
|---|---|---|---|
| `app/api/whale/curriculum/route.ts` | GET | 120 | Bare `/api/whale/curriculum`. Every live caller hits a *sub*path (`/areas`, `/works`, `/next-works/…`, `/progress/…`); nothing fetches the bare path. |
| `app/api/whale/curriculum/glossary/route.ts` | GET | 50 | Works-with-parent-descriptions glossary. Superseded by the Montree curriculum surfaces. |
| `app/api/whale/curriculum/roadmap/route.ts` | GET | 36 | Whole-curriculum roadmap dump. |
| `app/api/whale/daily-summary/route.ts` | GET | 81 | Cross-child activity for one date. **Not actually zero-caller** — `public/daily-summary.html` + `public/daily-summary.js` (added by commit 33525ffb0, "add static HTML page that bypasses auth") fetched it directly, as an **unauthenticated, URL-guessable** static page sitting outside the admin-cookie gate entirely. That page is itself the finding: a standing auth bypass for daily child activity data. Both files were deleted along with the route rather than kept as an orphaned front-end for a route that no longer exists. |
| `app/api/whale/favorites/route.ts` | GET, POST, DELETE | 130 | Favourites CRUD. |
| `app/api/whale/materials/generate/route.ts` | POST, GET | 239 | Material-PDF generation. |
| `app/api/whale/montessori-works/seed/route.ts` | POST | 135 | One-shot seeder with a hard-coded works array. A write endpoint whose only purpose was a migration that has long since run. |
| `app/api/whale/parent/home-activities/[childId]/route.ts` | GET | 110 | Home-connection activities. **Note:** under `/parent/*`, which middleware explicitly carves OUT of the admin-JWT gate — so this one was the least protected of the nine. |
| `app/api/whale/photos/route.ts` | GET, POST, DELETE | 194 | **Security finding 07 #9.** `POST` built a write path from the client-supplied `photo.name` with no sanitisation, so `../../..` escaped the upload directory and wrote an arbitrary file. Deleted rather than patched — there was nothing to preserve. |

Total: **1,095 lines of unreferenced, network-reachable handler code removed**, plus the 2 files (`public/daily-summary.html`, `public/daily-summary.js`) that were the only caller of one of them and were themselves an unauthenticated bypass of the admin-cookie gate.

### On finding 07 #9 (`whale/photos` path traversal)

The planned fix was
`path.basename(photo.name).replace(/[^A-Za-z0-9._-]/g, '_')`. It is not applied,
because the file no longer exists. If this route is ever revived, apply that
sanitisation **before** the first `writeFile` — and note the route also wrote to
the local filesystem (`public/uploads/...`), which does not survive a Railway
redeploy and was never the right storage for it.

---

## Kept — 33 routes with live callers

| Path | Called from |
|---|---|
| `/api/whale/activities` | `components/ActivityDetailView.tsx`, `components/ActivitySummaryModal.tsx`, `components/CurriculumVisualization.tsx`, `app/admin/montessori/activities/page.tsx` |
| `/api/whale/activity-history` | `components/ActivityDetailView.tsx`, `components/ActivityHistory.tsx` |
| `/api/whale/activity-videos/upload` | `components/ActivityVideoSection.tsx` |
| `/api/whale/ai/activity-guidance` | `lib/hooks/useActivityGuidance.ts` |
| `/api/whale/ai/daily-plan/[childId]` | `lib/hooks/useDailyPlan.ts` |
| `/api/whale/ai/status` | `lib/hooks/useAIStatus.ts` |
| `/api/whale/ai/weekly-plan/[childId]` | `lib/hooks/useWeeklyPlan.ts` |
| `/api/whale/children` | 8 admin pages + `components/tree/ChildSelector.tsx` |
| `/api/whale/children/[id]` | `components/CurriculumVisualization.tsx`, `components/EnhancedChildDashboard.tsx`, `app/admin/montree/students/[id]/page.tsx` |
| `/api/whale/children/[id]/progress` | `app/admin/progress/page.tsx` |
| `/api/whale/curriculum/areas` | `components/teacher/AssignWorkModal.tsx`, `lib/hooks/useAvailableWorks.ts` |
| `/api/whale/curriculum/categories` | `lib/hooks/useAvailableWorks.ts` |
| `/api/whale/curriculum/next-works/[childId]` | `components/progress/NextWorksPanel.tsx`, `lib/hooks/useNextRecommendations.ts` |
| `/api/whale/curriculum/progress/[childId]` | `lib/hooks/useChildProgress.ts` (5 call sites) |
| `/api/whale/curriculum/works` | `components/teacher/AssignWorkModal.tsx`, `lib/hooks/useAvailableWorks.ts` |
| `/api/whale/daily-activity` | `components/EnhancedChildDashboard.tsx`, `app/admin/daughter-activity/page.tsx`, `app/admin/montessori/activities/page.tsx` |
| `/api/whale/montessori-works` | `app/admin/montessori-works/page.tsx` |
| `/api/whale/montessori-works/[id]` | `app/admin/montessori-works/page.tsx` |
| `/api/whale/montessori-works/upload-video` | `app/admin/montessori-works/page.tsx` |
| `/api/whale/parent/children` | `lib/hooks/useParentChildren.ts` |
| `/api/whale/parent/dashboard/[childId]` | `lib/hooks/useParentDashboard.ts` |
| `/api/whale/parent/weekly-report/[childId]` | `lib/hooks/useWeeklyReport.ts` |
| `/api/whale/progress` | `components/ActivityDetailView.tsx`, `components/ActivitySummaryModal.tsx` |
| `/api/whale/progress/enhanced` | `components/ProgressVisualization.tsx` |
| `/api/whale/progress/summary` | `components/CurriculumVisualization.tsx` |
| `/api/whale/reports/generate` | `app/admin/montessori/reports/page.tsx` |
| `/api/whale/reports/pdf` | `app/admin/montessori/reports/page.tsx` |
| `/api/whale/student/[studentId]/progress-summary` | `lib/hooks/useStudentProgressRealtime.ts` (3 call sites) |
| `/api/whale/teacher/assign-work` | `lib/hooks/useAssignWork.ts` |
| `/api/whale/teacher/class-progress` | `lib/hooks/useClassProgress.ts` |
| `/api/whale/teacher/student/[studentId]` | `lib/hooks/useStudentDetail.ts` |
| `/api/whale/teacher/students` | `lib/hooks/useTeacherStudents.ts` |
| `/api/whale/video-watches` | `components/VideoPlayer.tsx` |

---

## One loose end found on the way (not fixed here)

`app/admin/curriculum-progress/page.tsx:86` fetches

```
/api/whale/curriculum/progress?childId=${id}
```

There is no route at `app/api/whale/curriculum/progress/route.ts` — only
`progress/[childId]/route.ts`, which expects the child id as a **path** segment.
That call has been 404-ing. Every other consumer of the same data
(`lib/hooks/useChildProgress.ts`) uses the correct
`/api/whale/curriculum/progress/${childId}` form, so the fix is a one-line change
on that page. Left alone deliberately: it is a bug in a *page*, outside the scope
of this cull, and fixing it silently would change what that screen renders.
