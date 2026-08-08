# Potato Snaps v1.2 — Offline-first capture

Founder's law: *"the photo has to save to the device first, so even with
connectivity issues the photo doesn't get lost."*

Ported from the proven Montree implementation (`lib/montree/offline/`), which
has been carrying real classroom capture since March 2026. **Zero imports from
`lib/montree/*`** — the code was read, understood and re-implemented, keeping
every hard-won detail and the comments that explain why each exists.

**NOT delivered to the Mac.** Audit first, per instruction.

---

## 1. Baseline

The live repo is **v1.1** (migration 319 present, class-film + branding shipped).
My v1.1 build tree had been wiped from this container, so the earlier
"drift" reading was just v1.0-vs-v1.1 noise. **Every file here was seeded from
the live Mac copy**, not from memory.

**No migration.** v1.2 needs no schema change.

---

## 2. Files — 9 total (6 NEW, 3 CHANGED)

### NEW
| File | Role |
|---|---|
| `lib/potato/offline/types.ts` | queue entry shape, statuses, tuning constants |
| `lib/potato/offline/queue-store.ts` | IndexedDB: atomic writes, due-query, cleanup |
| `lib/potato/offline/sync-manager.ts` | enqueue + the upload engine |
| `lib/potato/offline/triggers.ts` | visibility / online / backoff-timer / startup |
| `lib/potato/offline/usePotatoQueue.ts` | the hook a screen uses (stats, retry, rejects) |
| `lib/potato/captured-at.ts` | the shutter-time trust rule, pure + harnessed |

### CHANGED (full files, seeded from live)
| File | Change |
|---|---|
| `app/api/potato/photos/upload/route.ts` | accepts `capturedAt` + `clientId`; idempotent retry |
| `app/potato/teacher/page.tsx` | save = enqueue (never blocks on network); pending pill; rejects strip |
| `lib/potato/ui.ts` | `.pt-pending` / `.pt-rejected` styles |

`components/potato/CameraCapture.tsx` needed **no change** — it already stamps
`timestamp: new Date()` inside the `toBlob` callback, i.e. shutter time. v1.2
just stops throwing that value away.

---

## 3. How the queue works

**Save path.** Shutter → tag → `enqueuePhoto(blob, {classId, childIds,
capturedAt, w, h})`. The blob and its row are written to IndexedDB in **one
transaction**, then the function returns. No network is touched. The teacher
sees `Saved ✓ — uploading…` and the tag screen closes. That is the founder's
rule in one function.

**Upload path.** A sync pass takes every *due* entry for the active class,
oldest capture first, 3 in parallel, and POSTs `file` + `childIds` +
`capturedAt` + `clientId`. On 2xx: revoke the object URL, **delete the blob,
then** mark uploaded (that order means a crash costs a local copy of a photo
that is safely on the server — the safe direction to fail). Uploaded rows are
swept an hour later.

**Retry.** `nextAttemptAt` on the row *is* the backoff: 2s, 4s, 8s … capped at
10 min, with ±20% jitter so twenty queued photos don't retry on one tick. A
timer sleeps until the soonest due entry, so backoff fires on its own rather
than waiting for the teacher to touch something. Also triggered by
`visibilitychange` (app open), the `online` event, and 800ms after mount.

**Failure taxonomy.**
- *Transient* (network, 5xx, 408, 429, timeout) → `failed`, retried **forever**.
  Nothing is ever silently dropped.
- *Permanent 4xx* (413, 415, 400, 403, 404, 422 …) → `rejected` on the **first**
  response, with the server's own sentence. Surfaced on the board as
  "1 photo couldn't be saved — <reason>" with **Try again** / **Discard**.
  Discard is the only path in the system that drops a photo, and a human does it.
- **401** halts the whole pass immediately (every other entry would fail the
  same way) and is explicitly *not* permanent — signing in again resumes.

