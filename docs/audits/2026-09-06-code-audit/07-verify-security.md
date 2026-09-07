# 07 — Sceptical verification pass (security findings 1–14)

Method: each finding re-read end-to-end against the snapshot at `/tmp/montree` —
route handler → `middleware.ts` gate → auth helper → later migrations that could
supersede an earlier one → feature flags → whether any caller exists at all.
Nothing was accepted on the strength of the original report.

## Verdict table

| # | Finding | Original sev | Verdict | Final sev |
|---|---------|--------------|---------|-----------|
| 1 | `montree_parent_invites` / `_children` permissive RLS → anon reads invite codes | Critical | **CONFIRMED (and broader than reported)** | **Critical** |
| 2 | `montree_super_admin_config` / `_sessions` never `ENABLE ROW LEVEL SECURITY` | Medium | **REFUTED** (tables not in prod; dead code path) | Informational |
| 3 | `admin/backfill-guides?all=true` cross-tenant write | High | **CONFIRMED** (worse: CSRF-able GET) | **High** |
| 4 | Stored XSS via attacker Content-Type → media proxy | High | **CONFIRMED** (one premise wrong: `nosniff` *is* set) | **High** |
| 5 | `community/works/[id]/inject` login-code oracle + cross-tenant write | High | **CONFIRMED** | **High** |
| 6 | `reports/[id]` GET/PATCH unscoped | High | **DOWNGRADED** (needs a known UUIDv4; no enumeration path) | Medium |
| 7 | ~14 `admin/*` routes accept `role=teacher` | High | **CONFIRMED** — 18 routes, list below | **High** |
| 8 | `LENS_OPEN_BETA` → anonymous access to all `/api/lens` | High | **CONFIRMED** (deliberate + documented) | Medium‑High |
| 9 | `api/whale/photos` path traversal → arbitrary file write | Critical | **DOWNGRADED** (behind admin-JWT middleware gate; zero callers) | Medium |
| 10 | Super-admin JWT secret falls back to `SUPER_ADMIN_PASSWORD` | High | **CONFIRMED** (repo's own docs say the env var was never confirmed set) | **High** |
| 11 | Teacher login step-3 bcrypt-compares 50 cross-tenant accounts | High | **DOWNGRADED** (real, but not a direct takeover) | Medium |
| 12 | No session revocation; 3650-day tokens | Medium | **CONFIRMED** | Medium‑High |
| 13 | Five token systems share `ADMIN_SECRET`; CMS token satisfies `verifyMontreeToken` | High | **CONFIRMED** (conditional on env fallback; needs a CMS *staff* account) | Medium |
| 14 | `account-deletion.ts` never deletes storage objects | Medium | **CONFIRMED** | Medium |

---

## Per-finding detail

### 1 — Permissive RLS on parent/child tables — CONFIRMED, Critical, and under-scoped by the original report

`supabase/migrations/096_rls_policies.sql:36-61` creates **seven** `FOR ALL USING (true)
WITH CHECK (true)` policies with **no `TO` clause** (so they default to `PUBLIC`, i.e.
`anon` and `authenticated`) on `montree_schools`, `montree_classrooms`,
`montree_teachers`, `montree_children`, `montree_parents`,
`montree_parent_children`, `montree_parent_invites`. I tried hard to refute this
via later sweeps and could not:

* `migrations/277_tighten_permissive_policies.sql:25-28` drops
  `"Allow all parent_children operations"` / `"Allow all invite operations"` — those are
  **095's** names (`supabase/migrations/095_parent_portal.sql:84,87`), *not* 096's
  `parent_children_service_role` / `invites_service_role`. None of 096's seven policy
  names appears in any `DROP POLICY` anywhere in the repo (grepped all of
  `migrations/` and `supabase/migrations/`).
* 277 *does* drop `teacher_classrooms_service_role` (097) and `billing_service_role`
  (098) — the sibling files of the same era — which shows that era's policies were
  applied to prod, and that 277's author was working from a live linter list.
* The decisive evidence that 096 ran: `migrations/275_enable_rls_security_lockdown.sql`
  enumerates 118 tables that the linter reported as **RLS-disabled**, and
  `montree_children` / `montree_parents` / `montree_parent_invites` are absent from it —
  yet the *only* statement anywhere in the repo that enables RLS on `montree_children`
  is `096_rls_policies.sql:12`. RLS was already on for those tables in June 2026,
  therefore 096 ran, therefore its `USING (true)` policies existed then.
* `migrations/276_security_hardening_warnings.sql:7-8` states in its own header that the
  "RLS policy always true" warnings on `montree_parent_children/invites` were deliberately
  **NOT** addressed and left for case-by-case review; 277 then addressed one policy name
  per table and missed the duplicate.
* The anon key is genuinely public: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is consumed by
  `lib/supabase-client.ts:142-148` (`createSupabaseClient`) which is imported by client
  components (`app/admin/english-curriculum/page.tsx`, `app/admin/rbac-management/page.tsx`,
  `app/admin/montessori/activities/page.tsx`) and by `lib/hooks/useStudentProgressRealtime.ts`,
  so Next inlines it into the browser bundle. Nothing revokes table-level grants from
  `anon` (276 revokes *function* EXECUTE only).

So the exposure is not "invite codes" — it is **`SELECT` and `INSERT/UPDATE/DELETE` on
every school, classroom, teacher, child and parent row in the platform**, from a key that
ships in the JavaScript bundle.

*Honest caveat:* this is a static-file inference. Only a query against prod settles it.

**Reproduction.** Pull `NEXT_PUBLIC_SUPABASE_ANON_KEY` out of any montree.xyz page bundle,
then:
```
curl -s "https://dmfncjjtsoxrnvcdnvjq.supabase.co/rest/v1/montree_children?select=*&limit=5" \
  -H "apikey: <anon>" -H "Authorization: Bearer <anon>"
```
Non-empty JSON = full child PII readable by the internet. Repeat for
`montree_parent_invites` (invite codes → parent portal login) and `montree_teachers`
(`login_code` → teacher session).

**Verification query (run first):**
```sql
SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname='public'
  AND tablename LIKE 'montree_%'
  AND (qual IS NULL OR qual = 'true');
```

**Minimal fix:**
```sql
DROP POLICY IF EXISTS "schools_service_role"          ON public.montree_schools;
DROP POLICY IF EXISTS "classrooms_service_role"       ON public.montree_classrooms;
DROP POLICY IF EXISTS "teachers_service_role"         ON public.montree_teachers;
DROP POLICY IF EXISTS "children_service_role"         ON public.montree_children;
DROP POLICY IF EXISTS "parents_service_role"          ON public.montree_parents;
DROP POLICY IF EXISTS "parent_children_service_role"  ON public.montree_parent_children;
DROP POLICY IF EXISTS "invites_service_role"          ON public.montree_parent_invites;
```
RLS stays enabled with zero policies = deny-all to anon/authenticated; the app is
unaffected because every server path uses the service-role key
(`lib/supabase-client.ts:120`). Then rotate the anon key. Delete
`supabase/migrations/096_rls_policies.sql`'s policy block so it cannot be re-run.

### 2 — Super-admin config/session tables without RLS — REFUTED

The tables are created only by `migrations/099_super_admin_security.sql:39,74`, and the
repo's own missing-table census says they **do not exist in production**:
`migrations/254_missing_tables_batch.sql:188-191` — *"#15 montree_super_admin_sessions,
#16 montree_super_admin_config — alternate TOTP/2FA super-admin auth; prod uses the
env-password JWT path in lib/verify-super-admin.ts. Delete the dead route."* They are
also absent from 275's 118-table linter list, which enumerated every existing public
table with RLS off — a table that existed with RLS off would have been in it. Nothing
reads them at runtime (`lib/verify-super-admin.ts` is env-var only). No exposure.
Action: delete the dead route/migration, or add `ENABLE ROW LEVEL SECURITY` *before*
ever shipping 2FA — a TOTP secret table with `USING(true)` would be a real incident.

### 3 — `backfill-guides?all=true` — CONFIRMED, High

`app/api/montree/admin/backfill-guides/route.ts:31-42` guards the *classroom-scoped*
branch (`classroom.school_id !== schoolId → 403`) and then, at lines 61-68, builds the
work query and applies `.eq('classroom_id', …)` **only when `classroomId` is set**. With
`?all=true` the query is unfiltered, so lines 96-107 `UPDATE
montree_classroom_curriculum_works` for **every classroom on the platform**, overwriting
`quick_guide`, `presentation_steps`, `control_of_error`, `direct_aims`, `materials`,
`parent_description`, `why_it_matters` with canonical file values. Lines 126-132 then
fan `applyGlobalTranslations()` across every touched classroom. `auth.schoolId` is read
at line 17 and never used on this path. `middleware.ts:410` only gates `/api/admin/*` and
`/api/whale/*` — `/api/montree/admin/*` is not covered — so the only requirement is *any*
valid Montree session, including `role: 'teacher'`.

Worse than reported: it is a **GET** with cookie auth and no CSRF token, so a teacher
merely loading `<img src="https://montree.xyz/api/montree/admin/backfill-guides?all=true">`
on any page triggers a platform-wide write.

**Repro:** log in as a teacher at any school → `GET
/api/montree/admin/backfill-guides?all=true` → response `{"classroom_id":"all",
"updated":N}` where N spans every tenant.

**Fix:** delete the `all` branch, or gate it on super-admin:
```ts
if (updateAll) {
  const sa = await verifySuperAdminAuth(request.headers);
  if (!sa.valid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```
and convert the route to POST.

### 4 — Stored XSS via the media proxy — CONFIRMED, High (one premise corrected)

The report's "no nosniff" premise is **wrong**: `next.config.ts:213-220` applies
`X-Content-Type-Options: nosniff` to `source: '/(.*)'`, which covers route handlers, and
the proxy handler does not override it. The vulnerability survives anyway, because the
Content-Type is not *sniffed* — it is **stored and echoed verbatim**:

* `app/api/montree/uploads/route.ts:64-69` writes any file to the public `montree-media`
  bucket with `contentType: file.type` — attacker-controlled, no extension or MIME
  allowlist at all.
* `app/api/montree/media/upload/route.ts:66-72` runs `validateJpegPhoto` **only** when
  `media_type` is neither `'video'` nor `'audio'`; sending `media_type: 'video'` skips it
  entirely and line 128 stores `contentType: file.type`.
* `app/api/montree/media/proxy/[...path]/route.ts:166,172` copies the upstream
  `content-type` straight into the response, sets no `Content-Disposition` (only under
  `?download=1`, line 190) and no route-level CSP.
* The blanket CSP at `next.config.ts:231-268` is `script-src 'self' 'unsafe-inline'` —
  so an inline `<script>` in an HTML document served from `montree.xyz` **executes**.
  `frame-ancestors 'none'` does not help; this is a top-level navigation, not a frame.

**Repro:** as any teacher, `POST /api/montree/uploads` with a `poc.html` part whose
`Content-Type` is `text/html` containing `<script>fetch('/api/montree/children').then(...)</script>`;
take the returned `file.url` (already a `/api/montree/media/proxy/...` link) and send it
to a colleague. Session cookies are httpOnly, but the script runs same-origin with the
victim's cookies attached, so it can drive every authenticated API (including finding 3's
platform-wide write) as them.

