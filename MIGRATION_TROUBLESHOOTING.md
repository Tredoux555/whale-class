# Migration Troubleshooting Guide

## Error: "Load failed (api.supabase.com)"

This error indicates a connection issue with Supabase, not a SQL syntax problem.

### Possible Causes:
1. **Network connectivity issue** - Your internet connection may be unstable
2. **Supabase service temporarily down** - Check https://status.supabase.com
3. **Browser/extension blocking requests** - Ad blockers or privacy extensions
4. **Supabase project paused** - Free tier projects pause after inactivity

### Solutions:

#### 1. Check Supabase Status
Visit: https://status.supabase.com to see if there are any ongoing issues

#### 2. Verify Your Supabase Project
- Go to https://supabase.com/dashboard
- Make sure your project is active (not paused)
- Check that you can access the SQL Editor

#### 3. Try Alternative Methods

**Option A: Run SQL in Smaller Chunks**
Break the migration into smaller parts:

```sql
-- Part 1: Create Table
CREATE TABLE IF NOT EXISTS child_video_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  curriculum_video_id UUID NOT NULL REFERENCES curriculum_videos(id) ON DELETE CASCADE,
  curriculum_work_id UUID NOT NULL REFERENCES curriculum_roadmap(id) ON DELETE CASCADE,
  watch_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  watch_completed_at TIMESTAMPTZ,
  watch_duration_seconds INTEGER DEFAULT 0,
  video_duration_seconds INTEGER,
  watch_percentage DECIMAL(5,2),
  is_complete BOOLEAN DEFAULT FALSE,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Then run indexes separately, etc.

**Option B: Use Supabase CLI** (if installed)
```bash
supabase db push migrations/005_video_watch_tracking_clean.sql
```

**Option C: Copy SQL in Smaller Sections**
Copy and paste the SQL in sections rather than all at once.

#### 4. Clear Browser Cache
- Clear browser cache and cookies for supabase.com
- Try a different browser or incognito mode

#### 5. Check Browser Console
Open browser DevTools (F12) and check the Console tab for more detailed error messages.

### SQL File Location
The corrected SQL file is at: `migrations/005_video_watch_tracking_clean.sql`

### Verification
After successfully running the migration, verify with:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'child_video_watches'
);
```

This should return `true`.

