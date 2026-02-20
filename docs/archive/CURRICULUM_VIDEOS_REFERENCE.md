# Curriculum Videos - Complete Reference

This document contains the complete schema, types, and API usage for the `curriculum_videos` table.

---

## 📊 Database Schema

### Table: `curriculum_videos`

```sql
CREATE TABLE IF NOT EXISTS public.curriculum_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.curriculum_roadmap(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  channel_name TEXT,
  channel_id TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(work_id, youtube_video_id)
);
```

### Indexes

```sql
CREATE INDEX idx_curriculum_videos_work_id ON public.curriculum_videos(work_id);
CREATE INDEX idx_curriculum_videos_is_approved ON public.curriculum_videos(is_approved);
CREATE INDEX idx_curriculum_videos_is_active ON public.curriculum_videos(is_active);
CREATE INDEX idx_curriculum_videos_relevance_score ON public.curriculum_videos(relevance_score DESC);
CREATE INDEX idx_curriculum_videos_youtube_id ON public.curriculum_videos(youtube_video_id);
```

### Row Level Security (RLS) Policies

- **Anyone can view approved active videos**
- **Admins can view all videos**
- **Admins can insert videos**
- **Admins can update videos**
- **Admins can delete videos**

---

## 📝 TypeScript Type Definition

```typescript
// Add this to types/database.ts or create a new types file

export interface CurriculumVideo {
  id: string; // UUID
  work_id: string; // UUID - references curriculum_roadmap.id
  youtube_video_id: string; // YouTube video ID (e.g., "dQw4w9WgXcQ")
  youtube_url: string; // Full YouTube URL
  title: string; // Video title
  description?: string | null; // Video description
  channel_name?: string | null; // YouTube channel name
  channel_id?: string | null; // YouTube channel ID
  thumbnail_url?: string | null; // Video thumbnail URL
  duration_seconds?: number | null; // Video duration in seconds
  view_count?: number | null; // Number of views
  like_count?: number | null; // Number of likes
  comment_count?: number | null; // Number of comments
  rating?: number | null; // Decimal rating (0.00 to 5.00)
  relevance_score?: number | null; // 0-100 relevance score
  is_approved: boolean; // Whether video is approved by admin
  is_active: boolean; // Whether video is active
  added_by?: string | null; // UUID of user who added the video
  approved_by?: string | null; // UUID of admin who approved
  approved_at?: string | null; // ISO timestamp of approval
  added_at: string; // ISO timestamp of creation
  last_updated: string; // ISO timestamp of last update
}

// With related curriculum work
export interface CurriculumVideoWithWork extends CurriculumVideo {
  curriculum_roadmap?: {
    work_name: string;
    area: string;
    stage: string;
  };
}

// For creating a new video
export interface CreateCurriculumVideoInput {
  work_id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  description?: string;
  channel_name?: string;
  channel_id?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  rating?: number;
  relevance_score?: number;
  is_approved?: boolean;
  is_active?: boolean;
}

// For updating a video
export interface UpdateCurriculumVideoInput {
  is_approved?: boolean;
  is_active?: boolean;
  relevance_score?: number;
  title?: string;
  description?: string;
}
```

---

## 🔧 Helper Functions (from migration)

### Get approved video for a work

```sql
SELECT * FROM public.get_work_video(p_work_id UUID);
```

Returns the best approved, active video for a curriculum work.

### Check if work needs video search

```sql
SELECT * FROM public.work_needs_video_search(p_work_id UUID);
```

Returns `true` if work needs a video search (no approved video and cache expired).

### Get video discovery statistics

```sql
SELECT * FROM public.get_video_discovery_stats();
```

Returns statistics about video discovery:
- `total_works` - Total curriculum works
- `works_with_videos` - Works with approved videos
- `works_pending_approval` - Works with unapproved videos
- `works_missing_videos` - Works without videos
- `average_relevance_score` - Average relevance score
- `total_searches_performed` - Total searches done
- `searches_last_30_days` - Searches in last 30 days

---

## 🌐 API Endpoints

### 1. Get Videos (Admin)

**Endpoint:** `GET /api/admin/videos`

**Query Parameters:**
- `status` (optional): `all` | `approved` | `pending` | `missing`
- `area` (optional): Filter by curriculum area

**Response:**
```typescript
{
  success: true,
  videos: CurriculumVideoWithWork[]
}
```

**Example:**
```typescript
const response = await fetch('/api/admin/videos?status=approved');
const { videos } = await response.json();
```

### 2. Update Video (Admin)

**Endpoint:** `PUT /api/admin/videos`

**Body:**
```typescript
{
  videoId: string;
  isApproved?: boolean;
  isActive?: boolean;
}
```

**Response:**
```typescript
{
  success: true,
  video: CurriculumVideo,
  message: string
}
```

**Example:**
```typescript
const response = await fetch('/api/admin/videos', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'video-uuid',
    isApproved: true
  })
});
```

