# 📹 MEDIA SYSTEM UPGRADE - January 5, 2026

## What Changed

The photo-only system has been upgraded to a **unified media system** supporting both photos and videos, with parent-sharing capabilities built in.

---

## 🗄️ DATABASE: Run This SQL

```sql
-- Migration: Child Work Media (Photos + Videos)
-- Unified media storage for classroom documentation

-- Drop old table if it exists (was just created, should be empty)
DROP TABLE IF EXISTS child_work_photos;

-- Create unified media table
CREATE TABLE IF NOT EXISTS child_work_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES weekly_assignments(id) ON DELETE SET NULL,
  work_id TEXT REFERENCES curriculum_roadmap(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  
  -- Media info
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Video-specific
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  
  -- Metadata
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  week_number INTEGER,
  year INTEGER,
  
  -- Parent sharing controls
  parent_visible BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  
  -- Daily report grouping
  report_date DATE DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_child_work_media_child ON child_work_media(child_id);
CREATE INDEX idx_child_work_media_assignment ON child_work_media(assignment_id);
CREATE INDEX idx_child_work_media_work ON child_work_media(work_id);
CREATE INDEX idx_child_work_media_week ON child_work_media(week_number, year);
CREATE INDEX idx_child_work_media_type ON child_work_media(media_type);
CREATE INDEX idx_child_work_media_parent ON child_work_media(parent_visible, child_id);
CREATE INDEX idx_child_work_media_featured ON child_work_media(is_featured, child_id);
CREATE INDEX idx_child_work_media_report_date ON child_work_media(report_date, child_id);

-- RLS
ALTER TABLE child_work_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read all media" ON child_work_media FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON child_work_media FOR ALL USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER child_work_media_updated_at
  BEFORE UPDATE ON child_work_media
  FOR EACH ROW EXECUTE FUNCTION update_media_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('work-photos', 'work-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('work-videos', 'work-videos', true) ON CONFLICT DO NOTHING;

-- Storage policies (photos)
CREATE POLICY "Allow photo uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'work-photos');
CREATE POLICY "Allow photo reads" ON storage.objects FOR SELECT USING (bucket_id = 'work-photos');

-- Storage policies (videos)
CREATE POLICY "Allow video uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'work-videos');
CREATE POLICY "Allow video reads" ON storage.objects FOR SELECT USING (bucket_id = 'work-videos');
```

---

## 📁 Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `migrations/021_child_work_media.sql` | NEW | Database schema for unified media |
| `app/api/media/route.ts` | NEW | API: POST/GET/PATCH/DELETE media |
| `app/admin/classroom/[childId]/page.tsx` | MODIFIED | UI: Added video recording + parent sharing |

---

## 🎬 NEW FEATURES

### In Child Detail Page (`/admin/classroom/[childId]`)

1. **📷 Photo Button** - Capture photos (existing)
2. **🎥 Video Button** - Record videos (NEW)
3. **Media Gallery** - Shows both photos & videos with type indicators
4. **Parent Sharing** - Toggle "👁 Share with Parents" per media item
5. **Featured Flag** - Mark best clips for parent meetings with "⭐ Featured"

### API Endpoints (`/api/media`)

| Method | Purpose |
|--------|---------|
| `POST` | Upload photo or video (auto-detects type) |
| `GET` | Fetch media with filters (child, week, type, parentOnly, featured) |
| `PATCH` | Update visibility/featured/notes |
| `DELETE` | Remove media from storage + database |

### Query Examples
```
GET /api/media?childId=xxx&week=1&year=2026
GET /api/media?childId=xxx&type=video
GET /api/media?childId=xxx&parentOnly=true
GET /api/media?childId=xxx&featured=true
GET /api/media?childId=xxx&date=2026-01-05  // Daily report
```

---

## 🔮 FUTURE: Parent Dashboard

The framework supports:
- **Daily Reports**: Filter by `report_date` + `parent_visible=true`
- **Parent Meetings**: Filter by `is_featured=true`
- **Child Portfolio**: All media for a child, sorted by date

Just build a `/parent/[childId]` page that queries:
```javascript
const res = await fetch(`/api/media?childId=${childId}&parentOnly=true`);
```

---

## ✅ TEST CHECKLIST

1. [ ] Run SQL migration in Supabase
2. [ ] Go to classroom → click child
3. [ ] 📷 button works (takes photo)
4. [ ] 🎥 button works (records video)
5. [ ] Media thumbnails show under work
6. [ ] Tap thumbnail → fullscreen viewer
7. [ ] Videos play in viewer
8. [ ] "Share with Parents" toggle works
9. [ ] "Featured" toggle works
10. [ ] Media gallery at top shows counts

---

## 🚀 Deploy

```bash
cd ~/Desktop/whale
git add -A
git commit -m "Add unified media system with video + parent sharing"
git push
```

Then run SQL in Supabase Dashboard → SQL Editor.