**Fix (one line each, both upload routes):** allowlist the stored MIME —
`contentType: ALLOWED.has(file.type) ? file.type : 'application/octet-stream'` — and in
the proxy, force a safe type for anything not in `image/*`, `video/*`, `audio/*`,
`application/pdf`, plus add `Content-Disposition: attachment` and
`Content-Security-Policy: sandbox` to those responses.

### 5 — `community/works/[id]/inject` — CONFIRMED, High

`app/api/montree/community/works/[id]/inject/route.ts` calls no auth helper at all. The
only credential is `teacher_code` (line 39), looked up at lines 60-64 against
`montree_teachers.login_code` platform-wide. Three distinct problems:
1. **Oracle.** A wrong code returns `404 "Teacher code not found"` (line 67); a right one
   returns `200` **with `teacher_name`** (line 175) — confirming the code *and* naming
   its owner. The same `login_code` is a full teacher session at
   `app/api/montree/auth/teacher/route.ts`.
2. **Unauthenticated cross-tenant write.** Lines 84-96 will auto-seed five curriculum
   areas into a stranger's classroom and line 133 inserts a work into it.
3. **Fail-open limiter.** `checkRateLimit(...5, 15)` at line 26 omits the `failMode`
   argument, so it defaults to `'open'` (`lib/rate-limiter.ts:32,40-42`): if
   `montree_rate_limit_logs` is unreachable or the count query errors, **every** attempt
   is allowed. Contrast the teacher-login route, which passes `'closed'`.

