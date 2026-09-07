# API Audit — `/app/api/montree/**` (directories n–z)

*Static read-only review of `/tmp/montree`. 258 `route.ts` files in scope.*

## Executive summary

1. **258 routes reviewed** across 46 top-level groups. `/api/montree/*` is **not** covered by `middleware.ts`'s matcher — every route gates itself, so a missing guard is a fully open endpoint.
2. Auth distribution: **117 session** (`verifySchoolRequest`), **76 super-admin**, **25 parent**, **8 cron/worker-combined**, **6 org/principal-messaging**, **21 with no auth helper** (18 of which are legitimate public login/signup/telemetry/library endpoints).
3. **254 of 258 routes use the service-role Supabase client**, so RLS is bypassed and in-code tenant scoping is the *only* protection.
4. **Overall hygiene is unusually good**: the parent surface consistently re-checks `authorizedChildIds`; teacher routes overwhelmingly re-prove `classroom.school_id === auth.schoolId`; progress writes go through the single `write-progress.ts` door.
5. **1 HIGH IDOR**: `/reports/[id]` GET **and PATCH** have *zero* tenant scoping — any authenticated user can read, and **publish to parents**, any school's weekly report.
6. **2 further cross-tenant reads**: `/work-rhythm` and `/works/{search,guide}` trust a request-supplied `classroom_id`.
7. **1 HIGH stored-XSS/abuse vector**: `/uploads` accepts *any* file type at *any* size into the public `montree-media` bucket, which `/api/montree/media/proxy` re-serves same-origin with the attacker's `Content-Type`.
8. **1 MEDIUM anonymous-destruction vector**: `/satpin-media` POST is unauthenticated and silently deletes the previous song for a slug.
9. **Super-admin is a single static password** with no MFA; the session-JWT signing key falls back to that same password when `SUPER_ADMIN_JWT_SECRET` is unset (CLAUDE.md still lists that env var as an open ops item).
10. **8 routes are permanently broken** by a wrong `checkRateLimit()` call signature (always 429 / always 500). No `zod` anywhere — validation is hand-rolled but generally present.

---

## Inventory

