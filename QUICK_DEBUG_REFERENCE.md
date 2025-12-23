# Quick Debug Reference - Story System

## 🚨 IMMEDIATE ACTIONS

1. **Test Connection:** Visit `https://teacherpotato.xyz/api/story/test-connection`
   - This will show EXACT error with hints

2. **Check Debug:** Visit `https://teacherpotato.xyz/api/story/debug`
   - Shows database status, tables, users

3. **Check Vercel Logs:** Dashboard → Project → Logs
   - Look for `[Auth]`, `[Message]`, `[Debug]` prefixes

## 📋 CRITICAL INFO

**Environment Variables Needed:**
- `DATABASE_URL` - Supabase connection string (user just reset password)
- `STORY_JWT_SECRET` - Random string, min 32 chars

**Connection String Format:**
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
(Use Connection Pooling from Supabase Dashboard)

**Default Users:**
- `T` / `redoux`
- `Z` / `oe`
- Admin: `T` / `redoux`

## 🔍 FULL CONTEXT

See `STORY_SYSTEM_DEBUG_COMPLETE_CONTEXT.md` for:
- Complete code files
- Database schema
- All API routes
- Error patterns
- Step-by-step debugging guide

## 🎯 MOST LIKELY ISSUES

1. **Password in DATABASE_URL is wrong** (user reset password)
   - Fix: Get new connection string from Supabase, update in Vercel, redeploy

2. **Connection string format wrong**
   - Fix: Use "Connection pooling" tab in Supabase, not "URI" tab

3. **Env vars not deployed**
   - Fix: After updating env vars in Vercel, trigger a redeploy

4. **Special characters in password not URL-encoded**
   - Fix: URL-encode password in connection string

## 🛠️ QUICK FIX

1. Supabase Dashboard → Settings → Database
2. Click "Connection pooling" tab
3. Copy connection string
4. Replace `[YOUR-PASSWORD]` with actual password
5. URL-encode any special characters in password
6. Paste into Vercel → Settings → Environment Variables → DATABASE_URL
7. **Redeploy** (important!)
8. Test: `https://teacherpotato.xyz/api/story/test-connection`


