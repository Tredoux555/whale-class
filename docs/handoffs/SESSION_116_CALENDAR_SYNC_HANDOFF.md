# Session 116 — Calendar Sync + Video Calls Build (handoff for fresh session)

**Mission:** ship the 4-item calendar/video build agreed at the end of Session 115. Everything gates behind new feature flags that default OFF — nothing user-facing changes until those flags flip. Tredoux will test by enabling flags one at a time on Whale Class.

**Posture:** code complete + lint clean + handoff updated. No production verification by you — Tredoux runs the migrations and flips flags himself. Your job is full-blast build, audit, ship.

---

## 🚨 DO NOT RE-DEBATE — decisions locked

| Question | Decision |
|---|---|
| Video provider | **Jitsi Meet** (Option A — free, no infra, no account needed). Rooms via `https://meet.jit.si/montree-<12-char-random>`. Daily.co was Option B, deferred. |
| Visibility default | EVERY new feature flag defaults OFF, including for Whale Class. Tredoux will enable per flag for testing. |
| Build order | (1) teacher events mirror + principal-books-staff → (2) Jitsi video links → (3) unified calendar per role → (4) iCal export. Each phase ships standalone behind its own flag. |
| Cross-pollination | Every new query filters by `school_id` + the caller's appropriate identity. No exceptions. Same posture as Sessions 97/114/115. |
| Migrations | New numbers 221 + 222 + 223 + 224. Each idempotent. Each registers its own feature flag with `default_enabled = FALSE`. |
| Staff calendar surfaces | New routes `/montree/dashboard/events` (teacher) and `/montree/dashboard/calendar` (teacher) AND `/montree/admin/calendar` (principal) AND `/montree/parent/calendar` (parent). All flag-gated. |
| Principal-to-staff appointments | Use the EVENTS table extended with `required_staff_ids JSONB`. NOT a new appointment kind. This keeps the appointments table parent-initiated only — cleanest separation. |
| iCal token storage | Per-user token on a new `montree_user_calendar_tokens` table. Token rotates on logout. Separate table because three identity types (parent, teacher, principal) need tokens and they live in three different tables. |
| New feature flag names | `unified_calendar`, `staff_meetings`, `video_calls`, `ical_export`. All four go in `FeatureKey` union + migrations register them. |

---

## What Sessions 114 + 115 already shipped (skip the audit — already verified)

| Table | Purpose | Migration |
|---|---|---|
| `montree_meeting_notes` | Audio-free teacher + principal meeting notes (parent_visible flag → shares into thread) | 214 + 215 |
| `montree_availability_rules` | Recurring weekly staff availability windows | 216 |
| `montree_availability_blackouts` | One-off staff unavailability | 216 |
| `montree_appointments` | Parent-initiated bookings with staff. Status state machine. `event_kind` in (`single_host`, `collective`, `round_robin`). `ical_token` column already exists. `location` column already exists (where Jitsi URL will go). `thread_id` for booking confirmation post. | 216 |
| `montree_appointment_hosts` | Junction (appointment_id, host_role, host_id). Primary host marked. | 216 |
| `montree_school_events` | School/classroom events. Author, title, description, start/end, location, capacity, soft cancel. | 218 |
| `montree_school_event_rsvps` | Parent RSVPs (yes/no/maybe) per event. Composite PK. | 218 |
| `montree_schools.calendar_overrides` | JSONB array of `{date, label, is_closed}` holidays. | 220 |