| Route | Methods | Auth | Tenant scoping | Svc-role | Validation | Notes |
|---|---|---|---|---|---|---|
| `/notify` | POST | session | session-derived | Y | manual |  |
| `/observations` | DELETE,GET,POST | session | session-derived | Y | manual |  |
| `/onboarding` | POST | NONE | public | Y | manual | broken checkRateLimit signature → route always errors |
| `/onboarding-copilot/ask` | POST | session | n/a | Y | manual |  |
| `/onboarding-copilot/ask-public` | POST | NONE | public | Y | manual | public AI, RL 6/15m + honeypot + max_tokens 300 |
| `/onboarding-copilot/progress` | POST | session | n/a | Y | manual |  |
| `/onboarding-copilot/state` | GET | session | n/a | Y | - |  |
| `/onboarding/progress` | GET,POST | session | n/a | Y | manual |  |
| `/onboarding/settings` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/onboarding/skip` | POST | session | n/a | Y | manual |  |
| `/onboarding/students` | POST | session | session-derived | Y | manual |  |
| `/onboarding/voice/custom-work` | POST | session | session-derived | Y | manual |  |
| `/onboarding/voice/scan-custom` | POST | session | n/a | Y | - |  |
| `/onboarding/voice/status` | GET | session | n/a | Y | - |  |
| `/org/enter-school` | POST | org | session-derived | Y | manual |  |
| `/org/invites` | GET,POST | super-admin|org | global (by design) | Y | manual |  |
| `/org/invites/[id]` | DELETE | super-admin|org | global (by design) | Y | manual |  |
| `/org/invites/validate` | POST | NONE | public | Y | manual |  |
| `/org/login` | POST | NONE | public | Y | manual |  |
| `/org/register-organization` | POST | NONE | public | Y | manual |  |
| `/org/register-school` | POST | NONE | public | Y | manual |  |
| `/org/reports/milestones` | GET | org | n/a | Y | - |  |
| `/org/return-to-org` | POST | session | n/a | Y | - |  |
| `/org/schools` | GET | org | n/a | Y | - |  |
| `/paper-scan` | GET | session | session-derived | Y | - |  |
| `/paper-scan/[scanId]` | GET | session | session-derived | Y | - |  |
| `/paper-scan/[scanId]/commit` | POST | session | session-derived | Y | manual |  |
| `/paper-scan/[scanId]/extract` | POST | session | session-derived | Y | manual |  |
| `/paper-scan/extraction/[extractionId]` | PATCH | session | session-derived | Y | manual |  |
| `/paper-scan/layouts` | GET | session | session-derived | Y | manual |  |
| `/paper-scan/layouts/[id]` | GET,PATCH | session | session-derived | Y | manual |  |
| `/paper-scan/layouts/learn` | POST | session | session-derived | Y | manual |  |
| `/paper-scan/sheet/print` | GET | session | session-derived | Y | manual |  |
| `/paper-scan/upload` | POST | session | session-derived | Y | manual |  |
| `/paperwork/read-week` | POST | session | session-derived | Y | manual |  |
| `/parent/account/notification-prefs` | GET,PATCH | parent | n/a | Y | manual |  |
| `/parent/announcements` | GET | parent | session-derived | Y | manual |  |
| `/parent/appointments` | GET,POST | parent | session-derived | Y | manual |  |
| `/parent/appointments/[id]` | DELETE,GET,PATCH | parent | ⚠ request-supplied id | Y | manual |  |
| `/parent/auth/access-code` | GET,POST | parent | n/a | Y | manual | invite-code login, RL 5/15m |
| `/parent/auth/delete-account` | DELETE,GET | parent | n/a | Y | - |  |
| `/parent/auth/logout` | POST | NONE | public | Y | - |  |
| `/parent/calendar` | GET | parent | n/a | Y | - |  |
| `/parent/children` | GET | parent | session-derived | Y | - |  |
| `/parent/dashboard` | GET | parent | n/a | Y | - |  |
| `/parent/events` | GET | parent | n/a | Y | - |  |
| `/parent/events/[id]/rsvp` | POST | parent | ⚠ request-supplied id | Y | manual |  |
| `/parent/home-practice` | GET | parent | session-derived | Y | - |  |
| `/parent/intake` | GET,POST | parent | session-derived | Y | manual |  |
| `/parent/intake/upload` | POST | parent | session-derived | Y | manual |  |
| `/parent/login` | POST | NONE | public | Y | manual |  |
| `/parent/messages/recipients` | GET | parent | n/a | Y | - |  |
| `/parent/messages/threads` | GET,POST | parent | ⚠ request-supplied id | Y | manual |  |
| `/parent/messages/threads/[threadId]` | GET,PATCH | parent | ⚠ request-supplied id | Y | manual |  |
| `/parent/messages/threads/[threadId]/messages` | GET,POST | parent | ⚠ request-supplied id | Y | manual |  |
| `/parent/milestones` | GET | parent | session-derived | Y | manual |  |
| `/parent/montages` | GET | parent | session-derived | Y | manual |  |
| `/parent/photos` | GET | parent | session-derived | Y | manual |  |
| `/parent/report/[reportId]` | GET | parent | session-derived | Y | manual |  |
| `/parent/reports` | GET | parent | session-derived | Y | manual |  |
| `/parent/signup` | POST | NONE | public | Y | manual |  |
| `/parent/stats` | GET | parent | session-derived | Y | manual |  |
| `/parent/weekly-review` | GET | parent | n/a | Y | - |  |
| `/patterns` | GET,PATCH | session | session-derived | Y | manual |  |
| `/perf/vitals` | POST | NONE | public | Y | - | unauth, unbounded array insert, attacker-set school_id |
| `/phonics-tts` | GET | NONE | public | Y | manual | public by design; charset+len cap+RL |
| `/phonics-videos` | GET | NONE | public | Y | - | public read-only listing |
| `/phonics/images` | DELETE,POST | session | session-derived | Y | manual | broken checkRateLimit → always 429 |
| `/phonics/upload` | POST | session | n/a | Y | manual | broken checkRateLimit → always 429 |
| `/phonics/words` | DELETE,GET,PATCH,POST | session | session-derived | Y | manual | broken checkRateLimit → always 429 |
| `/photo-audit/resolve` | POST | session | session-derived | Y | manual |  |
| `/photo-audit/tell-ai` | POST | session | session-derived | Y | manual |  |
| `/photo-bank` | DELETE,GET,POST | session | n/a | Y | manual |  |
| `/photo-identification/batch` | DELETE,POST | session | session-derived | Y | manual |  |
| `/photo-identification/process` | POST | session | session-derived | Y | manual |  |
| `/photo-identification/requeue` | POST | session | session-derived | Y | manual |  |
| `/photo-identification/sonnet-review` | POST | session | session-derived | Y | manual |  |
| `/photo-identification/sweep` | GET | session | session-derived | Y | - |  |
| `/photo-onboarding/[importId]` | GET | session | session-derived | Y | - |  |
| `/photo-onboarding/[importId]/commit` | POST | session | session-derived | Y | manual |  |
| `/photo-onboarding/[importId]/extract` | POST | session | session-derived | Y | manual |  |
| `/photo-onboarding/upload` | POST | session | session-derived | Y | manual |  |
| `/present/album` | GET | session | session-derived | Y | manual |  |
| `/principal/login` | POST | NONE | public | Y | manual |  |
| `/principal/messages-tredoux/threads` | GET,POST | principal-msg | n/a | Y | manual |  |
| `/principal/messages-tredoux/threads/[threadId]` | GET,PATCH | principal-msg | ⚠ request-supplied id | Y | manual |  |
| `/principal/messages-tredoux/threads/[threadId]/messages` | GET,POST | principal-msg | ⚠ request-supplied id | Y | manual |  |
| `/principal/register` | POST | NONE | public | Y | manual |  |
| `/principal/setup` | POST | session | session-derived | Y | manual |  |
| `/principal/setup-stream` | POST | session | session-derived | Y | - |  |
| `/progress` | GET | session | session-derived | Y | manual |  |
| `/progress/bars` | GET | session | session-derived | Y | manual |  |
| `/progress/batch-master` | POST | session | session-derived | Y | manual |  |
| `/progress/classroom-summary` | GET | session | session-derived | Y | manual |  |
| `/progress/event` | POST | session | session-derived | Y | manual |  |
| `/progress/summary` | GET | session | session-derived | Y | manual |  |
| `/progress/update` | POST | session | session-derived | Y | manual |  |
| `/pulse` | GET,PATCH,POST | session | n/a | Y | manual |  |
| `/push/register` | DELETE,POST | session|parent | n/a | Y | manual |  |
| `/raz` | GET,PATCH,POST | session | session-derived | Y | manual |  |
| `/raz/summary` | GET | session | session-derived | Y | manual | broken checkRateLimit → always 429 |
| `/raz/upload` | POST | session | session-derived | Y | manual |  |
| `/reports` | GET,POST | session | session-derived | Y | manual |  |
| `/reports/[id]` | GET,PATCH | session | ⚠ request-supplied id | Y | manual | **IDOR** — no school scoping on GET or PATCH |
| `/reports/available-photos` | GET | session | session-derived | Y | manual |  |
| `/reports/batch` | POST | session | session-derived | Y | manual |  |
| `/reports/batch-narratives` | POST | session | session-derived | Y | manual |  |
| `/reports/generate` | POST | session | session-derived | Y | manual |  |
| `/reports/language-presentation/[childId]` | GET,PATCH,POST | session | session-derived | Y | manual |  |
| `/reports/language-semester/generate` | POST | session | session-derived | Y | manual |  |
| `/reports/pdf` | GET | session | session-derived | Y | manual |  |
| `/reports/period` | GET,POST | session | session-derived | Y | manual |  |
| `/reports/photos` | PATCH | session | session-derived | Y | manual |  |
| `/reports/preview` | GET | session | session-derived | Y | manual |  |
| `/reports/send` | POST | session | session-derived | Y | manual |  |
| `/reports/unreported` | GET | session | session-derived | Y | manual |  |
| `/reports/weekly-wrap` | POST | session | session-derived | Y | manual |  |
| `/reports/weekly-wrap/approve` | POST | session | session-derived | Y | manual |  |
| `/reports/weekly-wrap/edit` | PATCH | session | session-derived | Y | manual |  |
| `/reports/weekly-wrap/montage` | GET,POST | session | n/a | Y | manual |  |
| `/reports/weekly-wrap/review` | GET | session | session-derived | Y | manual |  |
| `/reports/weekly-wrap/send` | POST | session | session-derived | Y | manual |  |
| `/satpin-media` | GET,POST | NONE | public | Y | manual | public upload + implicit delete; ext/mime only |
| `/school-features` | GET,POST | session | session-derived | Y | manual |  |
| `/school/terms` | DELETE,GET,PATCH,POST | session | session-derived | Y | manual |  |
| `/sessions` | GET,POST | session | session-derived | Y | manual |  |
| `/shelf` | GET,POST | session | session-derived | Y | manual |  |
| `/shelf-autopilot` | POST | session | session-derived | Y | manual |  |
| `/social-guru` | POST | super-admin | global (by design) | - | manual | auth call passes NextRequest as password → always errors |
| `/super-admin/agent-applications` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agent-applications/[id]/accept` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agent-audit` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/agent-messages/threads` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/agent-messages/threads/[threadId]` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agent-messages/threads/[threadId]/messages` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agents/[id]/annual-statement` | GET | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agents/[id]/connect-onboard` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agents/[id]/connect-status` | GET | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agents/[id]/login` | PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agents/[id]/login-as` | POST | session|super-admin | ⚠ request-supplied id | Y | manual |  |
| `/super-admin/agents/[id]/payout-config` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/agents/[id]/tax-form` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/all-logins` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/audit` | GET,POST | super-admin | global (by design) | Y | - |  |
| `/super-admin/auth` | POST | NONE | public | Y | manual | static password; JWT secret falls back to that password |
| `/super-admin/campaign` | DELETE,GET,PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/campaign-manager` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/demo-meetings` | GET,PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/demo-request-drip` | POST | super-admin|cron | global (by design) | Y | - |  |
| `/super-admin/demo-requests` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/demo-requests/bulk-reply` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/embed-global-vm` | POST | super-admin|cron | global (by design) | Y | manual |  |
| `/super-admin/finance/export` | GET | super-admin | global (by design) | Y | manual |  |
| `/super-admin/finance/export/print` | GET | super-admin | global (by design) | Y | manual |  |
| `/super-admin/finance/ledger` | DELETE,GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/finance/period-locks` | GET,PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/finance/reconciliation` | GET | super-admin | global (by design) | Y | manual |  |
| `/super-admin/finance/recurring` | DELETE,GET,PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/finance/recurring/run` | POST | super-admin|cron | global (by design) | Y | - |  |
| `/super-admin/finance/xero-sync-status` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/founding` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/founding-messages/threads` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/founding-messages/threads/[threadId]` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/founding-messages/threads/[threadId]/messages` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/geo-match` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/global-outreach` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/guru` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/health` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/i18n-sync` | GET,POST | super-admin|cron | global (by design) | Y | - |  |
| `/super-admin/impact-fund` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/login-as` | POST | super-admin | session-derived | Y | - |  |
| `/super-admin/lyf-coach/member` | DELETE,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/lyf-coach/overview` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/lyf-coach/subscribers` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/lyf-coach/tax` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/lyf-coach/tax/register` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/lyf-coach/tax/remit` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/marketplace` | DELETE,GET,PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/master-outreach/download` | GET | super-admin | global (by design) | - | - |  |
| `/super-admin/master-outreach/summary` | GET | super-admin | global (by design) | - | - |  |
| `/super-admin/npo-applications` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/npo-outreach` | GET,PATCH,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/organizations` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/organizations/[id]/view-as` | POST | super-admin|org | global (by design) | Y | manual |  |
| `/super-admin/outreach` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/outreach-codes` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/outreach-log-retention` | POST | super-admin|cron | global (by design) | Y | manual |  |
| `/super-admin/payouts` | GET,PATCH | super-admin | session-derived | Y | manual |  |
| `/super-admin/payouts/[payoutId]/record-wire` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/payouts/[payoutId]/wire` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/payouts/calculate` | POST | super-admin|cron | global (by design) | Y | manual |  |
| `/super-admin/phonics-video-upload-url` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/photo-debug/[mediaId]` | GET | super-admin | global (by design) | Y | manual |  |
| `/super-admin/photo-debug/recent` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/principal-questions` | GET | super-admin | session-derived | Y | - |  |
| `/super-admin/principals` | DELETE,GET,PATCH,POST | super-admin | session-derived | Y | manual |  |
| `/super-admin/reduced-rate-applications` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/referral-codes` | DELETE,GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/reset-password` | POST | super-admin | session-derived | Y | manual |  |
| `/super-admin/school-features` | GET,POST | super-admin | session-derived | Y | manual |  |
| `/super-admin/schools` | DELETE,GET,PATCH | super-admin | session-derived | Y | manual |  |
| `/super-admin/schools/[id]/issue-manual-invoice` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/schools/[id]/payment-config` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/schools/[id]/record-incoming-wire` | POST | super-admin | session-derived | Y | manual |  |
| `/super-admin/secure` | GET,POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/server-errors` | DELETE,GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/tracy-corpus` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/traffic-funnel` | GET | super-admin | global (by design) | Y | - |  |
| `/super-admin/trial-drip` | POST | super-admin|cron | global (by design) | Y | - |  |
| `/super-admin/tryit` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/super-admin/visitors-mark-internal` | POST | super-admin | global (by design) | Y | manual |  |
| `/super-admin/webhook-deadletter` | GET,PATCH | super-admin | global (by design) | Y | manual |  |
| `/teacher-notes` | DELETE,GET,PATCH,POST | session | session-derived | Y | manual |  |
| `/teacher/earnings` | GET | session | session-derived | Y | - |  |
| `/teacher/menu` | GET,PATCH | session | n/a | Y | manual |  |
| `/teacher/register` | POST | NONE | public | Y | manual |  |
| `/tracking/child` | GET | session | session-derived | Y | manual |  |
| `/tracking/class` | GET | session | session-derived | Y | manual |  |
| `/tracking/class-week` | GET,PATCH | session | session-derived | Y | manual |  |
| `/tracking/health` | GET | session|cron | session-derived | Y | - |  |
| `/tracking/invariants` | GET | session | session-derived | Y | manual |  |
| `/tracking/rebuild` | POST | session | session-derived | Y | manual |  |
| `/tracking/review-queue/resolve` | POST | session | session-derived | Y | manual |  |
| `/try/instant` | POST | NONE | public | Y | manual |  |
| `/tryit/click` | POST | NONE | public | Y | - |  |
| `/tryit/message` | POST | NONE | public | Y | manual |  |
| `/tts` | POST | session | n/a | Y | manual |  |
| `/tutorial/complete` | POST | session | n/a | Y | - |  |
| `/uploads` | DELETE,GET,POST | session | n/a | Y | manual | no size/type cap; public bucket; proxy serves inline |
| `/visitors` | GET | super-admin | global (by design) | Y | - |  |
| `/visitors/track` | POST | NONE | public | Y | manual | unauth insert, in-memory RL only |
| `/voice-notes` | GET,POST | session | session-derived | Y | manual |  |
| `/voice-notes/transcribe` | POST | session | n/a | Y | manual |  |
| `/voice-notes/weekly-admin` | GET,POST | session | session-derived | Y | manual |  |
| `/voice-observation/[sessionId]/commit` | POST | session | session-derived | Y | manual |  |
| `/voice-observation/[sessionId]/end` | POST | session | session-derived | Y | manual |  |
| `/voice-observation/[sessionId]/pause` | POST | session | session-derived | Y | manual |  |
| `/voice-observation/[sessionId]/review` | GET | session | session-derived | Y | - |  |
| `/voice-observation/[sessionId]/status` | GET | session | session-derived | Y | - |  |
| `/voice-observation/[sessionId]/upload` | POST | session | session-derived | Y | manual |  |
| `/voice-observation/extraction/[extractionId]` | PATCH | session | session-derived | Y | manual |  |
| `/voice-observation/history` | GET | session | n/a | Y | - |  |
| `/voice-observation/start` | POST | session | session-derived | Y | manual |  |
| `/weekly-admin-docs/auto-fill` | GET | session | session-derived | Y | manual |  |
| `/weekly-admin-docs/generate` | POST | session | session-derived | Y | manual |  |
| `/weekly-admin-docs/monthly-auto-fill` | GET | session | session-derived | Y | manual |  |
| `/weekly-admin-docs/monthly-generate` | POST | session | session-derived | Y | manual |  |
| `/weekly-admin-docs/monthly-notes` | GET,POST | session | session-derived | Y | manual |  |
| `/weekly-admin-docs/notes` | GET,POST | session | session-derived | Y | manual |  |
| `/weekly-assignments` | GET | session | session-derived | Y | manual |  |
| `/weekly-review/[childId]` | PATCH,POST | session | session-derived | Y | manual |  |
| `/weekly-review/[childId]/apply-shelf` | POST | session | session-derived | Y | manual |  |
| `/weekly-review/[childId]/send` | POST | session | session-derived | Y | manual |  |
| `/work-rhythm` | GET | session | n/a | Y | manual | **cross-tenant** — classroom_id unverified |
| `/works` | GET | session | n/a | Y | - |  |
| `/works/guide` | GET | session | ⚠ request-supplied id | Y | manual | **cross-tenant** — classroom_id unverified |
| `/works/next` | GET | session | n/a | - | manual |  |
| `/works/search` | GET | session | ⚠ request-supplied id | Y | - | **cross-tenant** — classroom_id unverified |
---

