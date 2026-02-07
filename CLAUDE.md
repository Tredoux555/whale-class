# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 14 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management
- **Montree Home** (planned) - Parent home program with 68 curated works

Production: `https://teacherpotato.xyz`
Deploy: Railway auto-deploys on push to `main`

---

## CURRENT STATUS (Feb 7, 2026)

### Active: Codebase Cleanup (5 remaining phases)

Phase 1 DONE. Phases 2-6 ready to execute. Full plan in `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md`.

| Phase | What | Status | Time |
|-------|------|--------|------|
| 1 | Security fixes (secret + dead auth route) | DONE | 10 min |
| 2 | Consolidate 3 Supabase clients into one | NEXT | 30 min |
| 3 | Delete dead code + dedup 27 game routes | Pending | 10 min |
| 4 | Split 3 oversized files (918, 1115, 1243 lines) | Pending | 45 min |
| 5 | Strip 400+ console.log statements | Pending | 15 min |
| 6 | Fix 23 `: any` type annotations | Pending | 10 min |

**Ground rules:** Commit after every phase. Test after every phase. Don't touch working UI. Leave auth structure alone (multi-session project).

**Verification after each phase:**
1. `npm run dev` starts without errors
2. `/montree/login` — teacher login works
3. `/montree/dashboard` — loads with children
4. `/montree/dashboard/curriculum` — 5 areas + teaching tools
5. Child detail page loads with focus works
6. `/montree/dashboard/games/letter-tracer` — game loads

---

### Recent Changes (Session 152, Feb 7)

**Security (Phase 1 done):**
- `lib/auth.ts`: Removed hardcoded fallback secret — throws if `ADMIN_SECRET` env var missing
- Deleted `app/api/montree/auth/route.ts` — dead code with plain text password comparison

**Teaching Tools (Session 151-152):**
- New section on curriculum page below 5 area cards
- `app/montree/dashboard/card-generator/page.tsx` — 3-Part Cards (copied from admin, separate system)
- `app/montree/dashboard/vocabulary-flashcards/page.tsx` — Vocab Flashcards (copied from admin)
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

7 separate auth systems that don't talk to each other. All work in production. NOT being restructured during cleanup (too risky for one session).

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256 hash) or email+bcrypt | `/api/montree/auth/teacher` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET` env var, httpOnly cookie | `lib/auth.ts` |
| Super admin | Password from env var | `/api/montree/super-admin/login-as` |
| Teacher sessions | localStorage (NOT httpOnly cookie — known debt) | `lib/montree/auth.ts` |
| Story auth | Separate system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Deleted:** `/api/montree/auth/route.ts` (dead code, plain text password comparison)

---

## Supabase Client (Current State — Being Consolidated in Phase 2)

3 client files exist:
1. `lib/montree/supabase.ts` — **BEST** (singleton, retry logic for Cloudflare timeouts) — used by 23 routes
2. `lib/supabase.ts` — older, has `getPublicUrl()` helper
3. `lib/supabase/server.ts` — used by 2 routes

47 routes create their own inline `function getSupabase()`.

**Phase 2 plan:** Merge all into `lib/supabase-client.ts`, update all 72 routes to use single import.

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
- NOT built yet — just the data file

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
| `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md` | **CURRENT** — Full cleanup plan with all 6 phases |
| `docs/MONTREE_HOME_HANDOFF.md` | Architecture for Montree Home (250-activity version — outdated, use 68-work JSON instead) |
| `docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md` | Language guide + API download route |
| `.claude/plans/toasty-finding-ritchie.md` | Detailed cleanup plan (same as Session 152 handoff) |
