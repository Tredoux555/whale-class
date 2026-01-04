# 🔍 STORY PLATFORM DEEP AUDIT
## Date: January 2, 2026
## Status: ISSUES FOUND - FIXES REQUIRED

---

## 📋 EXECUTIVE SUMMARY

The Whale Story Platform has **several critical issues** affecting timestamp handling, database schema mismatches, and frontend display. The timestamp problems are causing user activity to show incorrect times.

**Critical Issues Found: 4**
**Medium Issues Found: 3**
**Low Issues Found: 2**

---

## 🚨 CRITICAL ISSUES

### 1. DATABASE COLUMN NAME MISMATCH ⚠️

**Location:** `app/api/story/auth/route.ts` vs `migrations/009_story_admin_system.sql`

**Problem:** The API inserts data using columns that don't exist in the migration schema.

```
MIGRATION DEFINES:          API CODE USES:
login_time                  login_at        ❌ MISMATCH
session_id                  session_token   ❌ MISMATCH
(missing)                   user_id         ❌ MISSING IN SCHEMA
```

**Impact:** Login logging may be silently failing or using wrong columns.

**Fix Required:**
```sql
-- Run in Supabase SQL Editor to align columns
ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
ALTER TABLE story_login_logs RENAME COLUMN session_id TO session_token;
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
```

---

### 2. TIMESTAMP TYPE MISMATCH (TIMEZONE ISSUES) ⚠️

**Location:** All story migrations use `TIMESTAMP` instead of `TIMESTAMPTZ`

**Problem:** 
- Database columns are `TIMESTAMP` (no timezone)
- Code inserts with `.toISOString()` which is UTC
- Code retrieves and tries to add 'Z' suffix manually
- This causes 8-hour offset for Beijing time display

**Tables Affected:**
- `secret_stories.created_at`, `updated_at`
- `story_users.created_at`
- `story_login_logs.login_time`
- `story_message_history.created_at`, `expires_at`
- `story_admin_users.created_at`, `last_login`
- `vault_files.uploaded_at`

**Fix Required:**
```sql
-- Convert all timestamp columns to TIMESTAMPTZ
ALTER TABLE secret_stories 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE story_login_logs 
  ALTER COLUMN login_at TYPE TIMESTAMPTZ USING login_at AT TIME ZONE 'UTC';

ALTER TABLE story_message_history 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE story_admin_users 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_login TYPE TIMESTAMPTZ USING last_login AT TIME ZONE 'UTC';

ALTER TABLE vault_files 
  ALTER COLUMN uploaded_at TYPE TIMESTAMPTZ USING uploaded_at AT TIME ZONE 'UTC';
```

---

### 3. INCONSISTENT formatTime() FUNCTION

**Location:** `app/story/admin/dashboard/page.tsx` lines 305-340

**Problem:** The `formatTime()` function has complex logic trying to normalize timestamps that shouldn't be needed if the database used TIMESTAMPTZ properly.

**Current Code Issues:**
```typescript
// Replaces space with T - shouldn't be needed
if (timestamp.includes(' ') && !timestamp.includes('T')) {
  timestamp = timestamp.replace(' ', 'T');
}

// Adds Z if missing - causes issues if DB already stored as local
if (!hasTimezone) {
  timestamp = timestamp + 'Z';
}
```

**Fix After DB Migration:**
```typescript
const formatTime = (dateString: string) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return dateString;
  }
};
```

---

### 4. ONLINE USERS CALCULATION BUG

**Location:** `app/api/story/admin/online-users/route.ts`

**Problem:** The `secondsAgo` calculation may be wrong due to timezone issues.

```typescript
// Current code - may fail with TIMESTAMP columns
let loginTime = row.login_at;
if (loginTime && !loginTime.endsWith('Z') && !loginTime.includes('+')) {
  loginTime = loginTime + 'Z';
}
const loginTimestamp = new Date(loginTime).getTime();
```

**Impact:** Users showing as "online" when they're not, or wrong "seconds ago" display.

---

## ⚡ MEDIUM ISSUES

### 5. DUPLICATE getSupabase() / getJWTSecret() FUNCTIONS

**Location:** Multiple files have their own copies instead of using `lib/story-db.ts`

**Files with duplicates:**
- `app/api/story/current/route.ts` (lines 6-16)
- `app/api/story/admin/send-message/route.ts` (lines 6-16)
- `app/api/story/admin/message-history/route.ts` (lines 5-15)

