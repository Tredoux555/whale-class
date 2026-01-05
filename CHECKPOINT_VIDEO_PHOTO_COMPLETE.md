# CHECKPOINT: Video + Photo System Complete
## January 5, 2026

---

## ✅ ALL COMPLETED

### Phase 1: Video System
1. **API Fix** - `child-detail` now queries `curriculum_videos` table
2. **Admin Page** - `/admin/add-video` to manually add YouTube URLs
3. **API Routes** - `curriculum-works` and `add-video` endpoints

### Phase 2: Photo Capture System
1. **Database Migration** - `migrations/020_child_work_photos.sql`
2. **Photo API** - `/api/photos` (POST upload, GET list)
3. **Child Detail UI** - Camera button per work, photo gallery, fullscreen viewer

---

## 📁 FILES CREATED/MODIFIED

**New Files:**
- `app/admin/add-video/page.tsx`
- `app/api/admin/curriculum-works/route.ts`
- `app/api/admin/add-video/route.ts`
- `app/api/photos/route.ts`
- `migrations/020_child_work_photos.sql`

**Modified Files:**
- `app/api/weekly-planning/child-detail/route.ts`
- `app/admin/classroom/[childId]/page.tsx`

---

## 🗄️ DATABASE SETUP REQUIRED

Run in Supabase SQL Editor:
```sql
-- 1. Run the migration
-- (paste contents of migrations/020_child_work_photos.sql)

-- 2. Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-photos', 'work-photos', true)
ON CONFLICT DO NOTHING;

-- 3. Storage policy (allow uploads)
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'work-photos');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'work-photos');
```

---

## 🧪 HOW TO TEST

### Video System:
1. Go to `teacherpotato.xyz/admin/add-video`
2. Click any work → Paste YouTube URL → Save
3. Go to classroom → Click child → See ▶️ on works with videos

### Photo System:
1. Go to classroom → Click a child
2. Click 📷 on any work → Take/select photo
3. Photo appears under the work
4. Tap photo to view fullscreen

---

## 🎯 FEATURES BUILT

**Child Detail Page Now Has:**
- Progress tracking (tap to cycle status)
- 📷 Camera button per work (opens device camera/gallery)
- Photo thumbnails under each work
- Photo gallery at top showing all week's photos
- Fullscreen photo viewer with date/work name
- ▶️ Video button if work has demo video
- Video modal with YouTube embed

---

## 🚀 DEPLOY STEPS

1. `cd ~/Desktop/whale`
2. `git add -A`
3. `git commit -m "Add video + photo capture system"`
4. `git push`
5. Run SQL migration in Supabase
6. Create storage bucket in Supabase

---

## ⚠️ NOTES

- Photos stored in Supabase Storage (`work-photos` bucket)
- Camera uses `capture="environment"` for rear camera on mobile
- Photos linked to: child_id, assignment_id, work_id, week/year
- Video system checks both `curriculum_roadmap.video_url` and `curriculum_videos` table
