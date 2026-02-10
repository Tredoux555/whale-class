# Phase 5 Plan v2 — Password Policy, Rate Limiting & Critical Auth Fixes

## Changes from v1
- **CORRECTED**: Fix 3 targets `app/api/story/admin/auth/route.ts` (admin route), not `app/api/story/auth/route.ts` (user route). User route WAS cleaned in Phase 4; admin route was NOT.
- **REPLACED**: In-memory rate limiter → database-backed (Railway ephemeral containers lose in-memory state on deploy)
- **ADDED**: New DB migration for `montree_rate_limit_logs` table
- **ADDED**: Testing & verification steps after each fix
- **ADDED**: Rollback strategy
- **CORRECTED**: 17 auth endpoints (not 16) — was missing `/api/montree/auth/teacher`
- **RESTRUCTURED**: 4-phase ordering (pre-flight → critical fixes → infrastructure → rate limiting)

---

## Verified Findings (Code-Confirmed)

| # | Finding | File | Line | Verified |
|---|---------|------|------|----------|
| 1 | Client-side password: `password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD` | `app/montree/super-admin/page.tsx` | 112 | ✅ |
| 2 | Module-level throw: `export const JWT_SECRET = getJwtSecret()` | `lib/story-auth.ts` | 12 | ✅ |
| 3 | Hardcoded creds: `ADMIN_USERS = { 'T': 'redoux', 'Z': 'oe' }` | `app/api/story/admin/auth/route.ts` | 6-9 | ✅ |
| 4 | No auth on set-password: any caller with teacher_id can reset | `app/api/montree/auth/set-password/route.ts` | 8-58 | ✅ |
| 5 | Audit endpoint 404s: page POSTs to non-existent API | `app/montree/super-admin/page.tsx` | 47 | ✅ |
| 6 | Audit table exists: `montree_super_admin_audit` | `migrations/099_super_admin_security.sql` | 7-29 | ✅ |
| 7 | 0/17 auth endpoints have rate limiting | all auth routes | — | ✅ |
| 8 | 6-char min password, no complexity | all registration routes | — | ✅ |

---

## Phase 5A — Pre-Flight Validation (5 min)

Before any code changes:
1. Verify `montree_super_admin_audit` table exists in Supabase (SELECT from it)
2. Check `lib/story-auth.ts` is actually imported somewhere (confirm blast radius)
3. Confirm the super-admin page is `'use client'` (it is — line 1)

---

## Phase 5B — Critical Auth Fixes (45 min)

### Fix 1: `lib/story-auth.ts` — Lazy getter pattern (5 min)

**Problem**: `export const JWT_SECRET = getJwtSecret()` on line 12 executes at import time → crashes build.

**Fix**: Convert to cached lazy getter, matching `lib/auth-multi.ts` pattern.

```typescript
// Before (line 12):
export const JWT_SECRET = getJwtSecret();

// After:
let _jwtSecret: Uint8Array | null = null;
export function getJWTSecretKey(): Uint8Array {
  if (!_jwtSecret) {
    const secret = process.env.STORY_JWT_SECRET;
    if (!secret) throw new Error('STORY_JWT_SECRET environment variable is not set');
    _jwtSecret = new TextEncoder().encode(secret);
  }
  return _jwtSecret;
}
```

**Also update**: `verifyToken()` and `createToken()` to call `getJWTSecretKey()` instead of using `JWT_SECRET`.

**Verify**: `npm run build` succeeds.

---

### Fix 2: Remove hardcoded story admin credentials (10 min)

**File**: `app/api/story/admin/auth/route.ts`

**Problem**: Lines 6-9 have `ADMIN_USERS = { 'T': 'redoux', 'Z': 'oe' }` with plaintext passwords. Lines 60-72 check this BEFORE the database, so hardcoded path always wins.

**Fix**:
1. Delete `ADMIN_USERS` constant
2. Delete the "CHECK 1: Hardcoded fallback" block (lines 60-72)
3. Make database bcrypt check the ONLY auth path
4. Keep login logging

**Verify**: Test that story admin login still works via bcrypt (need to confirm T and Z have password_hash in `story_admin_users` table).

---

### Fix 3: Add auth check to set-password endpoint (15 min)

**File**: `app/api/montree/auth/set-password/route.ts`

**Problem**: No authentication check. Any caller with a teacher_id can change any teacher's password.

**Fix**:
1. Require either:
   - A valid teacher JWT (from cookie or Authorization header) where the JWT's teacher_id matches the request's teacher_id, OR
   - The `x-super-admin-password` header matching `process.env.SUPER_ADMIN_PASSWORD`
