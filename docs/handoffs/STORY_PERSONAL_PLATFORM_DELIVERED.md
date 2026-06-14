# Personal Platform — DELIVERED (Jun 14, 2026, Cowork)

`/story/admin` is now Tredoux's private **Sanctuary**: Planner + Coach + Diary + Projects,
with his Story comms hidden behind one covert door. Built from
`STORY_PERSONAL_PLATFORM_BUILD.md`, then evolved live with Tredoux. Every step audited
(ESLint `--max-warnings=0` + scoped `tsc`) before moving on. All new code lint+type clean.

## Final IA (one layer = the login)
Log in → **Planner** (calendar). Open nav: **Planner · Coach · Diary · Projects** — all behind
the single Story-admin login (Tredoux's call: "Coach is my diary, I have a right to keep it
private; one layer, not two"). 15-min idle auto-logout.
- **Coach** = his AI life-coach + chief-of-staff + therapist's ear (Sonnet). Knows him deeply
  (profile below), runs a first-session intake, and **everything flows through it**: tell it
  "I have a meeting Wednesday and I'm nervous" → it reflects, **books the event on the planner**
  (add_event) and **logs how he feels to the diary** (add_diary_entry).
- **Planner** = functional calendar: tap a day → add timed events (meetings/appointments),
  delete them; gold dots mark days with events. Coach writes here too.
- **Diary** = private encrypted journal (list + markdown editor + mood + reflect-with-Coach).
- **Projects** = ambitions (title/why/next-action/priority/status).
- **Messages** (the only still-hidden thing — covert comms): on the Planner, **long-press the
  month title "June 2026" for 2 seconds → type STORY_MESSAGES_PHRASE**. Reverts + re-locks on
  tab-away.

## Env (Railway)
- `STORY_DIARY_KEY` ✅ — AES-256 encryption key (32-byte hex). Never typed; encrypts diary/
  projects/coach/events at rest. **Fail-closed** without it.
- `STORY_MESSAGES_PHRASE` ✅ — the phrase typed to open Messages.
- ~~STORY_DIARY_PHRASE~~ — **no longer needed** (the diary/coach phrase gate was removed).

## Migrations (Supabase)
- `257_story_personal_platform.sql` ✅ run (diary, projects, coach_memory, plan_days, messages_secret).
- `258_story_plan_events.sql` ⏳ **run this** — the planner events table. Until run, the calendar
  shows "couldn't load events" but nothing crashes.

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
- Run migration 258.
- Voice input to the Coach (Whisper) — natural follow-on to "I just speak to it" (not built yet).
- App Store: the covert Messages door is a hidden-feature risk (Apple 2.3.1) — keep the personal
  platform web-only or drop the disguise for any public/commercial build.
