# Potato Snaps v1.1 — Fresh-Eyes Adversarial Audit

Auditor: Sonnet (fresh-eyes, no prior contact with this codebase).
Scope: `/home/claude/build/potato11/**` (app + `potato-worker/`) against
`POTATO_SNAPS_CONTRACT.md` + `POTATO_SNAPS_V11_ADDENDUM.md`, mechanically diffed
against `/home/claude/build/potato/**` (v1.0 reference, itself verified
byte-identical to the live Mac repo per BUILD_NOTES.md).

**Verdict: SHIP.** No CRIT or HIGH findings. 0 fixes were required — every
security-critical claim in the build notes was independently re-derived and
held under hostile-input reasoning. 5 MED/LOW findings documented below, none
blocking.

---

## Independent verification performed (not just reading the notes)

1. **Re-ran the scoped typecheck myself**, from scratch, against a merged tree
   (v1.0 base + v1.1 overlay) using the repo's real pinned deps
   (`typescript@5.9.3`, `next@16.1.1`, `jose@5.10`, `@types/react@19`) and the
   scoped `tsconfig.json` (`"@/*" → "./*"`). **0 errors, 45 files compiled.**
   This reproduces BUILD_NOTES §5's claim independently rather than trusting it.
2. **Re-ran the builder's self-greps** (`montree_`, `lib/montree`, i18n,
   `<style jsx>`, `.single(`, `.ilike(`, `storage.` in the migration) — all
   clean, matching the claim.
3. **Mechanically diffed** `board/route.ts`, `montages/route.ts`,
   `media/proxy/[...path]/route.ts` against the v1.0 reference (byte-for-byte
   `diff -u`) — confirmed every change is additive/feature-gated, no removed
   check, no widened auth branch beyond what the addendum specifies. No
   `middleware.ts` file is present in the v1.1 delivery (correctly — no
   middleware change was needed since `/potato/teacher/class-film` and
   `/potato/teacher/branding` are subpaths of the already-public `/potato`
   prefix, confirmed by reading the live `startsWith(path + '/')` matcher).
4. **Traced the class-film validation rule (`lib/potato/classfilm.ts`) by hand**
   against the hostile-input matrix in the task brief: foreign media ids,
   media ids from another week, excused list containing a covered or foreign
   child, 0/7/8/40/41 photos, duplicate ids, uppercase uuids, non-uuid junk,
   non-array input. Every case is provably rejected or correctly normalized —
   see "Security" below for the reasoning, not just a re-statement of the
   builder's harness claim (no harness files were actually shipped in the
   tree to re-run; the harness numbers in BUILD_NOTES/WORKER_NOTES could not
   be independently executed and are trusted on code-reading alone).
5. **Read every SQL template in `potato-worker/src/db.ts`** line by line —
   confirmed no v1.1 column (`kind`, `excused_child_ids`, `school_name`,
   `school_logo_path`, `emblem_path`) is ever named explicitly; all reads go
   through `SELECT *` / `RETURNING *` and default via `jobKind()`.
6. **Read the migration SQL** end-to-end for idempotency and the "no
   storage.* in-transaction" rule — both hold.
7. **Spot-checked design-spec conformance** (tabs 07–11) against the actual
   picker/board/lightbox/branding page code — coverage sort order
   (missing→excused→covered), excuse-only-at-zero-photos gating, CTA copy
   ("N children missing" / "Make class film · N photos"), and the grain/blur
   CSS rule (`feTurbulence` + `background-blend-mode:soft-light`, **no**
   `feGaussianBlur` anywhere in `ui.ts`) all match.

---

## Security (Priority 1) — no exploitable finding

**POST /api/potato/class-film** — the one client-media endpoint:
- Every `mediaId` is checked against `week.tagsByPhoto`, which is built
  server-side from `tp_photos` filtered to `class_id = session.classId` AND
  the `[weekStart, weekStart+7d)` range in the class's own tz. A foreign
  class's photo, or the same class's photo from a different week, is not a
  key in that map → rejected as `foreign_media`, and — critically — never
  contributes to `coveredSet`, so it also cannot be used to fake coverage.
