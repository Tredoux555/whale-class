# Session 115 Burn — Ecosystem Phases 1-4 + 6 shipped in one day

**Session window:** May 17, 2026 (continuation from Session 114 — meeting notes + share-to-thread).
**Outcome:** Five of six planned ecosystem phases shipped end-to-end. Phase 5 (parent social groups) deferred pending legal audit, as planned.
**Lint posture:** every new + modified file passes `--max-warnings 0`. Pre-existing warnings on shared files (parent dashboard `<img>` tags, admin layout `setState in effect`) are not from this session.

---

## What landed today

### Phase 1 — Parent ↔ principal messaging surface ✅
- Session 97 + 98 already had the full API + parent compose UI. Discoverability was the gap.
- Added Messages icon to the parent dashboard header, gated on a probe of `/api/montree/parent/messages/threads` (404 = feature off).
- Universalised `parent_messaging` flag: default flipped to ON, all per-school override rows cleared (one-time SQL the user ran).

### Phase 2 — Calendar / appointment booking ✅
**Migration:** `216_appointments.sql` (pending Supabase run)

Schema additions:
- `montree_availability_rules` — recurring weekly availability windows per staff member. Slot duration + buffer + IANA timezone per rule.
- `montree_availability_blackouts` — one-off vacation / sick day ranges.
- `montree_appointments` — bookings. 3 event kinds: `single_host`, `collective`, `round_robin`. Status state machine (`pending`/`confirmed`/`cancelled`/`completed`/`no_show`).
- `montree_appointment_hosts` — junction for multi-host bookings. Marks primary + required hosts per appointment.

New helpers:
- `lib/montree/appointments/slot-computer.ts` — pure function, no DB. Given rules + blackouts + booked ranges, computes open slots over a date window. Handles DST transitions via `Intl.DateTimeFormat`. `intersectSlots()` for Collective availability matching.
- `lib/montree/appointments/share-to-thread.ts` — generalisation of the Session 115 meeting-notes share. Posts booking + cancellation + reschedule notices into the existing `parent_teacher` / `parent_principal` thread.
- `lib/montree/appointments/parent-access.ts` — parent-side resolver mirroring `resolveMessagingParent`.

New API routes:
- `GET/POST/PATCH/DELETE /api/montree/appointments/availability` — staff CRUD of own rules.
- `POST/DELETE /api/montree/appointments/availability/blackouts` — staff one-off blackouts.
- `GET /api/montree/appointments/slots` — parent-facing slot query. Supports all three event kinds via `?event_kind=...&hosts=role:id,role:id`.
- `GET/POST /api/montree/parent/appointments` — list parent's own + book.
- `GET/PATCH/DELETE /api/montree/parent/appointments/[id]` — view + cancel + reschedule (reschedule cancels old, inserts new, keeps thread).
- `GET /api/montree/appointments` — staff list (teacher: their bookings via junction; principal: all in school).
- `GET/PATCH /api/montree/appointments/[id]` — staff view + respond/cancel/complete actions.

New pages:
- `/montree/dashboard/appointments` (teacher) — wraps shared `AvailabilityEditor`.
- `/montree/admin/appointments` (principal) — wraps shared `AvailabilityEditor`.
- `/montree/parent/appointments` — full parent booking flow (recipient → slot → intake → confirm) + list + detail with cancel.

Nav entries:
- Admin sidebar: 📅 Appointments entry.
- Teacher More menu: Appointments entry.
- Parent dashboard header: Calendar icon (gated on the `appointments` feature flag probe).

Feature flag: `appointments` (default OFF).

### Phase 3 — Principal newsletter + announcements ✅
**Migration:** `217_principal_newsletter.sql` (pending Supabase run — just registers the flag)

Audit found Session 97 had already shipped the full broadcast infrastructure (`montree_message_threads.thread_type='broadcast'` + `resolveBroadcastScope` + per-recipient participant fan-out + read receipts). Phase 3 layered email delivery on top:

- `lib/montree/email.ts` extended with `sendAnnouncementEmail(recipientEmail, args)` — branded HTML + plaintext, Resend-backed.
- `/api/montree/messages/broadcast` route patched to fire emails to parent recipients fire-and-forget (5-concurrency worker pool), gated on the `principal_newsletter` feature flag.
- Parent dashboard featured-announcement banner: when an unread broadcast exists, surface it prominently above the report. Tapping opens the thread; reading marks read; banner disappears on next dashboard load.

Feature flag: `principal_newsletter` (default OFF — when ON, parents get an email alongside the in-app notification).

### Phase 4 — School events + RSVPs ✅
**Migration:** `218_school_events.sql` (pending Supabase run)

