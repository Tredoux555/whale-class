# Phase 3 Plan v2 — Quick Security Wins (Revised)

Addresses all 20 audit findings from v1 review.

---

## Prerequisites: Verify DB schema

Before any code changes, check what columns `story_login_logs` actually has. Two possibilities:
- **Column is `login_time`** (original migration ran, fix migration didn't) → code is fine as-is
- **Column is `login_at`** (fix migration ran) → code uses wrong name

**Action:** Run a Supabase query or check the live schema. Then standardise ALL code to match whatever the DB actually has.

Also verify whether `last_seen_at` column exists on `story_login_logs`. If not, we need to add it.

**Migration to prepare (if needed):**
```sql
-- Add last_seen_at if it doesn't exist
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
-- Add session_token if it doesn't exist
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS session_token VARCHAR(50);
```

This migration is idempotent — safe to run even if columns already exist.

---

## Fix 1: Store session_token on user login

**File:** `app/api/story/auth/route.ts`

Change `logLogin()` signature from `(username, ip, userAgent)` to `(username, ip, userAgent, token)`.

Add `session_token: token.substring(0, 50)` to the insert object (line 14-18).

Update both call sites (line 59 and line 85) to pass the generated `token`.

**Note:** Admin auth (`app/api/story/admin/auth/route.ts`) already does this correctly via `logAdminLogin()` — no changes needed there.

**Why this is Fix 1 now:** The heartbeat endpoint (Fix 2) needs session_token to find the right login log row. This must come first.

---

## Fix 2: Create heartbeat endpoint

**File to create:** `app/api/story/heartbeat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getSessionToken } from '@/lib/story-db';

export async function POST(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = getSessionToken(req.headers.get('authorization'));
    if (!sessionToken) {
      return NextResponse.json({ ok: true }); // No session token, nothing to update
    }

    const supabase = getSupabase();

    // Update last_seen_at on the most recent login log for this session
    await supabase
      .from('story_login_logs')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .is('logout_at', null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail heartbeats
  }
}
```

**Edge cases handled:**
- No session_token → silently succeed (old sessions before Fix 1)
- Logout already happened → `.is('logout_at', null)` prevents update, no race condition issue
- DB error → silently succeed (heartbeats should never break the UX)

---

## Fix 3: Resolve column name mismatch

**Decision depends on prerequisite check.** Two paths:

**Path A — DB has `login_time`:** Only fix `lib/story-db.ts` line 74: change `.order('login_at'` to `.order('login_time'`.

**Path B — DB has `login_at`:** Update ALL code files to use `login_at`:
- `app/api/story/auth/route.ts` line 16: `login_time` → `login_at`
- `app/api/story/admin/auth/route.ts` line 30: `login_time` → `login_at`
- `app/api/story/admin/online-users/route.ts` lines 19-22: `login_time` → `login_at`
- `app/api/story/admin/login-logs/route.ts` lines 17-18: `login_time` → `login_at`

**Path B is more likely** since multiple migrations attempt the rename. Either way, the fix is mechanical — search and replace the wrong name.

---

## Fix 4: Fix online-users to use heartbeat data

**File:** `app/api/story/admin/online-users/route.ts`

Replace the query logic. Instead of `gt('login_time', twoMinutesAgo)`, use:

```typescript
// Users are "online" if they have a heartbeat within the last 2 minutes
// OR they logged in within the last 2 minutes (covers first load before heartbeat)
const { data: rows, error } = await supabase
  .from('story_login_logs')
  .select('username, login_time, last_seen_at')
  .is('logout_at', null)
  .or(`last_seen_at.gt.${twoMinutesAgo},login_time.gt.${twoMinutesAgo}`)
  .order('last_seen_at', { ascending: false, nullsFirst: false });
```

**Backward compatibility:** The `or()` clause means users who logged in before heartbeats existed (no `last_seen_at`) will still show as online for 2 minutes after login. This covers the migration window.

**Note:** Column names in this query must match the DB (see Fix 3).

---

## Fix 5: Fix system-controls auth

**File:** `app/api/story/admin/system-controls/route.ts`

Replace the entire `verifyAdmin()` function:

```typescript
import { verifyAdminToken } from '@/lib/story-db';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const admin = await verifyAdminToken(request.headers.get('Authorization'));
  return admin !== null;
}
```

`verifyAdminToken()` from `lib/story-db.ts` accepts the raw auth header string, extracts the Bearer token, and verifies JWT + role='admin'. This is the same check used by online-users, login-logs, and message-history.

Also update the import at the top of the file — currently imports only `getSupabase` from `@/lib/supabase-client`. Change to import `verifyAdminToken` from `@/lib/story-db` and keep `getSupabase` from either.

---

## Fix 6: Centralise hardcoded `870602` password

**Scope decision:** Only Montree super-admin routes. The Whale Class admin login (`app/api/auth/login/route.ts`) is a separate system and will NOT be touched in this phase.

**Pattern:** Replace `=== '870602'` with `=== process.env.SUPER_ADMIN_PASSWORD`.

**For files with fallback pattern** (leads, feedback, dm): These already check the env var first and use `'870602'` as fallback. The fix is to REMOVE the fallback line entirely. The env var `SUPER_ADMIN_PASSWORD=870602` is already set in `.env.local` and in the Railway deployment environment.

**Complete file list and changes:**

| File | Change |
|------|--------|
| `api/montree/super-admin/reset-password/route.ts` L13 | `!== '870602'` → `!== process.env.SUPER_ADMIN_PASSWORD` |
| `api/montree/super-admin/schools/route.ts` L65, L106 | `!== '870602'` → `!== process.env.SUPER_ADMIN_PASSWORD` |
| `api/montree/super-admin/home/route.ts` L6 | `const ADMIN_PASSWORD = '870602'` → `const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD` |
| `api/montree/super-admin/impact-fund/route.ts` L4 | Same as above |
| `api/montree/super-admin/npo-outreach/route.ts` L4 | Same as above |
| `api/montree/super-admin/npo-applications/route.ts` L13, L53 | `!== '870602'` → `!== process.env.SUPER_ADMIN_PASSWORD` |
| `api/montree/super-admin/reduced-rate-applications/route.ts` L13, L61 | Same pattern |
| `api/montree/leads/route.ts` L152, L220, L273 | Remove `fallbackPassword` lines, keep only env var check |
| `api/montree/feedback/route.ts` L94, L163 | Remove `fallbackPassword` lines, keep only env var check |
| `api/montree/dm/route.ts` L11 | Remove `|| '870602'` fallback from env var |
| `app/montree/super-admin/page.tsx` L112 | Remove `|| password === '870602'` from the condition |

**NOT in scope:**
- `app/api/auth/login/route.ts` — Whale Class admin, different system
- `app/admin/schools/[slug]/page.tsx` L295 — UI display showing credentials for dev convenience. Will leave a comment marking it for Phase 4.

**Risk mitigation:** Verify `SUPER_ADMIN_PASSWORD` is set in Railway environment variables before deploying. If not set, all super-admin routes will reject all requests (fail-closed, which is correct).

---

## Fix 7: Shorten admin dashboard token TTL

**File:** `lib/auth.ts` line 27

Change `.setExpirationTime('30d')` to `.setExpirationTime('7d')`.

**Scope:** This is the Whale Class admin dashboard token only. Story tokens (24h) and Montree teacher/principal tokens (7d) are already appropriate.

**Impact:** Existing admin sessions with 30d tokens will continue working until they expire. New sessions will get 7d tokens. No forced logout.

---

## Execution Order (revised)

```
1. Prerequisites: Verify DB schema, run migration if needed
2. Fix 3: Column name alignment (unblocks Fixes 1, 2, 4)
3. Fix 1: Store session_token on login (unblocks Fix 2)
4. Fix 2: Create heartbeat endpoint (unblocks Fix 4)
5. Fix 4: Online-users uses heartbeat data
6. Fix 5: System-controls proper auth (independent)
7. Fix 6: Centralise 870602 (independent, largest change)
8. Fix 7: Admin TTL (independent, 1-line change)
```

Fixes 5, 6, 7 are independent and can be done in parallel with Fixes 1-4.

---

## Out of scope (deferred to later phases)
- Story app hardcoded T/Z credentials — personal family app, not a vulnerability
- Whale Class admin credentials in `auth/login/route.ts` — different system
- `app/admin/schools/[slug]/page.tsx` credential display — dev convenience
- Story admin token TTL (already 24h, appropriate)
- `getLoginLogId()` in story-db.ts — used by message routes, will be fixed by Fix 3 column alignment
