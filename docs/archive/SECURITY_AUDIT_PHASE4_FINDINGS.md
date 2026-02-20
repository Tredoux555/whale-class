# Security Audit Phase 4: Findings (Feb 10, 2026)

## Executive Summary

This audit examines audit logging gaps and environment variable security across the Whale/Montree codebase. **Critical finding: Montree system (teacher/parent/admin) has virtually NO audit logging, while Story system has basic login tracking. Multiple weak/undocumented environment variables pose production risks.**

---

## 1. AUDIT LOGGING GAPS

### 1.1 Story System — BASIC LOGGING (Minimal)

**What's Logged:**
- **User login**: `story_login_logs` table (username, login_at, session_token, ip_address, user_agent, logout_at)
- **Admin login**: `story_admin_login_logs` table (same schema)
- **Message history**: `story_message_history` table (message content, media, author, timestamps)

**GAPS:**
- ❌ NO logging for failed login attempts
- ❌ NO logging for admin actions (message sends, media deletes, vault operations)
- ❌ NO logging for sensitive operations (password changes, vault access, etc.)
- ✅ Token stored (first 50 chars) for session tracking

**Files:**
- `/app/api/story/auth/route.ts` — logs successful user login only
- `/app/api/story/admin/auth/route.ts` — logs successful admin login only
- `/app/api/story/admin/login-logs/route.ts` — retrieves logs (admin view)

---

### 1.2 Montree System — CRITICAL: NO AUDIT LOGGING

**What's Logged:**
- ✅ `last_login_at` timestamp on teacher/parent/principal entities (basic tracking)
- ❌ NOTHING ELSE

**GAPS - ALL SENSITIVE OPERATIONS UNLOGGED:**

#### Teacher Actions (ZERO logging):
- ✅ Teacher login (updates `last_login_at` only)
- ❌ Teacher creates classroom
- ❌ Teacher edits classroom
- ❌ Teacher adds/removes children
- ❌ Teacher deletes children
- ❌ Teacher updates child progress
- ❌ Teacher records observations
- ❌ Teacher creates custom works
- ❌ Teacher modifies curriculum
- ❌ Teacher deletes curriculum items
- ❌ Teacher changes password (via `/api/montree/auth/set-password/route.ts`)
- ❌ Teacher uploads photos/media
- ❌ Teacher deletes media
- ❌ Teacher publishes reports
- ❌ Teacher accesses parent data
- ❌ Teacher messages parents
- ❌ Teacher accesses Guru AI (sensitive analysis)

#### Parent Actions (ZERO logging):
- ✅ Parent login (updates `last_login_at` only)
- ❌ Parent views child photos
- ❌ Parent views reports
- ❌ Parent views milestones
- ❌ Parent messaging (if enabled)

#### Principal/Admin Actions (ZERO logging):
- ✅ Principal login (updates `last_login_at` only)
- ❌ Principal creates school
- ❌ Principal creates classroom
- ❌ Principal manages teachers
- ❌ Principal manages parents
- ❌ Principal views all children/data
- ❌ Super-admin password "login-as" impersonation (`/api/montree/super-admin/login-as/route.ts`)
- ❌ Super-admin creates schools
- ❌ Super-admin manages leads
- ❌ Super-admin sends emails
- ❌ Super-admin accesses super-admin dashboard

#### Failed Login Attempts (ZERO logging):
- ❌ NO tracking of invalid codes
- ❌ NO tracking of invalid email/password combinations
- ❌ NO tracking of IP/user agent for suspicious patterns
- ❌ NO rate limiting (endpoints vulnerable to brute force)

**Critical Endpoints with NO Logging:**
```
Teacher Login:     /api/montree/auth/teacher/route.ts (no audit)
Parent Login:      /api/montree/parent/login/route.ts (no audit, just last_login_at)
Parent Access:     /api/montree/parent/auth/access-code/route.ts (no audit)
Principal Login:   /api/montree/principal/login/route.ts (no audit)
Set Password:      /api/montree/auth/set-password/route.ts (no audit)
Super-Admin Login: /api/montree/super-admin/login-as/route.ts (no audit)
Delete Child:      /api/montree/children/delete/route.ts (no audit)
Delete Work:       /api/montree/curriculum/delete/route.ts (no audit)
Delete Report:     (search shows no delete endpoint, but data could be corrupted)
```

