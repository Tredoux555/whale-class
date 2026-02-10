# Phase 3 Plan v3.1 — Quick Security Wins (Final + Vault)

Addresses all findings from v1 audit (20 issues), v2 audit (9 issues), and vault system audit.

---

## DB Schema Reality (verified from migrations)

**`story_login_logs` table:**
- Column was originally `login_time`, migration renames to `login_at`
- Columns: id, username, `login_at` (TIMESTAMPTZ), session_token (TEXT), logout_at (TIMESTAMP), ip_address, user_agent
- **No `last_seen_at` column on this table**

**`story_online_sessions` table (separate):**
- Has: username, session_token, `last_seen_at`, is_online
- Designed for heartbeat tracking but never used by any code
- Has DB functions: `cleanup_stale_sessions()`, `update_user_last_seen()`

**`story_admin_login_logs` table:**
- Has: username, `login_at`, session_token, logout_at, ip_address, user_agent

**Code currently uses `login_time` everywhere except `lib/story-db.ts` which uses `login_at`.**

**Decision: Standardise code to `login_at`** since the migration renames the column. All code references to `login_time` are stale.

---

## Fix 1: Standardise column name to `login_at`

All these files use `login_time` but the DB column is `login_at`:

| File | Line(s) | Change |
|------|---------|--------|
| `app/api/story/auth/route.ts` | 16 | `login_time:` → `login_at:` |
| `app/api/story/admin/auth/route.ts` | 30 | `login_time:` → `login_at:` |
| `app/api/story/admin/online-users/route.ts` | 19, 20, 22, 31, 36 | All `login_time` → `login_at` |
| `app/api/story/admin/login-logs/route.ts` | 17, 18, 26 | All `login_time` → `login_at` |

**Already correct:** `lib/story-db.ts` line 74 uses `login_at` ✓

---

## Fix 2: Store session_token on user login

**File:** `app/api/story/auth/route.ts`

Change `logLogin()` to accept and store the token:

```typescript
async function logLogin(username: string, ip: string, userAgent: string, token: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('story_login_logs').insert({
      username,
      login_at: new Date().toISOString(),
      session_token: token.substring(0, 50),
      ip_address: ip,
      user_agent: userAgent
    });
    if (error) {
      console.error('[Auth] Login log error:', error.message);
    }
  } catch (e) {
    console.error('[Auth] Login log exception:', e);
  }
}
```

Update both call sites:
- Line 59: `await logLogin(username, ip, userAgent, token);`
- Line 85: `await logLogin(username, ip, userAgent, token);`

**Admin auth already does this correctly** — `logAdminLogin()` at line 31 stores `session_token: token.substring(0, 50)`. No change needed there, but update its `login_time:` to `login_at:` per Fix 1.

---

## Fix 3: Create heartbeat endpoint

**File to create:** `app/api/story/heartbeat/route.ts`

**Design choice:** Use `story_online_sessions` table (which already has `last_seen_at` and the `update_user_last_seen()` DB function) rather than adding a column to `story_login_logs`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getSessionToken } from '@/lib/story-db';

export async function POST(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ ok: true }); // Don't 401 heartbeats
    }

    const sessionToken = getSessionToken(req.headers.get('authorization'));
    if (!sessionToken) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabase();

    // Upsert into story_online_sessions
    const { error } = await supabase
      .from('story_online_sessions')
      .upsert(
        {
          username,
          session_token: sessionToken,
          last_seen_at: new Date().toISOString(),
          is_online: true,
        },
        { onConflict: 'session_token' }
      );

    if (error) {
      console.error('[Heartbeat] Update failed:', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Heartbeat] Error:', e);
    return NextResponse.json({ ok: true }); // Never fail heartbeats
  }
}
```

**Why `story_online_sessions`:**
- Table already exists with `last_seen_at`, `is_online`, `session_token`
- DB already has `update_user_last_seen()` and `cleanup_stale_sessions()` functions
- No schema migration needed
- Clean separation: `story_login_logs` = audit trail, `story_online_sessions` = live presence

---

## Fix 4: Fix online-users to use `story_online_sessions`

**File:** `app/api/story/admin/online-users/route.ts`

Replace the query to use the presence table instead of login logs:

```typescript
const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();

