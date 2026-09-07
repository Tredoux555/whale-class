# Autopilot — night of 2026-09-07

Four agents worked in parallel worktrees off `origin/main` (`c81c7dc`). All four
branches are merged into `autopilot/2026-09-07`, in this order: `ap/types`,
`ap/burnin`, `ap/monday`, `ap/security`. **`origin/main` has since moved to
`4a6107d20` and is merged in on top** — see "Reconciliation with main's security
batch" below, which is the section to read first if you only read one. Nothing is
pushed. The whole night is one bundle you fast-forward on the Mac — procedure at
the bottom.

## What landed

**`ap/types` — the TypeScript burndown (201 files, 21 commits).** The project
now type-checks clean: 714 errors to 0, and `typescript.ignoreBuildErrors` in
`next.config.ts` is **off** (commit `e03f094`), so a type error now fails the
Railway build instead of shipping. The three standalone Railway workers
(`montage-kit/`, `montage-worker/`, `potato-worker/`) are excluded from the root
`tsconfig.json` — never part of the Next app, each type-checks itself. A CI
workflow (`.github/workflows/typecheck.yml`) runs `tsc --noEmit` plus vitest on
every push/PR to `main`. **25 of the fixes changed runtime behaviour**, because
the type error was pointing at a real bug — several are features that have never
worked (Principal Guru's `query_school_data`, the Phonics Dictionary rendering
empty, the camera hanging after a shot, roster paste duplicating every child).
Full list: `docs/handoffs/TSC_BURNDOWN_2026-09-07.md`, "Behaviour changes —
human review". Read it before you deploy.

**`ap/burnin` — tracking burn-in against real Whale-class data (17 files).**
There is now exactly ONE name-reader (`lib/montree/tracking/resolve.ts`); the
duplicate readers in `write-progress.ts`, `work-matching.ts`, the photo-audit
page and the Guru corrections route were rewired onto it, so a work name
resolves the same way everywhere. Migration 349 repairs the live key damage the
burn-in found: 1,145 journal events with a null `work_key` across 388 names, of
which 376 names (1,124 events) resolve to exactly one work. Health grouping and
the summary numbers were made honest. Report:
`docs/tracking/burnin-whale-2026-09-06-report.md`.

**`ap/monday` — weekly admin docs (10 files).** Templates now come before the AI
for all five areas (`lib/montree/tracking/weekly-doc.ts`), the auto-fill route
was rewritten on top of them, and there is a one-button `.docx` export
(`app/api/montree/weekly-admin-docs/export/route.ts`) wired into the page.
Persistence and types changes are additive only.

**`ap/security` — 7 fixes plus a handoff (42 files).** Migration 350 closes a
full **public read/write hole** on seven tables holding child, parent and
teacher PII (the old policies said `USING (true)` with no `TO` clause, which
grants PUBLIC, not service-role). Migration 351 adds session revocation, so one
person's logins can be cancelled without rotating the master key and signing out
every school at once; sliding refresh means a device in daily use never expires.
17 unguarded admin routes now require a principal; `backfill-guides ?all=true`
is scoped to the caller's own school. Media upload/proxy no longer serves
attacker-chosen content types (stored XSS). Super-admin tokens require a
dedicated `SUPER_ADMIN_JWT_SECRET` and fail closed without it; the internal
voice/LLM principal token is capped at 120s. Detail:
`docs/handoffs/SECURITY_FIXES_2026-09-07.md`.

