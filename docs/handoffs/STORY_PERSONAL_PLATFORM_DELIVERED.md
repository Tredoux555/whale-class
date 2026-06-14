# Personal Platform — DELIVERED (Jun 14, 2026, Cowork)

`/story/admin` is now Tredoux's private **Sanctuary**: Planner + Coach + Diary + Projects,
with his Story comms hidden behind one covert door. Built from
`STORY_PERSONAL_PLATFORM_BUILD.md`, then evolved live with Tredoux. Every step audited
(ESLint `--max-warnings=0` + scoped `tsc`) before moving on. All new code lint+type clean.

## Final IA (one layer = the login)
Log in → **Planner** (calendar). Open nav: **Planner · Coach · Projects** — all behind the single
Story-admin login (Tredoux's call: one layer, not two). 15-min idle auto-logout.
- **Coach = his journal.** Talking to the Coach IS his journaling — they're merged (Tredoux:
  "should they not be one and the same?"). His AI life-coach + chief-of-staff + therapist's ear
  (Sonnet). Knows him deeply (profile below), runs a first-session intake, and **everything flows
  through it**: tell it "I have a meeting Wednesday and I'm nervous" → it reflects, **books the
  event on the planner** (add_event) and **logs how he feels to his journal** (add_diary_entry).
  **Chat persists** across nav + reload (CoachChatProvider in the layout + sessionStorage); the
  full Coach page and the floating Coach share ONE live conversation.
- **Journal** = the Coach's read-back view of those entries (markdown editor + mood), reached via
  the "📓 Journal" link on the Coach ("← Coach" back). Same `story_diary_entries` table; NOT a
  co-equal nav tab.
- **Planner** = functional calendar: tap a day → add timed events (meetings/appointments),
  delete them; gold dots mark days with events. Coach writes here too.
- **Projects** = ambitions (title/why/next-action/priority/status).
- **Messages** (the only still-hidden thing — covert comms): on the Planner, **long-press the
  month title "June 2026" for 2 seconds → type STORY_MESSAGES_PHRASE**. Reverts + re-locks on
  tab-away.

## Env (Railway)
- `STORY_DIARY_KEY` — optional now. AES-256 key (64 hex chars) if you want a dedicated one.
  **If unset/invalid, the key is derived from the always-present `STORY_JWT_SECRET`** (domain-
  separated) — so encryption + the brain "just work" with no setup. (This fixed the "can't write
  to diary/calendar/memory" issue.)
- `STORY_MESSAGES_PHRASE` ✅ — the phrase typed to open Messages.
- ~~STORY_DIARY_PHRASE~~ — not needed (diary/coach phrase gate removed).

## Voice + archive
- **Voice**: mic button in the Coach composer (page + float) → `/api/story/coach/transcribe`
  (Whisper) → text drops into the composer. Just speak to it.
- **Archive (the brain's record)**: every Coach exchange is logged encrypted to `story_coach_log`
  (migration 259). The Coach *learns* via semantic memory (story_coach_memory, injected each turn);
  the log is the full durable transcript (referable by Tredoux or desktop Claude in tandem).

## Migrations (Supabase) — ALL RUN ✅
- `257_story_personal_platform.sql` ✅ run.
- `258_story_plan_events.sql` ✅ run (planner events).
- `259_story_coach_log.sql` ✅ run (Coach conversation archive).

## The Coach knows him (the info pack)
`lib/story/coach/about-tredoux.md` (loaded into the system prompt every turn via
`lib/story/coach/profile.ts`) — drawn from MASTER_BRAIN + archives: family (son ~10, daughter ~3),
the ecosystem (Montree → Montree Home → network of schools → Jeffy → Project Sentinel → Guardian
Connect), the **north star = build a school**, the phonics/English-Corner teaching job (+ hostile
lead teacher), the "dark phonics" video angst, Gloria (first agent), and the emotional core —
empire-level vision, no support structure, runs hot. The Coach weighs big choices against the
school vision and is built to be the place he offloads all of it.

Knowledge base: 14 frameworks (Essentialism heaviest) in `lib/story/coach/knowledge/`.
Memory: encrypted `story_coach_memory`, supersede-on-update; intake fills it over time.

## Privacy posture
Single login is the gate. Everything personal encrypted at rest (server-readable by design — the
Coach must read the diary to reflect). Not E2E. Messages stays covert behind its phrase door.

## Still open / next
- (Migrations 257/258/259 all run; envs set. Platform is fully functional.)
- App Store: the covert Messages door is a hidden-feature risk (Apple 2.3.1) — keep the personal
  platform web-only or drop the disguise for any public/commercial build. User-set codes are fine;
  the *hidden/disguised* feature is the issue.
- Optional: have the Coach read recent `story_coach_log` for deeper cross-session recall (today it
  relies on semantic memory + the client's last ~12 turns).