**Fix:** Import from `@/lib/story-db` consistently.

---

### 6. HARDCODED USER CREDENTIALS IN CODE

**Location:** `app/api/story/auth/route.ts` lines 6-9

```typescript
const USER_PASSWORDS: Record<string, string> = {
  'T': 'redoux',
  'Z': 'oe',
};
```

**Risk:** Security issue - credentials in source code.

**Recommendation:** Move to environment variables or database-only auth.

---

### 7. MISSING LOGOUT TRACKING

**Location:** `app/api/story/auth/route.ts` DELETE method

**Problem:** The logout doesn't update `logout_at` in `story_login_logs`.

```typescript
export async function DELETE() {
  return NextResponse.json({ success: true });  // Does nothing!
}
```

**Fix:** Update to mark logout time:
```typescript
export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const supabase = getSupabase();
      await supabase
        .from('story_login_logs')
        .update({ logout_at: new Date().toISOString() })
        .eq('session_token', token.substring(0, 50))
        .is('logout_at', null);
    }
  } catch (e) {
    console.error('[Auth] Logout update failed:', e);
  }
  return NextResponse.json({ success: true });
}
```

---

## 📝 LOW ISSUES

### 8. CONSOLE ERRORS ON MISSING DATA

Multiple places silently catch errors without logging, making debugging harder.

### 9. NO RATE LIMITING ON AUTH ENDPOINTS

Login endpoints don't have rate limiting, allowing brute force attempts.

---

## 🛠️ COMPLETE FIX SQL

Run this in Supabase SQL Editor to fix all database issues:

```sql
-- ============================================
-- STORY PLATFORM DATABASE FIX
-- Run: January 2, 2026
-- ============================================

-- 1. Fix column names in story_login_logs
DO $$ 
BEGIN
  -- Rename login_time to login_at if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'story_login_logs' AND column_name = 'login_time') THEN
    ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
  END IF;
  
  -- Rename session_id to session_token if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'story_login_logs' AND column_name = 'session_id') THEN
    ALTER TABLE story_login_logs RENAME COLUMN session_id TO session_token;
  END IF;
END $$;

-- 2. Add missing columns
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;

-- 3. Convert TIMESTAMP to TIMESTAMPTZ for all tables
-- secret_stories
DO $$ BEGIN
  ALTER TABLE secret_stories 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE secret_stories 
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- story_login_logs
DO $$ BEGIN
  ALTER TABLE story_login_logs 
    ALTER COLUMN login_at TYPE TIMESTAMPTZ USING login_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- story_message_history
DO $$ BEGIN
  ALTER TABLE story_message_history 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_message_history 
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- story_admin_users
DO $$ BEGIN
  ALTER TABLE story_admin_users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_admin_users 
    ALTER COLUMN last_login TYPE TIMESTAMPTZ USING last_login AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- story_users
DO $$ BEGIN
  ALTER TABLE story_users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- vault_files (if exists)
DO $$ BEGIN
  ALTER TABLE vault_files 
    ALTER COLUMN uploaded_at TYPE TIMESTAMPTZ USING uploaded_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- 4. Verify changes
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('secret_stories', 'story_login_logs', 'story_message_history', 'story_admin_users', 'vault_files')
  AND column_name LIKE '%_at%' OR column_name LIKE '%time%'
ORDER BY table_name, column_name;
```

---

## 📱 FRONTEND FIXES NEEDED

After running the SQL, update `app/story/admin/dashboard/page.tsx`:

Replace the `formatTime` function (around line 305) with:

```typescript
const formatTime = (dateString: string) => {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    // Now that DB uses TIMESTAMPTZ, simple conversion works
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Date formatting error:', error, dateString);
    return dateString;
  }
};
```

---

## ✅ TESTING CHECKLIST

After applying fixes:

1. [ ] Login as admin at `/story/admin`
2. [ ] Check "Activity Log" tab - times should be Beijing time
3. [ ] Check "Active Users" tab - "seconds ago" should be accurate
4. [ ] Check "Messages" tab - created_at should show correct times
5. [ ] Send a new message and verify timestamp
6. [ ] Login as parent at `/story` and check message timestamps
7. [ ] Upload media and verify timestamps in media section

---

## 📁 FILES MODIFIED

After fixes, these files will be updated:
- `app/story/admin/dashboard/page.tsx` - formatTime function
- Database tables - column types and names

---

**End of Audit Report**
