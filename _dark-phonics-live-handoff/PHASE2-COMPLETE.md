# Online Classes (Dark Phonics Live) — Phase 2 complete

Date: 2026-08-19. Phase 1 built the audited scaffold; Phase 2 made it a working
end-to-end feature, integration-audited, security-checked, and typechecked
clean (0 errors across all 32 DPL files, combined scoped tsc).

## What works now, end to end (once the migration is run + flag is on)

TEACHER (`/montree/dashboard/online-classes`):
- Upcoming classes list with "Enter classroom"; past classes with recap status.
- Credits admin: every child in your school with parent name + balance;
  grant credits inline with a note (e.g. "WeChat ¥1200 2026-08-19").

PARENT (`/montree/parent/online-classes`, zh subtitle 在线课堂):
- Per-child credit balance + ledger history.
- Book a 25-min class (child, date, time — Asia/Shanghai); friendly
  "no classes left" state at zero balance.
- Join button (opens 10 min before class), past classes → recap.

LIVE CLASSROOM (`/montree/{dashboard,parent}/live/[id]`, Midnight Studio):
- Real lesson content from the actual 49-lesson Dark Phonics curriculum
  (RAW hoisted to `lib/montree/dark-phonics/lessons.ts`; the library page now
  imports it — single source of truth).
- Lesson auto-selected: child's next lesson in sequence (recaps completed + 1).
- Teacher drives scenes/word highlights/tracing/stars; parent side follows via
  2-second polling of `montree_class_live_state`. No Agora required for this.
- Video: preflights the existing Agora RTC token route; if configured, "Join
  video" opens the existing AgoraVideoCall full-screen (its real design); if
  not configured, a clean "video not configured — class continues on the
  board" tile. Class is fully functional either way.
- End Class: teacher note + words drilled (prefilled) + stars → recap saved →
  parent's poll flips to "class ended" with a recap link.

RECAP (`/montree/parent/recap/[id]`): the shareable Midnight Studio card —
child name, class date, lesson + sound mastered, words read, stars, teacher
note, progress n/49, trial-class QR footer.

## Extraction boundary (for the future standalone app)

ALL feature code lives in these paths and nowhere else:
  lib/montree/credits/ · lib/montree/agora/whiteboard.ts ·
  lib/montree/dark-phonics/ · app/api/montree/dark-phonics-live/ ·
  app/api/montree/appointments/[id]/{whiteboard-token,recap,live-state}/ ·
  app/montree/{dashboard,parent}/online-classes/ ·
  app/montree/{dashboard,parent}/live/[appointmentId]/ ·
  app/montree/parent/recap/[appointmentId]/ ·
  components/montree/dark-phonics-live/ · styles/dark-phonics-live-tokens.css

One-way dependency, verified by repo-wide grep: nothing outside these paths
imports from them (sole exception: the library page imports the hoisted lesson
data, which is itself inside the boundary). The feature touches the rest of
Montree through exactly FOUR seams:
  1. Auth: `resolveAppointmentsParent` / `verifySchoolRequest`
  2. Data: `getSupabase()`
  3. Flags: `isFeatureEnabled(..., 'dark_phonics_live')`
  4. Video: the existing `AgoraVideoCall` component (behind VideoCallSlot)
To extract later: lift the bounded paths + the 4 DB tables (packages, ledger,
recaps, live_state) + the appointments tables it leans on, re-implement the
four seams (own auth, own client, flag → constant true, keep/replace Agora).
Deliberately NOT integrated into Montree's nav-menu registry — routes are
URL-reachable — precisely to keep the boundary clean (adding a flag-gated
menu item later is a 3-file change in lib/montree/menu/*, documented as the
one sanctioned future inbound touch).

## Audit trail (Phase 2)
- 3 Opus build slices (backend APIs / portal UX / classroom wiring), each
  typechecked in isolation.
- Independent integration audit: applied 3 cross-slice fixes (recap payload
  enrichment with sound/date/child-name; admin roster switched to the real
  `montree_children.school_id` column; envelope shape verified), found and
  fixed 1 NEW security hole (grant route skipped the school check for
  children with NULL classroom_id — now checks school_id directly), traced
  every flow end-to-end, verified the boundary, re-read the migration
  (idempotent, all 4 tables RLS-enabled), combined tsc = 0 errors.

## Go-live checklist (your part — ~10 minutes)
1. RUN THE MIGRATION: open `migrations/334_dark_phonics_live.sql`, paste into
   the Supabase SQL editor, run. Idempotent — safe to re-run. Creates the flag
   definition + 4 tables + balances view + spend RPC, all RLS-locked.
2. SET ENV on Railway: `DARK_PHONICS_LIVE_TEACHER_ID` = your montree_teachers
   id (find it: `SELECT id, name FROM montree_teachers WHERE name ILIKE '%tredoux%';`).
3. FLIP THE FLAG for your school: your school-features switchboard
   (/montree/dashboard/school-features) once the migration has seeded the
   `dark_phonics_live` definition — or insert the override row by hand.
   NOTE: the school also needs the existing `appointments` flag ON (the parent
   resolver requires it — documented coupling).
4. DRY RUN: grant your test child 1 credit from the teacher page → book from
   the parent page → open both live pages side by side → drive scenes/stars
   from the teacher side, watch the parent follow → End Class → check recap.
5. LATER (not needed to teach): provision Agora Interactive Whiteboard creds
   (AGORA_WHITEBOARD_APP_IDENTIFIER / _SDK_TOKEN / _REGION) to layer the
   shared drawing canvas on top; video already works wherever the existing
   RTC creds are configured.

## Known limitations (deliberate, documented)
No slot-conflict/double-booking guard; no double-submit idempotency key on
booking (double-click can burn 2 credits — disable-on-submit is in the form,
but a network retry can still slip through); lesson number is sequence-derived
(no teacher override UI yet); whiteboard SDK dormant; nav links not added;
recap share-image export not built.
