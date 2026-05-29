# Session 97 — Communication System + Dashboard Revamp PLAN

**Goal:** Last shippable cut before Gloria gets the system. Parent communication built in, principal as overseer, teachers do the onboarding work, dashboard simplified.

---

## Locked decisions (DO NOT re-debate)

1. **Principal always pulls the trigger.** Astra can draft, suggest, scan — but never sends without principal confirmation. No autonomous action.
2. **Teachers onboard parents.** Principal can ask Astra to draft an onboarding push to all teachers asking them to invite their parents.
3. **Full transparency to principal.** Principal sees every parent ↔ teacher thread in their school. Read-only by default, but principal can insert herself.
4. **Custom groups can be mixed or exclusive.** Mix teachers + parents in one group is fine.
5. **Hide features, don't delete.** Pulse, Activity, Reports stay at routes — sidebar nav drops them. FeaturesProvider gates.
6. **Don't build hidden features.** Just hide them.
7. **AI inserts into thread on principal's behalf with explicit principal confirmation.** Drafted message appears, principal hits Send.
8. **Astra's enrichment = conversation context loading + communication playbook + principal voice samples.** Don't build a "brain" like Guru. Opus + context is enough.

---

## Sidebar — final shape

| Old | New |
|-----|-----|
| Today | Today (simplified — Astra chat, no extras) |
| Classrooms | Classrooms (kept, drill-down enriched with progress scan) |
| People | **Communication** (replaces, see below) |
| Pulse | (hidden behind feature flag) |
| Settings | Settings (Billing nested inside) |

`/montree/admin/billing` route stays accessible from Settings. Other sub-routes (Activity, Reports, Pulse) keep their files but drop from nav.

---

## Communication tab — the core new surface

**Route:** `/montree/admin/communication` (replaces `/montree/admin/people` link in sidebar; old route stays at /people for backward compat redirect to /communication).

**Top tab strip:**
1. **By Classroom** (default) — classroom selector dropdown. Shows two columns: Teachers in class + Parents in class. Quick actions per row: DM, view threads. Bulk actions: "Compose to all teachers in class" / "Compose to all parents in class".
2. **All Teachers** — full school roster. Multiselect, compose.
3. **All Parents** — full school roster grouped by classroom. Multiselect, compose.
4. **Custom Groups** — list of principal-created groups. Click to view/manage. "+ New group" creates one.
5. **Inbox** — flat list of all threads sorted by last activity. Filter chips (Unread, Parent Threads, Internal, Broadcasts).

**Each thread page** (`/montree/admin/communication/threads/[threadId]`):
- Header: subject, participants, child context if applicable, status badges (parent thread, AI-drafted, broadcast).
- Message list: sender role badges, AI-drafted indicator if applicable, timestamps.
- Composer: textarea, "Suggest response" button (calls Astra `draft_parent_response`), Send.
- Insert flow (parent threads only): "Insert reply with Astra" → Astra drafts → modal preview → principal confirms → message posted as principal.

---

## Data model — Migration 190

```sql
-- Threads (replaces flat montree_messages model with thread+message)
CREATE TABLE montree_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  thread_type TEXT NOT NULL CHECK (thread_type IN ('parent_teacher','parent_principal','internal','broadcast','group')),
  subject TEXT,
  group_id UUID,
  created_by_role TEXT NOT NULL,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX idx_threads_school ON montree_message_threads(school_id, last_message_at DESC);
CREATE INDEX idx_threads_classroom ON montree_message_threads(classroom_id, last_message_at DESC);
CREATE INDEX idx_threads_child ON montree_message_threads(child_id, last_message_at DESC);
CREATE INDEX idx_threads_group ON montree_message_threads(group_id);

-- Participants (who's in a thread, with read state and capabilities)
CREATE TABLE montree_message_thread_participants (
  thread_id UUID NOT NULL REFERENCES montree_message_threads(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('teacher','principal','parent')),
  participant_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  can_reply BOOLEAN NOT NULL DEFAULT TRUE,
  is_observer BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (thread_id, participant_role, participant_id)
);
CREATE INDEX idx_participants_lookup ON montree_message_thread_participants(participant_role, participant_id);

-- Messages (thread-keyed, supports media + ai-drafted indicators)
CREATE TABLE montree_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES montree_message_threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('teacher','principal','parent','system')),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  body_locale TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image','video','document','audio')),
  media_filename TEXT,
  ai_drafted BOOLEAN NOT NULL DEFAULT FALSE,
  ai_draft_source TEXT,
  approved_by_id UUID,
  in_reply_to UUID REFERENCES montree_thread_messages(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_thread_messages ON montree_thread_messages(thread_id, sent_at);

-- Custom groups
CREATE TABLE montree_message_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by_role TEXT NOT NULL,
  created_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX idx_groups_school ON montree_message_groups(school_id);

-- Group members (mixable: teacher, principal, parent)
CREATE TABLE montree_message_group_members (
  group_id UUID NOT NULL REFERENCES montree_message_groups(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('teacher','principal','parent')),
  member_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, member_role, member_id)
);
```

