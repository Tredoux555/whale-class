# HANDOFF — Riddick's Sanctuary (multi-space personal platform)

**Status:** ✅ BUILT (Jun 15, 2026, Cowork). Code in repo, **not yet committed/deployed**.
DB migrations 261 + 262 RUN in prod (`dmfncjjtsoxrnvcdnvjq`).
**Goal:** A second sanctuary identical to Tredoux's personal platform, for his son
**Riddick**, at `/riddick`, with **completely separate data** + a private father↔son
message channel. Generalises so a 3rd space (wife) is one login, no new code.

> **THE INVARIANT (held & audited):** Riddick's data and Tredoux's never cross.
> Separation is enforced **server-side from the verified admin token's `space` claim** —
> never from the URL or client. The ONE deliberate bridge is `story_sanctuary_messages`.

---

## What "space" is
A label on every personal row + every admin login. Tredoux = `tredoux` (default —
nothing changed for him). Riddick = `riddick`. The space rides in the admin JWT
(`getAdminSpace()`); every personal read/write is `.eq('space', space)` / `space` on insert.

## DB — migrations (RUN in prod ✅)
- **261_personal_spaces.sql** — adds `space text NOT NULL DEFAULT 'tredoux'` (+ index) to:
  `story_coach_memory, story_coach_log, story_coach_consolidation, story_diary_entries,
  story_projects, story_plan_days, story_plan_events, story_messages_secret`, and to
  **`story_admin_users`** (the personal-platform identity — NOT `story_users`).
- **262_sanctuary_messages.sql** — new `story_sanctuary_messages` (from_space, body_enc,
  cipher_version, created_at, read_at). The father↔son channel.

## Code changed (in repo, NOT yet deployed)
**Auth / space source**
- `lib/story-db.ts` — added `getAdminSpace(authHeader)` → returns the token's `space`
  (defaults `'tredoux'` for legacy tokens; null = deny). `verifyAdminToken` unchanged.
- `app/api/story/admin/auth/route.ts` — login now selects `space` from `story_admin_users`
  and mints it into the JWT (`{ username, role:'admin', space }`).

**Scoped — coach stack** (`space` is now a REQUIRED arg → a missed call site fails the build)
- `lib/story/coach/memory.ts` — loadCoachMemories / writeCoachMemory / recallCoachMemories.
- `lib/story/coach/recent-thread.ts` — loadRecentThread.
- `lib/story/coach/consolidation.ts` — isConsolidationDue / consolidateCoachDay (+ neutral
  "User:" transcript label, was "Tredoux:").
- `lib/story/coach/personal-data.ts` — readDiaryForCoach / readProjectsForCoach /
  computeLoad / wellbeingSignal.
- `lib/story/coach/tool-executor.ts` — `CoachToolDeps.space` added; all helper calls +
  the projects/events/diary inserts/updates scoped.
- `app/api/story/coach/route.ts` — derives `space` via getAdminSpace; threads it through
  memory/thread/consolidation/computeLoad/executeCoachTool; sets `space` on the
  story_coach_log insert; reflect-diary read scoped.

**Scoped — standalone API routes**
- `app/api/story/diary/route.ts`, `diary/[id]/route.ts`
- `app/api/story/projects/route.ts`, `projects/[id]/route.ts`
- `app/api/story/events/route.ts`, `events/[id]/route.ts`
  (each handler derives space after the admin check; every select/insert/update/delete scoped.)

**New surfaces**
- `app/riddick/page.tsx` — Riddick's login door (same auth machinery, lands on
  `/story/admin/coach`). Cosmetic entrance; isolation does not depend on the URL.
- `app/api/story/sanctuary/message/route.ts` — POST send (from caller's space) / GET inbox
  (messages NOT from caller's space) for `story_sanctuary_messages`. Concealed: no UI yet.

## Audit done (static — no compile available in Cowork sandbox)
- All 32 personal-table query sites space-scoped (sweep, 0 unscoped).
- Every caller of the space-required helpers passes `space` (0 old-signature leftovers).
- All `getAdminSpace` imports present.
- 2 catches fixed mid-build: identity is `story_admin_users` (not `story_users`); events
  are `story_plan_events` (not the dead `story_plan_days`).

## TO GO LIVE
1. Migrations 261 + 262 — ✅ already run in prod.
2. **`npm run build` locally** to typecheck (couldn't compile in-sandbox), fix any errors.
3. Create Riddick's login (password set by Tredoux; bcrypt rounds 10):
   `node -e "console.log(require('bcryptjs').hashSync('PW',10))"` →
   `UPDATE story_admin_users SET password_hash='<hash>', space='riddick' WHERE username='riddick';`
   (or INSERT if the row doesn't exist yet).
4. **Commit + deploy.** Until deploy, `/riddick` 404s and the app isn't reading `space`.
5. Visit **`teacherpotato.xyz/riddick`** → sign in → his sealed sanctuary.
   (NOT montree.xyz — the sanctuary lives on the teacherpotato/Whale-Class domain.
   `middleware.ts` now lists `/riddick` + `/story` in WHALE_ONLY_PREFIXES so they
   redirect OFF montree.xyz, and `/riddick` is in publicPaths so the door loads.)

## Known follow-ups (not blockers)
- **Per-space persona:** the coach's system prompt + profile still say "Tredoux" by name,
  so Riddick sees that until the persona/profile are made space-aware. Cosmetic.
- **Message channel UI:** plumbing only; concealed by design ("he doesn't need to know it
  exists yet"). Surface it (a hidden door for Riddick to write; an inbox view for Tredoux)
  when ready.
- **Wife / 3rd space:** add a `story_admin_users` row with a new `space` label. Zero new code.
- **Per-space RLS policies:** optional defence-in-depth on top of the app-layer scoping.
