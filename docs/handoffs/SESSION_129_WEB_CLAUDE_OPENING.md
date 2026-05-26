# Web-Claude Opening Message (copy-paste this into browser-Claude)

Paste the block below into a fresh browser-Claude (Claude in Chrome) session. It tells the browser agent what just shipped, points at the full brief, and asks for structured findings back. The browser agent has Chrome MCP access — it can navigate, screenshot, read page text, and inspect console + network.

---

```
I need you to physically audit a Next.js production deploy on montree.xyz. Three changes just shipped to the Calendar feature and the Classroom Overview page on Tredoux's Montessori app. You're checking whether they look right in the browser.

The full audit brief is in the repo at:
docs/handoffs/SESSION_129_WEB_CLAUDE_AUDIT.md

Read that brief first (you can ask Cowork to send it, or open it in the file panel). It has 6 passes spelling out exactly what to click, what to verify, and what to ignore.

TL;DR of what shipped:
1. i18n raw keys fixed — nav.calendar, calendar.title, calendar.summary.cta, calendar.today, calendar.attention.heading, calendar.emptyDay, calendar.summary.heading, calendar.summary.loading, classroomOverview.classProgressTab. All 12 locales backfilled.
2. /montree/calendar reframed — events + appointments only. The noisy camera-icon strip per day cell is gone. Active adapters: appointment, school_event, meeting_note, conference_note, term. Disabled: report, observation, english_schedule, milestone, attention.
3. /montree/dashboard/classroom-overview has a new 4th tab "Class Progress" (TrendingUp icon) showing per-area summary cards (PL/S/M/L/C) + per-child rows with mini area-bars and last-active times. Week/Month period toggle.

Login flow: Tredoux's principal login code for Whale Class. Tredoux will paste it for you OR he's already signed in.

Walk all 6 passes from the brief. Report back in this format ONLY — don't paste DOM trees, don't restate the brief:

PASS 1 — i18n: [✅ green | ⚠️ partial | ❌ failed] + 1-line note + URL of any failed screen
PASS 2 — Calendar content: [✅ | ⚠️ | ❌] + what you saw
PASS 3 — Class Progress tab: [✅ | ⚠️ | ❌] + what you saw
PASS 4 — Console + Network: [✅ | ⚠️ | ❌] + paste any red console error verbatim
PASS 5 — Mobile (390×844): [✅ | ⚠️ | ❌] + screenshot any layout break
PASS 6 — Did not push real data: [✅ acknowledged]

For any ❌ or ⚠️: include a screenshot + URL + the literal string or behaviour you saw vs. expected. If everything is green, say so explicitly.
```

---

## If browser-Claude reports a regression

Forward the report back into THIS Cowork session and I'll triage:
- If the regression is on a touched file: I patch + re-run the audit gate
- If the regression is on an untouched file: I investigate root cause first (could be a pre-existing bug surfacing under the new flow)
- If the regression is a deploy lag (Railway containers still rotating): just retry the affected pass in ~60s

## What NOT to do

- Don't push code changes from the browser-Claude session. It can navigate and report, not commit.
- Don't ask browser-Claude to fix the bugs it finds. Findings only. Fixes come back here.
- Don't run browser-Claude on a viewport you haven't told me about (the brief specifies desktop + iPhone 12 / 390×844).
