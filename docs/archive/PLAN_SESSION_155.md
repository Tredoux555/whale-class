# Session 155 — Montree Home Build Plan (v3 FINAL)

## PERMISSIONS NEEDED UPFRONT

Approve all so this can run unattended:

1. **Bash: run npm install** (if any missing deps)
2. **Bash: run npm run build** (after each phase, with NODE_OPTIONS="--max-old-space-size=2048")
3. **Bash: rm -rf .next** (clear build cache before builds)
4. **Bash: git add / git commit / git push** (commit after each phase, push at end)
5. **Bash: create directories** (mkdir -p for app/home/*, app/api/home/*, lib/home/)
6. **File creation: 21 new files** across app/home/, app/api/home/, lib/home/, migrations/
7. **File edits: 2 existing files** (middleware.ts + BRAIN.md — minimal, additive changes only)

---

## What We're Building

Parent-facing "Montree Home" product. Parents sign up email/password, add children, track Montessori progress at home using a curated 68-work home curriculum. No schools, no classrooms, no teacher codes.

Completely additive — zero changes to existing montree files.

Routes: `/home/*` pages, `/api/home/*` APIs.

---

## Phase 1: Database Migration

**File:** `migrations/120_home_tables.sql`

5 tables, all with CHECK constraints, ON DELETE CASCADE, FK indexes.

```sql
-- home_families (parent accounts)
CREATE TABLE home_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days')
);

-- home_children (kids per family)
CREATE TABLE home_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 12),
  enrolled_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_children_family ON home_children(family_id);

-- home_progress (per-child per-work status)
CREATE TABLE home_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life','sensorial','mathematics','language','cultural')),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'presented', 'practicing', 'mastered')),
  presented_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, work_name)
);
CREATE INDEX idx_home_progress_child ON home_progress(child_id);

-- home_curriculum (68-work curriculum per family, seeded on registration)
CREATE TABLE home_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life','sensorial','mathematics','language','cultural')),
  category TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_home_curriculum_family ON home_curriculum(family_id);

-- home_sessions (work session logs — future use, no API in MVP)
CREATE TABLE home_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_sessions_child ON home_sessions(child_id);
```

**Audit v2 fix:** `area` column added to `home_progress` table. Denormalized intentionally — avoids 3-query join on every progress fetch. Set during progress initialization when child is created.

**Build:** N/A (SQL only). Commit: `feat(home): add migration 120 — 5 home tables`

---

## Phase 2: Auth + Shared Libraries

### Files (7 files + 1 edit)

| # | File | Purpose |
|---|------|---------|
| 1 | `lib/home/auth.ts` | HomeSession type + localStorage get/set/clear |
| 2 | `lib/home/curriculum-helpers.ts` | Seed function + work metadata lookup (shared by APIs) |
| 3 | `app/api/home/auth/register/route.ts` | POST: register family, hash password, seed curriculum |
| 4 | `app/api/home/auth/login/route.ts` | POST: verify password, return session |
| 5 | `app/home/register/page.tsx` | Registration form UI |
| 6 | `app/home/login/page.tsx` | Login form UI |
| 7 | `middleware.ts` | Add `'/home'` to publicPaths (1-line edit) |

### lib/home/auth.ts (~55 lines)

```typescript
export const HOME_SESSION_KEY = 'home_session';

export interface HomeSession {
  family: { id: string; name: string; email: string; plan: string };
  loginAt: string;
}

export function getHomeSession(): HomeSession | null  // localStorage read + validate
export function setHomeSession(session: HomeSession): void  // localStorage write
export function clearHomeSession(): void  // localStorage remove
```

### lib/home/curriculum-helpers.ts (~90 lines)

Two exports, one JSON import:

**`seedHomeCurriculum(supabase, familyId)`** — Called by register route.
1. Import `home-curriculum.json` via `@/lib/curriculum/data/home-curriculum.json`
2. Iterate `areas.{areaKey}.works[]`
3. Map each work: `{ family_id, work_name: work.name, area: areaKey, category: areaObj.name, sequence: work.home_sequence }`
4. Batch insert all 68 rows into `home_curriculum`

**`getWorkMeta(workName)`** — Called by progress and curriculum APIs.
1. Uses same imported JSON (cached at module level)
2. Builds a `Map<string, WorkMeta>` on first call (lazy singleton)
3. Returns `{ description, home_tip, buy_or_make, estimated_cost, home_age_start, home_priority }` or null

**Audit v2 fix:** Consolidated seed + lookup into one file. Both APIs share the same JSON import and lookup map.

### /api/home/auth/register/route.ts (~85 lines)

1. Parse body: `{ email, password, name }`
2. Validate: email regex, password >= 6 chars, name non-empty → 400 on fail
3. `bcrypt.hash(password, 10)`
4. Insert into `home_families` → if error code `23505` → return `{ error: 'Email already registered' }` (409)
5. `await seedHomeCurriculum(supabase, family.id)`
6. Return `{ success: true, family: { id, name, email, plan } }`

### /api/home/auth/login/route.ts (~50 lines)

1. Parse body: `{ email, password }`
2. Select from `home_families` where email
3. If not found → `{ error: 'Invalid credentials' }` (401)
4. `bcrypt.compare(password, row.password_hash)` → if false → 401
5. Return `{ success: true, family: { id, name, email, plan } }`

### /app/home/register/page.tsx (~120 lines)

- `'use client'` with dark gradient background (matching montree aesthetic)
- 4 fields: Name, Email, Password, Confirm Password
- Client validation: email format, password 6+, passwords match
- Submit → POST `/api/home/auth/register`
- On success: `setHomeSession()`, `router.push('/home/dashboard')`
- Error display for: validation, duplicate email, server error

### /app/home/login/page.tsx (~100 lines)

- `'use client'` with dark gradient background
- 2 fields: Email, Password
- Submit → POST `/api/home/auth/login`
- On success: `setHomeSession()`, `router.push('/home/dashboard')`
- Link to register: "Don't have an account? Sign up"

### middleware.ts edit

Add `'/home'` to publicPaths array at line ~77 (after `'/montree'`). This ensures `/home`, `/home/register`, `/home/login`, `/home/dashboard/*` all bypass Supabase auth (Home uses its own auth via localStorage).

**Build:** `rm -rf .next && npm run build`. Fix errors. Commit: `feat(home): auth system — register, login, curriculum seeding`

---

## Phase 3: API Routes

### Files (6 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `app/api/home/children/route.ts` | GET list + POST create (with progress init) |
| 2 | `app/api/home/children/[childId]/route.ts` | GET single child |
| 3 | `app/api/home/progress/route.ts` | GET child progress (enriched with work meta) |
| 4 | `app/api/home/progress/update/route.ts` | POST upsert status |
| 5 | `app/api/home/progress/summary/route.ts` | GET per-area progress bars |
| 6 | `app/api/home/curriculum/route.ts` | GET family curriculum (enriched with JSON meta) |

All routes: `import { getSupabase } from '@/lib/supabase-client'`, try-catch, `catch (err: unknown)`, no console.log.

### /api/home/children/route.ts (~110 lines)

**GET** `?family_id=X`
```sql
SELECT * FROM home_children WHERE family_id = $1 ORDER BY created_at
```
Returns `{ children: [{ id, name, age, enrolled_at, created_at }] }`

**POST** `{ family_id, name, age }`
1. Validate: family_id required, name non-empty, age 0–12
2. Insert child into `home_children`
3. Fetch `home_curriculum` for the family (68 rows)
4. **Batch insert** 68 `home_progress` records: `{ child_id, work_name, area, status: 'not_started' }`
5. Return `{ child: {...}, progressCount: 68 }`

### /api/home/children/[childId]/route.ts (~40 lines)

**Audit v2 fix:** This route was missing from v1/v2. The child detail layout needs it.

**GET** — fetch single child by ID.
```sql
SELECT * FROM home_children WHERE id = $1
```
Returns `{ child: { id, name, age, family_id, enrolled_at, created_at } }`

### /api/home/progress/route.ts (~80 lines)

**GET** `?child_id=X`
1. Query `home_progress` where child_id = X, ordered by area, then by work_name
2. Enrich each record with `getWorkMeta(work_name)` → adds description, home_tip, sequence
3. Group by area server-side
4. Calculate stats: `{ not_started, presented, practicing, mastered }`
5. Return `{ progress: [...], byArea: {...}, stats: {...}, total: 68 }`

**Audit v2 fix:** Merge with curriculum meta happens server-side (not client). No 3-query join needed because `area` is denormalized into `home_progress`.

### /api/home/progress/update/route.ts (~65 lines)

**POST** `{ child_id, work_name, status }`
1. Validate status ∈ `['not_started', 'presented', 'practicing', 'mastered']`
2. Safety net: `'completed'` → `'mastered'`
3. Build update object: `{ status, updated_at: now() }`
   - If status is `'presented'` → add `presented_at: now()`
   - If status is `'mastered'` → add `mastered_at: now()`
4. Upsert into `home_progress` with `onConflict: 'child_id,work_name'`
5. Return `{ success: true, progress: {...} }`

**Audit v2 fix:** Status cycle is one-way: not_started → presented → practicing → mastered. No cycling back.

### /api/home/progress/summary/route.ts (~75 lines)

**GET** `?child_id=X`
1. Query `home_progress` for child
2. Group by `area` column (denormalized, no join needed)
3. Per area calculate:
   - `totalWorks`: count all
   - `started`: count where status ≠ 'not_started'
   - `mastered`: count where status = 'mastered'
   - `percentComplete`: Math.round(mastered / totalWorks * 100)
4. Overall: sum all areas
5. Return `{ areas: [{ area, areaName, icon, color, totalWorks, started, mastered, percentComplete }], overall: N }`

Area names/icons/colors from the JSON meta.

### /api/home/curriculum/route.ts (~70 lines)

**GET** `?family_id=X`
1. Query `home_curriculum` where family_id = X AND is_active = true, ordered by area, sequence
2. Enrich each row with `getWorkMeta(work_name)` → description, home_tip, buy_or_make, estimated_cost, home_age_start, home_priority
3. Group by area
4. Return `{ curriculum: [...], byArea: { practical_life: [...], sensorial: [...], ... } }`

**Build:** `rm -rf .next && npm run build`. Fix errors. Commit: `feat(home): API routes — children, progress, curriculum`

---

## Phase 4: Dashboard Pages

### Files (8 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `app/home/layout.tsx` | Root layout: conditional nav + Toaster |
| 2 | `app/home/dashboard/page.tsx` | Children grid with "Add Child" |
| 3 | `app/home/dashboard/[childId]/layout.tsx` | Child header + 2 tabs |
| 4 | `app/home/dashboard/[childId]/page.tsx` | Works view: grouped by area, status cycling |
| 5 | `app/home/dashboard/[childId]/progress/page.tsx` | Progress bars per area |
| 6 | `app/home/dashboard/curriculum/page.tsx` | 68-work curriculum browser |
| 7 | `app/home/settings/page.tsx` | Family info + logout |
| 8 | `app/home/page.tsx` | Landing page |

### app/home/layout.tsx (~60 lines)

**Audit v2 fix:** Conditionally renders nav. Checks `HomeSession` existence.

- No session (login/register pages): just renders `{children}` with no nav
- Has session: renders emerald header with `🏠 Montree Home` branding and nav links (Dashboard / Curriculum / Settings / Logout)
- `<Toaster position="top-center" />` always present
- `'use client'` (needs useEffect + useState for session check)

### app/home/dashboard/page.tsx (~180 lines)

Adapted from `montree/dashboard/page.tsx`:
- Auth: `getHomeSession()` → redirect to `/home/login` if missing
- Fetch: `GET /api/home/children?family_id=${session.family.id}`
- Header: family name, child count
- Grid: responsive cards for each child (name, age, initial/avatar)
- Click card → navigate to `/home/dashboard/${childId}`
- "Add Child" button → inline form/modal (name + age dropdown 2–6)
- Submit → `POST /api/home/children { family_id, name, age }`
- Empty state: "No children yet. Add your first child to get started!"
- Loading state: bouncing 🏠 emoji

### app/home/dashboard/[childId]/layout.tsx (~100 lines)

Adapted from `montree/dashboard/[childId]/layout.tsx`:
- Auth: `getHomeSession()` → redirect to `/home/login` if missing
- Fetch child: `GET /api/home/children/${childId}`
- Header: back arrow → `/home/dashboard`, child name + age, family name subtitle
- **2 tabs only:** 📋 Works | 📊 Progress
- Remove: Gallery, Reports, Guru button, Curriculum editor button
- Sticky header + tab bar (same CSS pattern as montree)

### app/home/dashboard/[childId]/page.tsx — Works View (~300 lines)

The core interaction page. Simplified from montree's 571-line teacher version.

**Data flow:**
1. Read `family_id` from `getHomeSession()`
2. Fetch `GET /api/home/progress?child_id=X` → returns progress grouped by area with work meta
3. Display 5 collapsible area sections (Practical Life, Sensorial, Math, Language, Cultural)
4. Each area: colored header with icon, work count, area progress percentage
5. Each work: name + status badge + home tip (collapsed by default)

**Status badges and cycling:**
- 🌱 Not Started → tap → Presented
- 📖 Presented → tap → Practicing
- 🔄 Practicing → tap → Mastered
- ⭐ Mastered → no further cycling (one-way)

**On status change:**
- `POST /api/home/progress/update { child_id, work_name, status: nextStatus }`
- Optimistic UI update (update local state immediately, revert on error)
- Toast on error

**What's NOT here (vs montree):**
- No WorkWheelPicker modal
- No InviteParentModal
- No focus works / extra works distinction
- No camera/capture
- No guru
- No notes/observations

### app/home/dashboard/[childId]/progress/page.tsx (~100 lines)

Adapted from `montree/dashboard/[childId]/progress/page.tsx`:
- Fetch `GET /api/home/progress/summary?child_id=X`
- Overall progress card with percentage
- Per-area progress bars with: area name, icon, color, X/Y works, percentage bar
- Simple, clean, read-only

### app/home/dashboard/curriculum/page.tsx (~150 lines)

New page. Read-only curriculum browser:
- Auth: `getHomeSession()` → redirect if missing
- Fetch `GET /api/home/curriculum?family_id=X`
- 5 collapsible area sections, each color-coded
- Each work card shows: name, description, home tip, buy/make recommendation, estimated cost, recommended start age, priority (essential/recommended/enrichment)
- Priority badges: 🟢 Essential | 🔵 Recommended | 🟣 Enrichment
- No editing, no drag-drop

### app/home/settings/page.tsx (~80 lines)

- Auth: `getHomeSession()` → redirect if missing
- Display: family name, email, plan (with badge)
- Account created date
- Logout button: `clearHomeSession()` → `router.push('/home')`
- Future: edit name, change password (out of scope for MVP, just show the fields disabled)

### app/home/page.tsx — Landing Page (~70 lines)

Marketing page matching montree's design language but parent-focused:
- Dark gradient background (emerald/teal)
- 🏠 icon in gradient box
- "Montree Home" title
- "Montessori at Home" subtitle
- "Track your child's learning journey with 68 curated Montessori activities"
- "Start Free" CTA → `/home/register`
- "I have an account" → `/home/login`
- Footer: "🏠 Montree Home • teacherpotato.xyz"

**Build:** `rm -rf .next && npm run build`. Fix errors. Commit: `feat(home): dashboard pages — children grid, works view, progress, curriculum, settings, landing`

---

## Phase 5: Final Build + Ship

1. Full clean build: `rm -rf .next && NODE_OPTIONS="--max-old-space-size=2048" npm run build`
2. Fix any remaining TypeScript/build errors
3. Update `BRAIN.md` — add Session 155 section with:
   - Files created list
   - Route map
   - Database tables
   - Known limitations
4. Delete `PLAN_SESSION_155.md` (served its purpose)
5. `git add` specific files (no -A)
6. Commit: `feat: Montree Home — parent-facing product (session 155)`
7. `git push`

---

## Complete File List (23 new + 2 edits = 25 files touched)

| # | Path | Type | Est Lines |
|---|------|------|-----------|
| 1 | `migrations/120_home_tables.sql` | SQL | 65 |
| 2 | `lib/home/auth.ts` | TS lib | 55 |
| 3 | `lib/home/curriculum-helpers.ts` | TS lib | 90 |
| 4 | `app/api/home/auth/register/route.ts` | API | 85 |
| 5 | `app/api/home/auth/login/route.ts` | API | 50 |
| 6 | `app/api/home/children/route.ts` | API | 110 |
| 7 | `app/api/home/children/[childId]/route.ts` | API | 40 |
| 8 | `app/api/home/progress/route.ts` | API | 80 |
| 9 | `app/api/home/progress/update/route.ts` | API | 65 |
| 10 | `app/api/home/progress/summary/route.ts` | API | 75 |
| 11 | `app/api/home/curriculum/route.ts` | API | 70 |
| 12 | `app/home/page.tsx` | Page | 70 |
| 13 | `app/home/layout.tsx` | Layout | 60 |
| 14 | `app/home/register/page.tsx` | Page | 120 |
| 15 | `app/home/login/page.tsx` | Page | 100 |
| 16 | `app/home/dashboard/page.tsx` | Page | 180 |
| 17 | `app/home/dashboard/[childId]/layout.tsx` | Layout | 100 |
| 18 | `app/home/dashboard/[childId]/page.tsx` | Page | 300 |
| 19 | `app/home/dashboard/[childId]/progress/page.tsx` | Page | 100 |
| 20 | `app/home/dashboard/curriculum/page.tsx` | Page | 150 |
| 21 | `app/home/settings/page.tsx` | Page | 80 |
| 22 | `middleware.ts` | **EDIT** | +1 line |
| 23 | `BRAIN.md` | **EDIT** | +section |

**Total: ~2,045 lines of new code.**

---

## Audit Fixes Incorporated (v2 → v3)

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing `/api/home/children/[childId]` route | Added as file #7 |
| 2 | Layout nav shows on login/register | Conditional render based on session |
| 3 | Progress needs 3-query join for area | Added `area` column to `home_progress` (denormalized) |
| 4 | Status cycling direction unspecified | One-way: not_started → presented → practicing → mastered |
| 5 | Progress summary calculation vague | Defined: percentComplete = mastered/total * 100 |
| 6 | JSON lookup duplicated in 2 APIs | Consolidated into `lib/home/curriculum-helpers.ts` with shared `getWorkMeta()` |

---

## Data Flow (End-to-End)

```
Parent registers
  → POST /api/home/auth/register
  → create home_families row
  → seed 68 rows in home_curriculum
  → return session → store in localStorage
        ↓
Parent adds child
  → POST /api/home/children
  → create home_children row
  → batch-insert 68 home_progress rows (with area from curriculum)
        ↓
Parent views child works
  → GET /api/home/progress?child_id=X
  → returns progress grouped by area, enriched with work metadata
  → display 5 area sections with works and status badges
        ↓
Parent taps work to cycle status
  → POST /api/home/progress/update { child_id, work_name, status }
  → upsert home_progress, set timestamps
  → optimistic UI update
        ↓
Parent views progress
  → GET /api/home/progress/summary?child_id=X
  → per-area bars + overall %
```

---

## Out of Scope (MVP)

- Password reset / forgot password
- Email verification
- Photo gallery
- Weekly reports
- Guru AI
- Notes/observations
- Work session logging (table ready, no API)
- Curriculum editing by parents
- Sharing between family members
- Mobile app

---

## Known Risks

1. **No API-level auth** — routes trust client-sent IDs. Matches montree pattern. Follow-up item.
2. **Build OOM** — use `NODE_OPTIONS="--max-old-space-size=2048"`.
3. **home_sessions table** — dead on day 1. Schema ready for future feature.
4. **Denormalized area in home_progress** — intentional trade-off: faster reads, slightly redundant data.

---

## Rules

- Import Supabase from `@/lib/supabase-client` ONLY
- All catch blocks: `catch (err: unknown)` with `instanceof Error` guard
- All API routes have try-catch
- No `console.log` (only `console.error` for actual errors)
- Build after each phase, fix errors before moving on
- **Do NOT touch any existing `/montree/*` or `/app/montree/*` files**
- Commit after each phase passes build
