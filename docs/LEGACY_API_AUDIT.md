# Legacy `/api/*` Top-Level Route Groups — Deep Code Audit

**Date:** May 16, 2026 (Session 113 V2)
**Auditor:** Subagent under principal-agent supervision
**Scope:** Top-level `/api/*` route groups that predate the `/api/montree/*` and `/api/whale/*` namespacing — `app/api/classroom/**`, `app/api/curriculum-import/**`, `app/api/guides/**`, `app/api/onboard/**`, `app/api/students/**`, `app/api/weekly-planning/**`, `app/api/media/**`, `app/api/public/**`, `app/api/health/**`, `app/api/auth/**`, `app/api/warm/**`, `app/api/stripe/**`, `app/api/montree-home/**`
**Methodology:** Three passes — (1) cross-file consistency, (2) scenario walks, (3) fresh-eye re-read.

---

## EXECUTIVE SUMMARY

The legacy `/api/*` namespaces — `classroom`, `curriculum-import`, `students`, `weekly-planning`, `media`, `onboard`, `montree-home` — were built **before** the multi-tenant model crystallised in `/api/montree/*` and **before** the middleware matcher was tightened to gate `/api/admin/*` and `/api/whale/*`. The middleware today protects exactly three API namespaces: `/api/admin/*`, `/api/whale/*` (minus parent/teacher subpaths), and pages via the page matcher. Every other `/api/*` route is **unauthenticated by default at the middleware layer** — its only protection is whatever the route handler itself implements.

Most of these routes implement **nothing**. They take a `child_id` or `classroom_id` or `studentId` from the URL/body, instantiate a service-role Supabase client, and write straight to the database. The Whale Class was small enough and the URLs obscure enough that this didn't bite — but with Montree multi-tenant now serving real schools, every one of these routes is a cross-school data-exposure or data-mutation hole.

The second-largest pattern is **stub/skeleton routes that returned a 200 + `{success:true}` placeholder while a "real" implementation was promised**. `/api/montree-home/*` (4 routes) is the canonical example — they instantiate the service-role Supabase client (cost: nothing yet) but contain only `// Add your handler logic here`. Harmless today, but the Supabase client instantiation pattern is the wrong template for future implementations to copy.

