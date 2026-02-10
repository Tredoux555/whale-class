# Handoff: Security Hardening Phase 4 — COMPLETE (Feb 10, 2026)

## Status: Phase 4 DONE + Audited + Deployed. Ready for Phase 5.

---

## What Was Done (Phase 4: Secret Rotation & Env Hardening)

12 fixes across ~20 files:

### Fix 1: ElevenLabs API key removed from 4 scripts
Replaced hardcoded `sk_4758ce62...` with `process.env.ELEVENLABS_API_KEY` + dotenv loader:
- `scripts/generate-elevenlabs-audio.js`
- `scripts/regenerate-audio.js`
- `scripts/regenerate-audio-charlotte.js`
- `scripts/regenerate-all-audio-charlotte.js`

### Fix 2: Supabase service role key removed from script
`scripts/upload-to-supabase.js` — replaced hardcoded JWT with `process.env.SUPABASE_SERVICE_ROLE_KEY`

### Fix 3: `870602` removed from client-side hook
`hooks/useLeadOperations.ts` — 3 instances of hardcoded password replaced with the `password` prop already passed to the hook. Also moved DELETE request password from URL query param to `x-super-admin-password` header. Added `password` to useCallback dependency arrays.

### Fix 4: Story auth plaintext fallback removed
`app/api/story/auth/route.ts` — deleted `USER_PASSWORDS` object with plaintext `'T': 'redoux'` and `'Z': 'oe'`. Users T and Z must now authenticate via bcrypt hashes in `story_users` table. 

### Fix 5: Insecure fallback defaults removed (3 lib files)
- `lib/auth-multi.ts` — removed `|| "montree-secret-change-in-production"`, now throws if AUTH_SECRET/ADMIN_SECRET unset
- `lib/montree/super-admin-security.ts` — removed `|| 'default-key-change-me'`, now throws if SUPER_ADMIN_ENCRYPTION_KEY/MESSAGE_ENCRYPTION_KEY unset
- `lib/message-encryption.ts` — removed `|| 'change-this-to-32-char-key-12345'` and the second fallback, now throws with clear error if MESSAGE_ENCRYPTION_KEY missing or not 32 chars

### Fix 6: Vault route fallbacks removed (3 routes)
Removed `|| 'change-this-in-env'` from:
- `app/api/story/admin/vault/save-from-message/route.ts`
- `app/api/story/admin/vault/download/[id]/route.ts`
- `app/api/story/admin/vault/upload/route.ts`
All now return 500 with "Vault not configured" if VAULT_PASSWORD is missing.

### Fix 7: Vault password hash moved to env var
`app/api/story/admin/vault/unlock/route.ts` — moved bcrypt hash to `process.env.VAULT_PASSWORD_HASH`

### Fix 8: Security headers added
`next.config.ts` — added `headers()` function with:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()
- Strict-Transport-Security: max-age=31536000; includeSubDomains
(CSP deferred to Phase 6 — needs careful tuning for Next.js inline scripts)

### Fix 9: Created `.env.example`
Complete template listing all required environment variables with descriptions.

### Fix 10: Updated CLAUDE.md
Added 11 missing env vars to the Environment Variables section.

### Fix 11: Updated `.env.local`
Added `VAULT_PASSWORD_HASH` and `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`.

---

## Environment Variables Added/Changed

**Must be set in Railway production (new for Phase 4):**
```
VAULT_PASSWORD_HASH=$2b$10$ECecBvSrgN8mfruLKzvdjehcTXZaQonVkUyriGoIKdZPWHvrixssC
ELEVENLABS_API_KEY=<new-rotated-key>
```

**ACTION REQUIRED — Rotate these keys (exposed in git history):**
- ElevenLabs API key: `sk_4758ce62...` was in 4 committed scripts
- Supabase service role key: was in `scripts/upload-to-supabase.js`

---

## Post-Audit Fixes

### Audit Fix 1 (CRITICAL): deleteSchool regression
`app/api/montree/super-admin/schools/route.ts` — DELETE handler only read password from query param, but `useLeadOperations.ts` was updated to send it via `x-super-admin-password` header. Fixed to accept from either source.

