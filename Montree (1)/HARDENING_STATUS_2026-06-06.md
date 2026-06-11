# Weekend Hardening — Status (2026-06-06)

All changes are on `main` and pushed (Railway auto-deploys). Existing user sessions were not disrupted.

## Done & verified

| # | Item | Result |
|---|------|--------|
| 1 | Test net (Vitest) | 9 auth tests passing; `npm test`. Harness for the TTL change. |
| 2 | **DB locks (RLS)** | **The big one.** Public anon key could read 57 children, 842 media, 13 schools, 19 classrooms, 3 parents straight from Supabase. Locked with default-deny RLS; re-probe confirms 0 anon rows, app unaffected. |
| 3 | Public admin password | Already server-side in code; only a stale comment remained. Removed the dead `NEXT_PUBLIC_ADMIN_PASSWORD` from `.env.local`; not in the bundle. |
| 4 | JWT TTL | Cut 365 days → 30 (configurable via `MONTREE_JWT_TTL_DAYS`). A stolen token dies in a month, not a year. Test guards against regression. |
| 5 | Cron auth | Verified already safe — every cron route requires a truthy `CRON_SECRET` and falls back to super-admin auth. No change needed. |

Commits: `baba8f74` (audit+guards), `8f0c04be` (test net), `286ae2fc` (RLS), `9fc162e4` (TTL).

## Your to-do (Railway dashboard — only you can)

1. **Delete `NEXT_PUBLIC_ADMIN_PASSWORD`** from Railway env vars (it's dead in code; this stops any future build ever bundling it).
2. **Strengthen `SUPER_ADMIN_PASSWORD`.** It's currently a 6-digit PIN guarding full system access. Replace with a long random value, e.g. generate one:
   `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
   Set it in Railway (and your password manager). Changing it just means you re-login to super-admin once.
3. *(Optional)* Set `MONTREE_JWT_TTL_DAYS` if you want something other than 30 (e.g. `14`).
4. *(Parked)* Check the `jeffy-commerce` Supabase project — it also has `montree_children`/`montree_parents` tables (likely a stale clone) and may have the same anon leak.

## Deliberately deferred (not security holes)

- **`withAuth()` wrapper** — consistency refactor across 466 routes. The audit found no current holes and the tenant-scoping CI guard catches regressions, so this is maintainability, not safety.
- **Middleware role cache** — performance/reliability; touches the auth hot path. Not worth the risk with no users and no traffic pressure yet.

Both are good follow-ups once there's a test cohort.
