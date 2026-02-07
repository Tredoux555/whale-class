# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with three systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management
- **Montree Home** (`/home/*`) - Parent home program with 68 curated works (code-based auth, partially deployed)

Production: `https://teacherpotato.xyz`
Deploy: Railway auto-deploys on push to `main`

---

## CURRENT STATUS (Feb 8, 2026)

### URGENT: Home Registration 500 Error

`/api/home/auth/try` returns 500 on live site. Debug error surfacing added but NOT yet deployed. See `docs/HANDOFF_SESSION_155_HOME_AUTH.md` for diagnosis steps.

**Uncommitted + unpushed changes exist.** Run:
```bash
git add -A && git commit -m "feat: complete code-based auth for Home (login, register, super-admin)" && git push
```

### Active: Montree Home Auth (Session 155)

Full code-based auth system built for Montree Home. Replaces old email/password flow.

**What works:** Registration page UI, login page UI, code generation API, name collection
**What's broken:** API 500 on insert into `home_families` (likely schema mismatch — check with SQL in handoff)
**Handoff:** `docs/HANDOFF_SESSION_155_HOME_AUTH.md`

### Backlog: Codebase Cleanup (5 remaining phases)

Phase 1 DONE. Phases 2-6 ready to execute. Full plan in `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md`.

| Phase | What | Status | Time |
|-------|------|--------|------|
| 1 | Security fixes (secret + dead auth route) | DONE | 10 min |
| 2 | Consolidate 3 Supabase clients into one | Pending | 30 min |
| 3 | Delete dead code + dedup 27 game routes | Pending | 10 min |
| 4 | Split 3 oversized files (918, 1115, 1243 lines) | Pending | 45 min |
| 5 | Strip 400+ console.log statements | Pending | 15 min |
| 6 | Fix 23 `: any` type annotations | Pending | 10 min |

---

### Recent Changes (Session 155, Feb 8)

**Montree Home — Code-Based Auth:**
- `app/home/page.tsx` — Added name input, sends name to API
- `app/home/register/page.tsx` — Full rewrite: working code-based registration (was redirect stub)
- `app/home/login/page.tsx` — Full rewrite: 6-digit code entry with auto-advance (was email/password)
- `app/api/home/auth/try/route.ts` — Accept name, added debug error output
- `app/api/home/auth/login/route.ts` — Converted from bcrypt to SHA256 code lookup
- `app/api/home/auth/register/route.ts` — Replaced with 410 stub

**Montree Classroom — Name Collection:**
- `app/montree/try/page.tsx` — Added 'details' step (name + school name between role pick and creation)
- `app/api/montree/try/instant/route.ts` — Accept name + schoolName, use in all DB inserts + leads

**Super-Admin:**
- `components/montree/super-admin/FamiliesTab.tsx` — Shows join_code instead of email

**SQL Migrations Applied:**
- Migration 121 (`home_join_code.sql`) — adds join_code column to home_families ✅
- Migration 120 (`home_tables.sql`) — was already applied previously

**Previous Sessions (152, Feb 7):**
- `lib/auth.ts`: Removed hardcoded fallback secret
- Deleted dead auth route
- Teaching Tools section on curriculum page
- Language Making Guide download button (43 works, all 5 categories)

**Home Curriculum Curated:**
- `lib/curriculum/data/home-curriculum.json` — 68 works (Practical Life 19, Sensorial 10, Math 15, Language 12, Cultural 10)
- Each work has: `home_sequence`, `home_priority`, `home_tip`, `buy_or_make`, `estimated_cost`, `home_age_start`

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress`
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions`, `montree_child_mental_profiles`, `montree_behavioral_observations`
- `home_families` — parent accounts (id, email, password_hash, name, plan, join_code, created_at, trial_ends_at)
- `home_children` — kids per family
- `home_progress` — per-child per-work status
- `home_curriculum` — 68-work curriculum seeded per family on registration
- `home_sessions` — work session logs (future use)

### Whale Class Data
- Classroom ID: `945c846d-fb33-4370-8a95-a29b7767af54`
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## Environment Variables (Railway)
```
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
ADMIN_PASSWORD=...
ADMIN_SECRET=...          # REQUIRED — no fallback (used for JWT signing in lib/auth.ts)
SUPER_ADMIN_PASSWORD=...  # REQUIRED — for super-admin login
```

---

## Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/login` | Teacher login (6-char code or email+password) |
| `/montree/dashboard` | Class list |
| `/montree/dashboard/[childId]` | Child week view (1,115 lines — needs splitting) |
| `/montree/dashboard/[childId]/progress` | All works |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools section |
| `/montree/dashboard/card-generator` | 3-Part Cards tool |
| `/montree/dashboard/vocabulary-flashcards` | Vocab Flashcards tool |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/games/*` | 27+ educational games |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/photos` | Child's photos |
| `/montree/parent/milestones` | Progress timeline |

### Montree Home (Parent Home Product)
| Route | Purpose |
|-------|---------|
| `/home` | Landing page + registration (name → Start Free → code) |
| `/home/register` | Same registration flow (alt URL) |
| `/home/login` | Login with 6-char code (digit boxes with auto-advance) |
| `/home/dashboard` | Family dashboard (not yet built) |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub |
| `/admin/card-generator` | 3-Part Cards (admin version) |
| `/admin/vocabulary-flashcards` | Vocab Flashcards (admin version) |
| `/admin/description-review` | Work description editor |
| `/montree/super-admin` | Super admin panel (1,243 lines — needs splitting) |

---

## Authentication (Current State — Messy but Functional)

8 separate auth systems that don't talk to each other. Most work in production. NOT being restructured during cleanup (too risky for one session).

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256 hash) or email+bcrypt | `/api/montree/auth/teacher` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET` env var, httpOnly cookie | `lib/auth.ts` |
| Super admin | Password from env var | `/api/montree/super-admin/login-as` |
| Teacher sessions | localStorage (NOT httpOnly cookie — known debt) | `lib/montree/auth.ts` |
| Story auth | Separate system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |
| **Home family** | **6-char code (SHA256), localStorage** | **`/api/home/auth/try` + `/api/home/auth/login`** |

**Home auth pattern:** Code `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (6 chars, no I/L/O/0/1). SHA256 hash stored as `password_hash`. Code stored as `join_code` for admin visibility. Session in localStorage (`home_session` key). See `lib/home/auth.ts`.

**Deleted:** `/api/montree/auth/route.ts` (dead code, plain text password comparison)
**Deprecated:** `/api/home/auth/register/route.ts` (returns 410, registration via `/try`)

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton pattern with retry logic for Cloudflare timeouts.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Aliases: `createSupabaseAdmin`, `createAdminClient`, `createServerClient` (backward compat)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

### Master Data (JSON files)
5 area files in `lib/curriculum/data/`:
- `language.json` (43 works)
- `practical_life.json`
- `sensorial.json`
- `mathematics.json`
- `cultural.json`

### Home Curriculum
- `lib/curriculum/data/home-curriculum.json` — 68 curated works for parent home program
- `lib/home/curriculum-helpers.ts` — seedHomeCurriculum() seeds 68 works into home_curriculum table on registration
- `lib/home/auth.ts` — localStorage session management for home product
- Registration + login pages built. Dashboard NOT yet built.

### Teaching Guides
- `public/guides/Montessori_Language_Making_Guide.docx` — 43 works, all 5 categories
- `public/guides/Montessori-English-Materials-List.pdf` — 337 pics, 1011 cards, 115 objects
- `public/guides/Montessori-English-Materials-List.docx` — Editable version

---

## Known Technical Debt

### Being Fixed (Cleanup Plan)
- 3 Supabase client files → consolidating to 1
- 6 debug API endpoints exposed in production → deleting
- 27 duplicate game routes → deduplicating
- 3 files over 900 lines → splitting
- 469 console.log statements → stripping
- 23 `: any` types → fixing

### Deferred (Future Sessions)
- Auth restructure (localStorage → httpOnly cookies + middleware)
- Rate limiting on auth endpoints
- API route consolidation (106 routes — many could merge)
- Centralized logging service
- PWA manifest not linked
- Email sending not tested
- DB only has 18/43 language works (needs reseed)

---

## Guru System (AI Teacher Advisor)

AI advisor for child development questions. Uses Anthropic API.

Key files:
- `lib/montree/guru/context-builder.ts` — builds child context
- `lib/montree/guru/knowledge-retrieval.ts` — Montessori knowledge
- `app/api/montree/guru/route.ts` — main endpoint

Tables: `montree_guru_interactions`, `montree_child_mental_profiles`, `montree_behavioral_observations`, `montree_child_patterns`

---

## Report & Photo System

Photo selection flow:
```
Teacher Preview → Select Photos → Saved to montree_report_media junction table
Publish → send/route.ts queries junction table → Creates final report
Parent View → parent/report/[id]/route.ts queries junction table
```

Both routes query junction table first, fall back to date-range query for backwards compatibility.

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Key Handoff Docs

| Doc | What |
|-----|------|
| `docs/HANDOFF_SESSION_155_HOME_AUTH.md` | **CURRENT** — Home code-based auth, 500 bug diagnosis, uncommitted changes |
| `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md` | Codebase cleanup plan (5 remaining phases) |
| `docs/MONTREE_HOME_HANDOFF.md` | Architecture for Montree Home (250-activity version — outdated, use 68-work JSON instead) |
| `docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md` | Language guide + API download route |
