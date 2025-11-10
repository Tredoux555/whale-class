# 🚀 Supabase Storage Setup Guide

This guide will help you set up Supabase Storage for the Whale Class video platform.

## Why Supabase Storage?

- ✅ **More reliable** - Mature, stable service
- ✅ **Better for large files** - Handles video uploads excellently
- ✅ **Global CDN** - Fast video playback worldwide
- ✅ **Better for China** - Works better than Vercel Blob Storage
- ✅ **More control** - Better bucket policies and access control
- ✅ **Long-term friendly** - Better for production projects

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `whale-class` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for now
5. Click **"Create new project"**
6. Wait 2-3 minutes for project to initialize

## Step 2: Create Storage Bucket

1. In your Supabase project dashboard, go to **Storage** (left sidebar)
2. Click **"Create a new bucket"**
3. Fill in:
   - **Name**: `videos` (must be exactly this)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - **File size limit**: `100 MB` (or your preferred limit)
   - **Allowed MIME types**: Leave empty (allows all types)
4. Click **"Create bucket"**

## Step 3: Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API** (left sidebar)
2. You'll see:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon public key**: Copy this (long string starting with `eyJ...`)
   - **service_role key**: Copy this (long string, keep it secret!)

## Step 4: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **whale-class** project
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Project URL (from Step 3)
   - **Environment**: Production, Preview, Development (select all)
   - Click **"Save"**

   **Variable 2:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your anon public key (from Step 3)
   - **Environment**: Production, Preview, Development (select all)
   - Click **"Save"**

   **Variable 3:**
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service_role key (from Step 3)
   - **Environment**: Production, Preview, Development (select all)
   - Click **"Save"**

## Step 5: Redeploy Your Project

1. In Vercel dashboard, go to **Deployments** tab
2. Click **⋯** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (2-3 minutes)

## Step 6: Test Upload

1. Go to your deployed site: `https://www.teacherpotato.xyz/admin`
2. Log in with your admin credentials
3. Try uploading a test video
4. If successful, you should see:
   - ✅ Upload progress bar
   - ✅ "Video uploaded successfully! 🎉" message
   - ✅ Video appears in the list

## Troubleshooting

### Error: "Supabase Storage Not Configured"

**Solution:**
- Check that all 3 environment variables are set in Vercel
- Make sure bucket name is exactly `videos` (lowercase)
- Make sure bucket is **public**
- Redeploy after adding environment variables

### Error: "Bucket not found"

**Solution:**
- Go to Supabase → Storage
- Check that bucket named `videos` exists
- Make sure it's **public** (toggle should be on)

### Videos not playing

**Solution:**
- Check that bucket is **public**
- Check video URL in browser console
- Make sure Supabase project is active (not paused)

### Upload fails with timeout

**Solution:**
- Check your internet connection
- Try a smaller video file first
- Check Supabase project status (not paused)

## Migration from Vercel Blob Storage

If you have existing videos in Vercel Blob Storage:

1. **Option 1**: Re-upload videos through the admin panel (easiest)
2. **Option 2**: Download from Vercel Blob and re-upload to Supabase
3. **Option 3**: Use Supabase migration script (contact support)

## Next Steps

- ✅ Videos are now stored in Supabase Storage
- ✅ Better reliability and performance
- ✅ Works better in China
- ✅ No more Vercel Blob Storage issues!

## Support

If you encounter issues:
1. Check Supabase dashboard for errors
2. Check Vercel deployment logs
3. Check browser console for errors
4. Verify all environment variables are set correctly

---

**That's it!** Your Whale Class platform is now using Supabase Storage! 🐋

