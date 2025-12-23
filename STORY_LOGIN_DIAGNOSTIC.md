# Story Login Diagnostic & Fix Guide

## Issue: Cannot Login to teacherpotato.xyz/story

### Expected Login Credentials

Based on the migration files, the story system should have these users:

**User 1:**
- Username: `T`
- Password: `redoux`

**User 2:**
- Username: `Z`
- Password: `oe`

---

## Potential Issues & Solutions

### Issue 1: Missing Environment Variables

**Problem:** The login requires two environment variables:
- `DATABASE_URL` - Database connection string
- `STORY_JWT_SECRET` - Secret key for JWT tokens

**Check:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify both variables are set:
   - `DATABASE_URL` should be your Supabase connection string
   - `STORY_JWT_SECRET` should be a random secret string (at least 32 characters)

**Fix:**
If missing, add them:
```bash
# In Vercel Dashboard, add:
DATABASE_URL=postgresql://...
STORY_JWT_SECRET=your-random-secret-key-here-min-32-chars
```

**Error Message:** If these are missing, you'll see:
- "Server configuration error"
- "DATABASE_URL environment variable is missing" OR
- "STORY_JWT_SECRET environment variable is missing"

---

### Issue 2: story_users Table Doesn't Exist

**Problem:** The `story_users` table may not have been created in the database.

**Check:**
Run this SQL in Supabase SQL Editor:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'story_users'
);
```

**Fix:**
If it returns `false`, run the migration:
1. Go to Supabase Dashboard → SQL Editor
2. Run `migrations/001_create_secret_story_tables.sql`:
```sql
CREATE TABLE IF NOT EXISTS story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Error Message:** If table doesn't exist:
- "Database table missing: story_users table may not exist"
- Or database connection error

---

### Issue 3: No Users in Database

**Problem:** The `story_users` table exists but has no users.

**Check:**
Run this SQL in Supabase SQL Editor:
```sql
SELECT username, created_at FROM story_users;
```

**Fix:**
If no users exist, run `migrations/002_create_story_users.sql`:
```sql
INSERT INTO story_users (username, password_hash)
VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
  ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
```

**Login Credentials After Fix:**
- Username: `T`, Password: `redoux`
- Username: `Z`, Password: `oe`

---

### Issue 4: Password Hash Mismatch

**Problem:** The password hashes in the database don't match the expected passwords.

**Check:**
Verify the hash matches:
```sql
SELECT username, password_hash FROM story_users;
```

**Fix:**
If hashes are wrong, re-run the user creation script or manually hash passwords:

**Option A: Use the setup script:**
```bash
# Set DATABASE_URL in your environment
export DATABASE_URL="your-database-url"

# Run the setup script
node scripts/setup-story-users.js
```

**Option B: Manually hash and insert:**
1. Generate new password hashes using bcrypt
2. Update the users:
```sql
-- For user T with password 'redoux'
UPDATE story_users 
SET password_hash = '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'
WHERE username = 'T';

-- For user Z with password 'oe'
UPDATE story_users 
SET password_hash = '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK'
WHERE username = 'Z';
```

---

### Issue 5: Database Connection Issues

**Problem:** The application can't connect to the database.

**Check:**
1. Verify `DATABASE_URL` is correct in Vercel
2. Check if Supabase project is active (not paused)
3. Verify database credentials are correct

**Error Messages:**
- "Database connection failed"
- "ECONNREFUSED"
- "timeout"

