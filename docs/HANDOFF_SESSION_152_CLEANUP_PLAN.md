# Session 152: Codebase Cleanup — Plan + Phase 1 Complete

**Date:** February 7, 2026
**Commit:** `cca3c11` — fix: remove hardcoded secret fallback and delete dead plain-text auth route

---

## What Happened This Session

### 1. Teaching Tools Added to Curriculum Page
The Language Making Guide was moved from the pink tab at the top of the curriculum page to a new "Teaching Tools" section below the 5 subject area cards. Two tools were copied from the admin dashboard into Montree as **completely separate copies** (not shared code):

| Tool | Source | Montree Copy |
|------|--------|-------------|
| 3-Part Cards Generator | `app/admin/card-generator/page.tsx` | `app/montree/dashboard/card-generator/page.tsx` |
| Vocabulary Flashcards | `app/admin/vocabulary-flashcards/page.tsx` | `app/montree/dashboard/vocabulary-flashcards/page.tsx` |

Both have back buttons that navigate to `/montree/dashboard/curriculum`.

### 2. Home Curriculum Curated (68 Works)
Created `lib/curriculum/data/home-curriculum.json` with 68 essential works for the Montree Home parent app:

| Area | Count |
|------|-------|
| Practical Life | 19 |
| Sensorial | 10 |
| Mathematics | 15 |
| Language | 12 |
| Cultural | 10 |

Each work has master curriculum fields PLUS home-specific fields: `home_sequence`, `home_priority` (essential/recommended/enrichment), `home_tip`, `buy_or_make`, `estimated_cost`, `home_age_start`.

### 3. Codebase Audit Completed
Full audit of Montree codebase revealed:
- **3 Supabase client files** with different patterns (47 routes create inline clients)
- **7 auth systems** that don't talk to each other (but they work — teacher login uses newer bcrypt route)
- **6 debug API endpoints** exposed in production
- **27 duplicate game routes** (same games at `/montree/games/X` and `/montree/dashboard/games/X`)
- **469 console.log statements** (339 in API routes)
- **23 `: any` type annotations**
- **3 files over 900 lines** (largest: super-admin at 1,243 lines)

### 4. Phase 1 Executed: Security Fixes
Two critical security issues fixed:

**1a. `lib/auth.ts` line 4** — Removed hardcoded fallback secret:
```
BEFORE: const SECRET = process.env.ADMIN_SECRET || "whale-class-secret-change-in-production"
AFTER:  const SECRET = process.env.ADMIN_SECRET;
        if (!SECRET) throw new Error("ADMIN_SECRET environment variable is required");
```

**1b. Deleted `app/api/montree/auth/route.ts`** — This old route compared passwords in plain text (`.eq('password_hash', password)`). It was dead code — no frontend calls it. The login page uses `/api/montree/auth/teacher` which has proper bcrypt. Deleted entirely.

---

## The Comprehensive Cleanup Plan (Phases 2–6 Remaining)

### Ground Rules
- **Commit after every phase.** If phase 3 breaks something, revert to phase 2 commit.
- **Test after every phase.** Dev server, login, dashboard, curriculum, child page, games.
- **Don't touch working UI.** Same pages, same behaviour, cleaner wiring.
- **Leave auth structure alone.** The auth mess (7 systems, localStorage sessions) is a multi-session project. We only fixed the two critical security issues.

---

### Phase 2: Consolidate Supabase Client (~30 min)

3 client files exist. All API routes use SERVICE_ROLE key. The best pattern is in `lib/montree/supabase.ts` — singleton with retry logic for Cloudflare timeouts.

**What to do:**
1. Rename `lib/montree/supabase.ts` → `lib/supabase-client.ts`
2. Exports: `getSupabase()` (service role, retry logic) + `getSupabaseUrl()` + `getPublicUrl()`
3. Move `getPublicUrl()` from the old `lib/supabase.ts` into the new file
4. Find-and-replace across all 72 API routes:
   - 47 routes have inline `function getSupabase()` — remove it, add import
   - 23 routes import from `@/lib/montree/supabase` — update path
   - 2 routes import from `@/lib/supabase/server` — update path
5. Delete: `lib/supabase.ts`, `lib/montree/supabase.ts`, `lib/supabase/server.ts`

**Why safe:** Same underlying Supabase calls, just centralized. No behaviour change.

**Execution approach:** Subagents per batch of ~15 routes, 4–5 in parallel.

**Commit:** `refactor: consolidate 3 Supabase clients into single lib/supabase-client.ts`

---

### Phase 3: Delete Dead Code (~10 min)

**3a. Delete 6 debug API routes (nothing links to them):**
- `app/api/montree/debug/add-child/route.ts`
- `app/api/montree/debug/audit/route.ts`
- `app/api/montree/debug/classroom/route.ts`
- `app/api/montree/debug/db-check/route.ts`
- `app/api/montree/debug/parent-link/route.ts`
- `app/api/montree/debug/teachers/route.ts`

**3b. Delete backup file:**
- `app/api/montree/children/_old_id_backup/route.ts`

