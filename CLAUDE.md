# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management

Production: `https://montree.xyz` (migrated from teacherpotato.xyz — old domain returns 405 on API calls)
Deploy: Railway auto-deploys on push to `main`
Git remote: `git@github.com:Tredoux555/whale-class.git` (SSH — Cowork VM key "Cowork VM Feb 15" added Feb 15, 2026; old "Cowork VM" Feb 11 key is stale)
Local path: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale` (note space in "Master Brain")
**⚠️ Git Push — ALWAYS use Desktop Commander FIRST:** `mcp__Desktop_Commander__start_process` with command `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main 2>&1` and `timeout_ms: 30000`. Do NOT try Cowork VM SSH keys, GitHub PATs, or `scripts/push-to-github.py` — Desktop Commander on the user's Mac is the only reliable push method.

---

## RECENT STATUS (Apr 4, 2026)

**Photo Bank "Export to Tool" — ✅ PUSHED (commit `12e521d1`):**
Teachers select photos in Picture Bank → floating bar → "Export to" dropdown → sessionStorage → target tool loads photos. 4 targets: Three-Part Cards, Vocabulary Flashcards, Picture Bingo, Phonics Fast. 6 files modified.

**CLIP/SigLIP Classifier Permanently Removed — ✅ PUSHED (commit `2117c993`):**
Classifier produced noise-level scores (0.0004–0.0143). All code, deps, i18n keys removed. Production photo ID is now exclusively Haiku two-pass pipeline (~$0.006/photo). `@xenova/transformers` removed from package.json.

**Photo-Bank Upload Fix — ✅ PUSHED (commit `2117c993`):**
POST endpoint auth changed from `verifySuperAdminPassword` → `verifySchoolRequest` (teacher-facing page).

**Story Login Activity Tracking — ✅ PUSHED (commit `17fc9bbe`):**
7 bugs fixed in Story admin dashboard login tracking: polling for Activity Log tab, `logout_at` field added, stale session cleanup, logout inference, unbounded query limits, heartbeat logging, dead code removal.

**⚠️ Guru Not Connecting:** User needs to verify `ANTHROPIC_API_KEY` on Railway dashboard. Not a code issue.

---

## KEY ARCHITECTURAL DECISIONS

- **CLIP/SigLIP — PERMANENTLY REMOVED (Apr 4, 2026).** Stub files remain for type exports only. All functions are no-ops. Production uses Haiku two-pass exclusively.
- **Smart Capture** uses two-pass describe-then-match: Pass 1 (Haiku + image) describes what's seen, Pass 2 (Haiku + text) matches to curriculum. Sonnet fallback if both fail.
- **Photo identification cost:** ~$0.006/photo via Haiku two-pass pipeline.
- **Per-classroom visual memory** self-learning system: teacher corrections → Haiku generates visual descriptions → stored permanently → injected into future prompts.
- **Guru** uses Sonnet for all users (teachers + parents). Haiku for daily coach features. Self-improving brain system grows from every conversation.
- **All client-facing photo URLs** use Cloudflare-cached proxy (`getProxyUrl()`). Server-to-server URLs use direct Supabase.
- **Cross-pollination security:** Every route accepting `child_id` MUST call `verifyChildBelongsToSchool()`. No exceptions.
- **i18n:** 1,490+ keys, perfect EN/ZH parity. Custom React Context system (`useI18n()` hook).

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress` (alias: `montree_child_progress`)
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions` — uses `asked_at` (NOT `created_at`) as timestamp column
- `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_child_extras` — explicitly-added extra works per child (UNIQUE child_id+work_name)
- `montree_visual_memory` — per-classroom visual descriptions (UNIQUE classroom_id+work_name)
- `montree_guru_corrections` — teacher corrections to Smart Capture identifications
- `montree_community_works` — public community works library
- `montree_teacher_notes` — has `child_id` column for per-child tagging
- `montree_visitors` — site-wide visitor tracking for outreach monitoring
- `montree_attendance_override`, `montree_stale_work_dismissals`, `montree_conference_notes`
- `montree_weekly_pulse_locks` — prevents concurrent Pulse generation
- `montree_super_admin_audit` — central security audit log
- `montree_rate_limit_logs` — DB-backed rate limiting
- `story_users`, `story_admin_users` — Story system auth (bcrypt hashes)
- `story_login_logs`, `story_admin_login_logs` — Story login tracking (column: `login_at`)
- `story_online_sessions` — heartbeat-based online detection

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
OPENAI_API_KEY=...            # Whisper transcription + TTS
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
| `/montree/dashboard` | Class list + intelligence panels (attendance, stale works, conference notes, evidence, pulse) |
| `/montree/dashboard/[childId]` | Child week view |
| `/montree/dashboard/[childId]/gallery` | Photo gallery + report workspace |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/photo-audit` | Classroom-wide photo audit with corrections |
| `/montree/dashboard/classroom-setup` | "Teach the AI" — Sonnet describes materials |
| `/montree/dashboard/notes` | Dedicated teacher notes page (with child tagging) |
| `/montree/dashboard/raz` | RAZ Reading Tracker |
| `/montree/library/photo-bank` | Photo bank with export-to-tool feature |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/report/[reportId]` | View report |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub (card generators, etc.) |
| `/montree/super-admin` | Super admin panel (schools, leads, visitors, community) |
| `/montree/admin/guru` | Principal admin guru (12 tools, school-scoped) |

---

## Authentication

7 auth systems. Teacher/principal tokens use httpOnly cookies.

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256) or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/auth/teacher` |
| Principal login | Code or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/principal/login` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET`, httpOnly cookie (`admin-token`) | `lib/auth.ts` |
| Super admin | Password (timing-safe compare) + JWT session tokens | `lib/verify-super-admin.ts` |
| Story auth | Separate JWT system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Montree auth flow:** Login → JWT → httpOnly cookie `montree-auth` → `verifySchoolRequest()` reads cookie → extracts userId, schoolId, classroomId, role. Client `montreeApi()` relies on cookie auto-sending.