## Findings

### [SEV: HIGH] `/api/montree/reports/[id]` — no tenant scoping on read *or* write (IDOR)
**Where:** `app/api/montree/reports/[id]/route.ts:24-28` (GET), `:73-78` (PATCH)
**What:** Both handlers call `verifySchoolRequest()` and then never use `auth` again. The queries are `.from('montree_weekly_reports').eq('id', reportId)` with **no `school_id`, `classroom_id` or child-ownership filter**, on the service-role client. GET returns `select('*')` — the entire report row (child name, teacher narrative, observations, photo references). PATCH accepts `{status, approved_by, sent_to}` from the body and, when `status === 'sent'`, sets `is_published = true` and `published_at` on *any* report id.
**Why it matters:** Any teacher account — including one created for free in seconds via `/api/montree/try/instant` or `/api/montree/teacher/register` — that learns a report UUID can read another school's child report verbatim, and can flip that school's *unfinished draft* report to published so its parents receive it. It also lets a legitimate teacher bypass the real send path (`reports/weekly-wrap/…`), skipping the photo-junction and notification logic, producing published reports with no media.
**Fix:** Load the report with its `child_id`, resolve the child's school, and 404 unless it equals `auth.schoolId` (use the existing `verifyChildBelongsToSchool()` helper). For PATCH, additionally whitelist `status` against `['draft','approved','sent']` and reject `status:'sent'` here entirely — publishing belongs to the dedicated send route.

