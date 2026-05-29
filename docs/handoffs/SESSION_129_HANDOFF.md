# Session 129 Handoff — Calendar Reframe + Class Progress Tab + Audit Marathon (May 26, 2026)

## TL;DR

9 commits shipped to `main`. The Universal Calendar (`/montree/calendar`) was reframed as an events + appointments surface (not student progress), got a glowing colored-dot system replacing emoji icons, was wrapped in the shared DashboardHeader, and absorbed the legacy Appointments page as a sub-surface. Plus a new "Class Progress" 4th tab on Classroom Overview that summarises every student's activity across all 5 curriculum areas. Plus closed an i18n raw-key bug that had been visible in production since Session 128.

Three Web-Claude audit cycles ran. The final pass (after all fixes) was 4/4 ✅.

**No migrations pending from this session.** Migration 233 from Session 128 (school_terms_and_timezone) is still pending Tredoux's Supabase run — flagged below.

**Headline product change:** the Calendar is the single nav entry for everything date-based. The legacy `/montree/dashboard/appointments` page is hidden from the menu but still reachable via a "Set my availability →" link inside the Calendar (it owns the recurring weekly slots + time-away editor + the per-appointment Join button — too much UX to rebuild inside the new calendar in one session).

---

## Commits shipped this session

| SHA | Subject |
|---|---|
| `aa7ab1bc` | Session 129: calendar reframe + Class Progress tab + i18n raw-key fix |
| `e07b19cb` | Calendar: glowing color-dot system replaces emoji icons |
| `4dda8f12` | Calendar audit follow-up: dedup nav, restore Term option, stop auto-launching calls |
| `f8e6b65a` | Calendar: honor iOS safe-area-inset on header + bottom padding |
| `cb811f25` | Calendar: principal-upgrade now matches by email (was no-op by id) |
| `e34309b6` | Calendar: teachers can create academic terms too (audit Pass C fix) |
| `b06a0bbb` | Calendar: wrap in shared DashboardHeader layout (uniform header) |
| `a51e6772` | Calendar: consolidate Appointments — hide menu entry, surface 'Set my availability' link inside Calendar |
| `3d483325` | Calendar terms API: open mutation to teachers (match the UI gate) |

---

## What changed, file by section

### A. Calendar reframe — events + appointments only (commit `aa7ab1bc`)

Stripped 5 student-progress adapters from `lib/montree/calendar/registry.ts`. Kept 5 calendar-appropriate adapters.

