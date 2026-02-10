# Phase 5 Plan v1 — Password Policy & Rate Limiting

## Audit Findings Summary (Severity-Ranked)

### CRITICAL
1. **Super-admin client-side password** — `app/montree/super-admin/page.tsx:112` checks `NEXT_PUBLIC_ADMIN_PASSWORD` in browser. Must move to server-side API call.
2. **`lib/story-auth.ts` module-level throw** — `JWT_SECRET = getJwtSecret()` evaluates at import time, violating Phase 4 pattern. Will crash Railway build if Story JWT secret is missing.
3. **Zero Montree audit logging** — Story has `story_login_logs`; Montree has nothing. `montree_super_admin_audit` table exists (migration 099) but no API endpoint writes to it.
4. **Hardcoded story fallback credentials** — `app/api/story/auth/route.ts` still has `USER_PASSWORDS = { 'T': 'redoux', 'Z': 'oe' }`. Phase 4 handoff claims removed but code still present.
5. **`/api/montree/auth/set-password` has no auth check** — Any caller with a teacher_id can change any teacher's password.

### HIGH
6. **0/16 auth endpoints have rate limiting** — All login, registration, and password endpoints are brute-forceable.
7. **Weak password policy** — 6-char minimum for teachers/parents/principals, 4-char minimum for super-admin reset. No complexity requirements.
8. **Super-admin audit endpoint missing** — Client-side code POSTs to `/api/montree/super-admin/audit` which doesn't exist (404s silently).

### MEDIUM
9. **5 `document.write` XSS vectors** in print components (Phase 6 scope).
10. **No input validation library** — 199 API routes use manual or no validation (Phase 6 scope).
11. **3,666 console.log statements** — Some log sensitive data fragments.
12. **No explicit CORS** — Safe by default but should be explicit.

---

## Phase 5 Scope (This Plan)

Phase 5 focuses on **password policy + rate limiting** per the roadmap. However, CRITICAL findings #1-5 from the audit should also be addressed since they're blocking/dangerous.

### Fix 1: Super-admin login → server-side auth
- Create `/api/montree/super-admin/auth/route.ts` that validates password server-side
- Update `app/montree/super-admin/page.tsx` to call this API instead of client-side comparison
- Remove `NEXT_PUBLIC_ADMIN_PASSWORD` usage

### Fix 2: Fix `lib/story-auth.ts` module-level throw
- Convert `export const JWT_SECRET = getJwtSecret()` to lazy getter pattern
- Match the pattern used in `lib/auth-multi.ts` and `lib/montree/super-admin-security.ts`

### Fix 3: Remove hardcoded story auth fallback
- Delete `USER_PASSWORDS` object from `app/api/story/auth/route.ts`
- Ensure bcrypt-only auth path works

### Fix 4: Add auth check to set-password endpoint
- Require JWT or super-admin password to call `/api/montree/auth/set-password`
- Validate caller owns the teacher_id or is super-admin

### Fix 5: Create super-admin audit endpoint
- Create `/api/montree/super-admin/audit/route.ts`
- Write to `montree_super_admin_audit` table
- Validate super-admin password in request

### Fix 6: Password policy enforcement
- Create `lib/password-policy.ts` with:
  - Minimum 8 characters
  - At least 1 uppercase, 1 lowercase, 1 number
  - Common password blacklist (top 1000)
- Apply to all registration and set-password endpoints:
  - `/api/montree/parent/signup`
  - `/api/montree/principal/register`
  - `/api/montree/teacher/register`
  - `/api/montree/auth/set-password`
  - `/api/montree/super-admin/reset-password`

### Fix 7: Rate limiting on auth endpoints
- Create `lib/rate-limiter.ts` using in-memory store (Map with TTL cleanup)
- 5 attempts per IP per 15 minutes on login endpoints
- 3 attempts per IP per 15 minutes on registration endpoints
- Apply to all 16 auth endpoints
- Return 429 Too Many Requests with retry-after header

### Fix 8: Failed login attempt logging
- Create `lib/montree/audit-logger.ts` utility
- Log to `montree_super_admin_audit` table: action, ip, user_agent, details, timestamp
- Add logging to all auth endpoints for both success and failure

---

## Implementation Order

1. Fix 2 (story-auth.ts) — 5 min, prevents build crash
2. Fix 3 (remove hardcoded passwords) — 5 min, security fix
3. Fix 4 (set-password auth check) — 10 min, prevents account takeover
4. Fix 1 (super-admin server-side auth) — 20 min, biggest change
5. Fix 5 (audit endpoint) — 15 min, enables logging
6. Fix 8 (audit logger utility) — 15 min, shared utility
7. Fix 6 (password policy) — 20 min, new utility + apply to 5 endpoints
8. Fix 7 (rate limiting) — 30 min, new utility + apply to 16 endpoints

**Estimated total: ~2 hours**

---

## Files to Create
- `lib/password-policy.ts`
- `lib/rate-limiter.ts`
- `lib/montree/audit-logger.ts`
- `app/api/montree/super-admin/auth/route.ts`

## Files to Modify
- `app/montree/super-admin/page.tsx` (remove client-side password check)
- `lib/story-auth.ts` (lazy getter)
- `app/api/story/auth/route.ts` (remove fallback credentials)
- `app/api/montree/auth/set-password/route.ts` (add auth check)
- `app/api/montree/super-admin/audit/route.ts` (create)
- All 16 auth endpoint files (add rate limiting + logging)
- All 5 registration/password endpoints (add password policy)
