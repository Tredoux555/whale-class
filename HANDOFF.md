# WHALE HANDOFF - February 7, 2026
## Session 155: Montree Home — Clone & Build

> **Brain:** `BRAIN.md` (read this first at session start)
> **Previous handoffs:** `docs/HANDOFF_SESSION_153_CLEANUP_COMPLETE.md`

---

## Quick Summary

Codebase is clean and ready to clone. Health score ~9.1/10 after 3 cleanup sessions (152-154). All 21 commits pushed to GitHub. This session starts the **Montree Home** project — a parent-facing home program cloned from the classroom system.

---

## Codebase Health (Ready for Cloning)

| Category | Score | Notes |
|---|---|---|
| Dead Code | 9/10 | 44 orphaned files removed |
| File Size | 8/10 | All pages under 950 lines; large files are data only |
| Console Statements | 10/10 | Zero console.log in app code |
| Type Safety | 8/10 | 27 remaining `:any` are legitimate casts |
| Import Hygiene | 10/10 | Zero stale imports |
| Supabase Consolidation | 10/10 | 100% using `@/lib/supabase-client` |
| API Health | 9/10 | 185/185 routes with try-catch |

---

## Montree Home: What It Is

A parent-facing version of Montree for home use. Parents track their children's Montessori progress at home without needing a school or classroom. Simpler than the teacher version — no classroom abstractions, no principal flow, no teacher codes.

**Assessment (Session 153): 47-66 hours estimated.**

---

## What Copies As-Is (Low Effort)

| Asset | Count | Notes |
|-------|-------|-------|
| Game routes | 27 | `/app/montree/dashboard/games/*` — letter-tracer, word-building, etc. |
| Reusable components | 35 | WorkWheelPicker, progress bars, curriculum displays |
| Home curriculum | 68 works | Already at `lib/curriculum/data/home-curriculum.json` |
| Comprehensive guides | 309 works | `lib/curriculum/comprehensive-guides/*.json` |
| Guru knowledge base | 96,877 lines | `data/guru_knowledge/sources/*.txt` |

---

## What Needs Building (The Work)

### 1. Auth System (New)
- Email/password registration (no school codes, no teacher codes)
- Password reset flow
- Parent profile (name, email, children)
- Consider: Supabase Auth or custom auth like current system?

### 2. Database Tables (5 New)
```
home_families        — parent accounts (email, password_hash, name, plan)
home_children        — children per family (name, age, enrolled_at)
home_progress        — progress tracking per child per work
home_curriculum      — 68-work curriculum assigned to family
home_sessions        — work session logs (like montree_work_sessions)
```

### 3. Routes (New)
```
/home                — Landing/marketing page
/home/register       — Email/password signup
/home/login          — Email/password login
/home/dashboard      — Parent dashboard (children grid)
/home/dashboard/[childId]  — Child detail (week view, progress)
/home/dashboard/curriculum — Browse 68-work curriculum
/home/dashboard/games/*    — Games (can share with classroom version)
/home/settings       — Family settings, subscription
```

### 4. Components to Modify (15)
These exist but reference classroom/teacher concepts that need replacing:
- Dashboard header (remove teacher/school references)
- Student grid (rename to children grid)
- Progress displays (remove classroom context)
- Curriculum page (use home curriculum, not classroom curriculum)
- Work detail views (remove classroom-specific UI)

### 5. API Routes (New)
```
/api/home/auth/register    — Create family account
/api/home/auth/login       — Email/password login
/api/home/children         — CRUD children
/api/home/progress         — Progress tracking
/api/home/curriculum       — Home curriculum management
/api/home/guru             — Guru adapted for home context
```

---

## Key Architecture Decisions

### Shared vs Duplicated
- **Share:** Game components, curriculum data, Guru knowledge, comprehensive guides
- **Duplicate (then modify):** Dashboard pages, progress tracking, auth flow
- **New:** Registration, family management, home-specific onboarding

### Supabase Client
Single client at `lib/supabase-client.ts`. All new routes should import from here:
- `getSupabase()` — server-side with service role key
- `createSupabaseClient()` — browser-side with anon key

### File Organization
Suggested structure:
```
app/home/                    — All home routes
app/api/home/                — All home API routes
lib/home/                    — Home-specific utilities
components/home/             — Home-specific components
components/shared/           — Components used by both classroom + home
```

---

## Existing Home Curriculum

The 68-work home curriculum is already defined at `lib/curriculum/data/home-curriculum.json`. It covers 5 areas appropriate for home:
- Practical Life (home-adapted: cooking, cleaning, self-care)
- Sensorial (simplified materials parents can make)
- Mathematics (hands-on activities with household items)
- Language (reading, phonics, writing)
- Cultural (nature, geography, science at home)

---

## Git Status

All clean. 21 commits from sessions 152-154 are pushed. Start fresh.

```bash
git status  # Should be clean
```

---

## Quick Start for This Session

1. Read `BRAIN.md` for full context
2. Decide on route structure (`/home/*` recommended)
3. Create DB migration for home tables
4. Clone dashboard pages with classroom references stripped
5. Build email/password auth
6. Wire up home curriculum
7. Build and verify

---

*Updated: February 7, 2026*
*Session: 155 (Montree Home Clone)*
*Previous: Session 154 (Cleanup Final — Health 9.1/10)*
