# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with three systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management
- **Montree Home** (`/home/*`) - Parent home program with 68 curated works (code-based auth, partially deployed)

Production: `https://teacherpotato.xyz` → **MIGRATING TO `https://montree.xyz`**
Deploy: Railway auto-deploys on push to `main`

---

## CURRENT STATUS (Feb 11, 2026)

### Security Hardening — ALL 9 PHASES COMPLETE ✅

9-phase security hardening project COMPLETE. All phases done.

| Phase | Name | Status |
|-------|------|--------|
| 1 | API Auth (JWT for all routes) | ✅ Done |
| 1B | Parent session tokens | ✅ Done |
| 2 | bcrypt password migration (100% audited) | ✅ Done |
| 3 | Quick security wins (11 fixes across ~25 files) | ✅ Done + Audited |
| 4 | Secret rotation & env hardening (12 fixes across ~20 files) | ✅ Done + Audited |
| 5 | Password policy & rate limiting (23 files, 1123 insertions) | ✅ Done |
| 6 | Input sanitisation & CSP headers (17 files) | ✅ Done |
| 7 | Session management (timing-safe auth, HttpOnly cookies, CSRF) | ✅ Done |
| 8 | Logging & monitoring (6 fixes across ~15 files) | ✅ Done |
| 9 | Production security review (8 fixes across ~45 files) | ✅ Done |

**Handoff docs:**
- `docs/HANDOFF_SECURITY_PHASE4_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE6_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE7_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`

**Plan files:** `.claude/plans/phase5-plan-v3.md`, `.claude/plans/phase6-plan-v3.md`, `.claude/plans/phase7-plan-v3.md`, `.claude/plans/phase8-plan-v2.md`, `.claude/plans/phase9-plan-v1.md`

### ⚠️ POST-SECURITY ACTION REQUIRED

**MESSAGE_ENCRYPTION_KEY rotation** — Must be done manually:
1. Generate new 32-char key: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
2. Set in Railway: `OLD_ENCRYPTION_KEY=change-this-to-32-char-key-12345`, `NEW_ENCRYPTION_KEY=<new-key>`
3. Run: `npx tsx scripts/rotate-encryption-key.ts --dry-run` (verify)
4. Run: `npx tsx scripts/rotate-encryption-key.ts` (execute)
5. Update Railway: `MESSAGE_ENCRYPTION_KEY=<new-key>`, remove `OLD_ENCRYPTION_KEY`

**Frontend update** — Super-admin panel needs to send password with audit GET and schools GET (newly authenticated endpoints). See Phase 9 handoff for details.

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

### Recent Changes (Phase 9 — Production Security Review, Feb 11)

**Phase 9 — Production Security Review (8 fixes across ~45 files):**
- Fix 1 (CRITICAL): Created `lib/verify-super-admin.ts` — shared timing-safe `verifySuperAdminPassword()` helper using `timingSafeEqual()` with fixed 256-byte buffers. Replaced 9 plaintext `!==` comparisons across 6 super-admin route files.
- Fix 2 (CRITICAL): Secured `audit/route.ts` — both GET and POST were completely unauthenticated. Added `verifySuperAdminPassword()` + rate limiting + query limit cap (500).
- Fix 3 (CRITICAL): Secured `schools/route.ts` GET — was returning all school data publicly. Added auth (header or query param).
- Fix 4 (CRITICAL): Upgraded `lib/message-encryption.ts` from AES-256-CBC to AES-256-GCM. New format: `gcm:<iv>:<authTag>:<encrypted>`. Backward compatible (auto-detects by prefix). Created `scripts/rotate-encryption-key.ts` migration script.
- Fix 5 (HIGH): Added input length validation — messages (5000/500/200 chars), curriculum generate-description (255/50 chars).
- Fix 6 (HIGH): Added 8 missing env vars to `.env.example`. Converted Stripe PRICE_IDS from hardcoded fallbacks to lazy-throw pattern via Proxy.
- Fix 7 (HIGH): Sanitized ~43 API files — removed `error.message`/`error.details`/`error.hint`/`JSON.stringify(error)` from client responses. All now return generic messages.
- Fix 8 (MEDIUM): Added `checkRateLimit()` to 5 super-admin endpoints (audit, schools, npo-applications, reduced-rate-applications, reset-password).

