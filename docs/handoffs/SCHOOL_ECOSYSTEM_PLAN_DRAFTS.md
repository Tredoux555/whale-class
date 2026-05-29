# School-as-Ecosystem — Plan Drafts (3 plans)

**Session window:** May 17, 2026
**Research inputs:** `docs/handoffs/SESSION_115_RESEARCH_*.md` (consolidated from three parallel agents — Montessori competitors, broader EC platforms, scheduling primitives + ecosystem patterns)
**Purpose:** propose three distinct execution plans for evolving Montree into a self-contained school ecosystem (calendar, parent ↔ principal comms, parent social groups, events, birthday/holiday calendar, principal newsletter). Each plan stands alone. Plan audit + winner-selection lives in `SCHOOL_ECOSYSTEM_PLAN.md` (next phase).

---

## Research findings — load-bearing summary

**Montessori competitor verdict (Transparent Classroom, Montessori Compass, Tadpoles, Toddle):**

- Nobody offers parent ↔ principal **appointment booking**, **parent social groups**, or a **birthday calendar**. This is open whitespace.
- Transparent Classroom price-anchors the Montessori segment at **$2/child/mo** (3.5× cheaper than Montree's $7). Montree's gap-justification is Astra/Mira + meeting notes + ecosystem features competitors don't have.
- Montessori Compass 2.0 launched a "Growth Suite" — they're moving toward ecosystem. **Time pressure.**

**Broader EC platform verdict (Brightwheel, Procare, ClassDojo, ParentSquare, Lillio):**

- Table stakes that ALL converge on: 1:1 parent-teacher messaging w/ auto-translate, school + classroom announcements, daily reports/activity feed with photos, check-in/out attendance, **event calendar with RSVP / appointment booking**.
- The biggest mature offering is **ParentSquare's parent-teacher conference scheduler** — full slot booking with break gaps + interpreter slots + auto-confirmations.
- ClassDojo Plus monetises parents directly ($6.99–$69.99). Different pricing axis than Montree.

**Scheduling primitives verdict (Cal.com, Calendly, Acuity, SimplyBook):**

- **Cal.com Collective event type** — auto-intersects availability of N required hosts. The right primitive for "parent + principal + teacher must all attend." Open source, atoms SDK for native React embeds.
- **Cal.com Round Robin Group** — pool of hosts ("any classroom teacher"), allocates whoever has capacity.
- **Calendly Workflows** — configurable buffers + SMS/email reminders at booking, T-24h, T-1h, post-meeting follow-up.
- **Doodle Group Poll** — fallback when no shared slot exists. Organiser proposes N candidate slots, parties vote.

**Ecosystem patterns:**

- **Parent social groups** (parent ↔ parent in same classroom): **ClassDojo Parent Chat** is the gold standard. **Opt-in only**, FERPA-safe (no student-record exposure), reporting + blocking baked in. Bloomz mirrors.
- **School events + RSVPs**: **Bloomz** wins. Native RSVP (Accept/Decline/Maybe) + signup conversion (turn any event into volunteer slots / item donations). iCal sync.
- **Principal newsletter broadcast**: **Smore + Bloomz Newsletter Creator**. Drag-drop templates, in-app + email + push delivery, read receipts, translation. Frequency norms: weekly for teachers, bi-weekly for whole-school, monthly for districts. >60% mobile-opened.
- **Birthday + holiday calendar**: no dedicated standout. Common pattern is iCal-synced school calendar layer with auto-tagged birthday cards. Worth differentiating on.

---

## Plan A — Calendar-first MVP

**Thesis:** Ship the highest-leverage open-whitespace feature first (parent ↔ principal/teacher appointment booking). Layer everything else later. **Speed to first user-visible win.**

### Scope
- Cal.com-pattern booking primitive (own implementation, no external service)
- Three event types: Single-host (parent ↔ one staff member), Collective (parent + principal + teacher all required), Round-robin (parent picks "any classroom teacher")
- Parent-side booking page: "Book a meeting" CTA on parent dashboard, slot picker, intake form
- Staff-side availability editor: weekly recurring availability + ad-hoc blackout dates + buffer minutes
- Reminder cadence: confirmation at book, T-24h, T-1h, post-meeting follow-up (via existing Resend + the email helpers already shipped)
- iCal export per parent + per staff member
- Cancel + reschedule flows (parent-initiated; staff can decline with reason)

### Phases
- **Phase A.1 — Schema + availability editor (4-5 days)**. Migration 216 (`montree_availability_rules`, `montree_appointment_slots`, `montree_appointments`). Staff availability UI.
- **Phase A.2 — Parent booking flow (4-5 days)**. Slot picker, intake form, confirmation. iCal export.
- **Phase A.3 — Reminders + reschedule (3-4 days)**. Workflow engine for T-24h / T-1h. Reschedule UI.
- **Phase A.4 — Collective + Round-robin (4-5 days)**. Multi-host availability intersection.

**Total: ~15-19 days focused build.**

### Pricing implication
Calendar is a Pro-tier feature. Free + Core schools see a "Upgrade to enable bookings" CTA. Locks in Premium retention.

### Risk
- "Just calendar" leaves the comms gap unfilled. Parents can book a meeting but still can't message the principal directly.
- The Bloomz/ClassDojo parent-social-groups feature stays missing.
- Doesn't materially differentiate from ParentSquare's conference scheduler — we'd ship the same thing.

### Wins
- Fastest to a competitor-beating headline feature. "Parents can book a slot with the principal in 10 seconds, on their phone, in their language."
- Cleanly tier-gated for monetisation.
- Cal.com source available — we can borrow data-model concepts without dependency.

### Verdict
Tight, focused, ship-now. **Best for: getting one new headline feature in front of users in 3-4 weeks.** Doesn't unlock ecosystem.

---

## Plan B — Comms-extended (then schedule)

**Thesis:** Communication is the gravity well. Every research-confirmed-table-stakes pattern leads with messaging + announcements. Build that out first (extending Session 97), then layer scheduling on top so the calendar fits naturally inside an existing message thread (book a meeting → conversation starts in the same thread).

### Scope
- **Phase B.1 — Parent ↔ principal direct messaging (1-2 days)**. Session 97 already has the schema (`parent_principal` thread type exists). This is mostly UI surface + entry points on both sides. CHEAP win.
- **Phase B.2 — Principal newsletter / broadcast (4-5 days)**. Smore-style drag-drop composer. Push to in-app + email. Read receipts. Translation already free via existing i18n.
- **Phase B.3 — School + classroom announcements (3-4 days)**. Mini-newsletter posts (shorter than full newsletter). Photo + emoji support. Scope: school-wide / classroom-only / custom group.
- **Phase B.4 — Calendar primitive (10-12 days)**. Same as Plan A Phases A.1-A.3, but the booking confirmation lands as a message in the existing parent_principal or parent_teacher thread (using the share-to-thread helper pattern from Session 115).
- **Phase B.5 — Multi-host (Collective + Round-robin) (4-5 days)**. Optional Pro feature.

**Total: ~22-28 days focused build.**

### Pricing implication
- Direct messaging: included in Core ($7) — it's table stakes per research.
- Newsletter + announcements: Pro tier feature. Justified by Smore equivalent ($120/yr/teacher).
- Calendar: Pro tier feature.

### Risk
- Slower to the calendar than Plan A.
- Three deliverables before the headline feature ships — risk of momentum loss if Phase B.2 + B.3 take longer than estimated.

### Wins
- Comms-first matches research's "table stakes" finding. We close the gap to ClassDojo on parent-principal contact before adding new whitespace.
- Calendar lands as a message thread enhancement, not a parallel surface — every booking is a conversation, which is what schools actually want.
- The share-to-thread helper from Session 115 generalises: every ecosystem object (meeting notes, bookings, announcements) can drop into the same thread surface.

### Verdict
**Best for: deepest competitive positioning, lowest UX-fragmentation risk.** Slower than Plan A but ends in a stronger product.

---

## Plan C — Big-bang ecosystem

**Thesis:** The competitor research is clear that the ecosystem is converging on a tight set of features (calendar + messaging + announcements + RSVPs + parent social groups + birthday calendar). Build them all in one coordinated push with a unified data model. Avoid the "we shipped Calendar but it doesn't talk to Events" trap.

### Scope
- All of Plan A + Plan B, plus:
- **Phase C.1 — Parent social groups (4-5 days)**. ClassDojo Parent Chat opt-in pattern. Per-classroom parent chat. Reporting + blocking. Feature flag gated.
- **Phase C.2 — School events + RSVPs (5-6 days)**. Bloomz-pattern. Event creation with RSVP (Accept/Decline/Maybe) + signup conversion (volunteer slots / item donations). Native + iCal sync.
- **Phase C.3 — Birthday + holiday calendar (2-3 days)**. Auto-tag child birthdays from `montree_children.date_of_birth`. School holiday data per school config. Surfaces as cards on the parent + staff dashboards.

### Unified data model
- Single `montree_ecosystem_events` table backs: appointments, school events, birthdays, holidays, RSVPs.
- Single `montree_ecosystem_threads` extension to existing `montree_message_threads`: parent_groups, broadcast_announcements, newsletters all subtype.
- Single notification system: in-app + email + push, with per-user preference granularity.

**Total: ~38-48 days focused build (8-10 weeks).**

### Pricing implication
- Single Pro tier covers all of it. Compelling Pro upgrade pitch: "Everything ClassDojo + Brightwheel + Bloomz + ParentSquare give you, Montessori-tuned, in your language."
- Free + Core stay limited to messaging + photos.

### Risk
- LONG runway. 8-10 weeks of no headline ship.
- Coordinated build = bigger blast radius if architecture decisions miss.
- Easy to slip — every new surface adds testing matrix.
- Competitive risk if Compass 2.0 ships something disruptive mid-build.

### Wins
- Cohesive product. Every surface knows about every other. Hard to copy in one shot.
- Single unified data model means future ecosystem features (parent-to-parent threads, virtual tour bookings, fundraisers) drop in cheaply.
- Strongest competitive moat — the "ecosystem-aware" architecture is harder to retrofit than to design.

### Verdict
**Best for: maximum competitive moat, single coordinated build.** Highest risk on schedule and momentum.

---

## Comparison table

| Dimension | Plan A — Calendar-first | Plan B — Comms-extended | Plan C — Big-bang |
|---|---|---|---|
| **Time to first ship** | 3-4 weeks | 1-2 weeks (Phase B.1) | 8-10 weeks |
| **Total build runway** | 3-4 weeks | 4-6 weeks | 8-10 weeks |
| **Headline-feature gap closed** | Calendar | Comms + Calendar | Everything |
| **Competitive moat** | Modest (whitespace, but ParentSquare-shape) | Strong (deep messaging + comms) | Deep (unified ecosystem) |
| **Pricing alignment** | Pro tier headline | Core + Pro layered | Pro tier headline |
| **Schedule risk** | Low | Medium | High |
| **Architecture risk** | Low (Calendar is a fresh subsystem) | Low (extends Session 97 + S115) | High (unified model requires upfront design) |
| **Compass 2.0 race position** | Lead with calendar | Lead with comms | Best end-state, latest arrival |
| **Free/Core retention boost** | Low (Calendar gated to Pro) | High (messaging in Core) | High (some in Core) |
| **Codebase fit** | Medium (new tables + new UI) | High (reuses S97 + S115 patterns) | Medium (requires unified schema design) |
| **Pivot-ability mid-build** | High (each phase ships standalone) | High | Low (changes propagate) |

---

## What's NOT in scope for any plan (deferred)

- **Tuition billing** — Brightwheel/Procare's gravity well. Not a fit for Montree's stage; we charge schools $7/student, not the parent.
- **Staff scheduling / payroll calendar / leave tracking** — answered "no" by the user when scoping. Reserved for a future operator-tier.
- **Health/medication tracking** — regulatory complexity vs. niche value. Out for now.
- **SIS / Veracross / PowerSchool integrations** — Toddle's K-12 angle. Doesn't fit Montree's preschool/Montessori focus.

---

## Cross-plan architectural rules to preserve

Regardless of which plan wins, these patterns from Session 115 should generalise:

1. **`shareMeetingNoteToThread` is the canonical pattern for "object becomes a message".** Future bookings, announcements, RSVPs all use the same `montree_message_threads` + `montree_thread_messages` infrastructure.
2. **Feature flag gating on every ecosystem feature** (`parent_messaging`, `appointments`, `parent_social_groups`, `newsletters`). One flag per surface. School-by-school opt-in.
3. **Audio NEVER persisted** rule (Session 114) extends to any voice-input feature added later (voice notes, voice messages, voice booking-intake forms).
4. **Consent banner mandatory** on every new recording / data-capture surface.
5. **Per-record school + author scoping** on every new table, every new query.
6. **i18n from day 1** — no English-only ship. Use the existing Haiku batch script for new keys.

---

## Open questions for the audit phase

These are explicitly NOT decided in the plan drafts above. Audit phase (`SCHOOL_ECOSYSTEM_PLAN.md`) resolves them:

1. **Pro tier pricing** — does it stay at $7 or move higher? Compass 2.0 launched "Growth Suite" without raising price. Brightwheel charges custom quotes.
2. **Calendar shape** — own implementation (cleanest fit, slowest to ship) vs. Cal.com self-host embed (fastest, external dep). The research lean is own implementation; need to confirm.
3. **Parent social groups timing** — these have the highest legal-exposure risk (parent-to-parent harassment, child-exposure concerns) and the highest engagement upside. Worth a dedicated audit pass.
4. **Newsletter design** — drag-drop composer (matches Smore) vs. structured-template (faster ship, less flexibility). Probably structured-template for v1.
5. **Free-tier reach** — does the Free tier include parent ↔ principal direct messaging (table-stakes per research), or is it Core-only? Affects acquisition funnel.

---

## Recommendation preview (full audit in `SCHOOL_ECOSYSTEM_PLAN.md`)

Hybrid leaning toward **Plan B with Plan A's calendar ordering preserved as Phase 1**:

- Ship Phase B.1 immediately (parent ↔ principal messaging — UI surface only, schema already exists). 1-2 days. Free.
- Ship Plan A's calendar (Phases A.1 → A.4) next. 3-4 weeks. Pro tier.
- Then layer newsletter / announcements (Plan B Phases B.2, B.3). 1-1.5 weeks. Pro tier.
- Defer parent social groups (Plan C Phase C.1) until calendar + newsletters land — separate session, legal-exposure audit first.
- Defer events + RSVP, birthday/holiday calendar to a later sprint (Plan C Phases C.2, C.3).

This sequence:
- Lands a comms quick-win in days
- Reaches the open-whitespace calendar feature in ~4 weeks
- Builds on Session 97 + 115 patterns (low architecture risk)
- Avoids the 8-10 week dark stretch of Plan C
- Keeps Plan C's deferred features as a clear future roadmap

Audit phase confirms or rejects.
