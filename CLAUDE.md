# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with three systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management
- **Montree Home** (`/home/*`) - Parent home program with 68 curated works (code-based auth, partially deployed)

Production: `https://teacherpotato.xyz` → **MIGRATING TO `https://montree.xyz`**
Deploy: Railway auto-deploys on push to `main`

---

## CURRENT STATUS (Feb 10, 2026)

### Security Hardening — Phase 3 COMPLETE, Phase 4 Next

9-phase security hardening project in progress. Phases 1–3 done and audited.

| Phase | Name | Status |
|-------|------|--------|
| 1 | API Auth (JWT for all routes) | ✅ Done |
| 1B | Parent session tokens | ✅ Done |
| 2 | bcrypt password migration (100% audited) | ✅ Done |
| 3 | Quick security wins (11 fixes across ~25 files) | ✅ Done + Audited |
| 4 | Secret rotation & env hardening | 🔜 Next |
| 5 | Password policy & rate limiting | Pending |
| 6 | Input sanitisation & CSP headers | Pending |
| 7 | Montree audit logging | Pending |
| 8 | Rate limiting & abuse prevention | Pending |
| 9 | Production security review (final) | Pending |

**Handoff:** `docs/HANDOFF_SECURITY_PHASE3_COMPLETE.md`
**Phase 3 plan:** `.claude/plans/phase3-plan-v3.md`

### 🔧 FRESH AUDIT COMMAND (Phase 4)

When starting a new chat, say: **"Run the Phase 4 fresh audit command from CLAUDE.md"**

Claude should then execute this sequence:
1. Read `docs/HANDOFF_SECURITY_PHASE3_COMPLETE.md` for context on what's already done
2. Run a comprehensive security audit of the CURRENT codebase covering:
   - Grep for remaining hardcoded secrets/passwords (beyond 870602 which is done)
   - Check all `.env.local` values — flag weak secrets (especially `ADMIN_SECRET`)
   - Audit all auth endpoints for rate limiting (there is none currently)
   - Check for missing input validation/sanitisation across API routes
   - Check for XSS vectors in any server-rendered content
   - Audit Content-Security-Policy headers (likely missing)
   - Check Montree system (teacher/parent/admin) for audit logging gaps
   - Verify all Railway production env vars match what code expects
3. Produce findings ranked by severity
4. Build Phase 4 plan using the 3-round plan→audit→refine cycle (same as Phase 3)
5. Present plan for approval before implementing

### Other Open Items

**Domain Migration** — teacherpotato.xyz → montree.xyz. Plan in CLAUDE.md history. Not started.

**Home Registration 500 Error** — `/api/home/auth/try` returns 500 on live site. See `docs/HANDOFF_SESSION_155_HOME_AUTH.md`.

**Codebase Cleanup** (separate from security hardening):

| Phase | What | Status |
|-------|------|--------|
| 1 | Security fixes (secret + dead auth route) | DONE |
| 2 | Consolidate 3 Supabase clients into one | Pending |
| 3 | Delete dead code + dedup 27 game routes | Pending |
| 4 | Split 3 oversized files (918, 1115, 1243 lines) | Pending |
| 5 | Strip 400+ console.log statements | Pending |
| 6 | Fix 23 `: any` type annotations | Pending |

---

### Recent Changes (Security Hardening, Feb 10)

**Phase 3 — Quick Security Wins (11 fixes):**
- Fix 1: `login_time` → `login_at` across 11 files (column rename)
- Fix 2: Session token stored on Story user login (`story_login_logs.session_token`)
- Fix 3: Created `app/api/story/heartbeat/route.ts` (was missing, client already called it)
- Fix 4: Rewrote online-users to dual-query `story_online_sessions` + `story_login_logs`
- Fix 5: System-controls auth upgraded from `token.length > 10` to JWT verification
- Fix 6: Hardcoded `870602` moved to `process.env.SUPER_ADMIN_PASSWORD` (13 files)
- Fix 7: Admin token TTL 30d → 7d + cookie maxAge aligned
- Fix 8: Vault refs in system-controls fixed (table→`vault_files`, bucket→`vault-secure`, column→`file_url`)
- Audit fix: Empty password bypass in Whale Class login (rewrote credential loading)
- Audit fix: Added `TEACHER_ADMIN_PASSWORD` env var
- Audit fix: `OnlineUser.lastLogin` → `lastSeen` type alignment

### Previous Changes (Session 155, Feb 8)

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
ADMIN_SECRET=...              # REQUIRED — JWT signing for Whale Class admin (lib/auth.ts). WEAK — needs rotation in Phase 4
SUPER_ADMIN_PASSWORD=...      # REQUIRED — Montree super-admin + Whale Class "Tredoux" login
TEACHER_ADMIN_PASSWORD=...    # REQUIRED (Phase 3) — Whale Class "Teacher" login. Set to old password.
STORY_JWT_SECRET=...          # REQUIRED — Story system JWT signing (lib/story-db.ts)
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
| `docs/HANDOFF_SECURITY_PHASE3_COMPLETE.md` | **CURRENT** — Security Phase 3 complete, all fixes listed, Phase 4 next steps |
| `.claude/plans/phase3-plan-v3.md` | Phase 3 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SESSION_155_HOME_AUTH.md` | Home code-based auth, 500 bug diagnosis |
| `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md` | Codebase cleanup plan (5 remaining phases) |
| `docs/MONTREE_HOME_HANDOFF.md` | Architecture for Montree Home (250-activity version — outdated, use 68-work JSON instead) |
| `docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md` | Language guide + API download route |
