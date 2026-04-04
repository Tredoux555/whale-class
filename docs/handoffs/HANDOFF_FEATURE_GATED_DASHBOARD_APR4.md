# Handoff: Feature-Gated Dashboard for Minimalist New Schools (Apr 4, 2026)

## Summary

Dashboard sections are now gated by the existing feature flag system (`montree_feature_definitions` + `montree_school_features`). New schools see a clean, minimal dashboard (just student grid + search + add). Advanced panels only appear when enabled per-school via super-admin.

## What Changed

### Dashboard Gating (commit `039b435d`)

5 dashboard sections are now feature-gated:

| Feature Key | Section | Default | Whale Class |
|-------------|---------|---------|-------------|
| `daily_brief` | Daily Brief panel (above grid) | OFF | ON |
| `intelligence_panels` | Classroom Intelligence (attendance, stale works, conference notes, evidence, pulse) | OFF | ON |
| `teacher_tools` | Teacher Tools (weekly admin, batch reports) | OFF | ON |
| `shelf_autopilot` | Shelf Autopilot (inside Teacher Tools) | OFF | ON |
| `paperwork_tracker` | Paperwork Tracker (inside Intelligence) | OFF | ON |

**Always visible** (not gated): Student grid, search, add student, birthday banner, capture, curriculum, guru.

### Super-Admin Feature Toggle UI

Each school row in the super-admin Schools tab now has a ⚙️ gear button. Opens a modal showing all features grouped by category (Dashboard, AI Tools, Management, Photo & Media, Reports, Library & Tools) with toggle switches. Bulk Enable All / Disable All buttons. PRO badge on premium features.

### Files Changed (7)

- `lib/montree/features/types.ts` — Added 5 new FeatureKey types
- `app/montree/dashboard/page.tsx` — Wrapped sections with `isEnabled()` checks
- `app/api/montree/features/route.ts` — POST now accepts super-admin auth (`x-super-admin-token` header) in addition to teacher auth
- `components/montree/super-admin/SchoolsTab.tsx` — Added gear button + SchoolFeaturesModal
- `components/montree/super-admin/SchoolFeaturesModal.tsx` — NEW: toggle UI for per-school features
- `app/montree/super-admin/page.tsx` — Passes `sessionToken` to SchoolsTab
- `migrations/160_dashboard_feature_gates.sql` — Seeds feature definitions + enables for Whale Class

## Existing Infrastructure Used

The feature flag system was already fully built but not wired to the dashboard:
- `montree_feature_definitions` table (20+ features seeded)
- `montree_school_features` table (per-school toggles)
- `montree_classroom_features` table (per-classroom overrides)
- `FeaturesProvider` context wrapping dashboard layout
- `useFeatures()` hook with `isEnabled(key)` API
- `/api/montree/features` GET/POST endpoints
- Server-side `isFeatureEnabled()` function
- SessionStorage cache with 5-min TTL + window focus invalidation

## Migration Status

**Migration 160 — ✅ RUN** (confirmed via screenshot). Seeds 5 dashboard feature definitions and enables all for Whale Class.

**Previously pending (also run this session):**
- Migration 158 — `paperwork_current_week` column
- Migration 159 — `teacher_confirmed` on media

All migrations through 160 are now run in production.

## How to Enable Features for a New School

1. Go to super-admin panel → Schools tab
2. Click the ⚙️ gear icon on the school's row
3. Toggle features on/off
4. Changes take effect immediately (feature cache invalidates on window focus)

## Architecture Notes

- `isEnabled()` returns `false` while features are loading (fail-closed) — no flash of advanced UI
- Feature priority: classroom override > school override > definition default
- All new feature definitions have `default_enabled: false` — clean slate for new schools
- The features POST route now dual-authenticates: super-admin token OR teacher cookie
