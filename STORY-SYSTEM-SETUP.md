# Secret Story System - Setup Guide

## Quick Setup Checklist

### 1. Database Setup (REQUIRED)

Run the SQL migration in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire contents of `migrations/001_create_secret_story_tables.sql`
4. Paste and click "Run"
5. Wait for success message

This creates:
- ✅ `secret_stories` table
- ✅ `story_users` table
- ✅ Index for faster lookups

### 2. Create User Accounts (REQUIRED)

Run the setup script to create users with hashed passwords:

```bash
# Make sure DATABASE_URL is set in your .env.local
node scripts/setup-story-users.js
```

This creates:
- ✅ User `T` with password `redoux`
- ✅ User `Z` with password `oe`

### 3. Environment Variables (REQUIRED)

Add these to your `.env.local` file:

```env
# Database connection (Supabase provides this)
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# Story system JWT secret (CHANGE THIS!)
STORY_JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-change-this

# Anthropic API key for story generation
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Important:** 
- Get `DATABASE_URL` from Supabase Dashboard → Settings → Database → Connection string
- Change `STORY_JWT_SECRET` to a random string at least 32 characters long!
- Get `ANTHROPIC_API_KEY` from https://console.anthropic.com/

### 4. Verify Dependencies

Make sure these packages are installed (they should already be):

```bash
npm install bcrypt jose pg
```

### 5. Test the System

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/story`
3. Login with:
   - Username: `T`, Password: `redoux`
   - OR Username: `Z`, Password: `oe`
4. You should see the weekly story!

## How to Use

### Send a Secret Message
1. Click the first **'c'** in the story
2. Type your message
3. Click 💾 Save

### Read a Secret Message
1. Click the first **'t'** in the story
2. Message appears at the end of paragraph 3
3. Click 't' again to hide

## Troubleshooting

### "Page can't be found" error
- ✅ Make sure all files are in the correct locations:
  - `app/story/page.tsx` exists
  - `app/story/[session]/page.tsx` exists
  - `app/api/story/auth/route.ts` exists
  - `app/api/story/current/route.ts` exists
  - `app/api/story/message/route.ts` exists
- ✅ Restart your dev server: `npm run dev`
- ✅ Check browser console for errors

### "Invalid credentials" error
- ✅ Run `node scripts/setup-story-users.js` again
- ✅ Make sure DATABASE_URL is correct
- ✅ Check that `story_users` table exists in database

### Story won't load
- ✅ Check ANTHROPIC_API_KEY is set correctly
- ✅ Verify database connection works
- ✅ Check server logs for errors

### Database connection errors
- ✅ Verify DATABASE_URL format: `postgresql://postgres:password@host:port/postgres`
- ✅ For Supabase, make sure SSL is enabled (handled automatically in `lib/db.ts`)
- ✅ Check Supabase project is active

## File Locations

```
app/
  story/
    page.tsx                    ← Login page
    [session]/
      page.tsx                  ← Story viewer
  api/
    story/
      auth/
        route.ts                ← Authentication
      current/
        route.ts               ← Get current story
      message/
        route.ts               ← Save message

lib/
  db.ts                         ← Database connection

migrations/
  001_create_secret_story_tables.sql  ← Database schema

scripts/
  setup-story-users.js          ← User setup script
```

## Security Notes

- ⚠️ Never commit `.env.local` to git
- ⚠️ Change `STORY_JWT_SECRET` from default
- ⚠️ Keep the `/story` URL private (no links from main site)
- ⚠️ System designed for just two users (T and Z)

## Production Deployment

1. Run SQL migration in production database
2. Run user setup script with production DATABASE_URL
3. Add environment variables to Vercel/hosting platform
4. Deploy and test

---

**Created for:** Whale App (teacherpotato.xyz)
**Purpose:** Private messaging between teacher friends
**Method:** Steganography within AI-generated stories



