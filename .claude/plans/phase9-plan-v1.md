# Phase 9 Plan v1 — Production Security Review (Final)

## Date: 2026-02-11
## Status: DRAFT — Round 1 of 3 (plan→audit→refine)

---

## Comprehensive Audit Findings (Severity-Ranked)

### CRITICAL — Must Fix in Phase 9

**C1. Unauthenticated audit endpoint — public read/write of security logs**
- File: `app/api/montree/super-admin/audit/route.ts`
- Both GET (read all audit logs) and POST (write audit entries) have ZERO authentication
- Anyone on the internet can read your complete security audit trail or inject fake entries
- Fix: Add super-admin password verification to both GET and POST

**C2. Unauthenticated super-admin schools GET — returns all school data publicly**
- File: `app/api/montree/super-admin/schools/route.ts` (line 7, GET handler)
- Returns ALL schools with owner emails, subscription status, student/teacher counts
- PATCH and DELETE require password, but GET is wide open
- Fix: Add super-admin password verification to GET

**C3. Plaintext `!==` password comparisons in 5 super-admin endpoints (timing attacks)**
- `super-admin/login-as/route.ts` line 34: `superAdminPassword !== expectedPassword`
- `super-admin/schools/route.ts` line 66 & 107: `password !== process.env.SUPER_ADMIN_PASSWORD`
- `super-admin/npo-applications/route.ts` lines 13 & 53: `password !== process.env.SUPER_ADMIN_PASSWORD`
- `super-admin/reduced-rate-applications/route.ts` lines 13 & 61: `password !== process.env.SUPER_ADMIN_PASSWORD`
- `super-admin/reset-password/route.ts` line 14: `adminPassword !== process.env.SUPER_ADMIN_PASSWORD`
- `super-admin/secure/route.ts` line 61: `password !== process.env.ADMIN_PASSWORD`
- Note: `super-admin/auth/route.ts` already uses `timingSafeEqual()` — use that as template
- Fix: Replace all `!==` password checks with `timingSafeEqual()` (9 instances across 6 files)

**C4. MESSAGE_ENCRYPTION_KEY still using Phase 4 default placeholder**
- Currently set to `change-this-to-32-char-key-12345` (per Phase 4 handoff)
- All encrypted messages (parent-teacher) use this key
- Fix: Generate new 32-char key, write re-encryption migration script, deploy

### HIGH — Should Fix in Phase 9

**H1. Error response info leaks — 116 occurrences across 64 API files**
- `error.message`, `error.details`, `error.hint`, `JSON.stringify(error)` returned to clients
- Exposes: Postgres constraint names, column names, table names, stack traces
- Phase 8 sanitized 2 files (leads + children) — 62 more remain
- Fix: Bulk sanitize all 64 files using `lib/api-error.ts` pattern from Phase 8
- Key files with worst leaks:
  - `home/curriculum/route.ts` — leaks error.details + error.hint
  - `montree/children/bulk/route.ts` — `JSON.stringify(error)`
  - `montree/curriculum/route.ts` — `Failed to add work: ${error.message}`
  - `montree/sessions/route.ts` — `details: error.message`
  - `super-admin/schools/route.ts` line 87 — `error: error.message`
  - All 43 `/api/whale/*` routes — widespread `error.message` leaks

**H2. Missing input length validation (known from Phase 7 debt)**
- `app/api/montree/messages/route.ts` — `messageText` and `subject` unbounded
- `app/api/montree/curriculum/generate-description/route.ts` — `work_name` unbounded
- Fix: Add max length checks (messageText: 5000, subject: 500, work_name: 255)

**H3. Missing env vars in .env.example (5 undocumented)**
- `NEXT_PUBLIC_APP_URL` — used in email.ts for report links
- `SUPER_ADMIN_ENCRYPTION_KEY` — used in super-admin-security.ts
- `MONTREE_JWT_SECRET` — optional fallback in server-auth.ts
- `STORY_ADMIN_JWT_SECRET` — optional fallback in story auth
- `AUTH_SECRET` — alternative to ADMIN_SECRET in auth-multi.ts
- Fix: Add all 5 to `.env.example` with descriptions

**H4. Hardcoded Stripe fallback price IDs**
- `lib/montree/stripe.ts` lines 26-28: Falls back to `'price_basic'`, `'price_standard'`, `'price_premium'`
- Should throw error if not configured rather than silently using placeholders
- Fix: Convert to lazy validation pattern (like other env vars)

### MEDIUM — Document as Known Debt

**M1. 43 Whale API routes with zero authentication**
- All `/api/whale/*` routes are completely open
- Lower risk: Whale Class is the admin teaching tool, accessed behind admin login in the UI
- But API routes are directly accessible — anyone with the URL can read student data
- Recommendation: Add admin JWT verification to all whale routes (large scope — may be Phase 10)

**M2. localStorage for JWTs (teacher, teacher sessions, home family)**
- XSS can steal tokens from localStorage
- Known debt from Phase 7 — too risky to restructure mid-hardening
- Document for future auth consolidation project

**M3. Parent invite codes stored as plaintext in database**
- `montree_parent_invites.invite_code` — not hashed (unlike teacher/home codes)
- DB breach would expose all active invite codes
- Lower priority: invite codes are short-lived with usage limits

