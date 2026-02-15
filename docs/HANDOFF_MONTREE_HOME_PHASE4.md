# Montree Home — Phase 4 Handoff: Curriculum Browser

**Date:** Feb 15, 2026
**Commits:** `62ad6772` (main), `cd9eb8c7` (audit fix)
**Status:** ✅ Complete

---

## What Was Built

Read-only curriculum browser at `/montree/dashboard/curriculum/browse`. Loads all 268 Montessori works from 5 static JSON files (no API calls). Designed for both teachers and homeschool parents with role-aware language.

---

## Files Created (1 new)

- `app/montree/dashboard/curriculum/browse/page.tsx` — Full curriculum browser (515 lines)

## Files Modified (1)

- `app/montree/dashboard/curriculum/page.tsx` — Added "Browse Guide" button in header + imported `isHomeschoolParent` and `Link`

---

## Features

### Navigation
- 5 area tabs (Practical Life, Sensorial, Math, Language, Cultural) using AREA_CONFIG colors
- Sticky header + sticky tab bar for easy navigation while scrolling
- Back button returns to previous page
- "Browse Guide" button on main curriculum page links here

### Filtering
- **Search** — filters by work name, description, or materials (case-insensitive)
- **Age filter** — dropdown with All Ages, Year 1 (2.5-4), Year 2 (4-5), Year 3 (5-6)
- Results count updates in real-time ("X of Y works")
- Clear button on search input

### Work Display
- Collapsible category sections (auto-expands first category on area change)
- Collapsed work cards show: sequence number, name, description (truncated), age range badge
- Expanded work cards show full details:
  - Description
  - Age range + level count info blocks
  - Materials list (amber pill badges)
  - Direct aims / "What Your Child Learns" (emerald pills)
  - Indirect aims / "Hidden Benefits" (blue pills)
  - Prerequisites (resolved to human-readable names via cross-area lookup map)
  - Control of error / "How They Self-Correct"
  - Progression levels with numbered steps + YouTube demo links

### Role-Aware Labels
| Section | Teacher View | Homeschool Parent View |
|---------|-------------|----------------------|
| Page title | "Curriculum Browser" | "Montessori Curriculum Guide" |
| Subtitle | (none) | "your guide to Montessori at home" |
| Materials | "Materials" | "Materials You'll Need" |
| Direct Aims | "Direct Aims" | "What Your Child Learns" |
| Indirect Aims | "Indirect Aims" | "Hidden Benefits" |
| Control of Error | "Control of Error" | "How They Self-Correct" |

---

## Architecture Decisions

1. **Static JSON imports** — All 5 curriculum files imported at build time via `import ... from '@/lib/curriculum/data/X.json'`. Zero API calls. Instant load. Works offline.

2. **No new API routes** — Read-only page with no server-side data fetching needed.

3. **Prerequisite resolution** — `allWorksMap` (useMemo) builds a flat `id → name` lookup across all 5 areas. Prerequisite IDs displayed as human-readable names. Falls back to raw ID if not found.

4. **Separate from teacher curriculum page** — Teacher curriculum page (`/montree/dashboard/curriculum`) handles editing, reordering, importing. This browse page is read-only reference. Both can coexist.

---

## Audit Results

One minor fix applied (`cd9eb8c7`): age label display in collapsed cards used `split(' ')[0] + split(' ')[1]` which could show "undefined" for unrecognized ageRange values. Fixed to `split(' (')[0]` which safely strips the parenthetical age range.

No security issues. No missing auth checks. No console.log statements.

---

## All 4 Phases Summary

| Phase | What | Commit | Files |
|-------|------|--------|-------|
| 1 | Foundation (auth + DB + signup/login) | `9378007e`, `cb5bfd24` | ~8 |
| 2 | Dashboard (role-based UI trimming) | `fc1521ef` | 6 |
| 3 | Guru (freemium + Stripe + homeschool prompt) | `c5e18ef2`, `381bc5c8`, `7bcf5146` | 7 |
| 4 | Curriculum browser | `62ad6772`, `cd9eb8c7` | 2 |

**Migrations still needed:** `126_homeschool_tables.sql` + `127_guru_freemium.sql`
**Dead file to delete:** `app/api/montree/auth/homeschool/route.ts`
**Stripe (when ready):** Set `GURU_FREEMIUM_ENABLED=true`, `STRIPE_PRICE_GURU_MONTHLY`, `STRIPE_WEBHOOK_SECRET_GURU` on Railway
