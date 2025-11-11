# 🔍 Supabase Migration Analysis

## Current State Analysis

### ✅ What's Already Set Up
1. **Supabase Client Library**: `@supabase/supabase-js` is installed (v2.81.0)
2. **Supabase Helper Functions**: `lib/supabase.ts` exists with:
   - `createSupabaseClient()` - for client-side operations
   - `createSupabaseAdmin()` - for server-side admin operations
   - `STORAGE_BUCKET = 'videos'` constant
   - `METADATA_FILE = 'data/videos.json'` constant
3. **Supabase Setup Guide**: `SUPABASE-SETUP.md` exists with instructions

### ❌ What Needs to Be Changed

#### 1. **lib/data.ts** (Metadata Storage)
- **Current**: Uses Vercel Blob Storage (`@vercel/blob` - `head`, `put`)
- **Needs**: Switch to Supabase Storage for `videos.json` metadata file
- **Functions to update**:
  - `getVideos()` - Read from Supabase Storage
  - `saveVideos()` - Write to Supabase Storage
  - `addVideo()` - Uses `saveVideos()`, should work automatically
  - `deleteVideo()` - Uses `saveVideos()`, should work automatically

#### 2. **app/admin/page.tsx** (Video Uploads)
- **Current**: Uses `@vercel/blob/client` `upload()` function
- **Needs**: Switch to Supabase Storage upload
- **Changes**:
  - Replace `upload()` from `@vercel/blob/client` with Supabase Storage upload
  - Update upload progress handling (Supabase has different progress API)
  - Update error messages

#### 3. **app/api/videos/upload-handler/route.ts** (Upload Handler)
- **Current**: Uses `handleUpload` from `@vercel/blob/client`
- **Needs**: Replace with Supabase Storage upload handler OR remove if using direct client upload
- **Note**: Supabase can handle direct client uploads, so this endpoint may not be needed

#### 4. **app/api/videos/delete/route.ts** (Video Deletion)
- **Current**: Uses `del()` from `@vercel/blob` to delete video files
- **Needs**: Switch to Supabase Storage `remove()` method
- **Changes**:
  - Replace `del(video.videoUrl)` with Supabase Storage delete
  - Extract file path from Supabase URL

#### 5. **lib/video-utils.ts** (URL Handling)
- **Current**: Converts Vercel Blob URLs to proxy URLs for China compatibility
- **Needs**: Update to handle Supabase Storage URLs
- **Note**: Supabase URLs may work directly, or may need proxy for China

#### 6. **app/api/videos/proxy/route.ts** (Video Proxy)
- **Current**: Proxies Vercel Blob Storage videos through main domain
- **Needs**: Update to proxy Supabase Storage videos OR remove if Supabase URLs work directly
- **Changes**: Replace `head()` from `@vercel/blob` with Supabase Storage `getPublicUrl()` or direct fetch

#### 7. **Dependencies**
- **Current**: `@vercel/blob` (v2.0.0) is installed
- **Action**: Can remove after migration, but keeping it won't hurt

## Migration Plan