- `excusedChildIds` are checked against `activeChildIds` fetched fresh from
  `tp_children` at submit time (not the picker's stale load) → a foreign or
  inactive child id is rejected as `foreign_excused` and cannot silently
  "cover" anyone.
- Coverage is computed **only from validated `mediaIds`** (post-filter), so a
  child whose only photos exist but were never included in the POST body is
  correctly `missing`, not `covered` — this is the exact "unstarred ≠ covered"
  guarantee the brief asked to confirm, and it holds because the client-side
  "star" concept has no server-side representation at all — the server only
  ever sees the final selected set.
- `covered` beats `excused` unconditionally (`classfilm.ts` line ~160): a
  child who is both selected-into and excused still ships as covered, so
  excusing can never be used to *hide* a child who is actually in the film.
- 0/7/8/40/41/duplicate/uppercase/non-uuid/non-array inputs are all handled by
  `cleanIds()` (regex-validated, lowercased, deduped) before any of the above
  logic runs — a SQL-looking string or non-array body degrades to an empty
  list, which then fails cleanly as `no_media`.
- The insert always writes `child_id: null` for `kind: 'class'`, and
  `media_ids` are re-sorted server-side by `captured_at` pulled from the
  server's own `week.photos` map — the client's array order is never trusted
  as film order.

**Branding uploads** (`branding/emblem`, `hq/classes/[id]/logo`):
- Extension is derived from an **allowlist keyed on the declared MIME type**
  (`EXT_BY_MIME`), never from the client filename — there is no filename input
  at all, so there is nothing to path-traverse with. `classId` in the storage
  path comes from the teacher's verified cookie (emblem route) or a
  UUID-regex-validated route param (`hq/.../logo`) — never free text.
- Size cap (2MB) is checked against `File.size`, which Node's Undici
  `formData()` parser derives from the actual received byte length, not a
  client-supplied header — not spoofable to bypass the cap.
- `X-Content-Type-Options: nosniff` is set on every response by the proxy
  route that later serves these files, and the upload always sets
  `Content-Type` to the same allowlisted MIME it validated — no
  content-sniffing/polyglot vector, and SVG (the classic vector for this
  class of bug) is not in the allowlist.

**Proxy auth additions** (`class/<classId>/montages/class/*`,
`class/<classId>/branding/*`): mechanically diffed against v1.0 — the only
changes are two new `if` branches inside the existing parent-branch of
`isAuthorized()`; the teacher branch, the face-path branch, the
raw-photos-are-never-parent-reachable rule, the path-traversal guard
(`includes('..')`), and the fail-closed-to-404 discipline are all byte-for-byte
unchanged. The literal `'class'` path segment can never collide with a real
child id (uuid-shaped), so there is no confusable-segment attack between a
class film and a same-named child.

**PATCH /api/potato/photos/[id]** (retagging, a builder judgment call not in
the addendum): re-checks class ownership of the photo AND that every named
child in the body is an **active** child of the **same class** (via
`.eq('class_id', session.classId).in('id', childIds)` and comparing
`ownedIds.length !== childIds.length`) before writing anything. A foreign or
inactive child id in the body is rejected with 403 and nothing is written.

**HQ endpoints**: gated by `verifyPotatoHq()` (SHA-256 + `timingSafeEqual`,
unchanged from v1.0) on both new HQ routes, plus the existing per-IP rate
limiter.

## Pre-migration safety (Priority 2) — holds

`potatoCapabilities()` probes `tp_montage_jobs(kind, excused_child_ids)` and
`tp_classes(school_name, school_logo_path, emblem_path)` independently via
`limit(0)` selects; a `42703` on either probe yields `false` for that flag
alone (not a thrown error), so a database where only one of the two migration
sections has been pasted degrades correctly — verified by reading
`potatoCapabilities()`, `loadClass()` (column-list swap on `caps.classes`),
`board/route.ts` (job-column swap on `caps.jobs`, and the `job.kind === 'class'`
branch only taken `caps.jobs && …`), and `montages/route.ts` (same pattern).
The worker's half is separately safe by construction: **every SQL template in
`potato-worker/src/db.ts` was read line-by-line and none names a v1.1 column
explicitly** — `claimNextJob()` and `getJobById()` use `RETURNING *` / `SELECT
*`, `getClassRow()` uses `SELECT *`, and `jobKind()` maps
`undefined`/`null`/anything-not-`'class'` to `'child'`. A pre-migration worker
cannot 42703 and cannot crash-loop.

## Correctness (Priority 3) — holds

- Coverage: see Security section above — a child with only unstarred photos
  is `missing`, never `covered`, both in the live picker's client-side
  recompute (`app/potato/teacher/class-film/page.tsx`) and in the server's
  authoritative recompute in `classfilm.ts` — the two are structurally the
  same algorithm (coveredSet built only from selected/validated ids).
- "Excuse only at zero photos" is a **UI affordance, not a server rule**
  (documented explicitly as deviation #5 in BUILD_NOTES) — see MED-1 below.
  It cannot be used to make a child *silently* missing: `validateClassFilm`
  still requires every active child to be covered-or-excused before `ok:
  true`, so the film simply cannot be created while anyone is unaccounted
  for, and an excused child is visible on the teacher's board receipt
  (`"N children in it · X, Y excused"`).
- Chronological ordering: both the picker payload and the actual job insert
  order media strictly by `captured_at` read from the server's own week
  query, never from client array order.
- Visibility: `montages/route.ts` — a parent's `.or('child_id.eq.<own>,kind.eq.class')`
  filter is applied only after `.eq('class_id', classId)` from the signed
  cookie, so a class film is visible to every parent of that class and to no
  one else; a child film is visible only to that child's own parent (or the
  teacher). Confirmed by mechanical diff against v1.0's stricter
  "childId required" version.
- Week math: `lib/potato/week.ts` is additive-only (new `dayLabelInZone`/
  `dayKeyInZone` helpers); the core Monday/timezone arithmetic is byte-for-byte
  the v1.0 file. `resolveWeekStart` snaps any mid-week date sent by a client
  to that date's own Monday before use, so a "replayed" non-Monday date cannot
  be used to smuggle photos from an adjacent week — the same Monday is
  recomputed on both GET and POST.

## Worker (Priority 4) — holds

- `jobKind()` matrix (`'class'` / `'child'` / `undefined` / `null` /
  anything-else) all resolve correctly to `'class'` only on the literal string
  `'class'`, `'child'` otherwise — read directly, not just trusted from the
  claimed harness.
- Branding re-sync: `syncJobAssetsIntoBundle()` in `render.ts` mirrors both
  `JOB_PHOTOS_DIR` and `JOB_BRANDING_DIR` into the cached Remotion bundle
  **before every render**, and `resetJobAssets()`/`resetJobBranding()` wipe
  both dirs at the start and end of `processJob()` — the same
  bundle-staleness trap the photos already had is closed for branding too, so
  no cross-class logo bleed.
- 40-photo timing: `durationBoundsFor()` returns the exact v1.0 constants
  `{50,35,65}` for `photoCount <= LONG_FORM_THRESHOLD (20)`, so child films are
  provably unaffected by the new math (identity branch, not just
  "should be the same"); the class branch's arithmetic
  (`titleEndSec + photoCount*dbAvg + END_CARD_TARGET_SEC`) is a straightforward
  linear model with a hard `hardCeiling = durationSec - 1` safety clamp.
- Stale-sweep: `recoverStaleJobs()` SQL is unchanged from v1.0 (only the
  `staleMinutes` config default moved 25→60); `assertTimeoutSanity()` at boot
  compares `staleMinutes*60000` against `max(jobTimeoutMs, classJobTimeoutMs)`
  and warns (not hard-fails) if the invariant is violated — a real but
  low-severity gap, see LOW-1.

## UX (Priority 5) — matches spec; one cosmetic leftover found

Coverage strip states, excuse-sheet zero-photos gating, chip-tap filter,
CTA copy, and the lightbox all match design tabs 07/11 on direct code
inspection (see picker/lightbox review above). Wording sweep grep found one
stale **comment** (not user-facing) — see LOW-2.

---

## Findings

### MED-1 — "Excuse" is not restricted server-side to zero-photo children
**File:** `lib/potato/classfilm.ts` (rule), `app/api/potato/class-film/route.ts` (POST)
**Scenario:** A teacher (or a replayed/hand-crafted request bypassing the
picker UI) can excuse a child who has plenty of tagged photos this week,
simply by omitting all of that child's photos from `mediaIds` and adding
their id to `excusedChildIds`. The addendum's server rule is only
`excusedChildIds ⊆ active children` — "only when zero photos exist" is
enforced in the picker UI (`tapChip()`), not the API.
**Impact:** Low — a child excused this way still shows up on the teacher's
own board receipt as excused (not hidden), and "covered always wins" means an
already-selected child can never be excused-away. This is a documented,
deliberate builder decision (BUILD_NOTES §4.5), not an oversight, and closing
it server-side risks the builder's stated legitimate case (a child whose only
photos are all bad). **DOCUMENTED, not changed.**

