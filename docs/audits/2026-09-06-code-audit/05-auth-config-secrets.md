# Montree — Audit 05: Auth, Middleware, Data Access, Config & Secrets

Read-only static review of `/tmp/montree` (snapshot, no `node_modules`). Scope: authentication and
session handling, `middleware.ts`, Supabase client construction, secrets hygiene, build/CI config,
and a sample of the `lib/` data-access layer. API route handlers themselves are covered by other
agents. Every CRITICAL and HIGH claim below was verified by reading the cited file.

---

## Executive summary (10 lines)

1. **No live secrets are hardcoded in application code.** No API keys, no private keys, no `.env`
   files in the snapshot. The one real leak is documentation: the super-admin password (`870602`)
   and a live teacher login code (`f9f312`) are written in plaintext across ~15 committed
   `docs/handoffs/*.md` files.
2. **The single most dangerous thing in the repo is the super-admin design**: one static password,
   no per-person identity, no MFA in the default path — and that same password is the *fallback
   signing key* for super-admin JWTs. If `SUPER_ADMIN_JWT_SECRET` is unset in Railway (an
   explicitly-unresolved item in CLAUDE.md), platform-wide admin tokens are forgeable offline.
3. **Five separate token systems all fall back to one env var (`ADMIN_SECRET`) and none stamps an
   issuer or audience claim.** A CMS teacher token structurally satisfies Montree's teacher-token
   verifier. This is a real cross-product privilege boundary failure, not a theoretical one.
4. **Sessions cannot be revoked.** Teacher/principal/parent JWTs last 3650 days, `verifySchoolRequest`
   never touches the database, and logout only clears a cookie. Deactivating or *deleting* a teacher
   does not end their session.
5. **The teacher login route contains an unauthenticated CPU-exhaustion vector and a
   cross-tenant credential-guessing multiplier**: on a code miss it bcrypt-compares the submitted
   code against 50 arbitrary accounts drawn from *all* schools.
6. **Two files are loaded weapons sitting in the most guessable filenames in the repo.**
   `lib/montree/auth-context.ts` "authenticates" a base64 JSON blob with no signature check;
   `lib/montree/db.ts` returns every child in every school. Both are currently unreferenced.
7. **Account deletion deletes database rows but never storage objects.** After a school purge,
   every child's photo remains fetchable from the public media buckets, indefinitely.
8. **The safety nets do not run.** Neither `audit:tenant-scoping` nor `audit:ts-budget` nor
   `npm test` is wired into CI — the three GitHub workflows are production health pings only. The
   TS ratchet baseline (5233) is ~6× the real error count, so it cannot fail.
9. **Middleware is structurally sound but shallow**: it deliberately delegates all `/api/montree/*`
   and all `/montree/*` page authorisation to the routes and pages themselves.
10. Good work worth preserving: `verify-child-access.ts` (correct cache key, fails closed),
    `secure-code.ts` (rejection sampling), `getClientIP` (last-hop XFF), `messaging-crypto`
    (correct AES-GCM), and the Supabase singleton (no service key reachable from the browser).

---

## Findings

### [SEV: CRITICAL] Super-admin JWTs may be signed with the super-admin password itself

**Where:** `lib/verify-super-admin.ts:18-25`, `lib/verify-super-admin.ts:67-86`,
`app/api/montree/super-admin/auth/route.ts:118-123`

**What:** `getSuperAdminTokenSecret()` resolves its HMAC key as
`SUPER_ADMIN_JWT_SECRET || SUPER_ADMIN_PASSWORD || ADMIN_SECRET`. The same function both mints and
verifies the platform-owner token, whose entire payload is `{ role: 'super_admin', ip }`. The
comment at line 12 admits the fallback exists because the dedicated env var was never set, and
CLAUDE.md's Jul-5 open-items list still carries "OPS — confirm `SUPER_ADMIN_JWT_SECRET` set in
Railway" as unresolved. The committed documentation states the super-admin password is `870602`.

**Why it matters:** HS256 signed with a six-digit key is not a cryptographic secret — the whole
keyspace is one million candidates and can be exhausted against a single captured token in well
under a second on a laptop. An attacker forges `{"role":"super_admin"}`, sends it as
`x-super-admin-token`, and `verifySuperAdminAuth` returns `{valid:true}` for every super-admin route:
every school, every child record, every principal login code, the billing surface, and the founding
mint tool. No rate limiter applies, because no password is ever submitted. The `ip` claim is minted
but never checked on verification, so it constrains nothing.

**Fix:** Set `SUPER_ADMIN_JWT_SECRET` in Railway to 32+ random bytes (`openssl rand -hex 32`) today.
Then delete the `|| process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_SECRET` fallback so the
function throws rather than silently degrading. Separately, rotate `SUPER_ADMIN_PASSWORD` off
`870602` to a long random passphrase, and verify the `ip` claim (or drop it — a claim that is
minted and never checked is misleading).

---

### [SEV: CRITICAL] Failed teacher logins bcrypt-compare the code against 50 accounts from every school