### 3. Delete Video (Admin)

**Endpoint:** `DELETE /api/admin/videos?videoId={id}`

**Response:**
```typescript
{
  success: true,
  message: 'Video deleted'
}
```

### 4. Get Video for Work

**Endpoint:** `GET /api/youtube/video/[workId]`

**Response:**
```typescript
{
  work: CurriculumWork,
  video: CurriculumVideo | null,
  alternatives: CurriculumVideo[],
  hasVideo: boolean
}
```

**Example:**
```typescript
const response = await fetch('/api/youtube/video/work-uuid');
const { video, alternatives } = await response.json();
```

---

## 💻 Usage Examples

### Creating a Video (Server-side)

```typescript
import { createClient } from '@/lib/supabase';
import { CreateCurriculumVideoInput } from '@/types/database';

async function createCurriculumVideo(input: CreateCurriculumVideoInput) {
  const supabase = createClient(); // Uses service role key
  
  const { data, error } = await supabase
    .from('curriculum_videos')
    .insert({
      ...input,
      added_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Getting Approved Videos for a Work (Client-side)

```typescript
import { createSupabaseClient } from '@/lib/supabase';

async function getWorkVideo(workId: string) {
  const supabase = createSupabaseClient(); // Uses anon key
  
  const { data, error } = await supabase
    .from('curriculum_videos')
    .select('*')
    .eq('work_id', workId)
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('relevance_score', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No video found
      return null;
    }
    throw error;
  }
  
  return data;
}
```

### Listing All Videos for Admin Review

```typescript
import { createClient } from '@/lib/supabase';

async function getAllVideos(status?: 'approved' | 'pending') {
  const supabase = createClient();
  
  let query = supabase
    .from('curriculum_videos')
    .select(`
      *,
      curriculum_roadmap (
        work_name,
        area,
        stage
      )
    `)
    .order('relevance_score', { ascending: false });
  
  if (status === 'approved') {
    query = query.eq('is_approved', true).eq('is_active', true);
  } else if (status === 'pending') {
    query = query.eq('is_approved', false).eq('is_active', true);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data;
}
```

### Approving a Video

```typescript
import { createClient } from '@/lib/supabase';

async function approveVideo(videoId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('curriculum_videos')
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    })
    .eq('id', videoId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Getting Video Statistics

```typescript
import { createClient } from '@/lib/supabase';

async function getVideoStats() {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_video_discovery_stats');
  
  if (error) throw error;
  return data[0]; // Function returns a table, get first row
}
```

---

## 🔗 Related Tables

### `curriculum_roadmap`
- **Relationship:** `curriculum_videos.work_id` → `curriculum_roadmap.id`
- **Cascade:** ON DELETE CASCADE (deleting a work deletes its videos)

### `video_search_cache`
- **Purpose:** Caches YouTube search results
- **Relationship:** `video_search_cache.work_id` → `curriculum_roadmap.id`

### `video_search_logs`
- **Purpose:** Logs all video search operations
- **Relationship:** `video_search_logs.work_id` → `curriculum_roadmap.id`

---

## 📋 Common Queries

### Get all pending videos with work details

```sql
SELECT 
  cv.*,
  cr.work_name,
  cr.area,
  cr.stage
FROM curriculum_videos cv
JOIN curriculum_roadmap cr ON cv.work_id = cr.id
WHERE cv.is_approved = false
  AND cv.is_active = true
ORDER BY cv.relevance_score DESC NULLS LAST;
```

### Get works missing videos

```sql
SELECT cr.*
FROM curriculum_roadmap cr
LEFT JOIN curriculum_videos cv ON cr.id = cv.work_id 
  AND cv.is_approved = true 
  AND cv.is_active = true
WHERE cv.id IS NULL;
```

### Get top videos by relevance

```sql
SELECT 
  cv.*,
  cr.work_name
FROM curriculum_videos cv
JOIN curriculum_roadmap cr ON cv.work_id = cr.id
WHERE cv.is_approved = true
  AND cv.is_active = true
ORDER BY cv.relevance_score DESC
LIMIT 10;
```

---

## ⚠️ Important Notes

1. **RLS Policies:** Client-side queries use the anon key and are subject to RLS. Only approved, active videos are visible to non-admins.

2. **Service Role Key:** Admin operations should use `createClient()` from `lib/supabase.ts` which uses the service role key to bypass RLS.

3. **Unique Constraint:** The combination of `work_id` and `youtube_video_id` must be unique. Attempting to insert a duplicate will fail.

4. **Cascade Delete:** Deleting a curriculum work will automatically delete all associated videos.

5. **Relevance Score:** Should be between 0-100. Higher scores indicate better matches for the curriculum work.

6. **Approval Workflow:** Videos are created with `is_approved = false` by default. Admins must approve them before they become visible to users.

---

**Last Updated:** December 2024