### Phase 1: Supabase Setup (User Action Required)
1. ✅ Create Supabase project "whale-class" (DONE)
2. ⏳ Create Storage bucket named "videos" (public)
3. ⏳ Get API keys from Supabase dashboard
4. ⏳ Add environment variables to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Phase 2: Code Migration (I'll Do This)
1. Update `lib/data.ts` - Switch metadata storage to Supabase
2. Update `app/admin/page.tsx` - Switch uploads to Supabase
3. Update `app/api/videos/delete/route.ts` - Switch deletion to Supabase
4. Update `lib/video-utils.ts` - Handle Supabase URLs
5. Update `app/api/videos/proxy/route.ts` - Proxy Supabase videos (if needed)
6. Replace/remove `app/api/videos/upload-handler/route.ts` - Supabase direct upload

### Phase 3: Testing
1. Test video upload from admin panel
2. Test video playback on main site
3. Test video deletion
4. Test on iOS devices
5. Test in China (if applicable)

## Key Differences: Vercel Blob vs Supabase Storage

| Feature | Vercel Blob | Supabase Storage |
|---------|-------------|------------------|
| **Client Upload** | `upload()` from `@vercel/blob/client` | `supabase.storage.from('bucket').upload()` |
| **Server Upload** | `put()` from `@vercel/blob` | `supabase.storage.from('bucket').upload()` |
| **Delete** | `del(url)` or `del(path)` | `supabase.storage.from('bucket').remove([path])` |
| **Get File Info** | `head(path)` | `supabase.storage.from('bucket').list()` or direct fetch |
| **Public URL** | Auto-generated blob URL | `supabase.storage.from('bucket').getPublicUrl(path)` |
| **Progress** | `onUploadProgress` callback | No built-in progress, need to track manually |
| **File Size Limit** | 4.5MB via API, unlimited via client | Configurable (default 50MB, can increase) |
| **Metadata Storage** | Store JSON in blob | Store JSON in storage bucket |

## Next Steps for User

### Step 1: Create Storage Bucket in Supabase
1. Go to your Supabase project dashboard
2. Click **Storage** in the left sidebar
3. Click **"Create a new bucket"**
4. Fill in:
   - **Name**: `videos` (must be exactly this)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - **File size limit**: `100 MB` (or your preferred limit)
   - **Allowed MIME types**: Leave empty (allows all types)
5. Click **"Create bucket"**

### Step 2: Get API Keys
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role key**: Long string (keep secret!)

### Step 3: Add Environment Variables to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **whale-class** project
3. Go to **Settings** → **Environment Variables**
4. Add these three variables:

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Project URL from Step 2
   - **Environment**: Production, Preview, Development (select all)
   - Click **"Save"**

   **Variable 2:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your anon public key from Step 2
   - **Environment**: Production, Preview, Development (select all)
   - Click **"Save"**

   **Variable 3:**
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service_role key from Step 2
   - **Environment**: Production, Preview, Development (select all)
   - Click **"Save"**

### Step 4: Let Me Know When Ready
Once you've completed Steps 1-3, let me know and I'll:
1. Migrate all the code to use Supabase Storage
2. Test everything locally
3. Push the changes
4. Guide you through testing

## Potential Issues & Solutions

### Issue 1: Upload Progress Not Available
**Problem**: Supabase Storage doesn't have built-in upload progress callbacks
**Solution**: We can implement manual progress tracking using `fetch` with `ReadableStream` or use a library

### Issue 2: China Firewall
**Problem**: Supabase URLs might be blocked in China
**Solution**: Keep the proxy endpoint but update it to fetch from Supabase Storage URLs

### Issue 3: File Size Limits
**Problem**: Supabase free tier has limits
**Solution**: Configure bucket with appropriate limits (100MB should be fine)

### Issue 4: Metadata File Location
**Problem**: Need to store `videos.json` somewhere
**Solution**: Store it in Supabase Storage bucket as `data/videos.json`

## Files That Will Be Modified

1. ✅ `lib/data.ts` - Complete rewrite for Supabase
2. ✅ `app/admin/page.tsx` - Update upload logic
3. ✅ `app/api/videos/delete/route.ts` - Update delete logic
4. ✅ `lib/video-utils.ts` - Update URL handling
5. ✅ `app/api/videos/proxy/route.ts` - Update proxy logic
6. ✅ `app/api/videos/upload-handler/route.ts` - Replace or remove
7. ⚠️ `package.json` - May remove `@vercel/blob` (optional)

## Estimated Time
- **User Setup**: 10-15 minutes (Steps 1-3)
- **Code Migration**: 30-45 minutes
- **Testing**: 15-20 minutes
- **Total**: ~1-1.5 hours

---

**Status**: ✅ Analysis Complete - Ready for Migration
**Next**: Wait for user to complete Supabase setup, then proceed with code migration