### [SEV: HIGH] `/api/montree/uploads` — unrestricted file type and size into a publicly-proxied bucket (stored XSS on the app origin)
**Where:** `app/api/montree/uploads/route.ts:44-88`; served by `app/api/montree/media/proxy/[...path]/route.ts:166-176`
**What:** The POST handler takes `formData.get('file')`, performs **no MIME allow-list and no size check**, and uploads with `contentType: file.type || 'application/octet-stream'` — a value entirely chosen by the client — into the public `montree-media` bucket under `uploads/{school_id}/`. The proxy route is unauthenticated, is in the bucket allow-list, and passes the upstream `Content-Type` straight through (`'Content-Type': contentType`) with no `Content-Disposition` unless `?download=1`.
**Why it matters:** A self-serve trial teacher uploads `payload.html` with `Content-Type: text/html`, receives a `montree.xyz/api/montree/media/proxy/uploads/...` URL, and sends it to a principal or another teacher. Because `montree-auth` is an httpOnly, `sameSite: lax`, path `/` cookie, the injected script runs same-origin and can drive every authenticated API as the victim — including `/api/montree/admin/*`. Separately, the absent size cap makes storage exhaustion a one-request affair.
**Fix:** Allow-list MIME types (or at minimum force `contentType: 'application/octet-stream'` on anything not in an image/video/pdf allow-list), enforce a byte cap, and add `Content-Disposition: attachment` in the proxy for any type outside `image/*`, `video/*`, `audio/*`, `application/pdf`.

