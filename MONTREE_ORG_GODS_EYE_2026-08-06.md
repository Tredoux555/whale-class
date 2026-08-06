# 🏛 SESSION — Aug 6, 2026 — ORG TIER PHASE 6b: DIRECTOR LOGIN CODES + GOD'S EYE

**One migration pending Tredoux's Supabase run: `migrations/317_montree_org_director_logins.sql`.
Nothing in this session works end-to-end until that runs — but nothing BREAKS before it either.
Every new path is 42703-safe: registration still succeeds without a code, the org login page still
takes email + password, and the super-admin console falls back to a code-less director list.**

Everything below is additive. The existing email + password director login, the invite chain
(super-admin → organisation → school → teacher → child), and every principal/teacher surface are
untouched in behaviour.

> **Adversarial-review pass (same session).** An independent reviewer went over the build; auth
> boundaries held (no forged claims, no cross-org entry, clean 317-not-run degradation). The
> defects it found are all fixed — see **"Adversarial-review fixes"** below for the per-item list.
> **Design ruling folded in:** the director has FULL God's-Eye powers — read AND write, reset
> teacher codes/passwords, toggle features, everything a principal can do. It is NOT a read-only
> view. Accountability is handled by provenance (the enter-school audit line + the acting claims),
> not by restricting what she can touch.

---

## What was built

### A1 — Director login codes + a uniform porthole

Every other human in Montree signs in by typing a 6-character code. The organisation director was
the one role that could not — they only ever had the email and password they chose when they
redeemed their invite link. That asymmetry showed in the room: a director standing next to their
principals had to be told "not you, you use the other page."

- **Migration 317** adds `montree_organization_admins.login_code TEXT`, nullable, with a partial
  UNIQUE index (`WHERE login_code IS NOT NULL`). Plaintext, exactly like
  `montree_teachers.login_code` and `montree_school_admins.login_code` — the house posture, because
  an operator has to be able to read it back to whoever lost theirs.
- **`lib/montree/org/director-login-code.ts`** (new) is the only place a director code is minted.
  It calls the SAME `generateSecureCode()` every teacher and principal code comes from
  (`lib/montree/secure-code.ts` — crypto.randomBytes with rejection sampling, house 32-char
  alphabet, no 0/O/1/I) and adds the two things a director code needs on top: a uniqueness probe,
  and a fail-soft `null` return when migration 317 has not been run.
- **`register-organization`** issues a code alongside the password and returns it once
  (`loginCode`, `no-store`). If the column is missing, registration proceeds without one.
- **`POST /api/montree/org/login`** now takes EITHER `{code}` (6 chars, trimmed + upper-cased, the
  same normalisation the teacher and principal code paths use) OR `{email, password}`. Same
  fail-CLOSED rate limit, same audit trail, same `last_login_at` stamp, same deliberately identical
  error for a missing account and a wrong credential. The email + password branch is byte-for-byte
  what it was; it is simply checked second.
- **`/montree/org/login`** is now two-mode, with the CODE box primary (it opens on it) and
  email + password one tap away. Same Lanternlight card, same `fn-code-input` as
  `/montree/login-select`.
- **`/montree/login-select`** gained an "I lead an organisation" link to `/montree/org/login`,
  styled as the existing help links are. A director's code cannot resolve through
  `/api/montree/auth/unified` — that route matches teachers, principals, agents and parents, never
  `montree_organization_admins` — so the link is the honest answer rather than a fifth branch in
  that funnel.
- **The OrgJoinWizard now has a third screen**: the code, shown once, in large gold monospace with
  a copy button and the line "Keep it safe. This is the only time it is shown." Previously the
  wizard pushed straight to `/montree/org`.

### A2 — Dead-invite pages link to sign-in

The most common reason an invite link does not work is that it ALREADY worked: the person redeemed
it, closed the tab, and came back to the same link in a chat thread days later.
`inviteStatusMessage('used')` already told them to sign in; there was no way to.