2. If neither → return 401
3. Add audit logging for password changes

**Verify**: Test with no auth (should 401), with wrong teacher_id (should 403), with matching teacher JWT (should 200), with super-admin password (should 200).

---

### Fix 4: Super-admin login → server-side auth (20 min)

**Problem**: `app/montree/super-admin/page.tsx:112` compares password client-side against `NEXT_PUBLIC_ADMIN_PASSWORD`.

**Fix — Create new API route** `app/api/montree/super-admin/auth/route.ts`:
```typescript
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.SUPER_ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  if (password !== expected) {
    // Log failed attempt
    await logAudit(supabase, { action: 'login_failed', ... });
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  // Log success
  await logAudit(supabase, { action: 'login_success', ... });
  return NextResponse.json({ authenticated: true });
}
```

**Fix — Update page.tsx**:
```typescript
// Replace line 112's client-side check with:
const res = await fetch('/api/montree/super-admin/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password })
});
if (res.ok) {
  setAuthenticated(true);
  // ... rest of login flow
}
```

**Verify**: Login works, wrong password rejected, DevTools shows no exposed password.

---

### Fix 5: Create super-admin audit endpoint (10 min)

**File**: Create `app/api/montree/super-admin/audit/route.ts`

**Purpose**: The super-admin page (line 45-55) already POSTs audit events to this URL but it 404s.

**Implementation**:
- Accept POST with `{ action, details, timestamp }`
- Require `x-super-admin-password` header
- Write to `montree_super_admin_audit` table (already exists from migration 099)
- Include IP and user-agent from request headers

**Verify**: After login, check `montree_super_admin_audit` table has entries. No more 404s in console.

---

## Phase 5C — Security Infrastructure (35 min)

### Fix 6: Create audit logger utility (10 min)

**File**: Create `lib/montree/audit-logger.ts`

Shared utility for all Montree endpoints to log security events:
```typescript
interface AuditEntry {
  adminIdentifier: string;
  action: string;           // 'login_success', 'login_failed', 'password_change', etc.
  resourceType: string;     // 'system', 'teacher', 'parent', 'school'
  resourceId?: string;
  resourceDetails?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isSensitive?: boolean;
}

export async function logAudit(supabase: SupabaseClient, entry: AuditEntry): Promise<void> {
  // Insert into montree_super_admin_audit (fire-and-forget, never throw)
}
```

**Key design**: Never throw on logging failure (fire-and-forget). Auth should never fail because logging failed.

---

### Fix 7: Create password policy (15 min)

**File**: Create `lib/password-policy.ts`

```typescript
export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain a number');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('Too common');
  return { valid: errors.length === 0, errors };
}
```

**Apply to 5 endpoints** (replace `password.length < 6` checks):
1. `app/api/montree/parent/signup/route.ts`
2. `app/api/montree/principal/register/route.ts`
3. `app/api/montree/teacher/register/route.ts`
4. `app/api/montree/auth/set-password/route.ts`
5. `app/api/montree/super-admin/reset-password/route.ts`

**NOT applied to**: Code-based auth (6-char codes are by design, not user-chosen passwords).

**Verify**: Try setting password to "weak", "NoNumber!", "short1A" — all should be rejected. "StrongPass1" should succeed.

---

### Fix 8: Add failed login logging to all auth endpoints (10 min)

Using the audit logger from Fix 6, add logging to these endpoints on both success AND failure:
1. `app/api/montree/auth/teacher/route.ts`
2. `app/api/montree/parent/login/route.ts`
3. `app/api/montree/parent/auth/access-code/route.ts`
4. `app/api/montree/principal/login/route.ts`
5. `app/api/montree/super-admin/login-as/route.ts`
6. `app/api/home/auth/login/route.ts`
7. `app/api/home/auth/try/route.ts`

**Pattern** (add near the 401 return):
```typescript
await logAudit(supabase, {
  adminIdentifier: email || ip,
  action: 'login_failed',
  resourceType: 'teacher',
  ipAddress: ip,
  userAgent: userAgent
});
```

---

## Phase 5D — Database-Backed Rate Limiting (40 min)

### Fix 9: Create rate limit migration (5 min)

**File**: Create `migrations/122_rate_limit_logs.sql`

```sql
CREATE TABLE IF NOT EXISTS montree_rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,              -- IP address
  endpoint TEXT NOT NULL,         -- API route path
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_endpoint_time
  ON montree_rate_limit_logs(key, endpoint, created_at DESC);

-- Auto-cleanup: delete entries older than 24 hours (run periodically or via cron)
-- DELETE FROM montree_rate_limit_logs WHERE created_at < NOW() - INTERVAL '24 hours';
```

