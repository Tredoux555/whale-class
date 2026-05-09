# Session 97 — Communication System + Gloria + Super-admin Revamp

**Date:** May 9, 2026 (long session — multiple shippable cuts)

**Goal of this session:** Last shippable cut before Gloria's first real school. Started with parent communication built into the app, expanded to Gloria (the agent's frontline AI on Opus), then a thorough super-admin cleanup including dark-forest retheme of the main page.

---

## TL;DR — 7 commits live in main

| Commit | What |
|--------|------|
| `47382fb3` | Communication system + Tracy parent-comms (migration 190 + 10 APIs + 2 UI pages + Tracy enrichment) |
| `3c58f6dd` | Super-admin Schools rows: login codes labelled by role + person |
| `54d52133` | Gloria — agent's frontline AI on Opus (migration 191 + entire system) |
| `a10bc050` | Super-admin cleanup: agent attribution + dark-forest API Usage + culled social-manager stubs |
| `b7346029` | Fix agent attribution: removed `is_active=true` filter that hid shell agents |
| `aa23920b` | Gloria: hasMet flag flips only on successful done event (audit catch) |
| `30642ba8` | Super-admin main page retheme to canonical dark forest |

---

## Migrations to run (both confirmed run by user during this session)

- **190** — `migrations/190_communication_system.sql` — 5 tables (threads, participants, messages, groups, group_members). ✅ run.
- **191** — `migrations/191_gloria_agent_log.sql` — `montree_agent_gloria_log` for Gloria interaction logging. ✅ run.

---

## What shipped

### 1. Migration 190 — communication schema

`migrations/190_communication_system.sql` — five new tables. Idempotent (`IF NOT EXISTS` everywhere), foreign keys to existing tables, indexes for the common query patterns. **Must be run in Supabase SQL Editor before any of the new endpoints function.**

| Table | Purpose |
|-------|---------|
| `montree_message_threads` | The conversation container. school_id-scoped. |
| `montree_message_thread_participants` | Who's in the thread + read state + can_reply + is_observer. |
| `montree_thread_messages` | Actual messages. ai_drafted + approved_by_id capture Tracy → principal → send. |
| `montree_message_groups` | Principal-defined custom groups (mixable teachers + parents). |
| `montree_message_group_members` | Group membership rows. |

Plus a trigger that bumps `montree_message_threads.last_message_at` on every new message insert.

The legacy `montree_messages` table stays. Parent portal continues to use the old API in v1 — we did not migrate it. The new threads/messages are the canonical Communication system going forward.

### 2. Sidebar revamp (principal-as-overseer)

