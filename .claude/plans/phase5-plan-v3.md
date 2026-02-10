# Phase 5 Plan v3 (FINAL) — Password Policy, Rate Limiting & Critical Auth Fixes

## Changes from v2
- **ADDED**: Prerequisite step to insert bcrypt hash for story admin user Z before removing fallback
- **CONFIRMED**: Audit endpoint does NOT exist (needs creation — v2 audit was wrong)
- **REFINED**: Set-password auth fix — requires teacher session token from localStorage (teacher login returns a token that's stored in localStorage session)
- **ADDED**: Error handling for rate limiter (never fail auth if logging fails)
- **ADDED**: Code comment clarifying audit table purpose
- **CORRECTED**: Migration number verified as 122

---

## Phase 5A — Pre-Flight (5 min)

1. Verify `montree_super_admin_audit` table exists (it does — migration 099)
2. Query `story_admin_users` for user Z to confirm missing hash
3. Verify `npm run build` passes before any changes (baseline)

---

## Phase 5B — Critical Auth Fixes (50 min)

### Fix 1: `lib/story-auth.ts` — Lazy getter (5 min)

**What**: Line 12 `export const JWT_SECRET = getJwtSecret()` crashes at build time.

**Change**: Replace with cached lazy getter:
- Remove line 12
- Create `getJWTSecretKey()` function with null cache
- Update `verifyToken()` line 17 to use `getJWTSecretKey()`
- Update `createToken()` line 30 to use `getJWTSecretKey()`
- Export function, not constant

**Verify**: `npm run build` succeeds.

---

### Fix 2: Insert Z's bcrypt hash + Remove hardcoded story admin creds (10 min)

**What**: `app/api/story/admin/auth/route.ts` lines 6-9 have `ADMIN_USERS = { 'T': 'redoux', 'Z': 'oe' }`.

**Pre-requisite**: Generate bcrypt hash for Z's password "oe" and INSERT into `story_admin_users` table:
```sql
INSERT INTO story_admin_users (username, password_hash) VALUES
  ('Z', '<bcrypt hash of oe>')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
```

**Then change**:
- Delete `ADMIN_USERS` constant (lines 6-9)
- Delete "CHECK 1" hardcoded fallback block (lines 60-72)
- Keep database bcrypt check as only auth path
- Keep login logging

**Verify**: Story admin login works for both T and Z via bcrypt.

---

### Fix 3: Set-password auth check (15 min)

**What**: `app/api/montree/auth/set-password/route.ts` has no auth — any caller with teacher_id can reset passwords.

**Context**: Frontend calls this with NO auth headers. Teacher session lives in localStorage with a token from login. The teacher_id comes from `session.teacher.id`.

**Fix approach**:
- Accept the teacher's JWT token in `Authorization: Bearer <token>` header
- Verify JWT and confirm the teacher_id in the JWT matches the request's teacher_id
- Also accept `x-super-admin-password` header as alternative (for admin resets)
- If neither → 401

**Frontend update**: Update `app/montree/set-password/page.tsx` to send the token from localStorage in the Authorization header.

**Verify**: Without auth → 401. With valid teacher token → 200. With super-admin password → 200.

---

### Fix 4: Super-admin login → server-side (20 min)

**What**: `app/montree/super-admin/page.tsx` line 112 checks password client-side.

**Create** `app/api/montree/super-admin/auth/route.ts`:
- POST: Accept `{ password }`, compare against `process.env.SUPER_ADMIN_PASSWORD`
- On success: log to audit table, return `{ authenticated: true }`
- On failure: log failed attempt, return 401
- Extract IP from x-forwarded-for, user-agent from headers

**Update** `app/montree/super-admin/page.tsx`:
- Replace line 112's direct comparison with `fetch('/api/montree/super-admin/auth', ...)`
- Remove reference to `NEXT_PUBLIC_ADMIN_PASSWORD`
- Keep the password in component state (still needed for x-super-admin-password headers on subsequent API calls)

**Verify**: Login works, wrong password rejected, no password in browser bundle.

---

### Fix 5: Create super-admin audit endpoint (10 min)

**What**: Page POSTs to `/api/montree/super-admin/audit` which doesn't exist.

**Create** `app/api/montree/super-admin/audit/route.ts`:
- POST: Accept `{ action, details, timestamp }`
- Require `x-super-admin-password` header
- Insert into `montree_super_admin_audit` table
- Include IP and user-agent from request

**Verify**: No more 404s in console. Audit entries appear in DB.

---

## Phase 5C — Security Infrastructure (35 min)

### Fix 6: Audit logger utility (10 min)

**Create** `lib/montree/audit-logger.ts`:
```typescript
// NOTE: Despite table name "montree_super_admin_audit", this logs ALL security events
// including teacher password changes and failed logins. Consider renaming in future.

interface AuditEntry {
  adminIdentifier: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceDetails?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isSensitive?: boolean;
}

export async function logAudit(supabase, entry: AuditEntry): Promise<void> {
  try {
    await supabase.from('montree_super_admin_audit').insert({
      admin_identifier: entry.adminIdentifier,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      resource_details: entry.resourceDetails || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      is_sensitive: entry.isSensitive || false
    });
  } catch (e) {
    // Fire-and-forget: never fail auth because logging failed
    console.error('[Audit] Logging failed:', e);
  }
}
```

---

### Fix 7: Password policy (15 min)

**Create** `lib/password-policy.ts`:
- Min 8 chars, 1 uppercase, 1 lowercase, 1 digit
- Top 100 common passwords blacklist
- `validatePassword(password)` → `{ valid, errors[] }`
- NOT applied to 6-char codes (teacher login codes, home join codes)

**Apply to 5 endpoints** (replace `password.length < 6` checks):
1. `app/api/montree/parent/signup/route.ts`
2. `app/api/montree/principal/register/route.ts`
3. `app/api/montree/teacher/register/route.ts`
4. `app/api/montree/auth/set-password/route.ts`
5. `app/api/montree/super-admin/reset-password/route.ts`

---

### Fix 8: Failed login logging (10 min)

Add `logAudit()` calls to all auth endpoints on both success AND failure:
1. `app/api/montree/auth/teacher/route.ts`
2. `app/api/montree/parent/login/route.ts`
3. `app/api/montree/parent/auth/access-code/route.ts`
4. `app/api/montree/principal/login/route.ts`
5. `app/api/montree/super-admin/login-as/route.ts`
6. `app/api/home/auth/login/route.ts`
7. `app/api/home/auth/try/route.ts`

---

## Phase 5D — Database-Backed Rate Limiting (40 min)

### Fix 9: Rate limit migration (5 min)

**Create** `migrations/122_rate_limit_logs.sql`:
```sql
CREATE TABLE IF NOT EXISTS montree_rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_endpoint_time
  ON montree_rate_limit_logs(key, endpoint, created_at DESC);
```

Run migration in Supabase.

---

### Fix 10: Rate limiter utility (15 min)

**Create** `lib/rate-limiter.ts`:
- Database-backed (survives Railway deploys)
- `checkRateLimit(supabase, ip, endpoint, maxAttempts, windowMinutes)`
- Returns `{ allowed, retryAfterSeconds }`
- INSERT failure never blocks the auth request (try/catch with console.error)

---

### Fix 11: Apply rate limiting (20 min)

**Login endpoints** (5 attempts / 15 min): 10 endpoints
**Registration endpoints** (3 attempts / 15 min): 4 endpoints
**Password endpoints** (3 attempts / 15 min): 2 endpoints

Pattern at top of each handler:
```typescript
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
const { allowed, retryAfterSeconds } = await checkRateLimit(supabase, ip, '/api/...', 5, 15);
if (!allowed) {
  return NextResponse.json(
    { error: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}
```

---

## Files Created (5)
1. `app/api/montree/super-admin/auth/route.ts`
2. `app/api/montree/super-admin/audit/route.ts`
3. `lib/montree/audit-logger.ts`
4. `lib/password-policy.ts`
5. `lib/rate-limiter.ts`

## Files Modified (~22)
- `lib/story-auth.ts`
- `app/api/story/admin/auth/route.ts`
- `app/api/montree/auth/set-password/route.ts`
- `app/montree/super-admin/page.tsx`
- `app/montree/set-password/page.tsx`
- 5 registration endpoints (password policy)
- ~12 auth endpoints (rate limiting + audit logging)

## Migration (1)
- `migrations/122_rate_limit_logs.sql`

## DB Change (1)
- INSERT bcrypt hash for user Z into `story_admin_users`

**Estimated total: ~2 hours 10 min**
