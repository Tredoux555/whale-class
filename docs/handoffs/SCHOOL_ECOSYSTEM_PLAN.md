# School-as-Ecosystem — Final Plan

**Session window:** May 17, 2026
**Audit input:** `SCHOOL_ECOSYSTEM_PLAN_DRAFTS.md` (3 plans: Calendar-first / Comms-extended / Big-bang)
**Decision:** Plan B Hybrid (comms-extended) with Plan A's calendar phasing preserved.
**Total runway:** 7-9 weeks of focused build, sequenced in 6 phases that each ship standalone value.

---

## Audit summary — why the hybrid wins

Stress-tested each plan against five axes:

| Axis | Plan A | Plan B | Plan C |
|---|---|---|---|
| Time to first user-visible ship | 3-4 weeks | **1-2 days** | 8-10 weeks |
| Total runway | 3-4 weeks | 4-6 weeks | 8-10 weeks |
| Schedule risk | Low | Medium | High |
| Competitive moat | Modest | Strong | Deepest |
| Pivot-ability mid-build | High | High | Low |
| Codebase fit (extends Session 97 + 115) | Medium | **Highest** | Medium |
| User's stated vision alignment | Partial | Strong | Strongest |

**Plan A** ships the headline feature fastest but leaves parent-principal comms unsurfaced. Schools that need direct messaging more than scheduling get a half-product.

**Plan C** is the right end-state but the 8-10 week silent runway is too long given that Montessori Compass 2.0 launched a competing "Growth Suite" recently. Architecture risk also climbs — unified-schema-first design rarely survives first contact with three real customers.

**Plan B Hybrid** wins because: (a) it lands a quick comms win in 1-2 days that immediately makes Montree feel more complete, (b) it then sequences the calendar (the open-whitespace differentiator) as the headline ship, (c) every phase reuses existing patterns (`montree_message_threads`, `shareMeetingNoteToThread`, feature flags), (d) every phase ships standalone — momentum stays intact even if a later phase slips.

The user's exact framing was *"build this step by step"* + *"schools are their own little contained ecosystem. Lets expand montree to match it."* Plan B Hybrid honours both.

---

## The 6-phase build sequence

Each phase ships and is verified before the next starts. Migrations are pre-allocated. Pricing tier per phase is locked.

### Phase 1 — Parent ↔ Principal Messaging Surface (1-2 days, Core tier)

**Why first:** Session 97 already shipped the schema (`parent_principal` thread type exists), AND Session 115 already built the principal-side message-posting plumbing. The work is mostly UI: parent dashboard entry, principal dashboard entry, fix the "compose new conversation with principal" flow. Cheapest possible competitive parity win.

**Scope:**
- Parent dashboard: "Message the principal" entry point
- Principal Communication tab: parent-thread filter already exists from Session 97; surface unread count prominently
- `verifyThreadAccess` already gates on `parent_principal` type for principal observer (Session 97 contract)
- Mobile UX: composer auto-focuses, send button always visible (apply the `100dvh` rule from Session 114)

**Architecture rules adopted:**
- All messaging stays in `montree_message_threads` + `montree_thread_messages`. No parallel schema.
- `parent_principal` thread CAN have child_id OR none — principal-school-wide queries don't need a child.

**Pricing:** Included in Core ($7/student/mo). Direct messaging is table stakes per research; gating it kills retention.

**Migration:** None needed. Schema exists.

### Phase 2 — Appointment Booking (Calendar) — 3-4 weeks, Pro tier

**Why second:** The single biggest open-whitespace feature. Zero direct Montessori competitor offers parent ↔ principal/teacher appointment booking. ParentSquare's K-12 conference scheduler is the closest reference. Cal.com's data model is the technical reference.

**Sub-phases (each ships standalone):**

**Phase 2.1 — Schema + Availability Editor (4-5 days)**
- Migration 216 (`montree_availability_rules`, `montree_appointment_slots`, `montree_appointments`)
- Staff-side UI (teacher + principal): set weekly recurring availability + ad-hoc blackouts + buffer minutes between meetings
- Three event types: Single-host, Collective (parent + principal + teacher all required), Round-robin (any classroom teacher)

