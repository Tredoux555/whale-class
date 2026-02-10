# Phase 3 Plan v1 — Quick Security Wins

## Scope
Fix the 5 root causes of broken story activity logging + address critical Montree security issues.

---

## Fix 1: Create missing heartbeat endpoint
**File to create:** `app/api/story/heartbeat/route.ts`

- Accept POST with Bearer token
- Verify user JWT via `verifyUserToken()` from `lib/story-db.ts`
- Upsert into `story_login_logs`: update the most recent log for this user (where `logout_at` IS NULL) to set a `last_seen_at` timestamp
- If no matching log found, insert a new one
- Return 200 OK

**Why:** The client sends heartbeats every 30s but the endpoint doesn't exist. This is the core mechanism for tracking who's actively viewing.

---

## Fix 2: Store session_token on user login
**File to modify:** `app/api/story/auth/route.ts`

In `logLogin()`, add `session_token: token.substring(0, 50)` to the insert. This requires passing the token into logLogin, so the function signature changes to include a `token` parameter.

Both the hardcoded-credential path and the DB-bcrypt path need to pass the generated token to `logLogin()`.

**Why:** Logout (DELETE handler) tries to match by `session_token` to set `logout_at`, but the token is never written at login. Logout tracking is completely broken.

---

## Fix 3: Resolve login_time vs login_at column name
**Decision:** Standardise on `login_time` in all code.

**Rationale:** The actual DB may or may not have had the rename migration run. Since the code universally uses `login_time`, and the migration is a conditional rename that may not have executed, the safest approach is to keep the code using `login_time` and add a defensive migration that ensures the column is named `login_time`.

**Files using `login_time`:** auth/route.ts, admin/auth/route.ts, online-users/route.ts, login-logs/route.ts
**Files using `login_at`:** lib/story-db.ts (getLoginLogId), migrations

**Action:** Update `lib/story-db.ts` `getLoginLogId()` to use `login_time` instead of `login_at`. Don't touch migrations (they're already idempotent).

---

## Fix 4: Fix online-users detection to use heartbeat data
**File to modify:** `app/api/story/admin/online-users/route.ts`

Current logic: "find logins within 2 minutes" — but since login_time is set once at login, this only works for 2 minutes after someone logs in.

New logic: Query `story_login_logs` where `last_seen_at > 2 minutes ago` AND `logout_at IS NULL`. This relies on Fix 1 (heartbeat updating `last_seen_at`).

**Why:** The 2-minute window on `login_time` is meaningless since login_time never updates. With heartbeats updating `last_seen_at`, we can track real activity.

---

## Fix 5: Fix system-controls auth
**File to modify:** `app/api/story/admin/system-controls/route.ts`

Replace the weak `session.length > 10` check with proper JWT verification using `verifyAdminToken()` from `lib/story-db.ts`.

**Why:** Currently anyone with a random 11+ character Bearer token can trigger factory_reset and delete all data.

---

## Fix 6: Centralise super-admin password to env var
**Files to modify:** All 17+ files with hardcoded `'870602'`

Replace all `=== '870602'` checks with `=== process.env.SUPER_ADMIN_PASSWORD`. Remove the hardcoded fallback. The env var is already set in `.env.local`.

**Why:** Hardcoded passwords in source code are a basic security anti-pattern. The env var already exists.

---

## Fix 7: Shorten admin dashboard token TTL
**File to modify:** `lib/auth.ts`

Change `setExpirationTime('30d')` to `setExpirationTime('7d')`.

**Why:** 30-day admin tokens are unnecessarily long. 7 days matches the Montree teacher/principal tokens already.

---

## Execution order
1. Fix 3 (column name) — unblocks everything
2. Fix 2 (session_token on login) — needed for Fix 1
3. Fix 1 (heartbeat endpoint) — core fix
4. Fix 4 (online-users query) — depends on Fix 1
5. Fix 5 (system-controls auth) — independent
6. Fix 6 (centralise 870602) — independent
7. Fix 7 (admin TTL) — independent
