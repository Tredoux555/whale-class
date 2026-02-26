# Audit: Location Tracking Implementation (Feb 16, 2026)

## Summary

Conducted comprehensive audit of location tracking feature. Found **2 security issues** and **3 improvements needed**. All critical issues have fixes ready.

## ✅ What's Working Well

### Database Migration (PASS)
- ✅ All columns nullable (backward compatible with existing records)
- ✅ VARCHAR lengths appropriate (100 for names, 2 for codes, 45 for IPv6)
- ✅ `IF NOT EXISTS` prevents errors on re-run
- ✅ Index on `signup_country` for analytics
- ✅ Column comments for documentation
- ✅ No breaking changes

### API Integration (PASS)
- ✅ Non-blocking: signup succeeds even if geolocation fails
- ✅ Proper error handling with try-catch
- ✅ Location captured AFTER school creation (no race condition)
- ✅ Debug tracking in `steps` array
- ✅ Diagnostic logging with `[IP-GEO]` prefix

### UI Rendering (PASS)
- ✅ Handles all null states gracefully (shows "Unknown" + 🌍)
- ✅ Flag emoji generation is safe (returns globe for invalid codes)
- ✅ Timezone display is conditional (only shows if present)
- ✅ Location formatting handles city-only, country-only, and null cases
- ✅ TypeScript types updated correctly

### Type Safety (PASS)
- ✅ All new fields added to `School` interface as optional nullable
- ✅ `LocationData` interface properly typed
- ✅ No `any` types introduced
- ✅ Import paths use `@/` alias correctly

---

## 🚨 Issues Found

### Issue 1: HTTP Instead of HTTPS (SECURITY - HIGH)
**File:** `lib/ip-geolocation.ts:78`
**Severity:** HIGH (Security + Mixed Content)

```typescript
// CURRENT (INSECURE):
const response = await fetch(`http://ip-api.com/json/${ip}?fields=...`, {
```

**Problems:**
1. **Security:** IP addresses sent over unencrypted HTTP
2. **Mixed Content:** HTTPS app calling HTTP API triggers browser warnings
3. **MITM Risk:** Attacker could intercept and modify geolocation responses

**Fix:** Change to `https://` (ip-api.com supports HTTPS on free tier)

```typescript
// FIXED:
const response = await fetch(`https://ip-api.com/json/${ip}?fields=...`, {
```

**Impact:** Low (geolocation is non-critical), but security best practice

---

### Issue 2: Incomplete Private IP Detection (LOGIC - MEDIUM)
**File:** `lib/ip-geolocation.ts:70`
**Severity:** MEDIUM (Wasted API calls)

```typescript
// CURRENT (INCOMPLETE):
if (
  ip === '127.0.0.1' ||
  ip === '::1' ||
  ip.startsWith('192.168.') ||
  ip.startsWith('10.') ||
  ip.startsWith('172.')  // ❌ WRONG: Should be 172.16-31.x.x only
) {
```

**Problem:** Detects ALL `172.x.x.x` as private, but only `172.16.0.0/12` (172.16-31.x.x) is actually private. Public IPs like `172.0.x.x` or `172.32.x.x` would be incorrectly skipped.

**Fix:** Proper RFC 1918 range detection

```typescript
// FIXED:
const isPrivateIP = (ip: string): boolean => {
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1] || '0', 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  return false;
};
```

**Impact:** Medium (could waste API calls or miss valid IPs)

---

### Issue 3: IPv6 Private Ranges Not Detected (IMPROVEMENT - LOW)
**File:** `lib/ip-geolocation.ts:65-72`
**Severity:** LOW (Minor edge case)

**Missing IPv6 ranges:**
- `fc00::/7` — Unique Local Addresses (ULA)
- `fe80::/10` — Link-local addresses

**Fix:** Add IPv6 private range checks

```typescript
// Check IPv6 private ranges
if (ip.startsWith('fc') || ip.startsWith('fd')) return true;  // fc00::/7
if (ip.startsWith('fe80:')) return true;  // Link-local
```

**Impact:** Very low (IPv6 adoption still limited, localhost already handled)

---

### Issue 4: No Rate Limit Protection (IMPROVEMENT - LOW)
**File:** `lib/ip-geolocation.ts`
**Severity:** LOW (Free tier = 45 req/min)

**Current:** No client-side rate limit tracking

**Risk:** If signup burst exceeds 45/min, API returns errors but we don't track or throttle

**Recommendation:** Add simple in-memory rate limit counter (optional)

```typescript
// Optional: Track API calls to stay under 45/min
let apiCallCount = 0;
let resetTime = Date.now() + 60000;

if (Date.now() > resetTime) {
  apiCallCount = 0;
  resetTime = Date.now() + 60000;
}

if (apiCallCount >= 40) {  // Leave 5-call buffer
  console.warn('[IP-GEO] Rate limit approaching, skipping lookup');
  return defaultLocation;
}

