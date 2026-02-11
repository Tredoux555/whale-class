# Phase 8 Plan v1 — Logging & Monitoring

## Audit Summary

Comprehensive audit of the codebase revealed **3 categories of issues** across **~25 files**:

### Existing Infrastructure (What's Working)
- `logAudit()` in `lib/montree/audit-logger.ts` — fire-and-forget, never blocks auth
- `montree_super_admin_audit` table — central audit log with IP, user-agent, action types
- DB-backed rate limiting in `lib/rate-limiter.ts` (survives Railway restarts)
- Failed login attempts logged consistently across most endpoints
- `set-password` endpoint has excellent audit coverage

### What's Missing (Ranked by Severity)

**CRITICAL — No audit trail for destructive/admin operations:**
1. School deletion (cascading delete of all data) — ZERO logging
2. Child deletion (6-table cascade) — ZERO logging
3. Super-admin login-as success (impersonation) — only failure logged
4. Home family registration — no account creation trail

**HIGH — Successful auth not tracked:**
5. Teacher login success — not logged (failures ARE logged)
6. Parent access code success — not logged
7. Admin JWT login success — not logged
8. Home family login success — not logged
9. Logout events (admin, parent, story) — not logged

**HIGH — Sensitive data leaking into logs:**
10. Database error objects returned in API responses (20+ instances of `error.message`, `error.details`, `error.hint`)
11. Full error objects logged via `console.error` (exposes schema info)
12. `leads/route.ts` references undefined `fallbackPassword` variable
13. `children/route.ts` JSON-stringifies full Supabase error objects

**MEDIUM — Logging gaps:**
14. Legacy SHA256→bcrypt password migrations happen silently
15. Story system uses separate logging tables (not consolidated)
16. Child bulk import (up to 30 students) — untracked
17. Parent invite code create/reset/revoke — untracked
18. No structured logging (514 console.* statements, no correlation IDs)
19. CSRF block attempts in middleware — no logging

**LOW — Infrastructure improvements:**
20. No log retention policy (audit tables grow forever)
21. No health check endpoint
22. No admin dashboard for querying audit logs

---

## Phase 8 Scope (Practical for this session)

Following the pattern from Phases 3-7: focus on the fixes that improve security posture most with least risk. Infrastructure-level changes (structured logging framework, log aggregation, APM) are out of scope for this phase.

**In scope:** Adding `logAudit()` calls + sanitizing error responses
**Out of scope:** Logging framework migration, dashboards, APM, Sentry integration

---

## Fix 1: Add success logging to 5 auth endpoints (~25 min)

These endpoints log failures but NOT successes. Add `logAudit()` after successful authentication.

### 1a: Teacher login success
**File**: `app/api/montree/auth/teacher/route.ts`
After JWT token generation (around line 201-221), add:
```typescript
logAudit(supabase, {
  adminIdentifier: teacher.email || teacher.name || 'unknown',
  action: 'login_success',
  resourceType: 'teacher',
  resourceId: teacher.id,
  resourceDetails: { method: usedCode ? 'code' : 'password', endpoint: '/api/montree/auth/teacher' },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
});
```

### 1b: Parent access code success
**File**: `app/api/montree/parent/auth/access-code/route.ts`
After token generation/cookie set, add:
```typescript
logAudit(supabase, {
  adminIdentifier: `parent:${invite.id}`,
  action: 'login_success',
  resourceType: 'parent',
  resourceId: invite.id,
  resourceDetails: { endpoint: '/api/montree/parent/auth/access-code', childId: child?.id },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
});
```

### 1c: Admin JWT login success
**File**: `app/api/auth/login/route.ts`
After JWT token creation, add:
```typescript
logAudit(supabase, {
  adminIdentifier: username,
  action: 'login_success',
  resourceType: 'system',
  resourceDetails: { endpoint: '/api/auth/login', role: username === 'Tredoux' ? 'super_admin' : 'teacher_admin' },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
});
```

