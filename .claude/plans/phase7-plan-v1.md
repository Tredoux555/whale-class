# Phase 7 Plan v1 — Session Management Improvements

## Audit Findings (Severity-Ranked)

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | No CSRF protection on any POST endpoint | CRITICAL | Fix 5 |
| 2 | Story admin JWT returned as JSON (client stores in localStorage) | HIGH | Fix 1 |
| 3 | Teacher/Principal tokens in localStorage (XSS-stealable) | HIGH | Deferred* |
| 4 | No logout endpoints for teacher, principal, multi-auth admin | HIGH | Fix 2 |
| 5 | Deprecated x-school-id header fallback bypasses auth | HIGH | Fix 3 |
| 6 | Super-admin plain text password comparison (timing attack) | MEDIUM | Fix 4 |
| 7 | SameSite=lax on admin cookies (should be strict) | MEDIUM | Fix 6 |
| 8 | Home family auth has no session token at all | MEDIUM | Deferred** |
| 9 | No token refresh mechanism anywhere | LOW | Deferred*** |
| 10 | Long token expiration (30d parents, 7d others) | LOW | Not addressed |

*Teacher/Principal localStorage → cookie migration requires rewriting all Montree frontend API calls to use `credentials: 'include'` instead of Bearer headers. Too risky for Phase 7 scope — CSP from Phase 6 mitigates the XSS risk.

**Home auth is "partially deployed" with an existing 500 error. Refactoring its session system now would compound issues.

***Token refresh adds significant complexity. The 7-day expiry + rate limiting is acceptable for now.

---

## Fix 1: Move Story admin JWT to HttpOnly cookie (15 min)

**File**: `app/api/story/admin/auth/route.ts`

Currently: POST returns `{ session: token }` as JSON.
Change: Set token as HttpOnly cookie AND return as JSON (dual mode for backward compat).

```typescript
// In POST handler, after creating token:
const response = NextResponse.json({ session: token });
response.cookies.set('story-admin-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24, // 24h matches JWT expiry
  path: '/',
});
return response;
```

Also update the DELETE (logout) handler to clear the cookie:
```typescript
response.cookies.delete('story-admin-token');
```

Also update `lib/story-auth.ts` `verifyToken()` to check cookie as fallback when no Authorization header provided.

---

## Fix 2: Add logout endpoints (20 min)

**2a: Teacher logout** — Create `app/api/montree/auth/teacher/logout/route.ts`
- Clear any session state
- Return success
- (Token is in localStorage — can't server-side revoke JWT, but endpoint signals intent)

**2b: Principal logout** — Create `app/api/montree/principal/logout/route.ts`
- Same pattern

**2c: Multi-auth admin logout** — Create `app/api/auth/logout/route.ts`
- Clear `admin-token` cookie
- Return success

---

## Fix 3: Remove deprecated x-school-id header fallback (5 min)

**File**: `lib/montree/verify-request.ts` (lines 58-70)

Delete the entire block that accepts `x-school-id` header as a fallback. This returns `userId: 'legacy'` and `role: 'teacher'` which bypasses proper auth.

The TODO comment says "Remove this fallback after all clients are updated to send Bearer tokens." Since Phase 1 added JWT to all routes, clients should already be sending Bearer tokens.

---

## Fix 4: Timing-safe super-admin password comparison (10 min)

**File**: `app/api/montree/super-admin/auth/route.ts` (line 50)

Currently: `password !== expectedPassword` (string comparison — vulnerable to timing attacks)

Change to use `crypto.timingSafeEqual()`:
```typescript
import { timingSafeEqual } from 'crypto';

// Pad to same length to avoid length-based timing leaks
const a = Buffer.from(password.padEnd(256, '\0'));
const b = Buffer.from(expectedPassword.padEnd(256, '\0'));
if (!timingSafeEqual(a, b)) {
  // invalid
}
```

---

## Fix 5: Origin header validation (CSRF protection) (20 min)

**File**: `middleware.ts`

Add Origin/Referer header check for all non-GET/HEAD/OPTIONS requests:

```typescript
// After static file bypass, before auth checks
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json(
        { error: 'Cross-origin request blocked' },
        { status: 403 }
      );
    }
  }
  // If no Origin header (same-origin requests don't always send it),
  // check Referer as fallback
}
```

This is lightweight CSRF protection that:
- Doesn't require tokens (no frontend changes)
- Blocks cross-origin form submissions
- Works with SameSite cookies
- Doesn't break same-origin API calls

---

## Fix 6: SameSite=strict on all auth cookies (10 min)

Upgrade from `sameSite: 'lax'` to `sameSite: 'strict'` on:

1. `app/api/auth/login/route.ts` — admin-token cookie
2. `app/api/montree/parent/auth/access-code/route.ts` — parent session cookie
3. `app/api/montree/parent/login/route.ts` — parent session cookie
4. New Story admin cookie from Fix 1

`strict` prevents cookies being sent on any cross-site navigation (even top-level links). This is fine for admin/auth cookies — users always navigate directly to the site.

---

## Fix 7: Clean up console.log in auth routes (10 min)

Remove or downgrade console.log calls that might leak sensitive data in auth routes. Focus on:
- Any `console.log` that logs tokens, passwords, or session data
- The deprecated x-school-id warning (removed in Fix 3)
- Any password-related logging in scripts/

---

## Implementation Order

1. Fix 3 — Remove deprecated header fallback (smallest, most impactful per-line)
2. Fix 4 — Timing-safe password comparison
3. Fix 6 — SameSite strict upgrade
4. Fix 1 — Story admin cookie
5. Fix 2 — Logout endpoints
6. Fix 5 — Origin header validation (CSRF)
7. Fix 7 — Console.log cleanup

**Estimated total: ~1.5 hours**

## Files Created (~3)
- `app/api/montree/auth/teacher/logout/route.ts`
- `app/api/montree/principal/logout/route.ts`
- `app/api/auth/logout/route.ts`

## Files Modified (~8)
- `lib/montree/verify-request.ts` (remove deprecated fallback)
- `app/api/montree/super-admin/auth/route.ts` (timing-safe compare)
- `app/api/auth/login/route.ts` (SameSite strict)
- `app/api/montree/parent/auth/access-code/route.ts` (SameSite strict)
- `app/api/montree/parent/login/route.ts` (SameSite strict)
- `app/api/story/admin/auth/route.ts` (HttpOnly cookie + SameSite)
- `lib/story-auth.ts` (cookie fallback in verifyToken)
- `middleware.ts` (Origin header check)
