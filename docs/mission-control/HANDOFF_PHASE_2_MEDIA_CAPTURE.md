# HANDOFF: Phase 2 - Teacher Media Capture

**Session:** 52 → 53  
**Date:** January 18, 2026  
**Status:** Phase 1 AUDITED ✅ - Phase 2 Ready

---

## 🔍 AUDIT COMPLETED

### Critical Bug Found & Fixed
- **Issue:** Original `051_whale_media_storage.sql` referenced non-existent tables
  - `montree_classrooms` - doesn't exist
  - `montree_classroom_teachers` - doesn't exist
  - `user_school_access` - doesn't exist
  
- **Resolution:** File replaced with corrected version
  - Uses simplified RLS (authenticated access)
  - API routes handle teacher authentication (cookie-based)
  - Service role handles database operations
  - RLS is backup security layer

### File Cleanup
- `051_whale_media_storage.sql` ← **CURRENT (corrected)**
- `051_whale_media_storage_BROKEN_DO_NOT_USE.sql` ← archived bad version
- `051_whale_media_storage_v2_SUPERSEDED.sql` ← archived intermediate version

---

## ✅ PHASE 1 COMPLETED (Audited)

### Database Tables (migrations/050_weekly_reports_media_system.sql) ✅
- `montree_media` - stores photos/videos with metadata
- `montree_media_children` - links group photos to multiple children
- `montree_weekly_reports` - generated reports
- `montree_report_media` - links reports to media
- `montree_parent_access` - parent-child relationships
- `montree_consent_log` - COPPA compliance (immutable)
- `montree_work_translations` - curriculum → parent-friendly explanations

### Storage (migrations/051_whale_media_storage.sql) ✅
- Bucket: `whale-media` (must create manually in Supabase)
- Path structure: `/{school_id}/{child_id}/{YYYY}/{MM}/`
- Simplified RLS - API handles auth, RLS is backup layer

### Work Translations (237 works seeded) ✅
- Practical Life: 65 works (3 seed files)
- Sensorial: 35 works
- Language: 43 works
- Mathematics: 49 works
- Cultural: 45 works

---

## ⚠️ MIGRATION INSTRUCTIONS

### Step-by-Step (In Supabase SQL Editor):
```
1. Create 'whale-media' bucket manually:
   - Go to Storage → New Bucket
   - Name: whale-media
   - Public: FALSE (private)
   - File size limit: 52428800 (50MB)
   - Allowed MIME types: image/*, video/*

2. Run migrations in order:
   - 050_weekly_reports_media_system.sql
   - 051_whale_media_storage.sql
   - 052_seed_translations_practical_life_1.sql
   - 052_seed_translations_practical_life_2.sql
   - 052_seed_translations_practical_life_3.sql
   - 053_seed_translations_sensorial.sql
   - 054_seed_translations_language.sql
   - 055_seed_translations_mathematics.sql
   - 056_seed_translations_cultural.sql
```

---

## 📋 PHASE 2 DELIVERABLES

### 2.1 Camera Capture Component
**File:** `components/montree/media/CameraCapture.tsx`
- Use browser `getUserMedia` API for web
- Per-child quick capture (select child → snap → done)
- Support photo and video modes
- Preview before confirming

### 2.2 Image Compression
**File:** `lib/montree/media/compression.ts`
- Compress images before upload (target: < 500KB for photos)
- Maintain reasonable quality
- Generate thumbnail (200x200)

### 2.3 Upload Service
**File:** `lib/montree/media/upload.ts`
- Upload to Supabase Storage (`whale-media` bucket)
- Path: `/{school_id}/{child_id}/{YYYY}/{MM}/{uuid}.{ext}`
- Create `montree_media` record with metadata
- Handle offline queue (store locally, sync when online)

### 2.4 Group Photo Flow
**File:** `components/montree/media/GroupCapture.tsx`
- Capture photo first
- Then select multiple children to tag
- Creates `montree_media` record + `montree_media_children` links

### 2.5 Untagged Media Queue
**File:** `app/montree/teacher/media/untagged/page.tsx`
- Shows photos without child assignment
- Quick tagging interface
- Batch tagging support

### 2.6 Media Gallery (Teacher View)
**File:** `app/montree/teacher/media/page.tsx`
- View all captured media
- Filter by child, date, work area
- Quick tag/edit interface

---

## 🗂️ FILE STRUCTURE

```
app/montree/teacher/media/
├── page.tsx                    # Media gallery
├── capture/page.tsx            # Camera capture page
└── untagged/page.tsx           # Untagged queue

components/montree/media/
├── CameraCapture.tsx           # Camera component
├── GroupCapture.tsx            # Group photo flow
├── MediaCard.tsx               # Single media display
├── MediaGallery.tsx            # Gallery grid
├── TaggingModal.tsx            # Child/work tagging
└── UntaggedQueue.tsx           # Untagged items list

lib/montree/media/
├── compression.ts              # Image compression
├── upload.ts                   # Supabase upload
├── offline-queue.ts            # Offline support
└── types.ts                    # TypeScript types

app/api/montree/media/
├── upload/route.ts             # Upload endpoint
├── tag/route.ts                # Tagging endpoint
└── [id]/route.ts               # Single media operations
```

---

## 🔧 TECHNICAL DECISIONS

### Camera API
- **Web:** `navigator.mediaDevices.getUserMedia()`
- **Future Mobile:** React Native Vision Camera (when needed)

### Compression Library
- Use `browser-image-compression` npm package
- Target: 500KB max for photos, 80% quality

### Offline Support
- Store pending uploads in IndexedDB
- Sync when connection restored
- Show sync status indicator

### Thumbnail Generation
- Generate client-side before upload
- 200x200 pixels, JPEG format
- Store in same path with `-thumb` suffix

### Authentication Note
- Teachers authenticate via cookie (`teacherName`)
- API routes verify teacher identity
- RLS is backup security layer (authenticated access)

---

## 🚀 TO START PHASE 2

In fresh chat, say:

```
Continue Montree development.
READ FIRST:
~/Desktop/whale/docs/mission-control/brain.json
~/Desktop/whale/docs/mission-control/HANDOFF_PHASE_2_MEDIA_CAPTURE.md
```

---

## ⚠️ BEFORE STARTING

1. **Run Phase 1 migrations in Supabase:**
   - Create `whale-media` bucket (private, 50MB limit)
   - Run migrations 050-056 in order

2. **Verify tables exist:**
   - `montree_media`
   - `montree_media_children`
   - `montree_work_translations` (with 237 rows)

---

## 📊 SUCCESS CRITERIA FOR PHASE 2

- [ ] Teacher can capture photo in 2 taps (select child → snap)
- [ ] Photos upload to Supabase with compression
- [ ] Thumbnails generated automatically
- [ ] Group photos can tag multiple children
- [ ] Untagged queue shows photos needing assignment
- [ ] Works offline and syncs when connected
- [ ] Gallery shows all media with filters

---

## 🔄 QUALITY PROTOCOL REMINDER

1. ✅ Segment work into bite-size chunks
2. ✅ Update brain.json after EVERY step
3. ✅ Analyze best way to proceed after each chunk
4. ✅ Deep audit all work before phase completion
5. ✅ Check functionality + aesthetics + integration
6. ✅ Fix ANY imperfections before moving on
7. ✅ Write handoff + fresh chat after every phase
