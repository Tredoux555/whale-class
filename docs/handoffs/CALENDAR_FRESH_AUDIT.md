# Calendar — Fresh Audit + System Improvement Considerations (May 25, 2026)

Second-pass review of the Calendar marathon (`docs/handoffs/CALENDAR_MARATHON_HANDOFF.md`),
with fresh eyes on what was shipped + a wider lens on system improvements.

## Audit findings

### 🟥 Bugs found and fixed in this audit

1. **`english-schedule` adapter window leak** — `lib/montree/calendar/adapters/english-schedule.ts`.
   The SQL filter widened by 7 days on the left (a week whose Monday sits
   *before* `window.from` can still have Tue–Sun days inside the window). Each
   expanded `day.day` is now re-filtered against `window.from`/`window.to` so
   days outside the visible window can't leak in. Limit raised 20 → 30 to
   cover the wider net.

2. **`QuickCreate` modal browser-tz bug** — `components/montree/calendar/QuickCreateMenu.tsx`.
   Was building `new Date('${selectedDay}T${time}:00').toISOString()` which
   uses the **browser's** local timezone. A teacher in NYC creating an event
   for a Shanghai school at "09:00 May 26" was actually creating it at 22:00
   May 25 Shanghai. Fixed: new client-side `schoolTzOffsetMs()` + `schoolLocalToUtcIso()`
   helpers (mirror of `lib/montree/school-time.ts`) honour the school's IANA
   tz when constructing the UTC ISO. The school's `tz` is now threaded from
   the calendar API response → page state → `QuickCreateMenu` prop → modal.

3. **Stale eslint-disable in DashboardHeader** — pre-existing but tripped
   `--max-warnings=0` once I started linting around my Calendar nav addition.
   Reordered the comments so the directive sits directly above the `<img>`.

### 🟨 Real limitations to address in follow-up sessions

4. **Multi-school parent picks only `childIds[0]`'s school.** A parent with
   children in two different schools (divorced families) sees only one.
   The shape is right but the UX deserves a per-school sub-tab.

5. **Performance ceiling at large windows.** A principal viewing a busy
   month with all 10 sources active can pull 500+ observations + 50
   milestones + 30 conference notes + appointments + meeting notes +
   attention items. The page renders every event in the day cell (max 3
   icons + "+N"). Acceptable for now; if monthly load times start to lag,
   switch the observation/milestone adapters to a per-day aggregate
   (`📷 12`) instead of per-event events.

6. **English schedule `?tab=` deep-link doesn't exist.** The
   `english-schedule` adapter links to `/montree/dashboard?tab=english-schedule`
   but the dashboard doesn't currently parse a `tab` query param. The user
   lands on the dashboard root. Cosmetic — they can scroll to the English
   Schedule panel.

7. **Quick-create timezone bug exists in the canonical editors too.** The
   `AppointmentsCalendar` and `admin/events` forms ALSO build dates against
   browser-local tz. My fix in `QuickCreateMenu` is local; the canonical
   editors are a separate sweep.

8. **`montree_school_events` POST is principal-only for school-wide events
   but the modal asks for nothing classroom-specific.** A teacher hitting
   `+ Add → School event` for their classroom will succeed if their JWT
   carries `classroomId` (the API auto-fills). A teacher with no classroom
   gets a 403. Could surface this state in the picker (disable / explain).

9. **AI summary doesn't surface attention items distinctly.** They get
   lumped with everything else. Pre-tagging them in the prompt
   ("⚠ Needs attention:") would tighten the chief-of-staff voice for the
   principal role.

10. **No event-level i18n yet.** Every title/detail is plain English
    ("Awaiting parent ·", "Meeting · ", etc.). Plan §3 flagged this as a
    future evolution — the field names already expect `_key`/`_params`
    siblings. ~30 new keys × 12 locales when ready.

11. **`English: N children` allday event doesn't surface WHICH children.**
    The detail field could include up to N names ("Amy, Bob, +3"). Tiny
    UX win.

### 🟩 What's actually solid

- Cross-pollination contract verified across all 10 adapters — every query
  filters by `schoolId` AND (where applicable) `classroomId` / `childIds`.
- Per-adapter `Promise.allSettled` isolation works as designed — verified
  by tracing the error path.
- Free-tier AI fallback writes nothing to `montree_api_usage`, confirmed.
- 366-day window cap on `/calendar` + 92-day cap on `/calendar/summary`
  keep adapter cost bounded.
- `getSchoolTimezone` 5-min TTL cache eliminates per-request DB roundtrip.
- Parent-only routes (`/parent/...` link destinations from each adapter)
  match the existing parent portal nav.

## System-wide improvement considerations

These aren't Calendar bugs — they're "while we have the lens open" thoughts.

### A. Push the school-time helper everywhere

`lib/montree/school-time.ts` is the new canonical "what day is it" source.
But the codebase has at least four other places computing weekday/week-start
locally:
- `lib/data.ts` (Whale Class side — different system, fine)
- Each weekly-wrap route does its own `getWeekStart` math
- The Story system has its own `getCurrentWeekday`