**Files created:** `lib/verify-super-admin.ts`, `scripts/rotate-encryption-key.ts`, `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`

### Previous Changes (Phase 8 — Logging & Monitoring, Feb 11)

**Phase 8 — Logging & Monitoring (6 fixes across ~15 files):**
- Fix 1: Added `login_success` audit logging to 5 auth endpoints (teacher, parent, admin, home, super-admin login-as)
- Fix 2: Added `logout` audit logging to 2 endpoints (admin, parent — both required rewrite for `NextRequest` param)
- Fix 3: Added destructive operation logging — `school_delete`, `child_delete`, `account_created` (all log BEFORE cascade)
- Fix 4a: Created `lib/api-error.ts` — safe error logging utility
- Fix 4b: Sanitized error responses — removed `error.message`/`error.details` leaks from leads, children, schools routes
- Fix 4b (bug fix): Removed undefined `fallbackPassword` variable in `leads/route.ts` (would throw ReferenceError at runtime)
- Fix 4b (bug fix): Removed partial password logging (`superAdminPassword.substring(0, 2)`) in leads route
- Fix 5: Added CSRF block logging (`console.warn('[CSRF]')`) in middleware
- Fix 6: Extended audit logger `requires_review` for new action types: `school_delete`, `child_delete`, `login_as`, `account_created`
- Hash migration logging: Home family login now logs `password_hash_upgraded` when SHA256→bcrypt migration occurs

### Previous Changes (Security Hardening + Cleanup, Feb 10)

**ElevenLabs Cleanup (subscription cancelled):**
- Deleted 4 scripts: `generate-elevenlabs-audio.js`, `regenerate-audio.js`, `regenerate-audio-charlotte.js`, `regenerate-all-audio-charlotte.js`
- Removed `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from `.env.local`, `.env.example`, CLAUDE.md, Railway
- Pre-generated audio files in `/public/audio-new/` remain — still used by sound games
- Reference docs in `/docs/` and `/public/audio-new/` left as historical context

**Phase 4 — Secret Rotation & Env Hardening (12 fixes across ~20 files):**
- Fix 1: Removed hardcoded ElevenLabs API key from 4 scripts → `process.env.ELEVENLABS_API_KEY`
- Fix 2: Removed hardcoded Supabase service role key from `scripts/upload-to-supabase.js`
- Fix 3: Removed hardcoded `870602` from `hooks/useLeadOperations.ts` (3 instances) → uses `password` prop
- Fix 4: Removed Story auth plaintext fallback (`USER_PASSWORDS`) — bcrypt-only now
- Fix 5: Removed insecure fallback defaults from `lib/auth-multi.ts`, `lib/montree/super-admin-security.ts`, `lib/message-encryption.ts` — all now throw if env vars missing
- Fix 6: Removed `'change-this-in-env'` fallback from 3 vault routes (upload, download, save-from-message)
- Fix 7: Moved vault password hash to `process.env.VAULT_PASSWORD_HASH`
- Fix 8: Added security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) in `next.config.ts`
- Fix 9: Created `.env.example` with all required env vars documented
- Fix 10: Updated CLAUDE.md env vars section (added 11 missing vars)
- Fix 11: Updated `.env.local` with `VAULT_PASSWORD_HASH` and `ELEVENLABS_API_KEY`
- ElevenLabs scripts deleted (subscription cancelled) — pre-generated audio files in `/public/audio-new/` still in use

**Phase 4 Post-Audit Fixes (3 issues found, all resolved):**
- Audit fix 1 (CRITICAL): `deleteSchool()` regression — API route now accepts password from header OR query param
- Audit fix 2: `MESSAGE_ENCRYPTION_KEY` was 31 chars (quotes stripped by dotenv) → set to old default `change-this-to-32-char-key-12345` for backward compat with existing encrypted messages
- Audit fix 3: `.env.example` updated — added "no quotes!" note for MESSAGE_ENCRYPTION_KEY

**Phase 4 Build Fix:**
- Railway build crashed because `lib/auth-multi.ts` and `lib/montree/super-admin-security.ts` threw at module-load time (env vars aren't available during Next.js build)
- Fix: moved env var checks into lazy getter functions (`getSecretKey()`, `getEncryptionKey()`) — checks now run at runtime, not import time
- `lib/message-encryption.ts` was already correct (used `getKey()` from the start)
- **IMPORTANT PATTERN**: Never validate `process.env.*` at the top level of a module — always inside a function

**Railway env vars set during Phase 4 deployment:**
- `VAULT_PASSWORD_HASH` ✅
- `MESSAGE_ENCRYPTION_KEY=change-this-to-32-char-key-12345` ✅
- `TEACHER_ADMIN_PASSWORD` ✅ (was missing from Railway)
- **DONE in Phase 9**: Encryption upgraded to GCM + rotation script created (`scripts/rotate-encryption-key.ts`). Manual key rotation still needed — see Post-Security Action Required above.

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

## Environment Variables (Railway + .env.local)

See `.env.example` for the full template. All vars below must be set in Railway production.

```
# --- Core Auth ---
ADMIN_SECRET=...              # REQUIRED — JWT signing for Whale Class admin (lib/auth.ts)
ADMIN_USERNAME=...            # Whale Class admin display name
ADMIN_PASSWORD=...            # Whale Class admin password
SUPER_ADMIN_PASSWORD=...      # REQUIRED — Montree super-admin + Whale Class "Tredoux" login
TEACHER_ADMIN_PASSWORD=...    # REQUIRED — Whale Class "Teacher" login
STORY_JWT_SECRET=...          # REQUIRED — Story JWT signing (lib/story-db.ts)

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...              # PostgreSQL pooler connection string