**Run migration** in Supabase dashboard or via psql.

---

### Fix 10: Create rate limiter utility (15 min)

**File**: Create `lib/rate-limiter.ts`

```typescript
export async function checkRateLimit(
  supabase: SupabaseClient,
  ip: string,
  endpoint: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Count recent attempts
  const { count } = await supabase
    .from('montree_rate_limit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('key', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart.toISOString());

  if ((count || 0) >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  // Log this attempt
  await supabase.from('montree_rate_limit_logs').insert({
    key: ip, endpoint, created_at: new Date().toISOString()
  });

  return { allowed: true };
}
```

**Design decisions**:
- Database-backed → survives Railway deploys
- Per-IP per-endpoint tracking
- Returns `retryAfterSeconds` for 429 response header
- Fire-and-forget insert (don't fail request if logging fails)

---

### Fix 11: Apply rate limiting to all 17 auth endpoints (20 min)

**Limits**:
- Login endpoints: 5 attempts per IP per 15 minutes
- Registration endpoints: 3 attempts per IP per 15 minutes
- Password change/reset: 3 attempts per IP per 15 minutes

**Login endpoints** (5/15min):
1. `app/api/auth/login/route.ts`
2. `app/api/home/auth/login/route.ts`
3. `app/api/montree/auth/teacher/route.ts`
4. `app/api/montree/parent/auth/access-code/route.ts`
5. `app/api/montree/parent/login/route.ts`
6. `app/api/montree/principal/login/route.ts`
7. `app/api/montree/super-admin/auth/route.ts` (new from Fix 4)
8. `app/api/montree/super-admin/login-as/route.ts`
9. `app/api/story/auth/route.ts`
10. `app/api/story/admin/auth/route.ts`

**Registration endpoints** (3/15min):
11. `app/api/home/auth/try/route.ts`
12. `app/api/montree/parent/signup/route.ts`
13. `app/api/montree/principal/register/route.ts`
14. `app/api/montree/teacher/register/route.ts`

**Password endpoints** (3/15min):
15. `app/api/montree/auth/set-password/route.ts`
16. `app/api/montree/super-admin/reset-password/route.ts`

**17th**: `app/api/montree/parent/auth/logout/route.ts` — no rate limiting needed (logout).

**Pattern** (add at top of each handler):
```typescript
const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
const { allowed, retryAfterSeconds } = await checkRateLimit(supabase, ip, '/api/montree/parent/login', 5, 15);
if (!allowed) {
  return NextResponse.json(
    { error: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}
```

---

## Post-Implementation Verification

After all fixes, verify:
1. `npm run build` — succeeds (no module-level throws)
2. Super-admin login works via server-side API (no NEXT_PUBLIC password)
3. Story admin login works via bcrypt only (no hardcoded fallback)
4. Set-password requires auth (returns 401 without it)
5. Audit endpoint returns 200 (no more 404s)
6. Password "weak" rejected, "StrongPass1" accepted
7. 6th login attempt returns 429 with Retry-After header
8. `montree_super_admin_audit` table has login entries
9. `montree_rate_limit_logs` table has attempt entries

---

## Rollback Strategy

**Per-fix rollback**: Each fix is independent. If Fix N breaks something, revert only that file. No fix depends on a subsequent fix.

**Full rollback**: `git revert` the Phase 5 commit. Build will succeed since we're only adding security (not removing functionality).

**Rate limiter emergency bypass**: If rate limiting blocks legitimate users, UPDATE the rate_limit_logs table to delete entries for that IP, or increase the limit constants temporarily.

---

## Files Created (4)
- `app/api/montree/super-admin/auth/route.ts`
- `lib/montree/audit-logger.ts`
- `lib/password-policy.ts`
- `lib/rate-limiter.ts`

## Files Modified (~22)
- `lib/story-auth.ts` (lazy getter)
- `app/api/story/admin/auth/route.ts` (remove hardcoded creds)
- `app/api/montree/auth/set-password/route.ts` (add auth + password policy)
- `app/montree/super-admin/page.tsx` (server-side auth call)
- `app/api/montree/super-admin/audit/route.ts` (create endpoint)
- 5 registration endpoints (password policy)
- 16 auth endpoints (rate limiting + audit logging)

## Migration (1)
- `migrations/122_rate_limit_logs.sql`

**Estimated total: ~2 hours**
