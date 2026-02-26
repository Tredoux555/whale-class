# Handoff: Post-Phase 9 Audit & Production Fixes

**Date:** Feb 11, 2026
**Session:** Post-security marathon — audit rounds, CSP fix, frontend fixes, DB migration

---

## Summary

After completing all 9 security phases, this session ran 3 audit rounds on the Phase 9 work, fixed the super-admin panel frontend, diagnosed and fixed a site-wide CSP issue that was breaking all JavaScript, and created a database migration for missing tables and column renames.

---

## What Was Done

### 1. Phase 9 Audit (3 Rounds, ~20 additional files fixed)

The original Phase 9 sanitized error responses in ~43 files. Three audit rounds found and fixed ~20 more:

**Round 1 (16 files):** backfill-guides, reseed-curriculum, import-students, reports/send, story/admin/send-video, vault/save-from-message, story/upload-media, health, admin/curriculum/sync-all, home/debug, whale/progress, whale/progress/summary, whale/ai/status, whale/children, whale/children/[id], public/videos

**Round 2 (5 files):** whale/curriculum/areas, whale/curriculum/categories, whale/curriculum/route, whale/curriculum/roadmap, montree/children/bulk

**Round 2 bulk pass (14 files):** whale/activity-history, whale/reports/generate, whale/reports/pdf, whale/daily-activity, whale/themes, whale/photos, whale/favorites, whale/activities, whale/progress/enhanced, whale/daily-summary, whale/montessori-works/upload-video, whale/video-watches, montree/reports/photos, weekly-planning/upload

Also fixed:
- Missing rate limiting on schools PATCH (10/15min) and DELETE (5/15min)
- Duplicate `getSupabase()` call in audit GET handler

### 2. Super-Admin Panel Frontend Fix

- `hooks/useAdminData.ts` — `fetchSchools` now sends `x-super-admin-password` header (was missing after Phase 9 added auth to schools GET)
- `app/montree/super-admin/page.tsx` — `logAction` now includes password in audit POST body (was missing after Phase 9 added auth to audit POST)

### 3. CSP Fix (CRITICAL — Site-Wide)

**Root cause:** Phase 6 added `script-src 'self'` to Content Security Policy in `next.config.ts`. This blocked ALL inline scripts. Next.js requires inline `<script>` tags for hydration, page data, and client-side routing. Result: every page on both domains rendered HTML but had zero JavaScript functionality — no buttons, no forms, no navigation worked.

**Fix:** Changed `script-src 'self'` → `script-src 'self' 'unsafe-inline'` in `next.config.ts`. Also added `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src` for Google Fonts used by Story pages.

### 4. Database Migration (migration 123)

Created and applied `migrations/123_fix_story_columns_and_audit_table.sql`:

1. **Renamed `login_time` → `login_at`** in `story_login_logs` — Phase 3 renamed all code references but never altered the DB column. All login logging was silently failing.
2. **Renamed `login_time` → `login_at`** in `story_admin_login_logs` — same issue.
3. **Widened both columns** from varchar(10) to TEXT — timestamps didn't fit.
4. **Created `montree_super_admin_audit` table** — migration 099 was never applied. ALL audit logging from Phases 5–9 was silently failing (fire-and-forget pattern caught errors).
5. **Created `montree_rate_limit_logs` table** — ensured exists for rate limiting.

### 5. Story Login Diagnosis

Ran exhaustive diagnostic against live database:
- Users T and Z exist with valid bcrypt hashes ✅
- `bcrypt.compare('redoux', hash)` validates ✅
- JWT creation and verification work ✅
- The actual blocker was the CSP issue, not auth code

---

## Files Changed (99 files total in commit)

**Config:** `next.config.ts` (CSP fix)
**Frontend:** `app/montree/super-admin/page.tsx`, `hooks/useAdminData.ts`
**API routes (~85 files):** Error response sanitization across all routes
**Libraries:** `lib/verify-super-admin.ts` (new), `lib/api-error.ts` (new), `lib/message-encryption.ts`, `lib/montree/audit-logger.ts`, `lib/montree/stripe.ts`
**Middleware:** `middleware.ts` (CSRF logging)
**Scripts:** `scripts/rotate-encryption-key.ts` (new)
**Migrations:** `migrations/123_fix_story_columns_and_audit_table.sql` (new)
**Docs:** `CLAUDE.md`, `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md`, `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`, phase plan files

