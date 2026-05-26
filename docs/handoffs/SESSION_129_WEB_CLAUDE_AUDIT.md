# Session 129 — Web-Claude UI Audit Brief

You are a browser-Claude with Chrome MCP access. Walk this brief end-to-end on production (montree.xyz) and report any failure. You do NOT need to write code. You report only.

## What just shipped (so you know what to verify)

Three changes landed on `main` and Railway auto-deployed:

1. **i18n keys added** — `nav.calendar`, `calendar.title`, `calendar.today`, `calendar.attention.heading`, `calendar.emptyDay`, `calendar.summary.heading`, `calendar.summary.cta`, `calendar.summary.loading`, `classroomOverview.classProgressTab`. All 12 locales backfilled with real (not English-fallback) translations.

2. **Calendar reframed** — `/montree/calendar` now shows **events + parent appointments only**. The following adapters were disabled in `lib/montree/calendar/registry.ts` (hide-don't-delete, commented out):
   - `report` (weekly reports)
   - `observation` (every confirmed photo — was the noisy camera-icon strip)
   - `english_schedule` (which kids do English when)
   - `milestone` (student milestones)
   - `attention` (stuck reports/draft conference notes banner)

   Adapters still active: `appointment`, `school_event`, `meeting_note`, `conference_note`, `term`.

3. **New 4th tab on Classroom Overview** — "Class Progress" (icon: TrendingUp). Backed by `/api/montree/dashboard/class-progress?period=week|month`. Shows: 5 per-area cards (PL/S/M/L/C) with children_active counts + top works, then per-child rows with mini area-bars + last-active timestamps.

## Setup

1. Open Chrome. Sign in to **montree.xyz** with the principal login code for **Whale Class** (Tredoux's principal account).
2. Hard refresh (`Cmd+Shift+R`) to bust any service-worker cache. You should see service worker bump to a newer version in DevTools → Application → Service Workers if Cowork hasn't already done that.
3. Open DevTools Console — keep it visible. Any red error during the walk is a finding.

## Pass 1 — i18n keys (most important)

For **each** of these three URLs, take a screenshot and confirm NO raw `key.something` strings appear anywhere on the page:

- `/montree/admin` (principal cockpit home)
- `/montree/calendar`
- `/montree/dashboard/classroom-overview`

Specifically check:

| Surface | What to look at | Expected |
|---|---|---|
| `/montree/admin` More menu (3-dot icon top-right) | Menu item that opens Calendar | Reads **"Calendar"**, not `nav.calendar` |
| `/montree/calendar` page heading | The `<h1>` at top-left | Reads **"Calendar"**, not `calendar.title` |
| `/montree/calendar` "Today" jump pill | The pill shown when viewing a non-current month | Reads **"Today"**, not `calendar.today` |
| `/montree/calendar` summary button | Amber pill above the grid | Reads **"Summarise this month"**, not `calendar.summary.cta` |
| `/montree/calendar` empty day detail | Tap a day with nothing scheduled | Reads **"Nothing scheduled."**, not `calendar.emptyDay` |
| `/montree/dashboard/classroom-overview` 4th tab | The new tab next to "English Progress" | Reads **"Class Progress"**, not `classroomOverview.classProgressTab` |

Then switch the language toggle to **中文** (Chinese) and revisit the same three URLs. Expect natural Chinese strings:

- `nav.calendar` → 日历
- `calendar.title` → 日历
- `calendar.summary.cta` → 总结本月
- `classroomOverview.classProgressTab` → 班级进度

Switch to **Deutsch** and confirm:
- Calendar → Kalender
- Class Progress → Klassenfortschritt

**Findings format:** screenshot + URL + locale + the literal string you see, if it doesn't match.

## Pass 2 — Calendar content (events + appointments only)

On `/montree/calendar`:

1. **Month view should NOT show camera icons + `+N` photo counts on day cells.** The old noisy strip is gone. Day cells now have only: emerald dot (an appointment that day), gold dot (a school event), subtle dot (a term boundary). Maybe nothing at all for empty days.
2. Tap any day. Detail panel below should show **only** these event types (if any are scheduled):
   - Appointments (`🎥` video or `👨‍👩‍👧` meeting icon, indigo/emerald accent)
   - School events (`📅`, gold accent)
   - Meeting notes (`🗒️`, amber)
   - Conference notes (`🗣️`, orange)
   - Term boundaries (`📘`, purple)
3. You should **NOT** see:
   - Confirmed photos as events
   - Weekly reports
   - English schedule entries
   - Milestone events
   - A "Needs attention" banner at the top of the page

4. The **"+ Add on this day"** button on a selected day should still work for principals. Tap it. Menu should offer: school event, parent appointment, meeting note, term (4 options for a principal). Open the school event inline modal — confirm fields render, do NOT actually submit.

5. **"Summarise this month"** button — tap it. Expect a short paragraph in a gold-bordered card. Should mention only the kinds of events still active (appointments, school events, etc.) — not "12 photos confirmed" style language.

## Pass 3 — Class Progress tab

On `/montree/dashboard/classroom-overview`:

1. The tab strip should show **4 tabs**: Shelf Overview / English Schedule / English Progress / **Class Progress**.
2. Tap "Class Progress". Expect:
   - Lora-serif heading "This week across the classroom" + date range subtitle
   - Period toggle in the top-right: **Week** active (emerald) / Month inactive
   - 5 per-area cards in a responsive grid (PL/S/M/L/C) with colored dots, big "X of Y" children count, photos + works numbers, and top works list
   - "Per child" sub-heading
   - Per-child rows, each with avatar + name + areas-active pill + photos count + last active relative time + 5 mini area-bars
   - Children with 0 photos this week appear in a "Quiet this week" section at the bottom as small pills
3. Tap the **Month** toggle. The data should refresh and the date-range subtitle update to a 30-day window. The numbers should grow.
4. If Whale Class has no confirmed photos this week, you should see the soft empty-state card: *"Class Progress will appear once your classroom has some confirmed photos this week."* with a "Try again" button.
5. Confirm dark forest aesthetic — emerald accents, Lora serif headings, glass cards.

## Pass 4 — Console + Network

While walking the above, in DevTools:

- **Console:** zero red errors on any of the 3 surfaces. Yellow warnings ok. Specifically watch for: `react hydration mismatch`, `Cannot read properties of undefined`, `Failed to fetch`. Flag any.
- **Network:** on `/montree/calendar`, the `/api/montree/calendar?from=...&to=...` request should respond 200 with a much smaller `events[]` array than before (only 5 sources of events instead of 10). On Class Progress, `/api/montree/dashboard/class-progress?period=week` should respond 200 with `{ success: true, areas: [...], per_child: [...] }`.

## Pass 5 — Mobile viewport

Toggle DevTools to iPhone viewport (390×844). Revisit:

- `/montree/calendar` — month grid should still render, day cells should be tap-target friendly (≥44pt), detail panel should appear below the grid on tap.
- `/montree/dashboard/classroom-overview` Class Progress tab — 5 area cards should wrap (probably 2 cols on phone), per-child rows should stack readably.
- Tab strip — yes, the 4-tab strip is a bit cramped on phones. This is known and flagged for follow-up. Report whether it overflows the viewport or wraps awkwardly.

## Pass 6 — What you should NOT touch

- Do NOT submit a real parent appointment or school event (you'd push real data through the system).
- Do NOT open the **Summary** button if Whale Class is on the Free AI tier (it would 402; if it 200s, you're on a paid tier).
- Do NOT log out and back in as a different role unless you have credentials for it.

## Reporting back

For each pass, report **only what failed**. If everything is green, say so. Format:

```
PASS 1 — i18n: ✅ all 6 spot checks green on en + zh + de
PASS 2 — Calendar content: ✅ no observation/report/milestone events visible
PASS 3 — Class Progress tab: ⚠️ Month toggle didn't update the date range subtitle, but per-area numbers did refresh
PASS 4 — Console: ✅ no errors. Network: ✅ both endpoints 200
PASS 5 — Mobile: ⚠️ tab strip wraps to 2 rows on iPhone 12 viewport — readable but visually busy
PASS 6 — Acknowledged, did not push real data
```

Screenshots help. Don't paste full DOM trees unless something genuinely surprises you.
