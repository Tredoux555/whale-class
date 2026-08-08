# Potato Snaps v1.3 — Adversarial Audit ("review before send")

Auditor: fresh-eyes, no prior contact with this build.
Scope: `/home/claude/build/potato13/**`, diffed against the live tree staged at
`/mnt/user-data/uploads/montree/**` (v1.2) and cross-checked against
`/home/claude/build/potato/**` (older reference) and a merged-tree `tsc`
overlay at `/tmp/tsck/proj13`.

**Verdict: SHIP-WITH-NOTES** (after the one CRITICAL-class gap below was fixed
in place). Everything else found is a real but bounded issue, documented for
the team.

**Counts:** 1 HIGH (fixed), 1 MEDIUM (documented), 4 LOW (documented).

---

## HIGH — FIXED: the media proxy did not enforce the send gate; only the list did

**File:** `app/api/potato/media/proxy/[...path]/route.ts` (copied into this
tree from the untouched baseline, since it was excluded from the 11-file
changeset — see "why this file is here" below)

**Scenario:** `GET /api/potato/montages` correctly filters a parent's results
to `sent_at IS NOT NULL` (`app/api/potato/montages/route.ts:128-130`). But
that is a *list-layer* courtesy. The actual byte-serving boundary is the media
proxy, and its parent-authorization branch (pre-fix) was:

```ts
if (kind === 'montages' && segments.length >= 4) {
  return segments[3] === parent.childId;
}
```

This proves only that the path names the requesting parent's own child — it
never looks at `sent_at`. So the product law stated in BUILD_NOTES_V13.md
("Nothing reaches a parent unseen") was enforced at exactly one of the two
places that matter. A parent in possession of the storage path of their own
child's *unsent* film — e.g. a URL that leaked via a shared/returned
classroom device, a forwarded screenshot, a cached service-worker response,
browser history, or any future "share this preview" feature — could stream
the private file directly, bypassing the gate entirely, with **no error, no
audit trail, and no dependency on the list endpoint at all**.

**Why HIGH and not CRITICAL:** the path also requires the per-render `jobId`
(a UUID) embedded in the filename, which is not enumerable or guessable — so
this is not a "any parent can browse any unsent film" bug. It *is* a genuine
defense-in-depth failure on the one route explicitly documented as "the ONLY
way a byte leaves the bucket," for the exact confidentiality property this
whole release exists to add. Given the founder's stated trigger for v1.3 was
"a film reached families unseen," a second, independent way for that to
happen — via a leaked URL instead of a missing UI gate — is a HIGH, not a
"nice to have."

**Why this file is here:** BUILD_NOTES_V13.md explicitly scoped the proxy out
("Preview playback needed no proxy change... Nothing was loosened"), reasoning
that the class/child ownership check was already correct and unrelated to the
send gate. That reasoning is right for *ownership* but wrong for *publication
state* — the proxy needed a second, independent check, not a change to the
ownership rule. Since it ships as part of v1.3's confidentiality guarantee, it
belongs in this tree.

**Fix applied** (`app/api/potato/media/proxy/[...path]/route.ts:94-96,
106-138`): the parent branch now calls `isSentToParent(classId, storagePath)`,
which does one indexed lookup (`storage_path` carries a unique index from
migration 320) for the matching `tp_montage_jobs` row and requires
`status='done' AND sent_at IS NOT NULL` before releasing bytes. It reuses the
same `potatoCapabilities().send` probe every other v1.3 route uses, so:

- Pre-migration (no `sent_at` column): falls back to v1.2 behaviour — every
  rendered film readable — so the route never 500s during the deploy window,
  matching the pattern used everywhere else in this codebase.
- Any lookup failure fails **closed** (access denied), consistent with the
  existing class-ownership check just above it in the same function.
- The teacher branch is untouched — she can still preview her own class's
  unsent films, exactly as designed.

Verified with `tsc --noEmit` against the pinned deps overlay at
`/tmp/tsck/proj13` (copy of this fix included) — **0 errors**.

**Trade-off worth knowing:** this adds one DB read to the proxy's parent path,
which the video element hits on every HTTP Range request while a parent
scrubs a film. For a *sent* film this is a small, indexed, and repeated cost;
acceptable, but worth a monitoring eye if proxy latency ever becomes a
complaint — a short-TTL positive cache on `(class_id, storage_path) → sent_at
timestamp` would remove it if needed. Not implemented here, to keep the fix
minimal and match the existing code's style (no other route caches
per-request DB results beyond the process-wide capability probe).

---

## MEDIUM — DOCUMENTED: "Remake" resolves the wrong child if two children share a name

**File:** `app/potato/teacher/page.tsx:588-599`, `components/potato/PreviewSendSheet.tsx:24-34`