---

### 1.3 Data-Mutating Endpoints WITHOUT Audit Logging

**Montree sensitive operations unlogged:**
- School registration/creation (principal/register)
- Classroom setup/modifications (principal/setup)
- Teacher creation/modification (admin/teachers)
- Parent creation/modification (admin/parents)
- Child creation/deletion (children routes)
- Work progress updates (progress/update)
- Curriculum modifications (curriculum/*, focus-works)
- Report publishing (reports/send)
- Media/photo deletion (photos, media routes)
- Password changes (auth/set-password)
- Account disabling (is_active flag changes)

**Home system unlogged:**
- Family registration (api/home/auth/try)
- Family login (api/home/auth/login)
- Child creation (api/home/children)
- Curriculum deletion (api/home/curriculum/delete)
- Work progress tracking (api/home/progress/update)

---

### 1.4 Attempted Super-Admin Audit (INCOMPLETE)

**File:** `/app/montree/super-admin/page.tsx` line 45-50
```typescript
const logAction = useCallback(async (action: string, details?: Record<string, unknown>) => {
  try {
    await fetch('/api/montree/super-admin/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
```

**STATUS:** Client-side logging attempted but:
- ❌ `/api/montree/super-admin/audit` endpoint does NOT exist (will 404)
- ❌ No database table exists to store audit logs
- ❌ Only happens on super-admin page, not for teacher/parent/principal actions
- ❌ Client-side, so can be disabled in browser dev tools

---

## 2. ENVIRONMENT VARIABLES AUDIT

### 2.1 All Env Vars Found in Code (28 total)

Extracted from grep of `process.env.*`:

```
process.env.ADMIN_PASSWORD
process.env.ADMIN_SECRET ⚠️ WEAK
process.env.ANTHROPIC_API_KEY
process.env.AUTH_SECRET
process.env.MESSAGE_ENCRYPTION_KEY ⚠️ WEAK
process.env.MONTREE_JWT_SECRET
process.env.NEXT_PUBLIC_ADMIN_PASSWORD ⚠️ EXPOSED
process.env.NEXT_PUBLIC_APP_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
process.env.NODE_ENV
process.env.RAILWAY_ENVIRONMENT
process.env.RESEND_API_KEY
process.env.RESEND_FROM_EMAIL
process.env.STORY_ADMIN_JWT_SECRET
process.env.STORY_JWT_SECRET
process.env.STRIPE_PRICE_BASIC
process.env.STRIPE_PRICE_PREMIUM
process.env.STRIPE_PRICE_STANDARD
process.env.STRIPE_SECRET_KEY
process.env.STRIPE_WEBHOOK_SECRET
process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.SUPER_ADMIN_ENCRYPTION_KEY
process.env.SUPER_ADMIN_PASSWORD
process.env.TEACHER_ADMIN_PASSWORD
process.env.VAULT_PASSWORD ⚠️ WEAK
process.env.VERCEL
```

### 2.2 Current .env.local Values (DEVELOPMENT)

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

ADMIN_SECRET=whale-class-secret-change-in-production ⚠️ WEAK
ADMIN_USERNAME=Tredoux
ADMIN_PASSWORD=870602 ⚠️ WEAK NUMERIC
SUPER_ADMIN_PASSWORD=870602 ⚠️ WEAK NUMERIC (DOCUMENTED)
TEACHER_ADMIN_PASSWORD=Potato ⚠️ WEAK (DOCUMENTED)

ANTHROPIC_API_KEY=sk-ant-api03-... ✅ (external API)
STORY_JWT_SECRET=d5bf08e535...9ba85f24... ✅ (32 bytes hex)

DATABASE_URL=postgresql://postgres...8706025176086@... ⚠️ PASSWORD IN URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... ✅ (JWT)
SUPABASE_SERVICE_ROLE_KEY=eyJ... ✅ (JWT)
NEXT_PUBLIC_SUPABASE_URL=https://... ✅ (public URL OK)

VAULT_PASSWORD=zoemylove ⚠️ WEAK (DOCUMENTED)
MESSAGE_ENCRYPTION_KEY="ThisIsA32CharacterSecretKey123!" ⚠️ WEAK (PLACEHOLDER)

NEXT_PUBLIC_YOUTUBE_API_KEY=AIzaSyBk... ✅ (external API)

OPENAI_API_KEY=sk-proj-... ✅ (external API)

RESEND_API_KEY=re_REPLACE_WITH_YOUR_KEY ⚠️ PLACEHOLDER
RESEND_FROM_EMAIL=Montree <onboarding@resend.dev> ⚠️ TEST EMAIL
```

### 2.3 CLAUDE.md Documentation Coverage

**What's documented (lines 148-158):**
```
NEXT_PUBLIC_SUPABASE_URL ✅
SUPABASE_SERVICE_ROLE_KEY ✅
RESEND_API_KEY ✅
ADMIN_PASSWORD ✅
ADMIN_SECRET ⚠️ (noted as WEAK, needs rotation)
SUPER_ADMIN_PASSWORD ✅
TEACHER_ADMIN_PASSWORD ✅ (added Phase 3)
STORY_JWT_SECRET ✅
```

**What's NOT documented:**
- ❌ ANTHROPIC_API_KEY (used in guru system)
- ❌ STORY_ADMIN_JWT_SECRET (found in code but missing from .env.local!)
- ❌ AUTH_SECRET (found in code, not in env)
- ❌ MONTREE_JWT_SECRET (found in code, not in env)
- ❌ MESSAGE_ENCRYPTION_KEY (DOCUMENTED but weak value)
- ❌ NEXT_PUBLIC_ADMIN_PASSWORD (used in super-admin page, NOT in .env.local)
- ❌ VAULT_PASSWORD (DOCUMENTED but weak value)
- ❌ DATABASE_URL (has password in URL!)
- ❌ Stripe variables (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.)
- ❌ NEXT_PUBLIC_YOUTUBE_API_KEY
- ❌ OPENAI_API_KEY
- ❌ RESEND_FROM_EMAIL

### 2.4 Production Readiness Issues

**Railway production may be MISSING:**
- STORY_ADMIN_JWT_SECRET (code expects it, not in CLAUDE.md)
- AUTH_SECRET (referenced in code)
- MONTREE_JWT_SECRET (referenced in code)
- NEXT_PUBLIC_ADMIN_PASSWORD (used but not listed)

**Railway production may be WEAK:**
- ADMIN_SECRET still at placeholder "whale-class-secret-change-in-production"
- VAULT_PASSWORD still at "zoemylove"
- MESSAGE_ENCRYPTION_KEY still at "ThisIsA32CharacterSecretKey123!"

---

## 3. WEAK/DEFAULT VALUES

### CRITICAL — Weak Secrets

| Env Var | Current Value | Issue | Location |
|---------|---------------|-------|----------|
| `ADMIN_SECRET` | `whale-class-secret-change-in-production` | **Obvious placeholder** | `.env.local` + CLAUDE.md notes it |
| `ADMIN_PASSWORD` | `870602` | **Simple 6-digit numeric** | `.env.local` |
| `SUPER_ADMIN_PASSWORD` | `870602` | **Same simple numeric** | `.env.local` |
| `TEACHER_ADMIN_PASSWORD` | `Potato` | **Dictionary word** | `.env.local` |
| `VAULT_PASSWORD` | `zoemylove` | **Dictionary phrase** | `.env.local` + CLAUDE.md notes it |
| `MESSAGE_ENCRYPTION_KEY` | `ThisIsA32CharacterSecretKey123!` | **Obvious placeholder comment embedded** | `.env.local` |

### EXPOSED — Public Secrets

| Env Var | Issue | File | Line |
|---------|-------|------|------|
| `NEXT_PUBLIC_ADMIN_PASSWORD` | **Used in client-side code** (super-admin page) | `/app/montree/super-admin/page.tsx` | 112 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public by design** (anon key OK) | N/A | OK |
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | **Public API key** (expected) | N/A | OK |

**Problem:** `NEXT_PUBLIC_ADMIN_PASSWORD` should NOT be in client code. This exposes super-admin password in browser bundles.

### UNDOCUMENTED — Missing from CLAUDE.md

| Env Var | Used Where | Doc Status |
|---------|-----------|-----------|
| `ANTHROPIC_API_KEY` | Guru system AI | ❌ Missing |
| `STORY_ADMIN_JWT_SECRET` | Story admin auth | ❌ Missing |
| `AUTH_SECRET` | (grep found it) | ❌ Missing |
| `MONTREE_JWT_SECRET` | JWT creation | ❌ Missing |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Super-admin page | ❌ Missing |
| `DATABASE_URL` | Supabase connection | ❌ Missing |
| `STRIPE_SECRET_KEY` | (in .env.stripe.example) | ❌ Missing |
| `STRIPE_WEBHOOK_SECRET` | (in .env.stripe.example) | ❌ Missing |
| `STRIPE_PRICE_*` (3 vars) | Stripe pricing | ❌ Missing |
| `OPENAI_API_KEY` | Image generation | ❌ Missing |
| `RESEND_FROM_EMAIL` | Email service config | ❌ Missing |

---

## 4. HARDCODED CREDENTIALS

### Found in Code (Not .env)

**Story System Hardcoded Users:**

File: `/app/api/story/auth/route.ts` (lines 5-8)
```typescript
const USER_PASSWORDS: Record<string, string> = {
  'T': 'redoux',      // Fallback password for username 'T'
  'Z': 'oe',          // Fallback password for username 'Z'
};
```

**STATUS:** These are hardcoded fallback credentials in production code. If DB fails, these work.

File: `/app/api/story/admin/auth/route.ts` (lines 6-8)
```typescript
const ADMIN_USERS: Record<string, string> = {
  'T': 'redoux',      // Same fallback for admin
  'Z': 'oe',          // Same fallback for admin
};
```

**RISK:** Simple single-letter usernames + short passwords.

---

## 5. DEBUG/DEV CODE EXPOSED

### Development Endpoints in Production

File: `/app/api/home/debug/route.ts`
```typescript
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
}
```

**STATUS:** ✅ Protected — won't run in production. But exists and could be re-enabled.

---

## 6. FAILED LOGIN ATTEMPT TRACKING

**Status:** ❌ NONE

All auth endpoints return generic `401 Unauthorized` without logging:
- Teacher login failures: `/api/montree/auth/teacher/route.ts` line 84
- Parent login failures: `/api/montree/parent/login/route.ts` line 33
- Principal login failures: `/api/montree/principal/login/route.ts` line 106
- Parent invite failures: `/api/montree/parent/auth/access-code/route.ts` line 44

**No tracking of:**
- Repeated failed attempts from same IP
- Credential stuffing patterns
- Brute force attacks

---

## 7. SENSITIVE OPERATIONS WITHOUT LOGGING

### Password Changes (ZERO audit trail)

File: `/api/montree/auth/set-password/route.ts`
- ❌ No log of who changed the password
- ❌ No log of when it changed
- ❌ No log of what the old password was
- ❌ No validation who's allowed to call this

### Data Deletions (ZERO audit trail)

Examples:
- `/api/montree/curriculum/delete/route.ts` — deletes work from curriculum
- `/api/montree/leads/route.ts` — deletes lead + DM messages
- `/api/montree/principal/register/route.ts` — rolls back school creation on error

**None log who deleted what or when.**

---

## SEVERITY RANKING

### 🔴 CRITICAL (Fix immediately)

1. **Montree: Zero Audit Logging** (all auth + data mutations)
   - File: Multiple (`/api/montree/auth/*`, `/api/montree/*/delete*`)
   - Issue: No way to investigate security incidents, data tampering, or unauthorized access
   - Recommendation: Create `montree_audit_logs` table + log all auth/mutations

2. **Environment Variable Exposure**
   - File: `/app/montree/super-admin/page.tsx` line 112
   - Issue: `NEXT_PUBLIC_ADMIN_PASSWORD` stored in client bundle
   - Recommendation: Move to server-side auth check, return session token instead

3. **Weak Secrets in Production**
   - Files: `.env.local`
   - Issue: `ADMIN_SECRET`, `VAULT_PASSWORD`, `MESSAGE_ENCRYPTION_KEY` are placeholders
   - Recommendation: Generate 32+ byte random secrets for Railway production

4. **Missing Environment Variables**
   - Files: CLAUDE.md + Railway config
   - Issue: STORY_ADMIN_JWT_SECRET, AUTH_SECRET, MONTREE_JWT_SECRET not documented/set
   - Recommendation: Add to CLAUDE.md and verify in Railway

### 🟠 HIGH (Fix this phase)

5. **No Failed Login Attempt Tracking**
   - Files: `/api/montree/auth/*`
   - Issue: Can't detect brute force attacks
   - Recommendation: Log failed attempts with IP/user-agent

6. **Password Changes Unlogged**
   - File: `/api/montree/auth/set-password/route.ts`
   - Issue: No audit trail
   - Recommendation: Log before/after with user+timestamp

7. **Hardcoded Fallback Credentials**
   - Files: `/app/api/story/auth/route.ts`, `/app/api/story/admin/auth/route.ts`
   - Issue: Backup passwords in code
   - Recommendation: Move to env vars or remove (use DB-only)

8. **Undocumented Environment Variables**
   - Files: CLAUDE.md
   - Issue: 11 env vars used but not listed
   - Recommendation: Document all 28 vars in CLAUDE.md + note production requirements

### 🟡 MEDIUM (Fix in next iteration)

9. **Super-Admin Audit Endpoint Not Implemented**
   - File: `/app/montree/super-admin/page.tsx` + missing `/api/montree/super-admin/audit`
   - Issue: Logs attempted but endpoint 404s, no table exists
   - Recommendation: Implement audit endpoint + table

10. **Password in Database URL**
    - File: `.env.local`
    - Issue: DATABASE_URL contains actual Supabase password
    - Recommendation: Rotate that password; use service role for connections

---

## RECOMMENDATIONS (PHASE 4 SCOPE)

### 1. Create Audit Logging System (CRITICAL)

**New Table:**
```sql
CREATE TABLE montree_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES montree_schools(id),
  user_type VARCHAR(20), -- 'teacher', 'parent', 'principal', 'super_admin'
  user_id UUID,
  action VARCHAR(100), -- 'login', 'password_change', 'child_create', etc.
  entity_type VARCHAR(50), -- 'child', 'work', 'report', 'account'
  entity_id UUID,
  changes JSONB, -- What changed (old vs new)
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT montree_audit_logs_created_idx ON montree_audit_logs(school_id, created_at DESC)
);
```

**Implement logging on:**
- All auth endpoints (login, logout, password change, failed attempts)
- All data mutations (create, update, delete)
- Access to sensitive data (parent viewing child, teacher access)
- Admin actions (impersonation, school creation, bulk operations)

### 2. Fix Environment Variables (CRITICAL)

**Update CLAUDE.md (Environment Variables section):**
```
ADMIN_SECRET=... # JWT signing, rotate for production
ADMIN_PASSWORD=... # Whale Class admin, change in production
SUPER_ADMIN_PASSWORD=... # Montree super-admin, change in production
TEACHER_ADMIN_PASSWORD=... # Whale Class teacher, change in production
STORY_JWT_SECRET=... # Story system JWT
STORY_ADMIN_JWT_SECRET=... # Story admin JWT (ADD THIS)
AUTH_SECRET=... # (ADD IF USED)
MONTREE_JWT_SECRET=... # (ADD IF USED)
VAULT_PASSWORD=... # Rotate for production (current: zoemylove)
MESSAGE_ENCRYPTION_KEY=... # Rotate for production
ANTHROPIC_API_KEY=... # Guru AI (ADD THIS)
DATABASE_URL=... # (ADD THIS, note: contains password)
OPENAI_API_KEY=... # Image generation (ADD THIS)
RESEND_FROM_EMAIL=... # Email service (ADD THIS)
STRIPE_SECRET_KEY=... # (ADD THIS)
STRIPE_WEBHOOK_SECRET=... # (ADD THIS)
STRIPE_PRICE_*=... # (ADD THESE 3)
```

**Generate strong production secrets:**
- ADMIN_SECRET: Random 32-byte hex
- VAULT_PASSWORD: Random 32-byte hex
- MESSAGE_ENCRYPTION_KEY: Random 32-byte hex
- Others: Rotate if in use

### 3. Remove Client-Side Password Exposure (CRITICAL)

**File:** `/app/montree/super-admin/page.tsx` line 112
- Current: Compares `password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD`
- Problem: Password in client bundle
- Fix: Call server endpoint that checks password, returns JWT token

### 4. Implement Failed Login Tracking (HIGH)

**Add to all auth endpoints:**
```typescript
// On failed login attempt
await supabase.from('montree_audit_logs').insert({
  action: 'login_failed',
  user_type: 'teacher',
  success: false,
  error_message: 'Invalid code',
  ip_address: req.headers.get('x-forwarded-for'),
  user_agent: req.headers.get('user-agent'),
  created_at: new Date().toISOString()
});
```

### 5. Implement Super-Admin Audit Endpoint (HIGH)

**Create:** `/api/montree/super-admin/audit/route.ts`
```typescript
export async function POST(req: NextRequest) {
  // Verify JWT
  // Insert into montree_audit_logs
  // Return success
}
```

---

## FILES TO REVIEW/UPDATE

| File | Change |
|------|--------|
| `CLAUDE.md` | Update Environment Variables section (lines 148-158) |
| `.env.local` | Regenerate secrets for production |
| `.env.stripe.example` | Already exists, good reference |
| `app/api/montree/auth/teacher/route.ts` | Add failed login logging |
| `app/api/montree/parent/login/route.ts` | Add failed login logging |
| `app/api/montree/parent/auth/access-code/route.ts` | Add failed login logging |
| `app/api/montree/principal/login/route.ts` | Add failed login logging |
| `app/api/montree/auth/set-password/route.ts` | Add audit logging |
| `app/montree/super-admin/page.tsx` | Move password check to server-side |
| `app/api/montree/super-admin/audit/route.ts` | CREATE NEW |
| migrations/XXX_montree_audit_logs.sql | CREATE NEW |
| `app/api/story/auth/route.ts` | Move USER_PASSWORDS to env vars or remove |
| `app/api/story/admin/auth/route.ts` | Move ADMIN_USERS to env vars or remove |

---

## SUMMARY TABLE

```
┌─────────────────────────┬────────┬────────────────────────────────────────┐
│ Category                │ Status │ Primary Issue                          │
├─────────────────────────┼────────┼────────────────────────────────────────┤
│ Story System Logging    │ ⚠️     │ Basic login tracking, no failed login  │
│ Montree Auth Logging    │ 🔴     │ ZERO logging, all auth untracked       │
│ Montree Data Logging    │ 🔴     │ ZERO logging, all mutations untracked  │
│ Failed Login Tracking   │ 🔴     │ No attempts logged anywhere            │
│ Password Change Audit   │ 🔴     │ No history, no who/when/what          │
│ Env Var Documentation   │ 🟡     │ 11 vars undocumented, Railway unclear  │
│ Weak Secrets            │ 🔴     │ Placeholders: ADMIN_SECRET, VAULT_PW   │
│ Client-Side Passwords   │ 🔴     │ NEXT_PUBLIC_ADMIN_PASSWORD exposed     │
│ Hardcoded Credentials   │ 🟡     │ Story fallback passwords in code       │
│ Stripe Config           │ 🟡     │ Not in .env.local, only .env.example   │
└─────────────────────────┴────────┴────────────────────────────────────────┘
```

---

## Next Steps (Phase 4)

1. **Week 1:** Create audit logging tables + implement on auth endpoints
2. **Week 2:** Add logging to all data mutations
3. **Week 3:** Fix environment variable exposure + documentation
4. **Week 4:** Rotate weak secrets + test production deployment

See `.claude/plans/phase4-plan-v1.md` for detailed implementation plan.