### 1d: Home family login success
**File**: `app/api/home/auth/login/route.ts`
After successful family lookup, add:
```typescript
logAudit(supabase, {
  adminIdentifier: `home_family:${family.id}`,
  action: 'login_success',
  resourceType: 'home_family',
  resourceId: family.id,
  resourceDetails: { endpoint: '/api/home/auth/login' },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
});
```

### 1e: Super-admin login-as success
**File**: `app/api/montree/super-admin/login-as/route.ts`
After successful principal lookup, add:
```typescript
logAudit(supabase, {
  adminIdentifier: 'super_admin',
  action: 'login_as',
  resourceType: 'principal',
  resourceId: principal.id,
  resourceDetails: {
    endpoint: '/api/montree/super-admin/login-as',
    schoolId: principal.school_id,
    principalName: principal.name,
    devMode: !!devPrincipal,
  },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
  isSensitive: true,
});
```

---

## Fix 2: Add logout logging to 2 endpoints (~10 min)

### 2a: Admin JWT logout
**File**: `app/api/auth/logout/route.ts`
Add audit logging before cookie clear:
```typescript
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: Request) {
  const supabase = getSupabase();
  const headers = request.headers;

  logAudit(supabase, {
    adminIdentifier: 'admin', // Can't determine which admin without decoding the cookie
    action: 'logout',
    resourceType: 'system',
    resourceDetails: { endpoint: '/api/auth/logout' },
    ipAddress: getClientIP(headers),
    userAgent: getUserAgent(headers),
  });

  const response = NextResponse.json({ success: true });
  response.cookies.delete({ name: 'admin-token', path: '/' });
  return response;
}
```

### 2b: Parent logout
**File**: `app/api/montree/parent/auth/logout/route.ts`
Add audit logging before cookie clear (same pattern).

---

## Fix 3: Add logging for destructive operations (~20 min)

### 3a: School deletion
**File**: `app/api/montree/super-admin/schools/route.ts` (DELETE handler)
Add before the actual delete:
```typescript
logAudit(supabase, {
  adminIdentifier: 'super_admin',
  action: 'school_delete',
  resourceType: 'school',
  resourceId: schoolId,
  resourceDetails: { schoolName: school?.name, endpoint: '/api/montree/super-admin/schools' },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
  isSensitive: true,
});
```

### 3b: Child deletion
**File**: `app/api/montree/children/[childId]/route.ts` (DELETE handler)
Add before cascade delete:
```typescript
logAudit(supabase, {
  adminIdentifier: userId || 'unknown',
  action: 'child_delete',
  resourceType: 'child',
  resourceId: childId,
  resourceDetails: { childName: child?.name, schoolId: child?.school_id },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
  isSensitive: true,
});
```

### 3c: Home family registration
**File**: `app/api/home/auth/try/route.ts`
Add after successful family creation:
```typescript
logAudit(supabase, {
  adminIdentifier: `home_family:${family.id}`,
  action: 'account_created',
  resourceType: 'home_family',
  resourceId: family.id,
  resourceDetails: { endpoint: '/api/home/auth/try', hasEmail: !!email },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
});
```

---

## Fix 4: Sanitize error responses (~30 min)

Stop returning database internals to API clients. Create a shared error response helper.

### 4a: Create error response utility
**Create**: `lib/api-error.ts`
```typescript
/**
 * Sanitized error response for API routes.
 * Never exposes database schema, error details, or stack traces.
 */
export function sanitizedError(message: string, status: number = 500) {
  // Log full error server-side (already done in catch blocks)
  return Response.json(
    { error: message },
    { status }
  );
}

/**
 * Safe error message for logging — strips sensitive fields.
 */
export function safeErrorLog(context: string, error: unknown): void {
  const e = error as Record<string, unknown>;
  console.error(`[${context}]`, {
    message: e?.message || String(error),
    code: e?.code,
    // Deliberately omit: details, hint, stack, query
  });
}
```