### [SEV: MEDIUM] `/api/montree/work-rhythm` — request-supplied `classroom_id` is never proved to belong to the caller's school
**Where:** `app/api/montree/work-rhythm/route.ts:150-235`
**What:** The only use of `auth.schoolId` is the feature-flag lookup (`isFeatureEnabled(supabase, auth.schoolId, …)`). `classroomId` then comes from `params.get('classroom_id')` and is used unfiltered against `montree_children`, `montree_paper_scan_extractions` and `montree_media`.
**Why it matters:** Any teacher at a school that has `work_rhythm` enabled can substitute another school's classroom UUID and receive that classroom's full roster — child names, `photo_url`s — plus per-child, per-area time aggregates. This is precisely the "existence ≠ ownership" class CLAUDE.md records as a prior incident.
**Fix:** Before the roster query, `select('id').from('montree_classrooms').eq('id', classroomId).eq('school_id', auth.schoolId).maybeSingle()` and 403 on miss — the exact pattern already used in `paper-scan/upload/route.ts:60-70`.

### [SEV: MEDIUM] `/api/montree/works/search` and `/api/montree/works/guide` — cross-tenant curriculum read
**Where:** `app/api/montree/works/search/route.ts:33-95`; `app/api/montree/works/guide/route.ts:47-58`
**What:** Both accept `classroom_id` from the query string and query `montree_classroom_curriculum_works` / `montree_classroom_curriculum_areas` scoped only by that id. `works/search` additionally constructs its own service-role client inline from `SUPABASE_SERVICE_ROLE_KEY` rather than using `getSupabase()`.
**Why it matters:** A teacher can enumerate another school's customised curriculum: work names, `quick_guide`, `parent_description`, `why_it_matters`, custom works. Not child PII, but it is the tenant's authored content and it is the school's product differentiation.
**Fix:** Same ownership pre-check as above; drop the inline `createClient` in favour of `getSupabase()`.

