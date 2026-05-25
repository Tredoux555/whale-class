# Montree Calendar — Master Plan

> Status: **THEORY / PLAN ONLY. No code yet.**
> Method: research → plan → audit → fresh plan → audit → consolidate → audit master.
> This document is the consolidated, audited master plan.

---

## 0. The vision, stated plainly

Montree today is a photo-driven Montessori observation tool. The destination is a
**school operating system** — the place a school, its teachers, its parents and its
principal run the week. The **calendar is the spine** of that system: the one surface
that keeps track of, and summarises, everything that happens in time.

"Everything" is not a vague word. It is a finite, knowable list of things that happen
on dates. The whole plan rests on naming that list and connecting each item once.

---

## 1. The one decision everything hangs on

**The calendar is an aggregation lens, not a mega-table.**

The naive build is a `calendar_events` table that every feature writes into. That forces
every existing feature — appointments, photos, reports, billing, the English schedule —
to dual-write, across 230+ migrations of settled schema. High churn, high risk, slow,
and it rots: the day a feature forgets to dual-write, the calendar silently lies.

Instead: the calendar is a **read-time projection**. A calendar API queries the tables
that already exist, and each kind of dated thing has a small **adapter** that maps its
rows into one common shape. Nothing existing changes. Adding a new thing to the calendar
is one new adapter — additive, isolated, testable.

**Hybrid, precisely** (corrected after the §2 audit — most "first-class" stores already exist):

- **Projected sources** (most things) — appointments, reports, observations, the English
  schedule, attendance, billing dates, milestones — are *read* by adapters. Never copied.
- **Already-existing first-class stores** — events (staff meetings, field trips,
  performances) live in `montree_school_events` (mig 218, a real table with RSVPs).
  Holidays live in `montree_schools.calendar_overrides` (mig 220, JSONB). Neither needs
  to be built — they need *adapters*.
- **The one possibly-new table** — `montree_calendar_entries` — would hold only the
  genuinely homeless: a teacher's ad-hoc text note pinned to a day ("permission slips
  due"). Even this may prove unnecessary if `montree_school_events` is loosened to
  accept a no-RSVP "note" event kind. Decide in Phase 0 with the schema in hand.

So: **0–1 new tables**, ~0 changes to existing tables, N adapters.

---

## 2. What already exists (must be unified, not duplicated)

Sessions 115–117 already built calendar-shaped pieces. They are **scattered and partly
unused**. The plan's first job is to take inventory and unify — building a second,
parallel calendar would be the worst outcome.

