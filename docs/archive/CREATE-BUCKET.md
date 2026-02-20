# 🪣 Create Supabase Bucket - Quick Guide

## Option 1: Run the Script (Easiest)

1. **Get your Supabase credentials:**
   - Go to: https://supabase.com/dashboard/project/whale-class
   - Click **Settings** → **API**
   - Copy your **Project URL** and **service_role key**

2. **Run the script:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="your-project-url" SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node scripts/create-supabase-bucket.js
   ```

   Replace `your-project-url` and `your-service-role-key` with your actual values.

## Option 2: Manual Creation (Via Dashboard)

1. Go to: https://supabase.com/dashboard/project/whale-class
2. Click **Storage** in the left sidebar
3. Click **"Create a new bucket"**
4. Fill in:
   - **Name**: `videos` (must be exactly this)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - **File size limit**: `100 MB`
   - **Allowed MIME types**: Leave empty (allows all types)
5. Click **"Create bucket"**

## Option 3: Share Credentials (I'll Run It)

If you want me to run the script for you, you can temporarily share:
- Your Supabase Project URL
- Your service_role key

**⚠️ Security Note:** These credentials are sensitive. Only share them if you're comfortable, or use Option 1/2 instead.

---

Once the bucket is created, let me know and I'll proceed with the code migration!


