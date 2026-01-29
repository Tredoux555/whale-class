# HANDOFF SESSION 126 - Railway Deploy Fixes

**Date:** 2026-01-29  
**Status:** ✅ DEPLOYED TO PRODUCTION  
**Commits:** 51c036a → f241553 → 39dfa85 → c8a3d8b

---

## SUMMARY

Pushed Sessions 119-125 to production (98 files, +13,709 lines) but hit **Railway build failures** due to module-level initializations that read environment variables at build time. Railway doesn't inject env vars during build - only at runtime. Fixed 5 files across 4 commits.

---

## THE PROBLEM

**Root cause:** Next.js pre-renders pages during build. When API routes initialize clients (Supabase, Resend) at module-level, they execute during build when env vars aren't available.

```typescript
// ❌ BAD - Runs at build time, env vars not available
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,  // undefined during build!
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ GOOD - Runs at runtime when API is called
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

---

## FILES FIXED

### 1. lib/montree/supabase.ts
- Moved env var reading inside `getSupabase()` function
- Commit: f241553

### 2. app/api/montree/focus-works/route.ts
- Changed from module-level `const supabase = createClient(...)` 
- Added `getSupabase()` helper function
- Call `getSupabase()` inside each handler
- Commit: 39dfa85

### 3. app/api/montree/analysis/route.ts
- Same pattern: module-level → runtime function
- Commit: 39dfa85

### 4. app/api/montree/reports/generate/route.ts
- Same pattern: module-level → runtime function
- Commit: 39dfa85

### 5. lib/montree/email.ts
- Changed `const resend = new Resend(...)` to lazy init
- Added `getResend()` and `getFromEmail()` helpers
- Updated 3 email send calls to use the helpers
- Commit: c8a3d8b

---

## HOW TO IDENTIFY THIS ISSUE

Railway build logs show errors like:
```
Error: supabaseUrl is required.
Error: Failed to collect page data for /api/montree/[route]
```

or:
```
Error: Missing API key. Pass it to the constructor
Error: Failed to collect page data for /api/montree/[route]
```

**To find problematic files:**
```bash
# Find module-level Supabase initializations
grep -rn "^const supabase = createClient" --include="*.ts" app/

# Find module-level Resend initializations  
grep -rn "^const resend = new Resend" --include="*.ts" lib/
```

---

## THE FIX PATTERN

### For Supabase:
```typescript
// Remove this:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Add this:
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Then in handlers:
export async function GET(request: NextRequest) {
  const supabase = getSupabase();  // ← Call inside handler
  // ...
}
```

### For Resend:
```typescript
// Remove this:
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'default';

// Add this:
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const getFromEmail = () => process.env.RESEND_FROM_EMAIL || 'default';
```

---

## SESSIONS 119-125 FEATURES DEPLOYED

This deploy included all these features:
- PWA: Service worker, install banner, offline page, app icons
- Auth: Context provider, session validation, RLS policies
- Principal Dashboard: Teachers page, reports page, billing UI
- Billing: Stripe checkout, webhook, status API
- Parent Portal: Signup, login, dashboard with live stats
- Reports: PDF export, detailed progress views
- Mobile: iOS safe areas, touch targets, input zoom fix
- Security: Fixed bcrypt for parent auth, corrected table names
- Teacher: Onboarding flow, multi-classroom support
- AI: Recommendation engine, weekly analyzer, sensitive periods

---

## BUILD STATUS

```
✅ 306 pages compiled
✅ 0 TypeScript errors
✅ All routes accessible
✅ PRODUCTION READY
```

---

## LIVE URL

https://teacherpotato.xyz/montree

---

## FUTURE PREVENTION

When creating new API routes that need external services:

1. **Never** initialize clients at module level
2. **Always** use a getter function pattern
3. **Test locally** with `npm run build` before pushing
4. If build fails with "Missing X" errors, check for module-level inits

---

## COMMITS SUMMARY

| Commit | Description |
|--------|-------------|
| 51c036a | Sessions 119-125 features (98 files) |
| f241553 | Fix: lib/montree/supabase.ts |
| 39dfa85 | Fix: focus-works, analysis, reports/generate |
| c8a3d8b | Fix: lib/montree/email.ts (Resend) |

---

**Session 126 Complete** ✅
