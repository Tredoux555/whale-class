# Phase 7 Plan v2 — Session Management Improvements

## Changes from v1
- **BLOCKED Fix 3** (remove x-school-id): Frontend stores token in React state only, NOT in localStorage. Token lost on refresh → x-school-id is the only auth these pages have. Removing it breaks 7 pages. DESCOPED — needs separate frontend refactor.
- **CORRECTED Fix 5** (CSRF): Middleware DOES run on /api routes but returns early at line 83. Move Origin check BEFORE the API early-return.
- **DROPPED Fix 6** (SameSite strict): School app relies on email link navigation. SameSite=strict breaks first-click experience when teachers click links from email/Slack.
- **SCOPED Fix 2**: Only admin-token + story admin cookie clears are meaningful server-side. Teacher/principal logout is client-only.

---

## Fix 1: Timing-safe super-admin password comparison (10 min)

**File**: `app/api/montree/super-admin/auth/route.ts` (line 50)

Currently: `password !== expectedPassword` — string comparison leaks timing info.

```typescript
import { timingSafeEqual } from 'crypto';

// Replace line 50:
const a = Buffer.from(password.padEnd(64, '\0'));
const b = Buffer.from(expectedPassword.padEnd(64, '\0'));
if (!timingSafeEqual(a, b)) {
  // failed — log and return 401
}
```

Not edge runtime (no `export const runtime`), so `crypto` and `Buffer` are available.

---

## Fix 2: Story admin JWT → HttpOnly cookie (20 min)

**File**: `app/api/story/admin/auth/route.ts`

### 2a: POST handler — set cookie alongside JSON response (dual mode)
After creating the token (line ~95), set an HttpOnly cookie:
```typescript
const response = NextResponse.json({ session: token });
response.cookies.set('story-admin-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24, // 24h matches JWT expiry
  path: '/',
});
return response;
```

### 2b: DELETE handler — clear cookie on logout
```typescript
response.cookies.delete('story-admin-token');
```

### 2c: Token extraction — update verifyToken caller
**File**: `lib/story-auth.ts`

Create a new `extractStoryToken()` function:
```typescript
export function extractStoryToken(request: NextRequest): string | null {
  // Priority 1: Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Priority 2: HttpOnly cookie
  const cookieToken = request.cookies.get('story-admin-token')?.value;
  return cookieToken || null;
}
```

Update Story API routes that call verifyToken to use `extractStoryToken()` first.

---

## Fix 3: Admin logout endpoint (10 min)

**Create**: `app/api/auth/logout/route.ts`
```typescript
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin-token');
  return response;
}
```

This clears the `admin-token` HttpOnly cookie set by `app/api/auth/login/route.ts`.

No teacher/principal logout endpoints — their tokens are in React state/localStorage, not server-clearable. Logout is handled client-side by the frontend clearing localStorage.

---

## Fix 4: Origin header CSRF validation (15 min)

**File**: `middleware.ts`

Insert Origin check BEFORE the API route early-return (before line 83):

```typescript
// Phase 7: CSRF protection — Origin header validation for all state-changing requests
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: 'Cross-origin request blocked' },
          { status: 403 }
        );
      }
    } catch {
      // Malformed origin header — block it
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }
  }
  // No origin header = same-origin or non-browser request — allow
}

// CRITICAL: API routes - NEVER redirect, let them handle their own auth
if (pathname.startsWith('/api/')) {
  return NextResponse.next();
}
```

Why this works:
- Browsers ALWAYS send Origin header on cross-origin requests
- Same-origin requests may or may not include Origin (we allow these)
- Non-browser requests (curl, Postman) don't send Origin — allowed (authenticated by JWT/cookie)
- Malformed Origin headers are blocked

Combined with SameSite=lax cookies, this provides strong CSRF protection.

---

## Fix 5: Deprecation warning on x-school-id (5 min)

**File**: `lib/montree/verify-request.ts` (lines 58-70)

We CANNOT remove this fallback — 7 frontend pages depend on it. But we should:
1. Keep the console.warn
2. Add `// SECURITY DEBT: Remove after frontend migrates to Bearer tokens (needs 7 pages updated)`
3. Track in CLAUDE.md as open security debt

---

## Fix 6: Console.log cleanup in auth routes (10 min)

Audit all auth routes for sensitive data logging:
- Remove any `console.log` that prints tokens, passwords, or session data
- Keep `console.error` for operational errors (but ensure they don't log secrets)
- Check: `app/api/story/admin/auth/route.ts`, `app/api/montree/super-admin/auth/route.ts`, `app/api/auth/login/route.ts`

---

## Implementation Order

1. Fix 1 — Timing-safe comparison (smallest, standalone)
2. Fix 2 — Story admin cookie (standalone, dual mode)
3. Fix 3 — Admin logout endpoint (depends on cookie knowledge)
4. Fix 4 — CSRF Origin check (middleware change)
5. Fix 5 — x-school-id deprecation comment
6. Fix 6 — Console.log cleanup

**Estimated total: ~1 hour**

## Files Created (1)
- `app/api/auth/logout/route.ts`

## Files Modified (~5)
- `app/api/montree/super-admin/auth/route.ts` (timing-safe)
- `app/api/story/admin/auth/route.ts` (HttpOnly cookie)
- `lib/story-auth.ts` (extractStoryToken function)
- `middleware.ts` (Origin check)
- `lib/montree/verify-request.ts` (deprecation comment)

## Deferred to Phase 8+
- **x-school-id → Bearer migration**: 7 frontend pages need refactoring to store and send JWT token instead of x-school-id. Tracked as security debt.
- **Teacher/Principal token → HttpOnly cookie**: Requires frontend API call migration from Bearer headers to cookie-based auth.
- **Token refresh mechanism**: Adds complexity; 7-day expiry + rate limiting is acceptable.
- **Home auth session management**: Partially deployed with existing 500 error. Defer until Home is stable.