### [SEV: MEDIUM] `/api/montree/satpin-media` POST — anonymous upload that silently deletes existing content
**Where:** `app/api/montree/satpin-media/route.ts:107-183` (delete loop at `:163-180`)
**What:** Documented as deliberately public. Guards are: IP rate limit 10/15 min, a 27-entry slug allow-list, a 25 MB cap, and an extension/MIME check derived **only from client-declared `file.type` and `file.name`** — no magic-byte inspection. After a successful upload the handler lists the prefix and `remove()`s every prior file for that slug.
**Why it matters:** An anonymous caller can, in 27 requests, replace the whole 27-week song series with silence (or with anything they like — the content check is trivially spoofed by naming the file `.mp3`), destroying content that has no other copy in the bucket. The bytes are then served from the public bucket, i.e. free arbitrary file hosting attributable to Montree.
**Fix:** Require `verifySchoolRequest()` for POST (GET can stay public), or at minimum stop deleting on upload — keep the timestamped history and let GET pick the newest. Sniff magic bytes instead of trusting `file.type`.

### [SEV: MEDIUM] Super-admin JWTs are signed with the super-admin password when `SUPER_ADMIN_JWT_SECRET` is unset
**Where:** `lib/verify-super-admin.ts:17-24`; minted at `app/api/montree/super-admin/auth/route.ts:113-118`; consumed by all 76 super-admin routes
**What:** `getSuperAdminTokenSecret()` returns `SUPER_ADMIN_JWT_SECRET || SUPER_ADMIN_PASSWORD || ADMIN_SECRET`. CLAUDE.md's Jul-5 open-items list still records "confirm `SUPER_ADMIN_JWT_SECRET` set in Railway" as unresolved. Authentication is a single static password with no second factor and no per-operator identity; the audit log records only `'super_admin'` and an IP.
**Why it matters:** If the fallback is in effect, an attacker who obtains *any* HS256-signed super-admin token can brute-force the signing key offline at unlimited speed — the online 5/15-min limiter does not apply — and then mint `{role:'super_admin'}` tokens granting cross-school access to every child record, every parent message and the finance surface. The password's entropy becomes the entire platform's security boundary.
**Fix:** Set a long random `SUPER_ADMIN_JWT_SECRET` and **remove the fallback chain** so the route fails loudly instead of silently degrading. Add TOTP to the login and record an operator identity in the token and audit rows.