- **OrgJoinWizard** dead branch → primary button to `/montree/org/login`.
- **SchoolJoinWizard** dead branch → primary button to `/montree/principal/login`; "register
  anyway" demoted to the quiet secondary link (registering again would create a second, unlinked
  school).
- Existing `inviteStatusMessage()` copy is unchanged in both.

### A3 — Principals can reset teacher passwords

`password_set_at` made the first-time-setup path one-shot: a teacher who forgot their password had
exactly one route back, which was a ticket to Tredoux. A principal already regenerates their
teachers' login codes; a password is the same authority over the same people.

- **`POST /api/montree/auth/set-password`** gained a third auth path: an authenticated principal
  (`verifySchoolRequest`, `role === 'principal'`) whose JWT-derived `schoolId` equals the target
  teacher's `school_id`. Cross-school attempts get a 403 and an audit line. The super-admin header
  path and the unauthenticated first-time path are unchanged.
- `{generate: true}` (administrators only) has the server mint the password via the new
  `generateTempPassword()` in `lib/montree/secure-code.ts` — 4 upper + 4 lower + 2 digits from the
  unambiguous house alphabet, so it satisfies `lib/password-policy.ts` by construction and is
  readable over the phone. Returned once, `no-store`.
- **UI**: "Reset password" sits directly under "Regenerate code" in the teacher kebab on
  `/montree/admin/classrooms/[classroomId]`, and the result is revealed in the SAME modal, through
  the same `CodeRevealBlock` (which grew `lead` / `copyLabel` / `wide` props rather than a
  near-identical twin).
- Audit: `action:'password_change'`, `resourceDetails.method:'principal_reset'`, `isSensitive`.

### A4 — Super-admin organisations god view

- **GET `/api/montree/super-admin/organizations`** now returns, per organisation, its `admins`:
  name, email, **plaintext `loginCode`**, `lastLoginAt`. `no-store` on every response, same posture
  as `/api/montree/super-admin/all-logins`. On a database without migration 317 it retries without
  the column rather than failing the console.
- **POST** on the same route, both audit-logged `isSensitive`, both returning the new secret once:
  - `{action:'regenerate_login_code', adminId}` → fresh code.
  - `{action:'reset_password', adminId}` → fresh `generateTempPassword()`, bcrypt on the row.
- **POST `/api/montree/super-admin/organizations/[id]/view-as`** (new) mints an `org_admin` JWT for
  that organisation with `actingAsSuperAdmin: true`, sets the `montree-auth` cookie server-side, and
  the client navigates to `/montree/org`. Rate-limited 5/15min fail-closed and audit-logged
  `isSensitive`, matching `/api/montree/super-admin/login-as`.
  It deliberately does NOT borrow the director's credential — "super_admin viewed org X" is a more
  honest audit line than one indistinguishable from the director signing in.
- **`/montree/org`** renders a slim persistent gold banner "Super-admin view · {org name}" whenever
  the session carries the claim.
- **`/montree/super-admin/organizations`** gained a **Directors** section: every director, their
  live code, last sign-in, and the three actions. The revealed secret appears inline where the
  action was taken.
- **`/api/montree/super-admin/all-logins`** gained an `org_directors` section (same shape
  conventions as `principals`: `kind` discriminator, plaintext `login_code`, last sign-in;
  `organization_id`/`organization_name` in place of school). It is read SEPARATELY from the four
  original reads, which throw on error — a database without migration 315 or 317 must still show
  every school login, so a missing table here is an empty section, never a 500.

### B1 — Director "Enter School" (God's Eye)

- **POST `/api/montree/org/enter-school` `{schoolId}`** — `verifyOrgRequest`, then the school's
  `organization_id` must equal the JWT-derived `organizationId`. A malformed (non-UUID) id, a school
  outside the organisation, and a school that does not exist all get the SAME 403 (anything else
  turns the endpoint into a probe for real school ids). Locked schools (migration 286) are refused
  with their own code. Mints a **full principal token, short-lived (8h)**, carrying the acting
  claims — and preserving `actingAsSuperAdmin` if the entering session had it — then redirects to
  `/montree/admin`. The director has full principal powers in there (read AND write); the short TTL
  is the revocation lever for a borrowed seat.
