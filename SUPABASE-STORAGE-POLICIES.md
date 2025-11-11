# 🔐 Supabase Storage Policies Setup

To allow client-side uploads to your Supabase Storage bucket, you need to configure Row Level Security (RLS) policies.

## Why This Is Needed

Supabase Storage uses RLS policies to control who can upload files. By default, uploads are blocked unless you create policies that allow them.

## How to Set Up Storage Policies

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/whale-class
2. Click **Storage** in the left sidebar
3. Click on your **`videos`** bucket
4. Click the **"Policies"** tab
5. Click **"New Policy"**
6. Choose **"Create a policy from scratch"**
7. Fill in:
   - **Policy name**: `Allow public uploads`
   - **Allowed operation**: Select **INSERT** (for uploads)
   - **Target roles**: Select **anon** and **authenticated**
   - **USING expression**: `true`
   - **WITH CHECK expression**: `true`
8. Click **"Review"** then **"Save policy"**

### Option 2: Via SQL (Advanced)

1. Go to: https://supabase.com/dashboard/project/whale-class
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Paste this SQL:

```sql
-- Allow public uploads to videos bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'videos');
```

5. Click **"Run"** (or press `Cmd/Ctrl + Enter`)

### Option 3: Allow All Operations (If Needed)

If you also want to allow DELETE operations (for video deletion), create another policy:

```sql
-- Allow public deletes from videos bucket
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'videos');
```

## Verify Policies Are Working

After creating the policies:

1. Try uploading a video in your admin panel
2. If you still get RLS errors, check:
   - The bucket name is exactly `videos` (lowercase)
   - The policy is enabled (toggle should be ON)
   - The policy targets the correct roles (anon, authenticated)

## Troubleshooting

### Error: "new row violates row-level security policy"

**Solution**: Make sure you've created the INSERT policy as described above.

### Error: "permission denied for table storage.objects"

**Solution**: You might need to use the service role key. Check that your environment variables are set correctly.

### Uploads work but deletes don't

**Solution**: Create a DELETE policy as shown in Option 3 above.

## Security Note

⚠️ **Important**: These policies allow anyone with your anon key to upload files. This is acceptable for an admin-only upload interface, but make sure:
- Your admin routes are properly protected with authentication
- The anon key is only used in client-side code (never expose the service role key)
- Consider adding file size/type validation in your policies if needed

