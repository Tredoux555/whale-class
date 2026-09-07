# API Security Audit — `/app/api/montree/**` (directories a–m)

**Scope:** 282 `route.ts` files across 47 top-level directories (`admin` … `montage-tracker`).
**Method:** scripted inventory (auth-helper / `getSupabase` / `searchParams` / `request.json()` grep) + manual read of every route flagged as no-auth, cross-tenant, or destructive. Static review only; nothing was modified.

---

## Executive summary

1. **282 routes reviewed.** 260 are gated by a real auth helper; **22 have no per-request auth**, of which **17 are legitimately public or gated by a signature/secret** (Stripe webhooks, worker secret, media proxy, `/health`, aggregate leaderboard/founding counters, logout).
2. **258 routes (91%) use the service-role Supabase client** (`getSupabase()`), which bypasses RLS. Tenant isolation therefore lives entirely in route code — RLS is documented as defence-in-depth only.
3. **Auth architecture is sound.** `middleware.ts` deliberately does *not* cover `/api/montree/*`; every route self-gates via `verifySchoolRequest()` → signed HS256 JWT in an httpOnly cookie → `schoolId` taken **from the token, never the body**. That discipline holds in the overwhelming majority of routes.
4. **Tenant scoping is generally excellent.** `verifyChildBelongsToSchool()` / explicit `classroom.school_id !== auth.schoolId` re-checks appear on essentially every route that accepts a client-supplied `childId`/`classroomId`. Only **1 route** trusts a client-supplied tenant id without verification, and it is currently unreachable (see F5).
5. **1 CRITICAL:** `admin/backfill-guides?all=true` lets *any* authenticated user of *any* school overwrite curriculum guide/description/translation text for **every classroom on the platform**.
6. **3 HIGH:** (a) ~14 `/api/montree/admin/*` routes perform principal-only actions with **no role check**, so an ordinary `teacher` or `homeschool_parent` session can delete children/classrooms and edit peer teacher records; (b) `media/upload` accepts arbitrary `contentType` for video/audio and the public proxy echoes it back on the app's own origin → **stored XSS**; (c) `community/works/[id]/inject` is a brute-forceable teacher-login-code oracle that also writes into a stranger's classroom.
7. **Public write endpoints are inconsistently hardened.** `apply/*` and `demo-request` rate-limit; the near-identical `applications/npo` and `become-an-agent/apply` do not.
8. **`community/works/[id]/inject`** is an unauthenticated teacher-login-code oracle *and* a write primitive into a stranger's classroom, limited only per-IP.
9. **No SQL injection found.** Every `.ilike()` escapes `% _ \`; no raw SQL string interpolation anywhere in scope. No secrets logged or echoed. Stack traces leak from exactly one super-admin-gated route.
10. **Systemic gaps rather than one-off bugs:** no role-authorisation layer, no shared body-schema validation (zero routes use zod), no upload size limit, and several `.in()` fan-outs without pagination past Supabase's 1000-row default.

**Counts:** routes total **282** · no per-request auth **22** (17 intentional, 5 noteworthy) · service-role client **258** · client-supplied tenant id trusted without verification **1**.

---

## Findings

### [SEV: CRITICAL] `all=true` turns a per-classroom backfill into a platform-wide curriculum overwrite

**Where:** `app/api/montree/admin/backfill-guides/route.ts:20-42`, `:61-68`, `:86-113`, `:122-131`

**What:** The route authenticates with `verifySchoolRequest()` — any valid session of any role — then reads two query parameters: `classroom_id` and `all`. The school-ownership check is wrapped in `if (classroomId) { … }`, so passing `?all=true` with **no** `classroom_id` skips it entirely. The subsequent query `supabase.from('montree_classroom_curriculum_works').select('id, name, work_key, classroom_id')` is then built **without any `.eq('classroom_id', …)` and without any `school_id` filter**, returning every curriculum work row for every classroom of every tenant on the platform. The loop that follows issues an `UPDATE` per row overwriting `quick_guide`, `presentation_steps`, `control_of_error`, `direct_aims`, `materials`, `parent_description` and `why_it_matters` from the static JSON bundle. Finally the "all" branch fans out `applyGlobalTranslations(cid)` across every classroom id it just touched, rewriting locale columns too. The client is the service-role client, so RLS offers no backstop.

**Why it matters:** A teacher at any customer school — or an attacker who has phished one 6-character login code — issues a single `GET /api/montree/admin/backfill-guides?all=true`. Every school's teacher-authored curriculum text is silently replaced with stock content: bespoke parent descriptions, presentation steps and "why it matters" copy that principals wrote and that get printed into parent reports are destroyed across the entire customer base in one request, with no audit-log entry and no undo. The `select()` also returns other tenants' work names in memory, and the JSON response discloses the platform-wide row count. It is simultaneously the highest-blast-radius mutation and the cheapest to trigger of anything in scope.

**Fix:** (1) Gate the route on `auth.role === 'principal'` at minimum, and preferably on `verifySuperAdminAuth()` — a platform-wide backfill is an operator action, not a product feature. (2) Delete the `all=true` mode from the HTTP surface entirely and move it to a script run with the service key, or restrict it to `classroom_id IN (classrooms of auth.schoolId)`. (3) Make the ownership check unconditional: resolve the target classroom list *first*, always constrained by `auth.schoolId`, and treat an empty list as a 400 — never as "everything".

---

### [SEV: HIGH] Principal-only `/admin/*` routes accept any school session — intra-tenant privilege escalation

**Where:** `app/api/montree/admin/students/route.ts:11,74,121,191` · `admin/classrooms/route.ts:117,143,192,227` · `admin/classrooms/[classroomId]/route.ts` · `admin/teachers/[teacherId]/route.ts:12` · `admin/teachers/[teacherId]/classrooms/route.ts` · `admin/import/route.ts` · `admin/import-students/route.ts:160` · `admin/reseed-curriculum/route.ts:12,21` · `admin/activity/route.ts` · `admin/reports/route.ts` · `admin/astra-thread/route.ts` · `admin/backfill-curriculum/route.ts` · `admin/students/search/route.ts` · and `children/[childId]/route.ts:182` (hard DELETE)

**What:** These routes call `verifySchoolRequest()` and then use `auth.schoolId` — which correctly prevents *cross-tenant* access — but never inspect `auth.role`. `verifySchoolRequest` returns successfully for `teacher`, `homeschool_parent`, `principal`, `agent` and `org_admin` alike. The sibling route `admin/teachers/route.ts` demonstrates the intended pattern with its local `requirePrincipal()` helper (`:30-40`), and `admin/parents/[parentId]/export/route.ts:72` does `if (auth.role !== 'principal') return 403` — so the check exists in the codebase and was simply not applied consistently. `admin/classrooms/route.ts` DELETE (`:222-247`) soft-deletes a classroom given only `?id=`; `admin/students/route.ts` DELETE soft-deletes a child; `children/[childId]/route.ts` DELETE removes a child **and all related data**; `admin/teachers/[teacherId]/route.ts` PATCH writes `name`, `email` and `is_active` on any teacher row in the school.

**Why it matters:** A single classroom assistant — or a compromised/departing teacher account, or a `homeschool_parent` login — can deactivate every classroom in the school, soft-delete the entire roster, hard-delete individual children with their photos and progress history, and deactivate or rewrite the email address of the principal's teacher record (locking colleagues out and repointing password-reset/identity flows). None of it requires the principal credential the UI implies is needed, and the deletion paths in `admin/*` do not write audit-log rows the way `admin/teachers` does. This is the classic "the UI only shows this button to principals" gap: the button is hidden, the endpoint is not.

**Fix:** Promote the local `requirePrincipal(auth)` helper from `admin/teachers/route.ts` into `lib/montree/verify-request.ts` as `verifyPrincipalRequest(request)`, and make it the default entry point for every route under `app/api/montree/admin/**`. Add a route-level test (or a lint rule / CI grep) asserting that no file under `app/api/montree/admin/` calls bare `verifySchoolRequest` — the handful of genuinely teacher-readable admin endpoints can opt out explicitly with a comment. Separately, require `role === 'principal'` for any hard `DELETE` on a child.

---

### [SEV: HIGH] Arbitrary `Content-Type` on media upload + verbatim echo through the public proxy = stored XSS on the app origin

**Where:** `app/api/montree/media/upload/route.ts:64-70` (type gate), `:112` (extension), `:127-131` (`contentType: file.type`) · `app/api/montree/media/proxy/[...path]/route.ts` (`const contentType = res.headers.get('content-type') …` and the response header block around `:170-185`)

**What:** The JPEG allow-list in `validateJpegPhoto()` is applied only when `effectiveMediaType !== 'video' && !== 'audio'`, and `media_type` comes straight from the client's own multipart metadata. A caller therefore sets `media_type: 'video'`, uploads a file named `x.html` whose browser-supplied MIME type is `text/html`, and the route stores it with `contentType: file.type` into the **public** `montree-media` bucket. No maximum file size is enforced anywhere on the path (`file.arrayBuffer()` is read unconditionally). The storage extension is `file.name.split('.').pop()` with no allow-list or sanitisation. The public proxy at `/api/montree/media/proxy/...` then fetches that object and returns it with `'Content-Type': contentType` copied verbatim, **no `X-Content-Type-Options: nosniff`**, no `Content-Disposition` (unless `?download=1`), and `Access-Control-Allow-Origin: *`, with long-lived cache headers.

**Why it matters:** The attacker-supplied HTML is now served from `https://montree.xyz/api/montree/media/proxy/<path>` — the application's own origin, where the `montree-auth` cookie lives. Any teacher (or anyone who obtains one login code) can plant a page that, when opened by a principal or parent who follows the link, runs script in Montree's origin: the cookie is `httpOnly` so it cannot be read, but same-origin JavaScript does not need to read it — it can call every authenticated API as the victim (mint parent invite codes, export a parent's full record via `admin/parents/[parentId]/export`, delete children, read encrypted-at-rest messages after server-side decryption). Cloudflare caches the response, so the payload persists. The absent size cap is a second, independent problem: unbounded uploads are buffered entirely into the Node process before reaching Supabase.

**Fix:** (1) In `media/upload`, validate MIME **and** extension against an explicit per-media-type allow-list — `image/jpeg` for photos, `video/mp4|webm` for video, `audio/mpeg|webm|mp4` for audio — and derive the stored extension from the *validated* type, never from `file.name`. (2) Reject `file.size` above an explicit cap (e.g. 25 MB photo / 200 MB video) before calling `arrayBuffer()`. (3) In the proxy, add `X-Content-Type-Options: nosniff` unconditionally and coerce any content-type outside the allow-list to `application/octet-stream` with `Content-Disposition: attachment`. (4) Consider serving user media from a separate origin so a future mistake cannot reach the app's cookie jar.

---

### [SEV: HIGH] `community/works/[id]/inject` is an unauthenticated teacher-login-code oracle and a cross-tenant write

**Where:** `app/api/montree/community/works/[id]/inject/route.ts:26-46`, `:60-70`

**What:** The only credential is a 4–10 character `teacher_code` in the POST body, matched case-insensitively against the **plaintext** `montree_teachers.login_code` column. The route distinguishes failure modes in its responses: `404 "Teacher code not found"` for a bad code versus a success payload for a good one, making it a clean validity oracle. On success it injects a community work into that teacher's classroom curriculum. The only throttle is `checkRateLimit(ip, '/api/montree/community/works/inject', 5, 15)` — per source IP, in `fail-open` mode (the default), with no per-code counter and no lockout on the targeted account.

**Why it matters:** Rate limiting keyed on IP is not a defence against a code-space search, which parallelises trivially across residential proxies or a botnet — 5 attempts per IP per 15 minutes times a few thousand IPs walks a 6-character alphanumeric space in a practical amount of time, and the codes are the *primary* login credential for teachers (`auth/teacher` accepts a bare 6-char code). A hit yields both a confirmed valid credential for the full login endpoint and an immediate write into a stranger's classroom. Because `checkRateLimit` defaults to `failMode: 'open'`, a Supabase blip on `montree_rate_limit_logs` removes even the per-IP throttle — note that `auth/unified` and `auth/teacher` deliberately pass `'closed'` here, and this route does not.

**Fix:** Require a real session (`verifySchoolRequest`) for injection and drop the bare-code path — the community page can prompt for login. If a code path must survive: add a **per-code** counter (attempts against a given code, and consecutive failures across all IPs) with fail-**closed** mode, return an indistinguishable generic response for bad-code and bad-work cases, and compare against the hashed column the way `auth/teacher` does rather than a plaintext `.ilike()`.

---

### [SEV: MEDIUM] Broken auth predicates that silently fail closed — and one that hides an unverified tenant id

**Where:** `app/api/montree/curriculum/batch-translate/route.ts:25-33` · `app/api/montree/guru/photo-insight/route.ts:1328-1330`

**What:** `verifySchoolRequest()` returns `VerifiedRequest | NextResponse`; neither shape has an `authenticated` property, yet `batch-translate` does `if (!auth.authenticated) return 401`. The expression is always truthy-negated, so **the route 401s on every request, including legitimate ones** — it is dead code that looks live. The same idiom appears in `photo-insight`, where `verifySuperAdminAuth()` returns `{ valid }` but the caller reads `superAdminResult.authenticated`, so the super-admin override for `force_onboarding` can never fire. Both currently fail *closed*, so neither is exploitable today. The reason `batch-translate` matters beyond a dead route is what sits behind the broken check: `const classroomId = body.classroom_id || auth.classroomId` (`:31`) is used directly in `.eq('classroom_id', classroomId)` **with no ownership verification** — it is the single instance in the whole a–m scope of a client-supplied tenant id reaching a service-role query unchecked.

**Why it matters:** These survive only because `next.config.ts` sets `typescript.ignoreBuildErrors: true`; the compiler would otherwise reject `.authenticated` on the union. Whoever eventually notices `batch-translate` always 401s will "fix" the auth line — and unless they also notice line 31, that fix instantly opens a cross-tenant write: any authenticated user could pass another school's `classroom_id` and have Haiku rewrite that school's curriculum name/description columns in the target locale, burning the victim's AI budget as well. The `photo-insight` case is a silent feature regression (the super-admin escape hatch is inert) rather than a hole.

**Fix:** Replace both predicates with the correct discriminators — `if (auth instanceof NextResponse) return auth;` and `const { valid } = await verifySuperAdminAuth(headers); if (!valid) …`. In the same commit, verify the classroom in `batch-translate` (`classroom.school_id === auth.schoolId`) *before* any query uses it. Longer term, turn off `ignoreBuildErrors` for `app/api/**`, or add a narrow lint rule banning property access on the result of `verifySchoolRequest` before the `instanceof` narrowing.

---

### [SEV: MEDIUM] Public application endpoints without rate limiting, leaking DB errors and account existence

**Where:** `app/api/montree/applications/npo/route.ts:6-24` (no limiter at all) · `app/api/montree/become-an-agent/apply/route.ts:110-180` (`detail: insertErr.message`, `detail: updateErr.message`, 409 existence disclosure)

**What:** `applications/npo` is an unauthenticated POST that validates required fields and then inserts into `montree_npo_applications` with the service-role client. It has **no rate limiter and no honeypot**, unlike its near-twin `apply/npo/route.ts:16`, which does `checkRateLimit(ip, …, 5, 60)`, and unlike `demo-request` and `apply/reduced-rate`. `become-an-agent/apply` has a honeypot (`website_url_hp`) but no rate limiter, and returns raw Postgres error text to the caller on the two 500 paths, plus a distinct 409 (`"This email is already on file with us"`) whenever the submitted email exists in `montree_outreach_contacts` under a different contact type.

**Why it matters:** `applications/npo` is a free, unmetered write into a production table reachable by anyone who finds the path — trivial to flood, filling the table and the reviewer's queue with junk, and there is no cleanup path. The `become-an-agent` 409 turns the CRM into an email-existence oracle: an unauthenticated caller can enumerate which addresses are already customers, demo requesters or outreach targets — useful reconnaissance for a phishing campaign aimed at Montessori schools. The `detail: insertErr.message` responses expose table and constraint names to an anonymous caller.

**Fix:** Apply the existing `checkRateLimit(supabase, ip, endpoint, 5, 60)` to both routes (the helper is already imported next door), add the same `website_url_hp` honeypot to `applications/npo`, and decide whether `applications/npo` should exist at all now that `apply/npo` does the same job with a limiter. Replace both `detail: …message` fields with a logged-server-side / generic-client-side pair, and collapse the 409 into the same neutral success response the happy path returns.

---

### [SEV: MEDIUM] Public bucket + path-only protection for child photographs

**Where:** `app/api/montree/media/proxy/[...path]/route.ts:22-47` (`ALLOWED_BUCKETS`, `DEFAULT_BUCKET = 'montree-media'`), storage path built in `media/upload/route.ts:118-121`

**What:** The proxy is deliberately unauthenticated and streams objects from `.../storage/v1/object/**public**/<bucket>/<path>` for an allow-list of buckets that includes `montree-media`, the bucket holding every child photo and video. Path traversal is blocked and the bucket allow-list is enforced, so the route does what it intends; the observation is about the design. The storage path is `{school_id}/{child_id}/{photos|videos}/{yyyy}/{mm}/{timestamp}-{6 chars of Math.random()}.{ext}`, and responses carry `Access-Control-Allow-Origin: *` with long cache lifetimes.

**Why it matters:** Access control for children's photographs reduces to knowledge of the URL. `school_id` and `child_id` are UUIDs and the filename adds a millisecond timestamp plus 6 characters of `Math.random()` — not cryptographically strong, but wide enough that brute force is impractical. The real exposure is leakage: a URL forwarded to a parent, pasted into a chat, embedded in an email newsletter, or captured by a browser extension or corporate proxy remains valid forever, for anyone, with no revocation and no access record. For a product whose customers are schools subject to child-safeguarding and (per `CLAUDE.md`) PIPL-style consent rules, "unguessable link" is a weaker posture than the consent architecture elsewhere in the codebase implies. Note the codebase already knows this distinction: `child-onboarding` sensitive documents are deliberately routed through an authenticated 60-second signed-URL route instead.

**Fix:** Move `montree-media` to a private bucket and have the proxy mint short-lived signed URLs after checking the caller's session and child access (the pattern already used by `/api/montree/child-onboarding/document`). If a fully public path must remain for print/QR flows, scope it to a narrow prefix and keep child photos out of it.

---

### [SEV: LOW] Non-constant-time secret comparison on cron and worker endpoints

**Where:** `app/api/montree/cron/dunning-alipay/route.ts:57-58` · `cron/engagement/route.ts:68` · `cron/generate-alipay-invoices/route.ts:49-50` · `cron/photo-sweep/route.ts:65` · `internal/montage-complete/route.ts:19`

**What:** Each compares the incoming `x-cron-secret` / `x-worker-secret` header to the environment value with `===`. `lib/verify-super-admin.ts` already provides the correct pattern (`timingSafeEqual` over fixed 256-byte buffers) and is not used here. All five correctly fail closed when the env var is missing.

**Why it matters:** String `===` short-circuits on the first differing byte. Over a network the resulting timing signal is heavily masked by jitter, so this is a theoretical rather than practical break — but these secrets guard billing mutations (invoice generation, dunning cancellation) and a worker callback that stamps report rows, and the fix is one import.

**Fix:** Export the existing fixed-buffer `timingSafeEqual` comparison from `lib/verify-super-admin.ts` as a generic `secretEquals(provided, expected)` and use it at all five call sites.

---

### [SEV: LOW] Stack fragment returned to the client on a 500

**Where:** `app/api/montree/community/seed/route.ts:41-47`, `:168-175`

**What:** Two error paths return `{ error, detail: loadErr?.message, stack: loadErr?.stack?.split('\n').slice(0, 5) }` in the JSON body. The route is super-admin gated and rate-limited.

**Why it matters:** Limited by the gate, but the five frames disclose absolute filesystem paths and internal module layout, which is useful to an attacker who has already obtained super-admin access or who can trigger the path through a future auth regression. It is also the only place in the a–m scope where a stack reaches the wire.

**Fix:** `console.error` the stack and return an opaque reference id to the client, matching how the rest of the codebase handles 500s.

---

### [SEV: LOW] Unpaginated `.in()` fan-out silently truncates at Supabase's 1000-row default

**Where:** `app/api/montree/dashboard/class-progress/route.ts` (class-wide media/junction queries, ~`:150-200`) and similar shapes in `focus-works/batch/route.ts:81`, `montage-tracker/coverage/route.ts`

**What:** These routes gather a classroom's child ids and then issue `.in('child_id', childIds)` / `.in('media_id', candidateMediaIds)` with no `.range()` loop. PostgREST caps an unqualified select at 1000 rows.

**Why it matters:** Not a security issue — a correctness one with security-adjacent consequences. In a busy classroom the coverage and progress boards silently under-report: a child whose photos fall past row 1000 appears to have no evidence, which is exactly the signal teachers use to decide who to observe next. The failure is invisible (no error, no warning), which is worse than a hard limit. `CLAUDE.md` already lists this as a known open item for `class-progress`.

**Fix:** Use the repo's existing `selectAll()` range-loop helper (`lib/montree/evaluation/route-helpers.ts` has one) for every classroom-wide read, or chunk `.in()` inputs and paginate explicitly.

---

## Recurring patterns

**1. Authentication is checked; authorisation is not.** `verifySchoolRequest()` answers "which school is this?" and every route uses it correctly. Almost no route asks "*may this role do this?*". Three different ad-hoc spellings exist (`requirePrincipal()` local helper in `admin/teachers`, inline `if (auth.role !== 'principal')` in `admin/parents/[parentId]/export`, `EVALUATION_ROLES.includes(auth.role)` in the evaluation module) and none is applied consistently.
→ **Proposed helper:** `verifyRoleRequest(request, allowedRoles: Role[])` in `lib/montree/verify-request.ts`, returning `VerifiedRequest | NextResponse` exactly like the existing function, plus a per-directory default (everything under `app/api/montree/admin/**` is `['principal']` unless it opts out with an explicit comment). Enforce with a CI grep so new admin routes cannot regress.

**2. "Verify then query" vs "query with the filter" — both appear, only one is safe under refactor.** The best routes put the tenant filter *in the query* (`montage/send/route.ts:158-160`: `.eq('id', jobId).eq('school_id', auth.schoolId)`, with an explicit comment that a foreign id must be indistinguishable from a typo). Others fetch first and compare after (`admin/teachers/[teacherId]/route.ts:20-28`). Both are correct today, but the second leaves a window where a later edit drops the comparison, and it leaks existence via response timing.
→ **Proposed helper:** `scopedFrom(supabase, table, auth)` returning a query builder with `.eq('school_id', auth.schoolId)` pre-applied, so the filter cannot be forgotten. Where the tenant column is indirect (child → classroom → school), keep routing through the existing `verifyChildBelongsToSchool()`.

**3. Conditional ownership checks.** The CRITICAL finding exists because a security check sat inside `if (classroomId)` while the query below it ran regardless. The safe shape is to resolve an explicit, always-non-empty, always-tenant-scoped target list *before* the mutation, and to treat "no target" as a 400 rather than "all targets".
→ **Rule:** no security check may be nested inside a branch that the mutation is not also nested inside. Worth a code-review checklist item; it is mechanically greppable as `if (<id>) {` immediately preceding an ownership comparison.

**4. Zero schema validation on request bodies.** Not one of the 282 routes uses zod or an equivalent; every route destructures `await request.json()` and hand-checks a subset of fields. This is why `media/upload` trusts a client-supplied `media_type` to select its own validation branch, and why length caps appear on some string fields and not others.
→ **Proposed helper:** a dependency-free `parseBody(request, spec)` in `lib/montree/validation.ts` (the CMS surface already has `lib/cms/validation.ts` written to the same no-new-dependency constraint — lift and share it), returning `{ body } | { response }` like the evaluation module's `readJson()`.

**5. Rate limiting is opt-in and defaults to fail-open.** `checkRateLimit()` is excellent (DB-backed, survives restarts, supports fail-closed) but is applied by hand. Credential-adjacent endpoints pass `'closed'` (`auth/unified`, `auth/teacher`); the code-oracle at `community/works/[id]/inject` does not, and two public write endpoints have no limiter at all.
→ **Rule:** any route reachable without a session gets a limiter; any route that validates a credential gets `failMode: 'closed'` **and** a per-credential counter, not only per-IP.

**6. Type safety is disabled where it would have caught real bugs.** `typescript.ignoreBuildErrors: true` is what allows `auth.authenticated` (a property on neither branch of the return union) to ship in two places. Both fail closed by luck, not design.
→ **Rule:** re-enable type checking for `app/api/**` specifically, or add the narrow lint rule described in F5.

**Credit where due:** the evaluation module (`lib/montree/evaluation/route-helpers.ts` → `openRoute` → `requireChild` → `assertSchemaReady`) is the model the rest of the API should converge on: one composable gate that does auth, role, feature-flag and tenant verification in a fixed order, fails closed on every branch, and logs a `[SECURITY]` line on refusal. `montage/send`, `admin/import-students` (with its explicit "existence is NOT ownership" comment) and `media/upload`'s child-ownership loop are similarly exemplary.

---

## Inventory

Auth column: `session` = `verifySchoolRequest()` (signed HS256 JWT, httpOnly `montree-auth` cookie or Bearer); `+RL` = DB-backed rate limiter; `community-user` / `agent` / `parent` / `dp-app` / `org` = module-specific resolver that ultimately verifies a signed token; `cron-secret` / `worker-secret` = shared-secret header; `super-admin` = `verifySuperAdminAuth()` (JWT or timing-safe password). **Tenant scoping** is `session-derived` where every `school_id` / `child_id` / `classroom_id` used in a query comes from the token, or is a client value re-verified against it (`verifyChildBelongsToSchool`, explicit `classroom.school_id !== auth.schoolId`). Finding references (F1–F10) map to the sections above in order.

| Route (`/api/montree/…`) | Methods | Auth | Tenant scoping | Svc-role | Body/query validation | Notes |
|---|---|---|---|---|---|---|
| `admin/activity` | GET | session | session-derived | **yes** | n/a | **F2 — no role check** |
| `admin/ai-budget` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `admin/astra-thread` | GET,POST,PUT | session | session-derived | **yes** | manual | **F2 — no role check** |
| `admin/backfill-curriculum` | POST | session | session-derived | **yes** | manual | **F2 — no role check** |
| `admin/backfill-guides` | GET | session | session-derived | **yes** | manual | **F1 — `all=true` skips ownership → platform-wide UPDATE** |
| `admin/child-briefing/[childId]` | GET | session | session-derived | **yes** | n/a |  |
| `admin/classrooms/[classroomId]` | DELETE,GET | session | session-derived | **yes** | n/a | **F2 — no role check** |
| `admin/classrooms` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual | **F2 — no role check: any teacher can create/delete classrooms** |
| `admin/communication/directory` | GET | session | session-derived | **yes** | n/a |  |
| `admin/conversations/[id]` | DELETE,GET | session | session-derived | **yes** | n/a |  |
| `admin/conversations` | GET,POST | session | session-derived | **yes** | manual |  |
| `admin/conversations/transcribe` | POST | session | session-derived | **yes** | manual |  |
| `admin/dossier/parent-meeting` | GET,POST | session +RL | session-derived | **yes** | manual |  |
| `admin/enter-classroom` | POST | session | session-derived | **yes** | manual |  |
| `admin/events/[id]` | DELETE,GET,PATCH | session | session-derived | **yes** | manual |  |
| `admin/events` | GET,POST | session | session-derived | **yes** | manual |  |
| `admin/guru/chat` | POST | session | session-derived | **yes** | manual |  |
| `admin/import-students` | POST | session | session-derived | **yes** | manual | **F2 — no role check** (but exemplary "existence is NOT ownership" classroom check) |
| `admin/import` | POST | session | session-derived | **yes** | manual | **F2 — no role check** |
| `admin/learner/record` | POST | session | session-derived | **yes** | manual |  |
| `admin/meeting-notes/[id]` | DELETE,GET,PATCH | session | session-derived | **yes** | manual |  |
| `admin/meeting-notes` | GET,POST | session | session-derived | **yes** | manual |  |
| `admin/meeting-notes/transcribe` | POST | session | session-derived | **yes** | manual |  |
| `admin/overview` | GET | session | session-derived | **yes** | n/a |  |
| `admin/parent-codes/generate-all` | POST | session | session-derived | **yes** | n/a |  |
| `admin/parent-codes` | GET | session | session-derived | **yes** | n/a |  |
| `admin/parent-meetings/[meetingId]/analyse` | GET,POST | session | session-derived | **yes** | n/a |  |
| `admin/parent-meetings/[meetingId]/copilot` | POST | session | session-derived | **yes** | manual |  |
| `admin/parent-meetings/[meetingId]/proposals` | POST | session | session-derived | **yes** | manual |  |
| `admin/parent-meetings/[meetingId]/transcribe-chunk` | POST | session | session-derived | **yes** | manual |  |
| `admin/parent-meetings` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `admin/parent-profile/list` | GET | session | session-derived | **yes** | manual |  |
| `admin/parent-profile` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `admin/parent-question` | POST | session | session-derived | **yes** | manual |  |
| `admin/parents/[parentId]/export` | GET | session | session-derived | **yes** | n/a | `role !== principal` → 403; full parent PII export |
| `admin/parents/[parentId]` | DELETE,PATCH | session | session-derived | **yes** | manual |  |
| `admin/principal-agent` | POST | session | session-derived | **yes** | manual |  |
| `admin/reports` | GET | session | session-derived | **yes** | manual | **F2 — no role check** |
| `admin/reseed-curriculum` | GET,POST | session | session-derived | **yes** | manual | **F2 — no role check**; classroom ownership verified |
| `admin/return-to-admin` | POST | session | session-derived | **yes** | n/a |  |
| `admin/settings` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `admin/snapshot` | GET | session | session-derived | **yes** | n/a |  |
| `admin/students` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual | **F2 — no role check: any teacher can create/soft-delete children** |
| `admin/students/search` | GET | session | session-derived | **yes** | manual | **F2 — no role check** |
| `admin/teachers/[teacherId]/classrooms` | PUT | session | session-derived | **yes** | manual | **F2 — no role check** |
| `admin/teachers/[teacherId]` | PATCH | session | session-derived | **yes** | manual | **F2 — no role check: any teacher can edit peer name/email/is_active** |
| `admin/teachers` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual | local `requirePrincipal()` — the reference pattern |
| `admin/today` | GET | session | session-derived | **yes** | n/a |  |
| `admin/tracy/draft-response` | POST | session | session-derived | **yes** | manual |  |
| `admin/tracy/scan-thread` | POST | session | session-derived | **yes** | manual |  |
| `admin/voice/agent` | DELETE,POST | session | session-derived | **yes** | manual |  |
| `admin/voice/llm` | POST | cookie-manual | session-derived | **yes** | manual | bearer + HMAC scope sig; mints internal long-TTL principal token |
| `admin/voice/token` | POST | session | session-derived | **yes** | n/a |  |
| `agent/codes` | DELETE,GET,POST | session | session-derived | **yes** | manual |  |
| `agent/connect-onboard` | POST | session | session-derived | **yes** | manual |  |
| `agent/connect-status` | POST | session | session-derived | **yes** | n/a |  |
| `agent/dossier/principal-pitch` | GET,POST | session +RL | session-derived | **yes** | manual |  |
| `agent/earnings` | GET | session | session-derived | **yes** | n/a |  |
| `agent/logout` | POST | **none** | public / n-a | no | n/a | clears cookie only |
| `agent/me` | GET | session | session-derived | **yes** | n/a |  |
| `agent/messages-tredoux/threads/[threadId]/messages` | GET,POST | agent+agent | session-derived | **yes** | manual |  |
| `agent/messages-tredoux/threads/[threadId]` | GET,PATCH | agent+agent | session-derived | **yes** | manual |  |
| `agent/messages-tredoux/threads` | GET,POST | agent | session-derived | **yes** | manual |  |
| `agent/messages/recipients` | GET | agent | session-derived | **yes** | n/a |  |
| `agent/messages/threads/[threadId]/messages` | GET,POST | agent+agent | session-derived | **yes** | manual |  |
| `agent/messages/threads/[threadId]` | GET,PATCH | agent+agent | session-derived | **yes** | manual |  |
| `agent/messages/threads` | GET,POST | agent | session-derived | **yes** | manual |  |
| `agent/mira` | POST | session | session-derived | **yes** | manual |  |
| `agent/payout-method` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `agent/payouts` | GET | session | session-derived | **yes** | n/a |  |
| `agent/schools/[id]` | GET | session | session-derived | **yes** | n/a |  |
| `agent/schools` | GET | session | session-derived | **yes** | n/a |  |
| `agent/snapshot` | GET | session | session-derived | **yes** | n/a |  |
| `albums` | POST | session | session-derived | **yes** | manual |  |
| `analysis` | GET,POST | session | session-derived | **yes** | manual |  |
| `applications/npo` | POST | **none** | public / n-a | **yes** | manual | **F6 — public POST, no rate limit / honeypot** |
| `apply/npo` | POST |  +RL | session-derived | **yes** | manual |  |
| `apply/reduced-rate` | POST |  +RL | session-derived | **yes** | manual |  |
| `appointments/[id]/agora-token` | POST | session | session-derived | **yes** | manual |  |
| `appointments/[id]/live-state` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `appointments/[id]/prior-conversations` | GET | session | session-derived | **yes** | n/a |  |
| `appointments/[id]/recap` | GET,POST | session+parent | session-derived | **yes** | manual |  |
| `appointments/[id]/recording` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `appointments/[id]/recording/start` | POST | session | session-derived | **yes** | manual |  |
| `appointments/[id]/recording/stop` | POST | session | session-derived | **yes** | n/a |  |
| `appointments/[id]` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `appointments/[id]/whiteboard-token` | POST | session+parent | session-derived | **yes** | manual |  |
| `appointments/availability/blackouts` | DELETE,POST | session | session-derived | **yes** | manual |  |
| `appointments/availability` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `appointments/parents` | GET | session | session-derived | **yes** | n/a |  |
| `appointments` | GET,POST | session | session-derived | **yes** | manual |  |
| `appointments/slots` | GET | **none** | public / n-a | **yes** | manual | `resolveAppointmentsParent`; per-host school check |
| `attendance` | GET,POST | session | session-derived | **yes** | manual |  |
| `audit/photos` | GET | session | session-derived | **yes** | manual |  |
| `auth/delete-account` | DELETE,GET | session | session-derived | no | manual |  |
| `auth/logout` | POST | **none** | public / n-a | no | n/a | clears cookie only |
| `auth/me` | GET | session | session-derived | **yes** | n/a |  |
| `auth/set-password` | POST | session +RL | session-derived | **yes** | manual | RL + `role === principal` |
| `auth/teacher` | POST |  +RL | session-derived | **yes** | manual | RL 5/15min **fail-closed**; SHA-256/bcrypt dual-verify |
| `auth/unified` | POST | parent +RL | session-derived | **yes** | manual | RL 5/15min **fail-closed** |
| `become-an-agent/apply` | POST | **none** | public / n-a | **yes** | manual | honeypot; **F6 — no rate limit, leaks DB error + email existence** |
| `billing/checkout` | POST | session | session-derived | **yes** | manual |  |
| `billing/portal-session` | POST | session | session-derived | **yes** | n/a |  |
| `billing/status` | GET | session | session-derived | **yes** | n/a |  |
| `billing/sync-quantity` | POST | session+super-admin+cron-secret | session-derived | **yes** | manual | super-admin OR principal-of-that-school OR cron secret |
| `billing/webhook` | POST | **none** | public / n-a | **yes** | n/a | Stripe signature verification |
| `brand-kit` | DELETE,GET,POST | session | session-derived | **yes** | manual |  |
| `calendar` | GET | calendar-scope | session-derived | no | manual |  |
| `calendar/summary` | GET | calendar-scope | session-derived | **yes** | manual |  |
| `child-onboarding/[intakeId]` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `child-onboarding/document` | GET | session | session-derived | **yes** | manual |  |
| `child-onboarding/print-data` | GET | session | session-derived | **yes** | manual |  |
| `child-onboarding` | GET | session | session-derived | **yes** | manual |  |
| `children/[childId]/activity-summary` | GET | session | session-derived | **yes** | manual |  |
| `children/[childId]/fill-shelf` | POST | session | session-derived | **yes** | manual |  |
| `children/[childId]/game-plan/refresh` | POST | session | session-derived | **yes** | manual |  |
| `children/[childId]/guru` | GET,POST | session +RL | session-derived | **yes** | manual |  |
| `children/[childId]/onboard` | POST | session | session-derived | **yes** | manual |  |
| `children/[childId]/photo` | DELETE,POST | session +RL | session-derived | **yes** | manual |  |
| `children/[childId]/profile` | GET,PUT | session | session-derived | **yes** | manual |  |
| `children/[childId]` | DELETE,GET,PATCH,PUT | session | session-derived | **yes** | manual | child ownership verified; **F2 — hard DELETE has no role check** |
| `children/[childId]/weekly-admin` | GET,POST | session +RL | session-derived | **yes** | manual |  |
| `children/birthdays` | GET | session | session-derived | **yes** | n/a |  |
| `children/bulk` | POST | session | session-derived | **yes** | manual |  |
| `children` | GET,POST | session | session-derived | **yes** | manual |  |
| `class-documents` | GET | session | session-derived | **yes** | manual |  |
| `classroom-jobs/icon` | DELETE,POST | session | session-derived | **yes** | manual |  |
| `classroom-jobs` | GET,POST | session | session-derived | **yes** | manual |  |
| `classroom-setup/describe` | POST | session +RL | session-derived | **yes** | manual |  |
| `classroom-setup` | GET,POST | session | session-derived | **yes** | manual |  |
| `classroom/teachers` | GET,POST | session | session-derived | **yes** | manual |  |
| `cms-bridge/activate` | POST | **none** | public / n-a | no | manual | authenticates the CMS session itself (junction pattern) |
| `community/auth/confirm` | POST |  +RL | session-derived | **yes** | n/a |  |
| `community/auth/forgot` | POST |  +RL | session-derived | **yes** | n/a |  |
| `community/auth/login` | POST |  +RL | session-derived | **yes** | n/a |  |
| `community/auth/logout` | POST | **none** | public / n-a | no | n/a | clears cookie only |
| `community/auth/resend` | POST |  +RL | session-derived | **yes** | n/a |  |
| `community/auth/reset` | POST |  +RL | session-derived | **yes** | n/a |  |
| `community/auth/signup` | POST |  +RL | session-derived | **yes** | n/a |  |
| `community/backup` | POST | super-admin | session-derived | **yes** | n/a |  |
| `community/dm/admin` | GET | super-admin | session-derived | **yes** | n/a |  |
| `community/dm` | GET,POST |  +RL | session-derived | **yes** | manual |  |
| `community/materials/[materialId]/download` | GET |  +RL | session-derived | **yes** | manual |  |
| `community/materials/[materialId]` | DELETE | community-user | session-derived | **yes** | n/a |  |
| `community/materials` | GET,POST | community-user +RL | session-derived | **yes** | manual |  |
| `community/me` | GET | **none** | public / n-a | no | n/a | reads own cookie; never errors, returns `{user:null}` |
| `community/migrate-sequence` | POST | **none** | public / n-a | no | n/a | deprecated stub, returns a message |
| `community/posts/[postId]` | DELETE | community-user | session-derived | **yes** | n/a |  |
| `community/posts` | GET,POST | community-user +RL | session-derived | **yes** | n/a |  |
| `community/seed` | POST | super-admin +RL | session-derived | **yes** | n/a | **F9 — returns stack fragment on 500** |
| `community/works/[id]/guide` | POST | super-admin | session-derived | **yes** | n/a |  |
| `community/works/[id]/inject` | POST |  +RL | session-derived | **yes** | manual | **F4 — login-code oracle + cross-tenant write; per-IP RL only, fail-open** |
| `community/works/[id]` | DELETE,GET,PATCH | super-admin | session-derived | **yes** | manual |  |
| `community/works` | GET,POST | super-admin +RL | session-derived | **yes** | manual |  |
| `companion/journey` | GET | session | session-derived | **yes** | manual |  |
| `companion/placement` | GET | session | session-derived | **yes** | manual |  |
| `companion` | POST | session | session-derived | **yes** | manual |  |
| `companion/schedule` | GET | session | session-derived | **yes** | manual |  |
| `companion/step-card` | POST | session | session-derived | **yes** | manual |  |
| `companion/weekly-work` | GET,POST | session | session-derived | **yes** | manual |  |
| `cron/dunning-alipay` | GET,POST | super-admin+cron-secret | session-derived | **yes** | manual | **F8 — `===` compare** |
| `cron/engagement` | POST | cron-secret | session-derived | **yes** | n/a | **F8 — `===` compare** |
| `cron/generate-alipay-invoices` | GET,POST | super-admin+cron-secret | session-derived | **yes** | manual | **F8 — `===` compare** |
| `cron/photo-sweep` | POST | cron-secret | session-derived | **yes** | n/a | **F8 — `===` compare**; mints 60s internal token |
| `curriculum/batch-translate` | POST | session | session-derived | **yes** | manual | **F5 — broken `auth.authenticated` (always 401); body `classroom_id` unverified** |
| `curriculum/duplicates` | GET,POST | session | session-derived | **yes** | manual |  |
| `curriculum/enrich-preview` | POST | session +RL | session-derived | **yes** | manual |  |
| `curriculum/generate-description` | POST | session | session-derived | no | manual |  |
| `curriculum/photo` | DELETE,POST | session | session-derived | **yes** | manual |  |
| `curriculum/reorder` | POST | session | session-derived | **yes** | manual |  |
| `curriculum` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `dark-phonics-live/app-version` | GET | **none** | public / n-a | no | n/a | static version string |
| `dark-phonics-live/auth/token` | POST |  +RL | session-derived | **yes** | manual |  |
| `dark-phonics-live/book` | POST | **none** | public / n-a | **yes** | manual | parent resolver + child ownership + feature gate |
| `dark-phonics-live/classes` | GET | session | session-derived | **yes** | manual |  |
| `dark-phonics-live/credits/admin` | GET | session | session-derived | **yes** | n/a |  |
| `dark-phonics-live/credits/grant` | POST | session | session-derived | **yes** | manual |  |
| `dark-phonics-live/credits` | GET | **none** | public / n-a | **yes** | manual | parent resolver + `childIds.includes()` ownership |
| `dashboard/class-progress` | GET | session | session-derived | **yes** | manual | **F10 — class-wide `.in()` without pagination (1000-row truncation)** |
| `dashboard/conversations/[id]` | DELETE,GET,PATCH | session | session-derived | **yes** | manual |  |
| `dashboard/conversations` | GET,POST | session | session-derived | **yes** | manual |  |
| `dashboard/conversations/transcribe` | POST | session | session-derived | **yes** | manual |  |
| `dashboard/curriculum-gaps` | GET | session | session-derived | **yes** | manual |  |
| `dashboard/daily-focus` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `dashboard/daily-language-6` | GET | session | session-derived | **yes** | n/a |  |
| `dashboard/english-missing` | GET | session | session-derived | **yes** | n/a |  |
| `dashboard/english-program` | GET | session | session-derived | **yes** | n/a |  |
| `dashboard/english-progress` | GET,PATCH | session | session-derived | **yes** | manual | `role` restricted to teacher/principal; classroom from token |
| `dashboard/english-schedule` | GET,POST | session | session-derived | **yes** | manual |  |
| `dashboard/focus-list` | GET | session | session-derived | **yes** | n/a |  |
| `dashboard/group-lessons` | GET | session | session-derived | **yes** | manual |  |
| `dashboard/language-tracker` | GET | session | session-derived | **yes** | manual |  |
| `dashboard/messages/recipients` | GET | session | session-derived | **yes** | n/a |  |
| `dashboard/parent-chats/[parentId]/draft-reply` | POST | session | session-derived | **yes** | manual |  |
| `dashboard/parent-chats/[parentId]/instant-call` | POST | session | session-derived | **yes** | manual |  |
| `dashboard/parent-chats/[parentId]` | GET,POST | session | session-derived | **yes** | n/a |  |
| `dashboard/parent-chats` | GET | session | session-derived | **yes** | n/a |  |
| `dashboard/parent-codes/bulk-email` | POST | session | session-derived | **yes** | manual |  |
| `dashboard/parent-codes` | GET,POST,PUT | session | session-derived | **yes** | manual |  |
| `dashboard/progress-overview` | GET | session | session-derived | **yes** | manual |  |
| `demo-request` | POST |  +RL | session-derived | **yes** | manual |  |
| `dm` | GET,PATCH,POST | session+super-admin | session-derived | **yes** | manual | session OR super-admin; participant checks on every branch |
| `evaluation/bank` | GET | session | session-derived | no | manual |  |
| `evaluation/child/[childId]/report` | GET | session | session-derived | no | manual |  |
| `evaluation/cohort/report` | GET | session | session-derived | no | manual |  |
| `evaluation/import` | POST | session | session-derived | no | n/a |  |
| `evaluation/reports/org` | GET | **none** | public / n-a | no | manual | `openOrgReport()` → super-admin gated |
| `evaluation/reports/school` | GET | **none** | public / n-a | no | manual | `openPrincipalReport()`; k-anonymity suppression (min 12) |
| `evaluation/sessions/[sessionId]/complete` | POST | session | session-derived | no | n/a |  |
| `evaluation/sessions/[sessionId]/items` | GET,POST | session | session-derived | no | n/a |  |
| `evaluation/sessions` | GET,POST | session | session-derived | no | manual |  |
| `events/attendance` | GET,POST | session | session-derived | **yes** | manual |  |
| `events` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `features` | GET,POST | session+super-admin | session-derived | **yes** | manual |  |
| `feedback` | GET,PATCH,POST | super-admin | session-derived | **yes** | manual |  |
| `feedback/upload-screenshot` | POST | session +RL | session-derived | **yes** | manual |  |
| `focus-works/batch` | GET | session | session-derived | **yes** | manual | classroom ownership verified; **F10 — unpaginated `.in()`** |
| `focus-works` | DELETE,GET,POST | session | session-derived | **yes** | manual |  |
| `founding/count` | GET | **none** | public / n-a | **yes** | n/a | public aggregate by design |
| `founding/join` | POST |  +RL | session-derived | **yes** | manual |  |
| `founding/lookup` | GET | **none** | public / n-a | **yes** | manual | public; returns only `{valid, grant_type}` — cannot enumerate |
| `guru/checkout` | POST | session | session-derived | **yes** | manual |  |
| `guru/concern` | GET | session | session-derived | **yes** | manual |  |
| `guru/concerns` | GET,POST | session | session-derived | **yes** | manual |  |
| `guru/corrections` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/daily-plan` | GET | session | session-derived | **yes** | manual |  |
| `guru/dashboard-summary` | GET | session | session-derived | **yes** | manual |  |
| `guru/end-of-day` | GET | session | session-derived | **yes** | manual |  |
| `guru/followup` | PATCH | session | session-derived | **yes** | manual |  |
| `guru/generate-work-content` | POST | session | session-derived | **yes** | manual |  |
| `guru/photo-enrich` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/photo-insight/add-custom-work` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/photo-insight` | POST | session+super-admin +RL | session-derived | **yes** | manual | **F5 — `superAdminResult.authenticated` never true (fails closed)** |
| `guru/quick` | POST | session | session-derived | **yes** | manual |  |
| `guru` | GET,POST | session | session-derived | **yes** | manual |  |
| `guru/settings` | GET,PUT | session | session-derived | **yes** | manual |  |
| `guru/smart-note` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/snap-identify` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/status` | GET | session | session-derived | **yes** | n/a |  |
| `guru/stream` | POST | session | session-derived | **yes** | manual |  |
| `guru/suggestions` | GET | session | session-derived | **yes** | manual |  |
| `guru/teaching-instructions` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/transcribe` | POST | session +RL | session-derived | **yes** | manual |  |
| `guru/webhook` | POST | **none** | public / n-a | **yes** | n/a | Stripe signature verification |
| `guru/weekly-review` | GET | session | session-derived | **yes** | manual |  |
| `guru/work-guide` | POST | session | session-derived | **yes** | manual |  |
| `health` | GET,HEAD | **none** | public / n-a | no | n/a | public by design; returns no data |
| `intelligence/conference-notes` | DELETE,GET,PATCH,POST | session | session-derived | **yes** | manual |  |
| `intelligence/daily-brief` | GET | session | session-derived | **yes** | n/a |  |
| `intelligence/dismiss` | POST | session | session-derived | **yes** | manual |  |
| `intelligence/evidence-overview` | GET | session | session-derived | **yes** | n/a |  |
| `intelligence/evidence` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `intelligence/paperwork` | GET,POST | session | session-derived | **yes** | manual |  |
| `intelligence/stale-works` | GET | session | session-derived | **yes** | n/a |  |
| `internal/montage-complete` | POST | worker-secret | session-derived | **yes** | manual | `x-worker-secret`; **F8 — `===` compare** |
| `invite-principal` | POST | session | session-derived | **yes** | manual |  |
| `invites` | DELETE,GET,POST,PUT | session | session-derived | **yes** | manual |  |
| `invites/send` | POST | session | session-derived | **yes** | manual |  |
| `leaderboard` | GET | **none** | public / n-a | **yes** | n/a | public aggregate by design; names+initials only |
| `leads` | DELETE,GET,PATCH,POST | super-admin | session-derived | **yes** | manual |  |
| `marketplace` | GET | session | session-derived | **yes** | manual |  |
| `media/batch-retag` | POST | session | session-derived | **yes** | manual |  |
| `media/children` | GET,POST | session | session-derived | **yes** | manual |  |
| `media/crop` | POST | session | session-derived | **yes** | manual |  |
| `media/proxy/[...path]` | GET,HEAD | **none** | public / n-a | no | manual | public by design (**F7** — child media in a public bucket); bucket allow-list + `..` block; **F3 — echoes upstream content-type, no nosniff** |
| `media/proxy/bucket/[bucket]/[...path]` | GET,HEAD | **none** | public / n-a | no | n/a | public by design; delegates to sibling handler |
| `media` | DELETE,GET,PATCH | session | session-derived | **yes** | manual |  |
| `media/upload` | POST | session | session-derived | **yes** | manual | child+school verified; **F3 — no size cap, no type check for video/audio, ext from filename** |
| `media/url` | GET | session | session-derived | no | manual |  |
| `media/urls` | POST | session | session-derived | no | manual |  |
| `messages/broadcast` | POST | session | session-derived | **yes** | manual |  |
| `messages/groups/[groupId]` | DELETE,PATCH | session | session-derived | **yes** | manual |  |
| `messages/groups` | GET,POST | session | session-derived | **yes** | manual |  |
| `messages/threads/[threadId]/messages` | GET,POST | session | session-derived | **yes** | manual | participant row + `can_reply` enforced |
| `messages/threads/[threadId]` | GET,PATCH | session | session-derived | **yes** | manual |  |
| `messages/threads` | GET,POST | session | session-derived | **yes** | manual |  |
| `messages/upload-voice` | POST | session +RL | session-derived | **yes** | manual |  |
| `messages/voice-stream` | GET | session | session-derived | **yes** | manual |  |
| `montage-tracker/coverage` | GET | session | session-derived | **yes** | manual | **F10 — unpaginated `.in()`** |
| `montage-tracker/media` | GET | session | session-derived | **yes** | manual |  |
| `montage` | GET,POST | session | session-derived | **yes** | manual |  |
| `montage/send` | POST | session | session-derived | **yes** | manual | exemplary — school filter in the query, not post-hoc |
