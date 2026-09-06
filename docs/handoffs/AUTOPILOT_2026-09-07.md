# Autopilot — night of 2026-09-07

Four agents worked in parallel worktrees off `origin/main` (`c81c7dc`). All four
branches are merged into `autopilot/2026-09-07`, in this order: `ap/types`,
`ap/burnin`, `ap/monday`, `ap/security`. Nothing is pushed. The whole night is
one patch/bundle you apply on the Mac — procedure at the bottom.

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

## Merge conflicts

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

**2. Add the Railway variable BEFORE deploying:**

```
SUPER_ADMIN_JWT_SECRET = $(openssl rand -base64 48)
```

Generate it with `openssl rand -base64 48`. It must be at least 32 characters
and must **not** equal `SUPER_ADMIN_PASSWORD` or `ADMIN_SECRET` — the code
rejects both cases explicitly.

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

```bash
git format-patch c81c7dc..autopilot/2026-09-07 --stdout > /work/autopilot.patch
# transfer to the Mac, then in the repo there:
git checkout main && git pull && git am /path/to/autopilot.patch
```

Then push via Desktop Commander. `format-patch` **skips merge commits**, so two
alternatives are produced alongside it:

- `/work/autopilot.diff` — one squashed diff of everything (`git apply`, then
  commit once) if `git am` trips.
- `/work/autopilot.bundle` — the full history including merge commits
  (`git bundle verify`, then `git fetch /path/to/autopilot.bundle
  autopilot/2026-09-07`). Use this if you want the per-branch history preserved.
