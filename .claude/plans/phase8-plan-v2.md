# Phase 8 Plan v2 — Logging & Monitoring

## Changes from v1
- **CORRECTED Fix 1a**: Removed `usedCode` variable (doesn't exist in scope). Method detection uses `loginMethod` variable set during code path.
- **CORRECTED Fix 1e**: Two success paths in login-as (dev mode at line 66, normal at line 90). Both need audit logging.
- **CORRECTED Fix 2a**: Logout route has no `request` parameter — must add `NextRequest` param + all imports.
- **CORRECTED Fix 2b**: Same issue as 2a — missing request param and imports.
- **CORRECTED Fix 3a**: Missing imports for logAudit. Fetch school name before cascade delete.
- **CORRECTED Fix 3c**: Only `getClientIP`/`getUserAgent` imported — `logAudit` missing from import.
- **CORRECTED Fix 4b-1**: Confirmed `fallbackPassword` is truly undefined (line 173 of leads/route.ts). Remove entire line.
- **All line numbers verified against actual source files.**

---

## Fix 1: Add success logging to 5 auth endpoints (~25 min)

All 5 endpoints already import `logAudit, getClientIP, getUserAgent` from `lib/montree/audit-logger`. Just need to add the logAudit call.

### 1a: Teacher login success
**File**: `app/api/montree/auth/teacher/route.ts`
**Imports**: ✅ Already imported (line 9)
**Insert**: Before line 209 (before `return NextResponse.json({`)

```typescript
// Phase 8: Log successful teacher login
logAudit(supabase, {
  adminIdentifier: teacher.email || teacher.name || 'unknown',
  action: 'login_success',
  resourceType: 'teacher',
  resourceId: teacher.id,
  resourceDetails: { endpoint: '/api/montree/auth/teacher', schoolId: teacher.school_id },
  ipAddress: ip,
  userAgent,
});
```

Note: `ip` and `userAgent` already declared at lines 14-15. `teacher` object available from DB query.

### 1b: Parent access code success
**File**: `app/api/montree/parent/auth/access-code/route.ts`
**Imports**: ✅ Already imported (check file header)
**Insert**: Before line 154 (before `return NextResponse.json({`)

```typescript
// Phase 8: Log successful parent access
logAudit(supabase, {
  adminIdentifier: `parent:${invite.id}`,
  action: 'login_success',
  resourceType: 'parent',
  resourceId: invite.id,
  resourceDetails: { endpoint: '/api/montree/parent/auth/access-code', childId: child?.id },
  ipAddress: getClientIP(request.headers),
  userAgent: getUserAgent(request.headers),
});
```

### 1c: Admin JWT login success
**File**: `app/api/auth/login/route.ts`
**Imports**: ✅ Already imported (line 6)
**Insert**: Before line 88 (before `return response;`)

```typescript
// Phase 8: Log successful admin login
logAudit(supabase, {
  adminIdentifier: username,
  action: 'login_success',
  resourceType: 'admin',
  resourceDetails: { endpoint: '/api/auth/login' },
  ipAddress: ip,
  userAgent,
});
```

Note: `ip` and `userAgent` already declared at lines 24-25.

### 1d: Home family login success
**File**: `app/api/home/auth/login/route.ts`
**Imports**: ✅ Already imported (line 9)
**Insert**: Before line 86 (before `return NextResponse.json({`)

```typescript
// Phase 8: Log successful home family login
logAudit(supabase, {
  adminIdentifier: `home_family:${family.id}`,
  action: 'login_success',
  resourceType: 'home_family',
  resourceId: family.id,
  resourceDetails: { endpoint: '/api/home/auth/login' },
  ipAddress: ip,
  userAgent,
});
```

Also add hash migration logging after line 83 (inside the `isLegacyHash` block):
```typescript
// Phase 8: Log legacy hash migration
logAudit(supabase, {
  adminIdentifier: `home_family:${family.id}`,
  action: 'password_hash_upgraded',
  resourceType: 'home_family',
  resourceId: family.id,
  resourceDetails: { from: 'sha256', to: 'bcrypt' },
  ipAddress: ip,
  userAgent,
});
```

### 1e: Super-admin login-as success (TWO paths)
**File**: `app/api/montree/super-admin/login-as/route.ts`
**Imports**: ✅ Already imported (line 6)

**Path 1 — Dev mode (no principal found):**
**Insert**: Before line 66 (before `return NextResponse.json({` for dev principal)

```typescript
// Phase 8: Log dev-mode impersonation
logAudit(supabase, {
  adminIdentifier: 'super_admin',
  action: 'login_as',
  resourceType: 'principal',
  resourceDetails: {
    endpoint: '/api/montree/super-admin/login-as',
    schoolId: school.id,
    schoolName: school.name,
    devMode: true,
    note: 'No principal found — dev principal session created',
  },
  ipAddress: ip,
  userAgent,
  isSensitive: true,
});
```

**Path 2 — Normal (principal found):**
**Insert**: Before line 90 (before `return NextResponse.json({` for normal case)

```typescript
// Phase 8: Log principal impersonation
logAudit(supabase, {
  adminIdentifier: 'super_admin',
  action: 'login_as',
  resourceType: 'principal',
  resourceId: principal.id,
  resourceDetails: {
    endpoint: '/api/montree/super-admin/login-as',
    schoolId: school.id,
    schoolName: school.name,
    principalName: principal.name,
    devMode: false,
  },
  ipAddress: ip,
  userAgent,
  isSensitive: true,
});
```

---

## Fix 2: Add logout logging to 2 endpoints (~10 min)

### 2a: Admin JWT logout
**File**: `app/api/auth/logout/route.ts`
**Current state**: 10 lines, no imports for logging, no `request` parameter.

**Rewrite entire file**:
```typescript
// /api/auth/logout/route.ts
// Phase 7: Admin logout — clears the admin-token HttpOnly cookie
// Phase 8: Added audit logging

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // Phase 8: Log logout event (fire-and-forget)
  logAudit(supabase, {
    adminIdentifier: 'admin',
    action: 'logout',
    resourceType: 'system',
    resourceDetails: { endpoint: '/api/auth/logout' },
    ipAddress: getClientIP(request.headers),
    userAgent: getUserAgent(request.headers),
  });

  const response = NextResponse.json({ success: true });
  response.cookies.delete({ name: 'admin-token', path: '/' });
  return response;
}
```

### 2b: Parent logout
**File**: `app/api/montree/parent/auth/logout/route.ts`
**Current state**: 26 lines, no imports for logging, no `request` parameter.

**Rewrite entire file**:
```typescript
// /api/montree/parent/auth/logout/route.ts
// POST: Clear parent session cookie
// Phase 8: Added audit logging

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Phase 8: Log logout event (fire-and-forget)
    logAudit(supabase, {
      adminIdentifier: 'parent',
      action: 'logout',
      resourceType: 'parent',
      resourceDetails: { endpoint: '/api/montree/parent/auth/logout' },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    const cookieStore = await cookies();
    cookieStore.delete('montree_parent_session');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed',
    }, { status: 500 });
  }
}
```

---

## Fix 3: Add logging for destructive operations (~20 min)

### 3a: School deletion
**File**: `app/api/montree/super-admin/schools/route.ts`
**Imports**: ❌ Missing — add `logAudit, getClientIP, getUserAgent` import
**Insert**: After line 112 (after `schoolId` validation), before line 115 (first cascade delete)

Add import at top:
```typescript
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
```

Add before cascade deletes (after line 112):
```typescript
// Phase 8: Log school deletion BEFORE cascade (captures intent even if delete fails)
logAudit(supabase, {
  adminIdentifier: 'super_admin',
  action: 'school_delete',
  resourceType: 'school',
  resourceId: schoolId,
  resourceDetails: { endpoint: '/api/montree/super-admin/schools' },
  ipAddress: getClientIP(request.headers),
  userAgent: getUserAgent(request.headers),
  isSensitive: true,
});
```

Also fix error leak on line 143: replace `{ error: schoolError.message }` with `{ error: 'Failed to delete school' }`.

### 3b: Child deletion
**File**: `app/api/montree/children/[childId]/route.ts`
**Imports**: ❌ Missing — add import
**Insert**: After child verification, before first cascade delete

Add import at top:
```typescript
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
```

Add before cascade delete:
```typescript
// Phase 8: Log child deletion BEFORE cascade
logAudit(supabase, {
  adminIdentifier: auth?.schoolId || 'unknown',
  action: 'child_delete',
  resourceType: 'child',
  resourceId: childId,
  resourceDetails: {
    endpoint: '/api/montree/children/[childId]',
    schoolId: auth?.schoolId,
  },
  ipAddress: getClientIP(request.headers),
  userAgent: getUserAgent(request.headers),
  isSensitive: true,
});
```

### 3c: Home family registration
**File**: `app/api/home/auth/try/route.ts`
**Imports**: ⚠️ Partial — `getClientIP, getUserAgent` imported (line 11) but `logAudit` is NOT. Add it.

Update line 11:
```typescript
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
```

**Insert**: Before line 109 (before `return NextResponse.json({`)

```typescript
// Phase 8: Log account creation
logAudit(supabase, {
  adminIdentifier: `home_family:${family.id}`,
  action: 'account_created',
  resourceType: 'home_family',
  resourceId: family.id,
  resourceDetails: { endpoint: '/api/home/auth/try' },
  ipAddress: ip,
  userAgent,
});
```

---

## Fix 4: Sanitize error responses (~30 min)

### 4a: Create error response utility
**Create**: `lib/api-error.ts`
```typescript
/**
 * Safe error logging — logs classification without sensitive fields.
 * Omits: details, hint, stack, query (these can leak schema info)
 */
export function safeErrorLog(context: string, error: unknown): void {
  const e = error as Record<string, unknown>;
  console.error(`[${context}]`, {
    message: e?.message || String(error),
    code: e?.code,
  });
}
```

### 4b: Fix critical error response leaks

**4b-1: leads/route.ts** — 3 fixes
1. **Line 173**: Remove undefined `fallbackPassword` reference. Delete the line:
   ```
   fallbackPassword: fallbackPassword ? 'set' : 'not set'
   ```
2. **Lines 196-200**: Replace verbose error logging with safeErrorLog:
   ```typescript
   safeErrorLog('Leads.GET', error);
   ```
3. **Lines 201-204**: Remove `details: error.message` from response:
   ```typescript
   return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
   ```

**4b-2: children/route.ts** — 1 fix
- Replace `JSON.stringify(error, null, 2)` with `safeErrorLog()` pattern

**4b-3: super-admin/schools/route.ts** — 1 fix
- Line 143: Replace `{ error: schoolError.message }` with `{ error: 'Failed to delete school' }`

**4b-4: home/auth/try/route.ts** — 1 fix
- Line 80: `console.error('Failed to create home family:', famErr?.message, famErr?.code, famErr?.details, famErr?.hint)` — remove `famErr?.details` and `famErr?.hint` from logging

---

## Fix 5: Log CSRF blocks (~5 min)

### 5a: CSRF block logging
**File**: `middleware.ts`
**Insert**: Before line 94 (before `return new NextResponse(` for CSRF block)

```typescript
console.warn('[CSRF] Blocked cross-origin request:', {
  method: req.method,
  path: pathname,
  originHostname,
  requestHost,
});
```

---

## Fix 6: Extend audit logger for new action types (~5 min)

**File**: `lib/montree/audit-logger.ts`
**Line 38**: Replace `requires_review` logic:

```typescript
// Before:
requires_review: entry.action === 'login_failed' || entry.action === 'password_change',

// After:
requires_review: ['login_failed', 'password_change', 'school_delete', 'child_delete', 'login_as', 'account_created'].includes(entry.action),
```

---

## Implementation Order

1. Fix 6 — Extend audit logger (foundation)
2. Fix 4a — Create `lib/api-error.ts`
3. Fix 1a–1e — Auth success logging (5 endpoints)
4. Fix 2a–2b — Logout logging (2 endpoints)
5. Fix 3a–3c — Destructive operation logging (3 endpoints)
6. Fix 4b — Sanitize error responses (4 files)
7. Fix 5a — CSRF block logging

**Estimated total: ~1.5 hours**

## Files Created (1)
- `lib/api-error.ts`

## Files Modified (~15)
- `lib/montree/audit-logger.ts` (Fix 6)
- `app/api/montree/auth/teacher/route.ts` (Fix 1a)
- `app/api/montree/parent/auth/access-code/route.ts` (Fix 1b)
- `app/api/auth/login/route.ts` (Fix 1c)
- `app/api/home/auth/login/route.ts` (Fix 1d)
- `app/api/montree/super-admin/login-as/route.ts` (Fix 1e)
- `app/api/auth/logout/route.ts` (Fix 2a — rewrite)
- `app/api/montree/parent/auth/logout/route.ts` (Fix 2b — rewrite)
- `app/api/montree/super-admin/schools/route.ts` (Fix 3a + 4b-3)
- `app/api/montree/children/[childId]/route.ts` (Fix 3b)
- `app/api/home/auth/try/route.ts` (Fix 3c + 4b-4)
- `app/api/montree/leads/route.ts` (Fix 4b-1)
- `app/api/montree/children/route.ts` (Fix 4b-2)
- `middleware.ts` (Fix 5a)

## Pattern Reminders
- **Never validate `process.env.*` at top level** — always inside a function
- **Rate limiter is DB-backed** — fail open with try/catch
- **Fire-and-forget audit logging** — never throw or block auth flow
- All `logAudit()` calls are intentionally NOT awaited (fire-and-forget)

## Security Debt Carried from Phase 7
1. x-school-id → Bearer migration (7 frontend pages)
2. Teacher/Principal token → HttpOnly cookie
3. Home auth session management (deferred until 500 error fixed)
4. Token refresh mechanism
5. Story admin cookie fallback expansion (9 routes)
6. Missing length validation on `/api/montree/messages` and `/api/montree/curriculum/generate-description`

## Deferred to Phase 9 / Future
- Structured logging framework (winston/pino) — too large a change
- Log aggregation service — infrastructure decision
- APM / Sentry integration
- Admin dashboard for audit log queries
- Automatic log retention policy
- Consolidate Story system logging to central audit table
- Health check endpoint
- Bulk import logging (`/api/montree/children/bulk`)
- Parent invite code create/reset/revoke logging