### Audit Fix 2: MESSAGE_ENCRYPTION_KEY length
`.env.local` had `"ThisIsA32CharacterSecretKey123!"` which is 31 chars after dotenv strips quotes. The old code silently fell back to `change-this-to-32-char-key-12345`. Set env to match that default for backward compat with existing encrypted messages. Rotate in Phase 9.

### Audit Fix 3: .env.example clarity
Added "no quotes!" note to MESSAGE_ENCRYPTION_KEY line.

---

## Build Fix: Runtime vs Build-Time Env Vars

Railway build crashed with:
```
Error: [super-admin-security] SUPER_ADMIN_ENCRYPTION_KEY or MESSAGE_ENCRYPTION_KEY must be set
```

**Root cause:** `lib/auth-multi.ts` and `lib/montree/super-admin-security.ts` threw errors at module load time. During Next.js build, env vars are NOT available — only at runtime.

**Fix:** Moved env var validation into lazy getter functions:
- `lib/auth-multi.ts`: `const SECRET = ...` → `function getSecretKey(): Uint8Array`
- `lib/montree/super-admin-security.ts`: `const ENCRYPTION_KEY = ...` → `function getEncryptionKey(): string`
- `lib/message-encryption.ts`: Already used `getKey()` — no change needed

**IMPORTANT PATTERN for future phases:** Never validate `process.env.*` at the top level of a module. Always inside a function.

---

## Railway Env Vars Set

| Variable | Status |
|----------|--------|
| `VAULT_PASSWORD_HASH` | ✅ Set |
| `MESSAGE_ENCRYPTION_KEY` | ✅ Set (`change-this-to-32-char-key-12345`) |
| `TEACHER_ADMIN_PASSWORD` | ✅ Set (was missing!) |
| `ELEVENLABS_API_KEY` | ⚠️ Not rotated yet — old key still works |

---

## What Was NOT Changed (Deferred)

- Rate limiting on auth endpoints — Phase 5
- Password policy enforcement — Phase 5
- Input validation (zod/joi) — Phase 6
- Content-Security-Policy header — Phase 6 (needs `unsafe-inline`/`unsafe-eval` tuning)
- `document.write()` XSS in print components — Phase 6
- Montree audit logging — Phase 7
- Weak production passwords (ADMIN_SECRET, SUPER_ADMIN_PASSWORD) — Phase 9 (final rotation)
- Story users T/Z need bcrypt hashes set in DB if they don't already have them

---

## Phases Completed So Far

| Phase | Name | Status |
|-------|------|--------|
| 1 | API Auth (JWT for all routes) | Done |
| 1B | Parent session tokens | Done |
| 2 | bcrypt password migration | Done (100% audited) |
| 3 | Quick security wins (11 fixes) | Done (audited) |
| 4 | Secret rotation & env hardening (12 fixes) | Done (audited) |

---

## Suggested Next Phases

| Phase | Name | Scope |
|-------|------|-------|
| 5 | Password policy & rate limiting | Min password length/complexity, rate limiting on all 15 auth endpoints |
| 6 | Input sanitisation & CSP | XSS prevention, Content-Security-Policy, zod validation, sanitise document.write |
| 7 | Montree audit logging | Login tracking, failed attempts, admin action history for Montree system |
| 8 | Rate limiting & abuse prevention | Brute force protection beyond auth (API abuse) |
| 9 | Production security review | Final: rotate all secrets to strong randoms, verify Railway, remove dev code |

---

## Key Files Changed

| File | What |
|------|------|
| `scripts/*.js` (5 files) | Hardcoded API keys → env vars with dotenv |
| `hooks/useLeadOperations.ts` | 870602 → password prop |
| `app/api/story/auth/route.ts` | Plaintext fallback removed |
| `lib/auth-multi.ts` | Insecure default → lazy `getSecretKey()` with throw |
| `lib/montree/super-admin-security.ts` | Insecure default → lazy `getEncryptionKey()` with throw |
| `app/api/montree/super-admin/schools/route.ts` | DELETE accepts password from header OR query param |
| `lib/message-encryption.ts` | Insecure default → throw |
| `app/api/story/admin/vault/*/route.ts` (4 files) | Fallback defaults removed |
| `next.config.ts` | Security headers added |
| `.env.example` | NEW — complete env var template |

---

## To Resume Work

Start a fresh chat and say:
> "Run the Phase 5 fresh audit command from CLAUDE.md"