**Key auth files:** `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`, `lib/montree/api.ts`

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton with retry logic.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

5 area JSON files in `lib/curriculum/data/`: `language.json` (43 works), `practical_life.json`, `sensorial.json`, `mathematics.json`, `cultural.json`. Total: 329 works.

---

## Guru System (AI Teacher Advisor)

**Core files:**
- `lib/montree/guru/conversational-prompt.ts` — persona builder (teacher=violet, parent=botanical green)
- `lib/montree/guru/context-builder.ts` — child context
- `lib/montree/guru/tool-definitions.ts` — 12 teacher tools + `getToolsForMode()`
- `lib/montree/guru/tool-executor.ts` — tool execution handlers
- `lib/montree/guru/question-classifier.ts` — regex classifier for selective knowledge injection
- `lib/montree/guru/brain.ts` — self-improving brain (extraction, consolidation, retrieval)
- `lib/montree/guru/skill-graph.ts` — V3 skill-exercise mapping, bridge detection, attention flags
- `app/api/montree/guru/route.ts` — main chat endpoint
- `app/api/montree/guru/photo-insight/route.ts` — Smart Capture (two-pass Haiku)
- `app/api/montree/guru/corrections/route.ts` — teacher corrections
- `components/montree/guru/GuruChatThread.tsx` — shared chat UI

**Principal Admin Guru:** `lib/montree/admin/guru-*.ts` — 12 school-scoped tools, SSE streaming.
**Super-Admin Guru:** `lib/montree/super-admin/guru-prompt.ts` — 15 tools across all schools.

---

## Report & Photo System

```
Teacher Preview → Select Photos → montree_report_media junction table
Publish → send/route.ts queries junction → Creates final report
Parent View → parent/report/[id]/route.ts queries junction
```

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Dashboard Intelligence Layer (Teacher OS)

5 panels below student grid: Attendance, Stale Works, Conference Notes, Evidence, Pulse. Daily Brief panel above grid with priority-ranked action items. All powered by `/api/montree/intelligence/daily-brief`.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Important Patterns

- **`.single()` → `.maybeSingle()`** — Always use `.maybeSingle()` for queries that might return 0 rows. `.single()` throws on 0 rows.
- **`.ilike()` SQL injection** — Escape `%`, `_`, `\` before any `.ilike()` call: `.replace(/[%_\\]/g, '\\$&')`
- **JSON-before-OK** — Always check `response.ok` BEFORE calling `response.json()`. Server may return HTML error pages.
- **Fire-and-forget `.catch()`** — Always add `.catch(err => console.error(...))` — never empty `.catch(() => {})`.
- **Supabase `.rpc()` has no `.catch()`** — Use `.then(({ error }) => ...)` instead.
- **`montree_guru_interactions` uses `asked_at`** not `created_at` as its timestamp column.
- **AbortController cleanup** — All `useEffect` fetches should have AbortController + cleanup on unmount.

---

## Migrations Run (production)

All migrations through 157 have been run. Key ones: 147 (smart learning columns), 148 (classroom onboarding), 152-154 (teacher OS foundation), 155 (teacher OS foundation DDL), 156 (visitor tracking), 157 (teacher notes child_id).

---

## Session History

Detailed session-by-session history (Feb–Apr 2026) is archived in `docs/CLAUDE_MD_HISTORY.md`. Consult that file for historical context on specific features or decisions.