Full migration also handles: backfill of any pending parent invites, ensure RLS-compatible (using service-role pattern), idempotent IF NOT EXISTS, indexes for common query patterns.

---

## API surface

### Threads

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/api/montree/messages/threads` | principal/teacher/parent | List threads scoped by role + filters (classroom, child, type, unread) |
| POST | `/api/montree/messages/threads` | principal/teacher/parent | Create new thread with participants |
| GET | `/api/montree/messages/threads/[id]` | participant or principal | Get thread + participants + recent messages |
| PATCH | `/api/montree/messages/threads/[id]` | participant | Mark read, archive, leave |
| GET | `/api/montree/messages/threads/[id]/messages` | participant | Paginated message list |
| POST | `/api/montree/messages/threads/[id]/messages` | participant with `can_reply=true` | Post message |

### Broadcast

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | `/api/montree/messages/broadcast` | principal/teacher | Fan-out: scope `{ kind: 'all_teachers'\|'all_parents'\|'classroom_teachers'\|'classroom_parents'\|'group', classroom_id?, group_id? }` + body. Creates broadcast thread. |

### Groups

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/api/montree/messages/groups` | principal | List custom groups |
| POST | `/api/montree/messages/groups` | principal | Create group |
| PATCH | `/api/montree/messages/groups/[id]` | principal | Edit name/desc, add/remove members |
| DELETE | `/api/montree/messages/groups/[id]` | principal | Archive |