**Pronoun picker — the tracker's He · She toggle.** Whale Class burn-in caught
all nineteen children with an empty `montree_children.gender`, so the engine fell
back to `they` for every one of them and every weekly summary read "They are
starting to…" — unusable in the school's document. Two halves. First, the
fallback is now visible instead of silent: `pronounIsSet()` tells a stated
pronoun from an empty row, the class and child routes ship it as `pronoun_set`,
and where nothing is stated the summary repeats the child's NAME ("Brilla did
Dark Phonics 's' work 1. Brilla is starting to…") rather than guessing a gender,
which rule 11 forbids. Second, the teacher can fix it in one tap: a two-chip
He · She toggle sits on every tracker row and on the child page, rows still on
the fallback wear a dashed gold outline, and the write goes to a new
`PATCH /api/montree/tracking/child-pronoun` (teacher = own classroom, principal =
own school) that sets `gender` to `'boy'`/`'girl'` — the spelling migration 119
introduced and `pronounFrom()` has always read. **No migration to paste**; the
column already exists. `they` is never offered as a target, only shown as the
current state, and the route accepts it to clear the field back to "unsaid".

## Reconciliation with main's security batch

While the night ran, another session pushed three commits to `origin/main` and
they are **live in production**: `ea0460ee8` (security audit batch), `b1c4d4a56`
(dark-phonics mobile audit), `4a6107d20` (dark-phonics two tracks, 191 files).
`origin/main` is merged into `autopilot/2026-09-07` (merge commit — see the new
morning procedure at the bottom).

The two security efforts overlapped almost exactly. **Production main's approach
wins wherever both did the same thing**; the branch keeps only what main does
not already cover.

| # | Area | Main (`ea0460ee8`) — LIVE | Ours (`ap/security`) | Kept |
|---|---|---|---|---|
| 1 | Principal guard on 17 admin routes | `verifyPrincipalRequest()` in `lib/montree/verify-request.ts` | `requirePrincipalOrSuperAdmin()` in `lib/montree/security/require-principal.ts` | **Main's.** Our helper + its test deleted; all 17 routes call `verifyPrincipalRequest`. Behaviour change we accept: super-admin *headers* no longer open a school cockpit route — main's guard is principal-only, and that is what production does today. |
| 2 | Guard regression test | `tests/api/admin-principal-guard.test.ts` — sweeps *every* route.ts in the dir, demands the guard or an explicit `// principal-guard: exempt — …` marker | `tests/security/admin-principal-guard.test.ts` — decision table for our helper + a fixed list of 17 | **Main's** (strictly broader — a new admin route fails it). Ours deleted. |
| 3 | Upload MIME allow-list | `lib/montree/media/safe-upload.ts` (`safeContentType` + `assertUploadSize`) on 9 routes | `validateUploadContentType()` in `safe-content-type.ts` on the montree upload route | **Main's** on the montree routes. |
| 4 | Media proxy content-type | octet-stream + `Content-Disposition: attachment` + `Content-Security-Policy: sandbox` for non-media | `decideProxyContentType()` + `X-Content-Type-Options: nosniff` | **Main's**, plus two of ours re-applied on top: `nosniff` (belt and braces with `sandbox`) and an **SVG exclusion** — main renders any `image/*` inline, but `image/svg+xml` is a scriptable document and pre-allow-list SVGs are still in the bucket. Our `safe-content-type.ts` stays because the **lens** and **potato** proxies still import it; main's batch never touched those two. |
| 5 | `backfill-guides` | POST-only, `?all=true` super-admin only | GET, `?all=true` scoped to the caller's school, `scope=platform` for super-admin | **Main's** (stricter). Our `tests/security/backfill-guides-tenant-scope.test.ts` is superseded and deleted. |
| 6 | Super-admin JWT secret | `SUPER_ADMIN_JWT_SECRET` **required**, no fallback | `SUPER_ADMIN_JWT_SECRET` **required**, plus a 32-char minimum and a refusal to reuse `SUPER_ADMIN_PASSWORD` / `ADMIN_SECRET` | **Same env var name on both sides** (see below). Main's requirement + **our extra length and distinctness checks kept** — main's own error text already asks for "32+ random bytes". |
| 7 | Token issuer/audience | `iss`/`aud` pinned on Montree, CMS and super-admin tokens | — | **Main's**, untouched. |
| 8 | Session revocation | *nothing* | migration `351` + `lib/montree/session-revocation.ts` + the check inside `verifySchoolRequest` (fails open, 60s cache) | **Ours** — main has no revocation mechanism at all. |
| 9 | RLS / PII | *nothing* | migration `350_rls_lockdown_pii.sql` + `tests/security/rls-pii-lockdown.test.ts` | **Ours** — this is still the urgent one. |
| 10 | Voice internal-token TTL, timing-safe compare, `checkRateLimit` arity, `social-guru` auth | arity + social-guru fixed identically; no TTL work | TTL cap + timing-safe compare + the same arity fixes | **Main's wording** for the arity/social-guru fixes (live), **ours** for the voice token TTL and the timing-safe compare. |