- **POST `/api/montree/org/return-to-org`** — no body; reads `actingOrgAdminId` +
  `actingOrganizationId` off the signed token, re-verifies that the director row still exists and
  still belongs to that organisation and that the organisation still exists, then re-mints an
  `org_admin` token and redirects to `/montree/org`. The enter-specific claims are dropped, but
  `actingAsSuperAdmin` is carried back if it was present (so a super-admin who entered a school from
  a super-admin org view returns to a super-admin org view — the banner survives the round trip). A
  principal token with no acting claims gets a clean 403 and nothing changes.
- **Banner**: `app/montree/admin/layout.tsx` renders "Organisation view · {school name} ·
  [Return to organisation]" whenever the session carries `actingOrgAdminId`. The layout learns it
  from `/api/montree/auth/me`, which it already treats as the single authority on the session — the
  claim comes off the signed token, never from localStorage, in either direction.
- **Org dashboard**: each school card gained an "Enter school" button. It is a HARD navigation
  (`window.location.href`), because the cookie has been swapped and React state built for an
  organisation session has no business inside a school cockpit.

### B2 — Org dashboard engagement signals

`GET /api/montree/org/schools` now returns per school:

| field | definition |
|---|---|
| `lastTeacherActivityAt` | max `last_login_at` across ACTIVE teachers, or `null` if none has ever signed in |
| `idleTeacherCount` | active teachers with no login in 3+ days — **exactly** the `/api/montree/admin/today` definition, so the director and the principal never see two different numbers for the same word |
| `quietChildCount` | children with no teacher-confirmed photo in 8 days — again the `/admin/today` definition; `null` when the signal could not be computed honestly |

The dashboard renders them as one quiet line under the school's name
("Last teacher activity 2d ago · 1 idle teachers").

**Query discipline:** still no N+1 — three bulk reads for the whole organisation regardless of how
many schools it holds. The observation signal added exactly one read.

🚨 **The reads are now PAGED.** PostgREST caps a plain select at ~1000 rows and says nothing about
it. A truncated media read would not be a missing signal, it would be a WRONG one — an organisation
with more than a thousand confirmed photos in eight days would have most of its children reported
as unobserved. All three reads page with `.range()` (1000/page, 25-page hard stop). If the budget is
blown, `quietChildCount` comes back `null` and the dashboard says nothing rather than something
plausible and false. This also fixed a latent (pre-existing) truncation in the child and teacher
counts for organisations above 1000 rows.

---

## The auth-claim design

Three optional claims were added to `MontreeTokenPayload` (`lib/montree/server-auth.ts`), threaded
through `verifyMontreeToken` → `VerifiedRequest` (`lib/montree/verify-request.ts`) → `OrgContext`
(`lib/montree/org/verify-org-request.ts`) and `/api/montree/auth/me`:

| claim | written by | means |
|---|---|---|
| `actingAsSuperAdmin: true` | `super-admin/organizations/[id]/view-as` | the platform owner is looking through this organisation |
| `actingOrgAdminId` | `org/enter-school` | the `montree_organization_admins.id` to hand the session back to |
| `actingOrganizationId` | `org/enter-school` | the organisation to re-mint for on the way back |

**They are informational and never widen access.** A principal token carrying `actingOrgAdminId` is
scoped to its `schoolId` exactly like any other principal token; every route filters the way it
always did. What the claims buy is (a) an honest banner on the surface being viewed, and (b) the one
piece of state the way back needs — carried in a signed token instead of a server-side session
table.

`createMontreeToken` OMITS them entirely when absent, so an ordinary token is byte-identical to what
it produced before this session.