### Principal transparency

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/api/montree/admin/communication/overview` | principal | All threads in school with snippets. Filter by classroom, by type, unread only. |

### Teacher parent onboarding

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | `/api/montree/teacher/parents/invite` | teacher | Generate invite code + email parent. Creates `montree_parent_invites` row. |
| GET | `/api/montree/teacher/parents` | teacher | List parents per child (joined view). |

### Astra AI

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | `/api/montree/admin/tracy/scan-thread` | principal | Astra reads a thread → returns sentiment/pattern/suggested-direction summary. |
| POST | `/api/montree/admin/tracy/draft-response` | principal | Astra drafts a message body for principal to send into thread. |

---

## Astra enrichment (winning combo)

### New tools (`lib/montree/tracy/frameworks/`)
- **`scan-parent-thread.ts`** — Loads thread + child context + recent observations. Haiku parses pattern/sentiment, Sonnet/Opus composes a chief-of-staff briefing for the principal. Returns: summary paragraph + recommended action.
- **`draft-parent-response.ts`** — Loads thread + child context + principal's prior message style (last 10 messages by principal across any thread). Opus composes a draft reply in the principal's voice. Returns: draft body string.
- **`insert-parent-message.ts`** (action tool) — Posts a message into the thread on principal's behalf, marked `ai_drafted=true, approved_by_id=<principal_id>`.

### System prompt extension
- Inline a 200-word "Parent Communication Playbook" section into Astra's system prompt:
  - De-escalation phrases for frustrated parents
  - Cross-cultural sensitivity notes (concise, not preachy)
  - Honesty rule: never invent, never promise outcomes
  - Voice rule: match the principal's prior tone
  - Length rule: parent replies stay short, warm, decisive

### Conversation context
- When principal asks Astra about a specific thread, the relevant thread + child context get loaded inline. Stateless per question; no Guru-style brain accumulation. Opus + good context = enough.

---

## Classroom drill-down — progress scan addition

Append below Teaching Team + Students sections:

**Section 3: This Week's Activity**
- Per-teacher: name + photos confirmed (this week) + observations posted (this week) + last login. Sortable by activity.
- Per-student: name + works mastered/practicing/presented count per area + last observed + photos this week.

Endpoint: extend `/api/montree/admin/classrooms/[id]/route.ts` to include weekly activity rollups.

---

## Hidden surfaces (feature flag gates)

Add feature definitions:
- `dashboard_pulse` (default OFF for new schools)
- `dashboard_activity` (default OFF)
- `dashboard_reports` (default OFF)

Sidebar reads these from FeaturesProvider; if disabled, nav entries hide. Routes still work for direct URL access (won't 404).

---

## Parent portal additions

- `/montree/parent/messages` (existing stub) — wire up to thread list, render dark-forest themed thread view + composer.
- Weekly Wrap report viewer (`/montree/parent/report/[reportId]`) — add "💬 Reply to your teacher" button at bottom that creates a parent_teacher thread.
- Parent dashboard — add unread-message badge in nav.

---

## Teacher portal additions

- New "Parents" sidebar entry → list of parents per child + invite flow.
- Per-child parent invite: button generates code + Resend email with welcome.
- Inbox surface for parent-teacher threads.

---

## Principal "send to all teachers/parents" master functions

Both principal and teacher can compose-to-many. Implemented via `/api/montree/messages/broadcast` with scope. UI lives in Communication tab as a top-bar action: "✉ Compose →" opens modal with audience picker (per-class or all + role filter).

---

## Build order

| Wave | Includes |
|------|----------|
| 1 | Migration 190 + lib/montree/messaging/* core + sidebar revamp + Today simplification + hide Pulse/Activity/Reports + Settings reorg with billing |
| 2 | Threads/messages APIs + broadcast + groups + Communication tab UI (By Classroom + All Teachers + All Parents + Custom Groups + Inbox) + thread page |
| 3 | Astra tools (scan-parent-thread + draft-parent-response + insert-parent-message) + system prompt enrichment + insert-into-thread UI flow |
| 4 | Classroom drill-down progress scan extension |
| 5 | Parent portal Messages page + Reply CTA on report viewer |
| 6 | Teacher portal Parents page + invite flow |
| 7 | i18n parity + audit cycle |

Pragmatic shortcut: i18n keys English-only first, batch-fill all 11 other locales at end via `npm run i18n:fill-ui`.

---

## Out of scope

- Push notifications (defer to future session)
- Email reply integration (defer)
- Auto-translation in messages (defer; show in original locale, parent uses LanguageToggle)
- End-to-end encryption (defer; use existing AES helper but not full E2EE)
- Voice notes in messages (defer)

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Migration size with FK | Use `IF NOT EXISTS` everywhere, idempotent. |
| Cross-pollination breach via thread participation | Every endpoint MUST verify both `school_id` AND participant membership. |
| Astra hallucinating quoted text in drafts | Never quote dates verbatim except ISO YYYY-MM-DD; honesty rule in system prompt. |
| AI cost on draft generation | Gate on `ai_tier='sonnet'`; Free/Haiku tiers get template fallback or unavailable. |
| Existing `montree_messages` data in production | Leave the table alone; new system uses `montree_thread_messages`. Migration includes optional backfill plan but can run later. |
| UI complexity in Communication tab | Keep first ship spartan: by-classroom + all-teachers + all-parents + custom-groups + inbox. No filters beyond unread. |

---

## File-by-file change list

### Migrations
- `migrations/190_messaging_threads.sql` (NEW)

### Core lib
- `lib/montree/messaging/types.ts` (NEW)
- `lib/montree/messaging/thread-resolver.ts` (NEW — thread access + participant resolution)
- `lib/montree/messaging/broadcast.ts` (NEW — fan-out helpers)
- `lib/montree/messaging/groups.ts` (NEW — group CRUD)
- `lib/montree/messaging/principal-overview.ts` (NEW — transparency view)

### APIs
- `app/api/montree/messages/threads/route.ts` (NEW)
- `app/api/montree/messages/threads/[id]/route.ts` (NEW)
- `app/api/montree/messages/threads/[id]/messages/route.ts` (NEW)
- `app/api/montree/messages/broadcast/route.ts` (NEW)
- `app/api/montree/messages/groups/route.ts` (NEW)
- `app/api/montree/messages/groups/[id]/route.ts` (NEW)
- `app/api/montree/admin/communication/overview/route.ts` (NEW)
- `app/api/montree/teacher/parents/route.ts` (NEW)
- `app/api/montree/teacher/parents/invite/route.ts` (NEW)
- `app/api/montree/admin/tracy/scan-thread/route.ts` (NEW)
- `app/api/montree/admin/tracy/draft-response/route.ts` (NEW)
- `app/api/montree/admin/classrooms/[classroomId]/route.ts` (EXTEND with weekly activity)

### Astra
- `lib/montree/tracy/frameworks/scan-parent-thread.ts` (NEW)
- `lib/montree/tracy/frameworks/draft-parent-response.ts` (NEW)
- `lib/montree/tracy/frameworks/insert-parent-message.ts` (NEW)
- `lib/montree/tracy/tool-definitions.ts` (EXTEND with 3 new tools)
- `lib/montree/tracy/tool-executor.ts` (EXTEND)
- `lib/montree/tracy/system-prompt.ts` (EXTEND with parent comms playbook)

### Admin UI
- `app/montree/admin/layout.tsx` (NAV revamp + hide Pulse + Settings reorg)
- `app/montree/admin/page.tsx` (Today simplification — leave Astra chat as-is, drop noise)
- `app/montree/admin/people/page.tsx` (REPLACE with redirect to /communication)
- `app/montree/admin/communication/page.tsx` (NEW — main hub with tabs)
- `app/montree/admin/communication/threads/[threadId]/page.tsx` (NEW)
- `app/montree/admin/classrooms/[classroomId]/page.tsx` (EXTEND with progress scan)
- `app/montree/admin/settings/page.tsx` (EXTEND with Billing section)
- `app/montree/admin/billing/page.tsx` (KEEP — keep route, link from Settings)
- `app/montree/admin/pulse/page.tsx` (KEEP file, hide from nav)
- `app/montree/admin/activity/page.tsx` (KEEP file, hide from nav)
- `app/montree/admin/reports/page.tsx` (KEEP file, hide from nav)

### Parent UI
- `app/montree/parent/messages/page.tsx` (REWRITE — wire to threads)
- `app/montree/parent/messages/[threadId]/page.tsx` (NEW — thread view)
- `app/montree/parent/report/[reportId]/page.tsx` (EXTEND — Reply CTA)
- `app/montree/parent/dashboard/page.tsx` (EXTEND — unread badge)

### Teacher UI
- `app/montree/dashboard/parents/page.tsx` (NEW — parents list + invite flow)
- `app/montree/dashboard/parents/[parentId]/page.tsx` (NEW — DM thread view)
- `components/montree/DashboardHeader.tsx` (EXTEND nav)

### i18n
- `lib/montree/i18n/en.ts` (ADD comms namespace)
- Other 11 locales filled via `npm run i18n:fill-ui` after en.ts is final.

---

## Verification checklist (post-build)

1. Migration 190 runs idempotently in Supabase.
2. Sidebar shows Today / Classrooms / Communication / Settings only (Pulse hidden).
3. Communication tab opens with "By Classroom" default, classroom dropdown selectable.
4. Compose to all teachers in class → message sent → all teachers see it in Inbox.
5. Compose to all parents school-wide → fan-out to every parent.
6. Custom group create → add 2 teachers + 1 parent → message → all 3 receive.
7. Teacher creates parent invite → parent receives email → clicks → lands on /montree/parent/login → enters code → arrives at dashboard.
8. Parent on weekly report → "Reply" → creates thread with lead teacher → teacher receives.
9. Principal views Communication → sees all parent threads in school (transparency).
10. Principal opens a parent thread → "Suggest response" → Astra drafts → principal confirms → message posted as principal in thread.
11. Astra scan-parent-thread answers cleanly via principal-agent.
12. Classroom drill-down shows per-teacher activity + per-student progress.
13. Settings page shows Billing section.
14. /montree/admin/people redirects to /montree/admin/communication.
15. Lint clean across all changed files.
16. i18n parity — all 12 locales at 100%.

---

## Build is now starting. CLAUDE.md update at end of session.