### The JWT env var question — answered

**No rename is needed.** Main's commit uses **`SUPER_ADMIN_JWT_SECRET`**, the
same name this branch used, so the Railway instruction below is unchanged in
name. What *did* change is that main also made **`MONTREE_JWT_SECRET`** and
**`CMS_JWT_SECRET`** required (the `|| ADMIN_SECRET` fallbacks are gone), and
main's commit message says **all three were already set in Railway before
`ea0460ee8` shipped**. So there is nothing to add — only to verify that
`SUPER_ADMIN_JWT_SECRET` is at least 32 characters and is not equal to
`SUPER_ADMIN_PASSWORD` or `ADMIN_SECRET`, because this branch enforces both and
main does not. If it fails either check, super-admin token login returns 500
until you regenerate it (`openssl rand -base64 48`).

### Dark phonics (the 191-file change)

Main's **two-track** feature (First language / Second language, `booksRoot(track)`,
per-book tabs) is kept whole. Our **Work 1–5** renumbering survives it — the
library pills still read `Work 1 · Characters` … `Work 5 · Sentence builder
(free)`, and `lib/montree/dark-phonics/tracker-works.ts` and
`v2-shelf/works.ts` still map the `work0-characters.pdf` *filename* to **Work 1**.
Main did **not** re-introduce 0–4 labels anywhere (swept `app/`, `components/`,
`lib/`: zero hits), so nothing had to be re-applied.

### Conflicts and how each was resolved

