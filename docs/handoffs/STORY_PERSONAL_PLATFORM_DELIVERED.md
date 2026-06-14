# Personal Platform — BUILT (Jun 14, 2026, Cowork)

Built from `STORY_PERSONAL_PLATFORM_BUILD.md`. `/story/admin` is now Tredoux's
private **Diary + Planner + Projects + AI Life-Coach**, with the existing Story
comms **hidden** behind a long-press + secret-phrase gate on the diary logo.

Every step was audited (ESLint `--max-warnings=0` + scoped `tsc`) before moving on.
All new code is lint-clean and type-clean. Dashboard pre-existing warnings/type-debt
were left untouched (load-bearing comms file).

## IA (final): Planner front, two secret doors
Log in → **Planner/calendar** (the innocuous front). Two separate hidden doors, each
its own phrase:
- **Long-press the "Sanctuary" LOGO (top-left) 2s → phrase A → Diary.**
- **Long-press the MONTH TITLE (e.g. "June 2026") 2s → phrase B → Messages.**
Visible nav = Planner · Projects · Coach. Tab away/background → reverts to Planner and
re-locks both doors. The calendar shows NO diary content (so the login alone never
exposes the diary).

## 🚨 DEPLOY ORDER (this order — the IA change gates Diary + comms)
1. **Run migration 257** in Supabase SQL Editor (`migrations/257_story_personal_platform.sql`). ✅ done
2. **Set `STORY_DIARY_KEY`** (Railway) — 32-byte hex:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. ✅ done
3. **Set `STORY_MESSAGES_PHRASE`** (Railway) — phrase B (opens Messages). ✅ done
4. **Set `STORY_DIARY_PHRASE`** (Railway) — phrase A (opens the Diary). ← NEW, still needed.
5. **Push to `main`** (Railway auto-deploys). Until 1–4 are set, do NOT push, or the
   Diary + Messages doors can't open and the diary pages error.

## What shipped
- `migrations/257_story_personal_platform.sql` — story_diary_entries, story_projects,
  story_coach_memory, story_plan_days, story_messages_secret (RLS deny-all).
- `lib/story/diary-crypto.ts` — AES-256-GCM at-rest via `STORY_DIARY_KEY` (fail-closed).
- Diary: `/api/story/diary` (+`/[id]`) + pages (front list, markdown editor, autosave,
  mood, edit/preview, Reflect→Coach, delete).
- Projects: `/api/story/projects` (+`/[id]`) + cards page (add/edit/status/priority).
- Coach (Sonnet): `lib/story/coach/*` — 14-book knowledge base, encrypted memory,
  10 tools, prime-directive + therapist-lens system prompt; `/api/story/coach` SSE
  loop (keepalive, full-transcript accumulation, empty-response recovery, forced
  summary); Coach page + floating `CoachFloat` on every screen.
- Planner: gentle month calendar (mood dots) + "plan day/week" hand-off to Coach.
- IA: `(personal)` route-group layout (auth guard, 15-min idle logout, nav, revert-
  on-hide); login lands on `/story/admin/diary`.
- Hidden Messages: `HiddenMessagesGate` (long-press logo 2s → phrase → `/api/story/messages/unlock`
  mints a 1h token) + dashboard guard + revert-on-hide. Existing comms reused as-is.

## How to use Messages after deploy
Long-press the "Sanctuary" logo (top-left) for 2 seconds → type your `STORY_MESSAGES_PHRASE`
→ Enter. You land in the comms dashboard. Tab away / background the app → it reverts to the
Diary and re-locks (phrase needed again).

## Privacy posture (as specced)
Single tier; the Coach reads everything by design. Encrypted at rest (server holds the key).
Not E2E — obscurity + the phrase gate + the Story login are the shield.