`PreviewFilm` (the shape handed to `PreviewSendSheet`) carries `title` (the
child's display name) but no `childId`. When the teacher taps **Remake** on a
child film, the board resolves which child to reopen the mini-picker for by
**matching on name**:

```ts
const child = board?.children.find((c) => c.name === film.title);
if (child) setPicking({ id: child.id, name: child.name });
```

Kindergarten rosters routinely contain two children with the same first name
(twins, or just a common name — "Emma," "Liam," etc., in a class of 20+).
`Array.prototype.find` returns the *first* match in `board.children`
(sorted least-photos-first per `app/api/potato/board/route.ts:123`), which is
not necessarily the child whose film is being previewed. The teacher would be
silently handed the mini-picker for the wrong child, could exclude/include
that child's photos, and tap "Make film" — creating or overwriting a render
for the wrong roster entry while the film she meant to remake is untouched.

This is a data-correctness / UX bug, not a privacy leak: no cross-family data
exposure results, and the server-side `excludedMediaIds` subtraction still
only ever touches the (wrong) child's own derived photo set. Per the FIX-FIRST
rule (CRIT/HIGH fixed, MED/LOW documented), this is left for the team, but the
fix is small: add `childId: string` to `PreviewFilm`, populate it at both
preview call sites (`onPreview` for the child row and — n/a for class, which
already routes to a full-screen picker), and look the child up by id instead
of name.

---

## LOW — DOCUMENTED: mini-picker's disabled floor state is reachable with zero photos loaded

**File:** `components/potato/ChildFilmPicker.tsx:110, 141-152, 183-220`

If `photos.length === 0` (e.g. a Remake opened for a week whose photos were
since deleted), the scroll area correctly shows "No photos this week yet.,"
but the footer still renders the `belowFloor` branch (`kept = 0 < FLOOR`) —
a disabled "Keep at least 4" button and the stop-nudge banner — rather than
suppressing the action entirely or showing a distinct empty-state footer.
Cosmetically confusing (there's nothing to pick, yet the UI describes it as a
photo-count problem) but not reachable through normal flow: the picker only
opens from a "ready" row (≥8 photos existed at render time) or from a Remake
with `initialExcluded` — a genuinely empty state requires photos to vanish
between then and now. Low priority; worth a `photos.length === 0` guard on
the footer branch if the team wants it airtight.

---

## LOW — CONFIRMED (not a defect, verification of a disclosed risk): migration-before-code deploy order produces a real but transient parent-visibility regression

**Files:** `migrations/321_potato_snaps_v13_send.sql`, `lib/potato/db.ts:136-150`, `app/api/potato/montages/route.ts:125-130`

BUILD_NOTES_V13.md §7.1 already flags "run 321 first and unsent films would
hide from parents" as the reason to deploy code before migration. I traced
the actual mechanics to confirm the claim and its bound:

- **Code-first, migration-second (recommended order):** verified safe. Before
  321 runs, `potatoCapabilities().send` is `false` (42703 on the `sent_at`
  probe), so every route's `caps.send ? ... : true` fallback makes v1.3 behave
  exactly like v1.2 — no gating, no 500s, `POST .../send` returns a clean 503
  rather than faking success (`app/api/potato/montages/[id]/send/route.ts:37-42`).
- **Migration-first, code-second (discouraged order):** confirmed the failure
  mode is real but bounded. Live v1.2 code never selects or writes `sent_at`,
  so the migration is invisible to it — no errors. But any film rendered by
  v1.2 in that window gets `sent_at = NULL` and is **not** covered by the
  one-time backfill (which only stamps rows that were already `done` at
  migration time). The moment v1.3 code deploys, `caps.send` flips true and
  those specific films — previously visible under v1.2 — disappear from
  parents' feeds until the teacher notices the "ready to send" state and taps
  Send. No data is lost, nothing 500s, and the fix (tap Send) is one tap; this
  matches the "cosmetic-temporary" framing in the notes. Confirmed, not
  merely assumed.
- One added wrinkle the notes don't call out: the proxy fix above means this
  order also makes those specific unsent URLs briefly *unfetchable by direct
  link* once code deploys, even if a parent's browser had already cached the
  link during the gap. That's the fix working as intended, not a new risk.

No action needed beyond keeping the documented "code first, minutes apart"
deploy order.

---

## LOW — DOCUMENTED: `familyCount` for the class-send button undercounts multi-child families

**File:** `app/potato/teacher/page.tsx:490` (`familyCount: board.children.length`)

Already disclosed as Deviation #5 in BUILD_NOTES_V13.md: the class-film send
button's "Send to all parents · N" count uses active-children count, not a
real family/household count. A family with two children in the same class
would be counted twice; a family with a child excused from a specific week's
class film is still counted (excused only affects the *content* of the film,
not who "N" represents). This is an honesty/precision issue in copy only —
the actual send targets every family via the existing parent-feed query, so
no family is mis-served, just the number shown to the teacher can be off.
Consistent with the disclosed trade-off; no fix required unless product wants
a real family count plumbed through.

---

## Everything else attacked and found sound

- **Send endpoint** (`app/api/potato/montages/[id]/send/route.ts`): ownership
  via `class_id = session.classId` on both the read and the write (line 54,
  82); `status='done'` required before the first write attempt (line 68);
  idempotency verified two ways — an already-`sent_at` row short-circuits
  before any UPDATE is attempted (line 59-66), and the UPDATE itself carries
  `.is('sent_at', null)` (line 83) so two concurrent taps cannot both win;
  the loser re-reads and reports the winner's timestamp (line 88-101) rather
  than erroring. `sent_at` cannot be re-stamped once set — confirmed by
  tracing both the short-circuit path and the race path. 409 returned only
  when `status !== 'done'` (line 68-73), never for an ownership/not-found
  failure (those are 404, avoiding existence-confirmation via a 403/409
  distinction).
- **`excludedMediaIds`** (`app/api/potato/montage/route.ts:92-100`): strictly
  subtractive — `mine = derived.filter(p => !excluded.has(p.id))` where
  `derived` is server-computed from `loadWeekPhotos`; an id the client
  supplies that isn't in `derived` has no effect (nothing to add — it's a
  `Set.has` check against the authoritative list, never fed into a query).
  Every element is validated as a UUID before being placed in the `Set`
  (line 94-96), so there's no query-poisoning surface (`excludedMediaIds` is
  never passed to Supabase — it's pure in-process filtering). Floor of 4
  (`CHILD_FILM_MIN`) enforced server-side (line 104-118), independent of the
  client's nudge UI.
