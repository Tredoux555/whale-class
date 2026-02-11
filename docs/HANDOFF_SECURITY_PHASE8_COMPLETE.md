# Security Phase 8 Complete — Logging & Monitoring

## Date: 2026-02-11

## Summary
Phase 8 closes the audit trail gaps identified in the comprehensive codebase audit. The existing `logAudit()` infrastructure was solid (fire-and-forget, DB-backed, never blocks auth) but only partially deployed — failed logins were logged everywhere, successful logins almost nowhere, and destructive operations had zero audit trails.

6 fixes across ~15 files:
1. Success logging on 5 auth endpoints (teacher, parent, admin, home, super-admin login-as)
2. Logout logging on 2 endpoints (admin, parent)
3. Destructive operation logging on 3 endpoints (school delete, child delete, home registration)
4. Error response sanitization (removed `error.message`/`error.details` leaks, fixed undefined `fallbackPassword` bug)
5. CSRF block logging in middleware
6. Extended audit logger `requires_review` for new action types

## Files Created (2)
- `lib/api-error.ts` — Safe error logging utility (strips sensitive fields)
- `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md` — This file

## Files Modified (14)

### Audit Logger
- `lib/montree/audit-logger.ts` — Extended `requires_review` to flag: `school_delete`, `child_delete`, `login_as`, `account_created`

### Auth Success Logging (Fix 1)
- `app/api/montree/auth/teacher/route.ts` — Added `login_success` audit log before success response
- `app/api/montree/parent/auth/access-code/route.ts` — Added `login_success` audit log before success response
- `app/api/auth/login/route.ts` — Added `login_success` audit log before returning JWT cookie
- `app/api/home/auth/login/route.ts` — Added `login_success` + `password_hash_upgraded` (for legacy SHA256→bcrypt migration) audit logs
- `app/api/montree/super-admin/login-as/route.ts` — Added `login_as` audit log on BOTH success paths (dev mode + normal impersonation)

### Logout Logging (Fix 2)
- `app/api/auth/logout/route.ts` — Rewrote: added `NextRequest` param, `logAudit` import, `logout` audit log
- `app/api/montree/parent/auth/logout/route.ts` — Rewrote: added `NextRequest` param, `logAudit` import, `logout` audit log

### Destructive Operation Logging (Fix 3)
- `app/api/montree/super-admin/schools/route.ts` — Added `logAudit` import + `school_delete` audit log before cascade delete; sanitized `schoolError.message` leak
- `app/api/montree/children/[childId]/route.ts` — Added `logAudit` import + `child_delete` audit log before cascade delete
- `app/api/home/auth/try/route.ts` — Added `logAudit` to import (was missing), `account_created` audit log after family creation

### Error Response Sanitization (Fix 4)
- `app/api/montree/leads/route.ts` — Removed undefined `fallbackPassword` reference (line 173, would throw ReferenceError at runtime); removed `receivedPassword` partial leak; removed `details: error.message` from 500 response
- `app/api/montree/children/route.ts` — Replaced `JSON.stringify(error, null, 2)` with safe `{ message, code }` log; removed `details: error.message` from 500 response

### CSRF Logging (Fix 5)
- `middleware.ts` — Added `console.warn('[CSRF]')` logging on both cross-origin block and invalid origin paths

## Audit Actions Now Logged

| Action | Where | Was Logged Before? |
|--------|-------|--------------------|
| `login_success` (teacher) | teacher/route.ts | ❌ No → ✅ Yes |
| `login_success` (parent) | access-code/route.ts | ❌ No → ✅ Yes |
| `login_success` (admin) | auth/login/route.ts | ❌ No → ✅ Yes |
| `login_success` (home) | home/auth/login/route.ts | ❌ No → ✅ Yes |
| `login_as` (super-admin, both paths) | login-as/route.ts | ❌ No → ✅ Yes |
| `logout` (admin) | auth/logout/route.ts | ❌ No → ✅ Yes |
| `logout` (parent) | parent/auth/logout/route.ts | ❌ No → ✅ Yes |
| `school_delete` | super-admin/schools/route.ts | ❌ No → ✅ Yes |
| `child_delete` | children/[childId]/route.ts | ❌ No → ✅ Yes |
| `account_created` (home) | home/auth/try/route.ts | ❌ No → ✅ Yes |
| `password_hash_upgraded` | home/auth/login/route.ts | ❌ No → ✅ Yes |
| CSRF block attempt | middleware.ts | ❌ No → ✅ Yes |

## Bugs Fixed

1. **`fallbackPassword` ReferenceError** — `app/api/montree/leads/route.ts` line 173 referenced an undefined variable. Would throw at runtime on any failed super-admin auth attempt. Removed.
2. **Partial password logged** — Same file logged `superAdminPassword.substring(0, 2) + '***'` which leaks the first 2 chars. Changed to just `'provided'`/`'none'`.

## Pattern Reminders (Carried Forward)
- **Never validate `process.env.*` at top level** — always inside a function
- **Rate limiter is DB-backed** — fail open with try/catch
- **Fire-and-forget audit logging** — never throw or block auth flow
- All `logAudit()` calls are NOT awaited (intentional fire-and-forget)

## Security Debt Carried from Phase 7
1. x-school-id → Bearer migration (7 frontend pages)
2. Teacher/Principal token → HttpOnly cookie
3. Home auth session management (deferred until 500 error fixed)
4. Token refresh mechanism
5. Story admin cookie fallback expansion (9 routes)
6. Missing length validation on `/api/montree/messages` and `/api/montree/curriculum/generate-description`

## Post-Implementation Audit Fixes
One issue found and fixed in audit:

1. **children/route.ts catch block** — Generic catch at line 177 returned `details: String(error)` to client, leaking stack traces. Fixed to return only `{ error: 'Internal server error' }`.

### Audit Findings Dismissed (By Design)
- `home/auth/try/route.ts` lines 86-90: Dev-only `debug` object still includes `famErr.details` and `famErr.hint` — acceptable since it's gated behind `NODE_ENV === 'development'` and never reaches production.

## Testing Notes
- TypeScript check passes (no new errors; all errors are pre-existing)
- Build uses `ignoreBuildErrors: true` in next.config.ts
- All audit logs fire-and-forget — won't affect endpoint response times
- Test teacher login → check `montree_super_admin_audit` for `login_success` entry
- Test school deletion → check audit table for `school_delete` with `requires_review: true`
- Test CSRF → cross-origin POST should produce `[CSRF]` console.warn + 403

## Remaining Phases
- Phase 9: Production security review (final)