### 4b: Fix worst offenders (8-10 files)
Replace patterns like:
```typescript
// BEFORE (leaks schema info):
return Response.json({ error: error.message, details: error.details }, { status: 500 });

// AFTER:
safeErrorLog('RouteName', error);
return sanitizedError('Operation failed');
```

Priority files:
- `app/api/montree/leads/route.ts` — 3 issues (undefined var, partial password, error leaks)
- `app/api/montree/children/route.ts` — JSON.stringify of full error object
- `app/api/montree/children/[childId]/route.ts` — error.message returned
- `app/api/home/curriculum/route.ts` — error details returned
- `app/api/home/children/route.ts` — error details returned
- `app/api/montree/curriculum/route.ts` — insertData object logged
- `middleware.ts` — full error objects in console.error

---

## Fix 5: Log CSRF blocks and legacy hash migrations (~10 min)

### 5a: CSRF block logging
**File**: `middleware.ts`
When Origin check fails, log the attempt:
```typescript
console.warn('[CSRF] Blocked cross-origin request:', {
  method: req.method,
  path: pathname,
  origin: origin,
  host: requestHost,
});
```

### 5b: Legacy hash migration logging
**Files**: `app/api/montree/auth/teacher/route.ts`, `app/api/home/auth/login/route.ts`
After silent SHA256→bcrypt upgrade, add:
```typescript
logAudit(supabase, {
  adminIdentifier: user.id,
  action: 'password_hash_upgraded',
  resourceType: 'teacher', // or 'home_family'
  resourceId: user.id,
  resourceDetails: { from: 'sha256', to: 'bcrypt' },
  ipAddress: getClientIP(headers),
  userAgent: getUserAgent(headers),
});
```

---

## Fix 6: Extend audit logger for new action types (~5 min)

**File**: `lib/montree/audit-logger.ts`
Update `requires_review` logic to flag new sensitive actions:
```typescript
requires_review: ['login_failed', 'password_change', 'school_delete', 'child_delete', 'login_as'].includes(entry.action),
```

---

## Implementation Order

1. Fix 6 — Extend audit logger (foundation for everything else)
2. Fix 4a — Create `lib/api-error.ts` utility
3. Fix 1 — Auth success logging (5 endpoints)
4. Fix 2 — Logout logging (2 endpoints)
5. Fix 3 — Destructive operation logging (3 endpoints)
6. Fix 4b — Sanitize error responses (8-10 files)
7. Fix 5 — CSRF + hash migration logging

**Estimated total: ~2 hours**

## Files Created (1)
- `lib/api-error.ts`

## Files Modified (~15-18)
- `lib/montree/audit-logger.ts`
- `app/api/montree/auth/teacher/route.ts`
- `app/api/montree/parent/auth/access-code/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/home/auth/login/route.ts`
- `app/api/home/auth/try/route.ts`
- `app/api/montree/super-admin/login-as/route.ts`
- `app/api/montree/super-admin/schools/route.ts`
- `app/api/montree/children/[childId]/route.ts`
- `app/api/montree/parent/auth/logout/route.ts`
- `app/api/montree/leads/route.ts`
- `app/api/montree/children/route.ts`
- `app/api/home/curriculum/route.ts`
- `app/api/home/children/route.ts`
- `app/api/montree/curriculum/route.ts`
- `middleware.ts`

## Pattern Reminders (from CLAUDE.md)
- **Never validate `process.env.*` at the top level of a module** — always inside a function
- **Rate limiter is DB-backed** (survives Railway restarts); always fail open with try/catch
- **Fire-and-forget audit logging** — security logging should never throw or block auth flow

## Deferred to Phase 9 / Future
- Structured logging framework (winston/pino) — too large a change for this phase
- Log aggregation service (Loki, Cloud Logging) — infrastructure decision
- APM / Sentry integration — requires Railway config
- Admin dashboard for audit log queries — feature work
- Automatic log retention policy — needs discussion on retention period
- Consolidate Story system logging to central audit table
- Health check endpoint