27 files conflicted. Sixteen were the admin routes and resolved uniformly (take
main's `verifyPrincipalRequest` import, drop our `requirePrincipalOrSuperAdmin`
call sites). The rest: `backfill-guides`, `media/upload`, `media/proxy`,
`onboarding`, `phonics/{images,upload,words}`, `raz/summary`, `social-guru`,
`super-admin/auth` — all taken from main per the table above, with the two
proxy additions (#4) re-applied by hand; `lib/verify-super-admin.ts` — ours kept
(it is a superset of main's requirement), main's `iss`/`aud` constants merged in
cleanly above it; `.gitignore` — both lines kept.

Main's 191 dark-phonics files were written with `ignoreBuildErrors: true` and
brought exactly **one** type error into a checked tree:
`app/api/montree/media/upload/route.ts` logged `uploadError.error`, a property
`StorageError` does not have. Fixed by logging the error object itself — no
`ts-ignore`, no `any`.

## Merge conflicts (between the four night branches)

**There were none.** Seven files were touched by two branches each and git
three-way merged all of them cleanly. I verified each one differs from *both*
parent versions — so no side was taken wholesale, both intents are in — and that
the result type-checks and passes tests: `lib/montree/work-matching.ts`,
`app/montree/dashboard/photo-audit/page.tsx` and
`app/api/montree/guru/corrections/route.ts` (burn-in's rewire onto the one
reader + types' typing and de-`@ts-nocheck`ing);
`lib/montree/weekly-admin/doc-generator.ts` (monday's template path + types'
signatures); `app/api/montree/admin/{activity,overview}/route.ts` and
`app/api/montree/media/upload/route.ts` (security's principal guard and
content-type check + types' row shapes).

I also checked that no feature branch re-introduced an `@ts-nocheck` on a file
`ap/types` had cleaned: the set of `@ts-nocheck` files in the merge is identical
to `ap/types` (22 files). One extra commit of mine removes
`tsconfig.ap-burnin.tmp.json`, a scratch file the burn-in agent left behind that
nothing referenced.

## Verification (all on the merged tree)

**Re-run after merging `origin/main` (tip `4a6107d20`):**

- `npx tsc --noEmit -p tsconfig.json` — **0 errors**, with
  `ignoreBuildErrors: false`. (1 error immediately after the merge; see the
  reconciliation section.)
- `npx vitest run` — **86 files, 1,586 tests, all passing.**
- `npx eslint . --ext .ts,.tsx` — 39 errors, **all pre-existing** (`@ts-nocheck`
  banners on the marketing pages, generated files under `public/` and
  `scripts/curriculum/dist/`, React-Compiler "Compilation Skipped"). Only one
  file carrying an error was touched by the merge at all
  (`app/montree/library/[workId]/page.tsx`), and its `@ts-nocheck` is present on
  both parents. **No new errors.**
- `npx next build` with placeholder env — **passes with type-checking on**
  ("Running TypeScript" in the log), 2 pre-existing Turbopack warnings.

**Original figures, before the merge (the four night branches alone):**

- `npx vitest run` — **83 files, 1,519 tests, all passing.**
- `npx tsc --noEmit -p tsconfig.json` — **0 errors.**
- `npx eslint` on all 252 changed `.ts/.tsx` files — 426 warnings, **1 error**,
  and that error (`PortalChat.tsx:52`, React Compiler "Compilation Skipped") is
  **pre-existing at `c81c7dc`** — I checked the baseline file. No new errors.
- `npx next build` with placeholder env for every Dockerfile ARG — **passes,
  with type-checking on** ("Running TypeScript" appears in the log). Two
  pre-existing Turbopack warnings about broad `readFile` patterns.
- `ignoreBuildErrors` final state: **`false`**. It did not need reverting.

## Does the app start without `SUPER_ADMIN_JWT_SECRET`?

**Yes — it fails closed for super-admin login only, and does not crash.**
`getSuperAdminTokenSecret()` (`lib/verify-super-admin.ts:45`) throws if the
variable is missing, short, or reused, but is never called at module scope. Both
call sites are inside request handlers and both catch: the login route
(`app/api/montree/super-admin/auth/route.ts:129`) returns a 500 with
"Super-admin sessions are not configured", and `verifySuperAdminAuth` catches
the throw in its existing `try` and falls through to the
`x-super-admin-password` header. The `next build` above ran with the variable
unset and succeeded. Deploy order is safe either way — but set it, or
super-admin *token* login stays dead.

## What you must do, in order

**1. Run the SQL, in this order** (each file's own header explains what it does
and why; the SQL is in the file):

1. `migrations/349_progress_keys_backfill.sql` — tracking key repair
2. `migrations/350_rls_lockdown_pii.sql` — **the urgent one**, the public PII hole
3. `migrations/351_session_revocation.sql` — session revocation table

350 and 351 are independent of 349; run all three anyway. 351 must be applied
**before** the code deploy — `verifySchoolRequest` reads that table.

**2. Railway variables — nothing to ADD, one thing to VERIFY.**

`SUPER_ADMIN_JWT_SECRET`, `MONTREE_JWT_SECRET` and `CMS_JWT_SECRET` were all set
by the other session before `ea0460ee8` shipped, and `ea0460ee8` uses **exactly
the same variable name** this branch does — so the "add a Railway variable" step
that used to be here is already done.

What is still worth one minute: this branch enforces two rules main does not, so
open `SUPER_ADMIN_JWT_SECRET` in Railway and confirm it is **at least 32
characters** and is **not equal to** `SUPER_ADMIN_PASSWORD` or `ADMIN_SECRET`.
If it fails either, regenerate it (`openssl rand -base64 48`) before deploying —
otherwise super-admin *token* login returns 500 and everyone falls back to the
password header. Nothing else breaks; the check is not at module scope.

## Decisions waiting on you

- **Session TTL — 30 vs 180 days.** The audit said cut the 3650-day login to 30.
  The security agent deliberately did not, because a school holiday exceeds 30
  days of nobody opening the app and a mid-class lockout is the thing you were
  guarding against. With revocation and sliding refresh in place the number now
  means "how long an *unused* device stays valid", and the suggestion is **180**.
  It is one Railway variable, `MONTREE_JWT_TTL_DAYS`, no code change.
- **The 25 behaviour changes** in `TSC_BURNDOWN_2026-09-07.md` — several dead
  features start working. Skim them against your intent before deploy. Two items
  are left unfinished because they need *content*, not code: the Grammar Boxes
  example sentences and the command-card difficulty levels.
- **The letter-x tracer going live.** Still your call; nothing tonight touched
  it (see `docs/mission-control/HANDOFF_LETTER_TRACER_SESSION14.md`).

## Morning procedure — landing it

The branch is now a **merge commit on top of `4a6107d20`** (the current
`origin/main` tip), so a fast-forward is possible and nothing needs replaying.
`git format-patch` / `git am` are no longer the route — they skip merge commits.

Take the bundle from `/mnt/attach/outputs/autopilot-2026-09-07.bundle` (that
path survives container rebuilds; `/work/autopilot.bundle` is the same file).
Then, on the Mac, in the repo:

```bash
git checkout main && git fetch origin && git merge --ff-only origin/main   # be exactly at 4a6107d20
git bundle verify /path/to/autopilot-2026-09-07.bundle
git fetch /path/to/autopilot-2026-09-07.bundle autopilot/2026-09-07:autopilot/2026-09-07
git merge --ff-only autopilot/2026-09-07
```

The bundle is built as `origin/main..autopilot/2026-09-07`, so it requires
`4a6107d20` to already be present — which it is, since that commit is what is
deployed. The final `--ff-only` therefore succeeds and `main` simply advances;
if it refuses, someone has pushed to `main` again since this bundle was made, and
the merge should be redone rather than forced.

Then push via Desktop Commander. Nothing in this branch has been pushed.

---

## Writing Shelf curriculum + implied works (2026-09-07, later session)

Two commits, one per part, on top of `9c69e18bd`.

### Part A — the eight Writing Shelf trays carry real curriculum content

`ws:1..ws:8` were seeded by migration 346 with a name, a material and a
sequence and nothing else. They now carry the full column set
`montree_classroom_curriculum_works` has had since 099.

- **`lib/montree/dark-phonics/writing-shelf-curriculum.ts`** — THE SINGLE
  SOURCE. Eight typed records: `direct_aims`, `indirect_aims`, `materials`,
  `control_of_error`, `prerequisites`, `quick_guide`, ten `presentation_steps`
  each (with tips), `presentation_notes`, `parent_description`,
  `why_it_matters`, `video_search_terms`, `name_chinese`, `age_range`,
  `sequence`. Every sentence is EXTRACTED from `public/dark-phonics-shelves.html`
  (the Quick / Go deeper / Explain More / Build it tabs) plus the two locked
  specs in `docs/handoffs/`. The two places the page is thin — tray 6's three
  photo sequences, tray 7's "big print" — say **"(from spec)"** in
  `presentation_notes` rather than pretending they came off the page.
- **`scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts`** generates
  **`migrations/352_writing_shelf_curriculum.sql`**. Regenerate with
  `node --experimental-strip-types scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts > migrations/352_writing_shelf_curriculum.sql`.
  A test asserts the checked-in SQL is byte-identical to the emitter's output,
  so a hand edit to the SQL fails the build instead of quietly winning. (The
  script is in `tsconfig.json`'s exclude list, like 344's emitter, because it
  imports with a `.ts` extension for `node --experimental-strip-types`.)
- **352 itself**: `CREATE OR REPLACE montree_seed_writing_shelf_works(uuid)`
  with the full column set, upsert on the PARTIAL index 346 created
  (`(classroom_id, work_key) WHERE work_key LIKE 'ws:%'`), a backfill loop over
  `montree_classrooms`, one transaction, `montree_migrations` row, idempotent.
  **RLS untouched** — no new table, no policy statement.
- **New display names** — `'Writing Shelf tray 3 · Word chains'` and so on.
  `resolve.ts` accepts them, the old bare names (`'Writing Shelf tray 3'`), the
  typed forms (`'writing shelf 3'`, `'ws tray 3'`, `'tray 3 word chains'`,
  `'ws3'`) and now the bare material (`'Word chains'` → `ws:3`) — unique or
  nothing, since the trays are a closed set of eight.
- **`description` stays the MATERIAL alone**, deliberately: `summary.ts` builds
  the parent sentence as "worked on Writing Shelf tray 3, Word chains" out of
  the tray NUMBER plus that column, so a paragraph there would reach a parent.
  `trayNameOf()` now reads the name only for its TAIL, so a display name that
  already carries the material can never produce
  "tray 1 · Sound boxes, Sound boxes".
- Tests: `tests/tracking/writing-shelf-curriculum.test.ts` (39) — completeness,
  every locked spec, the SQL byte-check, every typed form, the summary.

### Part B — implied earlier works

**Constitution rule 7 gained one sentence:** "Dark Phonics works are strictly
sequential within a book: an observed work implies the earlier works of that
book are mastered — derived, never written."

- **`lib/montree/tracking/derive.ts`** — `impliedDarkPhonics(current, works)`
  (which cells, and which observation implies each) and
  `withImpliedDarkPhonics(current, works)` (current state with them filled in).
  Memoised per `(current map, works array)` identity, so the class route pays
  for one pass per child. `dp:` keys only, never across letters, never
  downwards over a higher observed status.
- Applied in `ribbon`, `isLetterMastered` (and so `currentLetter`/`nextLetter`
  and the weekly summary), `planLanguageCell`, `flags` and
  `guidance.nextWorks` — so the next work after an observed work 3 is work 4,
  never work 1.
- **The inside-a-book `gap` flag is gone**, and so is `gap-below` for a dp work
  under an observed one: "work 2 and work 4, nothing between" is a recording
  gap, not a teaching one. The BETWEEN-BOOKS gap is untouched — implication
  never crosses a letter.
- **Routes** `/api/montree/tracking/class` and `/api/montree/tracking/child`
  send `implied: { 'dp:t:1': { implied: true, by_work_key: 'dp:t:4', by_n: 4 } }`
  alongside `current`. A key that is absent was actually observed.
- **Screens**: the tracker `WeekGrid` and the child page render an implied cell
  in the same status style at 0.55 opacity, italic, reading
  **"Done · implied by work N"**, with the observation named in the tooltip.
  Tapping one records a real observation exactly like any other cell — the tap
  path was not special-cased.
- Tests: `tests/tracking/simulated-term.test.ts` gained a rule-7 block —
  photo of `t` work 4 → works 1-3 mastered and ribbon in-progress; work 5
  mastered → `t` gold; correcting work 4 away removes every implication by
  itself; a downward correction that keeps the observation keeps them; the
  guidance next-work case; the plan cell; the summary. Noor's old
  inside-a-book gap assertion is now the assertion that it is implied away and
  that the journal is still untouched. Three fuzz properties now compute their
  expectations from the derived state, as the engine does.

`npx vitest run` 1642/1642 green · `tsc --noEmit` 0 errors · eslint clean.