// Primary: check story_online_sessions (heartbeat-based)
const { data: onlineSessions, error: sessionError } = await supabase
  .from('story_online_sessions')
  .select('username, last_seen_at')
  .eq('is_online', true)
  .gt('last_seen_at', twoMinutesAgo);

if (sessionError) {
  console.error('[OnlineUsers] Session query error:', sessionError.message);
}

// Fallback: also check recent logins (for users who haven't sent heartbeats yet)
const { data: recentLogins, error: loginError } = await supabase
  .from('story_login_logs')
  .select('username, login_at')
  .gt('login_at', twoMinutesAgo)
  .is('logout_at', null);

if (loginError) {
  console.error('[OnlineUsers] Login query error:', loginError.message);
}

// Merge: deduplicate by username, prefer online_sessions data
const userMap = new Map();
for (const row of (recentLogins || [])) {
  userMap.set(row.username, {
    username: row.username,
    lastSeen: row.login_at,
    secondsAgo: Math.max(0, Math.floor((now - new Date(row.login_at).getTime()) / 1000)),
  });
}
for (const row of (onlineSessions || [])) {
  userMap.set(row.username, {
    username: row.username,
    lastSeen: row.last_seen_at,
    secondsAgo: Math.max(0, Math.floor((now - new Date(row.last_seen_at).getTime()) / 1000)),
  });
}
```

**Backward compatibility:** The fallback query means users who logged in before heartbeats were deployed still show as online for 2 minutes after login. Once heartbeats kick in, `story_online_sessions` takes over.

---

## Fix 5: Fix system-controls auth

**File:** `app/api/story/admin/system-controls/route.ts`

Replace weak auth with proper JWT verification:

```typescript
import { getSupabase } from '@/lib/supabase-client';
import { verifyAdminToken } from '@/lib/story-db';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const admin = await verifyAdminToken(request.headers.get('Authorization'));
  return admin !== null; // verifyAdminToken returns username string or null
}
```

Remove old `getSupabase` import from supabase-client if no longer needed (keep it — it's still used in the handlers).

`verifyAdminToken()` (from `lib/story-db.ts` lines 32-43) accepts `string | null`, extracts Bearer token, verifies JWT with jose, checks `role === 'admin'`, returns username or null.

---

## Fix 6: Centralise hardcoded `870602` password

**Scope:** Montree super-admin routes only. Whale Class admin login (`app/api/auth/login/route.ts`) is out of scope — different system.

**Pattern for routes with direct comparison:**
```typescript
// BEFORE:
if (password !== '870602') { return 401; }
// AFTER:
if (password !== process.env.SUPER_ADMIN_PASSWORD) { return 401; }
```

**Pattern for routes with const declaration:**
```typescript
// BEFORE:
const ADMIN_PASSWORD = '870602';
// AFTER:
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '';
```

**Pattern for routes with fallback (leads, feedback, dm):**
```typescript
// BEFORE:
const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
const fallbackPassword = '870602';
const isValid = superAdminPassword === expectedPassword || superAdminPassword === fallbackPassword;
// AFTER:
const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
if (!expectedPassword) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
const isValid = superAdminPassword === expectedPassword;
```

**Complete file list:**

1. `app/api/montree/super-admin/reset-password/route.ts` — L13: direct comparison
2. `app/api/montree/super-admin/schools/route.ts` — L65, L106: direct comparisons
3. `app/api/montree/super-admin/home/route.ts` — L6: const declaration
4. `app/api/montree/super-admin/impact-fund/route.ts` — L4: const declaration
5. `app/api/montree/super-admin/npo-outreach/route.ts` — L4: const declaration
6. `app/api/montree/super-admin/npo-applications/route.ts` — L13, L53: direct comparisons
7. `app/api/montree/super-admin/reduced-rate-applications/route.ts` — L13, L61: direct comparisons
8. `app/api/montree/leads/route.ts` — Three handlers with fallback pattern (approx L151, L219, L272)
9. `app/api/montree/feedback/route.ts` — Two handlers with fallback pattern (approx L93, L162)
10. `app/api/montree/dm/route.ts` — L11: env var with `|| '870602'` fallback
11. `app/montree/super-admin/page.tsx` — L112: client-side check with `|| password === '870602'`

**Prerequisite:** Verify `SUPER_ADMIN_PASSWORD` is set in Railway environment. It's already in `.env.local` as `SUPER_ADMIN_PASSWORD=870602`. If it's NOT in Railway, these routes will return 500/401 — which is fail-closed (correct security behavior).

**Out of scope (different system):**
- `app/api/auth/login/route.ts` — Whale Class admin, uses separate `ADMIN_CREDENTIALS` array
- `app/admin/schools/[slug]/page.tsx` L295 — UI display of dev credentials, cosmetic

---

## Fix 7: Shorten Whale Class admin token TTL

**File:** `lib/auth.ts` line 27

Change `.setExpirationTime('30d')` to `.setExpirationTime('7d')`.

This is the Whale Class admin dashboard token (created via `app/api/auth/login/route.ts`). Montree teacher/principal tokens are already 7d. Story tokens are already 24h. No other TTL changes needed.

Existing 30d tokens will continue working until expiry. No forced logout.

---

## Fix 8: Fix broken vault in system-controls

**File:** `app/api/story/admin/system-controls/route.ts`

The vault section of this file has **three wrong references** that make it completely non-functional:

### 8a: Fix `clear_vault` action (POST handler, lines 77-100)

**Problem:** Uses table `story_vault` (doesn't exist) and bucket `story-vault` (doesn't exist) and column `storage_path` (doesn't exist).

**Actual values:** Table = `vault_files`, bucket = `vault-secure`, path is extracted from `file_url`.

```typescript
// BEFORE (broken):
case 'clear_vault': {
  const { data: files } = await supabase
    .from('story_vault')              // ❌ wrong table
    .select('storage_path');           // ❌ wrong column
  if (files && files.length > 0) {
    const paths = files.map(f => f.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from('story-vault').remove(paths);  // ❌ wrong bucket
    }
  }
  const { error } = await supabase
    .from('story_vault')              // ❌ wrong table
    .delete()
    .not('id', 'is', null);
  // ...
}

