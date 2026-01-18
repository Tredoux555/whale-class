# HANDOFF: Phase 3 - Weekly Report Generation

**Created:** 2026-01-18T17:50:00Z  
**Session:** 54  
**Status:** 🚀 READY TO BUILD

---

## 📋 CONTEXT FOR NEW CLAUDE

You are building the **Weekly Report Generation** system for the Whale Montessori Platform. This is Phase 3 of the Media & Reports system.

### Read First
```
~/Desktop/whale/docs/mission-control/brain.json
```

### Core Laws (MEMORIZE)
1. `/montree/` is THE PRODUCT - standalone, duplicatable per school
2. `/admin/` is Tredoux's sandbox - DISCONNECTED from Montree
3. Brain updates MANDATORY after every chunk
4. JAPANESE ENGINEER MINDSET - perfection before progress
5. PURE ENGLISH - no Chinese, i18n comes later

---

## ✅ PHASE 2 COMPLETE (What's Already Built)

### Database Tables (Migration 050)
- `montree_media` - Photos/videos storage records
- `montree_media_children` - Group photo child links
- `montree_weekly_reports` - Report records (EMPTY - ready to use)
- `montree_report_media` - Links reports to photos
- `montree_parent_access` - Parent permissions
- `montree_consent_log` - COPPA audit trail
- `montree_work_translations` - 237 works with developmental context

### Storage
- Bucket: `whale-media` (private, 50MB limit, image/* video/*)

### API Routes Built
```
GET  /api/montree/media          - List media with filters
POST /api/montree/media/upload   - Upload photo/video
GET  /api/montree/media/url      - Get signed URL
POST /api/montree/media/urls     - Batch signed URLs
```

### Components Built
```
components/montree/media/CameraCapture.tsx   - Camera UI
components/montree/media/ChildSelector.tsx   - Child picker
components/montree/media/MediaCard.tsx       - Photo card
components/montree/media/MediaGallery.tsx    - Photo grid
```

### Pages Built
```
/montree/dashboard              - Main view with camera buttons
/montree/dashboard/capture      - Photo capture flow
/montree/dashboard/media        - Photo gallery
```

---

## 🎯 PHASE 3 OBJECTIVE

Build the **Weekly Report Generation** system that:
1. Aggregates a child's photos for the week
2. Links photos to curriculum works (with developmental context)
3. Generates teacher-facing reports (detailed)
4. Generates parent-facing reports (warm, educational)
5. Allows teacher review before sending
6. Tracks sent/approved status

---

## 📐 PHASE 3 ARCHITECTURE

### Data Flow
```
Photos (montree_media)
    ↓
Weekly Aggregation (by child + week)
    ↓
Report Generation (montree_weekly_reports)
    ↓
Teacher Review
    ↓
Parent Delivery
```

### Report Types
1. **Teacher Report** - Internal, detailed, includes all observations
2. **Parent Report** - Warm tone, developmental context, home extensions

### Weekly Report Content Structure (JSON)
```json
{
  "summary": "This week Rachel explored...",
  "highlights": [
    {
      "media_id": "uuid",
      "work_id": "pouring_water",
      "observation": "Focused concentration for 12 minutes",
      "developmental_note": "Building hand-eye coordination...",
      "home_extension": "Try pouring water at home..."
    }
  ],
  "areas_explored": ["practical_life", "sensorial"],
  "milestones": [],
  "teacher_notes": "Private notes for teacher only"
}
```

---

## 🔨 PHASE 3 CHUNKS (10 bite-sized pieces)

| Chunk | Description | Est. Time |
|-------|-------------|-----------|
| 1 | TypeScript types for reports | 10 min |
| 2 | Report generation API (aggregate week's photos) | 20 min |
| 3 | AI content generation (observations → narrative) | 25 min |
| 4 | Report list API (get reports by child/week) | 15 min |
| 5 | Report detail API (get single report) | 10 min |
| 6 | Report update API (edit, approve, send) | 15 min |
| 7 | Weekly Reports page (list view) | 20 min |
| 8 | Report Editor component (teacher review UI) | 30 min |
| 9 | Report Preview component (parent view) | 20 min |
| 10 | Dashboard integration + testing | 15 min |

**Total Estimated: ~3 hours**

---

## 🗄️ DATABASE READY

The `montree_weekly_reports` table already exists:

```sql
CREATE TABLE montree_weekly_reports (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  classroom_id UUID,
  child_id UUID NOT NULL,
  
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_type TEXT NOT NULL, -- 'teacher' | 'parent'
  status TEXT DEFAULT 'draft', -- 'draft' | 'pending_review' | 'approved' | 'sent'
  
  content JSONB NOT NULL DEFAULT '{}',
  
  pdf_path TEXT,
  slideshow_path TEXT,
  
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  sent_at TIMESTAMPTZ,
  sent_to JSONB,
  
  UNIQUE(child_id, week_start, report_type)
);
```

---

## 🧠 AI GENERATION STRATEGY

Use Claude API to transform raw observations into warm parent narratives:

**Input:**
- Child name
- Photos from the week
- Work translations (developmental context)
- Teacher notes (if any)

**Output:**
- Summary paragraph
- Per-photo observations with developmental meaning
- Home extension suggestions
- Warm, encouraging tone

**Prompt Template:**
```
You are writing a weekly Montessori progress report for {child_name}'s parents.

This week, {child_name} was photographed doing these activities:
{activities_list}

For each activity, write:
1. A warm observation (what the child did)
2. The developmental significance (from Montessori perspective)
3. A home extension activity parents can try

Keep the tone warm, encouraging, and educational. Avoid jargon.
```

---

## 📁 FILES TO CREATE

```
lib/montree/reports/types.ts
lib/montree/reports/generator.ts
lib/montree/reports/ai-content.ts

app/api/montree/reports/route.ts          (GET list, POST generate)
app/api/montree/reports/[id]/route.ts     (GET, PATCH, DELETE)
app/api/montree/reports/send/route.ts     (POST send to parents)

components/montree/reports/ReportCard.tsx
components/montree/reports/ReportEditor.tsx
components/montree/reports/ReportPreview.tsx
components/montree/reports/WeekSelector.tsx

app/montree/dashboard/reports/page.tsx
app/montree/dashboard/reports/[id]/page.tsx
```

---

## 🚀 START COMMAND

```
Read brain.json first, then begin with Chunk 1: TypeScript types for reports
```

Remember: Update brain.json after EVERY chunk. Japanese Engineer mindset - perfection in every step.

---

## 🐋 GO BUILD SOMETHING BEAUTIFUL