apiCallCount++;
```

**Impact:** Very low (realistic signup rate is ~2-3/min max)

---

### Issue 5: Cloudflare Proxy Headers Prioritized Incorrectly (IMPROVEMENT - LOW)
**File:** `lib/ip-geolocation.ts:20-42`
**Severity:** LOW (Railway doesn't use Cloudflare currently)

**Current Order:**
1. `x-forwarded-for`
2. `x-real-ip`
3. `cf-connecting-ip`

**Problem:** Cloudflare's `cf-connecting-ip` is more trustworthy than `x-forwarded-for` (which can be spoofed), but it's checked last.

**Recommendation:** Prioritize `cf-connecting-ip` first if present

```typescript
// Check CF-Connecting-IP first (most trusted if Cloudflare proxy)
const cfIP = headers.get('cf-connecting-ip');
if (cfIP) return cfIP.trim();

// Then x-forwarded-for
const forwarded = headers.get('x-forwarded-for');
if (forwarded) return forwarded.split(',')[0].trim();

// Finally x-real-ip
const realIP = headers.get('x-real-ip');
if (realIP) return realIP.trim();
```

**Impact:** Low (Railway uses Railway Proxy, not Cloudflare)

---

## 📋 Recommended Fixes

### Priority 1: Critical Security Fix (Issue #1)
**Fix now:** Change HTTP to HTTPS

### Priority 2: Logic Bug Fix (Issue #2)
**Fix now:** Proper 172.16-31.x.x range detection

### Priority 3: Optional Enhancements (Issues #3-5)
**Fix later:** IPv6 ranges, rate limiting, header priority

---

## Test Coverage Needed

### Manual Testing
- [ ] Create trial from South Africa (should show 🇿🇦 + Cape Town)
- [ ] Create trial from VPN (should show VPN exit location)
- [ ] Create trial from localhost (should show "Unknown" + 🌍)
- [ ] Verify existing schools show "Unknown" (NULL columns)
- [ ] Test with IPv6 address (if available)

### Edge Cases
- [ ] API timeout (5s) → signup should succeed
- [ ] API returns error → signup should succeed
- [ ] Private IP → skip geolocation, signup succeeds
- [ ] Invalid country code → show globe emoji
- [ ] NULL timezone → hide timezone line

### Load Testing
- [ ] 10 concurrent signups → all should complete
- [ ] 50 signups in 1 minute → verify rate limit handling

---

## Security Considerations

### Data Privacy ✅
- ✅ IP addresses stored for analytics only (not shown to end users)
- ✅ Location is city-level (not precise coordinates)
- ✅ No PII collected beyond what's already in signup flow
- ✅ GDPR compliant (legitimate interest for fraud prevention)

### API Security
- ⚠️ HTTP endpoint (should be HTTPS) — **FIX PRIORITY 1**
- ✅ No API key exposed (ip-api.com doesn't require one)
- ✅ Timeout prevents hanging requests (5s)
- ✅ Graceful degradation on failures

### Input Validation
- ✅ IP addresses validated (private ranges skipped)
- ✅ API response validated (`data.status === 'success'`)
- ✅ Country code length validated (must be 2 chars)
- ✅ All fields coerced to null if missing

---

## Performance Impact

### Latency
- **Added:** ~200-500ms per signup (geolocation API call)
- **Mitigation:** Non-blocking (runs AFTER school creation)
- **User Impact:** Zero (happens after redirect to dashboard)

### Database
- **Reads:** No impact (columns added, no queries changed)
- **Writes:** +6 columns on `montree_schools` INSERT (negligible)
- **Index:** +1 index on `signup_country` (3-5KB per 100 schools)

### API Quota
- **Free tier:** 45 requests/minute (ip-api.com)
- **Expected usage:** 2-3 signups/minute max
- **Buffer:** 15x headroom

---

## Rollback Plan

If issues arise after deploy:

### Option 1: Disable Location Capture
```typescript
// In instant/route.ts, comment out location capture:
// try {
//   steps.push('2b-location');
//   const location = await getLocationFromRequest(req);
//   ...
// }
```

### Option 2: Revert Migration
```sql
-- Remove columns (data loss!)
ALTER TABLE montree_schools
DROP COLUMN IF EXISTS signup_country,
DROP COLUMN IF EXISTS signup_country_code,
DROP COLUMN IF EXISTS signup_city,
DROP COLUMN IF EXISTS signup_region,
DROP COLUMN IF EXISTS signup_ip,
DROP COLUMN IF EXISTS signup_timezone;

DROP INDEX IF EXISTS idx_schools_signup_country;
```

### Option 3: Hide UI Column
```typescript
// In SchoolsTab.tsx, remove <th> and <td> for Location column
```

---

## Conclusion

**Overall Grade: B+ (Good with 2 fixes needed)**

✅ **Strengths:**
- Non-blocking design (signup never fails due to geolocation)
- Comprehensive error handling
- Graceful UI fallbacks
- Type-safe implementation
- Well-documented code

⚠️ **Weaknesses:**
- HTTP endpoint (security issue)
- Incomplete private IP detection (logic bug)

**Recommendation:** Apply Priority 1 & 2 fixes before deploy. Issues #3-5 are optional enhancements that can be added later if needed.

---

**Audit Completed:** Feb 16, 2026
**Auditor:** Claude Sonnet 4.5
**Files Reviewed:** 6 (2 new, 3 modified, 1 migration)
**Issues Found:** 5 (2 high/medium priority, 3 low priority)
