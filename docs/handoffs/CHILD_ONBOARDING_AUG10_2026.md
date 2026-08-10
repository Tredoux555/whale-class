# Child Onboarding — Handoff (Aug 10, 2026)

**Status: SHIPPED, committed, pushed. Commit `71be5bbc` — "Child Onboarding: shared
intake core + Montree & PSS adapters" (44 files) on `origin/main`. Auto-deploys to
montree.xyz + www.teacherpotato.xyz on push. Audited by a fresh-eyes Sonnet pass
(fix-first protocol) — verdict SHIP. `tsc` 0 new errors (15 pre-existing elsewhere),
`eslint` 0 errors, i18n 12/12 parity.**

**⏳ BLOCKING FOR LIVE USE: migrations 326 (Montree) + 327 (PSS) were pasted in chat
for Tredoux — run status is UNCONFIRMED as of this handoff. Until both run, the
feature degrades cleanly (see "Outstanding" below) rather than erroring loudly.**

## 1. What this is

Parents fill in a full intake form for a child at enrollment (identity, family,
emergency contacts, authorized pickup people with photos, health/allergies,
required documents, PIPL-style per-purpose consents, and a free-text
"development" section that feeds Montree's Guru). A teacher reviews the
submission and **commits** it — only on commit does anything touch the child's
live record. The teacher then prints cubby/toothbrush/bed/table labels and
pickup-authorization sheets from the same data.

Built **once** as a neutral shared engine, then wired into **two** completely
separate products with their own auth, storage, DB tables and UI skin:

- **Montree** (this repo, montree.xyz) — parents/teachers already in the
  Montree ecosystem.
- **PSS / Potato Snaps** (www.teacherpotato.xyz, cosmetic rename of "Potato
  Snaps" — routes/tables/identifiers are still `potato`/`tp_`) — the
  standalone montage app.

**There is no AI anywhere in this feature.** It's forms, storage, validation,
and print layouts.

## 2. Architecture: one core, two adapters, zero cross-imports

```
lib/onboarding-core/        <- NEUTRAL. Imports NOTHING from lib/montree/* or
  types.ts                     lib/potato/*. Both adapters import it.
  strings.ts                   PSS importing shared code outside
  validation.ts                lib/supabase-client is normally against PSS's
  print/LabelSheets.tsx         house rule — this is an APPROVED EXCEPTION.
  print/PickupSheets.tsx

lib/montree/child-onboarding/   <- Montree adapter (montree_ tables, montree
app/api/montree/parent/intake/     auth, montree-media bucket)
app/api/montree/child-onboarding/
app/montree/parent/onboarding/
app/montree/dashboard/child-onboarding/

lib/potato/intake.ts            <- PSS adapter (tp_ tables, potato cookies,
app/api/potato/intake/             potato-snaps bucket)
app/api/potato/teacher/intake/
app/potato/parents/onboarding/
app/potato/teacher/onboarding/
```

### `lib/onboarding-core/types.ts` — the shape

`IntakeForm` has 8 sections: `identity`, `family`, `emergency`, `pickup`,
`health`, `documents`, `consents`, `development`. `IntakeStatus` is
`'draft' | 'submitted' | 'committed'`. Key exports:

- `emptyIntake()` — a structurally-complete blank form (every required list
  starts with one empty row).
- `normalizeIntake(input: unknown): IntakeForm` — coerces any blob (JSONB
  column, request body) into a complete `IntakeForm`; missing sections fall
  back to empty so an old client's saved shape always renders.
- `displayName(form)` — preferredName || legalName.
- `criticalAllergens(form)` — severe/moderate allergens for the pickup sheet
  red-flag line (mild allergies stay on the health record only).
- `ageFromDob(dob)`.
- `CONSENT_KEYS` — 5 separate PIPL/GDPR-style consents (`photo_internal`,
  `photo_marketing`, `emergency_treatment`, `sunscreen_medication`,
  `data_privacy`), each its own checkbox + grant timestamp — no blanket
  "I agree".

**Documents are stored as storage paths, never URLs** (`IntakeDocuments.
facePhotoPath`, `vaccinationBookletPath`, `healthCheckPath`,
`medicalCertPaths[]`). A path means nothing outside its bucket; each adapter
resolves it through its own proxy/auth.

### `lib/onboarding-core/validation.ts`

`validateIntake(form): { ok: boolean; errors: string[] }` — the gate a
`status: 'submitted'` POST must pass server-side (never just client-side):
legal name present, dob age 1–8, at least one guardian with a phone, at least
one emergency contact, `data_privacy` consent granted, `facePhotoPath` present.

### `lib/onboarding-core/print/`

`LabelSheets.tsx` — A4 label grids: cubby (2/page), toothbrush (12/page), bed
(6/page), table tent-fold (4/page, rotated top half so it reads both ways when
folded). `PickupSheets.tsx` — prop `rows`, `kind: 'authorization' |
'signinout'`. Both are plain white-paper print components with **plain style
tags, deliberately no `styled-jsx`** (a shared print component can't depend on
a Next.js feature scoped to one app), consumed directly (not through a barrel
export) because they're `'use client'`. Callers resolve storage paths to
`photoUrls` before passing props in — the print components never touch a
bucket.

## 3. The flow (identical on both sides)

1. Parent logs in with an **existing** per-child code (this feature doesn't
   create the login — it reuses whatever invite/parent-code system already
   exists per side).
2. Parent fills the multi-section form + uploads photos/documents (face photo,
   pickup-person photos, vaccination booklet 预防接种证, health check 入园体检,
   medical certs — jpeg/png/webp + pdf, 10MB cap).
3. Parent submits → server runs `validateIntake` → row status `submitted`.
4. Teacher opens the review screen, sees everything, hits **Commit**.
5. On commit: child record updated (face photo promoted to the canonical
   avatar path), status → `committed`.
6. Teacher prints labels + pickup sheets from the committed data.
7. **Re-submission after commit** (family moves house, new allergy appears)
   puts the row back to `submitted` — it **never auto-applies**. A teacher
   must commit again to pull the changes into the live record.

## 4. Montree side

**Migration 326** (⏳ pending): `montree_child_intake` — `UNIQUE(child_id)`,
`data JSONB`, RLS enabled deny-all (service role only, matching house
pattern). Feature flag `child_onboarding` added to
`montree_feature_definitions`, **default ON**, category `teacher_tools`.
Every route double-checks via `isFeatureEnabled`.

**Routes**:
- `app/api/montree/parent/intake/route.ts` (+`/upload`) — `GET` returns this
  parent's authorized children + their intake rows; `POST` saves
  draft/submitted. Child id always comes from `resolveAuthorizedParent`'s
  `authorizedChildIds`, never trusted bare from the body (403 if a
  body-supplied id isn't in the authorized set).
- `app/api/montree/child-onboarding/` — teacher-side list, `[intakeId]`
  commit, print-data, and document routes.

**Storage**: bucket `montree-media`, path `intake/<schoolId>/<childId>/*`.
On commit, the face photo is **promoted** to
`<schoolId>/avatars/<childId>.jpg` and `montree_children.photo_url` is set
with a `?v=` cache-buster. `montree_children.date_of_birth` is written on
commit. **`notes` is deliberately never touched** — that column is
append-only elsewhere in the app and this feature respects that by simply not
writing it.

**Sensitive documents (vaccination booklet, health check, medical certs)**
are served through a **new authenticated route**,
`/api/montree/child-onboarding/document?path=...` — NOT the public media
proxy. It parses the path against a strict intake-path grammar, then requires
either `verifySchoolRequest` (school staff, school must match the path) or
`resolveAuthorizedParent` (parent, child must match the path), then issues a
60-second `createSignedUrl` and 302s to it with `Cache-Control: private,
no-store`. Face photos and pickup-person photos stay on the existing
`getProxyUrl` public-proxy pattern (needed so printed sheets/labels work
without an auth header) — the split is deliberate: only the docs that are
genuinely sensitive (medical paperwork) get the locked-down path.

**Path-ownership scrub**: `ownsIntakePath` / `scrubForeignIntakePaths` in
`lib/montree/child-onboarding/types.ts` strips any client-sent storage path
that doesn't sit under that child's own intake prefix, applied server-side on
every POST — mirrors the equivalent PSS function. Existence of a path string
is not ownership of the file it points to.

**Guru integration**: `lib/montree/guru/context-builder.ts` loads the
committed intake **fail-soft** inside the existing big `Promise.all`, and
injects a `"PARENT INTAKE (provided by family at enrollment):"` block right
after the mental_profile block. `montree_child_mental_profiles` remains
voice-onboarding's exclusive territory — intake data is additive context, it
does not write to or replace that table.

**UI**: parent form at `app/montree/parent/onboarding` (dark-forest register
theme, accordion sections, mobile-first) + a dashboard banner prompting
completion; teacher side at `app/montree/dashboard/child-onboarding` (list →
review → print, standard `.btn` classes per the Aug 10 Soft Elevation design
lock) plus a 🧾 entry-point button on the students page.

**i18n**: 31 `childOnboarding.*` keys, 12/12 locale parity, zh hand-written
(not machine-filled, per house standard for launch copy).

## 5. PSS side

**Migration 327** (⏳ pending): `tp_child_intake` — same JSONB shape, keyed
by `class_id` (PSS's security prefix — there's no separate school_id
concept), RLS enabled deny-all, wrapped in `BEGIN`/`COMMIT`, **no storage
bucket SQL** (the "bucket lesson learned" rule from Potato Snaps v1.2 — bucket
creation is dashboard-only, never SQL).

**`lib/potato/intake.ts`**:
- `intakeReady(supabase)` — a **sibling probe function**, deliberately NOT
  folded into the existing `potatoCapabilities` capability cache. Reason:
  `probeColumn` (the underlying primitive) **rethrows** `42P01` (undefined
  table) rather than swallowing it, and `loadClass` calls `probeColumn`
  everywhere else in the codebase — folding intake's brand-new table into
  that shared probe would make every unrelated `loadClass` call start
  throwing until migration 327 runs. `intakeReady` catches `42P01` itself,
  returns `false` (missing table → clean `503 migration_pending`), and caches
  the negative result for 30s so a not-yet-migrated deployment doesn't hammer
  Postgres with repeated failed lookups.
- Storage paths `class/<classId>/intake/<childId>/*`.
- `scrubForeignPaths` — same ownership-scrub pattern as the Montree side.
- A print-row projection for the teacher's print screens.

**Routes**:
- `app/api/potato/intake/` (+`/upload`) — the parent's own end.
  **`childId` is NEVER read from the request body** — it comes exclusively
  off the `potato_parent` cookie (minted against one specific child's parent
  code). There's no `childId` field in the route's request shape at all, so
  there's nothing to tamper with.
- `app/api/potato/teacher/intake/` (+`[childId]`) — list, commit, print-data.

**Media proxy extension**: one new parent-facing branch added to the existing
proxy — `kind === 'intake' && segments[3] === parent.childId` — inserted
**after** the existing class-ownership gates. The teacher branch is
untouched. The v13 `sent_at` class-film gate (parents can't see an
unsent montage) is byte-identical to before this change.

**Commit**: the face photo is **downloaded then re-uploaded** to
`class/<classId>/faces/<childId>.jpg` — NOT `storage.copy`, because `copy`
409s when the destination already exists (a re-committed intake after a
family update). This happens **before** the status flips to `committed`, so
a failed photo write doesn't leave a half-committed row.

**Deliberate asymmetry**: PSS commit does **not** rename the child — the
parent's legal name is shown in the review screen, and the teacher renames
manually if they want to. Montree's commit **does** update the child's name
from the intake (`preferredName || legalName`). This is intentional, not an
oversight — see §7.

**UI**: `pt-*` scrapbook theme throughout. Parent form at
`app/potato/parents/onboarding` + a home-screen card; teacher side at
`app/potato/teacher/onboarding` (list → review → commit → 6 print buttons)
plus a board link. **English-only** — PSS has no i18n system, but the core's
`IntakeStrings` interface makes it multilingual-ready whenever PSS gets one.

## 6. Audit trail (fresh-eyes Sonnet pass, fix-first protocol)

- **CRIT** — i18n keys missing on disk despite the build session's own
  summary claiming they were written. **Fixed**: en+zh hand-written, a fill
  script backfilled the other 10 locales. **Lesson for future sessions:
  verify a builder's "i18n keys added" claim against the actual files on
  disk** — file-write losses mid-session happen and self-reported summaries
  can be wrong.
- **HIGH** — no entry point existed to the Montree teacher review page.
  **Fixed**: added the 🧾 button on the students page.
- **HIGH** — Montree lacked the path-ownership scrub that PSS already had.
  **Fixed**: mirrored PSS's `scrubForeignPaths` as
  `scrubForeignIntakePaths`.
- **HIGH** — sensitive medical documents were being served through the
  public media proxy. **Fixed**: built the dedicated authenticated
  `/document` route described in §4.
- **Final verdict: SHIP.**

## 7. Outstanding / not yet verified

1. **Migrations 326 + 327 — run status UNCONFIRMED.** SQL was pasted in
   chat for Tredoux to run in the Supabase SQL editor. Until both run:
   Montree's feature-flag lookup and intake queries fail-soft (the feature
   effectively stays invisible rather than 500ing); PSS returns a clean
   `503 { error: 'migration_pending' }` from every intake route. **Confirm
   both have run before doing a live walk.**
2. **No live runtime walk has happened yet.** After migrations run: do a full
   parent submit → teacher review → commit → print pass on *both* Montree
   and PSS, ideally with a throwaway test child on each.
3. **Print layouts are unverified against real paper.** Expect sizing/margin
   nudges once someone actually prints a cubby label or pickup sheet sheet
   and holds it up to the intended physical use (a real cubby, a real door
   clipboard).
4. **PSS has no ZH strings map for the core yet** — `IntakeStrings` is
   English-only on the PSS side; the interface is ready for a `zh` map
   whenever PSS wants one; it wasn't asked for at launch.
5. **Montree vs PSS commit-time naming is intentionally asymmetric** — see
   §5's "Deliberate asymmetry" note. Do not "fix" this without checking with
   Tredoux; it was a deliberate call during the build, not a bug.

## 8. How to verify live (once migrations 326 + 327 are confirmed run)

**Montree** (montree.xyz):
1. As a parent with an existing child login, go to
   `/montree/parent/onboarding`. Fill every section, upload a face photo +
   at least one document, submit.
2. As that child's teacher, go to `/montree/dashboard/child-onboarding`,
   find the submission, open the review screen — confirm every field and
   every uploaded document renders (the sensitive docs should load via the
   `/api/montree/child-onboarding/document` route — check Network tab for a
   302 + signed Supabase Storage URL, not a public proxy URL).
3. Hit Commit. Confirm the child's avatar and date of birth update
   immediately in the students list, and that `notes` was NOT touched.
4. Print cubby labels, a pickup-authorization sheet — confirm the data
   matches what was submitted, and severe/moderate allergens show on the
   pickup sheet.
5. As the parent again, re-submit with one changed field (e.g. a new
   allergy). Confirm the row goes back to `submitted` and the teacher has to
   commit again before it reflects on the child record.

**PSS** (www.teacherpotato.xyz):
1. As a parent with an existing per-child code, go to
   `/potato/parents/onboarding`. Fill it in, upload documents, submit.
2. As the teacher, `/potato/teacher/onboarding` → review → Commit. Confirm
   the child's face photo lands at
   `class/<classId>/faces/<childId>.jpg` and the child's NAME did **not**
   change (expected — see §5/§7.5).
3. Print all 6 print buttons' outputs and spot-check the data.
4. Confirm a family re-submission after commit reopens the row to
   `submitted` without touching the live child record until re-committed.

## 9. Where to extend

- **New label type** (e.g. a nap-mat label): extend the union/type in
  `lib/onboarding-core/print/LabelSheets.tsx` and add its grid layout there;
  both adapters get it automatically since they render through this shared
  component.
- **New language for the core strings**: add a `ZH` (or other locale) map
  next to `EN` in `lib/onboarding-core/strings.ts` implementing
  `IntakeStrings` — this is compiler-enforced (TypeScript will error on any
  missing key), so a partial translation can't ship silently.
- **New intake field**: (1) add it to the right section interface in
  `lib/onboarding-core/types.ts` and to `emptyIntake()`/`normalizeIntake()`;
  (2) add copy for it in `lib/onboarding-core/strings.ts`; (3) if it's
  required for submission, add the check to `validateIntake()` in
  `lib/onboarding-core/validation.ts`; (4) both the Montree and PSS forms
  render sections generically off the shared types, so the new field shows
  up on both once the type/strings exist — you only write UI code if the
  field needs a non-generic input control.
- **A third adapter** (a hypothetical future product): follow the Montree or
  PSS adapter directory shape — own DB table with its own security prefix,
  own storage bucket + path convention, own auth, import
  `lib/onboarding-core` for shape/validation/print. Never import the other
  adapter's `lib/montree/*` or `lib/potato/*` code.
