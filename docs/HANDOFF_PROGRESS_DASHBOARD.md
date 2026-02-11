# Progress Dashboard + Feature Fixes — Handoff (Feb 11, 2026)

## What This Is

Rebuilt the child Progress tab from a basic bar chart into a full **Child Progress Portfolio** — the page teachers see when they tap 📊 Progress in the child view. Also added a position picker to the curriculum Add Work modal and fixed camera capture + checkbox persistence bugs.

## Status: ✅ COMPLETE — Needs `git push origin main`

3 commits ready to push (2 ahead of remote):
- `84dab04` — Position picker in AddWorkModal
- `ba7b47d` — Child Progress Portfolio

---

## 1. Child Progress Portfolio (`ba7b47d`)

### What Changed

**Before:** Simple progress bars showing position in each area's curriculum sequence. Fetched from `/api/montree/progress/bars` (a route that doesn't even return complete data).

**After:** Full portfolio view with 4 sections:

| Section | What | Data Source |
|---------|------|-------------|
| Hero Stats | 3 big numbers: Mastered / Practicing / Presented | `/api/montree/progress` → `stats` |
| Area Progress Bars | 5 tappable bars with gradient fills, completion counts, current work label | `/api/montree/progress/summary` → `areas` |
| Recent Photos | Horizontal scroll strip with lightbox viewer | `/api/montree/media?child_id=X&limit=20` |
| Timeline | Activity grouped by month — mastery ⭐, practicing 🔄, presented 📋, notes 📝, observations 👁 | `/api/montree/progress?include_observations=true` |

### Interactive Features
- **Tap any area bar** → filters the timeline to that area only
- **Tap area again** → shows all areas
- **Tap any photo** → full-screen lightbox viewer
- **Tap ✕ or backdrop** → closes lightbox

### Files Modified

| File | Change |
|------|--------|
| `app/montree/dashboard/[childId]/progress/page.tsx` | Complete rewrite (124 → 413 lines) |
| `app/api/montree/progress/route.ts` | Added `include_observations=true` query param (fetches from `montree_behavioral_observations`) |

### API Enhancement

The progress API (`/api/montree/progress`) now accepts an optional query param `include_observations=true`. When set, it additionally fetches from `montree_behavioral_observations` and returns an `observations` array alongside the existing `progress`, `stats`, and `byArea` fields. The fetch is wrapped in try/catch so it gracefully handles if the table doesn't exist.

### Data Flow (3 parallel fetches on mount)

```
useEffect → Promise.all([
  1. /api/montree/progress/summary?child_id=X     → area bars + overall %
  2. /api/montree/media?child_id=X&limit=20        → photo strip
  3. /api/montree/progress?child_id=X&include_observations=true → hero stats + timeline
])
```

### Design Notes
- Mobile-first layout (all sections stack vertically)
- Area colors: practical_life=emerald, sensorial=amber, mathematics=indigo, language=rose, cultural=violet
- Active area highlight uses `boxShadow` (not Tailwind ring — `ringColor` isn't a valid CSS property)
- Photos filtered to `media_type === 'photo' || 'image' || null` (excludes videos)
- Timeline events deduplicated by ID prefix (`m-`, `pr-`, `ps-`, `n-`, `o-`)

---

## 2. Position Picker in AddWorkModal (`84dab04`)

### What Changed

The "Add New Work" modal on the curriculum page now lets teachers choose WHERE to insert a new work in the sequence (beginning, after a specific work, or end of list). Previously it always appended to the end.

### Files Modified

| File | Change |
|------|--------|
| `components/montree/AddWorkModal.tsx` | Added position picker overlay, `after_sequence` in API call |
| `app/montree/dashboard/curriculum/page.tsx` | Passes `areaWorks={byArea}` prop to AddWorkModal |

### How It Works
- Full-screen overlay listing all works in the selected area
- Options: "Beginning", "After #N [work name]", "End of list"
- Selected position highlighted in green
- Sends `after_sequence` to the existing curriculum POST API
- API already had full support for `after_sequence` (shifts subsequent works automatically)

---

## 3. Bug Fixes (previous commits in this session)

| Fix | Commit | What |
|-----|--------|------|
| Camera capture | `6d86791` | Unblocked Permissions-Policy for camera/microphone in next.config.ts, fixed facingMode for mobile |
| Checkbox persistence | `0cefeeb` | Marketing hub checkboxes now persist via localStorage using useEffect instead of inline initialization |

---

## Planning Process

3 rounds of planning (per user request):
- `.claude/plans/progress-dashboard-v1.md` — Initial design with separate timeline API
- `.claude/plans/progress-dashboard-v2.md` — Simplified: reuse existing APIs, improve above-the-fold for Loom demo
- `.claude/plans/progress-dashboard-v3-FINAL.md` — Final: skip separate API, enhance existing progress route, 3 parallel fetches

Key v3 decisions:
- No new API routes — enhanced existing `/api/montree/progress` with `include_observations` param
- No separate timeline endpoint — build timeline client-side from progress + observations data
- Reuse `/api/montree/progress/summary` for area bars (already returns exactly what we need)
- Reuse `/api/montree/media` for photos (already supports child_id filter)

---

## To Deploy

```bash
cd ~/whale && git push origin main
```

Railway auto-deploys on push to `main`.
