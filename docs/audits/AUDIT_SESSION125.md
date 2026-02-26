# 🔍 MONTREE DEEP AUDIT REPORT
## Session 125 - January 29, 2026

---

## EXECUTIVE SUMMARY

| Category | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical Bugs | 4 | 4 | 0 |
| Security Issues | 2 | 1 | 1 |
| Missing Features | 8 | 0 | 8 |
| Optimizations | 6 | 0 | 6 |

**Build Status:** ✅ 306 pages, 0 errors

---

## 🐛 BUGS FIXED

### 1. Wrong Table Names (CRITICAL)
**Files:** 
- `/api/montree/parent/reports/route.ts`
- `/api/montree/parent/report/[reportId]/route.ts`

**Issue:** Code was querying `weekly_reports` and `child_work_progress` tables, but actual tables are:
- `montree_weekly_reports`
- `montree_child_progress`

**Impact:** Would have caused runtime errors when parents try to view reports.

**Fixed:** ✅ Changed all references to correct table names.

---

### 2. Plaintext Password Comparison (SECURITY)
**Files:**
- `/api/montree/parent/login/route.ts` 
- `/api/montree/parent/signup/route.ts`

**Issue:** Parent authentication was comparing plaintext passwords instead of using bcrypt hashing.

```javascript
// BEFORE (insecure)
if (parent.password_hash !== password)

// AFTER (secure)
const validPassword = await bcrypt.compare(password, parent.password_hash);
```

**Fixed:** ✅ Both files now use bcrypt properly.

---

## ⚠️ REMAINING SECURITY CONCERNS

### No Server-Side Session Validation
**Severity:** MEDIUM

**Issue:** API routes trust client-side headers (`x-school-id`, `x-principal-id`) without JWT/token validation. A malicious user could forge these headers.

**Recommendation:** Implement one of:
- JWT tokens with expiry
- Supabase Auth integration
- Server-side session store (Redis)

---

## 📋 MISSING FEATURES (Priority Ordered)

### HIGH PRIORITY

| Feature | Description | Effort |
|---------|-------------|--------|
| Password Reset | No way to recover forgotten passwords | 4 hrs |
| Rate Limiting | Login endpoints vulnerable to brute force | 2 hrs |
| Session Expiry | Sessions never expire - security risk | 1 hr |

### MEDIUM PRIORITY

| Feature | Description | Effort |
|---------|-------------|--------|
| Email Verification | Parent signup doesn't verify email | 3 hrs |
| Push Notifications | PWA could notify parents of new reports | 4 hrs |
| Offline Queue | Teachers can't save progress when offline | 6 hrs |
| Session Consolidation | 5 different localStorage keys | 2 hrs |

### LOW PRIORITY

| Feature | Description | Effort |
|---------|-------------|--------|
| Audit Logging | Track admin actions for compliance | 4 hrs |
| Data Export | GDPR compliance for parent data | 3 hrs |
| Image Optimization | Use next/image for student photos | 2 hrs |
| Code Splitting | Lazy load game components | 3 hrs |

---

## 🔄 INCONSISTENCIES FOUND

### Session Key Proliferation
Currently using 5 different localStorage keys:
```
montree_session (7 uses) - teacher
montree_school (14 uses) - school context
montree_principal (4 uses) - principal
montree_parent_session (2 uses) - parent
current_student_id (8 uses) - selected child
```

**Recommendation:** Consolidate to 3 role-based sessions:
- `montree_teacher_session`
- `montree_principal_session` 
- `montree_parent_session`

### Auth Pattern Inconsistency
| Role | Password Method | Status |
|------|----------------|--------|
| Teacher | bcrypt | ✅ Correct |
| Parent | bcrypt | ✅ Fixed |
| Principal | SHA256 | ⚠️ Different system |

---

## 🚀 OPTIMIZATION OPPORTUNITIES

### 1. API Route Consolidation
**Current:** 60+ API routes with duplicate boilerplate
**Suggestion:** Create shared middleware for auth, error handling, logging

### 2. Curriculum Caching
**Current:** Works/curriculum fetched on every page load
**Suggestion:** Cache in React Query or SWR - data rarely changes

### 3. Database Indexes
**Verify indexes exist for:**
- `montree_child_progress(child_id)`
- `montree_child_progress(classroom_id)`  
- `montree_weekly_reports(child_id)`

### 4. Bundle Size
**Current:** All 30+ games loaded in main bundle
**Suggestion:** Dynamic imports for each game page

---

## ✅ WHAT'S WORKING WELL

1. **RLS Policies:** 69 Row Level Security policies in place
2. **Auth Module:** Good `lib/montree/auth.ts` for session management
3. **Error Handling:** Most API routes have try/catch with proper status codes
4. **Email System:** Complete Resend integration with HTML templates
5. **PDF Generation:** Full PDFKit implementation ready
6. **PWA Setup:** Service worker and manifest configured
7. **Mobile CSS:** iOS safe areas, touch targets added

---

## 📁 FILES MODIFIED IN AUDIT

| File | Change |
|------|--------|
| `/api/montree/parent/reports/route.ts` | Fixed table name |
| `/api/montree/parent/report/[reportId]/route.ts` | Fixed 2 table names |
| `/api/montree/parent/login/route.ts` | Added bcrypt |
| `/api/montree/parent/signup/route.ts` | Added bcrypt hashing |

---

## 🎯 RECOMMENDED NEXT STEPS

### This Week
1. ✅ Deploy current build (all critical bugs fixed)
2. Run seed script in production Supabase
3. Add simple rate limiting (express-rate-limit or custom)

### Next Week
4. Implement password reset flow
5. Add session expiry (24hr for parents, 7 days for teachers)
6. Email verification for parent signup

### Future
7. Push notifications
8. Offline progress queue
9. Full audit logging

---

## 💡 QUICK REFERENCE

**Demo Login:**
- Principal: `principal@sunshine.demo` / `demo123`
- Teachers: `butter1`, `rainbo2`
- Parent Invites: `MIA001`, `LUK002`, `EMM003`...

**Key URLs:**
- Teacher Login: `/montree/login`
- Principal Login: `/montree/principal/login`
- Parent Signup: `/montree/parent/signup?code=XXX`
- Admin Dashboard: `/montree/admin`

**Build Command:** `npm run build`
**Dev Server:** `npm run dev` → http://localhost:3000
