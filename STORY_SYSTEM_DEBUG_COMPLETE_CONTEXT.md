# Story System Database Connection Issue - Complete Debug Context

## 🚨 CURRENT PROBLEM

**Symptoms:**
- `/api/story/debug` returns 500 error
- `/api/story/message` returns 500 error when sending messages
- User reports: "Reset password in Supabase and updated URI in Vercel, still not working"
- Console shows: `[Error] Failed to load resource: the server responded with a status of 500 ()`

**Deployment:**
- Production URL: `https://teacherpotato.xyz`
- Hosting: Vercel
- Database: Supabase PostgreSQL

---

## 📋 REQUIRED ENVIRONMENT VARIABLES

### In Vercel Dashboard → Settings → Environment Variables:

1. **DATABASE_URL** (REQUIRED)
   - Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - OR (Connection Pooling): `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
   - User recently reset password in Supabase and updated this

2. **STORY_JWT_SECRET** (REQUIRED)
   - Any random string, minimum 32 characters
   - Example: `my-super-secret-story-key-12345678`
   - Used for JWT token signing

3. **NEXT_PUBLIC_SUPABASE_URL** (Optional - for other features)
4. **SUPABASE_SERVICE_ROLE_KEY** (Optional - for other features)

---

## 🗄️ DATABASE SCHEMA

### Required Tables (auto-created by routes):

1. **story_users** - User authentication
   ```sql
   CREATE TABLE IF NOT EXISTS story_users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(50) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **story_admin_users** - Admin authentication
   ```sql
   CREATE TABLE IF NOT EXISTS story_admin_users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(50) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     last_login TIMESTAMP
   );
   ```

