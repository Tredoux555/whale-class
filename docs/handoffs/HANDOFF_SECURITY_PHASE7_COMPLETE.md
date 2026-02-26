# Security Phase 7 Complete — Session Management Improvements

## Date: 2026-02-11

## Summary
Phase 7 addresses session management vulnerabilities across the application by:
1. Timing-safe super-admin password comparison (prevents timing attacks)
2. Moving Story admin JWT to HttpOnly cookie (prevents XSS token theft)
3. Adding admin logout endpoint (server-side cookie clearing)
4. CSRF protection via Origin header validation in middleware
5. Documenting x-school-id security debt (blocked from removal)

## Files Created (1)
- `app/api/auth/logout/route.ts` — Admin logout, clears admin-token HttpOnly cookie

## Files Modified (6)
- `app/api/montree/super-admin/auth/route.ts` — Timing-safe password comparison using `crypto.timingSafeEqual()`
- `app/api/story/admin/auth/route.ts` — POST sets HttpOnly `story-admin-token` cookie; GET accepts cookie fallback; DELETE clears cookie
- `app/api/story/current/route.ts` — `verifyToken()` accepts cookie fallback
- `app/api/story/recent-messages/route.ts` — `verifyToken()` accepts cookie fallback
- `lib/montree/verify-request.ts` — Security debt documentation on x-school-id fallback
- `middleware.ts` — Origin header CSRF validation for POST/PUT/PATCH/DELETE requests

## Plan Files
- `.claude/plans/phase7-plan-v1.md` — Initial plan (7 fixes)
- `.claude/plans/phase7-plan-v2.md` — After audit: blocked x-school-id removal, corrected CSRF approach
- `.claude/plans/phase7-plan-v3.md` — Final approved plan (5 fixes, 3 rounds of plan→audit→refine)

## Fix Details

### Fix 1: Timing-safe super-admin password comparison
- Replaced `password !== expectedPassword` with `crypto.timingSafeEqual()`
- Buffers padded to 64 bytes to prevent length-based timing leaks
- Wrapped in try/catch (returns false on any error)

### Fix 2: Story admin JWT → HttpOnly cookie
- **POST** (login): Sets `story-admin-token` HttpOnly cookie alongside JSON response (dual mode for backward compat)
- **GET** (verify): Accepts token from Authorization header OR cookie fallback
- **DELETE** (logout): Clears `story-admin-token` cookie
- Cookie config: httpOnly=true, secure in production, sameSite=lax, maxAge=24h, path=/
- Two other Story routes (`/api/story/current`, `/api/story/recent-messages`) also accept cookie fallback

### Fix 3: Admin logout endpoint
- `POST /api/auth/logout` — Clears `admin-token` cookie (path=/)
- Matches the cookie set by `/api/auth/login`

### Fix 4: CSRF Origin header validation
- Inserted in middleware BEFORE the API route early-return
- Blocks POST/PUT/PATCH/DELETE with mismatched Origin hostname
- Uses `hostname` (not `host`) to avoid port mismatch issues
- No Origin header = same-origin or non-browser client — allowed through
- Combined with SameSite=lax cookies = solid CSRF protection

### Fix 5: x-school-id security debt documentation
- Updated comments in `lib/montree/verify-request.ts` (both functions)
- Documents WHY the fallback can't be removed yet (7 frontend pages, token in React state)
- Lists specific files that need migration
- Added TODO for future fix

## What Was Blocked/Deferred

### x-school-id header removal (BLOCKED)
9 locations in 7 frontend files still send x-school-id header. The JWT token is stored in React state (not localStorage), lost on page refresh. These pages have NO auth without x-school-id:
- `app/montree/admin/page.tsx`, `settings/page.tsx`, `students/page.tsx`, `activity/page.tsx`, `import/page.tsx`
- `app/montree/dashboard/students/page.tsx`, `[childId]/layout.tsx`
Requires frontend refactor to persist JWT.

### SameSite=strict upgrade (DROPPED)
Would break email link navigation — teachers/schools share links via email, SameSite=strict prevents cookies on first click from external sources. SameSite=lax is correct for this use case.

### Teacher/Principal token → HttpOnly cookie (DEFERRED)
Requires rewriting all Montree frontend API calls from Bearer headers to `credentials: 'include'`. CSP from Phase 6 mitigates XSS risk.

### Console.log cleanup (DROPPED)
Audit found no sensitive data in console.log calls. No action needed.

## Testing Notes
- TypeScript check passes (no new errors; all errors are pre-existing)
- Build uses `ignoreBuildErrors: true` in next.config.ts
- Test CSRF by making cross-origin POST requests (should get 403)
- Test Story admin login flow — should set both JSON response and cookie
- Test Story admin logout — should clear cookie

## Post-Implementation Audit Fixes
Three issues found and fixed in audit:

1. **IPv6 hostname comparison** — CSRF Origin check used `.split(':')[0]` which breaks on IPv6 brackets `[::1]`. Fixed to use `new URL()` parser for both sides, which normalizes IPv6 correctly.
2. **Unicode password buffer** — `padEnd(64)` pads to 64 characters not bytes; unicode chars are multi-byte in UTF-8 causing Buffer length mismatch in `timingSafeEqual()`. Fixed to use `Buffer.alloc(256, 0)` + `.write(password, 'utf8')` for consistent byte-length buffers.
3. **Cookie delete path** — Story admin logout `cookies.delete('story-admin-token')` was missing explicit `path: '/'` to match the set call. Fixed for consistency.

### Audit Findings Dismissed (By Design)
- Bearer token priority over cookie: Intentional — frontend sends Bearer, cookie is new fallback
- Incomplete logout across systems: `/api/auth/logout` = main admin, Story admin DELETE = separate
- Username in GET response: Frontend needs it for display
- Missing Origin = allowed: Same-origin + non-browser clients, SameSite=lax provides coverage
- 9 Story admin routes missing cookie: Intentional scope — frontend still uses Bearer tokens
- `/api/montree/messages` + `/api/montree/curriculum/generate-description` length validation: Already tracked from Phase 6 audit

## Security Debt Tracked for Phase 8+
1. **x-school-id → Bearer migration** (7 frontend pages, requires storing JWT in localStorage or cookie)
2. **Teacher/Principal token → HttpOnly cookie** (requires frontend Bearer→cookie migration)
3. **Home auth session management** (deferred until Home 500 error fixed)
4. **Token refresh mechanism** (7-day expiry + rate limiting acceptable for now)
5. **Story admin cookie fallback expansion** (9 more routes in `/api/story/admin/*` use Bearer-only via `lib/story-db.ts`)
6. **Missing length validation** on `/api/montree/messages` (messageText, subject) and `/api/montree/curriculum/generate-description` (work_name)

## Remaining Phases
- Phase 8: Logging & monitoring
- Phase 9: Production security review (final)