---

### 6. SSH Key Setup (Cowork VM)

- Generated ed25519 SSH key pair in Cowork VM
- Added public key to GitHub account as "Cowork VM"
- Switched git remote from HTTPS (`https://github.com/...`) to SSH (`git@github.com:...`)
- Cowork sessions can now `git push origin main` directly — no need to give user push commands

---

### 7. Codebase Cleanup Phase 5 — Console Log Stripping

- Stripped 46 remaining `console.log` and debug `console.warn` statements across 35 files
- Preserved all `console.error` (catch blocks) and security-tagged `console.warn` ([CSRF], [PARENT-AUTH], [SECURITY])
- Codebase cleanup phases 2–4 and 6 were already completed in previous sessions
- **All 6 cleanup phases now COMPLETE**

### 8. Home Registration 500 — Resolved (Not a Bug)

- Tested `/api/home/auth/try` and `/api/home/auth/login` against live `montree.xyz` — both work perfectly
- Registration creates family + 6-char code + seeds 68-work curriculum ✅
- Login with code via SHA256 lookup + bcrypt fallback ✅
- The 500 was from testing on old `teacherpotato.xyz` domain which returns 405 on all API calls
- Domain migration to `montree.xyz` was already completed

### 9. MESSAGE_ENCRYPTION_KEY Rotation — REVERTED, Script Fixed

- Attempted rotation to new random key on Railway
- **BROKE 1,605 Story messages** — all displayed as raw `gcm:...` encrypted text in Story admin dashboard
- Root cause: checked `montree_messages` table (doesn't exist), missed that actual encrypted data lives in `story_message_history.message_content` (1,605 rows)
- **Key reverted** back to `change-this-to-32-char-key-12345` on Railway — messages immediately readable again
- **Rotation script fixed** (`scripts/rotate-encryption-key.ts`):
  - Changed table from `montree_messages` → `story_message_history`
  - Changed columns from `message_text`/`subject` → `message_content`
  - Added `decryptGCM()` function to handle GCM-encrypted messages (not just CBC)
  - Script now handles both old CBC format and current GCM format
- **Key rotation still needed** — run the fixed script before changing the key on Railway next time

---

## Action Items Status

Almost everything from the original action items list is done — encryption key rotation still needs to be completed:

| Item | Status |
|------|--------|
| Security phases 1–9 | ✅ Done |
| Post-Phase 9 audit (3 rounds) | ✅ Done |
| CSP fix (site was broken) | ✅ Done |
| Super-admin frontend fix | ✅ Done |
| Story login fix (DB migration) | ✅ Done |
| Codebase cleanup phases 1–6 | ✅ Done |
| Domain migration (montree.xyz) | ✅ Done |
| Home registration 500 | ✅ Not a bug |
| Encryption key rotation | ⚠️ Reverted — script fixed, needs re-run |
| SSH for direct pushing | ✅ Done |

### Remaining (Future Projects — Not Blockers)

- Auth restructure (localStorage → httpOnly cookies + middleware)
- API route consolidation (106 routes — many could merge)
- Centralized logging service
- Home dashboard UI (not yet built)

---

## Key Lessons

- **CSP `script-src 'self'` breaks Next.js** — Must include `'unsafe-inline'` for hydration. A nonce-based approach is more secure but requires significant configuration.
- **Always apply DB migrations alongside code changes** — Phase 3 renamed `login_time` → `login_at` in code but never ran the column rename SQL. The fire-and-forget pattern hid the failure for months.
- **Audit your audits** — The original Phase 9 caught ~43 files with error leaks. Three additional passes found ~20 more. Whale routes were systematically missed in the first pass.
- **Verify encrypted data location before key rotation** — The rotation script targeted `montree_messages` (never created). The actual encrypted data was in `story_message_history.message_content` (1,605 rows). Changing the key without migrating data made all messages unreadable. Always grep the codebase for actual table usage before assuming no data exists.