### The `enter-school` userId question (the one real design decision)

A principal token's `sub` is not decoration. `auth/me` returns `authenticated:false` unless it
resolves to a teacher row or a school-admin row of that school (and the whole cockpit body is gated
on that call); `admin/principal-agent` (Astra) hard-403s unless it is an ACTIVE principal row;
`montree_meeting_notes.principal_id`, `montree_parent_meetings.principal_id`,
`montree_principal_memory.principal_id` and `montree_conversations.principal_id` are all foreign keys
to `montree_school_admins`.

Using the org admin's own id was never viable — it is a `montree_organization_admins` id, satisfies
none of the above, and the cockpit would look broken while the director stood in it.

**Decision — `resolvePrincipalRow()` in `app/api/montree/org/enter-school/route.ts`:**

1. the oldest ACTIVE `role='principal'` row for that school (what every school registered through an
   organisation invite has, because `org/register-school` creates exactly one);
2. else the oldest other ACTIVE admin row (auth/me accepts it and reports its role honestly; Astra
   declines, which is the correct outcome for a school that genuinely has no principal);
3. else a clean **409 `no_principal`** with copy that names the problem.

**Explicitly rejected: creating a shadow admin row.** A director wields FULL principal powers inside
a school (read AND write — resetting codes/passwords, editing rosters, toggling features), so the
seat must be a REAL admin row that already belongs there. Fabricating one would spawn a phantom
person in the school's own `/api/montree/admin/today` header and its teacher-facing surfaces — a
different, worse thing than acting AS an existing principal. A school with no admin row at all is the
teacher-led `/try/instant` shape, and the honest answer there is "there is no principal account to
act through yet."

The session that `enter-school` mints is a full principal token with two deliberate differences: it
carries the acting claims (so the way back and the banner work), and it is **short-lived (8 hours)**
rather than the ~10-year token a real principal holds — a borrowed seat with full powers must expire
on its own; the director re-enters when it lapses.

---

## Security notes

- **Never trust a client-supplied org/school id.** `enter-school` treats `schoolId` as an unverified
  claim, rejects a malformed (non-UUID) id with the SAME 403 an out-of-scope id gets (so it never
  distinguishes "wrong shape" from "not yours", and a bad id can't reach Postgres and surface as a
  distinguishable 500), then checks the real id against the JWT-derived `organizationId` that
  `verifyOrgRequest` re-read from the database on that same request. Out-of-scope and non-existent
  both return the same 403.