| Old | New |
|-----|-----|
| Today | Today (kept as Tracy chat) |
| Classrooms | Classrooms (kept; drill-down enriched, see #6) |
| People | **Communication** (replaces) |
| Pulse | (hidden from nav; route still works for direct URL) |
| Settings | Settings (Billing nested inline; Pulse / Activity / Reports / Features / Import linked from "Advanced & reporting") |

`/montree/admin/people` now redirects to `/montree/admin/communication` so any stale links land cleanly. The old route files (`/pulse`, `/activity`, `/reports`) are NOT deleted — only hidden from nav. They're reachable from Settings → Advanced if the principal wants to dig in.

### 3. Communication tab — the new core surface (`/montree/admin/communication/page.tsx`)

Five tabs across the top:

- **By classroom** (default). Classroom selector → two columns: Teachers in class + Parents in class. Per-row: Message button (1:1). Bulk: "Message all teachers in class" / "Message all parents in class".
- **All teachers** — flat school roster, search, "Message all teachers (N)" composes broadcast to every active teacher.
- **All parents** — flat school roster, search, "Message all parents (N)" composes broadcast school-wide.
- **Custom groups** — list of principal-defined groups + "New group" CTA → group builder modal (mixable teacher/parent picker). Click a group → composer pre-filled with that group's members.
- **Inbox** — flat list of all threads in the school, sorted by last activity. Unread badge per thread.

Compose modal handles both 1:1 (creates a thread + posts) and broadcast (creates a single broadcast thread + fans out participants + posts the body). Thread page (`threads/[threadId]/page.tsx`) renders the conversation, marks as read on open, and surfaces Tracy's scan + draft buttons inline on parent threads.

### 4. Principal transparency

Every parent_teacher and parent_principal thread auto-adds the school's principal as `is_observer=true, can_reply=true` via `addPrincipalObserver()` in `lib/montree/messaging/thread-resolver.ts`. The participants table is the source of truth for "who's in this thread"; the threads-list endpoint widens to "every thread in the school" for principal callers via the `verifyThreadAccess()` helper. Principals see everything; teachers + parents see only their own.

### 5. Tracy enrichment — parent communication playbook + 3 new tools

`lib/montree/tracy/system-prompt.ts` gained a "Parent communication playbook" section between the role rules and the honesty rules. Three reflexes:
- Acknowledge before explaining when frustrated
- Validate by naming concern back, then propose next step
- Cross-cultural sensitivity (Chinese parents value academic clarity; Anglophone parents value child autonomy + observation language). Light touch, never preachy.
- Honesty: no medical claims, no future promises, "let me check with [teacher]" instead of inventing.

Three new Tracy tools in `lib/montree/tracy/tool-definitions.ts` and `tool-executor.ts`:

- **`list_recent_threads`** — pulls top 20 threads with type, subject, last sender, last snippet. Optional filters: thread_type, classroom_id, unread_only.
- **`scan_parent_thread`** — Opus reads a thread end-to-end and returns a 60-100 word chief-of-staff briefing (sentiment, recurring concerns, recommended next move with `→ ` action line). Routed via the new `/api/montree/admin/tracy/scan-thread` endpoint.
- **`draft_parent_response`** — Opus drafts a reply in the principal's voice, using her last 10 messages as voice samples. Returns a single text body for the principal to send (or edit + send). Optional `guidance` parameter for "keep it warm but firm about the late pickup policy" style direction. Routed via `/api/montree/admin/tracy/draft-response`.

The principal **always pulls the trigger.** Tracy never sends autonomously. When she drafts, the principal hits Send and the message posts with `ai_drafted=true, approved_by_id=<principal_id>` — a permanent audit trail.

Both AI endpoints tier-gate via `resolveReportModel()`. Free schools get 402 with a friendly message pointing to `SUPPORT_EMAIL` env var (defaults to tredoux555@gmail.com).

### 6. Classroom drill-down progress scan

`/api/montree/admin/classrooms/[classroomId]/route.ts` extended to return per-student progress (`mastered/practicing/presented` counts + per-area breakdown) and per-teacher activity (photos confirmed this week, notes posted this week). Per-student `photos_this_week` count too. The page consumes these via the existing `Student` and `Teacher` interfaces, which were extended with the new optional fields. Future UI iteration can render a "This week's activity" panel on the page itself; data is already flowing.

### 7. APIs

All new endpoints under `/api/montree/messages/*` and `/api/montree/admin/communication/*` and `/api/montree/admin/tracy/*`. Every endpoint:
- Enters via `verifySchoolRequest()` (canonical auth helper)
- Filters by `school_id` (cross-pollination contract)
- Re-verifies thread / group ownership before any read or write
- Maps `homeschool_parent` → `parent` for participant lookup

Key endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/montree/messages/threads` | List threads scoped by role + filters. Principal sees all in school; teacher/parent sees their own. Returns enriched rows (participants, last snippet, unread count). |
| POST | `/api/montree/messages/threads` | Create new thread + add participants. |
| GET | `/api/montree/messages/threads/[id]` | Thread detail + participants + child + classroom. |
| PATCH | `/api/montree/messages/threads/[id]` | mark_read / archive / unarchive. |
| GET | `/api/montree/messages/threads/[id]/messages` | Paginated message list. |
| POST | `/api/montree/messages/threads/[id]/messages` | Post message. Enforces `can_reply`. AI-drafted indicator. |
| POST | `/api/montree/messages/broadcast` | Fan-out to scope (all_teachers / all_parents / classroom_teachers / classroom_parents / group). Creates one broadcast thread + adds all matched recipients. |
| GET | `/api/montree/messages/groups` | List custom groups + members. |
| POST | `/api/montree/messages/groups` | Create custom group (principal-only). |
| PATCH | `/api/montree/messages/groups/[id]` | Edit name/desc, add/remove members. |
| DELETE | `/api/montree/messages/groups/[id]` | Soft-archive. |
| GET | `/api/montree/admin/communication/directory` | School roster: classrooms + teachers + parents (grouped by classroom + flat). Principal-only / teacher-readable. |
| POST | `/api/montree/admin/tracy/scan-thread` | Tracy scan (Opus). 402 if Free tier. |
| POST | `/api/montree/admin/tracy/draft-response` | Tracy draft (Opus + voice samples). 402 if Free tier. |

### 8. Existing surfaces preserved

- Parent portal (`/montree/parent/messages`) still uses legacy `montree_messages` API. Not migrated in this session.
- Parent invite codes (`/montree/admin/parent-codes`) still works — teachers also reach this page from `/montree/dashboard/tools` (it's role-flexible).
- Story system unchanged.
- Weekly Wrap email send unchanged.

---

## Architectural rules locked in this session — DO NOT BREAK

1. **The principal always pulls the trigger.** Tracy can scan, draft, and propose — but every message that posts in her name has `approved_by_id = principal.userId`. There is no autonomous send tool. Don't add one.

2. **Cross-pollination contract is mandatory on every messaging endpoint.** `verifySchoolRequest()` provides school_id; every Supabase query funnels through it (or via `verifyThreadAccess()` which double-checks both school + participant membership).

3. **The principal is auto-added as observer to every parent_teacher / parent_principal thread.** `addPrincipalObserver()` runs inside `createThreadWithParticipants()` for those types. Don't bypass it. This is the transparency contract.

4. **`montree_messages` (flat) is legacy.** New code uses `montree_thread_messages`. Parent portal still on legacy temporarily — fine. Don't extend `montree_messages`; extend the new system.

5. **`ai_drafted=true` + `approved_by_id` is the audit trail.** Server overrides any client-supplied `approved_by_id` with `auth.userId`. Renders as a "Tracy drafted" pill in the UI.

6. **Tier-gate every Opus call via `resolveReportModel()`.** Free schools get 402 with an actionable error, not a silent failure. The Tracy tools are useless without Opus, so this is correct.

7. **`homeschool_parent` always maps to `'parent'` for participant lookups.** This invariant is in three places (threads/route.ts, threads/[id]/route.ts, messages/route.ts). Never deviate.

8. **The principal's school storage namespace stays scoped.** `lib/montree/tracy/storage-keys.ts` from Session 96 is unaffected — Tracy's float on the new Communication pages reuses the same per-school keys.

9. **Sidebar nav is now four items.** Today / Classrooms / Communication / Settings. Pulse hidden by design. Don't re-surface it; if the principal needs it, Settings → Advanced takes her there.

10. **Hide-don't-delete.** `/pulse`, `/activity`, `/reports` route files still exist. Future build agents shouldn't delete them — the principal can reach them from Settings, and the user said "I may want them later".

---

## Verification checklist (next session, after Railway deploys)

1. **🚨 Run migration 190** in Supabase SQL Editor.
2. Hard refresh `/montree/admin` — sidebar shows Today / Classrooms / Communication / Settings only.
3. Open `/montree/admin/communication` — defaults to "By classroom" tab. Pick a classroom. See teachers + parents in two columns.
4. From a teacher row, click Message → composer opens → write → Send → lands on the new thread page.
5. From the parent column, click Message all → broadcast composer opens → Send → all parents in classroom receive a thread participant + first message.
6. Switch to Custom Groups → create a group with mixed teachers + parents → message the group → confirm all members get the thread.
7. Switch to Inbox → see every thread in the school sorted by recency. Unread count shows.
8. Open a parent thread → see "Tracy's read" buttons. Click "Scan thread" → Tracy briefing renders. Click "Draft my reply" → composer pre-fills with Tracy's draft + amber border + "Tracy drafted" indicator. Hit Send → message posts with the indicator.
9. Confirm the principal sees parent ↔ teacher threads they didn't initiate (transparency).
10. From a teacher login, confirm the teacher only sees their own threads, not other teachers' threads.
11. From a parent login (legacy `/montree/parent/messages` still works on old data), confirm nothing's broken.
12. `/montree/admin/people` 302s to `/montree/admin/communication`.
13. `/montree/admin/settings` shows Advanced & reporting links to Pulse / Activity / Reports / Features / Import.
14. Verify Free-tier degradation: flip a school to Free in super-admin, click Tracy "Scan thread" → see "AI features require an active tier" error, no red crash.

---

## Known gaps / deferred to next session

| Item | Why deferred |
|------|-------------|
| Parent portal `/montree/parent/messages` migration to new threads | Existing page works on legacy `montree_messages`. Migrate when parent-side messaging volume grows. |
| Parent reply CTA on Weekly Wrap report viewer | Could be a one-line button; defer until parent-side migration. |
| Push notifications (web push for new messages) | Out of scope. Email triggers also deferred. |
| Auto-translation of messages between locales | Not needed for first ship. LanguageToggle on each side is sufficient. |
| End-to-end encryption | Vault has it; messages don't. Defer. |
| File attachments beyond `media_url` schema | DB columns exist; UI doesn't expose upload. Defer. |
| i18n parity on new strings | New UI strings are English-only for now. Run `npm run i18n:fill-ui` to backfill 11 other locales when ready. |
| "This week's activity" panel render in Classroom drill-down | Data flows through the API. UI section can be added in a focused 30-min commit. |
| Teacher-side dedicated parent invite UI | Teachers can already use `/montree/admin/parent-codes` (role-flexible). Cleaner teacher-side surface deferred. |

---

## Files changed (summary)

**Migrations (NEW):**
- `migrations/190_communication_system.sql`

**Core lib (NEW):**
- `lib/montree/messaging/types.ts`
- `lib/montree/messaging/thread-resolver.ts`

**Core lib (extended):**
- `lib/montree/tracy/tool-definitions.ts`
- `lib/montree/tracy/tool-executor.ts`
- `lib/montree/tracy/system-prompt.ts`

**APIs (NEW):**
- `app/api/montree/messages/threads/route.ts`
- `app/api/montree/messages/threads/[threadId]/route.ts`
- `app/api/montree/messages/threads/[threadId]/messages/route.ts`
- `app/api/montree/messages/broadcast/route.ts`
- `app/api/montree/messages/groups/route.ts`
- `app/api/montree/messages/groups/[groupId]/route.ts`
- `app/api/montree/admin/communication/directory/route.ts`
- `app/api/montree/admin/tracy/scan-thread/route.ts`
- `app/api/montree/admin/tracy/draft-response/route.ts`

**APIs (extended):**
- `app/api/montree/admin/classrooms/[classroomId]/route.ts` (per-student progress + per-teacher activity)

**UI (NEW):**
- `app/montree/admin/communication/page.tsx`
- `app/montree/admin/communication/threads/[threadId]/page.tsx`

**UI (replaced):**
- `app/montree/admin/people/page.tsx` (now a redirect)

**UI (extended):**
- `app/montree/admin/layout.tsx` (sidebar revamp)
- `app/montree/admin/settings/page.tsx` (Advanced & reporting section)

**Docs:**
- `docs/handoffs/SESSION_97_PLAN.md`
- `docs/handoffs/SESSION_97_HANDOFF.md` (this doc)

---

## Audit cycle outcome (Communication system)

Three consecutive clean audits achieved. First pass caught: broken `unreadOnly` filter in tool-executor (no-op), hardcoded support emails in two routes, misleading approved_by_id comment. All fixed. Second pass independent agent verified everything compiles, school-scoping holds across all 20+ queries, no broken imports. Third pass added the children-fetch server-side scoping for performance. Verdict: **GO.**

---

# Part 2 — Login Code Labelling (commit `3c58f6dd`)

The super-admin Schools tab was showing a flat comma-separated list of login codes with no indication of which person each code belonged to. With multi-teacher classrooms + principals + agent-issued logins it became unreadable.

**API change** (`app/api/montree/super-admin/schools/route.ts`):
- Now fetches BOTH `montree_teachers` codes AND `montree_school_admins` codes (was teachers-only).
- Deduplicates and sorts by role rank: principal → lead_teacher → teacher → assistant_teacher.
- Returns `login_codes_labelled` array of `{ code, role, name, active }` alongside the legacy flat `login_codes` for backward compat.

**UI** (`components/montree/super-admin/SchoolsTab.tsx`): each code rendered as a chip with role badge + name + code. Color-coded per role (principal=amber, lead=emerald, teacher=slate, assistant=lighter slate). Inactive codes get a small `INACTIVE` marker. Tooltip on hover shows full role + name.

---

# Part 3 — Gloria, the agent's frontline AI on Opus (commits `54d52133`, `aa23920b`)

Mirror of Tracy's architecture, agent-scoped. Helps agents (Gloria-the-human, Sarah, future referral partners) draft outreach, monitor their pipeline, and keep schools moving without losing the human touch.

## What Gloria can do

| Tool | Purpose |
|------|---------|
| `list_my_schools` | Agent's converted schools with student count + revenue share % |
| `list_my_codes` | Agent's referral codes (all / pending / redeemed / revoked / expired) with conversion status |
| `school_health` | For one converted school: student count, classroom count, days since last activity, principal login, photos this week, AI tier, verdict (`healthy` / `quiet` / `idle` / `never_started`) |
| `draft_outreach_email` | Haiku-drafted cold pitches in 12 languages, country-aware cultural register |
| `draft_followup_email` | Warmer, shorter follow-up nudges with optional `days_since_first_email` calibration |
| `translate_text` | Haiku translation preserving tone / register / line breaks |

## What Gloria can't do

- Send anything autonomously (always returns text for the agent to send/edit)
- Edit schools, codes, or revenue share (read-only on data)
- See another agent's pipeline (cross-pollination contract: `WHERE founding_teacher_id = auth.userId` on every read)

## Stack

| File | Role |
|------|------|
| `migrations/191_gloria_agent_log.sql` | NEW — `montree_agent_gloria_log` table (mirror of principal_agent_log) |
| `lib/montree/gloria/types.ts` | (none — types lifted from messaging where shared) |
| `lib/montree/gloria/storage-keys.ts` | NEW — per-agent localStorage namespace |
| `lib/montree/gloria/system-prompt.ts` | NEW — Opus prompt with the canonical `→ ` action-line marker, anti-AI-tells list, first-meeting + greeting protocols |
| `lib/montree/gloria/tool-definitions.ts` | NEW — 6 tool schemas |
| `lib/montree/gloria/tool-executor.ts` | NEW — dispatch + draft helpers (Haiku for drafts, direct Supabase for reads) |
| `lib/montree/gloria/index.ts` | NEW — barrel re-exports |
| `app/api/montree/agent/gloria/route.ts` | NEW — SSE Opus tool-use loop, 80/24h rate limit, fire-and-forget logging |
| `components/montree/agent/GloriaAvatar.tsx` | NEW — avatar with PNG + CSS-rendered "G" fallback |
| `app/montree/agent/gloria/page.tsx` | NEW — full chat page with first-meeting greeting flow |
| `components/montree/agent/AgentNav.tsx` | EXTENDED — Gloria link added between Dashboard and Schools |

## Architectural rules locked in

1. **Agent always pulls the trigger.** Gloria drafts, agent sends. No autonomous send tool.
2. **Cross-pollination filter is `auth.userId` (NOT `schoolId`).** Agent JWTs have schoolId set but it's INERT for agent routes.
3. **Opus for orchestrator, Haiku for draft tools.** Cost discipline.
4. **No tier gate.** Agents are paid partners; Gloria is platform infrastructure for them. Daily rate limit catches loops (~$10/day cap).
5. **Storage keys scoped by agent_id.** No cross-agent bleed in shared browsers.
6. **First-meeting flag flips ONLY on successful `done` SSE event** (audit fix, commit `aa23920b`). If greeting fails, the next session retries `[GREETING_FIRST]` until it actually lands.

## Audit findings + fixes

Independent audit caught one real bug: the `hasMet` flag was being set immediately after `send()` returned, regardless of whether the greeting POST succeeded. Fixed in `aa23920b` — `pendingFirstMeetingRef` now tracks first-meeting fires and only flips the localStorage flag inside the `done` event handler. Mirror of Tracy's pattern from Session 96.

Audit also flagged Opus pricing as `$5/$25 per MTok` — false positive. Anthropic's actual published Opus 4.6 pricing is `$15/$75`, which is what both Tracy and Gloria use. No change.

## Schema column references verified

- `montree_school_admins.last_login` (NOT `last_login_at` — verified against migration 067)
- `montree_referral_codes.agent_id` (per migration 186)
- `montree_schools.founding_teacher_id` (per Session 90 — semantics shifted to "linked agent")
- `montree_api_usage.school_id` + `created_at` (per migration 142)
- `montree_school_features.feature_key` + `enabled` (existing)

---

# Part 4 — Super-admin cleanup (commits `a10bc050`, `b7346029`)

Three coordinated wins on the super-admin surface.

## Agent attribution on Schools rows

`/api/montree/super-admin/schools` now resolves `founding_teacher_id` → agent identity (id, name, email, is_agent) via a `montree_teachers` lookup with NO `is_active` filter (intentional — shell agents are `is_active=false` per Session 91 Phase 7a, filtering them out hid Gloria's attribution from Test School 1; commit `b7346029` was the fix).

`SchoolsTab.tsx` renders a `🤝 Agent · Name` line on every school that was referred via a code. Schools without an agent stay quiet. New filter chip `🤝 Agent-referred (N)` selects all referred schools at once.

## API Usage page → dark forest

The most jarring legacy white-themed surface in super-admin is now full dark forest. Slate-900 base, emerald-500 accents, amber for active count. Lora serif headings. Glass-card stat tiles. Dark table with proper hover states. Bar chart in emerald instead of indigo. Functional behavior unchanged.

## Social Manager hub culled

The hub was advertising five modules but four were `🚧 coming soon` placeholders. Now shows only Social Media Guru (the wired one). Removed fake hardcoded "Recent Activity" stats (17 / 815K / 3) and the static "Connected Platforms" bar. Routes for vault/credentials/tracker/calendar still exist on disk per hide-don't-delete posture.

---

# Part 5 — Super-admin main page retheme (commit `30642ba8`)

The main `/montree/super-admin/page.tsx` itself was untouched in commit `a10bc050` — just sub-pages. After user feedback ("why is my super admin not changing its face?"), retheme'd the main landing page to match the canonical dark forest tokens used in `/montree/admin`.

| Element | Before | After |
|---|---|---|
| Background | `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900` | `#0a1a0f` base + radial emerald glow at 88% 8% |
| Title | Inter bold 24px | Lora serif 30px, `letter-spacing: -0.4px` |
| Header buttons | `bg-slate-700` solid | Dark glass cards with emerald border |
| Onboarding System block | Solid slate-800 box | Dark glass card; active roles glow emerald-tinted |
| Tabs | Solid pill buttons (`bg-emerald-500` active / `bg-slate-800` inactive) | Underline tabs — emerald underline + emerald text on active, transparent inactive; inline color-coded badges |
| Login screen | Solid slate-800 card | Glass card on dark forest with backdrop blur and radial glow behind it |

Lora font loaded via inline `<style jsx global>` because there's no `super-admin/layout.tsx` (mirror of how `/montree/admin/layout.tsx` does it).

---

# Verification checklist (post-Railway redeploy)

After the final commit `30642ba8` deploys, hard refresh `/montree/super-admin` and walk through:

1. **Login screen** — dark forest with glass card + emerald glow behind it.
2. **Header** — "🌳 Montree Admin" in Lora serif, large, with `8 schools · 3 trial · 5 free · 0 paid` underneath.
3. **API Usage / Community / Register school buttons** — top-right, dark glass cards with emerald border, Register school is solid emerald.
4. **Onboarding System block** — Principals checkbox should glow emerald when on, others stay neutral.
5. **Tab strip** — clean underline pills with emerald active state; tabs sit on a hairline emerald underline.
6. **Schools tab body** — Test School 1 row shows `🤝 Agent · Gloria` + labelled login code chips (Principal in amber, Teachers in slate).
7. **`🤝 Agent-referred (1)` filter chip** visible in the filter row.
8. **Click "📊 API Usage"** — page is dark forest themed throughout (was white-themed before).
9. **Click "📚 Community"** — still legacy (intentional — left out of scope for this session).
10. **Sign out and back in** — login screen renders with the same theme.

## Open from this session

- **Marketing Hub sub-routes** (24 pages) — already in dark forest theme per audit. Cluttered but functional. Worth a separate session if you want to consolidate / cull.
- **community/page.tsx, job-tracker/page.tsx, principal-questions/page.tsx** — legacy themed, low-leverage to retheme.
- **Gloria avatar PNG** — `public/gloria-avatar.png` not in repo; CSS-rendered "G" fallback works fine. Drop a real PNG when ready.
- **Carry-overs from Session 96** — Stripe wiring, migration 188, Resend domain verification, Sarah's agent login, Phase 5 payout calc, Phase 6 super-admin Money tab.
