# Phase 7 Plan v3 — Session Management Improvements

## Changes from v2
- **CORRECTED Fix 2c**: Story routes use LOCAL verifyToken functions, not the lib version. Updated to patch each route's token extraction individually (3 routes).
- **CORRECTED Fix 4**: Use `hostname` (not `host`) for comparison to avoid port mismatch. SameSite=lax (already on cookies) + Origin check = solid CSRF protection for POST/PUT/DELETE.
- **DROPPED Fix 6**: Audit found no sensitive data in console.log calls. No action needed.
- All line numbers re-verified.

---

## Fix 1: Timing-safe super-admin password comparison (10 min)

**File**: `app/api/montree/super-admin/auth/route.ts`

Add import at top:
```typescript
import { timingSafeEqual } from 'crypto';
```

Replace line 50 (`password !== expectedPassword`):
```typescript
const passwordMatch = (() => {
  try {
    const a = Buffer.from(password.padEnd(64, '\0'));
    const b = Buffer.from(expectedPassword.padEnd(64, '\0'));
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
})();
if (!passwordMatch) {
```

Route uses Node.js runtime (no `export const runtime`), so `crypto` and `Buffer` are available.

---

## Fix 2: Story admin JWT → HttpOnly cookie (25 min)

### 2a: POST handler — set cookie alongside JSON (dual mode)

**File**: `app/api/story/admin/auth/route.ts`

At line ~95, replace `return NextResponse.json({ session: token })` with:
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

Same file, in the DELETE handler (~line 151), add before return:
```typescript
response.cookies.delete('story-admin-token');
```

### 2c: Update Story API routes to accept cookie fallback

These routes define LOCAL `verifyToken()` functions that extract from Authorization header. Add cookie fallback to each:

**Route 1**: `app/api/story/current/route.ts` — local verifyToken at ~line 22
**Route 2**: `app/api/story/recent-messages/route.ts` — local verifyToken at ~line 15

Pattern for each: after extracting from Authorization header, add cookie fallback:
```typescript
// Existing: extract from Authorization header
const authHeader = request.headers.get('authorization');
if (authHeader?.startsWith('Bearer ')) {
  token = authHeader.split(' ')[1];
}
// NEW: Cookie fallback if no Authorization header
if (!token) {
  token = request.cookies.get('story-admin-token')?.value || null;
}
```

**Route 3**: `app/api/story/admin/auth/route.ts` GET handler (~line 112) — uses inline jwtVerify. Same cookie fallback pattern.

---

## Fix 3: Admin logout endpoint (10 min)

**Create**: `app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete({ name: 'admin-token', path: '/' });
  return response;
}
```

Path matches the login route's cookie path (`/`).

---

## Fix 4: Origin header CSRF validation (15 min)

**File**: `middleware.ts`

Insert BEFORE line 83 (before `if (pathname.startsWith('/api/'))`):

```typescript
// Phase 7: CSRF protection — block cross-origin state-changing requests
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  const origin = req.headers.get('origin');
  if (origin) {
    const requestHost = req.headers.get('host')?.split(':')[0] || '';
    try {
      const originHostname = new URL(origin).hostname;
      if (originHostname !== requestHost) {
        return new NextResponse(
          JSON.stringify({ error: 'Cross-origin request blocked' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  // No Origin header = same-origin or non-browser client (curl, Postman) — allowed
}
```

Why this is sufficient:
- Browsers ALWAYS send Origin on cross-origin POST/PUT/DELETE
- SameSite=lax (already on all auth cookies) blocks cookie sending on cross-site form POST
- Combined: attacker can't submit forms (SameSite blocks cookies) OR fetch (Origin check blocks)
- Non-browser clients don't send Origin and must authenticate via token anyway
- `hostname` comparison avoids port mismatch (works with Railway, localhost:3000, etc.)
- Uses `new NextResponse` not `NextResponse.json` since middleware may not have full API

---

## Fix 5: x-school-id security debt documentation (5 min)

**File**: `lib/montree/verify-request.ts` (lines 58-70)

Update the existing comment:
```typescript
// SECURITY DEBT (Phase 7): This fallback accepts x-school-id header without JWT verification.
// It returns userId: 'legacy' and role: 'teacher' — effectively bypassing auth.
// CANNOT remove until these 7 frontend pages migrate to Bearer token auth:
//   - app/montree/admin/page.tsx, settings/page.tsx, students/page.tsx, activity/page.tsx, import/page.tsx
//   - app/montree/dashboard/students/page.tsx, [childId]/layout.tsx
// The token is stored in React state (not localStorage) and lost on page refresh,
// which is why these pages fall back to x-school-id.
```

---

## Implementation Order

1. Fix 1 — Timing-safe comparison
2. Fix 2 — Story admin cookie (2a, 2b, 2c)
3. Fix 3 — Admin logout endpoint
4. Fix 4 — CSRF Origin check in middleware
5. Fix 5 — Security debt documentation

**Estimated total: ~1 hour**

## Files Created (1)
- `app/api/auth/logout/route.ts`

## Files Modified (~6)
- `app/api/montree/super-admin/auth/route.ts` (timing-safe)
- `app/api/story/admin/auth/route.ts` (HttpOnly cookie + cookie clear)
- `app/api/story/current/route.ts` (cookie fallback)
- `app/api/story/recent-messages/route.ts` (cookie fallback)
- `middleware.ts` (Origin check)
- `lib/montree/verify-request.ts` (security debt comment)

## Security Debt Tracked for Phase 8+
1. **x-school-id → Bearer migration** (7 frontend pages, requires storing JWT in localStorage)
2. **Teacher/Principal token → HttpOnly cookie** (requires frontend Bearer→cookie migration)
3. **Home auth session management** (deferred until Home 500 error fixed)
4. **Token refresh mechanism** (7-day expiry + rate limiting acceptable for now)