Flags already in `montree_feature_definitions` (all enabled for Whale Class per Tredoux's run):
- `parent_messaging` — default ON globally (universalized in Session 115)
- `appointments` — default OFF, enabled for Whale Class
- `principal_newsletter` — default OFF, enabled for Whale Class
- `school_events` — default OFF, enabled for Whale Class
- `school_calendar` — default OFF, enabled for Whale Class

Helpers + endpoints already present (DON'T rebuild):
- `lib/montree/appointments/slot-computer.ts` — pure slot-compute function (DST-safe via Intl)
- `lib/montree/appointments/share-to-thread.ts` — generic appointment → thread message poster
- `lib/montree/appointments/parent-access.ts` — `resolveAppointmentsParent`
- `lib/montree/events/parent-access.ts` — `resolveEventsParent`
- `lib/montree/meeting-notes/share-to-thread.ts` — meeting-note → thread (parent_visible toggle)
- `app/api/montree/appointments/*` — staff appointment CRUD
- `app/api/montree/parent/appointments/*` — parent booking + reschedule (reschedule uses INSERT-first since Session 115 audit)
- `app/api/montree/admin/events/*` — staff event CRUD
- `app/api/montree/parent/events/*` — parent event view + RSVP
- `app/api/montree/parent/calendar/route.ts` — birthdays + holidays
- `app/api/montree/messages/broadcast/route.ts` — patched in Session 115 to fire Resend emails on `principal_newsletter` flag

---

## Phase 116.1 — Teacher events mirror + principal-books-staff (~3-4 hours)

### Migration `221_staff_meetings.sql`

```sql
BEGIN;

-- Extend events with optional staff-required list.
ALTER TABLE montree_school_events
  ADD COLUMN IF NOT EXISTS required_staff JSONB DEFAULT '[]'::jsonb;

-- required_staff schema (array of objects):
--   [
--     { "role": "teacher",   "id": "uuid", "response": "accepted|declined|tentative|null" },
--     { "role": "principal", "id": "uuid", "response": null }
--   ]
-- response is null until the staff member responds via the API.

UPDATE montree_school_events SET required_staff = '[]'::jsonb WHERE required_staff IS NULL;

-- New feature flag.
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'staff_meetings',
  'Staff meetings',
  'Principals can require specific teachers to attend events. Required staff see the event in their personal calendar with response buttons.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
```

### Files to create / modify

| Path | Action | Notes |
|---|---|---|
| `app/api/montree/dashboard/events/route.ts` | NEW | GET — teacher-side mirror. Returns events where the teacher's `school_id` matches AND (school-wide OR their classroom OR they're in `required_staff`). |
| `app/api/montree/dashboard/events/[id]/respond/route.ts` | NEW | POST — staff member responds to a required-attendance invite. Body `{response: 'accepted'\|'declined'\|'tentative'}`. Patches the `required_staff` JSONB array in place. |
| `app/api/montree/admin/events/route.ts` | MODIFY | POST extended to accept `required_staff: [{role,id}]` array. Validate every staff_id is in the same school. Hydrate `response: null` per entry. |
| `app/api/montree/admin/events/[id]/route.ts` | MODIFY | PATCH extended to accept `required_staff` replacement. RSVP-rollup section adds `required_staff_responses` aggregating accepted/declined/tentative counts. |
| `app/montree/dashboard/events/page.tsx` | NEW | Teacher events list. Two sections: "Required of me" (events where teacher is in required_staff, with respond buttons) + "School events" (school-wide and their classroom). Wraps a new shared `<EventsListView>` component. |
| `components/montree/events/EventsListView.tsx` | NEW | Shared list component used by teacher dashboard + parent dashboard. Props: `events`, `role`, `onRespond`. |
| `components/montree/DashboardHeader.tsx` | MODIFY | Add "Events" menu entry between Messages and Meeting Notes. Gate on probing `/api/montree/dashboard/events` 200 vs 404. |
| `lib/montree/features/types.ts` | MODIFY | Add `'staff_meetings'` to `FeatureKey` union. |

### Feature flag gating

- Server: each new endpoint checks `isFeatureEnabled(supabase, schoolId, 'staff_meetings')`. Off → 404 (NOT 403 — the feature shouldn't appear to exist).
- Client: teacher DashboardHeader menu entry probes the endpoint on mount; only renders if response was 200.

### Required_staff JSONB pattern (canonical)

When principal creates a staff meeting:
```json
{
  "title": "Tuesday staff sync",
  "start_at": "2026-05-19T15:00:00Z",
  "end_at": "2026-05-19T16:00:00Z",
  "classroom_id": null,
  "required_staff": [
    { "role": "teacher", "id": "<teacher-uuid-1>", "response": null },
    { "role": "teacher", "id": "<teacher-uuid-2>", "response": null }
  ]
}
```

When a teacher responds via PATCH:
```json
{ "response": "accepted" }
```

Server reads current `required_staff`, finds the entry matching `(role, id) = (auth.role, auth.userId)`, sets `response`, writes back. Atomic read-modify-write inside the route (acceptable — staff-meeting responses are low-concurrency).

### Cross-pollination rules

- Teacher events GET: WHERE `school_id = auth.schoolId` AND (`classroom_id IS NULL` OR `classroom_id = auth.classroomId` OR `required_staff @> [{"id":auth.userId,"role":"teacher"}]`)
- Teacher respond POST: re-fetch event → verify staff is actually in `required_staff` → write response.
- Principal POST/PATCH on events with `required_staff`: validate every `staff_id` is `montree_teachers.school_id = auth.schoolId AND is_active = true` (or `montree_school_admins` for principal role).

---

## Phase 116.2 — Jitsi video links on appointments (~1 hour)

### Migration `222_appointment_video_url.sql`

```sql
BEGIN;

ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Video URL is generated at booking time. Format:
--   https://meet.jit.si/montree-<12-char-base64url>
-- The 12-char suffix is the appointment's first 12 ical_token chars
-- so we don't need a separate column / token. Reused.

INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'video_calls',
  'Video calls on appointments',
  'When ON, parents booking an appointment can opt into a Jitsi Meet video call. URL is generated automatically and shown on the appointment detail.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
```

### Files to create / modify

| Path | Action | Notes |
|---|---|---|
| `lib/montree/appointments/video.ts` | NEW | `generateJitsiUrl(appointmentId, icalToken): string` → `https://meet.jit.si/montree-<12-char-prefix>`. Pure function. |
| `app/api/montree/parent/appointments/route.ts` | MODIFY | POST body accepts `video_call?: boolean`. When true AND `video_calls` flag ON: generate Jitsi URL via the helper, store in `video_url` column. Also gate the request body field — if flag is off, ignore `video_call`. |
| `app/api/montree/parent/appointments/[id]/route.ts` | MODIFY | Reschedule preserves `video_url` on the new row (same logic as `ical_token` carryover). |
| `app/montree/parent/appointments/page.tsx` | MODIFY | Booking flow: when `video_calls` flag ON (probe via `/api/montree/parent/appointments` response — add `feature_flags: {video_calls: true}` field), surface a checkbox "Video call (Jitsi)" before confirm. Detail view shows "Join video call" button when `video_url` is set. |
| `components/montree/appointments/AvailabilityEditor.tsx` | MODIFY | Staff "Upcoming bookings" cards surface a "Join video call" button when `appt.video_url` is present. |
| `lib/montree/appointments/share-to-thread.ts` | MODIFY | When `appointment.video_url` is set, include it in the thread message body ("Video call: <url>"). |
| `lib/montree/features/types.ts` | MODIFY | Add `'video_calls'` to `FeatureKey` union. |

### Behavior notes

- Jitsi URL is **deterministic** from `ical_token` so it can be regenerated server-side without a DB write (defense in depth — if the column is null, generate on-read).
- The Jitsi room name MUST include `montree-` prefix so it's namespaced (avoids accidental collisions with random visitors typing common room names like "meeting" or "test").
- No special config needed in Jitsi — public rooms work out of the box. Parent + staff both click the URL, browser asks for cam/mic, they're in.
- The reschedule flow already carries `ical_token` to the new row. Add `video_url` to the same carryover.

---

## Phase 116.3 — Unified calendar per role (~6-8 hours, ~2-3h per role)

### No migration needed.

This phase is pure UI assembly over existing data + a new aggregation endpoint.

### Files to create

| Path | Action | Notes |
|---|---|---|
| `app/api/montree/parent/unified-calendar/route.ts` | NEW | GET. Aggregates: parent's appointments + parent's events (school-wide + their classroom) + parent's birthday/holiday feed. Returns chronological list with kind discriminator. Gated on `unified_calendar` flag. |
| `app/api/montree/dashboard/unified-calendar/route.ts` | NEW | GET. Teacher unified: their appointments (bookings) + their classroom events + school events + required-staff invites + their own blackouts. |
| `app/api/montree/admin/unified-calendar/route.ts` | NEW | GET. Principal unified: ALL school appointments + ALL events + their own blackouts. (Transparency rule from Session 97 extends — principal sees everything.) |
| `components/montree/calendar/UnifiedCalendarView.tsx` | NEW | Shared list-style chronological calendar. Day-grouped. Each item has a kind chip (📅 appointment, 🎉 event, 🎂 birthday, 📌 holiday, ⛱ blackout). Optional minicalendar mode (deferred — list-first is enough for v1). |
| `app/montree/parent/calendar/page.tsx` | NEW | Thin wrapper rendering `<UnifiedCalendarView role="parent" />`. |
| `app/montree/dashboard/calendar/page.tsx` | NEW | Teacher wrapper. |
| `app/montree/admin/calendar/page.tsx` | NEW | Principal wrapper. |
| `app/montree/admin/layout.tsx` | MODIFY | Add "Calendar" sidebar entry between Today and Classrooms (icon: `CalendarRange`). Gated on `unified_calendar` flag probe. |
| `components/montree/DashboardHeader.tsx` | MODIFY | Add "Calendar" entry to teacher More menu. Same gate. |
| `app/montree/parent/dashboard/page.tsx` | MODIFY | Header icon strip: add Calendar icon (separate from existing Calendar = appointments icon — use `CalendarRange` to differentiate). Same gate. |
| `lib/montree/features/types.ts` | MODIFY | Add `'unified_calendar'` to `FeatureKey` union. |

### Migration `223_unified_calendar.sql`

```sql
BEGIN;
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'unified_calendar',
  'Unified calendar view',
  'Replaces the per-feature lists with a single "Calendar" view that aggregates appointments, events, birthdays, holidays, and staff invites into one chronological timeline per role.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;
COMMIT;
```

### Data shape for unified-calendar endpoints

```typescript
interface UnifiedCalendarItem {
  kind: 'appointment' | 'event' | 'birthday_own' | 'birthday_classmate' | 'holiday' | 'blackout' | 'staff_meeting';
  id: string;            // Source row id (appointment.id, event.id, etc.)
  start_at: string;      // ISO
  end_at: string | null; // ISO
  title: string;         // Human-readable header
  subtitle: string | null;
  location: string | null;
  link: string | null;   // Where to navigate on tap (e.g. /montree/parent/appointments/<id>)
  rsvp?: 'yes'|'no'|'maybe'|null;
  response?: 'accepted'|'declined'|'tentative'|null;  // for staff_meeting
  status?: string;       // appointment status
  video_url?: string | null;
}
```

Endpoint returns `{items: UnifiedCalendarItem[]}` sorted by `start_at` ascending.

### Cross-pollination — same scoping as before

- Parent endpoint: items scoped by `school_id = parent.schoolId`. Appointments where `parent_id = parent.parentId`. Events where `classroom_id IN parent.classroomIds OR classroom_id IS NULL`. Birthdays from parent's classmates. Holidays from school overrides.
- Teacher endpoint: appointments where teacher is a host (junction). Events where `classroom_id = auth.classroomId OR classroom_id IS NULL OR teacher in required_staff`. Their own blackouts. Birthdays of children in their classroom (already legal — they teach those kids).
- Principal endpoint: every appointment in school. Every event. Every blackout (own + school-wide visibility). Birthdays of every child.

### `<UnifiedCalendarView>` component design

Renders as a vertical timeline grouped by day:
```
─── TUESDAY, MAY 20 ──────────
  9:00 AM  📅  Dr. Smith (parent: Mary Chen)  · Joined via video
                                              [Join video call →]
 11:00 AM  ⛱   Sick day (blackout)
  3:00 PM  🎉  Staff sync (required)          [Accept] [Decline] [Maybe]

─── WEDNESDAY, MAY 21 ──────────
  ALL DAY  🎂  Sarah's birthday
  ALL DAY  📌  Memorial Day — school closed
  2:00 PM  📅  Tour with Smith family (booked)
```

Tap any item → navigate to the source detail page via `link`.

---

## Phase 116.4 — iCal export per user (~2 hours)

### Migration `224_user_calendar_tokens.sql`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS montree_user_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role TEXT NOT NULL CHECK (user_role IN ('parent', 'teacher', 'principal')),
  user_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active token per user. Old tokens deleted (not soft-archived) on
-- rotation so revoked iCal URLs stop working immediately.
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_tokens_user
  ON montree_user_calendar_tokens(user_role, user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_tokens_token
  ON montree_user_calendar_tokens(token);

INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'ical_export',
  'iCal calendar export',
  'Generates a personal iCal subscription URL so users can sync their Montree calendar into Apple Calendar, Google Calendar, or Outlook.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
```

### Files to create / modify

| Path | Action | Notes |
|---|---|---|
| `lib/montree/calendar/ical-token.ts` | NEW | `getOrCreateToken(supabase, role, userId, schoolId): string` (generates if missing). `rotateToken(supabase, role, userId)` (delete + recreate). `verifyToken(supabase, token)` returns `{role,userId,schoolId} \| null`. Token is 32-char base64url. |
| `lib/montree/calendar/ical-builder.ts` | NEW | `buildIcsCalendar(items: UnifiedCalendarItem[]): string` — RFC 5545 compliant. VEVENT per item with UID, DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, URL. No external deps. |
| `app/api/montree/ical/[token]/route.ts` | NEW | GET. Verify token → fetch user's unified calendar items → build ICS → respond with `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: private, max-age=300`. Public endpoint (no auth required because token IS the auth). |
| `app/api/montree/calendar/my-token/route.ts` | NEW | GET — return existing or create new token for the caller. POST — rotate token (for parent / teacher / principal logout flows OR explicit "regenerate" button). Auth via existing parent OR school cookie. |
| `lib/montree/auth/logout-hooks.ts` | NEW | `rotateAllCalendarTokensOnLogout(role, userId)` — called from logout routes. Optional for v1 — log a TODO to wire later. |
| `lib/montree/features/types.ts` | MODIFY | Add `'ical_export'` to `FeatureKey` union. |
| `app/montree/parent/calendar/page.tsx` | MODIFY (after Phase 116.3) | Add a small "Sync to your phone calendar" section at the bottom with a copy-able URL and instructions. Only when `ical_export` flag is on. |
| `app/montree/dashboard/calendar/page.tsx` | MODIFY | Same. |
| `app/montree/admin/calendar/page.tsx` | MODIFY | Same. |

### ICS file shape (canonical example)

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Montree//School Calendar 1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:appt-<uuid>@montree.xyz
DTSTAMP:20260517T120000Z
DTSTART:20260520T090000Z
DTEND:20260520T093000Z
SUMMARY:Meeting with Dr. Smith
DESCRIPTION:Parent meeting about Austin's English progress.
LOCATION:https://meet.jit.si/montree-abc123def456
URL:https://montree.xyz/montree/parent/appointments/<uuid>
END:VEVENT
END:VCALENDAR
```

### Tokens are NOT JWTs

- 32-char `base64url` random.
- Stored in `montree_user_calendar_tokens.token` as the column.
- Verification: lookup token → return `{role, userId, schoolId}`. No signature verification needed since token IS the secret.
- Rotation: DELETE the row + recreate with new token. Old URL stops working immediately.

---

## Cumulative feature flag registry (after Session 116)

| Flag | Added In | Default | Purpose |
|---|---|---|---|
| `parent_messaging` | 193 (S98) | **ON** (universalized S115) | Parent → staff threaded messaging |
| `appointments` | 216 (S115) | OFF | Parent booking calendar |
| `principal_newsletter` | 217 (S115) | OFF | Email delivery on broadcasts |
| `school_events` | 218 (S115) | OFF | Event creation + RSVPs |
| `school_calendar` | 220 (S115) | OFF | Birthday + holiday feed |
| `staff_meetings` | **221 (S116 NEW)** | OFF | Principal-books-staff (`required_staff` on events) |
| `video_calls` | **222 (S116 NEW)** | OFF | Jitsi video URLs on appointments |
| `unified_calendar` | **223 (S116 NEW)** | OFF | Per-role unified calendar view |
| `ical_export` | **224 (S116 NEW)** | OFF | iCal subscription URLs |

---

## Architectural rules to lock in (cumulative #162-#170)

162. **`required_staff` on events is the canonical primitive for principal-to-staff appointments.** Don't extend `montree_appointments` to support staff-as-parent. Appointments stay parent-initiated.
163. **Jitsi room URLs are DETERMINISTIC** from `ical_token`. Don't store separately. Default to regeneration in code if `video_url` column is null but feature is on.
164. **Jitsi room names MUST be `montree-` prefixed.** Anti-collision posture for the public Jitsi infra.
165. **Unified calendar endpoints return a discriminated union** (`kind` field). Frontend renders per kind. Don't try to make appointments and events look the same shape on the server — let the client switch on `kind`.
166. **iCal tokens are NOT JWTs.** Database row IS the source of truth. Rotation = DELETE + INSERT. Old URLs stop working instantly.
167. **iCal endpoint is unauthenticated.** Token IS the auth. Don't add session checks.
168. **`Cache-Control: private, max-age=300` on iCal responses.** 5-min cache is acceptable; calendar apps poll periodically (Apple Calendar default is hourly).
169. **Every new endpoint gates on a feature flag** that defaults OFF. Pattern: `isFeatureEnabled` → 404 when off (don't 403; feature shouldn't appear to exist).
170. **Probe-based UI gating.** Client surfaces (sidebar entries, dashboard icons) gate by probing the corresponding endpoint and showing UI only on 200. Same as Session 115 messaging icon pattern.

---

## Build order + budget

Each phase ships to a test branch independently. Lint clean before moving on.

| Phase | Time | What | Migration | Flag |
|---|---|---|---|---|
| 116.1 | 3-4h | Teacher events mirror + `required_staff` on events | 221 | `staff_meetings` |
| 116.2 | 1h | Jitsi video URLs | 222 | `video_calls` |
| 116.3 | 6-8h | Unified calendar (3 roles) | 223 | `unified_calendar` |
| 116.4 | 2h | iCal export | 224 | `ical_export` |

**Total estimate: 12-15 hours focused build.** Likely overshoot in a single session. **If context runs out, ship in priority order above** — flag the remainder with another handoff doc.

---

## Test plan (Tredoux runs after build)

**For each phase, before flipping the flag:**
1. Run the migration in Supabase SQL Editor.
2. Verify the feature flag row exists in `montree_feature_definitions` with `default_enabled = false`.
3. Confirm production deploy didn't break existing surfaces (lint clean is your responsibility; runtime check is his).

**Per-phase verification:**

**116.1 (staff meetings):** flip `staff_meetings` ON for Whale Class. Principal creates an event with `required_staff=[teacher_X]`. Teacher X opens `/montree/dashboard/events` → sees "Required of me" section with the event + Accept/Decline/Maybe buttons. Tap Accept → row updates. Principal opens the event detail → sees response rollup.

**116.2 (video calls):** flip `video_calls` ON. Parent books an appointment with the video checkbox checked. Appointment detail shows "Join video call" button → clicks → opens Jitsi in browser. Camera/mic prompt fires. Staff sees the same button on their Upcoming bookings list.

**116.3 (unified calendar):** flip `unified_calendar` ON. Parent dashboard gets a Calendar icon → opens `/montree/parent/calendar` → sees ALL upcoming events, appointments, birthdays, holidays in chronological order. Tap any item → goes to detail. Repeat for teacher + principal roles.

**116.4 (ical export):** flip `ical_export` ON. Open calendar page → "Sync to your phone" section appears with a long URL → copy it → on iPhone, Settings → Calendar → Accounts → Add → Subscription → paste URL → save. Open Apple Calendar — all Montree events appear. Add a new appointment in Montree → wait an hour (Apple's default refresh) → confirm it appears.

---

## What goes WRONG if you skip the audit cycles

The user said "I will check after the build" — meaning he tests it live. The audit cycles still need to happen DURING build:
- Lint `--max-warnings 0` clean per phase before moving on.
- Cross-pollination grep per phase (every Supabase query touches the right scope).
- Migration idempotency (every clause uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).
- Feature flag default = FALSE in EVERY new migration.

If you're tight on context near the end, **skip the polish (translations, edge-case error messages) before skipping the audits**. The audits prevent shipping broken endpoints; polish is a follow-up.

---

## Files NOT to touch

- `migrations/216_appointments.sql` through `220_school_calendar.sql` — already in production.
- `app/api/montree/appointments/*` — Session 115 surface, stable.
- `app/api/montree/parent/appointments/*` — Session 115 surface, stable. Phase 116.2 modifies these in place but only adds, never removes.
- `lib/montree/messaging/*` — Session 97 surface, working.
- `lib/montree/parent-messaging/*` — Session 98 surface, working.

---

## SQL Tredoux will run after deploy (paste-able)

```sql
-- 116.1 — staff_meetings
-- (paste migrations/221_staff_meetings.sql)

-- 116.2 — video_calls
-- (paste migrations/222_appointment_video_url.sql)

-- 116.3 — unified_calendar
-- (paste migrations/223_unified_calendar.sql)

-- 116.4 — ical_export
-- (paste migrations/224_user_calendar_tokens.sql)

-- Verify all 4 flags registered, all default off:
SELECT feature_key, default_enabled FROM montree_feature_definitions
WHERE feature_key IN ('staff_meetings', 'video_calls', 'unified_calendar', 'ical_export');
```

**To enable individual flags for Whale Class testing (one at a time):**

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'staff_meetings', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
-- Swap 'staff_meetings' for each flag to test in turn.
```

---

## Cold-resume TL;DR

You're picking up the school ecosystem build mid-stream. Sessions 114 + 115 shipped meeting notes + appointments + events + newsletters + birthday/holiday calendar — all working in production, all gated behind feature flags Tredoux has enabled for Whale Class. This session ships 4 more pieces (teacher events mirror with principal-books-staff, Jitsi video on appointments, unified calendar per role, iCal export per user) — each behind its OWN new feature flag that defaults OFF so nothing visible to users changes until Tredoux flips them. Build all four phases, lint clean per phase, write final handoff. Start with Phase 116.1 (staff meetings).
