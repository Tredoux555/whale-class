# Potato Snaps — Builder 1 (app) build notes

Built against the binding contract (`/home/claude/POTATO_SNAPS_CONTRACT.md`) + the
approved design spec (`POTATO_SNAPS_DESIGN_SPEC.html`, `POTATO_SNAPS_PHILOSOPHY.md`)
+ the two scout reports. Everything below is repo-relative under
`/home/claude/build/potato/`.

**`potato-worker/` in this tree belongs to Builder 2. I did not create, read or
modify anything inside it.**

---

## 1. Migration number — CORRECTED

The contract said "verify 309 is the next free number". **It is not.**
`migrations/309_teachers_room.sql` already exists; the highest migration in the
repo is `317_montree_org_director_logins.sql`.

**This build ships `migrations/318_potato_snaps.sql`.** Builder 2 and the SQL
handed to Tredoux must both say 318.

---

## 2. Files (34 new + 1 edited)

### Migration (1)
- `migrations/318_potato_snaps.sql` — 6 `tp_*` tables, RLS enabled with zero
  policies (deny-all, service-role only), private `potato-snaps` bucket,
  idempotent, wrapped in BEGIN/COMMIT, with a verify query in a trailing comment.

### Library (6)
- `lib/potato/week.ts` — the timezone-correct week engine (see §4).
- `lib/potato/auth.ts` — jose HS256 on `ADMIN_SECRET`, `potato_teacher` /
  `potato_parent` cookies with `aud` claims, HQ constant-time compare,
  best-effort in-memory rate limiter.
- `lib/potato/codes.ts` — 6-char A–Z2-9 codes from `crypto.randomInt`, collision-retry.
- `lib/potato/db.ts` — class/child loaders with ownership gates, the single
  shared week-photo query, `isSetupPending`, `proxyUrl`.
- `lib/potato/client.ts` — browser fetch helpers; every one checks `response.ok`
  before parsing and maps `setup_pending` to a human sentence.
- `lib/potato/ui.ts` — the stylesheet, ported verbatim from the approved spec.

### API routes (14)
| Route | Methods |
|---|---|
| `app/api/potato/auth/teacher/route.ts` | POST |
| `app/api/potato/auth/parent/route.ts` | POST |
| `app/api/potato/auth/logout/route.ts` | POST |
| `app/api/potato/board/route.ts` | GET |
| `app/api/potato/photos/upload/route.ts` | POST |
| `app/api/potato/photos/route.ts` | GET |
| `app/api/potato/photos/[id]/route.ts` | DELETE |
| `app/api/potato/children/route.ts` | GET, POST, PATCH |
| `app/api/potato/children/[id]/face/route.ts` | POST |
| `app/api/potato/parent-codes/route.ts` | GET, POST |
| `app/api/potato/montage/route.ts` | POST |
| `app/api/potato/montages/route.ts` | GET |
| `app/api/potato/media/proxy/[...path]/route.ts` | GET, HEAD |
| `app/api/potato/hq/classes/route.ts` | GET, POST |

Every route calls its own verifier first — `/api/potato/*` is not in the
middleware matcher and gets zero ambient protection. Every route maps
42P01/42703 to a clean `503 {error:'setup_pending'}` so the whole product
degrades politely before the migration is run.

### Components (3)
- `components/potato/CameraCapture.tsx` — adapted from
  `components/montree/media/CameraCapture.tsx`. Kept: the landscape 140px right-edge
  rail with `-rotate-90` labels, pinch zoom (native track first, digital fallback
  with a matching capture crop), the getUserMedia timeout ladder incl. stopping a
  late-resolving stream, safe-area padding. Removed: video mode + MediaRecorder,
  the Capacitor native camera/album paths (they live under `lib/montree/platform`),
  `useI18n`.
- `components/potato/PotatoBits.tsx` — mascot, 9 icons, avatar (stable per-child tint).
- `components/potato/CodeEntry.tsx` — six boxes painted from one visually hidden
  input, so paste/backspace/mobile keyboards keep working.

### Pages (10)
`app/potato/layout.tsx`, `page.tsx` (chooser), `teacher/login`, `teacher`
(Capture Board), `teacher/children`, `teacher/codes`, `teacher/photos/[childId]`,
`parents`, `parents/home`, `hq`.

### Edited (1)
- `middleware.ts` — full file, two surgical changes and nothing else:
  1. `'/potato'` appended to `WHALE_ONLY_PREFIXES` (montree.xyz `/potato*` →
     `https://www.teacherpotato.xyz/potato...`).
  2. `'/potato'` appended to `publicPaths` (without it the legacy Supabase-role
     gate silently 302s every anonymous visitor to `/`).
  Verified by diff: 2 hunks, both additive.

---

## 3. Contract deviations (all deliberate, all listed)

1. **Migration 318, not 309** — 309 is taken (§1 above).
2. **Proxy caching is `private`, not public/CDN.** Montree's proxy sets
   `public, s-maxage=…` because its buckets are public; `potato-snaps` is
   private, so a shared CDN copy of a child's face or a family's film would be
   readable by anyone with the URL, auth bypassed. Responses are
   `private, max-age=600, must-revalidate` and are never stored by Cloudflare.
   Range/206 passthrough and streaming are unchanged.