### MED-2 — PATCH photos/[id] retag is not atomic
**File:** `app/api/potato/photos/[id]/route.ts:140-149`
**Scenario:** The retag handler does `DELETE FROM tp_photo_children WHERE
photo_id=… ` then a separate `INSERT`. If the delete succeeds and the
insert then fails (network blip, transient Supabase error), the photo is left
with **zero** tagged children — silently dropping out of every child's week
count and out of class-film coverage for whoever was tagged, until a teacher
notices and re-tags it.
**Impact:** Low-to-moderate — no security exposure (ownership was already
verified before either statement), but a plausible latent correctness bug
under partial failure. Not present in v1.0 (this endpoint is new in v1.1).
**DOCUMENTED, not changed** — fixing would mean either a Postgres RPC/transaction
(not available through the `supabase-js` REST client used here) or a
diff-based upsert; both are a larger change than this audit's mandate to
"fix CRIT/HIGH in place."

### LOW-1 — `assertTimeoutSanity()` only warns, never blocks boot
**File:** `potato-worker/src/config.ts:87-100`
**Scenario:** If Railway env vars are ever set such that
`POTATO_STALE_MINUTES` drops below the largest job timeout, the worker still
boots and will re-queue live long-running class renders, burning all 3
attempts. The check is present and logs loudly, but is advisory only.
**Impact:** Low — defaults are sane (60m stale vs 45m class timeout) and this
only bites a future manual misconfiguration. **DOCUMENTED.**