- **Class film gate parity**: `app/api/potato/board/route.ts:150-151` and
  `app/api/potato/class-film/route.ts:112` both compute `isSent` for the
  class job identically to a child job, and the send endpoint is
  kind-agnostic (matches by `id` + `class_id` only), so a class film is
  unsent-by-default exactly like a child film.
- **Pre-migration probes**: `potatoCapabilities()` (`lib/potato/db.ts:136-150`)
  correctly gates the 30s negative-cache TTL only on a `false` result (a
  `true` capability is cached forever, matching "a column cannot un-exist");
  confirmed every route consuming `caps.send` degrades to v1.2 behaviour
  rather than 500ing or 503ing where a 503 would be dishonest (only the send
  endpoint itself 503s, correctly, since there's genuinely nothing to do).
- **Backfill SQL** (`migrations/321_potato_snaps_v13_send.sql:41-44`): exactly
  `WHERE status='done' AND sent_at IS NULL` — cannot touch queued/processing/
  failed rows (wrong status) and is naturally idempotent (re-run finds
  nothing left to update once done once), with the one disclosed and accurate
  caveat about the render-between-runs edge case.
- **Regressions**: diffed every one of the 8 changed + 3 new files against
  the live v1.2 tree at `/mnt/user-data/uploads/montree`. Every diff is
  additive and scoped to what BUILD_NOTES_V13.md claims (`git diff`-equivalent
  review, not memory). `app/potato/parents/home/page.tsx` needs no change and
  has none — it never reads `isSent`/`sentAt`, confirming the "one gate"
  claim. The offline-queue pill (`queue.waiting`, `app/potato/teacher/page.tsx:446-454`)
  is untouched by any board-payload change. Default `montage` POST path
  (no `excludedMediaIds`) is byte-identical to v1.2 except for the intended
  floor change (8 → 4).
- **`tsc --noEmit`**: ran against a merged-tree overlay at `/tmp/tsck/proj13`
  (pinned `typescript 5.9.3`), including this audit's proxy-route fix —
  **0 errors**.
- **Greps**: no `lib/montree` import, no `montree_` table reference, no
  `<style jsx>`, no `t(` i18n call, no `.single(` (all `.maybeSingle()`), no
  unescaped JSX text entities, no user-facing occurrence of the word
  "montage" (only in code comments, route paths, and migration names — every
  UI-facing string says "film").
- **UX vs design tabs 12–14**: deselect-all-in-by-default model present and
  matches server floor exactly (`ChildFilmPicker.tsx` FLOOR=4/ENCOURAGED=8
  mirror `CHILD_FILM_MIN`/`MONTAGE_THRESHOLD`); nudge-then-floor sequencing
  correct; ready-to-send ladder state present on both the child row
  (`pt-row--send`) and the class card (`pt-filmcard--send`) with matching
  "only you can see it" framing; preview player present in both the sheet
  and the plain watch modal; Send (glow, primary) vs Remake (quiet, outline)
  hierarchy matches spec; sent confirmation screen present with the
  ring/disc treatment and a "Back to board" exit that refreshes state.

---

## Files touched by this audit

- `app/api/potato/media/proxy/[...path]/route.ts` — **added to this tree and
  fixed** (see HIGH finding above). This file did not exist in the delivered
  potato13 changeset; it is copied from the untouched baseline
  (`/home/claude/build/potato/app/api/potato/media/proxy/[...path]/route.ts`)
  with the send-gate check added, because the gap lives entirely in code that
  BUILD_NOTES_V13.md explicitly (and incorrectly) declared out of scope.

No other files were modified. All MEDIUM/LOW items above are left for the
team per the FIX-FIRST/MED-LOW-document-only instruction.