### [SEV: MEDIUM] Eight routes are permanently broken by a wrong `checkRateLimit()` call signature
**Where:** `onboarding/route.ts:39`; `phonics/upload/route.ts:18`; `phonics/images/route.ts:21,75`; `phonics/words/route.ts:82,153,226`; `raz/summary/route.ts:18` (also `guru/snap-identify/route.ts:216`, out of scope)
**What:** `checkRateLimit(supabase, ip, endpoint, maxAttempts, windowMinutes)` is being called as `checkRateLimit(key, n, min)`. The first argument (a string, or a `NextRequest` in `onboarding`) has no `.from()`, so the call throws inside the helper's `try`, is caught, and returns the fail-open object `{allowed:true}`. Every caller then does `if (rateLimited) return 429` — the object is truthy — so the route **always** rate-limits. `onboarding` instead does `return rateLimitError`, returning a plain object where Next.js expects a `Response`, which throws a 500.
**Why it matters:** School onboarding, phonics word/image management, phonics photo upload and the RAZ summary are all dead in production, and nobody is actually being rate-limited anywhere in this cluster. It also demonstrates the failure mode: because the helper fails *open* by default, a signature mistake silently disables metering rather than erroring.
**Fix:** Correct the call sites to `await checkRateLimit(supabase, ip, '<endpoint>', n, min)` and destructure `{ allowed }`. Consider making the helper reject a non-client first argument explicitly rather than swallowing it.

### [SEV: MEDIUM] `/api/montree/social-guru` — the auth guard does not authenticate
**Where:** `app/api/montree/social-guru/route.ts:16-17`
**What:** `const authError = verifySuperAdminPassword(request); if (authError) return authError;` — `verifySuperAdminPassword` expects a *password string* and returns `{valid, error?}`. A `NextRequest` is passed, `Buffer.write()` throws, the catch returns `{valid:false}`, which is truthy, and the object (not a `Response`) is returned.
**Why it matters:** Today it fails closed by accident (500 on every call). But the guard is decorative: the moment anyone "fixes" the truthiness check without also fixing the argument, this becomes an unauthenticated endpoint that spends the Anthropic key on arbitrary attacker prompts with `maxDuration = 60`.
**Fix:** `const { valid } = await verifySuperAdminAuth(request.headers); if (!valid) return NextResponse.json({error:'Unauthorized'},{status:401});` — the pattern the other 76 super-admin routes use.

