# Potato Snaps v1.1 — Builder 1 (app) build notes

Built against `/home/claude/POTATO_SNAPS_V11_ADDENDUM.md` (binding) + the updated
11-tab `POTATO_SNAPS_DESIGN_SPEC.html`. Grounded on the REAL repo state: the v1.0
files were re-staged from the Mac and verified byte-identical to what shipped
(commit cc324b32) before being edited, so every "changed" file below is a full
edit of the live version, not of my memory.

`scenes.js` was NOT shipped — it is the designer's mock vignette library. Only
the mascot survives, at sticker scale, in empty states.

---

## 1. Migration number

Verified on the Mac: `migrations/` tops out at **318_potato_snaps.sql** (v1.0).
Next free is **319** → `migrations/319_potato_snaps_v11.sql`.

**No `storage.*` statements are in it.** The Aug 7 lesson (a storage-schema write
rolls the whole transaction back on this project's permissions) is written into
the file header. The bucket already exists.

Both CHECK constraints are added inside `DO $$ ... IF NOT EXISTS` blocks, because
`ADD CONSTRAINT` has no `IF NOT EXISTS` and a second run would otherwise abort.

---

## 2. Files — 27 code files: 9 NEW, 18 CHANGED

### NEW (9)
| File | What |
|---|---|
| `migrations/319_potato_snaps_v11.sql` | kind / child_id nullable / excused_child_ids / 3 branding columns |
| `lib/potato/classfilm.ts` | the class-film validation rule, pure + harnessed |
| `app/api/potato/class-film/route.ts` | GET picker payload, POST queue the render |
| `app/api/potato/branding/emblem/route.ts` | teacher uploads the class emblem |
| `app/api/potato/hq/classes/[id]/route.ts` | HQ PATCH school name |
| `app/api/potato/hq/classes/[id]/logo/route.ts` | HQ uploads the school logo |
| `app/potato/teacher/class-film/page.tsx` | the picker (design tab 07) |
| `app/potato/teacher/branding/page.tsx` | emblem upload + locked school row + 3 previews (tab 09) |
| `components/potato/Lightbox.tsx` | full-screen swipeable viewer (tab 11) |

### CHANGED (18) — full edited versions included
| File | What changed |
|---|---|
| `lib/potato/db.ts` | `potatoCapabilities()` feature probe, branding on `PotatoClass`, `brandingOf`/`initialsFor`, `tagsByPhoto` on the week query |
| `lib/potato/week.ts` | `dayLabelInZone` / `dayKeyInZone` (class-tz day grouping) — additive only |
| `lib/potato/ui.ts` | +v1.1 CSS (picker, film card, branding, feed v2, lightbox) +v1.2 warmth pass |
| `components/potato/PotatoBits.tsx` | 7 new icons; `SchoolMark` / `EmblemMark` with initials fallback |
| `app/api/potato/board/route.ts` | class-film state + branding, both feature-gated |
| `app/api/potato/montages/route.ts` | one mixed feed (class + child), branding, legacy `montages` key kept |
| `app/api/potato/auth/parent/route.ts` | returns `schoolName` + `initials` so a returning parent's sign-in is branded |
| `app/api/potato/media/proxy/[...path]/route.ts` | `montages/class/*` for any parent of the class; `branding/*` for teacher or parent |
| `app/api/potato/hq/classes/route.ts` | surfaces branding paths, `montages`→`films` |
| `app/api/potato/photos/route.ts` | day label, tags per photo, roster (lightbox needs) |
| `app/api/potato/photos/[id]/route.ts` | +PATCH retag (kept the audit's class-active re-check) |
| `app/potato/teacher/page.tsx` | class-film card, emblem header, Branding menu item, film wording |
| `app/potato/teacher/photos/[childId]/page.tsx` | lightbox wired in |
| `app/potato/parents/page.tsx`, `app/potato/parents/home/page.tsx`, `app/potato/teacher/children/page.tsx`, `app/potato/teacher/codes/page.tsx`, `app/potato/hq/page.tsx` | school branding, feed v2, copy diet |

(The last row groups 5 pages. Machine-verified against the live repo: **9 new, 18 changed, 27 files** + these notes.)

---

## 3. Pre-migration safety (the explicit requirement)

`potatoCapabilities()` probes `tp_montage_jobs(kind, excused_child_ids)` and
`tp_classes(school_name, school_logo_path, emblem_path)` with two `limit(0)`
selects, cached per process. `true` is cached forever (a column cannot
un-exist); `false` is re-checked every 30s, so the app lights up **within half a
minute of the migration running, with no redeploy**.

- **board** and **montages** degrade to exactly v1.0 output — no class-film card,
  no branding, child films only. A teacher's daily screen and a parent's feed
  never break in the deploy window.
- **42P01** (missing *table*) still propagates → the v1.0 `setup_pending` 503.
- Genuinely new surfaces (picker, branding uploads) return `setup_pending`,
  because for them there is nothing honest to degrade to.
- Verified by a mock-client harness: 13/13, including a partial migration where
  only one of the two tables is patched.

---

## 4. Deviations (all deliberate)

1. **Migration 319, not "≥319 TBD"** — verified, 318 is the last used.
2. **Parent sign-in branding is text + initials only.** Before a code is typed we
   do not know the school, and I would not add a lookup that turns a guessed
   uuid into a school's name and logo. A returning parent gets their school NAME
   and INITIALS mark, remembered in localStorage at the last successful sign-in;
   a first-time visitor gets the Potato Snaps hero. The logo *image* needs a
   cookie to pass the proxy and a signed-out parent has none — and the initials
   mark is the design's own no-logo state at the same size, so nothing shifts.
   The post-login feed is fully branded, logo included.
3. **Parents still cannot fetch raw photos** through the proxy (unchanged v1.0
   rule). Added: class films and branding, per addendum §3.
4. **Retagging in the lightbox is implemented** (`PATCH /api/potato/photos/[id]`).
   Tab 11's note says "retagging happens here rather than in a separate flow";
   shipping the dashed Add slot dead would have been worse than either extreme.
5. **"Excuse" is not restricted server-side to zero-photo children.** The
   addendum's rule is only `excusedChildIds ⊆ active children`; "only when they
   have no photos this week" is a UI affordance (and is enforced in the picker).
   Making it a server rule would break a legitimate case — a child whose only
   photos are all bad.
6. **The picker starts with every photo starred.** Removing duds is far less work
   than hunting twenty keepers, and it means coverage starts green for most
   classes. A week with >40 photos therefore opens over the cap and the CTA says
   `N photos · M too many` rather than silently dropping 20.
7. **The board's "NEW" badge** is per KIND on the parent feed (newest class film
   *and* newest child film), not just the first card — a fresh child film under a
   week-old class film is still news.
8. **`montages` response key kept alongside the new `films`** so a parent's cached
   PWA bundle from v1.0 does not render an empty feed the moment this deploys.
9. **Film wording sweep follows the ADDENDUM over the spec HTML.** The spec still
   contains v1.0 strings ("Make montage", "8 PHOTOS = 1 MONTAGE"); addendum §0 is
   binding and later, so those became "Make film" and "8 PHOTOS = 1 FILM".
   "montage" now survives only in table/route names.

---

## 5. Verification

- **Typecheck: 0 errors** across a merged tree (v1.0 repo state + this overlay,
  i.e. what the Mac will actually contain), with real
  `typescript 5.9.3 / next 16.1.1 / react 19.2 / @types/react 19 / jose 5.10`
  and the repo's own compiler options + `"@/*" → "./*"`.
- **Class-film harness: 33/33** — coverage (covered/excused/missing, and
  covered-beats-excused), the 8/40 caps at 7-8-40-41 and zero, foreign media ids
  and foreign excused ids rejected *and* unable to cover anybody, dirty input
  (dupes, non-uuid junk, a SQL-looking string, non-array, uppercase uuids), and
  week-boundary edges at Mon 00:00 / −1s / Sun 23:59 / next Mon 00:00 in UTC+8.
- **Capability harness: 13/13** — pre-migration, post-migration, partial
  migration, and 42P01 not being swallowed.
- **Week harness re-run against the edited week.ts: 27/27**, plus 5 new
  assertions on the day helpers (a 23:30 UTC shot files under Monday in UTC+8).
- **Greps clean** (matches are comments only): no `montree_` table, no
  `lib/montree` import, no `t(`/`useI18n`, no `<style jsx>`, no `.single(`, no
  `.ilike(`, no `storage.` in the migration, no unescaped JSX entities, no
  fire-and-forget without a rejection handler.
- **Not run here**: repo eslint and `next build` (no checkout in this container).

---

## 6. Risks / owed

1. **eslint + `next build` on the Mac.** A green typecheck is not a working
   feature.
2. **Order of operations at deploy.** Code first is safe (that is what §3 buys);
   migration first is also safe. But the class-film card and all branding stay
   invisible for up to 30s after the migration — that is the negative cache, not
   a bug.
3. **Shared pins for Builder 2**: `kind IN ('child','class')`; class job has
   `child_id NULL`; `excused_child_ids uuid[]`; class output path
   `class/<classId>/montages/class/<weekStart>-<jobId>.mp4`; `media_ids` is
   already sorted chronologically by the API and IS the order of the film; up to
   40 photos; branding columns are `school_name`, `school_logo_path`,
   `emblem_path` on `tp_classes` (paths, not URLs — the worker downloads from the
   bucket directly).
4. **The end card is Builder 2's.** This build produces and serves the three
   branding inputs; nothing here renders the card itself.
5. **Live walk owed**: HQ set school name + logo → teacher uploads emblem →
   capture a week → open the picker → tap a dashed chip → star one photo → chip
   turns gold → excuse a zero-photo child → Make class film → worker renders →
   parent sees BOTH cards in one feed, with a seek to prove Range/206 on the
   class film through the private-bucket proxy.
6. **A 30-child class in the coverage strip** is horizontal scroll by design;
   worth eyeballing on a real iPad at 30 chips before calling it done.
