# Physical Verification Prompt — Montree Principal Platform + Story Flow

Paste everything below the line into a fresh **desktop Claude** session that has browser/computer-use access. It will drive the live site, confirm the two fixes that just deployed, and sweep general functionality.

---

You have browser control. Two fixes were just deployed to `montree.xyz` and the `teacherpotato.xyz` story facade (commit `f05b070f`). I need you to **physically verify them live and report PASS/FAIL per item with evidence** (status codes, console text, screenshots). Do not assume — observe. Wait ~3–4 min after the deploy before starting so Railway has rebuilt; confirm the build is live by hard-refreshing once.

## Context: what was fixed
1. **Story (admin → story direction).** Notes sent from the Story admin were not reaching the parent story page. Root cause: a legacy DB CHECK constraint (`secret_stories_message_author_check`, author limited to `'T'`/`'Z'`) rejected the facade admin login (`'J'`/`'P'`), the write threw and was silently swallowed, so the tap-to-reveal hidden message kept showing the last *parent* message. Fixed by checking the error + a constraint-aware fallback, plus migration `245` to drop the constraint.
2. **Principal cockpit "jumping."** `/montree/admin` flickered/jumped with a tight repeating `GET /api/montree/admin/snapshot 401` + `GET /api/montree/billing/status 401` loop. Root cause: the page body and its banner/card components mounted *before* auth was confirmed, and both the layout and the page independently redirected to login — remounting in a loop. Fixed by making the layout the single auth gate (body mounts only after `/api/montree/auth/me` confirms the cookie).

## ⚠️ Prerequisite to check first
Migration `245` may not yet be applied to the production DB (it must be run manually in the Supabase SQL editor). The code has a fallback so admin notes publish regardless, but the *clean* end state needs the constraint dropped. **Report whether the hidden message now reflects the admin's note** — if it does, the path works; note separately whether migration 245 still needs applying.

## Test A — Story admin → story page (the main fix)
1. Open `teacherpotato.xyz/story/admin` (or `/story/admin/dashboard`) and log in (J / the facade admin code). 
2. Send a **text note** with a unique marker, e.g. `VERIFY-<timestamp> hello from admin`.
3. Open `teacherpotato.xyz/story/active` in a separate tab and log in as a story user.
4. In paragraph 1 ("Today we learned about counting and colors…"), **tap the first `t`** — the hidden message should append to paragraph 3 and must now show your `VERIFY-…` marker (NOT an older parent message). **PASS/FAIL.**
5. **Tap the first `m`** in paragraph 1 — "Recent Notes from Teacher" should list your note. **PASS/FAIL.**
6. Open DevTools → Network and confirm `GET /api/story/current` returns 200 with your marker in `story.hiddenMessage`, and `GET /api/story/recent-messages` 200 lists it. Capture the response bodies.
7. Send an **image** from admin, then on the story page tap the **last visible letter** of the final paragraph to reveal the media gallery; confirm the image appears. **PASS/FAIL.**
8. Confirm the reverse still works: send a note **from the story page** and confirm it appears in the admin dashboard message list. **PASS/FAIL.**

## Test B — Principal cockpit no longer jumps (logged-in)
1. Open `montree.xyz/montree/admin` logged in as a valid principal (Tredoux House).
2. Watch the page: it should show a brief skeleton, then render the Astra "Hi" page **once** — no flicker, no jumping, no repeated skeleton flashes. **PASS/FAIL.**
3. In DevTools Console/Network: confirm `GET /api/montree/auth/me` 200 fires once, then **at most one each** of `/api/montree/admin/today`, `/api/montree/admin/snapshot`, `/api/montree/billing/status` (all 200). There must be **no repeating 401 pairs**. Capture the network list. **PASS/FAIL.**

## Test C — Expired-cookie / logged-out behavior
1. In DevTools → Application → Cookies, delete the `montree-auth` cookie (leave `montree_principal`/`montree_school` in localStorage to simulate the stale-session case). Reload `/montree/admin`.
2. Expected: a brief skeleton, then **exactly one** redirect to `/montree/login-select` which settles on the login form — **no** snapshot/billing 401 storm, no bouncing back into the cockpit. **PASS/FAIL.** Capture console + final URL.

## Test D — General feature sweep (principal platform)
Log back in as principal. Visit each destination and confirm it loads cleanly (no 401 storm, no jumping, no infinite skeleton). Note any console errors per page.
- Today / Astra (`/montree/admin`) — send a real question to Astra, confirm it streams a reply and ends with an action line. **PASS/FAIL.**
- Classrooms (`/montree/admin/classrooms`)
- Parents (`/montree/admin/parents`)
- Communication (`/montree/admin/communication`)
- Settings (`/montree/admin/settings`) — and the sub-links it exposes (Billing, Features, Activity, Reports)
- Calendar / Appointments (`/montree/admin/appointments`)
- Events (`/montree/admin/events`)
- Parent Meetings (`/montree/admin/meeting-notes`)
- Conversations / Vault (`/montree/admin/conversations`)
- Sign out — confirm the logout is clean (cookie cleared, lands on `/montree`, no half-dead session).

## Report format
Return a table: **Item | PASS/FAIL | Evidence (status/console/screenshot) | Notes**. Then a short summary:
- Did the story hidden-message now show the admin's note? (the core fix)
- Is migration 245 still outstanding?
- Any page that still 401-storms, jumps, or hangs on a skeleton?
- Any new console errors introduced.
Flag anything that needs a code follow-up.