// AFTER (fixed):
case 'clear_vault': {
  const { data: files } = await supabase
    .from('vault_files')              // ✅ correct table
    .select('id, file_url');          // ✅ correct column

  // Delete from storage
  if (files && files.length > 0) {
    const paths = files
      .map(f => {
        const match = f.file_url?.match(/vault\/[^?]+/);
        return match ? match[0] : null;
      })
      .filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from('vault-secure').remove(paths);  // ✅ correct bucket
    }
  }

  // Hard delete from database (not soft delete — this is a clear action)
  const { error } = await supabase
    .from('vault_files')              // ✅ correct table
    .delete()
    .not('id', 'is', null);

  if (error) throw error;
  result = { success: true, message: 'Vault cleared', affected: files?.length || 0 };

  // Also clear audit log for vault
  await supabase
    .from('vault_audit_log')
    .delete()
    .not('id', 'is', null);

  break;
}
```

**Path extraction logic:** Matches the same pattern used in `vault/download/[id]/route.ts` line 47: `file.file_url.match(/vault\/[^?]+/)`. This extracts the storage path from the public URL.

### 8b: Fix vault stats in GET handler (line 186)

```typescript
// BEFORE (broken):
supabase.from('story_vault').select('*', { count: 'exact', head: true }),

// AFTER (fixed):
supabase.from('vault_files').select('*', { count: 'exact', head: true }).is('deleted_at', null),
```

The `.is('deleted_at', null)` filter ensures we only count active (non-deleted) vault files, matching what the list endpoint shows.

### 8c: Fix `factory_reset` action (line 152)

```typescript
// BEFORE (broken):
await supabase.from('story_vault').delete().not('id', 'is', null);

