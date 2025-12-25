# 🔧 Migration Order - Fix Required

## ❌ Current Error

```
ERROR: relation "public.curriculum_roadmap" does not exist
```

This happens because `004_youtube_video_automation.sql` depends on `curriculum_roadmap` table, which doesn't exist yet.

---

## ✅ Correct Migration Order

### Step 1: Create Curriculum Tables
**File:** `migrations/003_create_curriculum_tables.sql`

1. Open Supabase SQL Editor
2. Copy entire contents of `migrations/003_create_curriculum_tables.sql`
3. Paste and run
4. Verify table created: `curriculum_roadmap`

### Step 2: Seed Curriculum Data
**File:** `scripts/seed-curriculum.ts`

```bash
# Make sure dev server is running
npm run dev

# In another terminal, run seed script
npx ts-node scripts/seed-curriculum.ts
```

This will populate all 74 curriculum works into `curriculum_roadmap`.

**Expected output:**
```
✅ Successfully seeded 74 curriculum works!
Breakdown by stage: ...
Breakdown by area: ...
```

### Step 3: Run YouTube Video Automation Migration
**File:** `migrations/004_youtube_video_automation.sql`

1. Open Supabase SQL Editor
2. Copy entire contents of `migrations/004_youtube_video_automation.sql`
3. Paste and run
4. Verify 3 tables created:
   - `curriculum_videos`
   - `video_search_cache`
   - `video_search_logs`

---

## ✅ Verification

After all migrations, verify tables exist:

```sql
-- Check curriculum_roadmap
SELECT COUNT(*) FROM curriculum_roadmap;
-- Should return: 74

-- Check YouTube tables
SELECT COUNT(*) FROM curriculum_videos;
-- Should return: 0 (empty until discovery runs)

SELECT COUNT(*) FROM video_search_cache;
-- Should return: 0 (empty until discovery runs)
```

---

## 🎯 Next Steps

After migrations complete:

1. **Get YouTube API Key** (if not done)
2. **Run discovery**: `npx ts-node scripts/discover-videos.ts`
3. **Approve videos**: Go to `/admin/video-management`

---

## 💰 YouTube API Costs

**Free Tier:** 10,000 units/day (FREE)

**Your Usage:**
- Initial discovery: ~7,500 units (one-time)
- Daily cron: ~2,000 units/day
- **Total: ~$0/month** ✅

**Costs only if you exceed:**
- $0.10 per 1,000 additional units
- Very unlikely with 30-day caching

---

## ✅ You're Ready!

Once migrations are complete, the YouTube video automation system will work perfectly!











