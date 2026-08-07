# Potato Snaps — Fresh-Eyes Adversarial Audit

Auditor posture: FIX-FIRST for CRITICAL/HIGH. I did not write this code. Findings below
were independently verified (not taken on the builders' word) — see "Independent
verification" at the end for the harnesses I built and ran myself.

Verdict: **SHIP-WITH-NOTES** (see summary at the very end).

---

## CRITICAL

None found.

---

## HIGH

### H1 — `tp_classes.is_active=false` (the only revocation lever for a 10-year cookie) was not re-checked on 5 of 11 teacher/parent-gated routes
**Status: FIXED**

**Files:** `app/api/potato/children/route.ts` (PATCH), `app/api/potato/children/[id]/face/route.ts`,
`app/api/potato/photos/[id]/route.ts` (DELETE), `app/api/potato/parent-codes/route.ts` (GET+POST),
`app/api/potato/montages/route.ts` (teacher branch), `app/api/potato/media/proxy/[...path]/route.ts`
(both teacher and parent branches).

**Failure scenario:** Teacher and parent cookies live 3650 days (`lib/potato/auth.ts` `TTL_DAYS`).
There is no token-revocation list. The codebase's own repeated comments state the design intent
plainly: *"Deactivating a class (`tp_classes.is_active=false`) is the ONLY way HQ can revoke a
teacher's session."* `board`, `children` GET/POST, `photos` GET, `photos/upload`, and `montage`
already implemented this check correctly (`loadClass()` returns `null` when `is_active===false`,
and every one of those routes 404s on that). But six other surfaces skipped it:
- A departed teacher (or a parent who lost the login card and it was "handled" by deactivating
  the class) could still: edit/rename/retire a child, upload/overwrite a child's face photo,
  delete other children's photos, mint or rotate any child's parent-login code, and read/stream
  every finished montage — indefinitely, using a cookie the operator believes has been shut off.
- `media/proxy/[...path]/route.ts` was the most serious of the six: it is the ONLY path a byte
  ever leaves the private bucket by, so this gap meant a deactivated class's private children's
  faces and films kept streaming forever, which is a confidentiality failure, not just a stale-
  write failure.

**Note on real-world exploitability:** there is currently no dedicated HQ "deactivate a class"
button in the built product (`app/api/potato/hq/classes/route.ts` only has GET/POST, matching
contract §5's HQ scope exactly — no PATCH was ever specified). `is_active` is set to `false` only
by someone running SQL by hand in Supabase, which is this codebase's documented standard
operating pattern for anything the app doesn't expose (see the "Production SQL Rule" this repo's
own house rules bake in). That makes the gap real, not hypothetical: the moment the operator does
that one-line `UPDATE`, they will reasonably believe the class is cut off, when five of eleven
routes and the entire media pipeline would have silently kept working for anyone still holding
the cookie.

**Fix applied:** each of the six spots now calls `loadClass(supabase, session.classId)` (or, for
`montages/route.ts`'s teacher branch, is routed into the file's own pre-existing shared
`tp_classes!inner(..., is_active)` join check by deliberately leaving `childName` unset instead
of assigning it from `loadOwnedChild`'s result) and returns 404 / "not authorized" before doing
any read or write. The `media/proxy` fix fails closed on any lookup error too, including the
pre-migration 42P01 case — which changes nothing observable, since pre-migration the storage
bucket doesn't exist either and every proxy request was already a guaranteed 404.

**Verification:** grepped every route file for `verifyPotatoTeacher` and confirmed all now carry
a `loadClass` call or an equivalent active-status join (`montages/route.ts` correctly shows 0
separate `loadClass` calls because it reuses the stronger shared child+class join instead).
Re-ran the scoped `tsc --noEmit` after all six edits — 0 errors.

---

## MEDIUM

### M1 — `montages/route.ts`'s "class inactive" error message is worded for a parent, not a teacher
**Status: DOCUMENTED (not fixed — cosmetic, not security)**

When the shared active-check in `montages/route.ts` fails for the *teacher* branch (H1's fix
routes it through that same block), the response is `"That code is no longer active."` — correct
copy for a parent who typed a code, mildly confusing for a teacher who signed in with a class
login code and doesn't think of their session as "a code." Not a security issue; a one-line
follow-up (branch the message on which cookie type triggered it) would polish this but isn't
worth a FIX-FIRST edit given the posture (MEDIUM, non-security, cosmetic wording only).

### M2 — `tp_classes.is_active` has enforcement everywhere but no UI/API to actually set it
**Status: DOCUMENTED**

Confirmed against contract §5 line-by-line: HQ is only specified as GET/POST `hq/classes`,
never a PATCH/toggle. The column and its `default true` exist in migration 318 exactly per
contract §2, and — per H1's fix — is now correctly enforced everywhere it's read. But there is
currently no way to flip it to `false` from the product itself; it can only be done via direct
SQL in Supabase. This isn't a defect (nothing is broken, no dead UI calls a missing endpoint —
verified by reading `app/potato/hq/page.tsx` in full: it renders `isActive` nowhere and has no
deactivate button), but it's worth flagging before ship: the revocation mechanism this whole
audit trail (H1) is built around only exists as a manual DB operation today. A future HQ
"Deactivate" button is a natural v1.1 addition, not a blocker.

---

## LOW

### L1 — Local ESLint approximation produced false-positive rule violations; real repo config is clean
**Status: DOCUMENTED — not a build defect, an auditor-tooling note**

I initially lint-checked the build with a generic `jsx-a11y/recommended`-based config and got
10 apparent errors (`jsx-a11y/no-autofocus` ×3, `jsx-a11y/img-redundant-alt` ×3, plus
`@next/next/no-img-element` rule-not-found noise). I then staged the real repo's
`eslint.config.mjs` from the Mac and confirmed it uses `eslint-config-next`'s vitals+typescript
presets with an explicit ruleset override that does not include `jsx-a11y/recommended`'s full
set. I downloaded `eslint-config-next@16.1.1` via `npm pack` (a plain `npm install` hit an
ERESOLVE peer conflict, since it requires `eslint@>=9` and my sandbox had `eslint@8`) and grepped
its packaged rule list directly, confirming only `alt-text`/`aria-*`/`role-*` are registered —
not `no-autofocus` or `img-redundant-alt`. Both apparent findings are therefore false positives
of my own approximate config, not real repo violations. No code changes made; recorded here so a
future session doesn't re-flag them.

### L2 — No harness file found on disk for the week-math engine's claimed "27/27 assertions"
**Status: DOCUMENTED — independently re-verified, not a defect**

`BUILD_NOTES.md` and `POTATO_WORKER_NOTES.md` reference a week-math test pass but no
`*harness*`/`*.test.*` file exists anywhere under `/home/claude/build/potato`. Rather than take
the claim on faith, I wrote an independent 26-assertion suite from scratch (esbuild-bundled
`lib/potato/week.ts` to CommonJS, ran under plain Node) covering the exact edge cases the
contract calls out: the UTC+8 "Sunday trap" (a `toISOString()`-based date key would put a
Sunday-evening local date into the wrong week), DST spring-forward/fall-back week lengths,
cross-timezone Monday boundaries, invalid-date and SQL-injection-payload rejection, and
storage-folder timezone correctness. Result: **26 passed, 0 failed** — independently corroborates
the correctness claim rather than relying on it. Harness left at `/tmp/weekcheck/` (outside the
delivered build tree; not part of the shipped code).

### L3 — Same independent-reproduction treatment applied to the typecheck claim
**Status: DOCUMENTED — independently re-verified, not a defect**

Reconstructed the exact dependency set BUILD_NOTES claims (`typescript@5.9.3`, `next@16.1.1`,
`react@19.2.0`, `jose@5.10.0`, etc.) in a scoped mirror project, staged the real repo's
`tsconfig.json` from the Mac to confirm its actual `@/*` path mapping (it already correctly maps
to `./*` — the audit brief's assumption that the base config maps to a nonexistent `./src` is
itself out of date and can be dropped from future briefs), stubbed the two intentionally
out-of-scope Montree imports `middleware.ts` needs, and ran `tsc --noEmit` myself after every
fix in this report. Result: **0 errors**, both before and after my H1 edits.

---

## Dimension-by-dimension summary

**1. SECURITY (highest priority)** — 1 HIGH found and fixed (H1, six files), 1 MEDIUM documented
(M2). Everything else held up under adversarial review:
- Media proxy path-traversal: safe. Auth segments and upstream-fetch segments are the identical
  array; Supabase Storage is a flat key-value store where `..` has no traversal semantics; an
  explicit `includes('..')` check runs before auth anyway. Confirmed by tracing exactly how
  Next.js parses a catch-all `[...path]` segment array (split first, decode second — no way for
  an encoded slash to desynchronize the auth-check array from the fetch-reconstruction array).
- Bucket hard-lock: confirmed — single hardcoded `POTATO_BUCKET`, no `?bucket=` parameter, no
  Montree-style silent-fallback-to-default trap.
- Ownership verification: now uniform across every mutation route (after H1).
- Montage `media_ids`: server-derived only. `app/api/potato/montage/route.ts` computes it from
  `loadWeekPhotos()`, never accepts it from the client body.
- Parent routes: `childId`/`classId` always come from the parent JWT cookie, never the query
  string or request body — verified in `montages/route.ts` and the proxy route explicitly.
- JWT audience confusion: verified both directions are structurally impossible. A Potato token
  never carries `isAdmin:true` (fails Montree's `verifyAdminToken`), and jose's
  `jwtVerify(..., {audience})` throws if the `aud` claim is absent, so a Montree admin token
  (which carries no `aud` at all) can never pass Potato's `verifyPotatoTeacher`/`verifyPotatoParent`.
  This holds even though both systems share the same `ADMIN_SECRET` signing key, confirmed by
  reading the real `lib/auth.ts` from the Mac.
- HQ auth: SHA-256-then-`timingSafeEqual` on both sides avoids the length-mismatch throw that a
  naive `timingSafeEqual` on raw unequal-length strings would hit; in-memory rate limiter fails
  open (acceptable — HQ is a single-operator surface) with an opportunistic sweep.
- Upload caps: 10MB photo / 10MB face, explicit MIME allowlist on both.
- SQL injection: no raw string interpolation into queries anywhere in the reviewed files; all
  Supabase query-builder calls with parameter binding; the one `.eq('login_code', code)` teacher
  login path is an exact match on an already-uppercased/normalized code, not `.ilike()`, so no
  wildcard-escaping question even arises.

**2. CORRECTNESS** — clean. `loadWeekPhotos()` is the single shared query shape behind both the
board's photo counts and the montage's `media_ids` derivation (WYSIWYG, verified by reading the
function and both call sites). Week-boundary math independently re-verified (26/26, see L2).
Junction counting for multi-tagged photos confirmed correct (a photo tagged to 3 children counts
once per child, matching the contract). `isSetupPending()` (42P01/42703) → clean 503 confirmed on
every route that touches the `tp_*` tables. `.maybeSingle()` used everywhere a zero-row result is
possible — no `.single()` found in the reviewed files. `response.ok` checked before `.json()` in
every `lib/potato/client.ts` helper. Fire-and-forget writes use `.then(onSuccess, onError)`
correctly (the parent-code `last_used_at` stamp).

**3. MIGRATION 318** — clean. All 6 tables match contract §2 field-for-field. RLS enabled with
zero policies on every `tp_*` table (deny-all, service-role-only — grepped, confirmed no
`CREATE POLICY` anywhere in the file). Bucket insert uses `ON CONFLICT (id) DO NOTHING`. FKs and
cascades match. `tz` column present on `tp_classes`. No `montree_` references. Idempotent
(`IF NOT EXISTS` throughout). Renumbering 309→318 independently confirmed correct and necessary
by listing the real Mac `migrations/` directory (309 and up through 317 already exist).

**4. WORKER** — clean. Claim query uses `FOR UPDATE SKIP LOCKED` + `RETURNING *` exactly matching
the montage-worker precedent; status enum (`queued|processing|done|failed`) matches migration
318's CHECK constraint character-for-character. Stale-processing recovery present. Media
re-check drops to `failed` below the 4-photo floor. Bundle re-sync (`syncJobPhotosIntoBundle()`)
runs before every render. Output storage path (`class/<classId>/montages/<childId>/<weekStart>-
<jobId>.mp4`) matches contract §3 exactly, confirmed by reading `montageStoragePath()` directly.

**5. INTEGRATION** — clean. `middleware.ts` diffed against the real Mac original: exactly the two
additive contract §7 changes (`'/potato'` in `WHALE_ONLY_PREFIXES`, `'/potato'` in `publicPaths`),
nothing else touched. `/api/potato/*` is correctly absent from the middleware `matcher` config
(consistent with the pre-existing `/api/story/*` precedent), so middleware never runs for it at
all — safe given SameSite=Lax cookies. No `lib/montree/**` imports anywhere except explanatory
comments. No nested `<style jsx>` anywhere (one hit, and it's a comment explaining why the
pattern is avoided). Hardcoded English confirmed throughout.

**6. UX vs design spec** — clean. Palette/type tokens in `lib/potato/ui.ts`'s `POTATO_CSS` match
`POTATO_SNAPS_DESIGN_SPEC.html`'s CSS custom properties hex-for-hex (`#E8A317`, `#FFD466`,
`#9ED2F0`, `#EAF6FD`, `#FFFDF6`, `#23395B`, `#FF7B6B`, Baloo 2 / Nunito). The 8-photo threshold is
sourced from one constant (`MONTAGE_THRESHOLD` in `lib/potato/db.ts`) and consumed identically by
`board`, `montage`, and the teacher page's `isReady` calculation — no hardcoded "8" duplicated
anywhere to drift. Board row states (empty/collecting/ready/cooking/sent/failed) all present in
`app/potato/teacher/page.tsx` per its own header comment. Parent login flow (`/potato/parents` →
`/potato/parents/home`) uses `router.replace`, not `push`, so the back button can't return to a
submitted login screen.

---

## Independent verification performed (not taken on the builders' word)

- **Week-math**: 26-assertion custom harness, run via Node against an esbuild-bundled copy of
  the real `lib/potato/week.ts` — 26/26 passed.
- **Typecheck**: scoped `tsc --noEmit` against the exact dependency versions cited, using the
  real repo's `tsconfig.json` path mapping (staged from the Mac) — 0 errors before my edits and
  0 errors after all six H1 fixes.
- **ESLint rule severities**: extracted `eslint-config-next@16.1.1`'s actual packaged rule list
  via `npm pack` + direct source grep (installing it hit a peer-dependency conflict) to confirm
  which jsx-a11y rules are genuinely enforced in this repo, rather than trusting an approximate
  local config.
- **middleware.ts diff**: staged the real, current `middleware.ts` from the Mac repo (read-only)
  and diffed it byte-for-byte against the build's copy.
- **Migration numbering**: listed the real `migrations/` directory on the Mac to confirm 318 is
  genuinely the next-free number.
- **Cross-token-forgery reasoning**: staged and read the real `lib/auth.ts` and
  `eslint.config.mjs` from the Mac to verify claims about shared-secret JWT safety and lint rule
  severities against ground truth, not narrative.

---

## Summary of fixes made this session

| # | File | Fix |
|---|------|-----|
| 1 | `app/api/potato/children/route.ts` | Added `loadClass` active-check to `PATCH` |
| 2 | `app/api/potato/children/[id]/face/route.ts` | Added `loadClass` active-check to `POST` |
| 3 | `app/api/potato/photos/[id]/route.ts` | Added `loadClass` active-check to `DELETE` |
| 4 | `app/api/potato/parent-codes/route.ts` | Added `loadClass` active-check to `GET` and `POST` |
| 5 | `app/api/potato/montages/route.ts` | Teacher branch now routes through the shared active-status join instead of bypassing it |
| 6 | `app/api/potato/media/proxy/[...path]/route.ts` | Added class-active check (fail-closed) before authorizing either teacher or parent access to any byte in the bucket |

All six verified with a clean scoped `tsc --noEmit` re-run after editing.