Schema:
- `montree_school_events` — events (school-wide if `classroom_id IS NULL`, otherwise classroom-scoped). Author tracked. Soft cancellation via `cancelled_at`. Optional capacity.
- `montree_school_event_rsvps` — composite PK (event_id, parent_id). Status `yes`/`no`/`maybe`. Optional child + note.

API:
- `GET/POST /api/montree/admin/events` — staff list + create. Teachers can only scope to their own classroom.
- `GET/PATCH/DELETE /api/montree/admin/events/[id]` — view (with RSVP rollup) + edit + cancel + delete. Delete is principal-only.
- `GET /api/montree/parent/events` — parent list (school-wide + their classroom's events). Includes own RSVP per row.
- `POST /api/montree/parent/events/[id]/rsvp` — upsert RSVP. Invite-only sessions rejected (need full parent account).

Helpers:
- `lib/montree/events/parent-access.ts` — events resolver. Supports invite-only sessions for READ but blocks RSVP writes.

UI:
- `/montree/admin/events` — full event manager with compose modal (title, description, start/end, location, scope, capacity).
- Parent dashboard: inline "Upcoming events" section with one-tap RSVP buttons (Yes / Maybe / No). Optimistic update + rollback on error.

Nav: admin sidebar 📅 Events entry alongside Appointments.

Feature flag: `school_events` (default OFF).

### Phase 6 — Birthday + holiday calendar ✅
**Migration:** `220_school_calendar.sql` (pending Supabase run)

Schema:
- `montree_schools.calendar_overrides JSONB` — array of `{date, label, is_closed?}` holiday entries. Manual SQL for now; admin UI in a future polish session.

API:
- `GET /api/montree/parent/calendar` — combined feed for next 30 days. Birthdays computed live from `montree_children.date_of_birth` (own children: full first name; classmates: first name only for privacy). Holidays from school override array.

UI:
- Parent dashboard: "Coming up" chip strip showing top 6 upcoming birthdays + holidays. Color-coded (🎂 emerald = own, 🎈 violet = classmate, 📅 amber = holiday).

Feature flag: `school_calendar` (default OFF).

### Phase 5 — Parent social groups ⏸ DEFERRED
Legal posture audit required before schema or code lands. Documented in `docs/handoffs/SCHOOL_ECOSYSTEM_PLAN.md`.

---

## 🚨 Migrations to run, in order

```sql
-- Phase 2 — Calendar
migrations/216_appointments.sql

-- Phase 3 — Newsletter (just flag registration)
migrations/217_principal_newsletter.sql

-- Phase 4 — Events
migrations/218_school_events.sql

-- Phase 6 — Calendar
migrations/220_school_calendar.sql
```

Each is idempotent (`IF NOT EXISTS` + `ON CONFLICT DO NOTHING`). Safe to re-run.

After running, verify each phase's flag is registered:

```sql
SELECT feature_key, default_enabled FROM montree_feature_definitions
WHERE feature_key IN ('appointments', 'principal_newsletter', 'school_events', 'school_calendar');
-- Expected: 4 rows, all default_enabled = false (opt-in per school).
```

---

## 🚨 To enable everything for Whale Class (one paste)

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled) VALUES
  ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'appointments', true),
  ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'principal_newsletter', true),
  ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'school_events', true),
  ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'school_calendar', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

(`parent_messaging` is already universal — flipped earlier today.)

---

## Verification walkthrough (after Railway settles)

### As principal (you, on Whale Class):

1. **Appointments availability** — open `/montree/admin/appointments`. Tap **+ Add window**. Set Monday 09:00–12:00, 30-min slots, 5-min buffer. Save. Confirm the row appears.
2. **Events** — open `/montree/admin/events`. Tap **+ New event**. Title "Parent open day", date next Saturday afternoon, scope = School-wide. Save. Confirm card appears with RSVP counters at 0/0/0.

### As a parent (log in with an existing Whale Class parent access code):

3. **Dashboard probe** — refresh `/montree/parent/dashboard`. Expect:
   - Calendar icon in header (appointments enabled)
   - Messages icon in header
   - "Upcoming events" section showing the Parent open day with **Yes / Maybe / No** RSVP buttons
   - "Coming up" section showing classmate birthdays from `date_of_birth` and any holidays
4. **Book an appointment** — tap Calendar icon → **Book a meeting** → pick yourself → pick the slot the principal just opened → write a subject → confirm. Expect:
   - Confirmation screen
   - Returning to the principal Communication tab, you should see a fresh **parent_principal** thread named "Meeting booked — [date]" with the booking summary as the first message.
5. **RSVP an event** — tap **Yes** on the Parent open day card. Expect emerald highlight, no error toast. Refresh the page; selection should persist.
6. **Announcement broadcast** — switch to principal, open Communication, **All Parents** tab → click **Compose** on any parent → send a "Welcome back" broadcast. Switch back to parent: dashboard refresh should surface the announcement as a gold banner above the Weekly Wrap report.