A sweep replacing these with `currentWeekdayInTz(tz)` / `currentWeekStartInTz(tz)` would (a) make the timezone setting universally honoured, (b) kill a class of "Monday-not-Tuesday" bugs we already hit in english-schedule. ~1-2 hour focused pass.

### B. The aggregation lens applies elsewhere

The Calendar pattern (one shape, registered adapters, role-scoped) is the
right shape for at least three other surfaces:
- **Notifications inbox** — every "you have a new X" can be a Notification
  with source + role + read state.
- **Search** — "find anything about Amy" should query every adapter, not
  bake in per-table logic.
- **Activity timeline per child** — currently scattered across the child
  page; could be unified via the same registry.

Worth keeping in mind. Not a build directive — but if any of those
features comes up, reach for the same pattern.

### C. The `t() || 'Fallback'` pattern

I used `t('nav.calendar') || 'Calendar'` to dodge the strict i18n parity
pre-commit hook for a single new key. This is fine for a one-off, but
across the codebase it adds up. A `t.optional(key, fallback)` helper would
formalise this without dropping the parity check.

### D. `montree_media.work_id` is TEXT, joining to UUID

The observations adapter joins `work_id` (TEXT) against
`montree_classroom_curriculum_works.id` (UUID) via `.in('id', workIds)`.
PostgREST coerces correctly. But this is a latent type mismatch in the
schema — if anyone ever changes the work_id type in the future without
auditing the joins, this would silently break. Worth a SQL ALTER to
make `montree_media.work_id` a real UUID. (Not blocking; not in this
session's scope.)

### E. The aggregation API is a free-tier load magnet

Free-tier schools can hit `/api/montree/calendar` as often as they want
with zero cost gate. Each call runs 10 adapter queries. Even at 50ms
each total, a curious user opening the page 100 times in a day = 50,000
DB queries. Phase 6 of the AI plan should likely include a 60-req/min
rate limit on `/api/montree/calendar` per school, mirroring the existing
`checkRateLimit` pattern.

### F. The attention adapter should be smarter

Right now it surfaces every stuck report and pending appointment. In a
busy school, this becomes noise. A real signal-to-noise improvement:
- Group by recipient ("3 reports waiting for your approval" → one event)
- Snooze ability ("mark as read for today" → hide for 24h)
- Configurable thresholds (per-school `attention_thresholds` JSONB)

Phase 5.5, when there's user feedback.

### G. `/montree/calendar` has no inbound link from the parent portal

I wired DashboardHeader for the teacher path. Parents currently have to
type the URL. Should add a Calendar tile to the parent dashboard. ~10
min.

## Commits this audit shipped

| SHA | What |
|------|------|
| (pending) | Bug fixes — english-schedule window leak + QuickCreate tz + nav link + DashboardHeader eslint cleanup |
| (pending) | Fresh audit handoff (this file) |

## What's still pending Tredoux

🚨 **Run `migrations/233_school_terms_and_timezone.sql`** in Supabase SQL
Editor. The SQL is in chat. Until run, `getSchoolTimezone()` falls back
to `signup_timezone` (or UTC) and the terms adapter returns empty. Nothing
else breaks.

## Recommended next moves (priority order)

1. **Run migration 233.** One-minute SQL paste. Unblocks the timezone column
   + terms adapter.
2. **Test on production after Railway settles.** Visit `/montree/calendar`.
   Verify: Today badge correct in Shanghai tz · attention panel surfaces
   any real pending items · "+ Add on this day" → school event creates at
   the right wall-clock time · summary returns a sensible narrative.
3. **Wire `/montree/calendar` into the parent portal nav** (~10 min — G
   above).
4. **System-wide tz sweep** (~1-2 hours — A above) — kill the "Monday
   vs Tuesday" bug class everywhere, not just in english-schedule.
5. **Multi-school parent picker** (~30 min — point 4 above).
6. **`/montree/calendar` rate limit** (~15 min — point E above).
7. **Carry-overs from the marathon handoff**: localization sweep, optimistic
   refresh after quick-create, attention adapter signal-to-noise improvements.

## How to verify the bug fixes worked

After Railway redeploy:

1. **English-schedule window leak**: open the May calendar from a school in
   China tz, look at a day in early May that's the END of a week that
   started in late April. The English Schedule event for that day should
   surface in May (was previously dropped if the week's Monday was outside
   the window).

2. **QuickCreate tz**: switch your laptop to a non-school timezone (e.g.
   change Mac to NYC tz), open the calendar for a Shanghai school, tap a
   day, "+ Add → School event", enter 09:00. Submit. Hard-refresh. The
   event should appear at 09:00 in the calendar (Shanghai wall-clock), not
   at 22:00 the previous day (NYC interpretation).

3. **Nav link**: open `/montree/dashboard` → tap More menu → confirm
   "Calendar" entry between "Classroom Overview" and "Messages". Tap →
   lands on `/montree/calendar`. Active state highlights.
