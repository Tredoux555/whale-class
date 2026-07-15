# PLAN — COACH CLOCK + PUSH REMINDERS — Jul 15, 2026 — BINDING CONTRACT

> **✅ BUILT + AUDITED same day (sacred flow: 2 parallel Opus builds → 2 independent Sonnet
> audits — montree SHIP clean, lyfcoach FIXED-NOW-SHIP with 2 cron fixes: recurrence
> try/catch so one bad tz can't abort the sweep + email fallback requires email_verified).**
> Gates: montree eslint 0/0 + scoped tsc clean (pre-existing libsodium TS7016 only);
> lyfcoach tsc exit 0 on the Mac; local `next build` fails on the Mac at HEAD too
> (pre-existing Node-22 quirk, /_not-found prerender useState-null) — **Railway (Node 20)
> builds and deploys this stack fine, verified live** (new routes answer on lyfcoach.co).
> ⏳ OWED: migration 296 (montree Supabase) + 0001_init block (lyfcoach Supabase) ·
> lyfcoach Railway envs CRON_SECRET + LC_VAPID_* · cron-job.org 5-min jobs on both
> dispatch routes · enable notifications on device (bell on montree lyf-coach page /
> Settings→Reminders card on lyfcoach) · live test a reminder.

Fable-authored. Applies to BOTH repos (montree legacy coach + lyfcoach-web), same pattern.
Follows directly on PLAN_DIARY_RECALL_JUL15.md (shipped earlier today).

## §0 Tredoux's ask (locked)
1. **Sense of time** — the coach thinks a 5-hour-old exchange is "the same moment." Give it an internal clock.
2. **Reminders** — the coach should manage his schedule and PUSH notifications/reminders to him.

## §1 Ground truth (scouted — trust these)
- Both routes already build a per-turn `todayLabel` ("Wednesday, July 15, 2026, 14:32 (in the afternoon)") from client-sent `client_tz`/`client_now` → system prompt "Today is …". The CLOCK EXISTS; what's missing is ELAPSED-TIME awareness.
- `loadRecentThread` (both repos) strips `created_at` — replayed turns are bare `{role, content}`. No gap signal anywhere.
- NO persisted per-user timezone (`story_admin_users` has no tz column) — a cron can't compute a user's local time.
- montree push: `web-push` npm dep + `lib/story/push.ts` (VAPID via `STORY_VAPID_PUBLIC_KEY`/`_PRIVATE_KEY`/`_SUBJECT`, all set in Railway) + `public/story-sw.js` (push + notificationclick) + subscribe route pattern (`app/api/story/push/*`, `components/story/EnableNotificationsButton.tsx`). But `story_push_subscriptions` is keyed by USERNAME (Story chat), and the lyf-coach pages never register any SW. `story_member_push_subscriptions` (space-keyed) is the shape to mirror.
- lyfcoach-web: NO service worker, NO web-push dep, NO cron anywhere. Has `app/manifest.ts`, Resend helper pattern (`email-verification.ts`, `verifyFrom()` chain), `lib/admin-auth.ts` `isAdminRequest` (fail-closed timing-safe header check), Settings page card idiom, coach-page nudge scaffolds.
- Cron precedent (montree): `app/api/story/cron/expire-media/route.ts` — `x-cron-secret` header vs `CRON_SECRET` env, admin fallback, `dry_run`. Copy it.
- `story_plan_events` (both): event_date/start_time/title_enc/notes_enc + space. No reminder columns; only `add_event` tool exists; /planner read-only.
- montree next migration: **296** (+letters). lyfcoach: append to `0001_init.sql` + live SQL in chat.
- ⚠️ lyfcoach `web-push` + `@types/web-push` will be installed on the Mac by the director via Desktop Commander BEFORE the build verifies tsc — builder just imports it (dynamic import fine).

## §2 PART A — SENSE OF TIME (both repos)

### A1. Timestamps in the replayed thread
`loadRecentThread` gains an optional `tz?: string` opt. Each reconstructed USER message content is prefixed with a compact marker line:
`[Sent: Mon 14 Jul, 21:40]` (formatted in tz when given, else UTC + " UTC"), then a blank line, then the original text. Assistant messages untouched (prefixing them makes the model start writing timestamps itself). Marker built once per row from `created_at`, which the query already selects.

### A2. "Last exchange" line in the system prompt
In the route, alongside the existing `todayLabel`: compute the newest `story_coach_log.created_at` for the space (the recent-thread rows already carry it; when the thread is EMPTY, do one tiny `.select('created_at').order desc limit 1` — space-scoped). Pass a new `timeSinceLabel` opt into the system prompt:
- <5 min → "You are mid-conversation (last exchange moments ago)."
- else → "Your previous exchange with them was N hours/days ago (their local time then: <short datetime>)." First-ever conversation → "This is your first conversation."

### A3. Prompt rule (adult + child)
New short block near `Today is …`: "TIME AWARENESS: Every past user message carries its [Sent: …] timestamp, and you know how long it's been since the last exchange. Treat gaps as real time passed — if hours or days went by, it is NOT the same moment: things happened, moods changed, plans moved. Re-orient naturally ('earlier today', 'yesterday', 'last week') instead of continuing as if mid-sentence. Never ignore a large gap."

### A4. Persist timezone (feeds Part B's cron)
- Migration: `ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS timezone TEXT;`
- In the coach route, fire-and-forget (inside an existing after()/void chain): when `clientTz` is valid, update `story_admin_users.timezone` for this space's user if different. Cheap, idempotent, never blocks.
- OUT OF SCOPE (deferred, do NOT touch): consolidation's server-midnight boundary.

## §3 PART B — REMINDERS + PUSH

### B1. Schema (both DBs; montree = migrations 296*, lyfcoach = 0001_init append)
```sql
CREATE TABLE IF NOT EXISTS story_coach_reminders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space          text NOT NULL,
  remind_at      timestamptz NOT NULL,
  tz             text,                      -- tz used to interpret/spoken-schedule it
  message_enc    text NOT NULL,             -- encrypted like everything else (diary-crypto)
  recurrence     text,                      -- NULL | 'daily' | 'weekdays' | 'weekly' | 'monthly'
  status         text NOT NULL DEFAULT 'pending',  -- pending | sent | cancelled
  delivered_via  text,                      -- push | email | none
  created_at     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz
);
-- index (space, status, remind_at); index (status, remind_at) for the cron sweep
CREATE TABLE IF NOT EXISTS story_coach_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL, auth text NOT NULL,
  user_agent text, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);
-- index on (space); RLS enable, deny-all (service role only) — house style
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS timezone TEXT;
```
Both new tables: RLS enabled, no policies. Add both to lyfcoach `purge-space.ts` SPACE_TABLES (and to montree's purge path if one exists — scout: montree has no purge-space; skip there).

### B2. Coach tools (both repos, adult; child gets set/list/cancel too — own space only)
- `set_reminder { message, when (ISO local datetime or YYYY-MM-DDTHH:MM), recurrence? }` — executor resolves `when` IN `deps.tz` (fallback stored tz, then UTC) to a UTC `remind_at`; rejects past times (>2 min ago) with a helpful error; encrypts message; inserts pending. Returns id + confirmation with the LOCAL time it will fire.
- `list_reminders {}` — pending (and last 5 sent) for the space, decrypted, local-time formatted.
- `cancel_reminder { id }` — space-scoped update to cancelled.
- Tool descriptions must teach the model: confirm date+time explicitly with the user's tz; use set_reminder whenever the user asks to be reminded/nudged/woken; offer reminders when the user mentions a future commitment.

### B3. Schedule awareness in the prompt (both repos)
New `upcomingSection` loaded per turn (parallel with memories, fail-soft): next 7 days of `story_plan_events` (space-scoped, decrypt titles, ≤10) + pending reminders ≤10, rendered as a compact "UPCOMING (their schedule)" block with local datetimes. This is what lets the coach MANAGE the schedule, not just store it.

### B4. Push plumbing
- **montree:** reuse `web-push` + STORY_VAPID_* + `lib/story/push.ts` — add `sendCoachPush(space, {title, body, url})` reading `story_coach_push_subscriptions`, pruning 404/410 (mirror sendBoardPush). SW: extend/reuse `public/story-sw.js` pattern — create `public/coach-sw.js` (push + notificationclick → opens `/lyf-coach/coach`), registered from the lyf-coach coach page. Subscribe route `app/api/story/coach/push/subscribe` (story auth → space from verified token). Enable-UI: small bell button/banner on `app/lyf-coach/(app)/coach/page.tsx` ("Enable reminders") → permission → subscribe → POST. (Mirror into `app/montree/lyf-coach` ONLY if that page is the live one — check which route montree.xyz actually serves; wire the live one.)
- **lyfcoach-web:** add `web-push` dep (director installs). New `lib/story/coach/push.ts` (VAPID from `LC_VAPID_PUBLIC_KEY`/`LC_VAPID_PRIVATE_KEY`/`LC_VAPID_SUBJECT`, fail-open unconfigured), `public/coach-sw.js`, `GET /api/push/public-key`, `POST /api/push/subscribe` (authed via existing bearer/cookie helper → space), client helper + **Settings → new "Reminders" card** (enable/disable, status) + a one-time banner on /coach when a pending reminder exists but no subscription for the space ("Enable notifications so I can actually reach you"). iOS note in UI copy: must be installed to Home Screen for notifications (reuse AddToHomeNudge language).
- **manifest/PWA:** no manifest changes needed for web push; do NOT add a fetch handler to the SW (no caching — keep it push-only, avoids stale-shell bugs).

### B5. Dispatch cron (both repos)
Route `app/api/story/cron/send-reminders/route.ts` (montree) / `app/api/cron/send-reminders/route.ts` (lyfcoach), POST+GET, gated `x-cron-secret === process.env.CRON_SECRET` (fail-closed; lyfcoach adds the tiny `isCronRequest` helper mirroring `isAdminRequest`). Logic per run:
1. Select due: `status='pending' AND remind_at <= now()` limit 50, oldest first.
2. Per reminder: decrypt message → `sendCoachPush(space, …)`; if 0 subscriptions or all sends fail → email fallback (Resend helper; to = the space's `story_admin_users.email` when present and verified-ish; from = existing chain). Record `delivered_via` ('push'|'email'|'none').
3. Mark `status='sent', sent_at=now()` REGARDLESS of delivery outcome (never re-spam a broken endpoint); if `recurrence`, insert the next occurrence (computed in the reminder's `tz`, e.g. daily → +1 day same local time; weekdays → next Mon–Fri; weekly → +7d; monthly → same day next month, clamp to month end).
4. Return `{due, pushed, emailed, undelivered}` counts. `dry_run=1` supported. Idempotent under overlapping invocations (claim rows via `UPDATE … SET status='sent' … WHERE id = … AND status='pending'` check-and-act before sending, or select-then-conditional-update — no double-fire).
Push payload: `{ title: 'Lyf Coach', body: <message ≤180 chars>, url: <coach page> }`. Notification body is the user's own reminder text — that's the point; document that push payloads transit Apple/Google push services in plaintext-to-them (standard Web Push encryption applies in transit; acceptable).

### B6. Env + external trigger (Tredoux steps — deliver in chat)
- montree Railway: `CRON_SECRET` already exists (expire-media uses it) — confirm; reuse.
- lyfcoach Railway: add `CRON_SECRET`, `LC_VAPID_PUBLIC_KEY`, `LC_VAPID_PRIVATE_KEY` (generate via `npx web-push generate-vapid-keys`), optional `LC_VAPID_SUBJECT`.
- External cron: cron-job.org (free) hitting both dispatch routes every 5 minutes with the header. Exact setup steps in chat.

## §4 Hard invariants
1. Every read/write space-scoped; space from verified JWT only. Cron route is the ONLY cross-space reader and it never returns content to the caller (counts only).
2. Family/marriage brains and family context paths gain NOTHING. A child's reminders live in the child's own space; parents cannot read them (no list API beyond the coach tool).
3. Reminder messages encrypted at rest (message_enc). Decrypted only in the executor (own space) and the cron sender.
4. Fail-open: VAPID unconfigured → subscribe UI hides/says unavailable, cron falls to email/none; Resend unconfigured → 'none'. Nothing ever throws into the coach stream.
5. Metering/model-pin (lyfcoach), consolidation, recent-thread SEMANTICS (only additive timestamp prefix + tz param), diary-recall feature — untouched beyond specified edits.
6. No SW fetch/caching handlers. No manifest rewrites.
7. Timestamps prefix USER messages only; format exactly `[Sent: Ddd DD Mon, HH:MM]`.
8. `.eq('space', …)` on the timezone update; never trust a body-supplied space.

## §5 Gates
- tsc + eslint clean (lyfcoach full tsc; montree scoped). lyfcoach `next build` attempted; if sandbox EPERM, director runs it on the Mac via Desktop Commander.
- Paper walks: (1) "remind me to call mom at 6pm" at 14:00 Beijing → remind_at 10:00 UTC, fires within 5 min of 18:00 CST; (2) 5-hour gap → next turn shows [Sent:] stamps + "5 hours ago" line; (3) daily recurrence rolls correctly across a month boundary; (4) overlapping cron invocations can't double-send.
- SQL + env + cron setup steps pasted in chat for Tredoux.
