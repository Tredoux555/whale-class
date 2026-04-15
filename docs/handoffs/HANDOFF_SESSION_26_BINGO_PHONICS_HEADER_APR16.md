# Session 26 — Bingo Phonics Tolerant Matching + Double-Header Cleanup (Apr 16, 2026)

**Commit:** `df47ad4f` (pushed to main)

## What shipped

### 1. English Corner — Bingo Phonics Review tracking

**Bug:** The Bingo Phonics tab on `/montree/dashboard/language-tracker` was showing 20/20 students in "NOT YET" even after multiple sessions of Bingo Phonics work across the class. Root cause was two separate lookup failures in `app/api/montree/dashboard/language-tracker/route.ts`:

- The client hits `?work_name=bingo-phonics-review` (dashes, URL-clean). The server was running `.ilike('name', '%bingo-phonics-review%')` verbatim, which never matches a row named "Bingo Phonics Review" (spaces).
- The query was also restricted to the Language area (`area_id = langArea.id`). If the work lives under a custom area like Language-PhonicsFast (or anywhere else in the classroom curriculum), it was invisible to the tracker.

**Fix:** Tolerant matching + cross-area search when `work_name` is specified:

```ts
if (workNameParam) {
  const tokens = workNameParam
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(t => t.replace(/[%_\\]/g, '\\$&'));
  const pattern = `%${tokens.join('%')}%`;
  query = query.ilike('name', pattern);
} else if (langArea) {
  query = query.eq('area_id', langArea.id);
}
```

`bingo-phonics-review` becomes `%bingo%phonics%review%` and matches "Bingo Phonics Review", "Bingo (Phonics) Review", "Bingo-Phonics Review", etc. Also the 404 on missing Language area is now gated on `!langArea && !workNameParam` so work_name searches still work if a classroom has no Language area seeded.

### 2. Double DashboardHeader cleanup

**Bug:** `/language-tracker`, `/focus`, and `/language-semester` pages rendered two stacked headers. The dashboard layout (`app/montree/dashboard/layout.tsx:37`) already renders `<DashboardHeader />` for every route under `/montree/dashboard/*`, but these three subpages were also importing and rendering their own.

**Fix:** Removed the import + render from all three pages, added `pt-20` to the inner containers so content sits below the fixed-position header from layout:

- `app/montree/dashboard/language-tracker/page.tsx` — already had `pt-20`, just removed the dup header
- `app/montree/dashboard/focus/page.tsx` — removed import line 20 + render line 229, added `pt-20` to `<div className="max-w-4xl mx-auto p-4 pb-24 pt-20">`
- `app/montree/dashboard/language-semester/page.tsx` — removed import line 11 + render line 142, added `pt-20` to `<main className="max-w-3xl mx-auto px-4 py-6 pt-20">`

Verified: `grep -rn DashboardHeader app/montree/dashboard` now only hits `layout.tsx` (import + render) and two comment references in `curriculum/page.tsx` and `[childId]/layout.tsx`.

## Audit notes (two clean passes)

- All three fixed pages have `pt-20` on their inner container
- Only `layout.tsx` renders `<DashboardHeader />`
- `language-tracker/route.ts` compiles clean: conditional 404, tolerant `ilike`, classroom scoping preserved, still auth-gated via `verifySchoolRequest()`
- `work_name=bingo-phonics-review` now searches all classroom curriculum (not just Language area)

## Verification steps for next session

1. Hard-refresh `/montree/dashboard/language-tracker?work=bingo-phonics-review` after Railway deploy. Should show children who've done Bingo Phonics Review this week in "Visited" with work pills.
2. If tab is still empty, verify "Bingo Phonics Review" exists as a row in `montree_classroom_curriculum_works` for classroom `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`:
   ```sql
   SELECT id, name, area_id FROM montree_classroom_curriculum_works
   WHERE classroom_id = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'
     AND name ILIKE '%bingo%phonics%';
   ```
   If no row, the work needs to be added via the Photo Audit "Add as new work" flow next time a Bingo Phonics photo is captured.
3. Verify English Corner, Focus List, and Language Semester Report pages show a single header (not stacked).

## Still outstanding

- **Migration 177** (`review_before_process` feature flag) still not run on production. Photo Bucket tab is gated on this.
- **Monitor Campaign D** on gmass.co/dashboard (should be wrapped by now).
- **Verify Campaign A** ("Montree" pitch) draft still scheduled for Apr 27.

## Files changed

- `app/api/montree/dashboard/language-tracker/route.ts`
- `app/montree/dashboard/language-tracker/page.tsx`
- `app/montree/dashboard/focus/page.tsx`
- `app/montree/dashboard/language-semester/page.tsx`