| Asset | State | Plan's verdict |
|---|---|---|
| `montree_appointments` (mig 216) | **Live, in use** — parent–teacher meetings, Agora video calls | Becomes the `appointments` adapter. Keep as-is. |
| `AppointmentsCalendar.tsx` (Session 117) | Month-grid UI, mobile-aware, dark-forest themed | **The seed of the calendar UI.** Grow it; do not rebuild. |
| `montree_school_events` (mig 218) | **Real, complete events store** — `id, school_id, classroom_id, created_by_*, title, description, start_at, end_at, location, capacity, is_published, cancelled_at, cancelled_reason` + `montree_school_event_rsvps` + a `school_events` feature flag + `/events` routes | This **is** the events table. It becomes the `school_event` adapter's source. **Do not absorb it.** |
| Holidays — `montree_schools.calendar_overrides` (mig 220) | **Already the holiday model** — a JSONB array `[{date,label,is_closed}]` on the schools row. *Not* a separate table (the plan's earlier "`montree_school_calendar` table" was wrong). | Holidays already exist. The calendar + bingo scheduler read this JSONB. No holiday table to build. |
| `montree_events` / `montree_event_attendance` (mig 142, 145) | Tables exist — special events + attendance | Attendance is a **missed source** — added to §4. Audit `montree_events` for overlap with `school_events`; likely retire. |
| `montree_english_schedule` | **Live, but has NO migration file** — created ad-hoc via the Supabase editor | Tech debt. Before building its adapter, write a retroactive migration so the schema is reproducible. |
| `app/api/montree/parent/calendar`, `/admin/events`, `/events`, `/parent/events` | Routes exist, partial | Consolidate behind the one calendar API (§10). |
| `montree_appointments` columns | `scheduled_start` / `scheduled_end` (not `start`/`end`); availability rules already carry an IANA `timezone` | The appointments adapter maps `scheduled_*` → `start`/`end`. Note: a timezone primitive already exists here — see §7a. |

**Action for Phase 0:** the column-level audit above is now largely done (it was done by
the independent audit of this plan). What remains for Phase 0 is the *decision*: keep
`montree_school_events` as the events store (recommended), and decide whether
`montree_calendar_entries` is needed at all or whether a "note" event-kind on
`montree_school_events` covers ad-hoc entries.

---

## 3. The CalendarEvent model

Every adapter maps its rows into this single normalized shape. This contract is the
heart of the system — get it right and everything else is mechanical.

```
CalendarEvent {
  id            string          // stable, source-prefixed: "appt:<uuid>", "report:<uuid>"
  source        CalendarSource  // see §4
  kind          'point' | 'span' | 'allday' | 'attention'
  start         ISO timestamp
  end           ISO timestamp | null   // for span/allday
  // 🚨 i18n — Montree runs in 12 locales. Adapters MUST NOT emit English
  // strings. They emit a translation key + params; the client renders via
  // the existing useI18n() / t() system. (Child names, work names etc.
  // pass through as params.)
  title_key     string          // e.g. 'calendar.event.appointment'
  title_params  Record<string,string>  // e.g. { childName: 'Emma' }
  detail_key    string | null
  detail_params Record<string,string>
  status        'planned' | 'done' | 'missed' | 'cancelled' | 'info'
  link          string | null   // where tapping it goes (deep link)
  icon          string          // a small visual token
  accent        string          // colour family per source
  // scoping — the cross-pollination contract:
  school_id     string
  classroom_id  string | null
  child_id      string | null
  visibility    'school' | 'classroom' | 'child' | 'staff' | 'private'
}
```

Four `kind`s, and they matter:

- **point** — a thing at a time (3pm meeting).
- **span** — a thing across days (a field-trip week, a term).
- **allday** — a holiday, a "Weekly Wrap is due" day.
- **attention** — *not scheduled by anyone* — a derived flag that needs the principal's
  eye *on a given day*: "trial ends in 3 days", "12 photos await audit", "Sarah hasn't
  logged in for 5 days". This is the idea most calendars miss (see §6).

`status` carries the **plan-vs-record duality** (see §5): a future meeting is `planned`;
once it happened it is `done` or `missed`.

---

## 4. The sources — the finite list of "everything"

Each is one adapter: `adapter(window, scope) → CalendarEvent[]`. Bounded query, no
all-time scans.

| Source | Reads from | Contributes | Kind |
|---|---|---|---|
| `appointments` | `montree_appointments` | parent–teacher meetings, video calls | point |
| `school_event` | `montree_calendar_entries` / `school_events` | holidays, performances, field trips, staff meetings | allday / span / point |
| `report` | `montree_weekly_reports` | "Weekly Wrap ready" / "due" per child or class | allday |
| `observation` | `montree_media` (`captured_at`, `teacher_confirmed`) | per-child photo/activity density — *what happened* | allday (record) |
| `english_schedule` | `montree_english_schedule` + live recompute | the weekly bingo plan + who's ticked off | allday (plan+record) |
| `milestone` | child progress / milestones | a child reached a milestone | point (record) |
| `meeting_note` | `montree_meeting_notes` | a recorded parent/teacher conversation | point (record) |
| `attendance` | `montree_event_attendance` (mig 145) + `/api/montree/attendance` | daily attendance — present / absent counts | allday (record) |
| `conference_note` | conference notes (mig 155) | dated parent-conference artifacts | point (record) |
| `raz` | RAZ reading (mig 134/137) | a child's reading-level events | point (record) |
| `billing` | `montree_schools` (`trial_ends_at`, `next_invoice_due_at`, `current_period_end`) | trial ending, invoice due — principal/super-admin only | allday / attention |
| `super_admin` | agent payouts (mig 198), recurring op-expenses (mig 199) | super-admin-only operational dates | allday |
| `term` | `montree_school_terms` (NEW — see §7) | term start/end, academic-year shape | span |
| `attention` | computed (idle teachers, audit backlog, stale classrooms, un-reviewed weeks) | things needing the principal *now* | attention |
| `manual` | `montree_calendar_entries` (NEW, *if needed*) or a "note" kind on `montree_school_events` | anything a teacher/principal types onto a day | any |

(`attendance`, `conference_note`, `raz`, `super_admin` were added after the
independent audit found them. They are later-phase sources, but the model already
holds them — that is the point of §1.)

Phasing decides the *order* these come online (§12). The model does not change as
sources are added — that is the payoff of §1.

---

## 5. Two modes on every day: Plan and Record

A school calendar is not only "what's scheduled." It is equally "what happened." The
English-schedule rebuild we just shipped already lives this: a day cell shows the plan
(undone children) *and* the record (children ticked off on the day they actually did it).

The calendar generalises that. Every day cell has two strata:

- **Plan** (forward-looking): appointments to come, the bingo plan, reports due.
- **Record** (backward-looking): observations that happened, meetings that occurred,
  milestones reached, who was ticked off.

Past days are an **immutable record**. Future days are an **editable plan**. Today is
the seam. This duality is a first-class concept, not an afterthought — it is what makes
the calendar "keep track of everything," not just "list appointments."

---

## 6. Role-scoped calendars — different events, not just a filter

A parent's calendar and a principal's calendar are **not the same events filtered**.
They are partly different *sources*. This is the second idea most calendars miss.

- **Parent** — their child only. Appointments for their child, school events, "report
  ready", their child's observation days, milestones. Warm, sparse, reassuring.
- **Teacher** — their classroom. The English/bingo plan, weekly-wrap due, their
  appointments, school events, observation density across their children.
- **Principal** — the whole school, aggregated. Everything above for every classroom,
  **plus the `attention` source**: idle teachers, audit backlog, stale classrooms,
  trial/billing dates. The principal's calendar is a *cockpit*, not a diary — it
  surfaces problems *on the day they matter*.
- **Super-admin** — across schools: billing cycles, trials ending, agent activity.
  A different, lighter calendar.

Every adapter scopes by role at query time — the same cross-pollination contract that
governs the rest of the app. The calendar API resolves the caller's role and only ever
runs the adapters that role is allowed, scoped to their `school_id` / `classroom_id` /
`child_id`. No event of a child crosses to a parent who isn't theirs.

---

## 7. Foundations that MUST come first (Phase 0)

Three things are missing today and *everything* calendar-shaped silently needs them.
They are unglamorous and they are non-negotiable.

### 7a. School timezone — make it first-class

The server is UTC; schools are not. We just hit this twice — the English schedule
showed the wrong day, and the activity tracker couldn't define "this term." Today the
fix is a hardcoded `UTC+8`. That does not survive a second school.

`montree_schools` has `signup_timezone` (captured once, at signup) — a starting value,
not an authority. **Add an explicit `timezone` setting** (IANA name, e.g.
`Asia/Shanghai`), surfaced in school settings, defaulting from `signup_timezone`. Every
"what day / what week" computation in the app routes through one helper that reads it.
Without this, the calendar is wrong by up to a day for every non-UTC school, forever.

Precedent exists — appointment availability rules in `montree_appointments` already
carry a per-rule IANA timezone. Phase 0 promotes one authoritative value to the school
level so the whole app shares it (and retires the hardcoded `UTC+8` from the recent
English-schedule fix).

### 7b. Terms / academic year — the missing backbone

There is **no term model**. "Term reports", "semester reports", "this term's activity"
all exist as features with nowhere to anchor. A calendar that summarises "everything"
needs to know where a term starts and ends.

**New table `montree_school_terms`** — `id, school_id, name, start_date, end_date`.
Small, simple. It unlocks far more than the calendar: term reports get real boundaries,
the activity tracker gets a real "this term", the academic-year view becomes possible,
and weekly summaries can say "week 6 of 12". This is the highest-leverage item in the
whole plan — a tiny table that several half-finished features have been quietly missing.

### 7c. Holidays / non-teaching days — already modelled

A school week is not always Mon–Fri. The independent audit found this is **already
solved**: mig 220 added `montree_schools.calendar_overrides`, a JSONB array of
`[{date, label, is_closed}]`. So the holiday model exists; it is just under-used.

The remaining work is *consumption*, not modelling: the English bingo scheduler still
assumes five teaching days every week, and "this week" computations ignore closures.
The calendar's `school_event` adapter surfaces these JSONB entries as `allday` events,
and the bingo scheduler should read `calendar_overrides` to skip closed days. No new
table. (If the JSONB ever proves too thin — e.g. half-days needed — promote it to a
table then; not now.)

**So Phase 0 shrinks.** Holidays are done. The §2 unification audit is done (by the
audit of this plan). Phase 0's real, irreducible content is just **7a (timezone) +
7b (the terms table)** — two small, foundational things. It ships no calendar UI, but
nothing above it is correct without those two.

---

## 8. The calendar ↔ AI loop (the "summarising everything")

The calendar produces a clean, structured stream of `CalendarEvent`s for any window
and role. That stream is the perfect substrate for Montree's existing AI:

- **Tracy** (principal chief-of-staff) reads the school's week/month of events and
  produces the operational summary — "here's your week", "here's what slipped".
- **Guru** (teacher's per-child intelligence) reads a child's calendar slice for the
  warm narrative the parent sees.

The summary is **cheap** (Haiku for the digest), **on-demand**, and **cached** per
(role, scope, window). It can also be **proactive** — a Monday-morning "here's your
week" pushed via the existing scheduled-tasks + Web Push rails.

And it is **bidirectional**: Tracy can *write* to the calendar — "schedule a parent
meeting Thursday" becomes a `montree_appointments` row (or a `montree_calendar_entries`
row) that immediately appears as a calendar event. The calendar is the shared surface
the AI and the human both act on.

Crucially: the calendar does **not** replace the Weekly Wrap. The Weekly Wrap is a
per-child parent narrative. The calendar's week-summary is operational and whole-school.
They complement; they must not duplicate.

---

## 9. Reminders & notifications

"Keeping track" implies nudges: "meeting in 1 hour", "Weekly Wrap due tomorrow",
"trial ends Friday". The rails exist — scheduled-tasks, and Web Push (built for Story).
Reminders are a later phase, but the model anticipates them: any `CalendarEvent` with a
future `start` is a potential reminder; a per-user reminder-preferences setting decides
which fire. Named here so the model doesn't have to be reworked for it later.

---

## 10. Architecture & performance

- **One calendar API** — `GET /api/montree/calendar?from=&to=&scope=` — resolves the
  caller's role, runs the permitted adapters in parallel (`Promise.all`), merges, sorts,
  returns. Always windowed (a month at a time); **never** an all-time scan.
- **Adapters are pure and bounded** — each is `(window, scope) → CalendarEvent[]`, one
  bounded query. New source = new adapter file. No adapter knows about another.
- **Caching — two regimes, because not every source is row-backed:**
  - *Row-backed sources* (appointments, events, reports, meeting notes) — cache per
    (role, scope, month); invalidate via the existing `invalidate*` pattern when a row
    mutates.
  - *Computed sources* (`attention`, `english_schedule`, observation density) — there
    is **no row to hook an `invalidate*` onto**. These use a **short TTL** (e.g. 60s)
    instead. The audit flagged that the plan can't pretend these invalidate cleanly —
    they don't, and that's fine: short-TTL is the honest answer.
- **The UI** evolves `AppointmentsCalendar.tsx` — it already has the month grid, the
  per-day detail panel, mobile handling, and the dark-forest theme. Appointments become
  one source rendered in it; the component is renamed/generalised, not rebuilt.

---

## 11. Mobile

The app is PWA-mobile-first. A 7-column month grid is cramped on a phone.

- **Desktop** — month grid.
- **Mobile** — an **agenda/list** view by default (today and the days ahead as a
  scrollable list), with the grid available as a compact month-picker. `AppointmentsCalendar`
  already learned some of this (Session 117 mobile auto-scroll); extend that instinct.

The day a teacher opens on her phone should answer one question instantly: *what is on,
today and next?*

---

## 12. Phasing — each phase ships standalone and is useful

| Phase | Scope | Ships |
|---|---|---|
| **0 — Foundations** | Just two things: the school `timezone` setting (7a) + the `montree_school_terms` table (7b). Holidays already exist (7c); the unification audit is already done (§2). No calendar UI. | Correct day/week/term everywhere; term boundaries. Small, fast. |
| **1 — Read-only calendar, 2 sources** | The calendar API + `CalendarEvent` model (i18n keys, §3) + adapters for `appointments` and `school_event`. Generalise `AppointmentsCalendar` into the calendar view. Role scoping — **single-classroom / homeschool degradation is a Phase 1 acceptance criterion, not a deferred question.** | A real calendar the teacher/parent/principal can open and read. Proves the adapter pattern end to end. |
| **2 — More sources** | Adapters for `report`, `observation`, `english_schedule`, `milestone`, `meeting_note`, `term`. | The calendar now reflects what *happened*, not just what's booked — the plan/record duality (§5) is live. |
| **3 — Write-back** | Tap a day → add an appointment / event / manual entry. `montree_calendar_entries`. | The calendar becomes a tool you *manage from*, not just read. |
| **4 — AI summarisation** | The calendar → Tracy/Guru summary loop (§8). "Summarise my week/month." Optional proactive Monday digest. | "The calendar that summarises everything." |
| **5 — Calendar as home + management surfaces** | The `attention` source; billing/term overlays; the calendar becomes a candidate home surface. Management domains (attendance, staff scheduling) hang off it. | Montree is a time-organised school OS. |

Phases 0–1 are the spine. 2–5 are growth. Stop after any phase and what shipped is
still coherent and useful.

---

## 13. Risks & open questions

- **The §2 unification.** If the Session 115–117 tables are half-built or inconsistent,
  Phase 0 is bigger than it looks. Mitigation: Phase 0 *starts* with the audit; scope
  the rest once the schema is known.
- **Recurrence.** Calendars classically drown in recurring-event logic (RRULE). Montree
  mostly dodges this — the English schedule is *generated* weekly, not recurring; terms
  and holidays are explicit date rows. **Decision: no recurrence engine in v1.** If a
  recurring staff meeting is wanted later, generate instances, don't store a rule.
- **Performance at scale.** Many adapters × many children could be slow. Mitigation:
  hard month-windowing, parallel adapters, per-(role,scope,month) caching.
- **Naming.** "Calendar" for users (everyone understands it). "Timeline aggregator"
  internally. Don't expose the internal term.
- **Scope creep into a management app.** "School management" is enormous. The calendar
  is the *spine*; attendance/staff-scheduling/etc. are separate domains that *hang off*
  it. The plan deliberately stops at Phase 5 sketching that — it does not try to build
  it.
- **Open question — does the calendar replace the principal "Today" cockpit?** The
  Today page and the calendar's `attention` source overlap. Likely the calendar's
  "today" view *becomes* the cockpit. Decide in Phase 5, not now.
- **Resolved (was open) — homeschool / single-classroom schools.** Role-scoping
  degradation is now a **Phase 1 acceptance criterion** (§12): when a school is one
  classroom and the teacher is also the principal, the calendar collapses the role
  layers gracefully — it must not show an empty "principal" view or a duplicated one.
- **i18n — addressed in §3.** `CalendarEvent` carries translation keys + params, never
  English strings; this was missing from the first draft and is now a model constraint.

---

## 14. What NOT to do

- Do **not** build a `calendar_events` mega-table that everything dual-writes to (§1).
- Do **not** build a second calendar UI — evolve `AppointmentsCalendar` (§2, §10).
- Do **not** build a recurrence engine (§13).
- Do **not** start Phase 1 before Phase 0's foundations + unification audit.
- Do **not** let the calendar duplicate the Weekly Wrap (§8).
- Do **not** hardcode timezone or term boundaries ever again (§7).
- Do **not** treat the calendar as code-first — it is theory-first; this doc, then
  build phase by phase.

---

## 15. The single highest-leverage move

If only one thing is done from this plan, do **Phase 0** — specifically the
`montree_school_terms` table and the explicit school `timezone`. They are tiny. They
are quietly required by features that already exist and are subtly broken without them.
And they are the soil the entire calendar grows in. Everything else is additive once
the ground is true.
