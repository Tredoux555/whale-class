# Handoff: Teacher Login Code Fix (Feb 17, 2026)

## Problem

Teacher login codes generated during principal onboarding didn't work. Entering the 6-char code at `/montree/login` always returned "Invalid code" (401).

## Root Cause

**Three separate bugs** across different teacher-creation routes:

### Bug 1: No `password_hash` in setup routes (CRITICAL)
`principal/setup-stream/route.ts` and `principal/setup/route.ts` created teachers with only `login_code` — they never set `password_hash`. The auth route's primary lookup (Step 1) does `legacySha256(code)` and queries `.eq('password_hash', codeHash)`. With `password_hash` as NULL, Step 1 always missed.

### Bug 2: Lowercase vs uppercase case mismatch (CRITICAL)
Setup routes used charset `'abcdefghjkmnpqrstuvwxyz23456789'` (lowercase), but the auth route normalizes input to `.toUpperCase()` and queries `.eq('login_code', normalizedCode)`. Lowercase "j68kbn" in DB never matched uppercase "J68KBN" in query. Step 2 always missed.

### Bug 3: `onboarding/route.ts` used bcrypt instead of SHA-256
Onboarding route used `hashPassword(loginCode)` (bcrypt) for `password_hash`, but the auth route's Step 1 does SHA-256 lookup. bcrypt hash never matches SHA-256 hash. Also had case issues — generated lowercase, stored `login_code` as uppercase, hashed lowercase.

### Previous fix was incomplete
The earlier fix (commits `b4917e1` + `99a3d0b`) only fixed `admin/teachers/route.ts` and `try/instant/route.ts`. The principal setup routes and onboarding route were missed because they have their own copies of `generateLoginCode()`.

## Fix (commit `68887b2`)

### 5 files modified:

**`app/api/montree/principal/setup-stream/route.ts`**
- Added `import { legacySha256 } from '@/lib/montree/password'`
- Changed charset to uppercase: `'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'`
- Added `password_hash: legacySha256(loginCode)` to teacher insert

**`app/api/montree/principal/setup/route.ts`**
- Same 3 changes as setup-stream

**`app/api/montree/onboarding/route.ts`**
- Changed import: `hashPassword` → `legacySha256`
- Changed charset to uppercase
- Changed `await hashPassword(loginCode)` → `legacySha256(loginCode)`
- Removed redundant `loginCode.toUpperCase()` on `login_code` field (code is already uppercase)

**`app/api/montree/auth/teacher/route.ts`**
- Step 2: Changed `.eq('login_code', normalizedCode)` → `.ilike('login_code', normalizedCode)` (case-insensitive)
- Step 2: Added NULL `password_hash` handling — if no hash, trusts `login_code` match
- Step 2: If hash exists but uppercase verify fails, tries lowercase verify too
- Step 3: Bcrypt fallback also tries lowercase code (`verifyPassword(normalizedCode.toLowerCase(), hash)`)

**`app/api/montree/principal/login/route.ts`**
- Bcrypt fallback tries both uppercase and lowercase code

## Auth Flow After Fix (3 scenarios)

### New teacher (created after fix)
1. Code generated uppercase (e.g., "J68KBN")
2. `password_hash = legacySha256("J68KBN")`, `login_code = "J68KBN"`
3. Login: Step 1 → SHA-256 match → ✅ Success

### Old teacher (NULL hash, lowercase login_code in DB)
1. DB: `login_code = "j68kbn"`, `password_hash = NULL`
2. Login "j68kbn" → normalized to "J68KBN"
3. Step 1: SHA-256 vs NULL → miss
4. Step 2: `.ilike('login_code', 'J68KBN')` → finds "j68kbn" → hash is NULL → trust match → ✅ Success

### Old teacher (bcrypt hash of lowercase code)
1. DB: `password_hash = bcrypt("j68kbn")`, no login_code
2. Login "j68kbn" → normalized to "J68KBN"
3. Step 1: SHA-256 vs bcrypt → miss
4. Step 2: no login_code → miss
5. Step 3: iterate all, try uppercase → fail, try lowercase → bcrypt.compare("j68kbn", hash) → ✅ Success

## All Teacher Creation Routes (now consistent)

| Route | Charset | password_hash | login_code |
|-------|---------|---------------|------------|
| `admin/teachers` | UPPERCASE | `legacySha256(code)` | ❌ not stored |
| `try/instant` | UPPERCASE | `legacySha256(code.toUpperCase())` | `code.toUpperCase()` |
| `principal/setup-stream` | UPPERCASE | `legacySha256(code)` | `code` (already uppercase) |
| `principal/setup` | UPPERCASE | `legacySha256(code)` | `code` (already uppercase) |
| `onboarding` | UPPERCASE | `legacySha256(code)` | `code` (already uppercase) |

## Known Charset Inconsistency (pre-existing, harmless)
- `try/instant`: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (29 chars, no L)
- All others: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (30 chars, has L)
- Only means `try/instant` codes never contain L. Not a bug, just inconsistent.

## Commits
- `b4917e1` — Initial fix (admin/teachers + try/instant + auth fallback)
- `99a3d0b` — Audit cleanup (dead imports + comment fix)
- `68887b2` — Complete fix (setup routes + onboarding + case-insensitive auth)

## Testing
After Railway deploys, test:
1. Create a new school via principal onboarding → try the generated teacher code at `/montree/login`
2. Create a teacher from the principal classroom detail page → try that code
3. Try existing old codes that were broken before