**Phase 2.2 — Parent Booking Flow (4-5 days)**
- Parent dashboard: "Book a meeting" CTA
- Slot picker with intake form (subject + brief context)
- iCal export per parent
- Confirmation lands as a message in the existing `parent_teacher` or `parent_principal` thread (via the Session 115 `shareMeetingNoteToThread` pattern generalised to `shareAppointmentToThread`)

**Phase 2.3 — Reminders + Reschedule (3-4 days)**
- Workflow engine (cron-fired): T-24h reminder + T-1h reminder
- Parent-initiated reschedule (creates a new appointment, cancels old)
- Staff decline-with-reason

**Phase 2.4 — Multi-host (Collective + Round-robin) (4-5 days)**
- Cal.com Collective pattern: availability intersection across N required hosts
- Round-robin pool: parent picks "any classroom teacher", algorithm picks who has slots
- Doodle-style group poll fallback if no shared slot exists (deferred; flag in Phase 6 if demand)

**Architecture rules adopted:**
- Booking confirmations and reminders use the same `shareMeetingNoteToThread` infrastructure as the Session 115 meeting-notes share.
- Cal.com's data model concepts (Event Type, Time Block, Buffer, Booking) influence schema; implementation is owned, no external dep.
- iCal export lives behind one cached endpoint per user, tokenised URL (don't expose user_id directly).

**Pricing:** Pro tier ($7/student/mo Premium). Justifies the Pro upgrade vs. Core.

**Feature flag:** `appointments` (new). Default OFF. Schools opt in via super-admin or self-serve enable when on Pro.

**Migration:** 216 (appointments). Idempotent.

### Phase 3 — Principal Newsletter + Announcements (1-1.5 weeks, Pro tier)

**Why now:** With messaging + booking shipped, the principal has direct + structured comms. Newsletters fill the broadcast gap.

**Scope:**
- **Newsletter composer**: structured-template (NOT drag-drop in v1). Title, body, optional photo, optional CTA link.
- **Targeting**: school-wide / classroom-only / custom-group (uses Session 97's group infrastructure).
- **Delivery**: in-app notification + email (existing Resend) + push (future PWA work).
- **Read receipts**: count of parents who opened, not individual identity.
- **Announcements**: shorter sibling of newsletter — single paragraph, no CTA. Same targeting.
- **Frequency norms** surfaced as UX hints: weekly for teachers, bi-weekly for school-wide.

**Architecture rules adopted:**
- Newsletters + announcements stored in `montree_thread_messages` with a new `thread_type = 'broadcast'` (already exists per Session 97). The "thread" IS the newsletter; recipient list IS the broadcast scope resolved by `resolveBroadcastScope`.
- Read receipts via `montree_message_thread_participants.last_read_at` (already in schema).
- Auto-translate via existing Sonnet pipeline + `LOCALE_TO_*` infrastructure.

**Pricing:** Pro tier.

**Feature flag:** `principal_newsletter`. Default OFF.

**Migration:** 217 (only if read-receipt aggregation needs a denormalised view — likely no new schema, computed on read).

### Phase 4 — School Events + RSVPs (1 week, Pro tier)

**Why now:** Calendar primitive (Phase 2) already exists. Events are a different shape of the same primitive — staff-created instead of parent-created, school-wide instead of 1:1.

**Scope:**
- Staff creates an event (Open Day, Performance, Fundraiser). Subject, date/time, location, capacity (optional).
- Auto-RSVP UI on every parent's calendar feed: Accept / Decline / Maybe.
- **Signup conversion** (Bloomz pattern): toggle an event to also collect volunteer slots OR item donations. Per-slot deadline.
- iCal sync so parents fold school events into their personal calendar.
- Reminders: T-7d, T-1d for events with capacity.

**Architecture rules adopted:**
- Reuses Phase 2's appointment schema (`montree_appointments` extended with `appointment_kind = 'school_event'`), OR new `montree_school_events` table. Audit during build chooses.
- Capacity tracking: simple count, no waitlist in v1.

**Pricing:** Pro tier.

**Feature flag:** `school_events`. Default OFF.

**Migration:** 218 (events).

### Phase 5 — Parent Social Groups (1-2 weeks + legal audit, gated rollout)

**Why later:** Highest legal-exposure risk (parent-to-parent harassment, child-exposure concerns). Schedule a dedicated audit session BEFORE building — pull together: (a) jurisdictional review on parent-to-parent communication mediation in schools, (b) FERPA-equivalent posture for non-US markets, (c) moderation tooling that scales without principal becoming a full-time moderator.

**Scope (pending audit outcome):**
- ClassDojo Parent Chat pattern: **opt-in only**, per-classroom parent directory visible only to opt-ins.
- 1:1 parent ↔ parent DMs within same classroom.
- Group chat per classroom (parents + co-teachers + principal as observer).
- Reporting + blocking + mute baked in.
- Principal can disable any thread.
- Auto-moderation: profanity filter, image-NSFW detection (use existing photo identification pipeline).

**Architecture rules:**
- Uses Session 97 `montree_message_threads` with new `thread_type = 'parent_parent'` or `'parent_group'`.
- Auto-add principal as `is_observer=true` (transparency rule).
- Per-school feature flag + per-parent opt-in toggle (NOT auto-enrolled).

**Pricing:** Pro tier.

**Feature flag:** `parent_social_groups`. Default OFF. Per-school explicit super-admin enable.

**Migration:** 219 (CHECK constraint widening for new thread types, parent opt-in column).

### Phase 6 — Birthday + Holiday Calendar (2-3 days, included with Phase 2)

**Why last:** Lightest scope. Could land alongside Phase 2 if appetite. Listed last because it's a polish layer.

**Scope:**
- Auto-tag child birthdays from `montree_children.date_of_birth` (column exists).
- School holiday data per school config (JSON blob initially, dedicated table later if demand).
- Surfaces as cards on parent + staff dashboards: "Sarah turns 5 on Tuesday".
- iCal sync includes birthdays + holidays alongside appointments + events.

**Architecture rules:**
- No new schema for birthdays — already in `montree_children`.
- New `montree_school_calendar_overrides` JSON column on `montree_schools` for holidays (lightest possible storage).

**Pricing:** Included with Pro tier (no separate gate).

**Feature flag:** None — surfaces only when the school has appointments enabled.

**Migration:** 220 (school calendar overrides JSON column).

---

## Total build estimate

| Phase | Duration | Tier | Cumulative |
|---|---|---|---|
| 1 — Parent ↔ Principal messaging | 1-2 days | Core | 1-2 days |
| 2 — Appointment booking (4 sub-phases) | 3-4 weeks | Pro | ~4-5 weeks |
| 3 — Newsletter + Announcements | 1-1.5 weeks | Pro | ~5-6 weeks |
| 4 — School events + RSVPs | 1 week | Pro | ~6-7 weeks |
| 5 — Parent social groups | 1-2 weeks + audit | Pro | ~7-9 weeks |
| 6 — Birthday + holiday calendar | 2-3 days | Pro | ~7-9 weeks (overlaps Phase 2) |

**Total: 7-9 weeks of focused build, ~5 milestones each shipping standalone value.**

---

## Architectural rules locked in (apply to every phase)

These rules generalise from Sessions 97, 114, 115, and the ecosystem build:

1. **Single source of truth for messaging** — `montree_message_threads` + `montree_thread_messages` is THE thread infrastructure. New ecosystem objects (bookings, events, newsletters, parent groups, RSVPs) plug into it as thread types or message kinds. NEVER a parallel schema.
2. **`shareXyzToThread` is the canonical pattern for "ecosystem object becomes a message".** Mirror `shareMeetingNoteToThread` from Session 115. Idempotent via the source object's `shared_to_thread_id` column.
3. **Feature flag every ecosystem surface.** One `montree_feature_definitions` row per surface (`parent_messaging`, `appointments`, `principal_newsletter`, `school_events`, `parent_social_groups`). Default OFF. School opts in.
4. **Cross-pollination filter on every query.** Every Supabase read filters by `school_id`. Every write verifies the foreign keys belong to the calling user's school.
5. **Audio NEVER persisted** (Session 114). Any voice-input feature follows the Whisper → discard pattern.
6. **Consent banner mandatory** on any recording / data-capture surface.
7. **Pricing tier resolution** via `resolveReportModel()`. Free returns 402 with `requires_upgrade: true`. Core/Pro pass through.
8. **iCal exports use tokenised URLs**, not user-id-bearing URLs. Token rotates on user logout.
9. **i18n from day 1.** Use `npm run i18n:fill-ui` for new keys. No English-only ship.
10. **Mobile-first sizing.** 16px input font (iOS zoom prevention), 44pt tap targets, `100dvh` not `100vh` for scrollable popovers.
11. **`navigator.onLine` for connectivity hints, `montreeApi()` auto-retry for reliability.** Don't gate functionality on `navigator.onLine` — it's UI hint only.
12. **Principal auto-observed on parent threads** for transparency (Session 97 rule). Extends to broadcast scope: principal can read any thread in their school.
13. **Service worker stays narrow-intercept** (Session 84 rule). Don't cache HTML or API responses; cache static assets only.
14. **Web Vitals on every new surface.** `<WebVitalsReporter />` auto-tags route; nothing extra needed.

---

## Open questions resolved by this plan

From the draft phase:

1. **Pro tier pricing — does it stay at $7?** Yes. Compass 2.0's Growth Suite launched without raising base price. Montree's competitive angle is depth (Tracy, Mira, meeting notes, ecosystem) at the same price, not premium pricing.
2. **Calendar shape — own implementation vs. Cal.com embed?** **Own implementation.** Cal.com's data model concepts are the reference but the dependency cost (auth federation, theme override, billing relationship) exceeds the build savings.
3. **Parent social groups timing?** Phase 5 — after calendar + newsletter ship. Legal audit gates the start.
4. **Newsletter design — drag-drop vs. structured-template?** **Structured-template for v1.** Drag-drop is a future polish phase.
5. **Free-tier reach — direct messaging in Free?** **Yes, in Core (not Free).** Direct messaging is table stakes per research; locking it out of Core kills retention. Free remains for evaluation only.

---

## Pricing implications (cumulative)

| Tier | Today | After all 6 phases ship |
|---|---|---|
| **Free** ($0) | Photo identification only | Photo identification + Tracy/Mira preview |
| **Core** ($7/student/mo) | Above + meeting notes + photo ID + weekly wraps (Haiku) | Above + **parent ↔ principal messaging** |
| **Pro** ($7/student/mo Premium) | Above + Sonnet AI + Tracy/Mira full | Above + **appointments + newsletter + events + social groups + birthday calendar** |

The Pro upgrade story: "Same $7 price as Core, plus the full school ecosystem and the Sonnet AI."

---

## What's deferred / out of scope

(Same as the drafts doc; restated for completeness.)

- Tuition billing — not Montree's revenue model.
- Staff scheduling, payroll calendar, leave tracking — operator-tier feature for a future product surface.
- Health/medication tracking — regulatory complexity.
- SIS / Veracross / PowerSchool integrations — Toddle's K-12 territory.
- Drag-drop newsletter composer — v2 of newsletters.
- Doodle-style group-poll fallback — flagged for Phase 6+ if booking demand surfaces it.
- Waitlist + ticketing for events — v2 of events.

---

## Cold-resume TL;DR

If you're picking this up cold: **build in 6 phases over 7-9 weeks.** Phase 1 ships parent ↔ principal messaging in 1-2 days using the schema that's already there (Session 97 + 115). Phase 2 ships the headline-feature calendar in 3-4 weeks, owned implementation modeled on Cal.com. Phases 3-6 layer newsletters, events, parent social groups, and birthday calendar onto the same `montree_message_threads` infrastructure. Every phase reuses the `shareXyzToThread` pattern from Session 115's meeting-notes share. Every surface gates on a feature flag, default OFF. Plan B Hybrid wins on speed-to-first-ship + lowest architecture risk + best alignment with Tredoux's vision *"schools are their own little contained ecosystem."*

Migrations to allocate: 216 (appointments), 217 (newsletter — likely none), 218 (events), 219 (parent social groups), 220 (school calendar overrides). All idempotent.

Next session opens with Phase 1.
