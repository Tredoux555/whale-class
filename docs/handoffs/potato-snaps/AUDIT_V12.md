# Potato Snaps v1.2 — Pre-Production Audit

**Auditor:** fresh-eyes adversarial audit, no prior contact with this code.
**Scope:** `lib/potato/offline/**`, `lib/potato/captured-at.ts`,
`app/api/potato/photos/upload/route.ts`, `app/potato/teacher/page.tsx`,
`lib/potato/ui.ts` — the 9 files listed in `BUILD_NOTES_V12.md`.
**Method:** full read of all 9 files; line-by-line diff of the 3 changed files
against the live v1.0/1.1 tree at `/home/claude/build/potato`; independent
re-run of `tsc --noEmit` and the `captured-at` harness using the builder's own
scratch environment (`/tmp/tsck/proj12`, TS 5.9.3 / Next 16.1.1 / React 19.2 —
left in place from the original build, not something I set up); manual trace
of every crash/kill/quota/race scenario in the "attack surfaces" brief.

## Verdict: **SHIP-WITH-NOTES**

3 HIGH findings, all fixed in place. 3 MEDIUM findings, documented (product/UX
follow-ups, not data-safety blockers). 2 LOW findings, documented. 0 CRITICAL —
the core "photo saved to device is never silently lost" invariant held up
under every crash/quota/kill scenario traced. The HIGH findings were all about
a photo being counted or uploaded **twice**, or getting stuck needing a manual
tap, never about a photo disappearing.

One of the three HIGH fixes requires a migration (`migrations/320_...sql`) —
**this must be applied to the live database before v1.2 ships**, since the
in-app idempotency logic alone (fixed here too) is not sufficient without the
DB-level constraint backing it.

---

## Findings

### HIGH — FIXED: idempotent-retry race can double-count / duplicate a photo
**Files:** `app/api/potato/photos/upload/route.ts` (insert path, was line
~118), `lib/potato/offline/sync-manager.ts` (`retryNow`, `syncQueue`),
new `migrations/320_potato_snaps_v12_dedup.sql`.

The v1.1→v1.2 diff shows the storage upload changed from `upsert: false` to
`upsert: true` (intentionally, to let a retry rewrite an orphaned object from
a half-failed prior attempt — a legitimate fix). But the idempotency guard
that is supposed to make a retry a no-op is a **SELECT-then-INSERT** in
application code, with **no unique constraint backing it** — `tp_photos` has
no index on `storage_path` (checked migration 318, the only schema file for
this table). Two concurrent requests carrying the same `clientId` can both
pass the `SELECT ... WHERE storage_path = ...` check before either has
inserted, and both proceed to `INSERT` — producing **two `tp_photos` rows for
the same photo**, each with its own `tp_photo_children` tags. Since a photo
counts toward a child's weekly total for every row tagging them, this
silently inflates the count and can duplicate the photo in the rendered film
— exactly the WYSIWYG corruption the whole `capturedAt` feature exists to
prevent.

This is reachable without any exotic multi-tab scenario. I traced a concrete
single-tab path: `retryNow()` (invoked by every "photo waiting to upload" tap,
and automatically after every `savePhoto()`) used to reset **any** entry with
status `'uploading'` back to `'pending'` unconditionally, on the assumption
that `'uploading'` always means "stale, from a crash." It doesn't — a
backlog built up over a spotty-wifi morning can legitimately take several
worker-passes-worth of time to drain (`SYNC_TIMEOUT_MS` is 120s; with
`MAX_CONCURRENT_UPLOADS = 3` and a 60s per-request timeout, a 10-photo backlog
can legitimately run ~120–240s). A teacher tapping the pending pill mid-drain
would flip an entry that is genuinely mid-`fetch()` back to `'pending'`, and
if the outer sync lock's own time-based stale-reset fires around the same
moment, a second pass can pick it up and POST the same `clientId` a second
time while the first request is still in flight. It is also reachable
multi-tab (same origin ⇒ shared IndexedDB, independent in-memory
`syncInProgress` per tab).