### [SEV: LOW] `/api/montree/perf/vitals` — unauthenticated, unbounded, attacker-attributed telemetry insert
**Where:** `app/api/montree/perf/vitals/route.ts:88-115`
**What:** No auth, no rate limit (the file's own comment says "add a per-IP rate limit later"), and the body may be an **array of any length**, every element inserted in one call. `school_id` is taken from the payload with only a UUID-shape check.
**Why it matters:** One request can insert an arbitrary number of rows into `montree_perf_vitals`, and any row can be attributed to any school id — cheap storage exhaustion plus permanent corruption of the performance baseline the super-admin panel reads.
**Fix:** Cap the array (e.g. 20 entries), add an IP rate limit, and ignore `schoolId` unless the request carries a valid session whose `schoolId` matches.

### [SEV: LOW] Database error strings returned to clients on super-admin and principal surfaces
**Where:** e.g. `super-admin/campaign/route.ts:68,151,209,230`; `super-admin/finance/period-locks/route.ts:85,150`; `super-admin/server-errors/route.ts:39,89,109`; `principal/messages-tredoux/threads/[threadId]/route.ts:98`; `reports/language-presentation/[childId]/route.ts:516`
**What:** `return NextResponse.json({ error: error.message }, { status: 500 })` surfaces raw PostgREST/Supabase messages (table names, column names, constraint names) to the caller.
**Why it matters:** Schema disclosure that accelerates a follow-up attack. All of these sit behind auth, so impact is limited to an authenticated principal or a compromised super-admin session.
**Fix:** Log the message server-side; return a generic string plus a correlation id.

### [SEV: LOW] `/api/montree/paper-scan/upload` has no explicit byte cap
**Where:** `app/api/montree/paper-scan/upload/route.ts:29-46,77-83`
**What:** Type is gated (`validateJpegPhoto`) and classroom ownership is correctly re-proved, but there is no `file.size` check — unlike `raz/upload` (10 MB), `phonics/upload` (5 MB) and `voice-observation/[sessionId]/upload` (5 MB/chunk, 200 MB/session).
**Why it matters:** Relies entirely on the platform body limit; a raised limit or a direct-to-runtime deployment silently removes the guard.
**Fix:** Add an explicit `MAX_FILE_SIZE` check mirroring the sibling upload routes.

---

## Recurring patterns

**1. "Existence ≠ ownership" is the only recurring class, and it is already almost solved.** Roughly 40 routes accept a `classroom_id`/`child_id`/`school_id` from the query string or body; all but four re-prove it against `auth.schoolId`. But every route hand-rolls the same six lines, so the four that forgot look identical to the ones that didn't.

**2. Fail-open helpers hide caller mistakes.** `checkRateLimit`'s default `failMode:'open'` plus a `try/catch` that swallows type errors turned eight wrong-signature calls into silent no-ops (and, via truthiness, into permanent 429s). Auth helpers that return `{valid}` objects (`verifySuperAdminPassword`) rather than `NextResponse | T` invite the `if (result) return result` mistake seen in `social-guru`.

**3. Public buckets + an unauthenticated proxy.** Child photos, uploads and library media all live in public buckets reachable through `/api/montree/media/proxy`, protected only by path obscurity. Any route that writes into those buckets is effectively publishing to the internet, so per-route MIME/size discipline is load-bearing — and `uploads` and `satpin-media` don't have it.

**Proposed shared helper** — collapse patterns 1 and 2 into one call that cannot be got wrong:

```ts
// lib/montree/verify-scope.ts
type Scope = { schoolId: string; classroomId: string | null; childId: string | null;
               userId: string; role: VerifiedRequest['role'] };

/**
 * One door for "authenticate, then resolve the ids this request is asking about".
 * Returns NextResponse (401/403/404) or a fully-verified Scope. Never returns a
 * bare object, so `if (x instanceof NextResponse) return x` is the only usage.
 */
export async function verifyScopedRequest(
  request: NextRequest,
  want: { classroomId?: string | null; childId?: string | null;
          reportId?: string | null; require?: 'classroom' | 'child' | 'report' },
): Promise<Scope | NextResponse>
```

It would: run `verifySchoolRequest`; default `classroomId` to `auth.classroomId`; resolve `montree_classrooms`/`montree_children`/`montree_weekly_reports` → owning `school_id` in one round trip; 403 on mismatch with an identical body for "not yours" and "not there". Migrating `/reports/[id]`, `/work-rhythm`, `/works/search` and `/works/guide` to it closes every finding in this class, and a lint rule banning `searchParams.get('classroom_id')` outside that helper keeps it closed.

A second, smaller helper — `requireSuperAdmin(request): Promise<NextResponse | SuperAdmin>` wrapping `verifySuperAdminAuth` and returning a `NextResponse` on failure — would make the `social-guru` mistake unrepresentable.
