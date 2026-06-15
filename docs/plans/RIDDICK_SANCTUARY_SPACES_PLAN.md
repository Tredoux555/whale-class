# Riddick's Sanctuary — "Spaces" build plan

*A second sanctuary, identical to Tredoux's personal platform, for his son Riddick — at its own
entrance, with its own walled-off data. Designed so adding a third (wife) later is one step, no new code.*

> **The one principle everything serves:** Riddick's space and Tredoux's space must **never** see
> each other's data. Separation is enforced on the **server, from the logged-in identity** — never
> from the URL (a URL is spoofable; a session is not). "Minus the story system link" = no shared
> data, no shared login, no cross-links in the nav.

---

## 1. The model: a `space`

Today the personal platform is implicitly single-user — every row is "Tredoux's." We introduce one
idea: a **`space`** label on personal data.

- Tredoux's existing world becomes space **`tredoux`** (the default — nothing changes for him).
- Riddick gets space **`riddick`**.
- A future wife space is just **`erin`** (or whatever) — same code, one new login.

The space a request belongs to is decided by **who is logged in**, carried in the auth token, and
applied to every read and write. The client never chooses its own space.

---

## 2. Schema changes (one migration)

Add a `space` column to each of the 7 personal tables, default `'tredoux'` so all existing rows stay
yours automatically:

- `story_coach_memory`
- `story_coach_log`
- `story_coach_consolidation`
- `story_diary_entries`
- `story_projects`
- `story_plan_days`
- `story_messages_secret`

```sql
-- For each table:
ALTER TABLE <table> ADD COLUMN IF NOT EXISTS space text NOT NULL DEFAULT 'tredoux';
CREATE INDEX IF NOT EXISTS idx_<table>_space ON <table> (space);
-- existing rows are already 'tredoux' via the default — no backfill needed.
```

Identity: `story_users` gains a `space` column mapping each login to exactly one space.

```sql
ALTER TABLE story_users ADD COLUMN IF NOT EXISTS space text NOT NULL DEFAULT 'tredoux';
-- Tredoux's existing user stays 'tredoux'. Riddick's new user row = 'riddick'.
```

This migration is **safe to run anytime**: it changes no behaviour on its own (everything is still
`tredoux` until the app starts reading the column).

---

## 3. Identity & auth

- `verifyAdminToken()` already resolves a token → user. Extend it to also return that user's **space**.
- Every personal API route then derives `space` from the verified token and passes it down — to
  `loadCoachMemories`, `writeCoachMemory`, `loadRecentThread`, `consolidateCoachDay`, the diary,
  projects, planner, and messages helpers.
- **Never** read `space` from the request body or URL.

---

## 4. API scoping (the careful part)

Every personal query gets a `space` filter; every insert sets `space`. The functions to touch:

- `lib/story/coach/memory.ts` — `loadCoachMemories`, `writeCoachMemory`, `recallCoachMemories`.
- `lib/story/coach/recent-thread.ts` — `loadRecentThread` (add `.eq('space', space)`).
- `lib/story/coach/consolidation.ts` — `isConsolidationDue`, `consolidateCoachDay` (scope reads,
  set `space` on the diary recap + audit row).
- `app/api/story/coach/route.ts` — thread it through; also set `space` on the `story_coach_log` insert.
- `lib/story/coach/tool-executor.ts` — diary + projects + planner inserts/reads.
- The diary / projects / planner / messages API routes under `app/api/story/...`.

**Pattern:** make `space` a required parameter on these helpers (not optional with a default) so a
missed call site fails the type-check rather than silently leaking into `tredoux`.

> ⚠️ Note: the memory-consolidation feature just built (recent-thread + consolidation) currently
> queries `story_coach_log` with **no** space filter. Scoping it is part of THIS work — until then it
> must not ship alongside a second space.

---

## 5. Routing / the entrance

- Riddick logs in at his own door — **`/riddick`** (a themed login that posts to the same auth,
  authenticating his `story_users` row). On success his token carries `space = 'riddick'`.
- The existing personal pages (`/story/admin/(personal)/…`) render whatever space the token says —
  so the same Coach / Planner / Diary UI simply shows Riddick's data when Riddick is logged in.
- No nav link anywhere connects the two spaces. Each is reached only by logging into its own door.

---

## 6. Isolation safety checklist (do not skip)

RLS is enabled on these tables but has **no policies** — the server (service role) does the scoping,
so the app code is the wall. Before Riddick's space goes live:

- [ ] Every personal read has `.eq('space', space)`.
- [ ] Every personal insert sets `space`.
- [ ] `space` is sourced only from the verified token, never the client.
- [ ] Helper signatures make `space` **required** (compile-time safety net).
- [ ] Manual test: log in as Riddick → Coach/Diary/Projects are **empty**; create data; confirm it
      does **not** appear in Tredoux's space, and vice-versa.
- [ ] Consider per-space RLS policies later for defence-in-depth.

---

## 7. Rollout (staged, reversible)

1. **Migration** — add `space` columns (no behaviour change). ✅ safe.
2. **Auth** — token carries space; default everyone to `tredoux`. Still single-space in practice.
3. **Scope reads/writes** — thread `space` through all helpers/routes. Tredoux unaffected (still `tredoux`).
4. **Riddick's door** — create his `story_users` row (space `riddick`) + the `/riddick` login.
5. **Verify isolation** — run the checklist above.
6. **Wife later** — repeat step 4 with a new space. No new code.

---

## 8. Honest scope

This is a real feature, not a copy-paste: one migration, an auth tweak, and careful `space`-scoping
across ~8 files, plus a login entrance. The risk that matters is data isolation, which the staged
rollout + the checklist are designed to protect. Tredoux's existing experience is unchanged throughout
(he stays in space `tredoux` the whole time).

*Built for Riddick — a space that's safe, and entirely his.*