The third pattern is **AI-spend exposure**. `/api/weekly-planning/upload` accepts an unauthenticated file upload, parses .docx, calls Sonnet, and writes weekly assignments into the DB. An attacker with the URL can burn through Anthropic credits at ~$0.05–$0.10 per call AND silently corrupt Whale Class's weekly assignments, because the route also hardcodes `classroom_id = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6'` (a stale Whale Class ID that contradicts the canonical `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` in CLAUDE.md — same finding as the Whale-Class admin audit).

The fourth pattern is **scattered partial-auth implementations**. `/api/weekly-planning/list` and `/api/weekly-planning/child-detail` do call `getSchoolIdFromRequest()` and check `x-school-id` / `x-classroom-id` headers. The rest of `/api/weekly-planning/*` does not. So the same namespace mixes properly-gated reads with completely-open mutations.

### Top 3 findings by impact

1. **CRITICAL — `/api/classroom/[classroomId]/curriculum` POST/PATCH accepts any caller and mutates any classroom's curriculum.** No auth. The `classroomId` comes from the URL path; `workId` for PATCH comes from the body. No verification that the work belongs to the classroom in the path. An anonymous caller can rename works, deactivate the entire curriculum, add custom works, or change sequence ordering for any classroom in the production DB — including paying Montree schools.
2. **CRITICAL — `/api/students/[studentId]/quick-place` POST calls a Supabase RPC (`quick_place_student`) for any student ID with no auth.** RPC writes to `child_work_progress`. An anonymous caller can rewrite mastery state for any student in the system. The route also accepts a `recordedBy` field from the body that goes directly into the RPC — no verification it's a real teacher_id, so audit trail is forgeable.
3. **CRITICAL — `/api/weekly-planning/upload` accepts unauthenticated multipart file uploads, calls Sonnet via Anthropic SDK, and writes to `weekly_plans` + `weekly_assignments` + auto-creates `children` rows.** Three compounding exposures: (1) anyone can spam Anthropic for $$$, (2) the route hardcodes a stale classroom_id `bf0daf1b-…`, (3) the route auto-creates child rows with `name: assignment.childName` from the AI-parsed file — meaning attacker can plant arbitrary child names into the production children table. Also: `assignmentCount = 0; await supabase.from('weekly_assignments').delete().eq('week_number', weekNumber)` first deletes all existing assignments for that week before re-inserting, so a single malicious upload wipes the teacher's actual planning.

### Posture verdict

The legacy `/api/*` namespaces are **"safe by URL obscurity"** — a posture that's fine when only Tredoux uses Whale Class via teacherpotato.xyz, but becomes a real exposure now that Montree multi-tenant schools share the same backing database. A single search-engine indexing of any of these URLs, a single attacker probing `montree.xyz/api/classroom/<UUID>/curriculum` with a guessed UUID, or a single replay of an old curl from a leaked log is enough to mutate production data.

Architectural reality: most of these routes are **Whale Class legacy and should be retired**, not gated. They still write to legacy tables (`children`, `classroom_curriculum`, `weekly_plans`, `weekly_assignments`, `child_work_media`, `child_work_progress`) that the Montree multi-tenant model has superseded with `montree_children`, `montree_classroom_curriculum_works`, `montree_media`, `montree_child_progress`. Killing them is safer than auditing them — but if they must stay alive (because some legacy admin page calls them), they need either matcher-level admin-JWT gating (same pattern as `/api/whale/*`) or migration to `/api/admin/*`.

---

## ARCHITECTURE AS BUILT

### Middleware coverage today (post-Session 113 V2)

```ts
// middleware.ts matcher (line 401-411)
matcher: [
  '/((?!api|_next/static|_next/image|favicon.ico|games|.*\\.(?:...)$).*)',  // pages
  '/api/whale/:path*',     // whale API
  '/api/admin/:path*',     // admin API (Session 113 V2 addition)
],
```

The matcher does NOT cover:
- `/api/classroom/*`
- `/api/curriculum-import/*`
- `/api/students/*`
- `/api/weekly-planning/*`
- `/api/media/*`
- `/api/onboard/*`
- `/api/montree-home/*`
- `/api/guides/*`
- `/api/public/*`
- `/api/health/*`
- `/api/auth/*` (intentional — auth entrypoints)
- `/api/warm/*` (intentional — cron entrypoint, uses x-cron-secret)
- `/api/stripe/*` (intentional — webhook, uses Stripe signature)
- `/api/montree/*` (intentional — each route handles its own auth via `verifySchoolRequest`)

For the routes in scope here, "no middleware match" means **no auth, period**, unless the route handler itself calls `getSchoolIdFromRequest()` / `verifyAdminToken()` / etc.

### Route handler auth coverage (audit findings)

| Route | Method(s) | Route-level auth | Effective posture |
|---|---|---|---|
| `/api/classroom/[classroomId]/curriculum` | GET, POST, PATCH | NONE | OPEN |
| `/api/classroom/children` | GET | NONE | OPEN |
| `/api/curriculum-import/onboarding` | GET, POST | NONE | OPEN |
| `/api/curriculum-import/works` | GET, POST, PATCH | NONE | OPEN |
| `/api/guides/language-making-guide` | GET | NONE | OPEN (intentional public download) |
| `/api/health` | GET | NONE | OPEN (intentional) |
| `/api/media` | GET, POST, PATCH, DELETE | NONE | OPEN |
| `/api/montree-home/activities` | GET, POST, DELETE | NONE | OPEN (but stub — no logic) |
| `/api/montree-home/children` | GET, POST, DELETE | NONE | OPEN (stub) |
| `/api/montree-home/curriculum` | GET, POST, DELETE | NONE | OPEN (stub) |
| `/api/montree-home/families` | GET, POST, DELETE | NONE | OPEN (stub) |
| `/api/onboard/principal` | POST | NONE | OPEN (creates schools + admins + users) |
| `/api/public/videos` | GET | NONE | OPEN (intentional public catalogue) |
| `/api/students/[studentId]/quick-place` | GET, POST | NONE | OPEN |
| `/api/weekly-planning/add-work` | POST | NONE | OPEN |
| `/api/weekly-planning/assignments/[id]` | PATCH | NONE | OPEN |
| `/api/weekly-planning/by-plan` | GET | NONE | OPEN |
| `/api/weekly-planning/child-detail` | GET | PARTIAL (`getSchoolIdFromRequest` + headers) | GATED (acceptable) |
| `/api/weekly-planning/delete` | POST | NONE | OPEN |
| `/api/weekly-planning/list` | GET | PARTIAL (`getSchoolIdFromRequest` + headers) | GATED (acceptable) |
| `/api/weekly-planning/progress` | POST | NONE | OPEN |
| `/api/weekly-planning/upload` | POST | NONE | OPEN (also: 120s Anthropic call) |
| `/api/auth/login` | POST | n/a (auth entrypoint) | rate-limited, timing-safe |
| `/api/auth/logout` | POST | n/a | always succeeds, fire-and-forget audit |
| `/api/auth/users` | GET, POST | YES (`getUserSession` from `auth-multi`) | GATED |
| `/api/warm` | GET | x-cron-secret OR dev env | GATED |
| `/api/stripe/connect-webhook` | POST | Stripe signature verify | GATED |

### Recommended auth model per route

| Route | Recommended model |
|---|---|
| `/api/classroom/[classroomId]/curriculum` | WHALE_ADMIN or MONTREE_TEACHER (verify classroomId belongs to caller's school) |
| `/api/classroom/children` | WHALE_ADMIN — currently hardcoded "all children are Whale Class" |
| `/api/curriculum-import/onboarding` | MONTREE_PRINCIPAL (verify classroom_id belongs to principal's school) |
| `/api/curriculum-import/works` | MONTREE_PRINCIPAL (same) |
| `/api/guides/language-making-guide` | PUBLIC (file download, intentional) |
| `/api/health` | PUBLIC (intentional) |
| `/api/media` | DEAD — superseded by `/api/montree/media`. Retire. |
| `/api/montree-home/*` | DEAD STUBS — delete entirely. |
| `/api/onboard/principal` | PUBLIC + signup-flow rate-limit (similar to `/api/montree/try/instant`) |
| `/api/public/videos` | PUBLIC (intentional) |
| `/api/students/[studentId]/quick-place` | WHALE_ADMIN or MONTREE_TEACHER (verify studentId is in caller's school) |
| `/api/weekly-planning/*` | WHALE_ADMIN (the whole namespace is Whale-Class-only — DOCX upload pipeline) |
| `/api/auth/*` | PUBLIC (auth entrypoints, rate-limited where it matters) |
| `/api/warm` | WEBHOOK_SIGNED (cron) |
| `/api/stripe/connect-webhook` | WEBHOOK_SIGNED |

### Counts by category

- **PUBLIC (intentional):** 4 — `/api/health`, `/api/public/videos`, `/api/guides/language-making-guide`, `/api/auth/login`, `/api/auth/logout` (technically 5 — login is rate-limited)
- **WHALE_ADMIN (gated today):** 0 — every Whale-Class-only legacy route is currently open
- **WHALE_ADMIN (recommended):** 8 — every `/api/weekly-planning/*` + `/api/classroom/children`
- **MONTREE_PRINCIPAL (recommended):** 4 — `/api/classroom/[classroomId]/curriculum` (GET/POST/PATCH), `/api/curriculum-import/*` (2 routes), `/api/students/[studentId]/quick-place`
- **WEBHOOK_SIGNED (gated today):** 2 — `/api/warm`, `/api/stripe/connect-webhook`
- **DEAD STUBS (recommend deletion):** 4 — `/api/montree-home/{activities,children,curriculum,families}`
- **PARTIALLY GATED (cross-school filter present but not consistently):** 2 — `/api/weekly-planning/list`, `/api/weekly-planning/child-detail`

---

## FINDINGS

### CRITICAL findings

#### CRITICAL — Unauthenticated curriculum mutation on any classroom (`/api/classroom/[classroomId]/curriculum`)

- **Where:** `app/api/classroom/[classroomId]/curriculum/route.ts:10-142`
- **What:** GET, PATCH, and POST handlers accept any caller. PATCH takes `workId` from the body with NO check that it belongs to the classroom in the URL. POST inserts new custom works into whatever classroom the URL specifies.
- **Repro:**
  1. Guess any production classroom UUID (or read one from a leaked log / OG image / share URL).
  2. `curl -X POST https://montree.xyz/api/classroom/<UUID>/curriculum -d '{"area":"language","category":"...","name":"Hacked"}'`
  3. Hacked work appears in that classroom's curriculum view.
  4. Alternatively, `curl -X PATCH -d '{"workId":"<any-work-uuid>","updates":{"is_active":false}}'` deactivates any work in the system.
- **Why it matters:** Cross-tenant data mutation. A competitor or annoyed parent can rename works to slurs, deactivate the whole curriculum mid-lesson, or insert "Custom: HACKED" entries that show up on every teacher's shelf. PATCH is the worst because `workId` is global, not scoped to the path's `classroomId` — even the URL obscurity defense fails.
- **Fix sketch:** Wrap every handler with `verifySchoolRequest()` and verify `classroomId === auth.classroomId` (or for principals, that the classroom belongs to the principal's school). PATCH must additionally `SELECT classroom_id FROM classroom_curriculum WHERE id = workId` and verify it matches.

#### CRITICAL — Unauthenticated student progress mutation (`/api/students/[studentId]/quick-place`)

- **Where:** `app/api/students/[studentId]/quick-place/route.ts:11-51`
- **What:** POST calls Supabase RPC `quick_place_student` for any student ID with any `recordedBy` value from the body. RPC writes to `child_work_progress`. Anonymous caller can rewrite progress state for any student.
- **Repro:**
  1. Guess any production child UUID.
  2. `curl -X POST .../api/students/<UUID>/quick-place -d '{"placements":{"language":"<work-uuid>"},"recordedBy":"<fake>"}'`.
- **Why it matters:** Mastery state corruption. Parents see their child suddenly "mastered" works they haven't done, or "reset" works they had mastered. Audit trail is forgeable via the `recordedBy` field. Also degrades the AI: replan reads `montree_child_progress` to decide what to put on a child's shelf, and a poisoned progress row trains the wrong recommendation.
- **Fix sketch:** Require auth via `verifySchoolRequest()` then verify the student belongs to the caller's school via `verifyChildBelongsToSchool()`. Drop the body-supplied `recordedBy` and use `auth.userId` instead.

#### CRITICAL — Unauthenticated AI-spend + production data clobber (`/api/weekly-planning/upload`)

- **Where:** `app/api/weekly-planning/upload/route.ts:38-150`
- **What:** Accepts multipart file upload from any caller. Parses .docx via mammoth, sends content to Sonnet (`claude-sonnet-4-20250514`, 8000 max_tokens, ~$0.05-$0.10 per call), then:
  1. Hardcodes `classroom_id = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6'` (stale ID — CLAUDE.md says canonical Whale Class is `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`).
  2. UPSERTs a `weekly_plans` row keyed on `(week_number, year)`.
  3. **DELETEs every existing `weekly_assignments` row for that week**, then inserts new ones from the AI's parsed output (line 322-325).
  4. Auto-creates `children` rows with `name: assignment.childName` from the AI-parsed file (line 273-291).
  5. Fires `/api/admin/curriculum/sync-all` as a follow-up.
- **Repro:**
  1. Compose a .docx that the Claude prompt will parse into a "weekly plan" structure.
  2. `curl -X POST .../api/weekly-planning/upload -F 'file=@evil.docx'`.
  3. Existing Whale Class week wiped. Replaced with whatever the AI extracted. Spurious children rows inserted into production `children` table.
- **Why it matters:** Three compounding exposures: (1) Anthropic spend amplification — an attacker can spam this endpoint to burn through Tredoux's Anthropic credits at $0.05–$0.10 per request. (2) Single-pull data destruction — one malicious upload wipes the teacher's actual weekly planning. (3) DB pollution — fake children rows attached to no real classroom (since `classroom_id` isn't even on the children insert payload, line 273-285 sets only `name`, `display_order`, `date_of_birth: '2021-01-01'`, `age_group: '4-5'`). Those orphan rows then surface in `/api/classroom/children` GET which returns ALL active children.
- **Fix sketch:** Gate with `verifyAdminToken()` (this is a Whale Class admin tool). Move under `/api/admin/*` so middleware enforces JWT. Replace the hardcoded `bf0daf1b-…` with the canonical `51e7adb6-…` from `lib/curriculum/classroom.ts` (and update that constant first). Add file-size cap (currently unbounded — DoS via 100MB upload). Consider replacing the unconditional DELETE with a soft-update strategy so a botched upload doesn't destroy the last good week.

---

### HIGH findings

#### HIGH — Unauthenticated school + admin + user creation (`/api/onboard/principal`)

- **Where:** `app/api/onboard/principal/route.ts:12-82`
- **What:** POST accepts arbitrary `schoolName`, `principalEmail`, `principalPassword` and creates: (1) a `schools` row, (2) a `classrooms` row (which triggers curriculum clone via DB trigger), (3) a `users` row with `role: 'school_admin'`. No rate limiting. No captcha. No email verification.
- **Repro:** `curl -X POST .../api/onboard/principal -d '{"schoolName":"X","classroomName":"Y","principalName":"Z","principalEmail":"a@b","principalPassword":"pass123"}'` repeatedly. Each call creates a fresh school + admin user.
- **Why it matters:** DB pollution at scale. Attacker scripts 10,000 fake schools, each with a curriculum clone, in 10 minutes. Also blocks legitimate schools from picking certain slug names (the route returns 400 if `slug` already exists). Compared to `/api/montree/try/instant` (which has rate limiting and is the canonical signup path), this is the unhardened legacy version that should be retired.
- **Fix sketch:** Retire entirely if `/api/montree/try/instant` is canonical. If kept, add `checkRateLimit()` (1/hour per IP), captcha, email verification flow, and per-IP origin gating.

#### HIGH — Hardcoded stale `classroom_id` in `/api/weekly-planning/upload`

- **Where:** `app/api/weekly-planning/upload/route.ts:65` — `.eq('classroom_id', 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6')`
- **What:** Used to load `montree_classroom_curriculum_works` for Claude context only ("matching is done by sync-all"). The ID is stale per CLAUDE.md (canonical Whale Class is `51e7adb6-…`). Same finding as `lib/curriculum/classroom.ts:9` and `/api/admin/curriculum/sync-all`.
- **Why it matters:** Sonnet's "known works" context will be empty for THE actual Whale Class (the stale ID has no rows). Translation quality drops. The route still works (sync-all matches works by name post-insert), but the AI is operating without curriculum guidance.
- **Fix sketch:** Single source of truth — replace `WHALE_CLASSROOM_ID` in `lib/curriculum/classroom.ts` with the canonical UUID, import it everywhere instead of inlining. Or read the principal's actual classroom_id from auth (after this route is gated).

#### HIGH — Unauthenticated weekly assignment delete/wipe (`/api/weekly-planning/delete`)

- **Where:** `app/api/weekly-planning/delete/route.ts:5-59`
- **What:** POST accepts either `planId` or `weekNumber+year`. Deletes all `weekly_assignments` for that week THEN deletes the `weekly_plans` row.
- **Repro:** `curl -X POST .../api/weekly-planning/delete -d '{"weekNumber":20,"year":2026}'`.
- **Why it matters:** Any caller can wipe any week's planning. The `weekly_planning` system is what `/api/admin/curriculum/sync-all` reads to write `child_work_progress` rows — wiping it doesn't undo progress, but it does erase the historical record of which week prescribed which works.
- **Fix sketch:** Gate with admin JWT. Move under `/api/admin/*`.

#### HIGH — Unauthenticated assignment mutation (`/api/weekly-planning/assignments/[id]`)

- **Where:** `app/api/weekly-planning/assignments/[id]/route.ts:4-46`
- **What:** PATCH accepts arbitrary fields and updates `weekly_assignments` by `id` only. No verification that the assignment belongs to the caller's classroom.
- **Why it matters:** Cross-week / cross-classroom mutation. Attacker can mark every assignment in production as `mastered`, or move them to a different work_id, or rewrite notes.
- **Fix sketch:** Gate with admin JWT and verify assignment's child_id is in caller's classroom.

#### HIGH — Unauthenticated assignment insert (`/api/weekly-planning/add-work`)

- **Where:** `app/api/weekly-planning/add-work/route.ts:4-58`
- **What:** POST inserts a `weekly_assignments` row for any `childId` + week/year. No verification.
- **Why it matters:** Same as above — DB pollution + cross-tenant write.
- **Fix sketch:** Same.

#### HIGH — Unauthenticated assignment progress update (`/api/weekly-planning/progress`)

- **Where:** `app/api/weekly-planning/progress/route.ts:4-29`
- **What:** POST updates `progress_status` + `status` on any assignment by `assignmentId`. No verification.
- **Why it matters:** Same cross-tenant mutation as the rest of the namespace.
- **Fix sketch:** Same.

#### HIGH — Unauthenticated cross-school assignment read (`/api/weekly-planning/by-plan`)

- **Where:** `app/api/weekly-planning/by-plan/route.ts:4-154`
- **What:** GET accepts optional `schoolId` from query string. If absent, returns ALL `weekly_assignments` for the week+year across the whole production DB. If present, filters but doesn't verify the caller has access to that school.
- **Why it matters:** Cross-tenant read. Anonymous caller learns every student's name + work assignments for any given week across all schools.
- **Fix sketch:** Require auth. Derive `schoolId` from auth context, refuse if query-string schoolId disagrees.

#### HIGH — `/api/classroom/children` returns ALL children school-wide

- **Where:** `app/api/classroom/children/route.ts:7-40`
- **What:** GET returns every row from `children` where `active_status = true`. No filter by classroom. Hardcoded "Beijing International School" in the response.
- **Why it matters:** Cross-tenant exposure. The `children` legacy table (NOT `montree_children`) holds Whale Class students, but also any auto-created rows from `/api/weekly-planning/upload`'s child-creation logic. An anonymous caller can enumerate every name in the legacy table.
- **Fix sketch:** Require auth, filter by caller's classroom. Or retire if the table is dead.

#### HIGH — Unauthenticated media upload / delete (`/api/media`)

- **Where:** `app/api/media/route.ts:9-311`
- **What:** POST writes to Supabase Storage `child-photos` bucket and inserts into `child_work_media` table for any `childId`. DELETE removes any record by `id`. PATCH updates `parent_visible` flag.
- **Why it matters:** Cross-tenant media injection. Attacker can upload arbitrary content tagged to any child (including paying-Montree-school children), or wipe legitimate photos, or flip `parent_visible` to expose private photos to parents.
- **Fix sketch:** Gate with auth, verify child via `verifyChildBelongsToSchool()`. Or retire if `/api/montree/media` has fully superseded this path.

#### HIGH — Unauthenticated curriculum import (`/api/curriculum-import/works`)

- **Where:** `app/api/curriculum-import/works/route.ts:85-286`
- **What:** POST accepts multipart file upload + `classroomId`, uploads each file to Supabase Storage, calls Claude (via `lib/curriculum/import-ai.ts`) to match each filename to students + curriculum items. Inserts into `montree_work_imports`. PATCH at line 291-382 lets any caller confirm/reject/manual-match any work_id.
- **Why it matters:** Anthropic spend amplification (per-file Claude call), arbitrary file upload into Storage, cross-tenant `montree_work_imports` writes. Worse than weekly-planning/upload because there's no file count cap visible — attacker can `getAll('files')` and submit dozens per request.
- **Fix sketch:** Gate with `verifySchoolRequest()` and verify caller is principal + `classroomId` belongs to their school.

#### HIGH — Unauthenticated onboarding phase transitions (`/api/curriculum-import/onboarding`)

- **Where:** `app/api/curriculum-import/onboarding/route.ts:11-234`
- **What:** GET reads onboarding state for any classroom. POST accepts `action` ∈ `{lock_curriculum, proceed_to_works, complete_onboarding}` and mutates `montree_classrooms.onboarding_phase` / `curriculum_locked` / `onboarding_completed_at` for any classroom.
- **Why it matters:** Anonymous caller can lock another school's curriculum (preventing them from editing it), mark their onboarding "complete" (skipping their actual phase work), or rewind their phase. Cross-tenant lifecycle mutation.
- **Fix sketch:** Gate, verify classroom belongs to caller.

#### HIGH — Dead stub routes that instantiate service-role Supabase (`/api/montree-home/*`)

- **Where:** `app/api/montree-home/{activities,children,curriculum,families}/route.ts` — all 4 files
- **What:** Each file exports GET, POST, DELETE handlers that instantiate the service-role Supabase client then return `{success:true}` with no actual logic. Stubs scaffolded for a future "Montree Home" feature that was never built.
- **Why it matters:** They're harmless TODAY because they don't do anything, but (a) they're a discoverable URL pattern for attackers, (b) the wrong-template pattern (service-role + no auth) will be copy-pasted when someone fills in the handler logic — guaranteeing a future security regression, (c) they pollute the route surface.
- **Fix sketch:** Delete all four files. If "Montree Home" is real, build new routes under `/api/montree/home/*` with proper auth.

---

### MEDIUM findings

#### MED — `/api/auth/login` succeeds for empty `username` with empty `password` only if accidentally matched in env

- **Where:** `app/api/auth/login/route.ts:79-118`
- **What:** Empty `password` is explicitly rejected at line 79. Empty `username` falls through to credential loop. If `process.env.ADMIN_USERNAME = ''` (somehow) and the empty username matches, the constantTimePasswordEqual could still match — but only if `ADMIN_PASSWORD` is also empty, which is dropped earlier (`!process.env.ADMIN_USERNAME && !process.env.ADMIN_PASSWORD` short-circuits the push at line 50). So in practice safe, but the validation should be explicit.
- **Why it matters:** Defense in depth. Currently relies on env hygiene.
- **Fix sketch:** Add `if (!username || typeof username !== 'string')` reject before the loop.

#### MED — `/api/weekly-planning/upload` 120s timeout amplifies DoS surface

- **Where:** `app/api/weekly-planning/upload/route.ts:10` — `export const maxDuration = 120`
- **What:** Combined with no file-size cap and no auth, an attacker can hold the route open for 120 seconds per request via large file payload, exhausting Railway concurrent-request slots.
- **Why it matters:** Layer-7 DoS amplification.
- **Fix sketch:** Auth gate first, then add file-size cap (e.g. `if (file.size > 5 * 1024 * 1024) return 413`) and consider lowering `maxDuration` if practical.

#### MED — `/api/curriculum-import/works` lacks file-size cap and file-count cap

- **Where:** `app/api/curriculum-import/works/route.ts:91` — `const files = formData.getAll('files') as File[]`
- **What:** Loops over every file in the form data with no enforced limit.
- **Why it matters:** DoS + Anthropic-spend amplification — each file triggers a Claude call.
- **Fix sketch:** Reject if `files.length > N` (e.g. 50), reject per-file if `file.size > 10 * 1024 * 1024`.

#### MED — `/api/auth/users` POST does not verify schoolId belongs to creator

- **Where:** `app/api/auth/users/route.ts:45-107`
- **What:** Super_admin can pass any `schoolId` from the body. No verification it exists. School_admin is correctly forced to their own (line 82-84).
- **Why it matters:** Super_admin can create a user under a non-existent or future school_id. Probably acceptable for super-admin scope, but worth noting.
- **Fix sketch:** Verify `schoolId` exists in `schools` table before insert.

#### MED — `/api/onboard/principal` uses `.single()` for existence checks

- **Where:** `app/api/onboard/principal/route.ts:27, 32`
- **What:** `.single()` throws on zero rows, but Supabase JS treats that as `data === null` and the route's `if (existing)` check is correct. However the wrong pattern propagates to other places. The codebase rule (CLAUDE.md) is `.maybeSingle()` for existence checks.
- **Why it matters:** Style consistency with codebase norms.
- **Fix sketch:** Replace `.single()` with `.maybeSingle()` in both places.

#### MED — `/api/students/[studentId]/quick-place` GET requires `classroomId` from query, not auth

- **Where:** `app/api/students/[studentId]/quick-place/route.ts:54-115`
- **What:** GET returns current placement state for any (studentId, classroomId) pair from query string. No verification. Includes mastered work names, current work name, mastered count per area.
- **Why it matters:** Cross-tenant progress enumeration. Attacker can read any student's mastery state if they have a student UUID + classroom UUID.
- **Fix sketch:** Gate + derive classroomId from auth + verify studentId belongs there.

#### MED — `/api/classroom/[classroomId]/curriculum` PATCH bypasses path's classroomId

- **Where:** `app/api/classroom/[classroomId]/curriculum/route.ts:75-99`
- **What:** PATCH uses `workId` from the body — never checks `workId` belongs to `classroomId` from the path. A caller can pass any classroomId in the URL (even one they "own" if auth is added later) and mutate any work in the system.
- **Why it matters:** Even with auth added, this route would have a privilege-escalation hole — a teacher with access to classroom A could mutate works in classroom B.
- **Fix sketch:** Add `.eq('classroom_id', classroomId)` to the UPDATE query, so the WHERE clause is `(id = workId AND classroom_id = classroomId)`. If the work isn't in this classroom, the update no-ops.

#### MED — `/api/weekly-planning/upload` deletes ALL assignments for the week before re-inserting

- **Where:** `app/api/weekly-planning/upload/route.ts:322-325`
- **What:** `await supabase.from('weekly_assignments').delete().eq('week_number', weekNumber).eq('year', year);` — wipes every classroom's assignments for that week+year, not just Whale Class's.
- **Why it matters:** This single line is why a malicious upload doesn't just plant fake data — it nukes legitimate data first. The DELETE has no `classroom_id` filter, which is consistent with the legacy `weekly_assignments` table not having one (it's tied to children, not classrooms), but in the multi-tenant world it means a Whale-Class upload destroys other schools' weeks too. Unlikely in practice because `weekly_assignments` is Whale-Class-only today, but the foot-gun is loaded.
- **Fix sketch:** Filter the DELETE to only the children present in this upload — `delete().in('child_id', childIds).eq('week_number', weekNumber).eq('year', year)` — so unrelated assignments aren't touched.

#### MED — `/api/curriculum-import/onboarding` POST `lock_curriculum` reads count incorrectly

- **Where:** `app/api/curriculum-import/onboarding/route.ts:117-128`
- **What:** Reads `(curriculumCount as Record<string, unknown>).count === 0`. The actual returned shape from `select('id', { count: 'exact' })` is `{ data: [...], count: number }` not `curriculumCount.count`. The cast hides this. The check is comparing a property that doesn't exist as a member of the destructured `data` array — it's always falsy, so the check effectively always returns "0 items" and the route correctly errors on empty curricula by accident.
- **Why it matters:** The check is broken-but-passes. If the destructuring shape changes, this silently fails open (allows locking an empty curriculum).
- **Fix sketch:** Destructure properly: `const { count } = await supabase.from(...).select(..., {count:'exact', head:true})` and check `count > 0`.

#### MED — `/api/classroom/[classroomId]/curriculum` POST does not verify caller can create custom works

- **Where:** `app/api/classroom/[classroomId]/curriculum/route.ts:101-142`
- **What:** Beyond the auth gap, the route always inserts `is_custom: true` and `materials_on_shelf: true` regardless of the existing curriculum's structure. No upper bound on number of custom works per classroom.
- **Why it matters:** Quota abuse — even with auth added, a malicious-or-buggy admin could insert 10,000 custom works into one classroom.
- **Fix sketch:** Cap at e.g. 50 custom works per classroom per call. Probably overkill for honest users; add only if abuse signal emerges.

---

### LOW findings

#### LOW — `/api/montree-home/*` stub files contain dead `supabase` variable

- **Where:** all 4 files
- **What:** `const supabase = getSupabase();` instantiates the client but never uses it. ESLint should flag this as unused.
- **Why it matters:** Bundle bloat, lint noise.
- **Fix sketch:** Delete the files (see HIGH finding).

#### LOW — `/api/weekly-planning/by-plan` returns hardcoded `'beijing-international'` slug

- **Where:** Indirectly via `/api/classroom/children` — `school: { id: 'beijing-international', slug: 'beijing-international' }`.
- **What:** Hardcoded.
- **Why it matters:** Cosmetic / legacy. Confusing if a multi-tenant Montree user ever hits this.
- **Fix sketch:** Drop the response field or derive from auth.

#### LOW — `/api/guides/language-making-guide` could be a static asset

- **Where:** `app/api/guides/language-making-guide/route.ts`
- **What:** Reads a static .docx from disk on every request. Could be served as a static asset from `/public/` and bypass Next.js entirely.
- **Why it matters:** Tiny perf + bundle hit.
- **Fix sketch:** Move the .docx to `/public/guides/` and link directly.

#### LOW — `/api/health` doesn't check DB

- **Where:** `app/api/health/route.ts`
- **What:** Returns 200 unconditionally. The Railway healthcheck won't detect a DB outage.
- **Why it matters:** Healthcheck doesn't actually check health.
- **Fix sketch:** Optional — add a `SELECT 1` to Supabase with a 1s timeout. But Railway can't do anything about a Supabase outage, so maybe not worth it.

#### LOW — `/api/onboard/principal` defaults to South Africa / Africa/Johannesburg

- **Where:** Line 42-43.
- **What:** If `country` / `timezone` not passed, defaults are SA-specific. Probably a leftover from initial Whale Class config.
- **Why it matters:** Wrong defaults for the global Montree audience.
- **Fix sketch:** Drop defaults — require them on the body, or derive from request IP geolocation.

#### LOW — `/api/auth/users` returns `password_hash` field via `.select(...)`? Verified not.

- **Where:** Line 27, line 96.
- **What:** Both explicit selects omit `password_hash` — good.
- **Why it matters:** Confirms no password hash leak.

---

## PRIORITISED FIX TABLE

| Priority | Finding | Effort | Action |
|---|---|---|---|
| P0 | CRITICAL: `/api/classroom/[classroomId]/curriculum` open | 30 min | Gate via `verifySchoolRequest()` + verify classroomId; PATCH must also `.eq('classroom_id', classroomId)` |
| P0 | CRITICAL: `/api/students/[studentId]/quick-place` open | 30 min | Gate + `verifyChildBelongsToSchool()` + drop body `recordedBy` |
| P0 | CRITICAL: `/api/weekly-planning/upload` open AI-spend + data wipe | 1 hour | Move under `/api/admin/*` (middleware now gates), add file-size cap, replace hardcoded classroom_id, scope DELETE to involved children |
| P1 | HIGH: `/api/onboard/principal` open | 1 hour | Decide retire vs. add rate limit + captcha |
| P1 | HIGH: 5× `/api/weekly-planning/*` mutators open | 30 min | Move all under `/api/admin/*` namespace |
| P1 | HIGH: `/api/classroom/children` cross-school read | 15 min | Retire OR gate + scope |
| P1 | HIGH: `/api/media` open mutation surface | 30 min | Retire (superseded by `/api/montree/media`) |
| P1 | HIGH: `/api/curriculum-import/*` open AI-spend + cross-tenant | 1 hour | Gate via `verifySchoolRequest()`, verify classroomId, add file limits |
| P1 | HIGH: `/api/montree-home/*` stub deletion | 5 min | `rm -rf app/api/montree-home/` |
| P1 | HIGH: stale hardcoded `bf0daf1b-…` | 30 min | Update `lib/curriculum/classroom.ts` + sweep |
| P2 | MED: `/api/auth/users` POST verify schoolId exists | 10 min | Add existence check |
| P2 | MED: `/api/weekly-planning/upload` 120s DoS amplification | resolved by P0 | n/a |
| P2 | MED: `/api/curriculum-import/works` file count cap | 15 min | Add limit |
| P2 | MED: replace `.single()` with `.maybeSingle()` in `onboard/principal` | 5 min | Mechanical |
| P3 | LOW: `/api/health` shallow check | 10 min | Optional |
| P3 | LOW: `/api/guides/...` move to `/public/` | 15 min | Optional |
| P3 | LOW: hardcoded SA defaults in `onboard/principal` | resolved by retire | n/a |

---

## QUICK WINS (<30 min each)

1. **Delete `/api/montree-home/{activities,children,curriculum,families}/route.ts`.** All 4 are stubs returning `{success:true}` with the service-role Supabase client instantiated but unused. Removing reduces attack surface and prevents copy-paste of the bad template.
2. **Add `/api/classroom/*`, `/api/students/*`, `/api/weekly-planning/*`, `/api/media/*`, `/api/curriculum-import/*` to the middleware matcher** with admin-JWT gating, mirroring the pattern already applied to `/api/admin/*` and `/api/whale/*`. This is the smallest blast-radius single change that closes most of the CRITICAL/HIGH findings in one shot — every legacy mutation route gets admin-only access until a proper per-school gate is added route-by-route.
3. **Update `WHALE_CLASSROOM_ID` constant** in `lib/curriculum/classroom.ts` (line 9) from `bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6` → `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`. Then sweep any literal usages: `/api/weekly-planning/upload/route.ts:65`, `/api/admin/curriculum/sync-all/route.ts`.
4. **Add `.eq('classroom_id', classroomId)` to PATCH in `/api/classroom/[classroomId]/curriculum`** (line 87-92). Even before adding auth, this stops the cross-classroom mutation vector — the URL's classroomId becomes load-bearing.
5. **Replace `.single()` with `.maybeSingle()` in `/api/onboard/principal`** lines 27 and 32. Mechanical.
6. **Add `if (!username || typeof username !== 'string')` reject in `/api/auth/login`** before the credential loop, line 78 area. Defense-in-depth on a route already rate-limited.

---

## VERIFIED-CLEAN

- **`/api/health`** — public by design; trivial JSON status.
- **`/api/public/videos`** — public by design; filters out admin-only categories before returning.
- **`/api/guides/language-making-guide`** — public download; reads a static file from disk. (Could be a `/public/` asset but functionally safe.)
- **`/api/auth/login`** — rate-limited, timing-safe password compare, JWT with HttpOnly cookie, audit logging. Hardened in Session 113 V2.
- **`/api/auth/logout`** — fire-and-forget audit, clears cookie. No exposure.
- **`/api/auth/users`** — full `getUserSession()` gate, role check, `hasPermission()` for mutations. Properly gated.
- **`/api/warm`** — x-cron-secret gate (production), allows unauth in dev. Returns module-warm step timings. No data read.
- **`/api/stripe/connect-webhook`** — Stripe signature verification on raw body. Returns 200 on error to avoid retry storms. Stamps `completed_at` once and never overwrites. Solid.
- **`/api/weekly-planning/list`** — calls `getSchoolIdFromRequest()` first, falls back to `x-school-id`/`x-classroom-id` headers, refuses without one. Properly gated.
- **`/api/weekly-planning/child-detail`** — same gate as `list`. Verifies child belongs to caller's school/classroom before returning. Properly gated.

---

## CLOSING NOTES

The cleanest path forward is **not** to gate each legacy route individually. It's to add the legacy namespaces to the middleware matcher with admin-JWT gating (mirroring `/api/admin/*`), then triage each route into:

- **Retire entirely** — `montree-home/*`, `onboard/principal` (replaced by `/api/montree/try/instant`), `media` (replaced by `/api/montree/media`)
- **Move under `/api/admin/*`** — entire `/api/weekly-planning/*` namespace, `/api/classroom/*`, `/api/students/*`
- **Refactor for proper multi-tenant** — `/api/curriculum-import/*` if it's still actively used for Montree school onboarding (otherwise also retire)

The defense-in-depth move (matcher-level admin gate) is **5 minutes of edit + redeploy**. The route-by-route refactor is days. Pick the matcher first — it closes the critical exposures immediately. Then refactor at leisure.