**Repro:** `for code in $(seq …); do curl -s -XPOST
https://montree.xyz/api/montree/community/works/<approved-id>/inject
-d '{"teacher_code":"'$code'"}' ; done` from rotating IPs (5/15min/IP → ~480/day/IP;
trivially parallelised). Any `200` yields a live teacher code + the teacher's name →
log in at `/montree/login` → full classroom, children and parent data.

**Fix:** require `verifySchoolRequest` and take the classroom from the session (this is
a *teacher* action, not a public one). If the code-only flow must stay, pass
`failMode: 'closed'`, key the limiter on the submitted code as well as the IP, and strip
`teacher_name` from the response.

### 6 — `reports/[id]` — CONFIRMED but DOWNGRADED to Medium

`app/api/montree/reports/[id]/route.ts:24-28` (GET) and `:73-77` (PATCH) filter on
`.eq('id', reportId)` and nothing else; `auth.schoolId` is obtained at line 13/49 and
never used. So any authenticated teacher can read any weekly report (child name, work
narrative, teacher commentary) and PATCH `status:'sent'` to force-publish another
school's draft to its parents (lines 66-71 set `is_published`/`published_at`).
Downgraded because `montree_weekly_reports.id` is a v4 UUID and I found no route that
lists report ids across tenants — an attacker needs a leaked id, which makes this
broken-access-control rather than a data breach on its own. It becomes serious when
chained with finding 4 (an XSS on a victim's page can read their ids, then act).

**Fix:** add `.eq('school_id', auth.schoolId)` to both queries (the table carries
`school_id`; a child-join is the fallback if not).

### 7 — `/api/montree/admin/*` accepts `role=teacher` — CONFIRMED, High. 18 routes.

`middleware.ts:409-421` gates `/api/admin/*` and `/api/whale/*` on the admin JWT but
**not** `/api/montree/admin/*`, and `verifySchoolRequest`
(`lib/montree/verify-request.ts:96-141`) returns any of `teacher | principal |
homeschool_parent | agent | org_admin` without ever narrowing. Routes under
`app/api/montree/admin/` that call `verifySchoolRequest` and contain no principal check:

| Route | Methods |
|---|---|
| `overview/route.ts` | GET |
| `activity/route.ts` | GET |
| `classrooms/route.ts` | GET, POST, PATCH, **DELETE** |
| `classrooms/[classroomId]/route.ts` | GET, **DELETE** |
| `students/route.ts` | GET, POST, PATCH, **DELETE** |
| `students/search/route.ts` | GET |
| `import-students/route.ts` | POST |
| `import/route.ts` | POST |
| `teachers/[teacherId]/route.ts` | PATCH |
| `teachers/[teacherId]/classrooms/route.ts` | PUT |
| `settings/route.ts` | GET, PATCH |
| `reports/route.ts` | GET |
| `today/route.ts` | GET |
| `astra-thread/route.ts` | GET, PUT, POST |
| `backfill-guides/route.ts` | GET *(also finding 3)* |
| `backfill-curriculum/route.ts` | POST |
| `reseed-curriculum/route.ts` | GET, POST |
| `return-to-admin/route.ts` | POST *(reads `actingPrincipalId`; self-limiting)* |

These are school-scoped, so this is **vertical** escalation inside a tenant, not
cross-tenant: any teacher becomes their own school's principal — deleting classrooms and
children, editing other teachers, reading school-wide reports and the principal's Astra
thread. `return-to-admin` is the one benign entry (it only acts on a signed
`actingPrincipalId` claim).

**Fix:** one shared guard, applied at the top of each handler:
```ts
if (auth.role !== 'principal' && !auth.actingPrincipalId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```
Better: a `verifyPrincipalRequest()` wrapper so the next route added to this directory
inherits it.

### 8 — Lens open beta — CONFIRMED, Medium‑High (deliberate)

`lib/lens/flags.ts:13` `LENS_OPEN_BETA = true`; `lib/lens/route-helpers.ts:49-63`
`requireObserver()` falls back to `resolveBetaObserver()` — the oldest `lens_observers`
row — whenever the cookie is missing or invalid, so **every** `/api/lens/*` handler
treats an anonymous request as that observer. `app/api/lens/auth/auto/route.ts` will also
mint the cookie on a plain **GET** (line 37), and `lib/lens/auth.ts:44-46` sets a
3650-day TTL. `/lens` is in `middleware.ts:683` `publicPaths`. Exposure is the Lens
assessment corpus — sessions, item responses, milestone results and free-text
`child_alias` (aliases, not full names, which is what keeps this below finding 1). It is
explicitly documented as an intentional single-observer beta, so I record it as an
**accepted risk that is now stale**, not an oversight.

**Fix:** flip the flag to `false` (the invite-code door at
`/api/lens/auth/observer` is intact behind it) as soon as the beta is over, and make
`auth/auto` POST-only meanwhile.

### 9 — `api/whale/photos` path traversal — DOWNGRADED to Medium

The bug is real: `app/api/whale/photos/route.ts:111-115` builds
``const fileName = `${Date.now()}-${photo.name}` `` and `path.join(uploadDir, fileName)`,
so `photo.name = "../../../../app/.next/server/x.js"` escapes `public/uploads/`. On
Railway `process.env.VERCEL !== '1'` (line 66), so the local-write branch is the live
one. But: (a) `middleware.ts:410-437` requires a valid `admin-token` for
`/api/whale/*` other than `parent/`/`teacher/`, and `verifyAdminToken`
(`lib/auth.ts:35-40`) demands `payload.isAdmin === true` — a Montree teacher/CMS/Lens
token does **not** satisfy it, so there is no cross-token path in; (b) the route has
**zero callers** anywhere in `app/`, `components/` or `lib/` (grep returns only its own
header comment). So this is post-authentication-as-the-single-Whale-Class-admin arbitrary
file write on dead code — nasty if the admin password leaks (potential RCE via writing
into `.next/server`), not an internet-facing hole.

**Fix:** delete the route. If kept: `const fileName = `${Date.now()}-${path.basename(photo.name).replace(/[^A-Za-z0-9._-]/g,'_')}``.

### 10 — Super-admin JWT secret fallback — CONFIRMED, High

`lib/verify-super-admin.ts:19-23`: `SUPER_ADMIN_JWT_SECRET || SUPER_ADMIN_PASSWORD ||
ADMIN_SECRET`. If the dedicated var is unset, the platform-admin token is signed with the
**human-typed password**, which is also offline-guessable from any captured token — crack
the password from a JWT, then forge `{role:'super_admin'}` yourself, and
`verifySuperAdminAuth` (line 71-77) admits it. Whether the var is set in Railway is not
knowable from the repo — **I cannot confirm it either way** — but the evidence points to
"no": the repo's own open-items list still carries it as unresolved at the latest mention,
`CLAUDE.md:2359` (*"OPS — confirm `SUPER_ADMIN_JWT_SECRET` set in Railway"*), echoed in
`docs/handoffs/SESSION_REPORTS_SHELF_GUARDRAIL_HEALTHCHECK_JUL5.md:74,89` and
`docs/handoffs/SESSION_PARENT_SAFEAREA_CLOSING_SCREEN_JUL5.md:142`, and no later handoff
closes it. There is no `.env.example` entry and no workflow (`.github/workflows/` holds
only dns-guard, engagement-cron, tracking-health) that references it.

**Fix:** set `SUPER_ADMIN_JWT_SECRET` to 32+ random bytes in Railway, then delete the two
fallbacks so a missing var fails loudly instead of silently degrading.

### 11 — Teacher login step-3 — CONFIRMED but DOWNGRADED to Medium

`app/api/montree/auth/teacher/route.ts:94-111`: when steps 1 and 2 miss, the route selects
**50 arbitrary active teachers platform-wide** (`.eq('is_active',true).limit(50)` — no
`ORDER BY`, no school filter) and bcrypt-compares the submitted 6-character code against
each. Two real consequences: (a) the login-code namespace is effectively global, so a
collision logs a user into a **different school's** classroom; (b) each failed attempt
costs **50 bcrypt verifications** (up to 100 — it retries lowercase at line 105), a ~50×
CPU amplifier on an unauthenticated endpoint. Downgraded from High because it is not a
bypass: a match still requires a code that genuinely hashes to that teacher's stored
hash, and the limiter here *is* fail-closed (`checkRateLimit(..., 5, 15, 'closed')`,
line 23), which is the correct pattern the community route is missing.

**Fix:** delete step 3 and backfill the affected legacy rows' `login_code` column
offline; if it must stay, scope it (`.eq('school_id', …)` is impossible pre-auth, so cap
it at a handful of rows identified by a `password_set_at IS NULL` marker rather than a
blind `limit(50)`).

### 12 — No session revocation — CONFIRMED, Medium‑High

`lib/montree/server-auth.ts:33-36` sets `MONTREE_JWT_TTL_DAYS` to 3650 by default for
teacher, principal **and parent** tokens (line 187). `verifySchoolRequest` →
`toVerifiedOrLocked` (`lib/montree/verify-request.ts:63-83`) checks exactly one thing
beyond the signature: `isSchoolLocked(schoolId)` — and that check itself *fails open*
(per its own comment, line 60). There is no `is_active` re-check, no `jti`, no token
version, no server-side session table. So deactivating a teacher
(`montree_teachers.is_active = false`) blocks only *new* logins; the fired teacher's
existing cookie keeps full access to children, photos and parent messaging for a decade.
Same for a parent whose access is revoked. This also means finding 1/4/5 have no
containment story: once a token is stolen there is no way to end it short of rotating
`MONTREE_JWT_SECRET` and logging out every user on the platform.

**Fix:** add a `token_version` integer to `montree_teachers`/`montree_parents`, put it in
the JWT, and compare it in `toVerifiedOrLocked` (one indexed read, cacheable); bump it on
deactivate/logout-everywhere. Independently, re-check `is_active` there.

### 13 — Shared `ADMIN_SECRET`, no `iss`/`aud` — CONFIRMED, Medium

Confirmed as written, with two corrections that lower the severity:
* **Lens is not affected.** `lib/lens/auth.ts:74,88` sets and *verifies*
  `audience: 'lens-observer'`, and the payload has no `schoolId`/`role`, so
  `verifyMontreeToken` rejects it. Potato likewise documents an `aud`
  (`lib/potato/app-auth.ts:150`).
* **CMS → Montree is real.** `lib/cms/auth/session.ts:68-72` falls back
  `CMS_JWT_SECRET || MONTREE_JWT_SECRET || ADMIN_SECRET`, matching
  `lib/montree/server-auth.ts:14`. A CMS token carries `sub`, `schoolId`
  (`session.ts:91`) and `role` from `CmsRole = 'org_admin'|'school_admin'|'teacher'|'parent'`
  (`session.ts:39`). `verifyMontreeToken` (`server-auth.ts:150-166`) checks only that
  `sub`/`schoolId`/`role` are present and that `role` is in its own set — no `aud`, no
  `iss`. `'teacher'` and `'org_admin'` are in **both** sets, so a CMS teacher token,
  replayed as `Authorization: Bearer …` (`verify-request.ts:120-127` accepts the header
  path), becomes a valid Montree teacher session.

Mitigating: the `schoolId` is a `cms_schools.id` that matches no `montree_schools` row, so
school-scoped routes return nothing — **except** exactly the routes that ignore `schoolId`,
i.e. finding 3 (`?all=true`) and finding 6 (`reports/[id]`). Also, CMS self-signup only
ever mints `role='parent'` (which Montree rejects), so an attacker needs an
admin-provisioned CMS staff account. Hence Medium, not High.

**Fix:** `.setIssuer('montree')/.setAudience('montree-app')` on mint and
`jwtVerify(token, key, { issuer, audience })` on verify, in each of the five systems with
its own value; and give every product a distinct required secret (drop the
`|| ADMIN_SECRET` chains) so a shared key can never make two products interchangeable.

### 14 — Account deletion leaves storage objects — CONFIRMED, Medium

`lib/montree/account-deletion.ts` (335 lines) issues exactly three deletes —
`montree_schools` (line 265), `montree_teachers` (line 274), `montree_parents`
(line 332) — and relies on FK cascade for the rest. There is no
`supabase.storage.from(...).remove(...)` anywhere in the file, even though it counts
`montree_media` rows for the confirmation copy at line 168 and promises the user
*"This permanently deletes … N media item(s)"* (line 174). The objects stay in the
**public** `montree-media` bucket forever, still served without authentication by
`/api/montree/media/proxy/...` and still cached at Cloudflare for 7 days
(`proxy/[...path]/route.ts:38-40`). Deleting the DB rows actually makes it *worse*: the
only index of what to clean up is gone. Anyone who ever held a photo URL — a parent, a
former teacher, a search-engine cache — retains it after a school exercises its "delete
everything" right.

**Fix:** before the row deletes, page `montree_media.storage_path` (+ `thumbnail_path`)
for the school and call `storage.from('montree-media').remove(paths)` in batches of ~100;
record failures to a `montree_deletion_audit` row so a sweeper can retry. Then purge the
Cloudflare cache for that prefix.

---

## The two answers

**Most dangerous for a school owner (child PII on the internet): finding 1.**
Every other finding on this list needs *something* — a valid session (3, 4, 6, 7), a
guessed code (5), a leaked UUID (6), a specific product's data (8). Finding 1 needs
nothing but the key that is already sitting in the JavaScript your parents' browsers
download. If those `USING (true)` policies are live, `montree_children`,
`montree_parents` and `montree_parent_invites` are a public REST API: names, birthdays,
notes, parent emails and phone numbers, and the invite codes that open the parent portal —
for **every school on the platform**, readable and writable, with no log line anywhere in
the app because the traffic never touches it. Run the `pg_policies` query above before
doing anything else on this list; it is a five-minute question with a one-statement answer.

**Most dangerous for the business (platform takeover): finding 10, with finding 4 as the
delivery vehicle.** Super-admin is the god account — every school, every child, every
teacher's login code, billing. If `SUPER_ADMIN_JWT_SECRET` is unset (and the repo's own
notes say nobody ever confirmed it was set), that account's signing key *is* a password a
human types, so a single captured token or one successful offline crack yields the
ability to mint `{role:'super_admin'}` tokens at will — permanently, since finding 12
means there is nothing to revoke. Finding 4 supplies the missing step: authenticated
stored XSS on `montree.xyz` lets an attacker run script in a super-admin's own browser
and lift a live token from a `/api/montree/super-admin/*` call. Set the env var and drop
the fallbacks today; it is a one-line change that removes the whole chain's payoff.