3. **Parents cannot fetch raw photos through the proxy.** The contract's rule was
   "a montage/photo of their childId", but a photo's storage path carries no
   child id (`class/<cid>/photos/<yyyy>/<mm>/<uuid>.jpg`), so ownership is
   unprovable from the path — and one shot may contain four other people's
   children. Parents get **their own child's** faces and montages only. The
   parent UI never requests a photo, so nothing is lost.
4. **`tp_parent_codes.child_id` is UNIQUE.** "One code per child" is now a
   database fact, which makes the mint race safe (loser gets 23505 and reads back
   the winner's row) and lets the read use `.maybeSingle()` honestly.
5. **A photo must be tagged with at least one child** (400 otherwise). An
   untagged photo counts for nobody and can never reach a montage; the Save
   button is disabled at zero.
6. **A second montage tap while one is `queued`/`processing` returns the running
   job** instead of stacking a duplicate render. Re-runs after `done`/`failed`
   still create a new row, as the contract requires.
7. **Face photos are stored at a fixed `faces/<childId>.jpg`** with `upsert`
   (the contract's path), carrying the real content type. Re-uploads leave no
   orphans and need no cache bust.
8. **`tz` amendment applied** — `tp_classes.tz text not null default
   'Asia/Shanghai'`, plus an `ADD COLUMN IF NOT EXISTS` for re-runs.
9. **HQ rate limit raised to 120/15min** (login doors stay at 12) — HQ legitimately
   calls GET on unlock and again after every class created.

---

## 4. The week engine (contract §11 gate)

`lib/potato/week.ts` is pure and isomorphic. Clients compute their own local
Monday from calendar fields (`getFullYear/getMonth/getDate/getDay`) and send
`weekStart=YYYY-MM-DD`; the server validates the shape, snaps it to a Monday, and
converts to a half-open UTC instant range **in the class timezone** using a
two-pass DST offset probe. When no `weekStart` arrives the server defaults to the
current week *in the class timezone*, never the server's UTC clock.

`toISOString()` is never used to build a date key anywhere in this build.

**Harness: 27 assertions, 27 passed.** Covers: Sunday 07:00 in UTC+8 staying in
the correct week (the exact Montree bug), Monday 00:30 UTC+8 starting the new
week while a UTC classroom is still in the old one, inclusive/exclusive
boundaries, the New York spring-forward week being 167 hours and the fall-back
week 169, mid-week/Sunday snap-back, rejection of `2026-2-31` and
`2026-01-01' OR 1=1--`, unknown timezones degrading to UTC, month/year/leap-day
rollovers, and storage folders following the class calendar rather than UTC.

---

## 5. Verification performed

- **Typecheck: 0 errors across all 33 new TS/TSX files.** Run with real
  `typescript@5.9.3 / next@16.1.1 / react@19.2.0 / @types/react@19 / jose@5.10.0`
  against a scoped project mirroring the repo's compiler options and its
  `"@/*" → "./*"` path mapping, with a stub only for `@/lib/supabase-client`.
- **`middleware.ts` compared against the untouched original under the same
  config: identical error set** (5, all artifacts of the stubbed
  `@supabase/supabase-js`), line-shifted by the added comments only. My edit
  introduces nothing.
- **Greps clean** (matches are comments only): no `montree_` table name, no
  `lib/montree/*` import, no `useI18n`/`t(` call, no `<style jsx>`, no `.single(`,
  no `.ilike(`.
- **House rules checked**: `.maybeSingle()` everywhere; `response.ok` before every
  parse; every fire-and-forget promise carries a real rejection handler; every
  sticky top bar carries `env(safe-area-inset-top)`; apostrophes in JSX sit inside
  expression containers so `react/no-unescaped-entities` cannot fire.
- **Not run here** (no repo checkout in this container): the repo's own eslint and
  `next build`.

---

## 6. Open risks / owed

1. **eslint + `next build` still owed on the Mac.** Typecheck is clean but a green
   typecheck is not a working feature (the Jun-14 rule).
2. **The in-memory rate limiter is per server instance** and fails open. It is a
   speed bump; the real protection is the 34⁶ ≈ 1.5-billion code space.
3. **Cap–check race on nothing here, but note the `.in()` chunking**: the week
   query pages photos at 500 and chunks the junction `.in()` at 500 for the same
   reason Montree's class-progress route truncates — do not "simplify" either.
4. **Shared pins Builder 2 must match**: table/column names per §2 of the
   contract; storage paths `class/<classId>/{faces,photos,montages}/…`; status
   enum `queued|processing|done|failed`; `week_start` = local Monday `DATE`;
   `media_ids` is oldest-first and IS the order of the film; the worker writes
   `storage_path` + `completed_at` on success and `error` on failure (no callback
   route exists — the board polls).
5. **Live walk owed after deploy** on `www.teacherpotato.xyz`: create a class in
   HQ → teacher code login → add child + face → capture 8 → bar flips gold →
   Make montage → worker renders → mint a parent code → parent login → film plays
   (with a seek, to prove Range/206 through the private-bucket proxy).