### LOW-2 — Stale doc-comment still says "Make montage"
**File:** `app/potato/teacher/page.tsx:9`
**Scenario:** A comment in the row-states table (`ready 8+, no job … Make
montage`) was not updated in the v1.1 wording sweep. The actual rendered
button text (`app/potato/teacher/page.tsx:686`) correctly reads "Make film".
No user ever sees the stale word.
**Impact:** Cosmetic only. **DOCUMENTED, not changed** (out of scope to edit
a comment with zero user or behavioral impact given the audit's fix-CRIT/HIGH
mandate).

### LOW-3 — No harness files were shipped to independently re-run
**Files:** referenced in `BUILD_NOTES.md` §5 ("Class-film harness: 33/33") and
`POTATO_WORKER_V11_NOTES.md` §4 (multiple gate tables).
**Scenario:** Neither `/home/claude/build/potato11/**` nor the worker tree
contains the actual harness/test scripts that produced these numbers — they
appear to have been run in a scratch location not included in the delivery.
This audit independently re-derived the typecheck claim (0 errors, verified
above) and hand-traced the classfilm/worker logic against the hostile-input
matrix, reaching the same conclusions the harness claims — but the specific
numeric claims (33/33, 105/105, etc.) could not be mechanically re-executed
and are trusted on code-reading alone.
**Impact:** Process gap, not a product defect. **DOCUMENTED** — recommend the
harness scripts be included in the next delivery so future audits can re-run
rather than re-derive them.

---

## Summary

| Severity | Count | Fixed | Documented |
|---|---|---|---|
| CRIT | 0 | — | — |
| HIGH | 0 | — | — |
| MED | 2 | 0 | 2 |
| LOW | 3 | 0 | 3 |

No code changes were made during this audit — every path examined (class-film
validation, proxy auth additions, branding upload handling, PATCH retag
ownership, pre-migration capability gating, worker column-star discipline,
migration idempotency) held under adversarial input on independent
re-derivation, not just re-statement of the builders' own claims.
