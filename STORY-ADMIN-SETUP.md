# Story Admin System Setup Guide

## Overview
This system adds an admin portal to the story page at `teacherpotato.xyz/story/admin` with the following features:
- Login tracking for all story users
- Complete message history (text, images, videos)
- Auto-expiring content (disappears from public view after 7 days but saved in admin)
- Media upload functionality (pictures and videos)

## Setup Steps

### 1. Run Database Migration

Run the migration file in Supabase SQL Editor:
```sql
-- File: migrations/009_story_admin_system.sql
```

This creates:
- `story_login_logs` - Tracks every login with timestamp, IP, user agent
- `story_message_history` - Complete history of all messages and media
- `story_admin_users` - Admin authentication table
- Auto-expiry function to mark messages as expired after 7 days

### 2. Create Supabase Storage Bucket

In Supabase Dashboard → Storage:

1. Create a new bucket named `story-uploads`
2. Make it **public** (for easy access to uploaded media)
3. Set storage policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-uploads');

-- Allow public access to view
CREATE POLICY "Allow public access to story uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-uploads');
```

### 3. Environment Variables

Add to your `.env.local` file (if not already present):

```env
# Story JWT Secret (for regular users)
STORY_JWT_SECRET=your-story-jwt-secret-here

# Admin JWT Secret (optional, will fallback to STORY_JWT_SECRET)
STORY_ADMIN_JWT_SECRET=your-admin-jwt-secret-here

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Deploy to Vercel

Make sure all environment variables are also set in Vercel:
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add all the above variables

### 5. Test the System

1. **Test Regular Story Login**:
   - Go to `teacherpotato.xyz/story`
   - Login with existing credentials
   - Upload a picture or video
   - Send a text message

2. **Test Admin Portal**:
   - Go to `teacherpotato.xyz/story/admin`
   - Login with:
     - Username: `Tredoux`
     - Password: `8706025176086`
   - View login logs
   - View message history (text, images, videos)

## Features

### For Regular Users (teacherpotato.xyz/story)
- ✅ Login with username/password
- ✅ Read weekly story
- ✅ Send hidden text messages
- ✅ Upload pictures and videos
- ✅ All content auto-expires after 7 days from public view

### For Admin (teacherpotato.xyz/story/admin)
- ✅ Secure admin login
- ✅ View all login logs (who, when, from where)
- ✅ View complete message history (never deleted)
- ✅ See expired and active content
- ✅ Statistics dashboard (text/image/video counts)
- ✅ View all uploaded media with thumbnails

## How Auto-Expiry Works

1. When a user sends a message or uploads media, it's saved with an `expires_at` timestamp (7 days from creation)
2. A scheduled job runs every hour to mark expired content
3. Expired content:
   - ❌ No longer visible on the public story page
   - ✅ Still visible in admin dashboard
   - ✅ Permanently saved in database

## Security

- Admin portal uses separate JWT authentication
- Password is hashed with bcrypt (10 rounds)
- Admin session expires after 8 hours
- All API routes verify admin role before allowing access
- Login tracking includes IP address and user agent for security monitoring

## File Structure

```
app/
├── story/
│   ├── page.tsx                          # Story login
│   ├── [session]/page.tsx                # Story viewer (with media upload)
│   └── admin/
│       ├── page.tsx                      # Admin login
│       └── dashboard/page.tsx            # Admin dashboard
├── api/
│   └── story/
│       ├── auth/route.ts                 # User auth (updated with login tracking)
│       ├── message/route.ts              # Message save (updated with history)
│       ├── upload-media/route.ts         # NEW: Media upload
│       ├── current-media/route.ts        # NEW: Get current media
│       └── admin/
│           ├── auth/route.ts             # NEW: Admin authentication
│           ├── login-logs/route.ts       # NEW: Get login logs
│           └── message-history/route.ts  # NEW: Get message history

migrations/
└── 009_story_admin_system.sql            # NEW: Database schema
```

## Troubleshooting

### Can't login to admin
- Check that migration ran successfully
- Verify password hash in database matches
- Check browser console for errors

### Media upload fails
- Verify Supabase storage bucket exists and is public
- Check storage policies are set correctly
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables

### Login logs not appearing
- Check that the `story_login_logs` table was created
- Verify the auth route is saving logs (check server logs)

### Messages not expiring
- The pg_cron extension must be enabled in Supabase
- Alternatively, you can manually run: `SELECT mark_expired_messages();`
- Or call the function via API periodically

## Next Steps

If you need to:
- **Change admin password**: Update the hash in the migration or use the PUT endpoint in development
- **Add more admins**: Insert new rows into `story_admin_users` table
- **Adjust expiry time**: Change the `expiresAt.setDate(expiresAt.getDate() + 7)` in the API routes
- **Delete old media**: Create a cleanup script to remove expired media from storage

## Admin Credentials

**Username**: `Tredoux`  
**Password**: `8706025176086`

🔐 **Important**: Change this password in production by updating the hash in the database!



