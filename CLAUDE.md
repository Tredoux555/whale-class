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

## RECENT STATUS (Apr 5, 2026)

### ⚡ PRIORITY: Weekly Wrap → Weekly Admin Pipeline (IN PROGRESS)

**Weekly Wrap End-to-End — 🔄 IN PROGRESS (commits `f137a9b3` → `44d3f211`):**
The full Weekly Wrap → Weekly Admin pipeline is being brought online. Status:

**What's DONE:**
- Weekly Wrap generation route (`/api/montree/reports/weekly-wrap`) — fixed `enrolled_at`, removed non-existent `duration_minutes`/`repetition_count` from progress query, restored `week_number`/`report_year` in upserts (NOT NULL columns)
- Streaming progress — server returns NDJSON events per child (`stream: true`), client shows real-time progress bar ("Joey... 5/19") instead of static spinner. Bypasses `montreeApi` 30s timeout.
- Teacher report `max_tokens` bumped 2048→4096 (was truncating JSON, every report fell back to template)
- Review route (`/api/montree/reports/weekly-wrap/review`) — migrated to `week_start` param
- Send route (`/api/montree/reports/weekly-wrap/send`) — migrated to `week_start` param, `is_published`/`published_at` restored
- Review client page (`/montree/dashboard/weekly-wrap/page.tsx`) — uses `week_start` instead of `week_number`/`report_year`
- WeeklyWrapCard — removed `wn`/`yr` URL params, uses streaming fetch
- Weekly Admin auto-fill (`/api/montree/weekly-admin-docs/auto-fill`) — pulls data FROM Weekly Wrap `montree_weekly_reports` as primary source, area-by-area format with `\n` separators
- Weekly Admin generate (`/api/montree/weekly-admin-docs/generate`) — simplified to use saved notes only, `is_active` filter added
- Both tabs (Summary + Plan) fill simultaneously on auto-fill

**What NEEDS TESTING (next session):**
- **FIRST: Regenerate Weekly Wrap** — hit 🔄 on the card. All prior fixes + migration 162 are deployed. Should now save all 38 rows (19 teacher + 19 parent).
- Quick DB verify: `SELECT child_id, report_type FROM montree_weekly_reports WHERE classroom_id='51e7adb6-cd18-4e03-b707-eceb0a1d2e69' AND week_start='2026-03-29'` — expect 38 rows
- Review page: confirm all 19 children appear with teacher reports (not fallback templates)
- Send to parents: confirm emails dispatch correctly
- Weekly Admin auto-fill: confirm it pulls from Weekly Wrap reports correctly
- Weekly Admin DOCX: confirm area-by-area format renders in Word
- Teacher report JSON: confirm 4096 max_tokens is enough (was truncating at 2048, position ~8700; at 4096 still truncating at ~18000 — may need 8192 or prompt simplification)

**Key Discovery — `montree_weekly_reports` schema:**
Table has MORE columns than originally documented. Full column list: `id, child_id, classroom_id, school_id, week_start, week_end, week_number (NOT NULL), report_year (NOT NULL), report_type, status, content, is_published, published_at, sent_at, generated_at, created_at, updated_at, created_by, concentration_score, area_distribution, areas_of_growth, highlights, parent_summary, recommendations, recommended_works, active_sensitive_periods`. The `week_number` and `report_year` columns are NOT NULL — removing them from upserts causes silent insert failures. Always include computed `weekNumber` and `reportYear` in upserts. Queries should use `.eq('week_start', weekStart)` (canonical identifier).

**Key Files:**
- `app/api/montree/reports/weekly-wrap/route.ts` — main generation (streaming + non-streaming)
- `app/api/montree/reports/weekly-wrap/review/route.ts` — GET review data
- `app/api/montree/reports/weekly-wrap/send/route.ts` — POST publish + email
- `app/montree/dashboard/weekly-wrap/page.tsx` — review UI client
- `components/montree/reports/WeeklyWrapCard.tsx` — dashboard card with streaming
- `lib/montree/reports/teacher-report-generator.ts` — Sonnet teacher report (max_tokens: 4096)
- `lib/montree/reports/narrative-generator.ts` — parent narrative generator
- `app/api/montree/weekly-admin-docs/auto-fill/route.ts` — pulls from weekly_reports
- `app/api/montree/weekly-admin-docs/generate/route.ts` — DOCX generation
- `lib/montree/weekly-admin/doc-generator.ts` — DOCX builder (multilineParagraphs splits on \n)