**3c. Deduplicate game routes:**
Dashboard links to `/montree/dashboard/games/`. Admin links to `/montree/games/`.
- Keep: `/montree/dashboard/games/` (canonical — what dashboard uses)
- Delete: `/montree/games/` EXCEPT 3 unique games not in dashboard: `phonics-challenge`, `match-attack-new`, `word-builder-new` → move those into `/montree/dashboard/games/`
- Update admin page link from `/montree/games` → `/montree/dashboard/games`

**~40 files deleted, 3 moved, 1 link updated.**

**Commit:** `cleanup: remove debug routes, backup file, and deduplicate 27 game routes`

---

### Phase 4: Break Up 3 Large Files (~45 min)

**4a. `curriculum/page.tsx` (918 lines → ~300 lines)**

Extract into `components/montree/curriculum/`:
- `EditWorkModal.tsx` (~160 lines) — the edit form modal
- `CurriculumWorkList.tsx` (~220 lines) — draggable work list with expanded details
- `TeachingToolsSection.tsx` (~50 lines) — Language Guide, 3-Part Cards, Vocab Flashcards

Extract into `hooks/`:
- `useCurriculumDragDrop.ts` (~120 lines) — drag/drop handlers + auto-scroll

**4b. `[childId]/page.tsx` (1,115 lines → ~350 lines)**

Extract into `components/montree/child/`:
- `FocusWorksSection.tsx` (~200 lines) — focus works display with extras
- `QuickGuideModal.tsx` (~80 lines) — quick guide popup
- `WorkPickerModal.tsx` (~80 lines) — add work picker

Extract into `lib/montree/`:
- `work-matching.ts` (~110 lines) — fuzzyScore, findBestPosition, mergeWorksWithCurriculum

Extract into `hooks/`:
- `useWorkOperations.ts` (~180 lines) — cycleStatus, removeExtra, handleWheelPickerSelect

**4c. `super-admin/page.tsx` (1,243 lines → ~200 lines)**

Extract into `components/montree/super-admin/`:
- `SchoolsTab.tsx` (~170 lines)
- `LeadsTab.tsx` (~240 lines)
- `FeedbackTab.tsx` (~100 lines)
- `DmPanel.tsx` (~70 lines)

Extract into `hooks/`:
- `useAdminData.ts` (~100 lines) — all fetch functions
- `useLeadOperations.ts` (~150 lines) — lead CRUD + provisioning

**Commit:** `refactor: split 3 oversized page files into focused components and hooks`

---

### Phase 5: Strip Console Logs (~15 min)

469 console statements across the codebase.

- **Keep:** `console.error()` in catch blocks (useful for debugging)
- **Remove:** All `console.log()` and `console.warn()` (339 in API routes, 130 in pages)

**Commit:** `cleanup: remove 400+ console.log statements, keep console.error in catch blocks`

---

### Phase 6: Fix Type Annotations (~10 min)

23 instances of `: any`:
- 9 in `[childId]/page.tsx` → use `Work` interface from curriculum
- 6 in `reports/page.tsx` → define `ReportWork` and `Photo` interfaces
- 8 elsewhere → proper typed interfaces

**Commit:** `types: replace 23 any annotations with proper interfaces`

---

## What We're NOT Doing (and Why)

| Skipping | Reason |
|----------|--------|
| Auth restructure (localStorage → cookies) | High risk, needs dedicated session |
| Middleware route protection | Tied to auth restructure |
| API route consolidation (106 → fewer) | Working routes, low priority |
| Rate limiting | Nice-to-have, not blocking |
| Centralized logger | console.error in catch blocks is enough for now |

---

## Verification After Each Phase

After every phase:
1. `npm run dev` starts without errors
2. `/montree/login` — can log in as teacher
3. `/montree/dashboard` — dashboard loads with children
4. `/montree/dashboard/curriculum` — curriculum page shows 5 areas + teaching tools
5. Click a child → child detail page loads with focus works
6. `/montree/dashboard/games/letter-tracer` — a game loads

---

## What's Next After Cleanup

**Montree Home** — parent-facing home program:
- `/home/*` route set
- Own Supabase tables (`montree_home_*`)
- 68-work curated curriculum (already in `lib/curriculum/data/home-curriculum.json`)
- Parent login system (separate from school parent portal)
- Plugs into the clean foundation after cleanup

---

## Key Files

| File | What |
|------|------|
| `lib/auth.ts` | **FIXED** — No more hardcoded secret fallback |
| `app/api/montree/auth/route.ts` | **DELETED** — Dead code with plain text password |
| `lib/curriculum/data/home-curriculum.json` | 68-work home curriculum (NEW) |
| `app/montree/dashboard/card-generator/page.tsx` | 3-Part Cards for teachers (NEW) |
| `app/montree/dashboard/vocabulary-flashcards/page.tsx` | Vocab Flashcards for teachers (NEW) |
| `app/montree/dashboard/curriculum/page.tsx` | Teaching Tools section added |
| `.claude/plans/toasty-finding-ritchie.md` | Full cleanup plan (detailed) |

---

*Updated: February 7, 2026*
*Session: 152*
*Status: Phase 1 COMPLETE — Phases 2–6 ready to execute in fresh session*
