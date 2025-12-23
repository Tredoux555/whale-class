# How to Get DATABASE_URL from Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string**
5. Select **URI** tab
6. Copy the connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
7. Replace `[YOUR-PASSWORD]` with your actual database password
8. Add it to `.env.local` as: `DATABASE_URL=postgresql://...`

**Note:** Your database password is the one you set when creating the Supabase project (NOT your Supabase account password).
