**Fix (three parts, layered):**
1. `migrations/320_potato_snaps_v12_dedup.sql` — a real unique index on
   `tp_photos.storage_path` (global unique is sufficient; the path already
   embeds `class_id`). **This migration is not yet applied anywhere — it must
   be run against the live database before ship.**
2. `app/api/potato/photos/upload/route.ts` — on insert, catch Postgres
   `23505` (unique violation), read back the row that won the race, and
   return it as `duplicate: true`, exactly like the existing pre-check
   branch — mirroring the `23505`-handling pattern already used for
   `tp_parent_codes` elsewhere in this codebase
   (`app/api/potato/parent-codes/route.ts`). Also nulls out `storagePath`
   before falling through to the generic error handler in this branch, so a
   `23505` never triggers the catch-all's "delete the orphaned object"
   cleanup against an object another (winning) row now depends on.
3. `lib/potato/offline/sync-manager.ts` — `retryNow` no longer force-resets
   `'uploading'` rows unconditionally; it now calls a new, shared
   `reclaimStaleUploads()` that only reclaims a row once its `lastAttemptAt`
   is older than `SYNC_TIMEOUT_MS` — the same horizon the sync lock itself
   already uses to decide a pass is dead, so the two checks stay consistent.

Verified: `tsc --noEmit` clean (0 errors) and the `captured-at` harness still
21/21 after all three changes.

---

### HIGH — FIXED: a browser-killed-mid-upload photo has no automatic recovery path
**File:** `lib/potato/offline/sync-manager.ts` (`syncQueue`, new
`reclaimStaleUploads`).