**Fix:**
1. Check Supabase project status
2. Verify connection string format:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
   ```
3. Ensure Supabase project is not paused (free tier pauses after inactivity)

---

### Issue 6: JWT Secret Mismatch

**Problem:** If `STORY_JWT_SECRET` was changed, existing tokens won't work, but this shouldn't affect login.

**Check:**
Verify `STORY_JWT_SECRET` is set and consistent across deployments.

**Fix:**
Set a consistent secret (at least 32 characters) in all environments.

---

## Step-by-Step Diagnostic Process

### Step 1: Check Browser Console
1. Open teacherpotato.xyz/story
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try to login
5. Check for error messages

**Look for:**
- Network errors (check Network tab)
- JavaScript errors
- API response errors

### Step 2: Check API Response
1. Open Network tab in DevTools
2. Try to login
3. Find the request to `/api/story/auth`
4. Check the response:
   - Status code (should be 200 for success, 401 for invalid credentials, 500 for server error)
   - Response body (shows error details)

### Step 3: Check Server Logs
1. Go to Vercel Dashboard → Your Project → Functions
2. Check recent function invocations
3. Look for errors in `/api/story/auth` function

### Step 4: Verify Database
Run these SQL queries in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'story_users'
);

-- Check if users exist
SELECT username, created_at FROM story_users;

-- Check user count
SELECT COUNT(*) FROM story_users;
```

### Step 5: Test Password Hash
If users exist, verify the password hash is correct:

```sql
-- Check the hash format (should start with $2b$10$)
SELECT username, 
       LEFT(password_hash, 10) as hash_prefix,
       LENGTH(password_hash) as hash_length
FROM story_users;
```

Expected:
- Hash prefix: `$2b$10$`
- Hash length: 60 characters

---

## Quick Fix Checklist

Run through this checklist:

- [ ] **Environment Variables Set:**
  - [ ] `DATABASE_URL` is set in Vercel
  - [ ] `STORY_JWT_SECRET` is set in Vercel (min 32 chars)

- [ ] **Database Tables Exist:**
  - [ ] `story_users` table exists
  - [ ] Table has correct schema (username, password_hash, created_at)

- [ ] **Users Exist:**
  - [ ] At least one user exists in `story_users` table
  - [ ] Password hash is in correct format (`$2b$10$...`)

- [ ] **Database Connection:**
  - [ ] Supabase project is active (not paused)
  - [ ] Connection string is correct
  - [ ] Database is accessible

- [ ] **Login Credentials:**
  - [ ] Using correct username (case-sensitive: `T` or `Z`)
  - [ ] Using correct password (`redoux` or `oe`)

---

## Common Error Messages & Solutions

### "Invalid credentials"
**Cause:** Username/password don't match
**Solution:** 
- Verify username is exactly `T` or `Z` (case-sensitive)
- Verify password is exactly `redoux` or `oe` (case-sensitive)
- Check if user exists in database

### "Server configuration error"
**Cause:** Missing environment variable
**Solution:** 
- Check Vercel environment variables
- Ensure `DATABASE_URL` and `STORY_JWT_SECRET` are set

### "Database connection failed"
**Cause:** Can't connect to database
**Solution:**
- Check Supabase project status
- Verify `DATABASE_URL` is correct
- Check if project is paused

### "Database table missing"
**Cause:** `story_users` table doesn't exist
**Solution:**
- Run migration `001_create_secret_story_tables.sql`
- Verify table was created

### "Connection error" (in browser)
**Cause:** Network issue or API endpoint down
**Solution:**
- Check Vercel deployment status
- Verify API route is deployed
- Check browser network tab for details

---

## Testing After Fix

1. **Clear browser cache and cookies**
2. **Go to:** teacherpotato.xyz/story
3. **Try login with:**
   - Username: `T`
   - Password: `redoux`
4. **Should redirect to:** `/story/[session-token]`

---

## Code References

**Login Page:** `app/story/page.tsx`  
**Auth API:** `app/api/story/auth/route.ts`  
**JWT Config:** `lib/story-auth.ts`  
**Database Schema:** `migrations/001_create_secret_story_tables.sql`  
**User Setup:** `migrations/002_create_story_users.sql`

---

## Next Steps

1. **Check browser console** for specific error messages
2. **Verify environment variables** in Vercel
3. **Check database** for table and users
4. **Test with correct credentials** (T/redoux or Z/oe)
5. **Check Vercel function logs** for server-side errors

If issue persists, share:
- Browser console errors
- Network tab response from `/api/story/auth`
- Vercel function logs
- Database query results





