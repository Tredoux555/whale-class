# Security Phase 9 Complete — Production Security Review (Final)

## Date: 2026-02-11

## Summary
Phase 9 is the final comprehensive security review. A full codebase audit was performed covering all 8 auth systems, ~200 API routes, CSP/CSRF/cookie config, env vars, rate limiting, and audit logging. 8 fixes were implemented across ~45 files.

## Fixes Implemented (8 total)

### Fix 1: Timing-safe password verification (CRITICAL)
- Created `lib/verify-super-admin.ts` — shared helper using `timingSafeEqual()` with fixed 256-byte buffers
- Replaced 9 plaintext `!==` password comparisons across 6 files:
  - `super-admin/login-as/route.ts`
  - `super-admin/schools/route.ts` (3 handlers: GET, PATCH, DELETE)
  - `super-admin/npo-applications/route.ts` (2 handlers: GET, PATCH)
  - `super-admin/reduced-rate-applications/route.ts` (2 handlers: GET, PATCH)
  - `super-admin/reset-password/route.ts`
  - `super-admin/secure/route.ts`
- `super-admin/auth/route.ts` already used `timingSafeEqual()` — unchanged

### Fix 2: Audit endpoint authentication (CRITICAL)
- `app/api/montree/super-admin/audit/route.ts` — Both GET and POST were completely unauthenticated
- Added `verifySuperAdminPassword()` to both handlers
- GET accepts password via `x-super-admin-password` header or `?password=` query param
- POST accepts password in request body
- Added limit cap (`Math.min(limit, 500)`) on GET to prevent unbounded queries

### Fix 3: Schools GET authentication (CRITICAL)
- `app/api/montree/super-admin/schools/route.ts` — GET handler was unauthenticated (returned all school data publicly)
- Added `verifySuperAdminPassword()` check (accepts header or query param)
- PATCH and DELETE already had password checks — upgraded to timing-safe
- Also fixed `error.message` leak in PATCH handler (line 87)

### Fix 4: Encryption upgrade (CBC → GCM) + rotation script (CRITICAL)
- `lib/message-encryption.ts` — Upgraded `encryptMessage()` from AES-256-CBC to AES-256-GCM
- New format: `gcm:<iv>:<authTag>:<encrypted>` (prefixed for format detection)
- `decryptMessage()` supports both formats (auto-detects by `gcm:` prefix)
- Legacy CBC messages continue to decrypt correctly
- Created `scripts/rotate-encryption-key.ts` — migration script for key rotation
- **ACTION REQUIRED**: Generate new 32-char key, run migration, update Railway env var

### Fix 5: Input length validation (HIGH)
- `app/api/montree/messages/route.ts` — Added max lengths: messageText (5000), subject (500), senderName (200)
- `app/api/montree/curriculum/generate-description/route.ts` — Added max lengths: work_name (255), area (50)

### Fix 6: Environment variable documentation (HIGH)
- `.env.example` — Added 8 missing variables:
  - `MONTREE_JWT_SECRET`, `STORY_ADMIN_JWT_SECRET`, `AUTH_SECRET`, `SUPER_ADMIN_ENCRYPTION_KEY`
  - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM`
- `lib/montree/stripe.ts` — Converted PRICE_IDS from hardcoded fallbacks to lazy-evaluated throw-on-missing pattern

### Fix 7: Error response sanitization (HIGH)
- Sanitized ~65 API files that leaked `error.message`, `error.details`, `error.hint`, or `JSON.stringify(error)` to clients
- All responses now return generic messages like `'Internal server error'`
- Detailed errors preserved in server-side `console.error()` for debugging
- Groups fixed: home routes, montree routes, whale routes, weekly-planning routes, admin routes, media routes, story routes
- Post-audit rounds found and fixed additional 21 files (whale curriculum, whale children, whale progress, whale favorites, whale themes, whale photos, whale daily-activity, whale reports, montree reports/photos, weekly-planning/upload)

### Fix 8: Rate limiting on super-admin endpoints (MEDIUM)
- Added `checkRateLimit()` to 5 super-admin endpoints + schools PATCH/DELETE:
  - `audit/route.ts` (10 per 15 min)
  - `schools/route.ts` GET (10 per 15 min), PATCH (10 per 15 min), DELETE (5 per 15 min — stricter for destructive ops)
  - `npo-applications/route.ts` (10 per 15 min)
  - `reduced-rate-applications/route.ts` (10 per 15 min)
  - `reset-password/route.ts` (3 per 15 min — stricter for password resets)
- All use DB-backed rate limiter with fail-open pattern (non-blocking try/catch)

## Files Created (3)
- `lib/verify-super-admin.ts` — Shared timing-safe password verification
- `scripts/rotate-encryption-key.ts` — Encryption key rotation migration script
- `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md` — This file

## Files Modified (~65)
- 6 super-admin route files (timing-safe + rate limiting + auth)
- 1 audit route file (auth + rate limiting + dedup getSupabase)
- 2 message/curriculum route files (length validation)
- 1 stripe lib file (lazy env validation)
- 1 .env.example (8 new vars)
- 1 message-encryption lib (CBC → GCM upgrade)
- ~55 API route files (error response sanitization — 3 audit passes)

## Post-Implementation Verification (3 audit rounds)
All critical checks pass:
- `grep '!== process.env.SUPER_ADMIN_PASSWORD'` → 0 matches
- `grep '!== expectedPassword'` → 0 matches
- `grep 'NextResponse.json.*error.*\.message'` → 0 matches
- `grep 'const message = error instanceof Error'` in response paths → 0 matches (1 in internal helper, not returned)
- All super-admin endpoints have both `verifySuperAdminPassword` and `checkRateLimit` (including PATCH/DELETE)
- `lib/message-encryption.ts` uses `aes-256-gcm` for new encryptions
- Duplicate `getSupabase()` in audit GET eliminated

## Outstanding Action Items
1. **MESSAGE_ENCRYPTION_KEY rotation** — Must be done manually:
   - Generate new 32-char key: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`
   - Set in Railway: `OLD_ENCRYPTION_KEY=change-this-to-32-char-key-12345`, `NEW_ENCRYPTION_KEY=<new-key>`
   - Run: `npx tsx scripts/rotate-encryption-key.ts --dry-run` (verify)
   - Run: `npx tsx scripts/rotate-encryption-key.ts` (execute)
   - Update Railway: `MESSAGE_ENCRYPTION_KEY=<new-key>`, remove `OLD_ENCRYPTION_KEY`

2. **Frontend updates needed** — Super-admin panel needs to send password with:
   - Audit endpoint: `password` in POST body, `x-super-admin-password` header for GET
   - Schools GET: `x-super-admin-password` header or `?password=` query param
   - If the super-admin panel already sends passwords for PATCH/DELETE, GET should work the same way

## Known Debt (Explicitly Deferred — Not Security Phase)
- 43 Whale API routes with zero auth (admin tool, UI-gated — auth consolidation project)
- localStorage for JWTs (teacher, teacher sessions, home family) — auth restructure project
- Parent invite codes stored as plaintext — low priority
- CSP `style-src 'unsafe-inline'` — complex Next.js integration
- `ignoreBuildErrors: true` in next.config.ts — pre-existing
- Audit table naming (`montree_super_admin_audit` logs all events, not just super-admin)

## Pattern Reminders (Carried Forward)
- **Never validate `process.env.*` at top level** — always inside a function
- **Rate limiter is DB-backed** — fail open with try/catch
- **Fire-and-forget audit logging** — never throw or block auth flow
- **Encryption format detection** — `gcm:` prefix = GCM, otherwise = legacy CBC