3. **secret_stories** - Weekly stories
   ```sql
   CREATE TABLE IF NOT EXISTS secret_stories (
     id SERIAL PRIMARY KEY,
     week_start_date DATE NOT NULL UNIQUE,
     theme VARCHAR(255) NOT NULL,
     story_title VARCHAR(255) NOT NULL,
     story_content JSONB NOT NULL,
     hidden_message TEXT,
     message_author VARCHAR(50),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **story_message_history** - Message history
   ```sql
   CREATE TABLE IF NOT EXISTS story_message_history (
     id SERIAL PRIMARY KEY,
     week_start_date DATE NOT NULL,
     message_type VARCHAR(20) NOT NULL,
     message_content TEXT,
     media_url TEXT,
     media_filename TEXT,
     author VARCHAR(50) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP,
     is_expired BOOLEAN DEFAULT FALSE
   );
   ```

5. **story_login_logs** - Login tracking
   ```sql
   CREATE TABLE IF NOT EXISTS story_login_logs (
     id SERIAL PRIMARY KEY,
     username VARCHAR(50) NOT NULL,
     login_time TIMESTAMP DEFAULT NOW(),
     session_id TEXT,
     ip_address VARCHAR(45),
     user_agent TEXT
   );
   ```

### Default Users (auto-created):

- **Username:** `T`, **Password:** `redoux` (hash: `$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO`)
- **Username:** `Z`, **Password:** `oe` (hash: `$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK`)
- **Admin:** `T` / `redoux` (same hash as user T)

---

## 🔧 API ROUTES (All Self-Contained - No External Lib Imports)

### 1. `/api/story/debug` - Diagnostic Endpoint

**File:** `app/api/story/debug/route.ts`

**Purpose:** Test database connection and show system status

**What it does:**
- Checks environment variables
- Tests database connection
- Lists existing tables
- Shows users and admins
- Returns detailed error messages

**Current Implementation:**
- Uses singleton pool pattern
- Auto-detects Supabase (checks for 'supabase' in connection string)
- SSL enabled for Supabase connections
- Connection timeout: 10 seconds
- Pool max: 5 connections

**Expected Response:**
```json
{
  "timestamp": "2024-...",
  "env": {
    "DATABASE_URL": true,
    "DATABASE_URL_PREVIEW": "postgresql://post...",
    "STORY_JWT_SECRET": true,
    ...
  },
  "database": {
    "connected": true,
    "serverTime": "...",
    "postgresVersion": "..."
  },
  "tables": ["story_users", "secret_stories", ...],
  "storyUsers": [{"username": "T", "created": "..."}],
  "adminUsers": [{"username": "T", ...}]
}
```

### 2. `/api/story/test-connection` - Connection Test

**File:** `app/api/story/test-connection/route.ts`

**Purpose:** Simple connection test with detailed error hints

**What it does:**
- Tests basic connection
- Tests query capability
- Tests table access
- Provides specific error hints

### 3. `/api/story/auth` - User Login

**File:** `app/api/story/auth/route.ts`

**Methods:**
- `POST` - User login
- `DELETE` - Logout

**Flow:**
1. Checks env vars (DATABASE_URL, STORY_JWT_SECRET)
2. Auto-creates `story_users` table if missing
3. Inserts default users (T/redoux, Z/oe) if missing
4. Validates credentials
5. Creates JWT token
6. Logs login (non-critical)

**Request:**
```json
{
  "username": "T",
  "password": "redoux"
}
```

**Response:**
```json
{
  "session": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4. `/api/story/message` - Save Messages

**File:** `app/api/story/message/route.ts`

**Methods:**
- `POST` - Save message
- `GET` - Check if message exists

**Flow:**
1. Verifies JWT token
2. Auto-creates tables if missing
3. Saves to `story_message_history`
4. Updates or creates entry in `secret_stories`

**Request:**
```json
{
  "message": "Hello world",
  "author": "T"
}
```

**Headers:**
```
Authorization: Bearer <token>
```

### 5. `/api/story/admin/auth` - Admin Login

**File:** `app/api/story/admin/auth/route.ts`

**Methods:**
- `POST` - Admin login
- `GET` - Verify admin session

**Similar to user auth but:**
- Uses `story_admin_users` table
- JWT includes `role: 'admin'`
- Token expires in 8h (vs 24h for users)

---

## 📦 DEPENDENCIES

**package.json:**
```json
{
  "dependencies": {
    "pg": "^8.16.3",
    "jose": "^5.10.0",
    "bcryptjs": "^3.0.3",
    "@types/pg": "^8.16.0"
  }
}
```

All dependencies are installed and up to date.

---

## 🔍 DEBUGGING STEPS

### Step 1: Test Connection Endpoint

Visit: `https://teacherpotato.xyz/api/story/test-connection`

**What to look for:**
- `hasDatabaseUrl: true` - DATABASE_URL is set
- `test1_connection.success: true` - Can connect to database
- If `test1_connection.success: false`, check the `error` field and `hint`

**Common Errors:**
- `password authentication failed` → Password in DATABASE_URL is wrong
- `ECONNREFUSED` → Host/port incorrect
- `ENOTFOUND` → Hostname doesn't exist
- `timeout` → Connection timeout (check firewall/network)

### Step 2: Check Debug Endpoint

Visit: `https://teacherpotato.xyz/api/story/debug`

**What to look for:**
- `database.connected: true`
- `tables` array shows existing tables
- `storyUsers` shows users (or error if table missing)
- `adminUsers` shows admins (or error if table missing)

### Step 3: Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Look for errors with prefixes:
   - `[Auth]` - Authentication issues
   - `[Message]` - Message saving issues
   - `[Debug]` - Debug endpoint issues
   - `[AdminAuth]` - Admin auth issues

### Step 4: Verify Environment Variables

1. Vercel Dashboard → Settings → Environment Variables
2. Check:
   - `DATABASE_URL` exists and is correct
   - `STORY_JWT_SECRET` exists and is at least 32 chars
3. **Important:** After changing env vars, redeploy!

---

## 🐛 KNOWN ISSUES & FIXES

### Issue 1: Pool Connection Errors

**Symptom:** `Unexpected error on idle client`

**Cause:** Pool connections not properly managed in serverless

**Fix Applied:** 
- Singleton pool pattern
- Proper error handlers
- Connection timeout settings

### Issue 2: `pool.end()` in Serverless

**Symptom:** Connections fail after first request

**Cause:** Calling `pool.end()` closes connections permanently

**Fix Applied:** Removed `pool.end()` from debug route (test-connection still has it for cleanup, but that's OK for one-off tests)

### Issue 3: SSL Configuration

**Symptom:** SSL/TLS errors

**Fix Applied:** Auto-detects Supabase and enables SSL with `rejectUnauthorized: false`

### Issue 4: Connection String Format

**Symptom:** Connection refused or authentication failed

**Possible Causes:**
1. Password in connection string is wrong (user reset password)
2. Using wrong port (5432 vs 6543)
3. Using direct connection instead of pooler (or vice versa)

**Solution:** Use connection pooling (port 6543) - more reliable for serverless

---

## 🔐 SUPABASE CONNECTION STRING GUIDE

### Option A: Direct Connection (Port 5432)
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Pros:** Direct connection
**Cons:** Requires exact password, may have connection limits

### Option B: Connection Pooling (Port 6543) - RECOMMENDED
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Pros:** Better for serverless, handles connection pooling
**Cons:** Slightly different format

**How to get it:**
1. Supabase Dashboard → Settings → Database
2. Scroll to "Connection string"
3. Click "Connection pooling" tab
4. Copy the URI
5. Replace `[YOUR-PASSWORD]` with your actual password

---

## 📝 CODE FILES REFERENCE

### Key Files:

1. **app/api/story/debug/route.ts** - Diagnostic endpoint
2. **app/api/story/test-connection/route.ts** - Connection tester
3. **app/api/story/message/route.ts** - Message saving (500 error here)
4. **app/api/story/auth/route.ts** - User login
5. **app/api/story/admin/auth/route.ts** - Admin login
6. **migrations/story_complete_schema.sql** - Full database schema

### Frontend Files:

1. **app/story/page.tsx** - Login page (calls `/api/story/auth`)
2. **app/story/[session]/page.tsx** - Story viewer (calls `/api/story/message`)

---

## 🎯 SPECIFIC ERROR PATTERNS

### Pattern 1: 500 on `/api/story/debug`

**Possible Causes:**
1. DATABASE_URL not set → Check env vars
2. Connection string format wrong → Verify format
3. Password incorrect → Reset password in Supabase, update DATABASE_URL
4. Network/firewall issue → Check Supabase project settings
5. Database doesn't exist → Check Supabase project

**Debug:**
- Check response body for `error` field
- Check `database.error` in response
- Check Vercel logs for stack traces

### Pattern 2: 500 on `/api/story/message`

**Possible Causes:**
1. Database connection fails → Same as Pattern 1
2. Table creation fails → Check database permissions
3. JWT verification fails → Check STORY_JWT_SECRET
4. Query fails → Check table structure

**Debug:**
- Check response body for `details` field
- Check console logs with `[Message]` prefix
- Verify user is authenticated (token valid)

---

## 🛠️ RECOMMENDED FIX APPROACH

### Step 1: Verify Connection String

1. Go to Supabase Dashboard → Settings → Database
2. Use "Connection pooling" tab (port 6543)
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual database password
5. Update in Vercel → Settings → Environment Variables
6. **Redeploy** (important!)

### Step 2: Test Connection

1. Visit: `https://teacherpotato.xyz/api/story/test-connection`
2. Check response:
   - If `overall: "SUCCESS"` → Connection works!
   - If `overall: "FAILED"` → Check `error` and `hint` fields

### Step 3: Check Debug Endpoint

1. Visit: `https://teacherpotato.xyz/api/story/debug`
2. Verify:
   - `database.connected: true`
   - Tables are listed
   - Users exist (or will be created on first login)

### Step 4: Test Login

1. Visit: `https://teacherpotato.xyz/story`
2. Login with: `T` / `redoux`
3. If login works, try sending a message

### Step 5: Check Vercel Logs

If still failing:
1. Vercel Dashboard → Project → Logs
2. Filter by "story" or "error"
3. Look for specific error messages
4. Check for stack traces

---

## 📊 EXPECTED BEHAVIOR

### Successful Flow:

1. **First Request to `/api/story/debug`:**
   - Creates connection pool
   - Tests connection → SUCCESS
   - Checks tables → May be empty (tables auto-created on first use)
   - Returns 200 with status

2. **First Login (`/api/story/auth`):**
   - Creates `story_users` table if missing
   - Inserts default users (T, Z) if missing
   - Validates credentials
   - Returns JWT token

3. **Sending Message (`/api/story/message`):**
   - Verifies JWT token
   - Creates tables if missing
   - Saves to `story_message_history`
   - Updates/creates `secret_stories` entry
   - Returns success

---

## 🔍 ADDITIONAL DEBUGGING TOOLS

### 1. Check Supabase Database Directly

1. Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND (table_name LIKE 'story%' OR table_name = 'secret_stories');
   ```

3. Check users:
   ```sql
   SELECT username FROM story_users;
   SELECT username FROM story_admin_users;
   ```

### 2. Test Connection Locally

Create `test-connection.js`:
```javascript
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
  .then(res => console.log('✅ Connected:', res.rows[0]))
  .catch(err => console.error('❌ Error:', err.message))
  .finally(() => pool.end());
```

Run: `node test-connection.js`

---

## 🎓 TECHNICAL DETAILS

### Connection Pool Configuration:

```typescript
{
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: 5,                          // Max connections in pool
  idleTimeoutMillis: 30000,        // Close idle connections after 30s
  connectionTimeoutMillis: 10000   // Timeout after 10s
}
```

### JWT Configuration:

- **Algorithm:** HS256
- **User tokens:** 24h expiration
- **Admin tokens:** 8h expiration
- **Secret:** From `STORY_JWT_SECRET` env var

### Password Hashing:

- **Library:** bcryptjs
- **Rounds:** 10
- **Format:** `$2b$10$...`

---

## 📞 NEXT STEPS FOR AI ASSISTANT

1. **Read the error responses** from `/api/story/test-connection` and `/api/story/debug`
2. **Check Vercel logs** for detailed stack traces
3. **Verify DATABASE_URL format** matches Supabase connection pooling format
4. **Test connection string** directly with pg client
5. **Check Supabase project** is active and accessible
6. **Verify password** was correctly updated in connection string
7. **Check for special characters** in password that need URL encoding

---

## 🚨 CRITICAL CHECKLIST

- [ ] DATABASE_URL is set in Vercel
- [ ] DATABASE_URL uses correct password (after reset)
- [ ] DATABASE_URL format is correct (postgresql://...)
- [ ] STORY_JWT_SECRET is set (min 32 chars)
- [ ] Vercel project was redeployed after env var changes
- [ ] Supabase project is active
- [ ] Supabase database password matches DATABASE_URL
- [ ] Connection pooling is used (port 6543) or direct (port 5432)
- [ ] SSL is enabled for Supabase connections
- [ ] No firewall blocking connections

---

## 📄 FILES TO REVIEW

All relevant code is in:
- `app/api/story/` - All API routes
- `migrations/story_complete_schema.sql` - Database schema
- `package.json` - Dependencies

All routes are **self-contained** - they don't use external lib files, everything is inline.

---

**Last Updated:** After password reset in Supabase, connection string updated in Vercel
**Status:** Still getting 500 errors on debug and message endpoints
**Priority:** HIGH - System is non-functional


