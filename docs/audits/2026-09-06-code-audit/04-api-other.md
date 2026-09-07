# API Audit — everything under `app/api/` except `app/api/montree/`

Static, read-only review of a code snapshot at `/tmp/montree` (no runtime, no DB access).
217 route files reviewed. Auth classification was scripted and then verified by reading every
route named in a finding.

## Executive summary

1. **217 routes** across story (67), whale (42), lens (34), potato (28), cms (11),
   weekly-planning (8), lyf-coach (6) and 14 small top-level groups.
2. **Auth split:** 74 routes carry no in-handler auth; of those, **62 are covered by the
   middleware admin-JWT gate** (`/api/whale/*`, `/api/admin/*`, `/api/weekly-planning/*`,
   `/api/curriculum-import/*`, `/api/students/*`, `/api/classroom/*`, `/api/onboard/*`,
   `/api/media*`), 8 are login/logout/health endpoints, and 4 are intentionally public.
3. **The single largest exposure is `LENS_OPEN_BETA = true`** (`lib/lens/flags.ts`): all
   30 authenticated Lens routes fall back to "the one observer row", so read/write/delete
   of real classroom observation data, photos, and child assessments is **anonymous**.
4. **`/api/whale/parent/*` and `/api/whale/teacher/*` (8 routes) are deliberately exempted
   from the middleware gate and authenticate with `supabase.auth.getUser()` on a
   *service-role singleton*** — which has no session and therefore always returns null.
   They fail closed (permanent 401) but are dead code with misleading `// SECURITY:` comments.
5. **Two upload routes take a filesystem branch in production.** `isVercel = VERCEL === '1'`
   is false on Railway, so `/api/whale/photos` and `/api/media` write to the container's
   `public/uploads/`. `/api/whale/photos` joins the **client-supplied filename** into that
   path — arbitrary-file-write for anyone holding the shared admin cookie.
6. **`/api/whale/reports/pdf` shells out** (`exec` python3 + a runtime `pip3 install`) on
   every request, with no size bound on the JSON it writes to `/tmp`.
7. **Both Stripe webhooks verify signatures correctly** with the raw body; no amount is ever
   read from a client. No payment findings.
8. **Potato Snaps and CMS are the best-built surfaces here** — audience-scoped JWTs, private
   bucket proxy with prefix ownership + send-gate, tenancy re-derived from session, 404-not-403.
9. **One secret (`ADMIN_SECRET`) signs five unrelated token families** (Whale admin, Potato
   teacher/parent, Lens observer, auth-multi). Audience claims mostly save it; the blast radius
   of a leak is nonetheless the whole legacy estate plus two standalone products.
10. **~55 routes are legacy/dead** (whale legacy tables, auth-multi, onboard/principal) and are
    listed for deletion or explicit gating at the end.

## Inventory

Auth values: `admin-jwt (middleware)` = no handler check, gated only by `middleware.ts`'s
`requiresAdminJWT` block + matcher. `**NONE**` = reachable with no credential of any kind.