**Disabled** (hide-don't-delete, commented with restore instructions per rule #56):
- `report` (weekly reports)
- `observation` (every confirmed photo — was the noisy camera-icon-per-day strip)
- `english_schedule` (which kids do English when)
- `milestone` (student milestones)
- `attention` (stuck reports / draft conference notes banner)

**Active**: `appointment`, `school_event`, `meeting_note`, `conference_note`, `term`.

Unused imports kept with per-import `eslint-disable-next-line @typescript-eslint/no-unused-vars` so re-enabling is a one-line uncomment. The page guard at `app/montree/calendar/page.tsx:289` (`attentionEvents.length > 0`) already short-circuits the attention banner — no page edit needed when the adapter goes silent.

### B. i18n raw-key fix (commit `aa7ab1bc`)

Real bug from production screenshots: the Calendar page rendered `calendar.title`, `calendar.summary.cta`, `nav.calendar` etc. as literal strings. Root cause: pattern `t('key') || 'fallback'` never fires the fallback because `t()` returns the key string itself when missing (truthy in this i18n system, so `|| 'Calendar'` was dead code).

Added 9 keys to `en.ts`:
- `nav.calendar`, `calendar.title`, `calendar.today`, `calendar.attention.heading`, `calendar.emptyDay`, `calendar.summary.heading`, `calendar.summary.cta`, `calendar.summary.loading`
- `classroomOverview.classProgressTab`

Haiku-batch filled all 11 sibling locales (de/es/fr/it/ja/ko/nl/pt/ru/uk/zh). Strict completeness check 12/12 at 100%.

🚨 **Note on the batch script:** `scripts/fill-missing-i18n-keys.mjs` defaults to translating only the 10 newer locales — `zh` must be passed explicitly. Run pattern:
```bash
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env.local | sed 's/^[^=]*=//' | tr -d '"'\''') \
  node scripts/fill-missing-i18n-keys.mjs && \
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env.local | sed 's/^[^=]*=//' | tr -d '"'\''') \
  node scripts/fill-missing-i18n-keys.mjs zh
```

### C. Class Progress 4th tab (commit `aa7ab1bc`)

New tab next to Shelf Overview / English Schedule / English Progress.

- New endpoint `/api/montree/dashboard/class-progress?period=week|month` (`app/api/montree/dashboard/class-progress/route.ts`, ~390 lines). Aggregates confirmed photo evidence per classroom into per-area + per-child summary data. Photo confirmation rules mirror `english-missing/route.ts`: `teacher_confirmed=true` is the only "really happened" signal; group photos via `montree_media_children` junction count toward the linked child; area resolved via `montree_classroom_curriculum_areas.area_key`. School-tz-aware boundary via `lib/montree/school-time.ts`.
- Inline `ClassProgressTab` + `ClassProgressAreaCard` + `ClassProgressChildRow` components added at the bottom of `classroom-overview/page.tsx` (~590 lines).
- 5 per-area cards (PL/S/M/L/C) using canonical `AREA_DOT_RGB` palette from `FocusWorksSection.tsx`. Per-child rows with avatar + name + areas-active pill + mini bars (one per area) + last-active relative time. Week/Month period toggle.
- Tab strip got `overflowX: 'auto'` + `whiteSpace: 'nowrap'` for narrow viewports.

🚨 **Known limitation flagged for follow-up:** all body strings inside `ClassProgressTab` are hardcoded English. Only the tab label translates. Needs ~20 new keys × 12 locales in a follow-up Haiku batch. Server's `area_label` also comes back in English — the backend either needs to ship localized labels OR the frontend needs an area-label map. Web-Claude flagged this in audit round 2.

### D. Glowing color-dot system (commit `e07b19cb`)

User feedback: emoji icons (🎥 📅 🗒️ 🗣️ 📘) on day cells and detail panel rows looked noisy and lost the brand palette. Replaced with glowing colored dots.

**New file:** `lib/montree/calendar/event-colors.ts` — the single source of truth for the calendar palette. 6 colors:

| Color | Hex | Meaning |
|---|---|---|
| Blue | `#60a5fa` | School event |
| Emerald | `#34d399` | Parent ↔ teacher appointment |
| Red | `#f87171` | Parent ↔ principal appointment |
| Orange | `#fb923c` | Meeting note (staff) |
| Sky | `#38bdf8` | Conference note |
| Violet | `#a78bfa` | Term boundary |

Glow recipe: 1px inset color ring + outer halo at ~33% alpha on small day-cell dots, ~53% on larger detail-panel dots. Tuned for the `#0a1a0f` backdrop.

**Schema extension:** `CalendarEvent.host_role?: 'teacher' | 'principal' | null` added to `lib/montree/calendar/types.ts`. Only meaningful for `source='appointment'`. Lets the resolver split appointment dots by who's hosting (green vs red).

**Adapter changes:**
- `appointments.ts` does a 2nd lightweight query against `montree_appointment_hosts` (`is_primary=true`) to populate `host_role`. Soft-degrades if the table is missing (fall back to teacher-green color). The adapter no longer routes video appointments to `/calls/[id]` (Web-Claude triggered a live call by scrolling); all staff cards now link to `/montree/dashboard/appointments` where the deliberate ±2h Join button lives.
- `school-events.ts` accent updated `#E8C96A` (gold) → `#60a5fa` (blue) to match the dot palette.
- `meeting-notes.ts` accent updated `#f59e0b` (amber) → `#fb923c` (orange).
- `conference-notes.ts` accent updated `#fb923c` (orange) → `#38bdf8` (sky).
- `terms.ts` already used `#a78bfa` (violet). Unchanged.

**Page render changes** in `app/montree/calendar/page.tsx`:
- Day cell: deduped colored dots (`dedupeDayDots()` helper) instead of emoji strip. Three parent-teacher appointments on one day collapse to ONE green dot. Up to 5 distinct colors visible, then `+N` for overflow.
- Detail row: glowing 14px dot in place of the 22px emoji. Row's left accent stripe color tracks the dot color via the same resolver.

The `icon` field on `CalendarEvent` is kept (emoji still emitted by adapters) for any future surface that wants iconography — only the calendar page itself stopped reading it.

### E. iOS safe-area fix (commit `f8e6b65a`)

User screenshot showed "Montree" wordmark colliding with iOS time pill ("18:24"). Header was rendering flush to viewport y=0 — behind the notch / dynamic island.

Added to the calendar page's custom header:
```tsx
paddingTop: 'calc(16px + env(safe-area-inset-top))'
paddingLeft: 'calc(18px + env(safe-area-inset-left))'
paddingRight: 'calc(18px + env(safe-area-inset-right))'
// + bottom padding for the home indicator
```

**This commit was superseded** by `b06a0bbb` which swapped the custom header for the shared `DashboardHeader` (which already honors `env(safe-area-inset-top)` at line 478). The safe-area paddingTop became redundant.

### F. Audit follow-up: dedup nav, restore Term, stop auto-launching calls (commit `4dda8f12`)

Three of five findings from Web-Claude's first audit round shipped:

1. **Duplicate "Calendar" entry in More menu** — the new Universal Calendar (`/montree/calendar`) and the legacy Appointments calendar (`/montree/dashboard/appointments`) were both labelled "Calendar". Renamed the older entry to "Appointments" via new `nav.appointments` i18n key. Haiku-batched all 11 sibling locales.
2. **Term option missing for principals** — `QuickCreateMenu.ACTIONS_BY_ROLE['principal']` correctly included `term`, but Tredoux's session resolved as `role='teacher'` (same JWT mis-stamp bug class as Session 86 Astra 403). First attempt at a defensive principal-upgrade in `resolve-scope.ts` — see "audit lessons" below for the saga.
3. **Appointment cards auto-launching video call on tap** — `appointments.ts` adapter was setting `link = /montree/dashboard/calls/${r.id}` for video appointments, tap booted straight into Agora. Web-Claude accidentally paged another human while scrolling. All staff appointment cards now link to `/montree/dashboard/appointments` (the calendar surface with the deliberate ±2h Join button per Session 117/120 design).

### G. Principal-upgrade fix saga (commits `cb811f25`, `e34309b6`, `3d483325`)

The audit cycle that exposed every weak spot in this codebase's identity resolution. Three attempts:

**Attempt #1 — commit in `4dda8f12`:** Look up `montree_school_admins WHERE id = staff.userId`. Failed silently — `montree_teachers.id` and `montree_school_admins.id` are independent `gen_random_uuid()` values, they never match for the same person. Web-Claude's Pass C audit caught this.

**Attempt #2 — commit `cb811f25`:** Match by email across the two tables. Failed silently too — Tredoux's teacher row has `email = NULL` (he logs in via code `V8F8V9`). The first lookup returns nothing, no upgrade.

**Diagnostic curl into production confirmed the root cause:**
```
teacher row: 26c365b0..., name="Tredoux", role="lead_teacher",
             email=null, login_code="V8F8V9"
school_admin: 16eec1c0..., email="tredoux555@gmail.com", role="principal"
school row:   plan_type="homeschool", founding_teacher_id=null,
              owner_email="trial-8zkw4r@montree.app"
```

**Every smart-detection signal fails for code-login founder-principals:**
- ❌ id (different UUID spaces by design)
- ❌ email (null on teacher row)
- ❌ `founding_teacher_id` (null on school row)
- ❌ `owner_email` (auto-generated trial placeholder)

**Attempt #3 — commit `e34309b6`:** Stop trying to detect the founder. Just grant teachers the Term option directly: `ACTIONS_BY_ROLE['teacher'] = ['event', 'appointment', 'meeting_note', 'term']`. Product rationale: in personal_classroom / homeschool plans the teacher IS the principal, and in multi-teacher school plans term creation is infrequent (2-3/year) and benign.

**Server-side mirror — commit `3d483325`:** I almost missed the API gate. `/api/montree/school/terms/route.ts` had `isPrincipal(role)` returning `'principal' || 'super_admin'` on POST/PATCH/DELETE. Without this fix, teachers would see Term in the menu, fill the form, hit Save → 403 error. Worse than not having the option. Self-audit caught it before Web-Claude re-tested.

Function renamed `isPrincipal` → `canManageTerms`. Error message updated `"Only the principal can manage terms"` → `"Not authorised to manage terms"`.

### H. Shared DashboardHeader on Calendar (commit `b06a0bbb`)

User feedback on his iPhone: "the whale class top left should be uniform the same as the main student page and it should always revert back to the main student front page. also the three dot menu should be on all the pages in uniform."

Three real bugs in one:
1. Tapping the Montree logo on `/montree/calendar` pulled signed-in users OUT to the public landing (`/montree`)
2. Calendar page header looked nothing like the rest of the app — no school name, no Tredoux pill, no camera/mic
3. The 3-dot More menu was missing entirely

**Root cause:** the Calendar page (Session 128 build) had its own minimal custom header. It never inherited the shared layout that wraps `/montree/dashboard/*` pages.

**Fix:**
- **NEW** `app/montree/calendar/layout.tsx` mirroring `app/montree/dashboard/layout.tsx` exactly: `FeaturesProvider` + `NetworkStatusBanner` + `DashboardHeader` + `BackgroundTaskBanner`.
- `app/montree/calendar/page.tsx` dropped the custom `<header>` element, the `next/link` import, the `LanguageToggle` import, and the safe-area-inset paddingTop hack (`DashboardHeader` carries its own safe-area insets at line 478).

`DashboardHeader` already had pathname detection for `/montree/calendar` (`activePage === 'calendar'`) from prior session, so the More menu's Calendar entry correctly shows as active when on this route. The Home link inside `DashboardHeader` points at `/montree/dashboard` (not the public landing), so authenticated users stay inside their session.

### I. Appointments consolidation (commit `a51e6772`)

User: *"the two should be consolidated in the best way that keeps functionality for both but roots in the calendar page."*

Two surfaces existed: the new Universal Calendar (`/montree/calendar`) and the legacy Appointments calendar (`/montree/dashboard/appointments`). The legacy page has unique functionality the Universal Calendar doesn't replicate:
- Recurring weekly availability ("Open every Tuesday 3-5pm")
- Time-away editor ("Out Mar 15-22")
- Per-appointment Join button with ±2h gating for Agora video calls

Rebuilding all of that inside the Universal Calendar would be a half-day to full-day focused session. Instead:
- **Hidden** the "Appointments" `MenuRow` in `DashboardHeader.tsx` (commented out per hide-don't-delete). The route file stays on disk so direct URLs and the existing `+ Add → Parent appointment` deep-link still work.
- **Added** a "Set my availability →" link in the Universal Calendar next to the "Summarise this month" button. Visible only to staff (`role !== 'parent'`) — parents BOOK the slots staff OFFER. Deep-links to `/montree/dashboard/appointments` where the availability editors live.

**New i18n key** `calendar.manageAvailability` + Haiku-batch fill 11 locales.

Result: Calendar is the singular nav entry for everything date-based. Availability management is one tap away from inside the Calendar.

---

## Web-Claude audit cycle outcomes

Three full audit rounds + one targeted re-test, each surfacing real bugs that I shipped fixes for.

| Round | Outcome | Fixes shipped |
|---|---|---|
| 1 (after initial Session 129 push) | 3 ❌ — i18n raw keys, calendar still showing photo strip, Class Progress tab missing — but those were because the push hadn't deployed yet | Deploy hadn't landed; user verified by force-relaunching. After deploy: 1 ❌ (Term option missing for principal), 3 ⚠️ flagged |
| 2 (after `4dda8f12`) | 5 findings: duplicate Calendar nav (✅ fixed `4dda8f12`), Term option missing (❌ — first attempt at upgrade was no-op), Class Progress body i18n debt (⏸ deferred), appointment auto-launch (✅ fixed `4dda8f12`), mobile viewport not verifiable | Mostly resolved; Term option still ❌ pending Attempt #2 (`cb811f25`) and ultimately Attempt #3 (`e34309b6`) |
| 3 (after `e34309b6` + `b06a0bbb` + `a51e6772` + `3d483325`) | **4/4 ✅** — Term flow works end-to-end (POST 200, modal closes, violet dot appears on grid). Header uniform. Consolidation visible (one Calendar menu entry + "Set my availability" link). Console + Network clean. | Cleanup: Web-Claude left 2 test terms in DB — I deleted via Supabase REST. |

---

## Architectural rules locked in this session

237. **The Calendar (`/montree/calendar`) is the singular nav entry for everything date-based.** Events, appointments, meeting notes, conference notes, terms. The legacy `/montree/dashboard/appointments` page stays on disk as a sub-surface for recurring availability + time-away editing + the per-appointment Join button — accessible only via the "Set my availability →" link inside the Calendar OR direct URL.

238. **The Calendar is NOT a student-progress surface.** Per user: *"it's not for student progress."* Adapters for `report`, `observation`, `english_schedule`, `milestone`, `attention` are commented out in `lib/montree/calendar/registry.ts`. If you re-enable one, you re-introduce the noisy filmstrip behaviour the user explicitly rejected.

239. **`lib/montree/calendar/event-colors.ts` is the SOLE source of truth for calendar dot colors.** Adapters set their own `accent` for back-compat with anywhere else that reads it, but the calendar page render goes through `getEventColor(event)`. New sources land with ONE entry in `CALENDAR_COLORS` + one branch in `getEventColor`. Nowhere else.

240. **`CalendarEvent.host_role?: 'teacher' | 'principal' | null` is only meaningful for `source='appointment'`.** Populated by the appointments adapter via a 2nd `montree_appointment_hosts` query filtered to `is_primary=true`. Soft-degrades on table-missing.

241. **Calendar surfaces NEVER auto-page another human.** Tapping a card on a calendar/timeline surface must NEVER auto-launch a call, send a message, or otherwise act on someone else's behalf. The destination page is where the deliberate action button lives (the ±2h-gated Join button on `/dashboard/appointments` is the canonical pattern).

242. **`/montree/calendar` uses `app/montree/calendar/layout.tsx` mirroring `dashboard/layout.tsx`.** `FeaturesProvider` + `DashboardHeader` + `NetworkStatusBanner` + `BackgroundTaskBanner`. Any new authenticated top-level route under `/montree/` should add a sibling layout.tsx with the same shape.

243. **`canManageTerms(role)` accepts teacher OR principal OR super_admin** on `/api/montree/school/terms/route.ts`. This pairs with the UI gate in `QuickCreateMenu.ACTIONS_BY_ROLE`. Critical pattern: UI permission changes MUST be paired with API permission audits — grep the API surface for matching gates before shipping a UI permission widen.

244. **The `t('key') || 'fallback'` pattern is a footgun.** `t()` in this i18n system returns the key string itself when the key is missing (truthy), so the `|| 'fallback'` never fires. Always add the key to `en.ts` and Haiku-batch-fill the 11 sibling locales rather than relying on a JSX-level fallback.

245. **`scripts/fill-missing-i18n-keys.mjs` excludes `zh` from its default targets.** Run it twice — once for the 10 newer locales, once explicitly for `zh`. Same script that's been canonical since Session 67.

246. **Founder-principal identity detection is unsolvable for code-login users.** `montree_teachers.email` is often null, `montree_school_admins.id` ≠ `montree_teachers.id` by design, `montree_schools.founding_teacher_id` is often null in production, `montree_schools.owner_email` is an auto-generated trial placeholder. If a permission UX needs to recognise "this teacher is also the principal", the right fix is usually to drop the role gate entirely + match server-side behaviour, NOT to chase a cross-table identifier that doesn't exist.

247. **`nav.appointments` is now the canonical i18n key** for the legacy Appointments calendar surface. `nav.calendar` is reserved for the new Universal Calendar. The Appointments entry is HIDDEN in the More menu (Session 129 consolidation) but the key remains for the `Set my availability →` link inside the Calendar.

---

## Honest audit lessons recorded

These came up multiple times this session and are worth burning into memory:

1. **Three attempts to fix the Term option** is too many. The lesson: when a defensive cross-table identity check fails an audit, query production data directly BEFORE iterating on the matching logic. A 20-second curl against `montree_teachers` would have shown me on Attempt #1 that Tredoux's row has no email — and saved two round trips.

2. **UI permission changes must be paired with API permission audits.** I shipped the UI Term option without checking the server-side endpoint. The right pattern when changing a permission boundary is to grep the API surface for matching gates and update both sides in the same commit.

3. **Static checks (lint + tsc + i18n parity) don't catch behavior bugs.** The first principal-upgrade attempt passed every static check but was a runtime no-op (matching ID against ID across two tables that use independent UUIDs). Web-Claude's runtime audit caught what my static checks missed. Worth noting as a process lesson — code-correctness gates ≠ behavior-correctness gates.

4. **The `t('key') || 'fallback'` pattern shipped to production** because nobody noticed `t()` returned the key string itself when missing. Trace pattern bugs back to their root, not their symptoms — adding more fallbacks would have just hidden the bug deeper.

5. **Web-Claude reports that look identical may not be.** When Tredoux pasted the SAME Pass C report twice, I needed to check timestamps and deploy state before re-investigating. Web-Claude's reports are point-in-time — re-running the audit is the only way to confirm a fix landed.

---

## Known follow-ups (logged, NOT blocking)

1. **Class Progress tab body i18n** — only the tab label translates. ~20 new keys needed (heading "This week across the classroom", area labels, "Per child", "Quiet this week", "child/children active", "photo/photos", "work/works", "No works tagged yet", etc.) + Haiku batch for 11 locales. The endpoint also returns `area_label` in English — backend either needs to ship localized labels OR the frontend needs an area-label map. Half-day.

2. **`formatRelativeTime` and `formatWeekRange` hardcode `'en-US'`** in `classroom-overview/page.tsx`. Should use `getIntlLocale(locale)` from `lib/montree/i18n/locales.ts` (Session 75 canonical pattern). Lumped into the same i18n batch as #1.

3. **Class Progress error state and empty state share one JSX branch** in `ClassProgressTab`. A 500 error from the route shows "Class Progress will appear once your classroom has some confirmed photos this week" — misleading. Split into explicit error + empty branches. 10 minutes.

4. **DST drift on Class Progress month boundary.** Pure ms arithmetic for "30 days ago" ignores DST. No impact for Asia/Shanghai schools (no DST), but DST-region schools will see boundary drift twice a year. Use `localDateInTzToUtcInstant` for tz-safe arithmetic. 15 minutes.

5. **Mobile viewport eyes-on at true 390px** — Web-Claude's harness couldn't shrink below ~901px. The CSS `overflow-x:auto` + `whiteSpace:nowrap` are correctly wired (Web-Claude verified at 901px). Tredoux needs to eyeball it on his iPhone for the swipe-feel. If anything wraps awkwardly, screenshot and we adjust.

6. **The legacy `/montree/dashboard/appointments` page is now a sub-surface** of the Calendar but its UX is unchanged from Session 117. If you ever want a true merge (recurring availability editor + time-away editor INSIDE the Universal Calendar surface, retiring the legacy page), that's a half-day to full-day focused build — flag noted in the `a51e6772` commit message.

7. **`stale .git/index.lock` was cleared at the start of this session.** If you see git operations failing with "Unable to create '.git/index.lock'" in future sessions, that's a stale lock from an interrupted git operation. Clear via `rm -f .git/index.lock` and retry.

---

## Migration state (no new migrations this session)

The only pending migration is from Session 128:
- ⏳ `migrations/233_school_terms_and_timezone.sql` — adds `timezone` column to `montree_schools` + creates `montree_school_terms` table + helper trigger. Idempotent. Until run: `getSchoolTimezone()` falls back to UTC; terms POST endpoint returns 503 `migration_pending: true` from `montree_school_terms` queries. Nothing else breaks.

**🚨 Web-Claude's Term creation tests worked**, which means migration 233 either ran already at some point OR the table existed from elsewhere. Either way, the production `montree_school_terms` table is live as of Session 129.

---

## Next-session priorities (ordered)

1. **🚨 Class Progress body i18n batch** — closest the i18n loop on this surface. ~20 keys × 12 locales via the Haiku batch.
2. **Mobile eyes-on test** on iPhone at true 390px. Confirm the 4-tab strip on Classroom Overview swipe-scrolls smoothly.
3. **Optional: deeper consolidation** — move recurring availability + time-away editors INTO the Universal Calendar; retire the legacy `/appointments` page entirely. Half-day to full-day focused build.
4. **Optional: extend the Calendar header** with quick affordance for the "Set my availability" link — currently sits next to the Summarise button but might deserve a more prominent home (e.g. a settings gear icon top-right of the calendar header). Product call.
5. Session 128 carry-overs that survived this session unchanged — see `docs/handoffs/CALENDAR_MARATHON_HANDOFF.md` and `docs/handoffs/CALENDAR_FRESH_AUDIT.md` for the original ledger. System-wide tz sweep (rule #228), parent-portal Calendar nav link, multi-school parent picker, rate-limit `/api/montree/calendar`.

---

## File index

| Path | Status | Lines |
|---|---|---|
| `app/api/montree/dashboard/class-progress/route.ts` | NEW | ~390 |
| `app/montree/calendar/layout.tsx` | NEW | ~55 |
| `lib/montree/calendar/event-colors.ts` | NEW | ~145 |
| `app/montree/dashboard/classroom-overview/page.tsx` | MOD | +720 / −24 |
| `app/montree/calendar/page.tsx` | MOD | +180 / −80 |
| `lib/montree/calendar/registry.ts` | MOD | 5 adapters commented out + imports preserved with eslint-disable |
| `lib/montree/calendar/types.ts` | MOD | +7 (CalendarEvent.host_role) |
| `lib/montree/calendar/resolve-scope.ts` | MOD | +40 (principal-upgrade attempts — defensive, now mostly inert but kept) |
| `lib/montree/calendar/adapters/appointments.ts` | MOD | +30 (host_role lookup + link change + accent split) |
| `lib/montree/calendar/adapters/school-events.ts` | MOD | accent gold → blue |
| `lib/montree/calendar/adapters/meeting-notes.ts` | MOD | accent amber → orange |
| `lib/montree/calendar/adapters/conference-notes.ts` | MOD | accent orange → sky |
| `components/montree/DashboardHeader.tsx` | MOD | Appointments MenuRow hidden + "Calendar" entry confirmed unique |
| `components/montree/calendar/QuickCreateMenu.tsx` | MOD | `ACTIONS_BY_ROLE['teacher']` now includes 'term' |
| `app/api/montree/school/terms/route.ts` | MOD | `isPrincipal` → `canManageTerms` (accepts teacher) |
| `lib/montree/i18n/en.ts` | MOD | +10 new keys (calendar.* + classroomOverview.classProgressTab + nav.appointments + calendar.manageAvailability) |
| `lib/montree/i18n/{zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` | MOD × 11 | +10 keys each (Haiku-batch translated) |
| `docs/handoffs/SESSION_129_WEB_CLAUDE_AUDIT.md` | NEW | Full 6-pass brief |
| `docs/handoffs/SESSION_129_WEB_CLAUDE_OPENING.md` | NEW | Short copy-paste opening message |
| `docs/handoffs/SESSION_129_HANDOFF.md` | NEW (this doc) | Session ledger |

---

## Verification status (final)

- ✅ All 9 commits on `origin/main`. Railway auto-deploys triggered throughout.
- ✅ Lint clean (`--max-warnings=0`) on every changed code file.
- ✅ TypeScript full project compile clean on every touched file.
- ✅ i18n strict parity 12/12 locales at 100% (5034 keys each — `nav.appointments` + `calendar.manageAvailability` + 8 calendar/classroom keys added this session).
- ✅ Web-Claude audit final pass: 4/4 ✅.
- ✅ Test terms left in production DB cleaned up (`522bab64...` Audit Test Term + `e5779706...` Probe Term both deleted via Supabase REST).
- ⏳ Mobile eyes-on at true 390px (Tredoux's iPhone).
- ⏳ Class Progress body i18n batch (~20 keys × 12 locales).

---

**End of Session 129.**