---

**Gallery Chronological Order + Photo Audit Sort — ✅ PUSHED (commit `9f9bff3e`):**
Gallery "All Photos" now renders chronologically with date headers (was area-grouped). Timeline tab and Tag Event tab removed (redundant). Area filter chips retained. Photo Audit API sort changed from `created_at` to `captured_at` for consistency.

**Smart Capture Tappable Work Name — ✅ PUSHED (commit `4c736971`):**
PhotoInsightPopup work name row is now a tappable button with pencil icon → opens WorkWheelPicker inline on capture page. "Wrong? Fix →" removed. "Just Save" centered. Full correction flow (area picker → work picker → PATCH → popup reappears) works without leaving capture screen.

**Corrections Map Override + Scenario A Fix — ✅ PUSHED (commit `e7277f24`):**
Visual memory now overrides stale corrections map entries at runtime (fuzzyScore >= 0.5). E.g., "Chalkboard Writing" → "Chalk Board Writing - No lines" instead of → "Name Writing". Pass 2 prompt gets CLASSROOM-VERIFIED PRIORITY rule. Scenario A threshold changed to trust high matchScores (>=0.90) even with moderate Haiku confidence.

**Haiku Classification Fix — Visual Memory Feedback Loop — ✅ PUSHED (commit `cf039f04`):**
Fixed critical data flow break: teacher "Teach the AI" descriptions (Sonnet-quality, confidence 1.0, with key_materials + negative_descriptions) were stored in `montree_visual_memory` but NEVER injected into Haiku identification prompts because `is_custom=false` filter discarded them. 4 changes: (1) Pass 1 reordered — HANDS & PRIMARY WORK now item #1, accessories labeled as secondary. (2) Query expanded — loads key_materials, negative_descriptions, source, description_confidence. (3) Filter replaced — `is_custom OR (source IN teacher_setup/correction AND confidence>=0.9)` instead of just `is_custom`. (4) Visual memory moved to TOP of Pass 2 prompt with rich format (KEY MATERIALS, DISTINGUISH FROM) instead of buried at bottom of 280-line guide.

**Haiku Batch Speed-Up — ✅ PUSHED (same session, commit before cf039f04):**
Photo Audit Haiku batch processing: 3 photos in parallel (was 1 sequential), 500ms delay between batches (was 3000ms per photo). ~47 photos now ~20 seconds instead of ~2.7 minutes.

**Dual P/P/M System + Auto-Presented — ✅ PUSHED (same session):**
Photo Audit seeds P/P/M statuses from DB with "practicing" default. Fire-and-forget persists defaults with `no_downgrade: true`. Multi-child group photos auto-mark all children as "presented" silently (no UI clutter). Progress update API has `no_downgrade` param with STATUS_RANK guard. Case-insensitive progressMap keying fixed.

**Haiku Test Tab + Feature Gates + Upload Limits — ✅ PUSHED + MIGRATED (commit `3b4e1423`, migration 161):**
Photo Audit: new 🧪 Haiku Test diagnostic tab — runs two-pass Haiku without Sonnet fallback, shows Pass 1 (visual description) + Pass 2 (match result). Fixed `visualDescription` block-scoping bug. Weekly Admin Docs feature-gated (dashboard card, page, 5 API routes) — toggleable per-school via super-admin ⚙️. Migration 161 enables for Whale Class. Story video uploads bumped 100→300MB, timeouts 180→300s across all 4 paths.

**Feature-Gated Dashboard — ✅ PUSHED + MIGRATED (commit `039b435d`, migration 160):**
Dashboard sections (Daily Brief, Intelligence, Teacher Tools, Shelf Autopilot, Paperwork Tracker) gated by existing feature flag system. New schools see clean minimal view. Whale Class has everything enabled. Super-admin ⚙️ gear button per school opens feature toggle modal. Features POST route now accepts super-admin auth.