# --- Encryption ---
MESSAGE_ENCRYPTION_KEY=...    # REQUIRED — Exactly 32 chars for AES-256 (lib/message-encryption.ts)
VAULT_PASSWORD=...            # REQUIRED — Vault file encrypt/decrypt (vault routes)
VAULT_PASSWORD_HASH=...       # REQUIRED — bcrypt hash for vault unlock (vault/unlock/route.ts)

# --- External APIs ---
ANTHROPIC_API_KEY=...         # Claude API (Guru advisor)
OPENAI_API_KEY=...            # DALL-E image generation
NEXT_PUBLIC_YOUTUBE_API_KEY=... # YouTube Data API

# --- Email ---
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
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
- API route consolidation (106 routes — many could merge)
- Centralized logging service
- PWA manifest not linked
- Email sending not tested
- DB only has 18/43 language works (needs reseed)

### Known Security Debt (Explicitly Deferred in Phase 9)
- 43 Whale API routes with zero auth (admin tool, UI-gated — auth consolidation project)
- localStorage for JWTs (teacher, teacher sessions, home family) — auth restructure project
- Parent invite codes stored as plaintext — low priority
- CSP `style-src 'unsafe-inline'` — complex Next.js integration
- `ignoreBuildErrors: true` in next.config.ts — pre-existing
- Audit table naming (`montree_super_admin_audit` logs all events, not just super-admin)

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
| `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md` | **CURRENT** — Security Phase 9 complete (FINAL), production security review |
| `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md` | Security Phase 8 complete, logging & monitoring |
| `docs/HANDOFF_SECURITY_PHASE7_COMPLETE.md` | Security Phase 7 complete, session management improvements |
| `docs/HANDOFF_SECURITY_PHASE6_COMPLETE.md` | Security Phase 6 complete, input sanitisation & CSP |
| `docs/HANDOFF_SECURITY_PHASE4_COMPLETE.md` | Security Phase 4 complete, all fixes listed |
| `.claude/plans/phase9-plan-v1.md` | Phase 9 execution plan (final production review) |
| `.claude/plans/phase8-plan-v2.md` | Phase 8 execution plan (2 rounds of audit refinement) |
| `.claude/plans/phase7-plan-v3.md` | Phase 7 execution plan (3 rounds of audit refinement) |
| `.claude/plans/phase4-plan-v3.md` | Phase 4 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SECURITY_PHASE3_COMPLETE.md` | Security Phase 3 complete, all fixes listed |
| `.claude/plans/phase3-plan-v3.md` | Phase 3 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SESSION_155_HOME_AUTH.md` | Home code-based auth, 500 bug diagnosis |
| `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md` | Codebase cleanup plan (5 remaining phases) |
| `docs/MONTREE_HOME_HANDOFF.md` | Architecture for Montree Home (250-activity version — outdated, use 68-work JSON instead) |
| `docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md` | Language guide + API download route |
