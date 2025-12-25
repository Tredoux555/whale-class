# Reset Supabase Database Password

## Option 1: Reset Password in Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll down to find **Database Password** section
5. Click **Reset Database Password** button
6. Enter a NEW password (write it down!)
7. Click **Reset Password**
8. Wait for confirmation

**Important:** After resetting, you'll need to update your DATABASE_URL with the new password.

## Option 2: Use Connection Pooling (Alternative)

If you can't reset the password, you can use Supabase's connection pooling:

1. Go to **Settings** → **Database**
2. Find **Connection string** section
3. Select **Connection pooling** tab (instead of URI)
4. Copy the connection string (uses port 6543 instead of 5432)
5. This uses session mode and doesn't require the direct database password

**Note:** Connection pooling works great for this use case!

## After Getting the Connection String

Once you have either:
- The direct URI connection string (with new password)
- OR the connection pooling string

Add it to `.env.local` as:
```
DATABASE_URL=postgresql://postgres.xxxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Then run: `node scripts/setup-story-users.js`

