**Story Mobile Video Uploads Fixed — ✅ PUSHED (commit `6bcd3f46`):**
5 root causes fixed: server timeouts too short (60s/120s → 300s), missing iOS MIME types (3gpp, 3gpp2, x-m4v), no AbortController on admin uploads (infinite hang), unsafe `res.json()` on 502 HTML responses, client timeout too short (90s → 180s).

**Guru Progressive Thinking Display — ✅ PUSHED (commit `06f4d337`):**
Shows "Thinking..." → "Building context..." (3s) → "Generating response..." (8s) instead of static dots. Disappears once SSE streaming starts.

**Guru Model String + Error Messages — ✅ PUSHED (commit `e53a8299`):**
Model updated from `claude-sonnet-4-20250514` → `claude-sonnet-4-6`. Error responses now expose actual API error text. Photo audit "Correct" now permanent via `teacher_confirmed` boolean on `montree_media`.

**Paperwork Tracker Panel — ✅ PUSHED (commit `101896b8`):**
New dashboard intelligence panel. Tracks which weekly paperwork packet (weeks 1-37) each child is on.

**Circle Time Cards Merged — ✅ PUSHED (commit `b68a7c4c`):**
Separate Circle Time tab removed. Now "Calling Card Size" dropdown (4×4 duplex / 2×2 circle time) in all 3 Picture Bingo modes.

---

## KEY ARCHITECTURAL DECISIONS

- **CLIP/SigLIP — PERMANENTLY REMOVED (Apr 4, 2026).** Stub files remain for type exports only. All functions are no-ops. Production uses Haiku two-pass exclusively.
- **Smart Capture** uses two-pass describe-then-match: Pass 1 (Haiku + image) describes what's seen, Pass 2 (Haiku + text) matches to curriculum. Sonnet fallback if both fail.
- **Photo identification cost:** ~$0.006/photo via Haiku two-pass pipeline.
- **Per-classroom visual memory** self-learning system: two paths — (1) "Teach the AI" button uses Sonnet to generate 5-field descriptions (visual_description, parent_description, why_it_matters, key_materials, negative_descriptions) stored with source='teacher_setup', confidence=1.0. (2) "Fix" corrections use Haiku for quick descriptions, source='correction', confidence=0.9. Both injected into Pass 2 prompts. Auto-generated onboarding/first_capture descriptions (confidence=0.8) are NOT injected — they caused bias reinforcement. Visual memory placed at TOP of Pass 2 prompt before the visual ID guide.
- **Guru** uses Sonnet for all users (teachers + parents). Haiku for daily coach features. Self-improving brain system grows from every conversation.
- **All client-facing photo URLs** use Cloudflare-cached proxy (`getProxyUrl()`). Server-to-server URLs use direct Supabase.
- **Cross-pollination security:** Every route accepting `child_id` MUST call `verifyChildBelongsToSchool()`. No exceptions.
- **i18n:** 1,490+ keys, perfect EN/ZH parity. Custom React Context system (`useI18n()` hook).
- **Feature flags:** `montree_feature_definitions` + `montree_school_features` + `montree_classroom_features`. `FeaturesProvider` context in dashboard layout. `useFeatures()` hook with `isEnabled(key)`. Fail-closed (all off if fetch fails). Dashboard sections gated: `daily_brief`, `intelligence_panels`, `teacher_tools`, `shelf_autopilot`, `paperwork_tracker`, `weekly_admin_docs`. New schools get clean minimal view. Super-admin ⚙️ button per school to toggle.

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
- School ID: `c6280fae-567c-45ed-ad4d-934eae79aabc` (Tredoux House)
- Classroom ID: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` (Whale Class)
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

All migrations through 162 have been run. Key ones: 147 (smart learning columns), 148 (classroom onboarding), 152-154 (teacher OS foundation), 155 (teacher OS foundation DDL), 156 (visitor tracking), 157 (teacher notes child_id), 158 (paperwork_current_week), 159 (teacher_confirmed media), 160 (dashboard feature gates + Whale Class enabled), 161 (enable weekly_admin_docs for Whale Class).

---

## Session History

Detailed session-by-session history (Feb–Apr 2026) is archived in `docs/CLAUDE_MD_HISTORY.md`. Consult that file for historical context on specific features or decisions.