If you've also set `principal_newsletter=true`, the parent will additionally get a Resend email at their parent email (check the recipient's inbox or Resend dashboard).

---

## Architectural rules locked in (cumulative numbering from Session 114's #150)

151. **Slot computation is pure.** `lib/montree/appointments/slot-computer.ts` has no Supabase access, no I/O, no date-library dependency. Server fetches rules + blackouts + bookings, then calls this function.
152. **`shareXyzToThread` is the canonical "ecosystem object becomes a message" pattern.** First applied in Session 115 meeting notes, generalised in Session 115 appointments. Future Phase 4 RSVPs + Phase 6 calendar should use the same shape if/when they need to post to threads.
153. **Booking confirmations + reminders post to the existing parent_teacher/parent_principal thread**, NOT a dedicated appointment thread. The conversation stays unified.
154. **Race-safe slot booking.** `/api/montree/parent/appointments` POST re-computes open slots against the requested start time before INSERT — defends against UI lag + concurrent bookings.
155. **Reschedule = cancel + create.** Audit trail clean. Old row stays as `cancelled` with `cancelled_reason='rescheduled'`. New row references the same `thread_id`.
156. **Broadcast emails are fire-and-forget with bounded concurrency.** 5-worker pool. Failures NEVER block the in-app delivery.
157. **`montree_school_events.classroom_id IS NULL`** marks school-wide events. Set = classroom-scoped. Parents see school-wide + their child's classroom events.
158. **RSVPs are 1 per (event, parent)** via composite primary key. Re-RSVP overwrites via UPSERT.
159. **Birthdays computed live from `date_of_birth`** — no separate calendar storage. Privacy: classmates show first name only.
160. **Holidays live as JSONB** on `montree_schools.calendar_overrides`. Editable via SQL or future admin UI. No new table.
161. **Feature flags layered on top of feature flags** — appointments, principal_newsletter, school_events, school_calendar each independently flip per school. Schools opt into the parts of the ecosystem they want.

---

## Files changed this session (Phases 2-4 + 6)

**Migrations (new):**
- `migrations/216_appointments.sql`
- `migrations/217_principal_newsletter.sql`
- `migrations/218_school_events.sql`
- `migrations/220_school_calendar.sql`

**Libraries (new):**
- `lib/montree/appointments/types.ts`
- `lib/montree/appointments/slot-computer.ts`
- `lib/montree/appointments/share-to-thread.ts`
- `lib/montree/appointments/parent-access.ts`
- `lib/montree/events/parent-access.ts`

**Libraries (modified):**
- `lib/montree/features/types.ts` — 4 new feature keys
- `lib/montree/email.ts` — `sendAnnouncementEmail`

**API routes (new — 14 total):**
- `app/api/montree/appointments/availability/route.ts`
- `app/api/montree/appointments/availability/blackouts/route.ts`
- `app/api/montree/appointments/slots/route.ts`
- `app/api/montree/appointments/route.ts`
- `app/api/montree/appointments/[id]/route.ts`
- `app/api/montree/parent/appointments/route.ts`
- `app/api/montree/parent/appointments/[id]/route.ts`
- `app/api/montree/admin/events/route.ts`
- `app/api/montree/admin/events/[id]/route.ts`
- `app/api/montree/parent/events/route.ts`
- `app/api/montree/parent/events/[id]/rsvp/route.ts`
- `app/api/montree/parent/calendar/route.ts`

**API routes (modified):**
- `app/api/montree/messages/broadcast/route.ts` — added email push fan-out

**Components + pages (new):**
- `components/montree/appointments/AvailabilityEditor.tsx`
- `app/montree/dashboard/appointments/page.tsx`
- `app/montree/admin/appointments/page.tsx`
- `app/montree/admin/events/page.tsx`
- `app/montree/parent/appointments/page.tsx`

**Pages (modified):**
- `app/montree/admin/layout.tsx` — sidebar entries (Appointments, Events)
- `app/montree/parent/dashboard/page.tsx` — appointments icon, featured announcement banner, upcoming events feed, "Coming up" calendar feed
- `components/montree/DashboardHeader.tsx` — Appointments entry in More menu

---

## Cold-resume TL;DR

Session 115 compressed Phases 1, 2, 3, 4, and 6 of the school ecosystem plan into one day. Phase 5 (parent social groups) is deferred pending legal audit. Run migrations 216, 217, 218, 220 in Supabase to activate. Enable the four feature flags (`appointments`, `principal_newsletter`, `school_events`, `school_calendar`) per school via `montree_school_features`. The parent dashboard now surfaces a Calendar icon, an announcements banner, an Upcoming Events feed with inline RSVP, and a Coming Up birthday/holiday feed — all gated independently on their own feature flags. Schools without flags see no change. Whale Class can flip everything on in one SQL paste above.