- **Client IP is no longer spoofable.** `getClientIP` (shared infra) preferred `X-Forwarded-For`'s
  FIRST hop, which is attacker-controlled (the edge appends, so the client's value stays first) —
  that made every fail-closed limiter both bypassable and a spoofed-IP lockout weapon. It now prefers
  `cf-connecting-ip`, then the LAST (edge-appended) hop of `x-forwarded-for`, then `x-real-ip`.
  Signature unchanged; every existing caller benefits.
- **Codes never enter the audit table.** `org/login` logs the email (or the IP) and a `via`
  discriminator on failure — never the code that was typed. Same posture as the teacher and
  principal code paths. A SUCCESSFUL director login is now audited too (`login_success`, with `via`
  code/password and the org id) — a plaintext code the console displays otherwise left no trace.
- **Every credential-bearing response is `no-store`**: `register-organization` (new code),
  `set-password` (generated password), the super-admin organisations GET (plaintext codes) and both
  POST actions, `all-logins` (already was), `enter-school`, `return-to-org`, `view-as`, and — new
  this pass — `POST`/`PATCH` on `/api/montree/admin/teachers` when they return a plaintext code.
- **Rate limits.** `org/login` keeps 5/15min fail-CLOSED for both doors. `view-as` is fail-CLOSED,
  applied AFTER the super-admin gate and keyed on the authenticated identity (`super_admin`, 30/15min)
  rather than a spoofable IP — so anonymous traffic can neither trip it nor lock the owner out.
  `enter-school` and `return-to-org` have none, deliberately and by house precedent (no
  `/api/montree/org/*` authenticated route does): they require a live session established through a
  metered door and can only reach things the caller already owns. They are audit-logged `isSensitive`.
- **Teacher-management writes require a principal.** `POST`/`PATCH`/`DELETE` on
  `/api/montree/admin/teachers` now require `role === 'principal'` (a pre-existing hole — any school
  session could regenerate a colleague's code, which also overwrote their `password_hash`). Code
  regeneration + teacher creation are now audit-logged `isSensitive`. An org director acting through a
  school carries a principal token, so God's-Eye writes pass exactly like a real principal's.
- **Everything sensitive is audit-logged `isSensitive`**: `org_enter_school`,
  `org_enter_school_denied`, `org_return_to_org`, `org_director_code_regenerated`,
  `password_change` (org director + principal reset), `login_as` for view-as, `teacher_created`,
  `teacher_code_regenerated`, and `org_login` success/failure.
- **`return-to-org` re-verifies rather than trusts.** The claim proves the session was minted by a
  director; it does not prove that director, their membership, or the organisation still exists — and
  the JWT TTL is effectively permanent (10 years, house policy). All three are re-read.
- **RLS is unchanged and still cosmetic.** Migration 317's header says so explicitly; the API layer
  is the boundary.

---

## Files touched

**Created (6)**

| file | what |
|---|---|
| `migrations/317_montree_org_director_logins.sql` | `montree_organization_admins.login_code` + partial unique index. Idempotent, 315-style header |
| `lib/montree/org/director-login-code.ts` | normalise + mint a unique director code; fail-soft pre-migration |
| `app/api/montree/org/enter-school/route.ts` | director → principal session for one of their own schools |
| `app/api/montree/org/return-to-org/route.ts` | principal session → back to the organisation |
| `app/api/montree/super-admin/organizations/[id]/view-as/route.ts` | super-admin → org_admin session with `actingAsSuperAdmin` |
| `MONTREE_ORG_GODS_EYE_2026-08-06.md` | this file |

**Modified (32; the i18n row is 12 files)**

| file | what changed |
|---|---|
| `lib/montree/server-auth.ts` | three optional acting claims on `MontreeTokenPayload`, signed + verified, omitted when absent |
| `lib/montree/verify-request.ts` | acting claims propagated onto `VerifiedRequest` |
| `lib/montree/org/verify-org-request.ts` | `OrgContext.actingAsSuperAdmin` |
| `lib/montree/secure-code.ts` | `generateTempPassword()` (+ split alphabets) for administrator-issued passwords |
| `app/api/montree/org/register-organization/route.ts` | issues + returns a login code once, `no-store` |
| `app/api/montree/org/login/route.ts` | accepts `{code}` as a second door; email + password branch unchanged |
| `app/api/montree/org/schools/route.ts` | engagement signals + paged reads + `acting.asSuperAdmin` |
| `app/api/montree/auth/me/route.ts` | returns `acting` for cockpit banner |
| `app/api/montree/auth/set-password/route.ts` | principal reset path + server-generated password |
| `app/api/montree/super-admin/organizations/route.ts` | directors on GET; POST regenerate-code / reset-password |
| `app/api/montree/super-admin/all-logins/route.ts` | `org_directors` section, guarded read |
| `app/montree/org/login/page.tsx` | two-mode login, code primary |
| `app/montree/org/page.tsx` | super-admin banner, Enter school, engagement line |
| `app/montree/org/join/[token]/OrgJoinWizard.tsx` | login-code success screen; dead-link sign-in button |
| `app/montree/school/join/[token]/SchoolJoinWizard.tsx` | dead-link → principal login |
| `app/montree/login-select/page.tsx` | "I lead an organisation" link |
| `app/montree/admin/layout.tsx` | Organisation-view banner + return handler + banner desktop offset |
| `app/montree/admin/classrooms/[classroomId]/page.tsx` | Reset password action + shared reveal block |
| `lib/montree/i18n/{en,zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` (12) | 21 new keys, English values in all 12 — the same way the existing `org.*` block shipped |
| `lib/montree/audit-logger.ts` | **(adversarial fix H3)** `getClientIP` hardened against X-Forwarded-For spoofing — shared infra, signature unchanged |
| `app/api/montree/admin/teachers/route.ts` | **(adversarial fix H4)** principal role gate + `no-store` on code responses + audit on create/regenerate |

---

## Adversarial-review fixes (same session)

Each item below was raised by the reviewer and is fixed in the file(s) named. Auth boundaries had
already passed; these are the real defects.

| # | Severity | Fix | Where |
|---|---|---|---|
| **H1** | HIGH | `enter-school` tokens are now short-lived (8h `ttlSeconds`) instead of the ~10-year principal default — the effective revocation lever for a borrowed full-power seat. `return-to-org` already re-derives org membership. | `org/enter-school/route.ts` |
| **H2** | HIGH | `actingAsSuperAdmin` no longer laundered away by enter→return. `enter-school` PRESERVES it from the incoming org token onto the principal token; `return-to-org` reads it off the principal token and carries it back onto the re-minted org_admin token. Super-admin provenance survives the whole round trip. | `org/enter-school`, `org/return-to-org` |
| **H3** | HIGH | `getClientIP` no longer trusts the client-controlled first hop of `X-Forwarded-For` (which made every fail-closed limiter bypassable AND a spoofed-IP lockout weapon). Prefers `cf-connecting-ip` → last XFF hop → `x-real-ip`. Shared infra; signature unchanged, all callers benefit. | `lib/montree/audit-logger.ts` |
| **H4** | HIGH | Pre-existing hole closed: `/api/montree/admin/teachers` POST/PATCH/DELETE had NO role check — any school session could regenerate a colleague's code (overwriting `password_hash`) and rewrite email/role. Now requires `role === 'principal'`; `no-store` on plaintext-code responses; create + regenerate audit-logged `isSensitive`. Behaviour identical for principals. | `admin/teachers/route.ts` |
| **M2** | MED | `set-password` principal path no longer applies a body-supplied `email` (montree_teachers.email has no UNIQUE index → cross-tenant login DoS). Email handling dropped on that path only; super-admin + first-time paths untouched. | `auth/set-password/route.ts` |
| **M3** | MED | The three `.range()`-paged reads in `org/schools` now carry `.order('id')` — LIMIT/OFFSET without a stable sort could double-count/drop rows and make `quietChildCount`/counts silently wrong. | `org/schools/route.ts` |
| **M4** | (accountability) | Left directors with FULL powers (per the ruling); did NOT restrict to read-only. Provenance = the `org_enter_school` audit line + acting claims. **Known limitation documented** (see follow-up 8): individual writes under an enter-school session are attributed to the school's real principal row; only the enter event ties them to the director. All "read-only" wording removed from code + this doc. | (docs + comments) |
| **M5** | MED | `org/login` now audits SUCCESSFUL sign-ins (`login_success`, `via` code/password + org id), not just failures — a console-displayed plaintext code otherwise left no trace. Code itself never logged. | `org/login/route.ts` |
| **M6** | MED | `view-as` runs `verifySuperAdminAuth` BEFORE `checkRateLimit`, and the limit is keyed on the authenticated identity (`super_admin`, 30/15min) not a spoofable IP — anon traffic can neither trip it nor lock the owner out. | `super-admin/organizations/[id]/view-as/route.ts` |
| **L2** | LOW | `.order('id')` + a 1000-row-ceiling comment added to the remaining unpaged `.in()` reads: `montree_evaluation_sessions` (org/schools), the school-count read (super-admin/organizations), the `org_directors` read (all-logins). | 3 routes |
| **L3** | LOW | `enter-school` rejects a non-UUID `schoolId` with the SAME 403 as not-yours (was a distinguishable 22P02→500). | `org/enter-school/route.ts` |
| **L4** | LOW | `register-organization` retries the admin insert WITHOUT the login_code on a 23505 collision, so the bonus credential can never abort the org registration. | `org/register-organization/route.ts` |

**Acknowledged, not fixed (per instruction):** M1 (plaintext-code blast radius — owner accepted the
tradeoff for login uniformity); L1/L5/L6/L7 (L5 documented as a hardening follow-up below).

---

## Verification

- `npx tsc --noEmit -p tsconfig.json`: **no new errors**, re-run after the adversarial-review fixes.
  The touched files are all clean; the log diffs against the pre-session baseline to nothing but the
  repo's large pre-existing error count (untouched, 1164 lines).
- ESLint could not run in this snapshot — it ships an `.eslintrc`-era config and the installed
  ESLint is v9, which refuses it. Run it on the Mac.
- Nothing was runtime-tested: this is a source snapshot with no database.

---

## Follow-ups left open

1. **Run migration 317** (paste it into the Supabase SQL editor, per the standing rule). Until then:
   no director gets a code at registration, the code door always fails, the super-admin console shows
   "no code" for everyone, and `all-logins` shows an empty `org_directors` section. Nothing errors.
2. **`set-password` rate limit is 3 per IP per 15 minutes, fail-closed** — unchanged from before, and
   it now also meters the principal reset path. A principal resetting four teachers in one sitting
   hits "Too many attempts". Left alone deliberately (raising it would weaken the unauthenticated
   first-time-setup path, which shares the bucket); if it bites, give the authenticated principal
   path its own bucket rather than loosening the shared one.
3. **The i18n values are English in all 12 locales.** That matches how the whole `org.*` block
   shipped, but it means the pre-commit i18n hook will pass while nothing is actually translated.
   A real pass over `org.*` is owed as one job.
4. **A director's code cannot be self-recovered.** Only the super-admin console reissues one; there is
   no "email me my code". Deliberate for now (Resend is unreliable on this deployment), but it means
   a lost code + a lost password is a Tredoux ticket.
5. **`quietChildCount` attributes photos by `montree_media.school_id`.** That column is the primary
   filter used by `/api/montree/admin/snapshot` and the photo-audit routes, so it is reliably
   populated — but a legacy row with a NULL `school_id` is not counted as an observation and would
   make a child look quiet. Worth a spot-check against one real organisation's numbers once 317 is in.
6. **Multi-director organisations** are handled but not designed for: `view-as` and the org dashboard
   both take the oldest director row. Every organisation today has exactly one.
7. **(M4) Write attribution under an enter-school session.** A director inside a school holds a REAL
   principal seat (`sub` = the school's principal row), so any row she writes — a regenerated code, a
   reset password, an edited profile — is attributed in that table to the school's principal, not to
   her. Only the `org_enter_school` audit line (with `actingOrgAdminId`) ties the session to the
   director. That is enough to reconstruct "who was in the seat" forensically, but it is not a
   per-row stamp. Suggested follow-up if stronger accountability is ever needed: add an
   `acting_org_admin_id` column to the mutating tables and stamp it when the writing session carries
   the claim. **Not built now** — documented honestly as a known limitation.
8. **(L5 hardening) `toVerifiedOrLocked` should refuse `org_admin`/`agent` on school-scoped routes.**
   Today a school route trusts `role` but does not assert it is a school role; an org_admin token
   reaching one would be scoped by its INERT `schoolId` (the org id), which resolves to nothing — so
   it fails safe in practice, but an explicit refusal in `verify-request.ts` would be tidier defence
   in depth. Acknowledged, not fixed this pass.
9. **`/api/montree/super-admin/login-as` was left alone.** It still returns a JSON blob for the client
   to build a session from, unlike the cookie-minting pattern used here. Converging it is a separate,
   riskier job.
