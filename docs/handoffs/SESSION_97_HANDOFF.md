# Session 97 — Communication System + Dashboard Revamp + Tracy Parent-Comms

**Date:** May 9, 2026

**Goal of this session:** Last shippable cut before Gloria's first real school. Parent communication built into the app, principal as overseer (full transparency), teachers do the parent onboarding work, dashboard simplified, Tracy enriched with parent-comms playbook + scan + draft tools.

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

## Audit cycle outcome

Three consecutive clean audits achieved. First pass caught: broken `unreadOnly` filter in tool-executor (no-op), hardcoded support emails in two routes, misleading approved_by_id comment. All fixed. Second pass independent agent verified everything compiles, school-scoping holds across all 20+ queries, no broken imports. Third pass added the children-fetch server-side scoping for performance. Verdict: **GO.**
