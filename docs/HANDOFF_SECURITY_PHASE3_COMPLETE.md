# Handoff: Security Hardening Phase 3 — COMPLETE (Feb 10, 2026)

## Status: Phase 3 DONE + Audited. Ready for Phase 4.

---

## What Was Done (Phase 3: Quick Security Wins)

8 fixes across ~25 files, plus 3 audit-catch fixes:

### Fix 1: Column name standardisation — `login_time` → `login_at` (11 files)
DB migration renamed column but code still used old name everywhere.

**Files changed:**
- `app/api/story/auth/route.ts` — insert uses `login_at`
- `app/api/story/admin/auth/route.ts` — insert uses `login_at`
- `app/api/story/admin/online-users/route.ts` — select/gt/order
- `app/api/story/admin/login-logs/route.ts` — select/order/mapping
- `app/api/story/admin/send-image/route.ts` — order clause
- `app/api/story/admin/send-message/route.ts` — order clause
- `app/api/story/admin/send-audio/route.ts` — order clause
- `app/api/story/message/route.ts` — order clause
- `app/story/admin/dashboard/types.ts` — TypeScript interface
- `app/story/admin/dashboard/components/ActivityLogTab.tsx` — display
- `lib/story/types.ts` — TypeScript interface

### Fix 2: Store session_token on login
`logLogin()` in `app/api/story/auth/route.ts` now accepts token param and stores `token.substring(0, 50)` in `story_login_logs.session_token`. Both user login paths updated.

### Fix 3: Heartbeat endpoint — NEW FILE
Created `app/api/story/heartbeat/route.ts`. Client was already sending POST every 30s but endpoint never existed. Upserts into `story_online_sessions` table with `last_seen_at`, `is_online: true`.

### Fix 4: Online-users dual query
Rewrote `app/api/story/admin/online-users/route.ts`. Now queries:
1. `story_online_sessions` (primary, heartbeat-based)
2. `story_login_logs` (fallback, for users without heartbeats)
Merges with dedup, prefers heartbeat data.

### Fix 5: System-controls JWT auth
`app/api/story/admin/system-controls/route.ts` — replaced weak `token.length > 10` check with proper `verifyAdminToken()` from `@/lib/story-db`.

### Fix 6: Centralise hardcoded `870602` password (13 files)
Replaced all hardcoded `870602` references with `process.env.SUPER_ADMIN_PASSWORD`:
- 11 super-admin API routes (reset-password, schools, home, impact-fund, npo-outreach, npo-applications, reduced-rate-applications, leads, feedback, dm)
- `app/montree/super-admin/page.tsx` — removed client-side `|| password === '870602'` fallback
- `app/api/auth/login/route.ts` — Whale Class admin now uses env vars (see audit fix below)
- `app/admin/schools/[slug]/page.tsx` — password display masked to `••••••`

### Fix 7: Admin token TTL 30d → 7d
- `lib/auth.ts` — `.setExpirationTime("7d")`
- `app/api/auth/login/route.ts` — cookie `maxAge` changed to `60 * 60 * 24 * 7`

### Fix 8: Vault references in system-controls
`app/api/story/admin/system-controls/route.ts`:
- `clear_vault`: `story_vault` → `vault_files`, `story-vault` → `vault-secure`, `storage_path` → extract from `file_url` via regex
- Stats: `story_vault` → `vault_files` with `.is('deleted_at', null)`
- `factory_reset`: Full vault cleanup with correct table/bucket names + audit log + unlock attempts

### Audit-Catch Fixes (3 additional)
1. **CRITICAL — Empty password bypass**: `app/api/auth/login/route.ts` had `|| ''` fallback. Rewrote to skip accounts with unset env vars + reject empty passwords.
2. **Missing env var**: Added `TEACHER_ADMIN_PASSWORD=Potato` to `.env.local`
3. **Type mismatch**: `app/story/admin/dashboard/types.ts` — `OnlineUser.lastLogin` → `lastSeen` to match API response

---

## Environment Variables Added

**Must be set in Railway production:**
```
SUPER_ADMIN_PASSWORD=870602    # (already should exist)
TEACHER_ADMIN_PASSWORD=Potato  # NEW — Whale Class teacher login
```

---

## What Was NOT Changed (Deferred)

- `storage_path` in `app/api/story/admin/files/delete/[id]/route.ts` and `files/upload/route.ts` — these are the shared files system, NOT the vault. Different table (`story_shared_files`), different column. Leave as-is.
- Stale session cleanup scheduling — `cleanup_stale_sessions()` DB function exists but no pg_cron job. Online-users 2-minute window handles this at app level.
- No token refresh mechanism — users re-login after 7 days. Standard for admin dashboards.

---

## Phases Completed So Far

| Phase | Name | Status |
|-------|------|--------|
| 1 | API Auth (JWT for all routes) | ✅ Done |
| 1B | Parent session tokens | ✅ Done |
| 2 | bcrypt password migration | ✅ Done (100% audited) |
| 3 | Quick security wins (8+3 fixes) | ✅ Done (audited) |

---

## Suggested Next Phases

| Phase | Name | Scope |
|-------|------|-------|
| 4 | Secret rotation & env hardening | Rotate weak ADMIN_SECRET, generate strong random secrets for production, audit all env vars |
| 5 | Password policy & validation | Min length, complexity, rate limiting on login endpoints |
| 6 | Input sanitisation & headers | XSS prevention, Content Security Policy, sanitise user inputs |
| 7 | Montree audit logging | Story system has logging; Montree teacher/parent/admin system has none |
| 8 | Rate limiting & abuse prevention | Brute force protection on all auth endpoints |
| 9 | Production security review | Final: rotate all secrets, verify Railway env vars, remove dev code, penetration test |

---

## Key Files Reference

| File | What it does |
|------|-------------|
| `lib/story-db.ts` | Supabase client, JWT helpers, session helpers for Story system |
| `lib/auth.ts` | Whale Class admin JWT (createAdminToken 7d TTL, verifyAdminToken) |
| `lib/montree/password.ts` | Shared bcrypt utilities (hashPassword, verifyPassword, isLegacyHash) |
| `lib/montree/server-auth.ts` | Montree JWT (createMontreeToken 7d, createParentToken 30d) |
| `app/api/story/heartbeat/route.ts` | NEW — heartbeat endpoint for online presence |
| `.claude/plans/phase3-plan-v3.md` | The plan that was executed (3 rounds of audit refinement) |

---

## To Resume Work

Start a fresh chat and say:
> "Run the Phase 4 fresh audit command from CLAUDE.md"

This will trigger a comprehensive audit to build the Phase 4 plan.