**Duplicate guard.** A client-generated `clientId` per capture doubles as the
storage object name. Before inserting, the route looks for an existing row at
that path and returns it — so a retry after a lost response is a genuine no-op,
not a duplicate. Plus SHA-256 content-hash dedup at the queue door for a
double-tapped shutter.

**Tenancy.** Entries are keyed by `classId`; sync only ever touches the active
class's photos. (Montree's equivalent bug — foreign entries jamming the queue
until capture bricked — is designed out rather than patched.)

---

## 4. capturedAt validation

`resolveCapturedAt(raw, now)` in `lib/potato/captured-at.ts`:

| Input | Result |
|---|---|
| absent / empty / non-string | `now`, **no** anomaly (ordinary online path) |
| unparseable | `now`, note `unparseable` |
| > 5 min in the future | `now`, note `in_the_future` |
| ≤ 5 min in the future | clamped to `now`, note `clamped_skew` (ordinary skew, not a lie) |
| older than 30 days | `now`, note `too_old` |
| otherwise | **the client's value**, no note |

A bad timestamp **never fails the upload** — a photo with a wrong time is still
a photo. The anomaly rides back in the response as `capturedAtNote`. Storage
folders (`yyyy/mm`) also follow the capture instant in the class timezone, so a
Friday photo uploaded Monday files under Friday's month too.

**Harness: 21/21**, including the exact regression — a Friday 08:00Z photo
uploaded Monday keeps Friday.

---

## 5. Deviations (deliberate)

1. **Transient failures retry forever.** Montree gives up after 5 attempts and
   marks `permanent_failure`. That contradicts "never silently dropped", so only
   a permanent 4xx ends an entry's life here.
2. **`makeRoom()` never deletes pending photos.** Montree's `aggressiveCleanup`
   will, as a last resort, delete pending entries older than 7 days. Ours only
   removes what the server already has, or has permanently refused (and which
   the teacher can see). If that isn't enough room, enqueue **fails loudly**.
3. **No health-check probe.** Montree HEADs `/api/montree/health` before syncing.
   Potato has no such endpoint and shouldn't borrow one; `navigator.onLine ===
   false` short-circuits, and everything else just tries — a captive portal shows
   up as a fetch failure and becomes a normal retry.
4. **No Capacitor branches.** Potato Snaps is web/PWA and may not import
   `lib/montree/platform`; the web events cover the installed PWA.
5. **Board counts still come from the server.** A queued photo does *not*
   optimistically bump a child's bar — the bar must mean "the server has it",
   because that is what the film is built from. The pending pill is what tells
   the teacher the difference. Worth a founder check.
6. **`capturedAt` is optional.** An older cached bundle that omits it keeps
   working exactly as v1.1 did.

---

## 6. Verification

- **tsc --noEmit: 0 errors**, v1.2 overlaid on the live repo tree, real pinned
  deps (`typescript 5.9.3 / next 16.1.1 / react 19.2 / @types/react 19`).
- **capturedAt harness: 21/21.**
- **Greps clean** (only attribution comments match): no `lib/montree` import, no
  `montree_` table, no `<style jsx>`, no `t(`/`useI18n`, no `.single(`, no
  uncaught fire-and-forget, own IndexedDB name (`potato-snaps-queue`).
- **Not run here**: repo eslint, `next build`.

---

## 7. Risks / owed

1. **Untested against a real browser.** IndexedDB behaviour under iOS storage
   pressure is exactly where this class of code breaks; the Montree original
   earned its `normalizeIDBError` the hard way. Needs a device walk: airplane
   mode → shoot 5 → confirm "Saved" → re-enable → watch the pill drain.
2. **The pending pill only counts the active class.** Correct, but a teacher who
   switches classes with photos still queued won't see them until she switches
   back. Entries are never lost, just not shown.
3. **Storage-full is a hard stop** by design (deviation 2). A classroom that
   stays offline for weeks will eventually get "connect to wi-fi" — the right
   answer, but the founder should know it exists.
4. **`clientId` idempotency depends on the storage path.** If the path scheme
   ever changes, the dedup lookup must change with it.
