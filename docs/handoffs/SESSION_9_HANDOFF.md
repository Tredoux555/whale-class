# Session 9 Handoff — Story Login Log Self-Heal

**Date:** Apr 8, 2026
**Commit:** `ec626171` (pushed to main)
**Problem:** User "Z" wasn't appearing reliably in the Story admin login dashboard. Tredoux asked to audit and fix so every one of Z's logins is captured accurately. (His own logins explicitly didn't matter.)

## Root cause

Story user auth flow writes to `story_login_logs` in exactly one place: the POST handler in `app/api/story/auth/route.ts`. After that initial POST, the browser holds a 24h JWT and replays it via the Authorization header on every page load and every heartbeat. No log row is written for any of those replays.

Two ways that single POST silently dropped rows:

1. **IP-keyed rate limiter.** `/api/story/auth` was 5 attempts per 15 minutes per IP. A household or school sharing a single public WAN IP burns the bucket fast — if Tredoux tested a few logins from home and Z tried to log in from the same IP, her POST returned 429 and no row was written.
2. **Silent insert failures.** `logLogin()` wraps the insert in try/catch and only calls `console.error` on failure. The POST returns 200 OK regardless, the frontend saves the token, and Z is "logged in" with zero trace in the admin dashboard.

Once those rows are missing, nothing else ever writes them. Heartbeat previously just updated `story_online_sessions`.

## Fix

### 1. Heartbeat self-heal — `app/api/story/heartbeat/route.ts`

Heartbeat already fires every few seconds while a user is on the Story site. Added an idempotent recovery step after the existing `story_online_sessions` upsert:

```typescript
const { data: existing } = await supabase
  .from('story_login_logs')
  .select('id')
  .eq('session_token', shortToken)
  .limit(1)
  .maybeSingle();

if (!existing) {
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);
  await supabase.from('story_login_logs').insert({
    username, login_at: new Date().toISOString(),
    session_token: shortToken, ip_address: ip, user_agent: userAgent,
  });
  console.log(`[Heartbeat] Self-healed login log: user=${username} ip=${ip}`);
}
```

Every distinct `session_token` produces exactly one login row. If POST /auth wrote the row, heartbeat finds it and skips. If POST /auth was rate-limited or its insert failed, the very first heartbeat after the user lands on the page recovers it. Wrapped in try/catch; never fails the heartbeat.

### 2. Rate limit relaxed — `app/api/story/auth/route.ts`

Bumped `/api/story/auth` IP rate limit from 5/15min to 30/15min. Still tight enough for brute-force protection but no longer locks out legitimate users sharing a home/school WAN.

## Not touched (intentionally)

- **Admin side** (`/api/story/admin/auth`) — user explicitly said his own logins don't matter.
- **Silent error swallowing in `logLogin()`** — heartbeat self-heal makes this a non-issue for visibility; fixing it would add complexity for no observable gain.
- **`story_login_logs` schema** — no new columns needed.
- **`/api/story/current`, `/api/story/recent-messages`** — these auto-auth from cookies but heartbeat already covers their sessions.

## Verification

After Railway deploys (~90s):

1. Ask Z to log out and log back in from her device.
2. Check the admin login dashboard within ~10 seconds — her row should appear.
3. Grep Railway logs for `[Heartbeat] Self-healed login log` to confirm the recovery path is firing.
4. If any `[Heartbeat] Self-heal login log insert failed` lines appear, inspect the error message (likely schema or RLS).

## Files touched

- `app/api/story/heartbeat/route.ts` — self-heal insert logic
- `app/api/story/auth/route.ts` — rate limit 5 → 30

## Next session (if still seeing gaps)

- Verify heartbeat is actually firing from Z's device (network tab / Railway access logs).
- Consider logging an explicit "session resume" row with a gap threshold (e.g. new row if last login for this user was >2h ago) — currently one row per session_token, which is what the admin wanted ("every time she logs in").
- If the heartbeat is blocked by CORS or network on her device, fall back to logging from `/api/story/current` as a secondary safety net.