// AFTER (fixed):
// Clear vault storage first
const { data: vaultFiles } = await supabase.from('vault_files').select('file_url');
if (vaultFiles && vaultFiles.length > 0) {
  const paths = vaultFiles
    .map(f => { const m = f.file_url?.match(/vault\/[^?]+/); return m ? m[0] : null; })
    .filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from('vault-secure').remove(paths);
  }
}
await supabase.from('vault_files').delete().not('id', 'is', null);
await supabase.from('vault_audit_log').delete().not('id', 'is', null);
await supabase.from('vault_unlock_attempts').delete().not('id', 'is', null);
```

**Note:** Fix 5 (proper JWT auth) applies to this same file. Fixes 5 and 8 both modify `system-controls/route.ts` but touch different sections — Fix 5 changes the auth function at the top, Fix 8 changes the vault-related switch cases and stats query.

---

## Execution Order

```
Phase A (can be parallel — independent security fixes):
  Fix 5: System-controls auth (top of file)
  Fix 6: Centralise 870602 (11 files)
  Fix 7: Admin TTL (1 line)
  Fix 8: Fix vault in system-controls (same file as Fix 5, different sections)

Phase B (sequential — activity logging chain):
  Fix 1: Column name alignment (4 files)
  Fix 2: Store session_token on login (1 file)
  Fix 3: Create heartbeat endpoint (1 new file)
  Fix 4: Update online-users query (1 file)
```

Phase A and Phase B can run in parallel since they touch completely different files (except Fix 5 and Fix 8 which both touch system-controls — apply sequentially within Phase A).

---

## Rollback Plan

- **Fix 1 (column name):** If wrong, queries fail with column-not-found. Revert is mechanical search-replace back.
- **Fix 2 (session_token):** New field stored alongside existing data. Old sessions unaffected. Revert = remove the field from insert.
- **Fix 3 (heartbeat):** New endpoint. Revert = delete the file. Client already handles 404 silently.
- **Fix 4 (online-users):** If `story_online_sessions` table doesn't exist, query errors. Fallback query to `story_login_logs` still works. Revert = restore old query.
- **Fix 5 (system-controls):** If JWT verification breaks, admins can't use system controls. Revert = restore old check (not ideal but functional).
- **Fix 6 (870602):** If env var not set, routes return 500. Revert = restore hardcoded value. **Pre-deploy check required.**
- **Fix 7 (TTL):** No rollback needed. Old tokens still valid.

---

## v1 → v2 → v3 Issue Resolution Map

| v1 Issue | Fixed in |
|----------|----------|
| Missing heartbeat endpoint | Fix 3 (now uses correct table) |
| Column name mismatch | Fix 1 (standardised to login_at) |
| Session token not written | Fix 2 |
| No last_seen updates | Fix 3 (via story_online_sessions) |
| Silent error handling | Fix 3 (logs errors, returns ok) |
| System-controls weak auth | Fix 5 |
| Hardcoded passwords | Fix 6 |
| Admin TTL too long | Fix 7 |

| v2 Issue | Fixed in |
|----------|----------|
| last_seen_at on wrong table | Fix 3 redesigned for story_online_sessions |
| Supabase or() syntax | Fix 4 uses two separate queries instead |
| nullsFirst not supported | Fix 4 uses Map-based merge, no nullsFirst |
| Line numbers off-by-one | Noted as approximate, will verify during implementation |
| Missing env var verification | Fix 6 prerequisite step |
| Fix 5 parameter type confusion | Clarified: returns string|null, check !== null |
| Token length validation | Not added — JWTs from jose are always >100 chars, risk is theoretical |
| No rollback plan | Added above |

| Vault Audit Issue | Fixed in |
|-------------------|----------|
| clear_vault uses wrong table `story_vault` | Fix 8a (→ `vault_files`) |
| clear_vault uses wrong bucket `story-vault` | Fix 8a (→ `vault-secure`) |
| clear_vault uses wrong column `storage_path` | Fix 8a (→ extract from `file_url`) |
| GET stats queries wrong table for vault count | Fix 8b (→ `vault_files` + deleted_at filter) |
| factory_reset doesn't clear vault properly | Fix 8c (→ correct table + storage cleanup) |
| Vault audit_log and unlock_attempts not cleared | Fix 8a/8c (→ included in clear + reset) |