| Route | Methods | Auth | Tenant scoping | Service role | Notes |
|---|---|---|---|---|---|
| `/api/admin/curriculum/sync-all` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/admin/media-library` | DELETE,GET,PATCH,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | no size/type limit on upload; year/week from client into storage key |
| `/api/admin/video-manager` | DELETE,GET,PATCH,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/auth/login` | POST | admin-password | n/a | yes | rate-limited 5/15m, timing-safe; token carries only {isAdmin} — no role separation |
| `/api/auth/logout` | POST | **NONE** | n/a | yes |  |
| `/api/auth/users` | GET,POST | user-token (dead) | n/a | yes | auth-multi `user-token` is minted nowhere — permanently 401 |
| `/api/classroom/[classroomId]/curriculum` | GET,PATCH,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | error.message leaked |
| `/api/classroom/children` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes | SELECT * on legacy `children`, no scoping, unbounded |
| `/api/cms/auth/login` | POST | cms-session | school from session, body ignored | yes |  |
| `/api/cms/auth/logout` | POST | **NONE** | school from session, body ignored | no |  |
| `/api/cms/auth/signup` | POST | cms-session | school from session, body ignored | yes |  |
| `/api/cms/demo/today` | GET | **NONE** | school from session, body ignored | no |  |
| `/api/cms/enroll` | GET,POST | cms-session | school from session, body ignored | no |  |
| `/api/cms/enroll/submit` | POST | cms-session | school from session, body ignored | no |  |
| `/api/cms/health` | GET | **NONE** | school from session, body ignored | no |  |
| `/api/cms/office/enrollments/[id]/accept` | POST | cms-session | school from session, body ignored | no | school_admin only; tenancy re-derived; idempotent + row-claim mutex |
| `/api/cms/office/enrollments/[id]/decline` | POST | cms-session | school from session, body ignored | no |  |
| `/api/cms/office/enrollments/[id]/waitlist` | POST | cms-session | school from session, body ignored | no |  |
| `/api/cms/roster` | POST | cms-session | school from session, body ignored | no |  |
| `/api/curriculum-import/onboarding` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/curriculum-import/works` | GET,PATCH,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/games/progress` | POST | montree-session | schoolId from session | yes |  |
| `/api/games/track` | POST | montree-session | schoolId from session | yes |  |
| `/api/guides/language-making-guide` | GET | **NONE** | n/a | no |  |
| `/api/health` | GET | **NONE** | n/a | no |  |
| `/api/lens/action-items/[id]` | DELETE,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/assessment/bank` | GET | observer (OPEN BETA=any) | observer_id filtered in query | no |  |
| `/api/lens/assessment/import` | POST | observer (OPEN BETA=any) | observer_id filtered in query | no |  |
| `/api/lens/assessment/paper-entry` | POST | observer (OPEN BETA=any) | observer_id filtered in query | no |  |
| `/api/lens/assessment/paper-pack` | GET | observer (OPEN BETA=any) | observer_id filtered in query | no | filename assembled from closed lists — no user string in path |
| `/api/lens/assessment/sessions` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/assessment/sessions/[id]` | GET | observer (OPEN BETA=any) | observer_id filtered in query | no |  |
| `/api/lens/assessment/sessions/[id]/complete` | POST | observer (OPEN BETA=any) | observer_id filtered in query | no |  |
| `/api/lens/assessment/sessions/[id]/items` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | no |  |
| `/api/lens/auth/auto` | GET,POST | **NONE** | observer_id filtered in query | no | OPEN BETA: mints observer cookie for anyone, no credential |
| `/api/lens/auth/logout` | POST | **NONE** | observer_id filtered in query | no |  |
| `/api/lens/auth/me` | GET | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/auth/observer` | POST | **NONE** | observer_id filtered in query | yes |  |
| `/api/lens/classrooms/[id]` | DELETE,GET,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/classrooms/[id]/staff` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/guru/stream` | POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/media/proxy/[...path]` | GET | observer (OPEN BETA=any) | observer_id filtered in query | yes | prefix==observerId check, traversal-safe |
| `/api/lens/moments/[id]` | DELETE,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/profile` | GET,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]` | GET,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]/action-items` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]/debrief` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]/draft` | POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]/finalise` | POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]/pdf` | GET | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/reports/[id]/translate` | POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/schools` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/schools/[id]` | DELETE,GET,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/schools/[id]/classrooms` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/staff/[id]` | DELETE,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/transcribe` | POST | observer (OPEN BETA=any) / montree-session | observer_id filtered in query | no |  |
| `/api/lens/visits` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/visits/[id]` | GET,PATCH | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lens/visits/[id]/moments` | GET,POST | observer (OPEN BETA=any) | observer_id filtered in query | yes |  |
| `/api/lyf-coach/login` | POST | **NONE** | n/a | yes |  |
| `/api/lyf-coach/session` | DELETE,GET | **NONE** | n/a | no |  |
| `/api/lyf-coach/signup` | POST | story-user-jwt | n/a | yes |  |
| `/api/lyf-coach/verify` | GET | **NONE** | n/a | yes |  |
| `/api/lyf-coach/verify-status` | GET,POST | story-user-jwt | n/a | yes |  |
| `/api/lyf-coach/welcome` | GET,POST | story-user-jwt | n/a | yes |  |
| `/api/media` | DELETE,GET,PATCH,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | same VERCEL-only-Supabase bug; local branch writes to public/uploads (ephemeral, unserved) |
| `/api/onboard/principal` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | creates school+school_admin w/ client password; legacy `schools`/`users`; error.message leaked |
| `/api/ping` | GET,HEAD | **NONE** | n/a | no |  |
| `/api/potato/app-version` | GET | **NONE** | classId/childId from cookie claims | no |  |
| `/api/potato/auth/app-token` | POST | admin-password | classId/childId from cookie claims | yes |  |
| `/api/potato/auth/logout` | POST | **NONE** | classId/childId from cookie claims | no |  |
| `/api/potato/auth/parent` | POST | **NONE** | classId/childId from cookie claims | yes |  |
| `/api/potato/auth/teacher` | POST | **NONE** | classId/childId from cookie claims | yes |  |
| `/api/potato/board` | GET | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/branding/emblem` | POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/children` | GET,PATCH,POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/children/[id]/face` | POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/class-film` | GET,POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/hq/classes` | GET,POST | potato-cookie / admin-password | classId/childId from cookie claims | yes |  |
| `/api/potato/hq/classes/[id]` | PATCH | potato-cookie / admin-password | classId/childId from cookie claims | yes |  |
| `/api/potato/hq/classes/[id]/logo` | POST | potato-cookie / admin-password | classId/childId from cookie claims | yes |  |
| `/api/potato/intake` | GET,POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/intake/upload` | POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/media/proxy/[...path]` | GET,HEAD | potato-cookie | classId/childId from cookie claims | yes | private bucket, prefix auth + send-gate; ?token= teacher-only |
| `/api/potato/montage` | POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/montages` | GET | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/montages/[id]/send` | POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/parent-codes` | GET,POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/photos` | GET | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/photos/[id]` | DELETE,PATCH | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/photos/upload` | POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/scenes` | GET,POST | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/scenes/[id]` | PATCH | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/teacher/intake` | GET | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/teacher/intake/[childId]` | GET,PATCH | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/potato/teacher/intake/print-data` | GET | potato-cookie | classId/childId from cookie claims | yes |  |
| `/api/public/videos` | GET | **NONE** | n/a | no |  |
| `/api/story/admin/auth` | DELETE,GET,POST | **NONE** | single-family / space-scoped | yes |  |
| `/api/story/admin/auth/claim` | POST | **NONE** | single-family / space-scoped | yes |  |
| `/api/story/admin/call` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/embed-coach-log` | POST | admin-password | single-family / space-scoped | yes |  |
| `/api/story/admin/family/brain` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/family/context` | GET,PATCH,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/family/recipients` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/files/delete/[id]` | DELETE | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/files/list` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/files/upload` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/login-logs` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/login-logs/diagnose` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/members` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/message-history` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/online-users` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/send` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/system-controls` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/system-controls/nuke` | POST | story-admin-jwt | single-family / space-scoped | yes | destructive; STORY_NUKE_CODE + confirm phrase, timing-safe |
| `/api/story/admin/users` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/chunked/chunk` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/chunked/init` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/delete/[id]` | DELETE | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/download/[id]` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/finalize` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/list` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/save-from-message` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/signed-download/[id]` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/signed-upload` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/thumbnail/[id]` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/unlock` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/vault/upload` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/visits` | GET | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/admin/whoami` | GET | story-admin-jwt | single-family / space-scoped | no |  |
| `/api/story/agora-token` | POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/auth` | DELETE,POST | **NONE** | single-family / space-scoped | yes |  |
| `/api/story/auth/logout` | POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/board` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/coach` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/coach-billing/checkout` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/coach-billing/portal` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/coach-billing/webhook` | POST | webhook-signature | single-family / space-scoped | yes | constructEvent signature verified |
| `/api/story/coach/documents` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/coach/extract-document` | POST | story-admin-jwt | single-family / space-scoped | no |  |
| `/api/story/coach/push/subscribe` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/coach/transcribe` | POST | story-admin-jwt | single-family / space-scoped | no |  |
| `/api/story/cron/expire-media` | POST | story-admin-jwt / cron-secret | single-family / space-scoped | yes |  |
| `/api/story/cron/send-reminders` | GET,POST | story-admin-jwt / cron-secret | single-family / space-scoped | yes |  |
| `/api/story/current` | GET | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/current-call` | GET,POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/current-media` | GET | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/diary` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/diary/[id]` | DELETE,GET,PATCH | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/diary/unlock` | POST | story-admin-jwt | single-family / space-scoped | no |  |
| `/api/story/events` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/events/[id]` | DELETE,PATCH | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/heartbeat` | POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/message` | GET,POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/messages/unlock` | POST | story-admin-jwt | single-family / space-scoped | no |  |
| `/api/story/projects` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/projects/[id]` | DELETE,PATCH | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/push/member-subscribe` | POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/push/public-key` | GET | **NONE** | single-family / space-scoped | no |  |
| `/api/story/push/subscribe` | POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/recent-messages` | GET | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/sanctuary/message` | GET,POST | story-admin-jwt | single-family / space-scoped | yes |  |
| `/api/story/shared-files` | GET | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/story/upload-media` | POST | story-user-jwt | single-family / space-scoped | yes |  |
| `/api/stripe/connect-webhook` | POST | webhook-signature | n/a | yes | constructEvent signature verified; raw body |
| `/api/students/[studentId]/quick-place` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | legacy single-tenant; error.message leaked |
| `/api/warm` | GET | montree-session / cron-secret | n/a | yes |  |
| `/api/weekly-planning/add-work` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/assignments/[id]` | PATCH | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/by-plan` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/child-detail` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/delete` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/list` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/progress` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/weekly-planning/upload` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | 15MB cap; calls Anthropic; self-fetches /api/admin/curriculum/sync-all |
| `/api/whale/activities` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/activity-history` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/activity-videos/upload` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/ai/activity-guidance` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/ai/daily-plan/[childId]` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/ai/status` | GET | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/ai/weekly-plan/[childId]` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/children` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/children/[id]` | DELETE,GET,PUT | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/children/[id]/progress` | GET | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/curriculum` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/areas` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/categories` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/glossary` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/next-works/[childId]` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/progress/[childId]` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/roadmap` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/curriculum/works` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/daily-activity` | GET,POST,PUT | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/daily-summary` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/favorites` | DELETE,GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/materials/generate` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/montessori-works` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/montessori-works/[id]` | DELETE,GET,PUT | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/montessori-works/seed` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/montessori-works/upload-video` | POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/parent/children` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/parent/dashboard/[childId]` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/parent/home-activities/[childId]` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/parent/weekly-report/[childId]` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/photos` | DELETE,GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes | local FS branch writes path.join(dir, photo.name) — traversal; VERCEL!=1 on Railway so this IS the live branch |
| `/api/whale/progress` | GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/progress/enhanced` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/progress/summary` | GET | admin-jwt (middleware) | none (legacy single-tenant) | no |  |
| `/api/whale/reports/generate` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/reports/pdf` | POST | admin-jwt (middleware) | none (legacy single-tenant) | no | shell exec (python3/pip) + tmp writes; child name into Content-Disposition |
| `/api/whale/student/[studentId]/progress-summary` | GET | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |
| `/api/whale/teacher/assign-work` | POST | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/teacher/class-progress` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/teacher/student/[studentId]` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/teacher/students` | GET | sb.auth.getUser (broken→always 401) / +middleware admin-jwt | none (legacy single-tenant) | yes |  |
| `/api/whale/video-watches` | DELETE,GET,POST | admin-jwt (middleware) | none (legacy single-tenant) | yes |  |

## Findings

### [SEV: CRITICAL] Lens open beta turns every `/api/lens/*` route into an anonymous endpoint over real classroom data
**Where:** `lib/lens/flags.ts:13`; `lib/lens/route-helpers.ts:52-64` (`requireObserver`);
`app/api/lens/auth/auto/route.ts:20-33`; consumed by all 30 authenticated Lens routes.
**What:** `LENS_OPEN_BETA` is hard-coded `true`. `requireObserver()` — the single gate every Lens
handler uses — first tries the `lens_observer` cookie, and on failure calls `resolveBetaObserver()`,
which selects the oldest `lens_observers` row and returns it as the session. There is no credential
of any kind in that path. `GET /api/lens/auth/auto` will additionally hand any caller a signed
10-year observer cookie. The invite-code door (`/api/lens/auth/observer`, rate-limited, code-checked)
is bypassed entirely.
**Why it matters:** `curl https://montree.xyz/api/lens/visits` returns the observer's full visit list;
`/api/lens/visits/[id]/moments` returns and accepts observation moments; `/api/lens/media/proxy/...`
streams photographs of third-party Chinese classrooms out of the private `lens-photos` bucket (the
prefix check passes because the anonymous caller *is* that observer); `/api/lens/assessment/sessions`
exposes child assessment sessions and results; `DELETE /api/lens/schools/[id]`,
`/api/lens/moments/[id]`, `/api/lens/staff/[id]` let an anonymous caller destroy the data. The AI
routes (`guru/stream`, `reports/[id]/draft|translate|debrief`, `transcribe`) are per-IP rate-limited
but still spend Anthropic/OpenAI credit for anyone who rotates IPs. The route comments assert "behind
the observer's own cookie" — the flag makes that untrue.
**Fix:** Set `LENS_OPEN_BETA = false` and issue the one observer an invite code through
`/api/lens/auth/observer`. If a frictionless beta is genuinely required, gate the fallback on a
server-side shared secret in the URL she is given (a bearer path param), never on "no credential at
all", and never let it satisfy DELETE/PATCH routes.

### [SEV: HIGH] `/api/whale/photos` writes an attacker-controlled filename to the container filesystem
**Where:** `app/api/whale/photos/route.ts:67` (`isVercel`), `:111-115`
**What:** The route branches on `process.env.VERCEL === '1'`. The app is deployed on **Railway**, so
that is false in production and every upload takes the local-filesystem branch:
`const fileName = ${Date.now()}-${photo.name}` then `path.join(uploadDir, fileName)` then
`writeFile`. `photo.name` is the multipart `filename` field, fully attacker-controlled, and
`path.join` resolves `..` segments.
**Why it matters:** A caller holding the shared Whale admin cookie POSTs a multipart body with
`filename="../../../../.next/server/app/api/health/route.js"` (or any writable path in the app
image) and overwrites server code, escalating an admin-panel session to remote code execution in the
container that holds `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_*` and every JWT
secret. Even without traversal, the branch is silently broken: files land on ephemeral container disk
under `public/`, which a built Next.js app does not serve, so the feature has never worked in
production and every upload is lost on redeploy.
**Fix:** Delete the local-filesystem branch outright and always use Supabase Storage (the
`isVercel` test is wrong for this platform regardless). If a local branch is kept for `npm run dev`,
derive the name entirely server-side (`${Date.now()}-${randomSuffix}.${allowlistedExt}`) and never
interpolate `file.name`. Apply the same to `/api/media/route.ts:51,80-97`, which has the identical
platform bug (its generated name happens not to be traversable, but the writes are equally lost).

### [SEV: HIGH] `/api/whale/reports/pdf` shells out and installs packages on every request
**Where:** `app/api/whale/reports/pdf/route.ts:26-48,55`
**What:** The handler writes the entire client-supplied `reportData` JSON to `os.tmpdir()` with no
size limit, runs `execAsync('python3 -c "import reportlab"')`, and on failure runs
`pip3 install reportlab --break-system-packages` — a package installation triggered by an inbound HTTP
request — before `exec`-ing a Python script. It then interpolates `reportData.child.name` into a
`Content-Disposition` header after stripping only whitespace.
**Why it matters:** Unbounded `writeFile` into `/tmp` from a request body is a trivial disk-fill DoS on
a shared container. A request-time `pip install` means an outbound package fetch is on the critical
path of a user request and any compromise/typosquat of that install lands as code execution. A `"` in
`child.name` breaks out of the quoted filename in the response header. Command arguments themselves are
server-controlled, so this is not direct command injection — but the shape is one edit away from it.
**Fix:** Delete the route (nothing in the app appears to depend on it — the live PDF paths are the
Lens/CMS renderers), or replace it with an in-process PDF library, cap the request body, and quote or
strip the filename with a strict `[A-Za-z0-9_-]` allowlist. Never install packages at request time.

### [SEV: MEDIUM] `/api/whale/parent/*` and `/api/whale/teacher/*` authenticate against a service-role client and are permanently dead
**Where:** `app/api/whale/parent/{children,dashboard/[childId],home-activities/[childId],weekly-report/[childId]}/route.ts`
and `app/api/whale/teacher/{students,student/[studentId],class-progress,assign-work}/route.ts`,
each at line 11-16; `middleware.ts:412-414` (the exemption); `lib/supabase-client.ts:110-137`.
**What:** These eight routes are explicitly excluded from the middleware admin-JWT gate because they
"have their own Supabase auth". That auth is `const supabase = getSupabase(); const { data: { user } }
= await supabase.auth.getUser();` — `getSupabase()` returns the module-level **service-role** singleton
created with `persistSession: false` and no request context, so it never holds a user session and
`getUser()` returns `{ user: null, error: AuthSessionMissingError }` for every request.
**Why it matters:** Every one of these endpoints returns 401 unconditionally: parent dashboards,
teacher rosters, class progress and work assignment are all broken, and the elaborate
`// SECURITY: Verify teacher has access to ALL requested students` logic below the check has never
executed. The failure mode is safe today, but the pattern is one refactor from disaster — if anyone
ever calls `supabase.auth.setSession()` on this shared singleton, the session leaks across all
concurrent requests process-wide.
**Fix:** Delete the eight routes and the two middleware exemptions that exist for them. If the feature
is wanted, rebuild it on a request-scoped anon client seeded from the caller's own access token
(`createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('authorization') } } })`)
and never on the service-role singleton.

### [SEV: MEDIUM] The whole legacy estate hangs on one shared password and one middleware regex
**Where:** `middleware.ts:377-438` and `:862-890`; `app/api/auth/login/route.ts:41-56,118-131`;
`lib/auth.ts:23-30`
**What:** 62 routes — including `/api/media` (DELETE child media), `/api/classroom/children`
(full roster dump), `/api/students/[id]/quick-place`, `/api/weekly-planning/*`,
`/api/admin/video-manager`, `/api/curriculum-import/works` — carry **zero auth in the handler**. Their
only protection is the `requiresAdminJWT` branch plus the `config.matcher` list. The token they check
is minted by `/api/auth/login` from one of three env passwords and contains only `{ isAdmin: true }`:
the `TEACHER_ADMIN_PASSWORD` account and the `SUPER_ADMIN_PASSWORD` account produce byte-identical
tokens with identical authority, and the token carries no username, so the audit log records who
logged in but nothing attributes any subsequent action.
**Why it matters:** A single mis-edited matcher entry (a renamed folder, a route moved one level
deeper, a Next.js middleware-matcher semantics change) silently un-gates unauthenticated deletion of
child media and full roster reads — exactly the class of regression the Session-113 comments in the
file describe having already happened twice. And a leaked teacher password is a full admin
compromise.
**Fix:** Add an explicit `getAdminSession()` check at the top of every one of these handlers so the
middleware is defence in depth rather than the only defence; put the username and a role claim in the
admin token and check the role where it matters; add a test that asserts a 401 for each gated prefix.

### [SEV: MEDIUM] `/api/onboard/principal` mints school-admin accounts from an unauthenticated-by-design body
**Where:** `app/api/onboard/principal/route.ts:12-60,80`
**What:** Accepts `{schoolName, principalEmail, principalPassword, ...}` and creates rows in the legacy
`schools`, `classrooms` and `users` tables with `role: 'school_admin'`, using the service-role client.
It has no auth of its own; it is currently reachable only because `/api/onboard/:path*` was added to
the middleware admin gate. It also returns raw `error.message` on failure.
**Why it matters:** The route was written as a public self-serve signup (that is what "onboard" means
and there is no session check anywhere in it). It survives today only by an incidental middleware
entry that also makes it useless for its stated purpose. Remove that entry — or move the route — and
anyone on the internet can create privileged accounts. Meanwhile `error.message` leaks Postgres
constraint and column names.
**Fix:** Delete the route (Montree's own principal onboarding lives under `/api/montree/*`), or add an
explicit auth check inside it and replace the error passthrough with a generic message.

### [SEV: MEDIUM] Legacy routes return raw database error messages
**Where:** `app/api/classroom/[classroomId]/curriculum/route.ts:71,114,157`;
`app/api/students/[studentId]/quick-place/route.ts:69,81,150`;
`app/api/onboard/principal/route.ts:80`; `app/api/story/cron/send-reminders/route.ts:78`
**What:** These handlers end in `return NextResponse.json({ error: error.message }, { status: 500 })`.
Supabase/PostgREST error messages carry table names, column names, constraint names and sometimes the
offending value.
**Why it matters:** An authenticated-but-hostile admin (or anyone who reaches these once the
middleware slips) can map the legacy schema by feeding malformed payloads, which materially shortens
the path to a targeted injection or a forged write. The rest of the codebase already has
`safeErrorLog` / `lensError` funnels for exactly this.
**Fix:** Log the real error server-side and return a fixed string, as `lib/api-error.ts` and
`lib/lens/route-helpers.ts` already do.

### [SEV: MEDIUM] One signing secret for five unrelated token audiences
**Where:** `lib/auth.ts:12`, `lib/potato/auth.ts:60-62`, `lib/lens/auth.ts:54-56`,
`lib/auth-multi.ts:9`
**What:** `ADMIN_SECRET` signs the Whale admin token (`{isAdmin:true}`, no audience claim), the
Potato teacher and parent tokens (`aud` checked), the Lens observer token (`aud` checked) and the
auth-multi `user-token` (`AUTH_SECRET || ADMIN_SECRET`). Story uses a separate `STORY_JWT_SECRET`,
which is the right shape.
**Why it matters:** The audience checks in Potato and Lens prevent the obvious cross-product forgery,
and the admin token's payload shape saves it in the other direction — but that is a property of three
files staying correct forever, not of the key material. One leaked value (it is also the fallback for
`CMS_JWT_SECRET` per `CLAUDE.md`) forges Whale admin, every Potato class session, the Lens observer,
and CMS sessions simultaneously.
**Fix:** Give each product its own env secret with the existing value as fallback, so rotation can be
done one product at a time. Add an `aud` claim to the Whale admin token and check it.

### [SEV: LOW] `/api/admin/media-library` accepts unbounded uploads and takes path segments from the client
**Where:** `app/api/admin/media-library/route.ts:73-92`
**What:** No file-size and no MIME check before buffering the upload and pushing it to the
`lesson-documents` bucket; `storagePath` is `${year}/week-${weekNumber}/${filename}` with `year` and
`weekNumber` taken from the form body (the filename itself *is* sanitised to `[A-Za-z0-9.-]`).
**Why it matters:** An admin session can exhaust storage quota or memory with one request, and a
`weekNumber` of `../..` produces surprising object keys (harmless in Supabase's flat keyspace, but it
makes the bucket unenumerable in the way operators expect).
**Fix:** Cap the size, allowlist the MIME type, and coerce `year`/`weekNumber` with `parseInt` +
range check before they reach the key.

### [SEV: LOW] `/api/auth/users` is unreachable — the `user-token` cookie is minted nowhere
**Where:** `app/api/auth/users/route.ts:14,47`; `lib/auth-multi.ts:128-135`
**What:** `getUserSession()` reads a `user-token` cookie. No route in the repository calls
`setUserToken`/writes that cookie; `/api/auth/login` sets `admin-token` only. Both handlers therefore
always return 401.
**Why it matters:** Not exploitable — but it is a live user-creation endpoint (with `hashPassword` and
role assignment) sitting one forgotten commit away from being wired back up, against the same legacy
`users` table `/api/onboard/principal` writes to.
**Fix:** Delete `/api/auth/users` and `lib/auth-multi.ts` with the rest of the legacy estate.

### [SEV: INFO] Things that were checked and are correct
- **Stripe:** `app/api/stripe/connect-webhook/route.ts:33-52` and
  `app/api/story/coach-billing/webhook/route.ts` both read `await req.text()` and call
  `stripe.webhooks.constructEvent` with the endpoint secret before touching the DB, and fail 400 on a
  bad signature. No route reads a payment amount from a client body.
- **Potato Snaps** (28 routes): audience-scoped JWTs, host-only cookies, rate-limited code doors,
  a private-bucket proxy that checks the `class/<classId>/` prefix *before* the upstream fetch,
  rejects `..` and leading `/`, enforces the parent send-gate a second time at the byte layer, and
  404s rather than 403s. The `?token=` query door is teacher-audience-only and documented.
- **CMS** (11 routes): `getCmsSession()` in every handler, role checked explicitly
  (`office/*` is `school_admin` only), tenancy re-derived from the session with the request body
  ignored, an atomic row-claim before the cross-product junction call, and 404-not-403 on foreign rows.
- **Story** (67 routes): 61 carry an explicit JWT check; author identity comes from the verified token,
  never the body; logins are bcrypt + rate-limited; the destructive `system-controls/nuke` needs a
  dedicated `STORY_NUKE_CODE` plus a confirm phrase and writes its audit row outside its own blast radius.
- **Lens path handling:** `media/proxy` rejects `.`/`..`/backslash and requires the first segment to
  equal the observer id; `assessment/paper-pack` assembles its filename from closed constant lists.
  (Both are still reachable anonymously — see the CRITICAL above.)
- **No SSRF:** the only `fetch()` calls to non-constant URLs are `potato/media/proxy` (URL built from
  a validated path against a hard-coded Supabase host) and `story/admin/vault/*` (Supabase resumable
  upload URLs). No route fetches a client-supplied URL.
- **No SQL injection:** every query goes through PostgREST builders; `lib/db.ts`'s raw-SQL shim
  ignores its input and is used by nothing in this scope. The two `.ilike()` calls in
  `admin/media-library` escape LIKE metacharacters.

## Candidates for deletion or explicit gating

Delete (dead code, broken auth, or superseded by `/api/montree/*`):
1. `app/api/whale/parent/**` (4 routes) — permanently 401, plus the `middleware.ts:413` exemption.
2. `app/api/whale/teacher/**` (4 routes) — permanently 401, plus the `middleware.ts:414` exemption.
3. `app/api/whale/reports/pdf` — shell + request-time `pip install`.
4. `app/api/auth/users` and `lib/auth-multi.ts` — unmintable session.
5. `app/api/onboard/principal` — legacy `schools`/`users` signup, superseded.
6. `app/api/classroom/children` — `SELECT *` over the legacy `children` table, single-tenant.
7. `app/api/students/[studentId]/quick-place` — legacy `child_work_progress` writer.
8. `app/api/media` and `app/api/whale/photos` — both write to a filesystem branch that never runs
   correctly on Railway; replace with the Supabase-only path or drop them.

Gate explicitly rather than relying on the middleware regex (add `getAdminSession()` in-handler):
`/api/admin/{curriculum/sync-all,media-library,video-manager}`, all 8 `/api/weekly-planning/*`,
both `/api/curriculum-import/*`, `/api/classroom/[classroomId]/curriculum`, and the ~30 remaining
`/api/whale/*` data routes.

Flip before any further public exposure: `LENS_OPEN_BETA` in `lib/lens/flags.ts`.
