# Handoff: Guru Daily Coach + Onboarding Wiring — Feb 21, 2026

## Summary

Two systems built in this session:
1. **Onboarding Phase 3-5 integration** — All pages wrapped with FeatureWrapper, tutorial overlays now trigger on first visit
2. **Home Guru Daily Coach** — 4 new files that transform the Guru from a Q&A chatbot into a daily hand-holding coach for homeschool parents

## What Was Built

### Onboarding Phase 3-5 (Integration)

All `data-tutorial` attributes were already in place from Phase 1-2. This session wired the FeatureWrapper component and initialization.

**Pages wrapped with FeatureWrapper:**
- `app/montree/dashboard/page.tsx` — `featureModule="student_management"`, autoStart when no children
- `app/montree/dashboard/[childId]/page.tsx` — `featureModule="week_view"`, autoStart
- `app/montree/dashboard/curriculum/page.tsx` — `featureModule="curriculum"`, autoStart
- `app/montree/dashboard/capture/page.tsx` — `featureModule="photo_capture"`, autoStart (wraps Suspense)
- `app/montree/dashboard/guru/page.tsx` — `featureModule="guru"`, autoStart (wraps Suspense)
- `app/montree/principal/setup/page.tsx` — `featureModule="classroom_setup"`, autoStart + **separate onboarding init** (not under dashboard layout)

**Principal init detail:** Principal pages live under `/montree/principal/`, not `/montree/dashboard/`, so they don't inherit the dashboard layout's onboarding initialization. Added a separate `useEffect` that fetches onboarding settings and progress, then calls `initOnboarding('principal', ...)` and `loadProgressFromDB()`.

### Home Guru Daily Coach (4 New Files)

#### API Endpoints

**`app/api/montree/guru/daily-plan/route.ts`** — POST
- Uses Haiku (`claude-haiku-4-5-20251001`) for speed + cost (~$0.001/plan)
- Loads all 5 curriculum JSON files, flattens into unified work list
- Queries child's current progress from `montree_child_work_progress`
- Builds prompt with: current works + statuses, mastered works, available next works (prerequisite-checked), child age
- Caches results in `montree_guru_interactions` with `question_type: 'daily_plan'` — one per child per day
- Returns cached plan on repeat visits (no re-generation)
- Output includes: materials list, 3-4 specific works with step-by-step instructions, video search terms, celebration of progress, parent tip

**`app/api/montree/guru/work-guide/route.ts`** — POST
- Uses Haiku model
- Accepts `work_name`, `child_id`, optional `child_age`
- Finds the specific work across all 5 curriculum JSON files with full metadata (materials, aims, levels, videoSearchTerms)
- Generates step-by-step presentation guide assuming ZERO Montessori experience
- Returns: guide text + video_terms array for YouTube links
- Output includes: YouTube search terms, materials with DIY alternatives, exact setup steps, invitation words to say, numbered presentation steps, what to watch for, variations, developmental purpose

#### UI Components

**`components/montree/guru/GuruDailyBriefing.tsx`** — Dashboard card
- Shows on dashboard above child grid for homeschool parents only
- "Generate Today's Plan" button (not auto-fetch — saves API calls)
- Renders markdown-formatted plan with custom JSX renderer
- Expandable/collapsible
- Uses HOME_THEME styling (botanical aesthetic)
- Shows loading state with 🌱 animation

**`components/montree/guru/GuruWorkGuide.tsx`** — Inline work card component
- Appears inside each expanded work card in FocusWorksSection
- Initially shows "How to Present This" button (dark teal gradient)
- On tap, fetches and renders full presentation guide
- Includes YouTube video links section (amber box)
- Collapsible after loading
- Markdown rendering with headers, lists, bold text
- HOME_THEME styling throughout

### Wiring

**`app/montree/dashboard/page.tsx`** — Modified
- Added `GuruDailyBriefing` import
- Added daily briefing section between child count bar and student grid
- Renders one `GuruDailyBriefing` per child (for parents with multiple children)
- Gated: `{isParent && children.length > 0 && (...)}`

**`components/montree/child/FocusWorksSection.tsx`** — Modified
- Added `GuruWorkGuide` import
- Added `isHomeschoolParent?: boolean` to props interface
- Destructured as `isHomeschoolParent: isParent = false`
- Added `GuruWorkGuide` between Quick Guide/Capture buttons and notes textarea
- Gated: `{isParent && (<GuruWorkGuide ... />)}`

**`app/montree/dashboard/[childId]/page.tsx`** — Modified
- Added `isHomeschoolParent={isHomeschoolParent(session)}` prop to `<FocusWorksSection>`

### Folder Cleanup (Earlier in Session)

Root went from 209 items → 34 items:
- 66 loose .md files → `docs/archive/`
- 22 loose .sql files → `migrations/archive/`
- .xlsx, .docx, .pdf, .png, .zip → `assets/`
- Old scripts → `scripts/archive/`
- Marketing JSX/HTML → `archive/marketing/`
- Fixed one broken reference in `api/guides/language-making-guide/route.ts` (path updated to `assets/`)

## Architecture Notes

- All Guru coach components are gated behind `isHomeschoolParent()` — teachers see ZERO changes
- Daily plans use Haiku (cheap/fast) not Sonnet — estimated $0.001 per plan
- Work guides use Haiku too — estimated $0.002 per guide (more context)
- Caching strategy: daily plans cached in DB as guru_interactions, one per child per day
- Work guides are NOT cached (each request generates fresh — they're fast enough)
- Both APIs use `verifySchoolRequest()` for auth (existing JWT cookie pattern)

## Blockers

- ⚠️ Migrations 126, 127, 131 STILL not run — homeschool system cannot function without these
- ⚠️ Zero Stripe env vars set — billing features crash
- ⚠️ `ANTHROPIC_API_KEY` must be set for Guru coach to work (already set on Railway)

## Testing Checklist

1. Run migrations 126, 127, 131
2. Login as homeschool parent
3. Dashboard should show GuruDailyBriefing cards for each child
4. Tap "Generate Today's Plan" — should call `/api/montree/guru/daily-plan`
5. Navigate to child week view
6. Expand any focus work
7. Should see "How to Present This" button (green/teal)
8. Tap it — should call `/api/montree/guru/work-guide` and render guide
9. YouTube links should open in new tab
10. Teachers should see NONE of the above
