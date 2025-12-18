# Story Uploads Storage Bucket Setup

## Error Message
```
Bucket not found
Storage bucket "story-uploads" may not exist. Create it in Supabase Storage settings.
```

## Quick Fix - Create the Bucket

### Option 1: Via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Open your Supabase project
   - Click on **"Storage"** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** button (top right)
   - **Bucket name**: `story-uploads`
   - **Public bucket**: ✅ **Check this box** (important!)
   - Click **"Create bucket"**

3. **Set Storage Policies** (Important for uploads to work)

   Go to **SQL Editor** and run this:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-uploads');

-- Allow public access to view/download files
CREATE POLICY "Allow public access to story uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-uploads');

-- Allow users to update their own uploads (optional)
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'story-uploads')
WITH CHECK (bucket_id = 'story-uploads');

-- Allow users to delete their own uploads (optional)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'story-uploads');
```

### Option 2: Via SQL (Alternative)

If you prefer SQL, run this in **Supabase SQL Editor**:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-uploads', 'story-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Set policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-uploads');

CREATE POLICY "Allow public access to story uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-uploads');
```

## Verify It Works

After creating the bucket:

1. Go back to **Storage** in Supabase Dashboard
2. You should see `story-uploads` in the list
3. It should show as **Public**

## Test the Upload

1. Go to `teacherpotato.xyz/story/[your-session]`
2. Try uploading a picture
3. It should work now! ✅

## Troubleshooting

### If upload still fails:

1. **Check bucket exists**: Go to Storage → You should see `story-uploads`
2. **Check bucket is public**: The bucket should have a "Public" badge
3. **Check policies**: Run this query to see if policies exist:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%story-uploads%';
```

4. **Check environment variables**: Make sure these are set in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Common Issues

- **"Bucket not found"**: Bucket doesn't exist → Create it (see above)
- **"Permission denied"**: Policies not set → Run the policy SQL above
- **"Unauthorized"**: Service role key missing → Check Vercel environment variables