If the browser/tab is killed while an upload request is in flight, the entry
is left at `status: 'uploading'` in IndexedDB. `getDueEntries()` — which
every automatic trigger (`visibilitychange`, the `online` event, the
backoff-due timer, and the 800ms startup pass in `triggers.ts`) calls via
`syncQueue()` — only ever selects `status IN ('pending', 'failed')`. So a
genuinely abandoned `'uploading'` row was **never** picked up by any
automatic trigger; only a teacher manually tapping "try again" on the pending
pill (`retryNow`, which *did* have its own — now-fixed — reclaim logic) would
ever recover it. This contradicts the documented invariant ("retries forever,
nothing silently dropped") and the file's own header comment ("a sync lock
with a timeout that force-resets, so one wedged pass cannot brick capture") —
that comment is about the `syncInProgress` boolean, not about the actual
entry rows, which stayed wedged regardless.

The photo itself was never lost (the blob is only deleted after a confirmed
2xx), and it does show up in the "N photos waiting" count, so this was not
silent data loss — but it broke the "just works in the background" promise
that is the entire point of this feature, requiring the teacher to notice
and manually tap something.

**Fix:** extracted the staleness check into `reclaimStaleUploads(classId)`
and call it at the top of every `syncQueue()` pass (i.e. every automatic
trigger), in addition to `retryNow`. A row abandoned mid-upload now heals
itself on the very next app-open or reconnect, the same as a `'failed'` entry
would, instead of requiring a manual tap.

---

### HIGH → resolved as part of the fix above (not separately counted):
The two fixes above share one root cause (treating `'uploading'` as
inherently reclaimable without a time check) and one shared fix
(`reclaimStaleUploads`), so they are reported together but were verified
independently by tracing both trigger paths (manual `retryNow` and the four
automatic triggers via `syncQueue`).

---

### MEDIUM — DOCUMENTED: `capturedAtNote` anomaly is computed but never surfaced
**Files:** `app/api/potato/photos/upload/route.ts` (~line 219), `lib/potato/offline/sync-manager.ts` (`uploadEntry`, success path ~line 404–416).

The server computes `capturedAtNote` specifically so a bad client timestamp
"is reported, never silently swallowed" (route.ts comment, and
`BUILD_NOTES_V12.md` §4). But `uploadEntry()`'s success path never calls
`response.json()` — the 2xx body, including `capturedAtNote`, is discarded
entirely. A device with a badly-skewed clock (stuck battery-dead clock, a
tablet set to next year) will have every capture silently corrected to `now`
with **zero visibility to the teacher** that this is happening, repeatedly.
This doesn't corrupt week counts (the fallback to `now` is a safe default,
not a wrong one), but it defeats the anomaly-visibility mechanism that was
specifically built to avoid exactly this kind of silent behavior.
**Recommendation:** parse the response JSON on success too, and surface a
one-time toast/log when `capturedAtNote` is non-null (e.g. "This device's
clock looks wrong — ask an adult to check the date/time").

### MEDIUM — DOCUMENTED: `queue.available` (no-IndexedDB signal) is computed but never rendered
**Files:** `lib/potato/offline/usePotatoQueue.ts` (exports `available`),
`app/potato/teacher/page.tsx` (never reads it — confirmed via grep, zero
occurrences outside the hook's own return statement).

`isQueueAvailable()` correctly detects when `indexedDB` doesn't exist at all
(Safari Private Browsing, some iOS Lockdown Mode configurations, ancient
browsers) — the one class of device where offline capture is fundamentally
impossible, not just degraded. The hook surfaces this as `available: false`,
but the board never checks it. On such a device, a teacher gets no proactive
warning; the first sign of trouble is the generic "That photo didn't save to
this device" toast, per-photo, only after tapping Save on the tag screen —
and every subsequent capture repeats the same failure with no guidance to
switch browsers/modes. Not data loss (the failure is loud, not silent, per
photo), but a real gap given the feature's dead-code detection path exists
and isn't used. **Recommendation:** a persistent banner on the board when
`queue.available === false`.

### MEDIUM — DOCUMENTED: fixed-horizon stale-lock reset can misfire under a genuine large backlog
**File:** `lib/potato/offline/sync-manager.ts` (`syncQueue`, lines
~270–277).

`SYNC_TIMEOUT_MS` (120s) is used both to decide a worker loop should stop
claiming new entries (line ~304) and, separately, to decide a *different*
invocation's lock is stale enough to steal. A legitimately large backlog
(exactly the scenario this feature is built for — a morning offline, dozens
of photos, then reconnect) can take longer than 120s to drain with only 3
concurrent slots and a 60s per-request timeout. If a second trigger fires
mid-drain, it will treat the still-working first pass as wedged and start a
second full pass. Per-entry status filtering already prevents this from
causing a double-upload of any single entry (the first pass's claimed rows
stay `'uploading'`, invisible to the second pass's `getDueEntries()`), so —
now that the two HIGH findings above are fixed — this no longer produces
duplicate uploads or lost work, only some wasted overlap/log noise. Flagging
as a design tension worth revisiting (e.g. track "last entry completed" time
rather than a single fixed timeout from pass-start) rather than fixing now,
since fixing it risks touching the exact lock logic the two HIGH fixes above
depend on being simple and time-based.

---

### LOW — DOCUMENTED: dead `ConstraintError` branch in `enqueuePhoto`
**File:** `lib/potato/offline/sync-manager.ts`, line ~237.

`saveEntryAndBlob` / `queue-store.ts` only ever call `.put()` (never
`.add()`) against object stores with no `unique: true` indexes, so a
`ConstraintError` can never actually be thrown from that call. Harmless (the
`else` branch handles it correctly if it somehow fired) but worth removing,
or commenting as intentionally-defensive dead code, so a future reader
doesn't assume it's load-bearing.

### LOW — VERIFIED, no action: `makeRoom()`'s weaker-than-Montree cleanup
**File:** `lib/potato/offline/queue-store.ts`, lines ~291–326.

Matches the deliberate deviation described in `BUILD_NOTES_V12.md` §5.2/§7.3
exactly: only `uploaded` and week-old `rejected` entries are ever freed; a
storage-full device fails loudly (`enqueuePhoto` throws a clear message)
rather than silently dropping a pending photo. Confirmed the implementation
matches the documented intent — flagging only as a verified pass, not a
finding.

---

## Verification performed

- **QuotaExceededError path**: confirmed `DOMException` instances satisfy
  `instanceof Error` in this runtime (V8; also true in all major browser
  engines in practice), so `normalizeIDBError` correctly passes the original
  `DOMException` through unchanged and the `err instanceof DOMException`
  checks in `enqueuePhoto`'s catch block do fire as intended — quota failures
  trigger `makeRoom()` + one retry, then fail loudly with a clear message if
  still full. Not silent.
- **Enqueue atomicity**: `saveEntryAndBlob` uses exactly one
  `db.transaction([STORE_ENTRIES, STORE_BLOBS], 'readwrite')` with both
  `.put()` calls queued before `oncomplete`/`onerror` are awaited — confirmed
  atomic, no window for an orphaned blob or a rowless entry.
- **clientId path safety**: `CLIENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/`
  blocks path traversal (no `/`, `.`, or other separators). The class
  namespace segment of the storage path (`class/<classId>/...`) comes from
  the authenticated session, never from client input, so a forged `clientId`
  cannot cross into another class's folder, and the idempotency lookup is
  additionally scoped with `.eq('class_id', session.classId)`.
- **capturedAt validation**: independently re-ran the harness at
  `/tmp/tsck/caharness.js` against `lib/potato/captured-at.ts` —
  **21/21 passed**, both before and after my fixes (unrelated files). Matches
  `BUILD_NOTES_V12.md`'s claim.
- **Typecheck**: independently re-ran `tsc --noEmit` in the builder's own
  overlay (`/tmp/tsck/proj12`, real pinned deps: TypeScript 5.9.3, Next
  16.1.1, React 19.2) with the current (fixed) file contents synced in —
  **0 errors**, before and after my fixes.
- **Security/regression diff**: line-by-line `diff` of
  `app/api/potato/photos/upload/route.ts`, `app/potato/teacher/page.tsx`, and
  `lib/potato/ui.ts` against the live v1.0/1.1 tree. `verifyPotatoTeacher`
  auth check, per-child class-ownership check, `MAX_BYTES` (10MB) cap, and
  the mime allowlist are all untouched. The only storage-layer behavior
  change is `upsert: false → upsert: true`, which is the root cause
  addressed in the first HIGH finding above.
- **401 handling**: confirmed a 401 response calls `bumpFailure()` (status
  `'failed'`, retryable with backoff) and throws `AUTH_EXPIRED` to halt the
  rest of the pass — never `'rejected'`. A broken/expired cookie pauses and
  retries rather than discarding the photo, as required.
- **Grep hygiene**: no `lib/montree` imports, no `montree_` tables, no
  `<style jsx`, no `t(`/`useI18n`, no `.single(` outside attribution
  comments — confirmed clean, matching `BUILD_NOTES_V12.md`'s claim.

## Files changed by this audit

- `lib/potato/offline/sync-manager.ts` — `retryNow` staleness guard, new
  shared `reclaimStaleUploads()`, called from both `retryNow` and
  `syncQueue`.
- `app/api/potato/photos/upload/route.ts` — `23505` conflict handling on
  insert, returns existing winner as `duplicate: true` instead of leaking a
  duplicate row; skips storage cleanup on that path.
- `migrations/320_potato_snaps_v12_dedup.sql` — **new**, not yet applied
  anywhere; unique index on `tp_photos.storage_path`. **Must be run against
  the live database before this ships**, since the app can't be delivered to
  the Mac per the existing scope note in `BUILD_NOTES_V12.md`.