**M4. AES-256-CBC without HMAC authentication on message encryption**
- `lib/message-encryption.ts` uses CBC mode, not GCM
- Ciphertext is not authenticated — vulnerable to padding oracle attacks in theory
- Fix would require re-encrypting all messages (bundle with C4 key rotation)

**M5. CSP `style-src 'unsafe-inline'`**
- Allows inline style injection (XSS vector)
- Nonce-based approach would be ideal but complex with Next.js

**M6. Rate limiting gaps on super-admin data endpoints**
- Only `login-as` has rate limiting among super-admin routes
- `schools`, `audit`, `npo-applications`, etc. have no rate limiting
- Fix: Add rate limiting to all super-admin endpoints

### LOW — Informational

**L1. Email sender fallback to test domain**
- `lib/montree/email.ts` falls back to `onboarding@resend.dev` if `RESEND_FROM_EMAIL` not set
- Not a security risk per se, but emails would come from wrong domain

**L2. Audit table naming**
- `montree_super_admin_audit` logs ALL security events, not just super-admin
- Misleading but not a security issue

---

## Phase 9 Implementation Plan

### Fix 1: Secure the audit endpoint (C1)
- Add super-admin password verification to both GET and POST in `audit/route.ts`
- Use `timingSafeEqual()` for the password check (consistent with auth/route.ts)
- Files: 1

### Fix 2: Secure super-admin schools GET (C2)
- Add super-admin password verification to GET handler
- Accept password from header `x-super-admin-password` (consistent with DELETE)
- Files: 1

### Fix 3: Replace all `!==` password checks with `timingSafeEqual()` (C3)
- Create shared helper: `verifySuperAdminPassword(provided: string): boolean`
- Import `timingSafeEqual` from `crypto` and implement fixed-size buffer comparison
- Replace 9 instances across 6 files:
  - `super-admin/login-as/route.ts`
  - `super-admin/schools/route.ts` (2 instances)
  - `super-admin/npo-applications/route.ts` (2 instances)
  - `super-admin/reduced-rate-applications/route.ts` (2 instances)
  - `super-admin/reset-password/route.ts`
  - `super-admin/secure/route.ts`
- Files: 6 + 1 new helper

### Fix 4: MESSAGE_ENCRYPTION_KEY rotation (C4)
- Generate cryptographically random 32-char key
- Write migration script that:
  1. Reads all encrypted messages from DB
  2. Decrypts with old key
  3. Re-encrypts with new key
  4. Updates rows
- Deploy: Set new key in Railway env, run migration, verify
- Consider upgrading from CBC to GCM mode at the same time (M4)
- Files: 1 migration script + env update

### Fix 5: Bulk error response sanitization (H1)
- Audit all 64 files with error.message leaks
- Replace with safe pattern: `{ error: 'Internal server error' }` or use `lib/api-error.ts`
- Keep detailed errors in server-side logging only
- Files: ~64

### Fix 6: Input length validation (H2)
- Add max length checks to:
  - `montree/messages/route.ts`: messageText (5000), subject (500)
  - `montree/curriculum/generate-description/route.ts`: work_name (255)
- Files: 2

### Fix 7: Environment variable documentation (H3 + H4)
- Add 5 missing vars to `.env.example`
- Convert Stripe PRICE_IDS to throw-on-missing pattern
- Files: 2

### Fix 8: Rate limiting on super-admin endpoints (M6)
- Add `checkRateLimit()` to all super-admin endpoints that don't have it:
  - `audit/route.ts`
  - `schools/route.ts` (PATCH, DELETE already have password but no rate limit)
  - `npo-applications/route.ts`
  - `reduced-rate-applications/route.ts`
  - `reset-password/route.ts`
  - `secure/route.ts`
- Files: 6

---

## Execution Order

1. **Fix 3** (timing-safe comparisons) — foundational, creates shared helper
2. **Fix 1** (audit endpoint auth) — critical exposure
3. **Fix 2** (schools GET auth) — critical exposure
4. **Fix 8** (rate limiting) — defense in depth on same files
5. **Fix 6** (length validation) — quick wins
6. **Fix 7** (env documentation) — quick wins
7. **Fix 5** (error sanitization) — largest scope, bulk work
8. **Fix 4** (encryption key rotation) — needs careful migration

## Estimated Scope
- ~75 files modified
- 1 new file (shared helper for timing-safe password check)
- 1 migration script
- Railway env var update

## Post-Implementation Audit
After all fixes, re-run comprehensive grep checks:
1. `grep -r 'error.message' app/api/` — should be 0 in responses
2. `grep -r '!== process.env' app/api/` — should be 0
3. `grep -r '!== expectedPassword' app/api/` — should be 0
4. Verify all super-admin routes have both auth + rate limiting
5. Test audit endpoint returns 401 without password

## Known Debt (Explicitly Deferred)
- M1: Whale API auth (43 routes) — Phase 10 or auth consolidation
- M2: localStorage → httpOnly migration — auth restructure project
- M3: Parent invite code hashing — low priority
- M5: CSP unsafe-inline removal — complex Next.js integration
