# Phase 4 Plan v3 (Final) — Secret Rotation & Env Hardening

## Audit Summary
Comprehensive security audit found 27 issues:
- 6 CRITICAL (hardcoded secrets, no rate limiting, no security headers, plaintext auth bypass)
- 6 HIGH (insecure fallback defaults, no input validation, XSS in print components, no audit logging)
- 5 MEDIUM (weak password policy, no email validation, hardcoded hash)
- 2 LOW (test credentials, console.log statements)

## Phase 4 Scope: 12 fixes (CRITICAL + HIGH secret/env issues only)

### Fixes Implemented
1. ElevenLabs API key removed from 4 scripts → env var
2. Supabase service role key removed from upload script → env var
3. 870602 removed from useLeadOperations.ts (3 instances) → password prop
4. Story auth plaintext fallback removed → bcrypt only
5. Insecure fallback defaults removed from 3 lib files → throw on missing env
6. Vault route fallbacks removed (3 routes) → return 500 if env missing
7. Vault password hash moved to env var
8. Security headers added to next.config.ts
9. Created .env.example template
10. Updated CLAUDE.md env vars section
11. Updated .env.local with new vars
12. Created handoff doc

### Deferred to Later Phases
- Rate limiting (Phase 5/8)
- Password policy (Phase 5)
- Input validation with zod (Phase 6)
- CSP header (Phase 6)
- document.write XSS (Phase 6)
- Montree audit logging (Phase 7)
- Production secret rotation to strong randoms (Phase 9)

### Plan Refinement History
- v1: Initial 13-fix plan from audit
- v2: Self-audit identified useLeadOperations.ts uses password prop (simpler fix), CSP needs Next.js tuning, document.write is Phase 6
- v3: Final — 12 fixes, deferred CSP and document.write to Phase 6