**Where:** `app/api/montree/auth/teacher/route.ts:95-111`

**What:** When a submitted 6-character code matches neither the SHA-256 `password_hash` lookup nor
the `login_code` column, the route runs a third "fallback": it selects 50 active teachers —
`.eq('is_active', true).limit(50)` with **no school filter and no `.order()`** — and `bcrypt.compare`s
the submitted code against each one's hash, twice (uppercase then lowercase).

**Why it matters:** Two distinct failures from one block.
*Credential guessing:* a single guess is tested against up to 50 accounts belonging to arbitrary,
unrelated schools, multiplying the per-request hit probability by ~50× and turning a guess into a
cross-tenant lottery. A hit yields a full teacher session in a school the attacker never
identified. *Denial of service:* 100 bcrypt(cost 10) comparisons ≈ 6 seconds of pegged CPU per
failed request, triggered by an unauthenticated POST with a 6-character string. Railway runs a
small Node instance; a handful of concurrent requests from rotating IPs takes the whole platform —
including parent portals and the teacher app mid-class — offline, and the IP rate limiter (5 per 15
minutes, keyed on IP only) does not stop a distributed source.

**Fix:** Delete the Step-3 block outright. Its stated purpose ("accounts created with bcrypt hashes
before the fix") is a one-off migration concern and belongs in a backfill script that rewrites those
rows into the `login_code` column, not in the hot login path. If it must survive temporarily, make
it a single indexed lookup, never a scan-and-compare.

---

### [SEV: HIGH] Five token systems share one fallback signing key and none carries an issuer/audience claim

**Where:** `lib/montree/server-auth.ts:14`; `lib/cms/auth/session.ts:69-71`;
`lib/verify-super-admin.ts:20-22`; `lib/auth-multi.ts:7`; `lib/auth.ts:9`

**What:** Every JWT subsystem resolves its key through a fallback chain terminating in
`ADMIN_SECRET`. None of the five `SignJWT` calls sets `.setIssuer()` or `.setAudience()`, and none
of the five verifiers checks one. Verified claim shapes make at least one confusion concrete: CMS
mints `{sub: cms_users.id, role, organisationId, schoolId, …}` (`lib/cms/auth/session.ts:80-99`),
and `verifyMontreeToken` (`lib/montree/server-auth.ts:149-183`) accepts any token with `sub`,
`schoolId`, and `role ∈ {teacher, principal, homeschool_parent, agent, org_admin}`. A CMS token with
`role:'teacher'` satisfies all three.

**Why it matters:** If the dedicated env vars are unset (the fallbacks exist precisely because they
have been), a CMS teacher can paste their `cms_session` cookie value into the `montree-auth` cookie
and hold a valid Montree teacher session. CMS is the lower-trust surface — it runs a public
enrolment wizard and a documented demo mode — and Montree is where the real classroom data lives.
The reverse direction happens to be blocked only because `verifyCmsSession` requires an
`organisationId` claim Montree never sets; that is luck, not design. Worse, `lib/auth-multi.ts`
mints tokens whose `role` may be the literal string `'super_admin'` with the same fallback key,
which is exactly what `verifySuperAdminAuth` checks for.

**Fix:** Give each system its own secret in Railway (`MONTREE_JWT_SECRET`, `CMS_JWT_SECRET`,
`SUPER_ADMIN_JWT_SECRET`, `AUTH_SECRET`) and remove the `|| ADMIN_SECRET` fallbacks so a missing var
is a loud startup failure. Independently, add `.setIssuer('montree'|'cms'|'super-admin')` at every
mint site and a matching `{ issuer }` option at every `jwtVerify` call — that alone kills the whole
confusion class even if a key is ever shared again by accident.

---

### [SEV: HIGH] Sessions cannot be revoked; tokens last 10 years and never consult the database

**Where:** `lib/montree/server-auth.ts:34-37` (TTL 3650 days), `lib/montree/verify-request.ts:62-85`,
`app/api/montree/auth/logout/route.ts:7-11`

**What:** `MONTREE_JWT_TTL_DAYS` defaults to 3650. `verifySchoolRequest` verifies the signature and
checks a per-*school* lock flag, then returns `userId`/`schoolId`/`role` straight from the token —
it never reads `montree_teachers`. There is no `jti`, no `token_version`, and no deny-list table
(grepped). Logout only sets the cookie's `maxAge` to 0 in the browser.

**Why it matters:** Setting `is_active = false` on a departing teacher does nothing to their live
session. Neither does rotating their login code, nor changing their password, nor **deleting their
account** — `executeAccountDeletion` removes the `montree_teachers` row, but the JWT keeps verifying
and every route keeps trusting its `sub` and `schoolId` for up to a decade. Concretely: a teacher
leaves under a cloud, the principal deletes them, and that person retains full read/write access to
the children's records from their phone until 2036. The only working revocation lever is locking the
entire school (`isSchoolLocked`), which is documented to fail *open* on a database outage.

**Fix:** Add a `token_version` integer to `montree_teachers`/`montree_school_admins`, stamp it into
the JWT at mint, and compare it in `verifySchoolRequest` (one indexed read, cacheable for 60s).
Increment on logout-everywhere, password change, code rotation, deactivation and deletion. Keep the
long TTL — it is a deliberate, well-argued product decision — but pair it with a way to end a
session, because a 10-year token with no revocation is not a long session, it is a permanent key.

---

### [SEV: HIGH] `lib/montree/auth-context.ts` authenticates an unsigned base64 blob

**Where:** `lib/montree/auth-context.ts:41-85` and `:91-136`

**What:** `validateTeacherSession` and `validateParentSession` read the `Authorization: Bearer`
header and do `JSON.parse(Buffer.from(token,'base64').toString())`, then trust
`sessionData.teacherId` / `sessionData.parentId` after checking only that the row exists and is
active. There is no signature, no MAC, no expiry. The file header reads "Ensures data isolation
between schools." **Verified: nothing in `app/`, `lib/` or `components/` imports it today.**

**Why it matters:** Anyone can mint a session for any teacher or parent by base64-encoding
`{"teacherId":"<uuid>","schoolId":"anything"}`. It is inert only because it is unreferenced — and
it is unreferenced code with the most inviting name and docstring in the codebase, sitting beside
the real helper (`verify-request.ts`). The next person or agent that needs "the auth helper for API
routes" has a coin-flip chance of importing total authentication bypass, and it will review cleanly
because the file says it enforces isolation.

**Fix:** Delete the file. If any of its shape is wanted later, rebuild it on `verifyMontreeToken`.
Do not leave it in place with a warning comment — comments do not survive autocomplete.

---

### [SEV: HIGH] `lib/montree/db.ts` returns every child in every school; `lib/db.ts` silently discards WHERE clauses and writes

**Where:** `lib/montree/db.ts:19-37` (`getChildren`), `:93` (`deleteChild`); `lib/db.ts:4-31`

**What:** `lib/montree/db.ts` is a 506-line data layer with **no callers** (verified). `getChildren()`
takes no arguments and issues `.from('montree_children').select('*')` with no school filter and no
limit. `deleteChild(childId)` deletes any child by id with no ownership check. Separately,
`lib/db.ts` is a "compatibility layer" whose `db.query(text, params)` regex-matches the SQL: a
`SELECT` returns `.from(table).select('*')` — **the entire table, WHERE clause and parameters
discarded** — while `INSERT` and `UPDATE` return `{rows: [], rowCount: 0}` without executing
anything. It is imported by `app/api/whale/children/[id]/progress/route.ts:2`.

**Why it matters:** `lib/montree/db.ts` is the same trap as the previous finding, at the most
guessable path in the project. One `import { getChildren } from '@/lib/montree/db'` in a future
route dumps the full cross-tenant children table to whoever calls it. `lib/db.ts` is already live:
its silent no-op writes mean any caller believing it persisted data has lost it with no error, and
its unfiltered SELECT is a cross-tenant disclosure primitive that looks like a parameterised query
at the call site. Blast radius today is limited to the admin-JWT-gated single-tenant Whale routes,
but the shim is generic and will be reused.

**Fix:** Delete `lib/montree/db.ts` (zero callers, zero risk). Rewrite
`app/api/whale/children/[id]/progress/route.ts` to use `getSupabase()` directly, then delete
`lib/db.ts`. Never ship a SQL shim that silently drops predicates — failing loudly on an
unsupported query is the minimum bar.

---

### [SEV: HIGH] Account deletion never removes storage objects — children's photos survive a school purge

**Where:** `lib/montree/account-deletion.ts:261-278` (school purge), `:310-333` (parent deletion);
no `supabase.storage` reference anywhere in the file (verified by grep)

**What:** A `school_purge` deletes the `montree_schools` row and relies on 44 `ON DELETE CASCADE`
foreign keys. Cascades operate on database rows only. Every uploaded object — child photos, videos,
montages, intake documents in `montree-media`, `child-photos`, `photo-bank` — is left in place. The
media proxy serves these buckets from an allowlist by path
(`app/api/montree/media/proxy/[...path]/route.ts:22`).

**Why it matters:** The file's own header cites Apple Guideline 5.1.1(v), which requires the app to
"initiate deletion of the data," and the product is squarely inside GDPR Article 17 territory —
these are photographs of identifiable children. After a founder deletes their school, believing it
gone, every child's photograph remains retrievable by anyone who holds or can reconstruct the URL,
forever. The database rows that recorded which paths existed are gone, so the objects are now also
unfindable by the operator — orphaned, undeletable in practice, and still served.

**Fix:** Before deleting the school row, enumerate `montree_media.storage_path` (and the intake and
montage paths) for the school and call `supabase.storage.from(bucket).remove(paths)` in batches;
record the count in the audit row. Because storage deletion can partially fail, write a
`montree_deletion_pending_objects` ledger first and have a sweeper retry it, so a mid-purge failure
is recoverable rather than silent. Apply the same treatment to `executeParentDeletion`.

---

### [SEV: HIGH] `xlsx@0.18.5` parses teacher-uploaded spreadsheets and has unpatched high-severity CVEs

**Where:** `package.json:88`; `lib/montree/photo-onboarding/document-text.ts:63`
(`const XLSX = await import('xlsx')`); reached from
`app/api/montree/photo-onboarding/[importId]/extract/route.ts:47-48`

**What:** The npm-registry `xlsx` package is unmaintained (SheetJS moved distribution to their own
CDN) and 0.18.5 carries GHSA-4r6h-8v6p-xvw6 (prototype pollution, CVSS 7.8) and GHSA-5pgg-2g8v-p4x9
(ReDoS). No fixed version exists on npm. The parser is invoked on files uploaded by teachers through
the Photo Onboarding roster import.

**Why it matters:** This is attacker-controlled input reaching a known-vulnerable parser inside the
server process that holds the Supabase service-role key. Prototype pollution in a long-lived Node
process can corrupt behaviour far from the parse site; the ReDoS path alone lets one uploaded file
hang a worker.

**Fix:** Repoint the dependency at the maintained SheetJS build —
`"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` — and keep the existing dynamic
import so nothing else changes. While there, `crypto-js`, `jsonwebtoken`, `@types/jsonwebtoken`,
`multer`, `@types/multer`, `@vercel/blob` and `@supabase/auth-helpers-nextjs` (deprecated; `@supabase/ssr`
is already present and used) are all declared but **unused** — verified by grep. Removing them
shrinks the install and the CVE surface for free.

---

### [SEV: MEDIUM] Legacy login codes and passwords are stored as unsalted SHA-256, and codes are looked up by hash across all tenants

**Where:** `lib/montree/password.ts:29-38`, `:55-57`; `app/api/montree/auth/teacher/route.ts:45-56`

**What:** `verifyPassword` treats any stored hash not starting with `$2` as a bare, unsalted
`sha256(password)` and compares with `===`. The teacher login route computes `legacySha256(code)` and
queries `.eq('password_hash', codeHash)` — a global lookup with no school scoping. Rows whose
`password_hash` is NULL are authenticated on a plaintext `login_code` column match
(`route.ts:70-72`).

**Why it matters:** The code space is 32⁶ (~1.07 billion) for current codes and far smaller for
legacy lowercase-hex codes such as the documented `f9f312` (16⁶ ≈ 16.7 million). Unsalted SHA-256
over a space that small is not a hash, it is an index: anyone who obtains a database dump, a backup,
or read access to `montree_teachers` recovers every legacy login code — and every pre-migration
*password* — by exhaustive precomputation in minutes. Row-level security was only enabled across
these tables in migration 275 (Jul 2026), so the historical exposure window was wide. The plaintext
`login_code` column has the same property with no work at all.

**Fix:** Run a one-off backfill that rehashes every non-`$2` `password_hash` with bcrypt and nulls
the plaintext `login_code` column, then delete the legacy SHA-256 branch from `verifyPassword` and
the `legacySha256` lookup from the login route. Codes that cannot be rehashed (they are the
credential, not a hash of one) should be rotated and reissued.

---

### [SEV: MEDIUM] Rate limiting is keyed only on client IP, which is attacker-supplied off-Cloudflare

**Where:** `lib/rate-limiter.ts:49-54`; `lib/montree/audit-logger.ts:76-87`

**What:** `checkRateLimit` counts rows matching `.eq('key', ip)` and nothing else — there is no
per-account counter and no global cap. `getClientIP` returns `cf-connecting-ip` unconditionally when
present, falling back to the last `x-forwarded-for` hop.

**Why it matters:** Two gaps. First, trusting `cf-connecting-ip` is correct **only** while Cloudflare
is the sole ingress. Railway services keep a directly-reachable `*.up.railway.app` hostname, and this
repo's own DNS-guard workflow exists because montree.xyz has already been served un-proxied. Anyone
who reaches the origin directly sets `cf-connecting-ip` to a fresh value per request and every
fail-closed limiter in the app — teacher login, super-admin login, vault unlock — becomes
unlimited. Second, IP-only keying means a school behind one NAT shares a budget of 5 logins per 15
minutes, so a staffroom logging in at 8am locks itself out; and no amount of failures against a
single victim account ever locks that account.

**Fix:** Only honour `cf-connecting-ip` when the request also carries a shared secret header
injected by a Cloudflare Transform Rule (or verify `CF-Ray` + a Cloudflare IP allowlist), and reject
direct-origin traffic at Railway. Add a second counter keyed on the identifier under attack (email,
or the code's first 3 characters) so per-account lockout exists independently of network position,
and only count *failed* attempts so successful logins do not burn the shared budget.

---

### [SEV: MEDIUM] Neither safety-net script runs in CI, and the TypeScript ratchet is set ~6× above reality

**Where:** `.github/workflows/` (3 files: `dns-guard.yml`, `engagement-cron.yml`,
`tracking-health.yml` — none checks out the repo); `package.json:23-25,30`;
`scripts/ts-error-baseline.json` (`{"maxErrors": 5233}`); `scripts/audit-tenant-scoping.mjs:70-76`

**What:** `npm test` (vitest), `audit:tenant-scoping` and `audit:ts-budget` all exist as scripts and
none is invoked by any workflow — the three workflows are production health pings that never clone
the code. The TS ratchet baseline is 5233 while CLAUDE.md records the actual count as 852. And
`audit-tenant-scoping.mjs`'s `isProtected()` returns true if the file merely `src.includes('school_id')`
anywhere — a comment, or a filter on an unrelated table — across only 5 tables and only
`app/api/**/route.ts`.

**Why it matters:** Every gate this project relies on is manual and local, which for a solo
non-technical operator means "runs when someone remembers." The ratchet in particular can absorb
~4,400 net-new type errors before it fires, so it currently guarantees nothing while appearing to.
The tenant-scoping guard is worse than inert: it prints a green "0 violations" line that a
non-technical owner will reasonably read as "cross-tenant isolation is verified," when a route that
mentions `school_id` in a comment passes. Tables such as `montree_child_progress`,
`montree_weekly_reports`, `montree_message_threads` and `montree_child_intake` are not checked at all.

**Fix:** Add one `ci.yml` on `push`/`pull_request` that runs `npm ci`, `npm run lint`, `npm test`,
`npm run audit:tenant-scoping`, `npm run i18n:check:strict`, then `npm run audit:ts-budget`. Run
`node scripts/ts-error-budget.mjs --update` once to reset the baseline to the true count. In
`isProtected()`, replace the `includes('school_id')` heuristic with a check that the file both calls
a verify helper *and* applies `.eq('school_id', …)`, and extend `SENSITIVE_TABLES` to the tables
listed above.

---

### [SEV: MEDIUM] `tsconfig.json` includes build output, so a whole-project typecheck OOMs

**Where:** `tsconfig.json:31-46`

**What:** `include` contains `"**/*.ts"` and `exclude` lists only `node_modules`, `montree`, and one
script. `.next/` is not excluded, so after a standalone build the glob absorbs the entire copied
server bundle in `.next/standalone/`.

**Why it matters:** This is the documented reason `tsc` needs `NODE_OPTIONS=--max-old-space-size=8192`
and still dies on the 8 GB Mac — which is in turn why the TypeScript ratchet is rarely run and why
`typescript.ignoreBuildErrors` stays on. One config line is quietly holding three problems in place.

**Fix:** Add `".next"`, `"out"`, `"montage-worker"`, `"potato-worker"` and `"_ARCHIVE"` to
`exclude`. Then re-baseline the ratchet and start lowering it; `ignoreBuildErrors: true`
(`next.config.ts:21-22`) can only come off after the count reaches zero, so the exclusion is the
first step off it, not a cosmetic tidy.

---

### [SEV: MEDIUM] `MONTREE_ENCRYPTION_KEY` is used as raw key bytes with no key-derivation step

**Where:** `lib/montree/messaging-crypto.ts:34-47`

**What:** The AES-256-GCM construction is correct — random 12-byte IV, auth tag verified, versioned
ciphertext. But the key is `Buffer.from(key, 'utf8')` of a 32-*character* env var, so the key
material is whatever 32 printable characters a human typed.

**Why it matters:** This key protects parent–teacher messages, meeting notes and call transcripts —
the most sensitive text in the product. A memorable 32-character passphrase carries well under 128
bits of entropy and is offline-attackable against any exfiltrated ciphertext, which is exactly the
scenario the encryption exists for.

**Fix:** Generate the key with `openssl rand -hex 32` and decode it (`Buffer.from(key,'hex')`,
validating 32 bytes), or run the existing utf-8 value through `scrypt`/HKDF with a fixed salt.
Either change is a version bump — follow `docs/handoffs/MONTREE_ENCRYPTION_RUNBOOK.md`, which the
file already points at for rotation.

---

### [SEV: MEDIUM] Middleware trusts `supabase.auth.getSession()`, which does not verify the token server-side

**Where:** `middleware.ts:58-94` (`hasSupabaseAdminRole`), `middleware.ts:715-755`

**What:** Both paths take an access token from a header or the `sb-access-token`/`supabase-auth-token`
cookie, call `supabase.auth.setSession({ access_token, refresh_token: '' })`, then
`supabase.auth.getSession()` and treat a non-null result as authenticated. `getSession()` returns the
locally-stored session; supabase-js documents that its user object "could be insecure" and directs
callers to `getUser()` for a server-verified identity.

**Why it matters:** A forged, unsigned JWT with an arbitrary `sub` produces a truthy `session`. That
alone bypasses the `if (!session && !hasAdminAuth)` redirect at line 758 for every non-public,
non-`/admin`/`/parent`/`/teacher` page. Escalation to admin additionally requires the forged `sub`
to match a real `user_roles` row, which is a meaningful barrier — but the barrier is a guessed UUID,
not a signature check, and that is the wrong thing to be relying on.

**Fix:** Replace `setSession` + `getSession` with a single `supabase.auth.getUser(accessToken)` in
both places; it round-trips to Supabase and validates the signature. Keep the existing 3-second
`withTimeout` wrapper and the fail-closed `catch`.

---

### [SEV: MEDIUM] `/montree` is a blanket public path, so every Montree page is unauthenticated server-side

**Where:** `middleware.ts:484-489` (the `publicPaths` entry `'/montree'`), `:687-694`

**What:** `isPublicPath` matches `pathname === path || pathname.startsWith(path + '/')`, so the bare
`'/montree'` entry makes the whole subtree public and returns before any gate. CLAUDE.md carries an
explicit warning against exactly this shape for `/cms` ("do not re-add one, it would silently un-gate
every child's record"); the same shape is live for `/montree`.

**Why it matters:** Authorisation for the entire product rests on client-side redirects in each page
plus per-route API checks. Dashboard, admin and parent pages render their shell to anyone. This is
survivable because the data all arrives through gated APIs — but it means a single page that
server-renders tenant data, or one API route that forgets its check, has no second line of defence,
and the `/cms` comment shows the team already knows why that matters.

**Fix:** Leave the genuinely public entries explicit (`/montree`, `/montree/login`, `/montree/try`,
`/montree/parent`, `/montree/org/join`, `/montree/school/join`, `/montree/library/**`) and drop the
bare prefix, then add a gate for `/montree/dashboard/**`, `/montree/admin/**`, `/montree/org/**` and
`/montree/agent/**` that verifies the `montree-auth` cookie with the existing edge-safe
`jose` verifier — the CMS block at `middleware.ts:465-483` is the working pattern to copy.

---

### [SEV: MEDIUM] Nightly CI prints the full tracking-health report, including per-classroom detail, into GitHub Actions logs

**Where:** `.github/workflows/tracking-health.yml:52-58`; `dns-guard.yml` (`echo "Lookup (…): $records"`)

**What:** The health job `cat`s the entire JSON response body to the run log, and each issue's
`message` is re-emitted as a `::error::`/`::warning::` annotation. The route's own documentation
describes messages naming specific rows — "a mastered letter whose work is missing," "no observation
for ten days."

**Why it matters:** Actions logs are visible to everyone with repository read access, are retained
by default for 90 days, and are outside the application's own access controls. Child-linked
identifiers accumulating there is a data-protection exposure that no amount of in-app RLS covers,
and it is invisible because the workflow's purpose is diagnostics.

**Fix:** Print only `error_count`, `warning_count` and `classrooms_checked` plus each issue's `code`.
Keep the detail behind the authenticated app surface where it is already access-controlled.

---

### [SEV: MEDIUM] Operator scripts disable TLS verification while carrying the production database password

**Where:** `scripts/_harness/*.mjs` (14 files), `scripts/eval-photo-id.mjs:89`,
`scripts/outreach-import-v2.mjs:624`, `scripts/_revert_seed.mjs:239`, `scripts/run-vault-migration.js:17`

**What:** Every direct-Postgres script sets `ssl: { rejectUnauthorized: false }` on a `pg.Client`
connecting to `aws-1-ap-southeast-1.pooler.supabase.com` with the production password. Application
and worker runtime code is clean — this is confined to scripts.

**Why it matters:** `rejectUnauthorized: false` accepts any certificate, which converts TLS from
authentication into mere obfuscation. These scripts are run by the founder from Beijing over a VPN,
i.e. exactly the adversarial network path where an intercepting proxy is plausible. A successful MITM
yields the production database superuser password and full read/write to every school's records.

**Fix:** Remove the option; Supabase's pooler presents a valid publicly-trusted certificate and
verification succeeds by default. Where a self-signed chain genuinely is in play, pin the CA with
`ssl: { ca: fs.readFileSync('prod-ca.crt') }` rather than disabling the check.

---

### [SEV: MEDIUM] `next-pwa@5.6.0` is abandoned and predates the App Router

**Where:** `package.json:77`; `next.config.ts:2` (`import withPWA from "next-pwa"`)

**What:** The project runs Next.js 16.1.1. `next-pwa` has not been released since 5.6.0 (2022),
targets the Pages Router, and vendors an old Workbox.

**Why it matters:** This one is load-bearing in a way the other stale deps are not — it wraps the
entire `next.config.ts` export and generates the service worker that caches the PWA shell for
teachers' phones. CLAUDE.md already records service-worker staleness incidents (the `montree-sw`
cache-version bumps, the "Session-140 class of bug"). An unmaintained SW generator against a runtime
four majors newer than it supports is where the next silent-stale-shell outage comes from, and a
stale SW serves users old code indefinitely.

**Fix:** Migrate to `@serwist/next` (the maintained successor, App-Router-native) or generate the
service worker explicitly with Workbox at build time. Treat this as planned work rather than
urgent — but do not let it sit as an unnoticed dependency.

---

### [SEV: LOW] `verifySuperAdminAuth` accepts a password in a request header, and the password compare truncates at 256 bytes

**Where:** `lib/verify-super-admin.ts:83-85`, `:49-59`

**What:** After the token check fails, the function falls back to reading a raw password from the
`x-super-admin-password` header — with no rate limiting at this layer (the limiter lives only in the
`/auth` login route). Separately, `Buffer.alloc(256).write(provided)` silently truncates, so any two
values sharing their first 256 bytes compare equal.

**Why it matters:** The header fallback turns every super-admin route into an unmetered password
oracle, undoing the fail-closed limiter on the login route. The truncation is currently harmless
(no one has a 256-character password) but it is a silent correctness cliff.

**Fix:** Delete the `x-super-admin-password` fallback — the comment says it exists for "the audit
route, etc.", which should mint and use a token like everything else. Compare with
`crypto.timingSafeEqual` over SHA-256 digests of both values instead of fixed buffers, which is
constant-time and length-independent.

---

### [SEV: LOW] Cron endpoints share one static secret compared with `!==`, and `/api/warm` is open in non-production

**Where:** `app/api/warm/route.ts:48-56`; `app/api/montree/super-admin/embed-global-vm/route.ts:73-78`;
`app/api/story/cron/*`

**What:** All cron routes authenticate on a single shared `CRON_SECRET` compared with `!==`
(non-constant-time), with no rotation mechanism. `/api/warm` additionally skips the check entirely
when `NODE_ENV !== 'production'`.

**Why it matters:** One leaked value (it travels in plaintext headers through GitHub Actions, and is
pasted into both GitHub and Railway) grants access to every cron surface at once, including
`embed-global-vm`, which spends OpenAI credits per call. Timing analysis over the network is not
practical against a high-entropy secret, so this is hygiene rather than an active hole.

**Fix:** Compare with `crypto.timingSafeEqual` on equal-length digests, give the higher-value routes
(`embed-global-vm`, `i18n-sync`) their own secret, and note in the runbook that rotating `CRON_SECRET`
means updating both GitHub and Railway together.

---

### [SEV: LOW] Production CSP permanently allowlists an operator's localhost daemon, and `script-src` allows `unsafe-inline`

**Where:** `next.config.ts:231-268`

**What:** `connect-src` and `media-src` both include `http://127.0.0.1:8787` and
`http://localhost:8787` for the mvgen render daemon, on every response to every visitor.
`script-src` includes `'unsafe-inline'`.

**Why it matters:** The loopback entries let any page on the origin talk to whatever listens on port
8787 on a *visitor's* machine — low risk (it requires something already listening locally) but it is
a permanent production weakening for a single operator's dev tool. `'unsafe-inline'` is the
documented Next.js trade-off and materially reduces the CSP's value as XSS mitigation.

**Fix:** Move the loopback entries behind `process.env.NODE_ENV !== 'production'` so they exist only
in dev. Add `object-src 'none'`. Nonce-based `script-src` is the real fix for `unsafe-inline` and is
a larger project — worth scheduling, not worth rushing.

---

### [SEV: LOW] Super-admin TOTP generation is broken, and the module-level access cache is unbounded

**Where:** `lib/montree/super-admin-security.ts:84-86`; `lib/montree/verify-child-access.ts:31`

**What:** `generateTOTPSecret()` returns `crypto.randomBytes(20).toString('base32')` — Node's
`Buffer` has no `base32` encoding and throws `TypeError: Unknown encoding: base32`. The MFA flow is
wired up in `app/api/montree/super-admin/secure/route.ts` (`verify_totp`, `totp_enabled`), so
enrolment cannot succeed. Separately, `accessCache` in `verify-child-access.ts` has no size cap and
evicts only on lookup of the same key.

**Why it matters:** MFA is the correct mitigation for the static-password super-admin problem in the
first finding, and it is present-but-non-functional — which is worse than absent, because it reads
as covered. The cache grows with distinct `childId:schoolId` pairs for the life of the process; on a
long-running Railway container across many schools that is slow memory growth, not a leak with a
bound.

**Fix:** Use a real base32 encoder (or `otplib`, which ships one) and test enrolment end-to-end,
then require MFA for super-admin. Give `accessCache` an LRU cap in the low thousands — the same
`evictOldest()` pattern already in `lib/montree/cache.ts:46-57`.

---

### [SEV: LOW] Live credentials are published in committed documentation

**Where:** `docs/handoffs/HANDOFF_SESSION105_PRINCIPAL_FLOW.md:23,176,187`;
`HANDOFF_SESSION_146_PRICING.md:100,135`; `HANDOFF_SESSION107_MONTREE_TEACHER.md:144,193`;
`HANDOFF_SESSION112_FINAL.md:107,118`; `HANDOFF_SESSION113_API_FIX.md:66,70,73,82`;
`scripts/archive/setup-github.sh:70`; and ~8 further handoff files (`870602`, `f9f312`)

**What:** The super-admin password and the founder's Whale Class teacher login code appear in
plaintext in roughly fifteen committed files. Application code is clean — a previous hardening pass
removed the hardcoded values from `app/` and `lib/` (verified). One further note:
`docs/handoffs/SESSION_98_HANDOFF.md:190` records a Stripe live key prefix (`sk_live_51RwNig…`) and
flags rotation as deferred.

**Why it matters:** Documentation is source code as far as leaks are concerned — it is in the git
history, it goes wherever the repo goes, and it survives every later "we removed the hardcoded
password" fix. These are current production credentials for the highest-privilege account and for
the founder's own classroom.

**Fix:** Rotate `SUPER_ADMIN_PASSWORD` and the `f9f312` teacher code now — that is the step that
actually matters, because scrubbing files does not un-publish git history. Confirm the Stripe live
key was rotated. Then replace the values in the docs with `<see Railway env>`, and add a
`gitleaks` or `trufflehog` pre-commit hook so the next handoff cannot reintroduce them.

---

## Auth model as-built

Seven actors, six independent mechanisms. Nothing here is Supabase Auth — `auth.users` is empty and
every identity lives in an application table.

```
TEACHER  (and homeschool_parent)
  6-char code (A-Z2-9, no 0/O/1/I) OR email + password
      │  POST /api/montree/auth/teacher      [rate limit: 5 / 15 min per IP, fail-closed]
      │  code path searches ALL schools at once — codes are one global namespace
      ▼
  JWT (HS256, key = MONTREE_JWT_SECRET or ADMIN_SECRET)  { sub, schoolId, classroomId, role }
      │  TTL 3650 days  ·  no jti  ·  no issuer  ·  NOT re-checked against the DB
      ▼
  httpOnly cookie `montree-auth`  (+ readable `montree_surface` hint for the PWA launch)
      │
      ▼
  verifySchoolRequest()  →  signature + per-SCHOOL lock flag  →  {userId, schoolId, role}
                            ↑ this is the only revocation lever that exists

PRINCIPAL   same pipeline, role='principal'; may mint a teacher token to "enter a classroom"
            (short TTL, carries actingPrincipalId so the way back is in the token)

ORG_ADMIN   same pipeline, role='org_admin'; schoolId is INERT — routes self-scope on organizationId

AGENT       same pipeline, role='agent'; schoolId is INERT — routes self-scope on founding_teacher_id

PARENT
  6-char invite code (or email + password)
      ▼
  JWT { sub = child_id, role:'parent', parentId? }   TTL 3650 days
      ▼
  httpOnly cookie `montree_parent_session`

SUPER-ADMIN   ← the weak point
  ONE static password in SUPER_ADMIN_PASSWORD. No username. No per-person identity.
  MFA exists in the routes but its secret generator throws (see LOW finding).
      │  POST /api/montree/super-admin/auth   [5 / 15 min per IP, fail-closed]
      ▼
  JWT { role:'super_admin' }, TTL 12h, signed with
      SUPER_ADMIN_JWT_SECRET  ||  SUPER_ADMIN_PASSWORD  ||  ADMIN_SECRET
                                  ^^^^^^^^^^^^^^^^^^^^ if this is the live branch, forgeable
      ▼
  sent as `x-super-admin-token` header (NOT a cookie)
  fallback: raw password in `x-super-admin-password` header, unmetered

CMS ("Harbor")   separate product, separate table, separate cookie `cms_session`
  email + bcrypt → JWT { sub, role, organisationId, schoolId }, TTL 30d
  key = CMS_JWT_SECRET || MONTREE_JWT_SECRET || ADMIN_SECRET  ← shares Montree's fallback
  Gated in middleware by area: parent / teacher / org / office

CRON            single shared static CRON_SECRET in an `x-cron-secret` header
WORKERS         montage/potato workers → `x-worker-secret` (fails closed if the env var is unset)
WHALE ADMIN     legacy: `admin-token` cookie, JWT signed with ADMIN_SECRET, TTL 7d
```

**Where each request is actually authorised**

- `/api/montree/**`, `/api/lens/**`, `/api/potato/**`, `/api/cms/**` — middleware waves these
  through untouched; each route calls its own verifier. All isolation lives in the handlers.
- `/api/admin/**`, `/api/whale/**`, `/api/media**`, `/api/students/**`, `/api/classroom/**`,
  `/api/onboard/**`, `/api/weekly-planning/**`, `/api/curriculum-import/**` — middleware enforces
  the legacy `admin-token` JWT.
- `/cms/**` pages — middleware enforces role-per-area.
- `/montree/**` pages — **no server-side gate**; the whole subtree is a public path and pages
  redirect client-side.
- `/admin`, `/parent`, `/teacher` pages — middleware checks a Supabase session and a `user_roles`
  lookup.

**The three things a non-technical owner should take from this diagram:**
one password protects the entire platform and doubles as a signing key; a login, once issued,
cannot be taken back for ten years; and two products' tokens are currently interchangeable in one
direction.
