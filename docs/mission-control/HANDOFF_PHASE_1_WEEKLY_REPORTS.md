# 🐋 HANDOFF: Weekly Reports & Media System - PHASE 1

**Date:** January 18, 2026  
**Session:** 51 → 52  
**Phase:** 8.1 - Database Foundation + Storage Setup  
**Status:** Ready to Build

---

## 🎯 MANDATORY: READ FIRST

### Quality Principles (Japanese Engineer Mindset)

Before ANY work begins, internalize these principles:

```
┌─────────────────────────────────────────────────────────────────┐
│  PERFECTION OVER SPEED                                          │
│                                                                 │
│  • Seek perfection in every task                               │
│  • Identify potential issues and FIX them before production    │
│  • Make absolutely flawless - saves great headache later       │
│  • Ensure what you build works perfectly with what came before │
│  • Ensure what you build will integrate flawlessly with next   │
│  • Oversee entire project as a grand masterpiece               │
└─────────────────────────────────────────────────────────────────┘
```

### Checkpoint Protocol (MANDATORY)

After EVERY step of work:

1. ✅ Complete bite-size chunk
2. ✅ Update brain.json immediately
3. ✅ Analyze best way to proceed
4. ✅ Check functionality
5. ✅ Check aesthetics
6. ✅ Check integration with existing code
7. ✅ Identify and fix ANY imperfections
8. ✅ Only then proceed to next chunk

### Phase Completion Protocol

After completing entire phase:

1. 🔍 Deep audit ALL work done
2. 🔍 Verify everything functional
3. 🔍 Analyze improvements against bigger vision
4. 🔍 Analyze aesthetic improvements possible
5. 🔍 Ensure flawless integration with previous work
6. 🔍 Ensure ready for next phase integration
7. 📝 Update brain.json with completion status
8. 📝 Write comprehensive handoff
9. 🔄 Fresh chat for next phase

---

## 📚 CONTEXT: What Came Before

### Session 50 Completed: Bulletproof Import System

**Architecture:** AI extracts → Fuzzy matcher → Confidence scoring → Teacher review → Learning loop

**Files Created:**
- `migrations/montree_synonyms_and_import.sql` - Tables + 70 seed synonyms
- `lib/montree/fuzzy-matcher.ts` - SoftTFIDF algorithm (85-91% accuracy)
- `app/api/montree/classroom/bootstrap/preview/route.ts` - AI extraction + matching
- `app/api/montree/synonyms/learn/route.ts` - Learning from corrections
- `app/montree/admin/students/page.tsx` - UI with confidence colors

**Status:** Complete, needs testing. SQL migration needs to be run in Supabase.

### The Bigger Vision

Whale is a Montessori classroom management platform. The Weekly Reports & Media System is the **MAIN SELLING POINT** - this is what differentiates Whale from competitors.

**Key insight from research:** Parents don't want curriculum jargon ("Pink Tower work"). They want to know their child is developing visual discrimination and fine motor control. The translation layer from curriculum → developmental meaning is the magic.

---

## 🎯 PHASE 1 OBJECTIVE

**Goal:** Establish the complete data layer for media storage and weekly reports

This is the foundation everything else builds on. Get this perfect.

---

## 📊 DATABASE TABLES TO CREATE

### 1. montree_media

Stores all photos and videos captured by teachers.

```sql
CREATE TABLE montree_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  classroom_id UUID,
  child_id UUID,  -- NULL for group photos
  
  -- Media info
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size_bytes INT,
  duration_seconds INT,  -- For videos
  width INT,
  height INT,
  
  -- Metadata
  captured_by TEXT NOT NULL,  -- Teacher user_id
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Content
  tags JSONB DEFAULT '[]',  -- ["practical_life", "concentration"]
  caption TEXT,
  caption_zh TEXT,
  
  -- Processing
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  processing_status TEXT DEFAULT 'complete' CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_school ON montree_media(school_id);
CREATE INDEX idx_media_child ON montree_media(child_id);
CREATE INDEX idx_media_captured_at ON montree_media(captured_at DESC);
CREATE INDEX idx_media_classroom ON montree_media(classroom_id);
```

### 2. montree_media_children

Links group photos to multiple children (many-to-many).

```sql
CREATE TABLE montree_media_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES montree_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(media_id, child_id)
);

CREATE INDEX idx_media_children_media ON montree_media_children(media_id);
CREATE INDEX idx_media_children_child ON montree_media_children(child_id);
```

### 3. montree_weekly_reports

Stores generated weekly reports for both teachers and parents.

```sql
CREATE TABLE montree_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  classroom_id UUID,
  child_id UUID NOT NULL,
  
  -- Time period
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Report type
  report_type TEXT NOT NULL CHECK (report_type IN ('teacher', 'parent')),
  
  -- Workflow status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'sent')),
  
  -- Content (structured JSON)
  content JSONB NOT NULL DEFAULT '{}',
  content_zh JSONB,  -- Chinese version
  
  -- Generated files
  pdf_path TEXT,
  slideshow_path TEXT,
  
  -- Audit
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, week_start, report_type)
);

CREATE INDEX idx_reports_school ON montree_weekly_reports(school_id);
CREATE INDEX idx_reports_child ON montree_weekly_reports(child_id);
CREATE INDEX idx_reports_week ON montree_weekly_reports(week_start DESC);
CREATE INDEX idx_reports_status ON montree_weekly_reports(status);
```

### 4. montree_report_media

Links reports to the photos/videos included in them.

```sql
CREATE TABLE montree_report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES montree_media(id) ON DELETE CASCADE,
  
  display_order INT DEFAULT 0,
  caption TEXT,  -- Override caption for this report
  caption_zh TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_id, media_id)
);

CREATE INDEX idx_report_media_report ON montree_report_media(report_id);
```

### 5. montree_parent_access

Manages parent-child relationships and access permissions.

```sql
CREATE TABLE montree_parent_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id TEXT NOT NULL,  -- From auth
  child_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Relationship
  relationship_type TEXT DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'family_member')),
  
  -- Permissions
  access_level TEXT DEFAULT 'view' CHECK (access_level IN ('view', 'download', 'full')),
  
  -- Consent (COPPA compliance)
  consent_status TEXT DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'revoked')),
  consent_date TIMESTAMPTZ,
  consent_policy_version TEXT,
  
  -- Contact
  primary_contact BOOLEAN DEFAULT FALSE,
  email TEXT,
  phone TEXT,
  
  -- Invite tracking
  invite_code TEXT,
  invite_sent_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_user_id, child_id)
);

CREATE INDEX idx_parent_access_parent ON montree_parent_access(parent_user_id);
CREATE INDEX idx_parent_access_child ON montree_parent_access(child_id);
CREATE INDEX idx_parent_access_school ON montree_parent_access(school_id);
```

### 6. montree_consent_log

Immutable audit trail for COPPA/GDPR-K compliance.

```sql
CREATE TABLE montree_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_access_id UUID REFERENCES montree_parent_access(id),
  parent_user_id TEXT NOT NULL,
  child_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Consent details
  consent_type TEXT NOT NULL,  -- 'photo_capture', 'report_sharing', 'data_storage'
  consent_given BOOLEAN NOT NULL,
  
  -- Audit info
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  policy_version TEXT NOT NULL,
  
  -- This table is APPEND-ONLY - no updates allowed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_log_parent ON montree_consent_log(parent_user_id);
CREATE INDEX idx_consent_log_child ON montree_consent_log(child_id);
CREATE INDEX idx_consent_log_timestamp ON montree_consent_log(timestamp DESC);

-- Prevent updates/deletes (immutable audit trail)
CREATE OR REPLACE FUNCTION prevent_consent_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Consent log is immutable - no updates or deletes allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_log_immutable
BEFORE UPDATE OR DELETE ON montree_consent_log
FOR EACH ROW EXECUTE FUNCTION prevent_consent_log_modification();
```

### 7. montree_work_translations

The MAGIC table - translates curriculum to developmental meaning.

```sql
CREATE TABLE montree_work_translations (
  work_id TEXT PRIMARY KEY,
  
  -- Display names
  display_name TEXT NOT NULL,
  display_name_zh TEXT,
  
  -- Developmental context (the magic!)
  developmental_context TEXT NOT NULL,
  developmental_context_zh TEXT,
  
  -- Home extension suggestions
  home_extension TEXT,
  home_extension_zh TEXT,
  
  -- Photo caption templates
  photo_caption_template TEXT,
  photo_caption_template_zh TEXT,
  
  -- Metadata
  area TEXT,  -- 'practical_life', 'sensorial', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_translations_area ON montree_work_translations(area);
```

---

## 🗂️ SUPABASE STORAGE SETUP

### Create Bucket

```
Bucket Name: whale-media
Public: FALSE (private bucket)
File Size Limit: 50MB (for videos)
Allowed MIME Types: image/*, video/*
```

### Path Structure

```
/{school_id}/{child_id}/{YYYY}/{MM}/{filename}
  └── Individual child media

/{school_id}/group/{YYYY}/{MM}/{filename}
  └── Group photos

/{school_id}/reports/{child_id}/{week_start}_report.pdf
  └── Generated PDF reports

/{school_id}/slideshows/{child_id}/{week_start}_slideshow.mp4
  └── Generated video slideshows
```

### RLS Policies

```sql
-- Policy: Teachers can upload to their school
CREATE POLICY "Teachers upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whale-media'
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM montree_teacher_assignments
    WHERE teacher_id = auth.uid()
  )
);

-- Policy: Teachers can view their school's media
CREATE POLICY "Teachers view media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whale-media'
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM montree_teacher_assignments
    WHERE teacher_id = auth.uid()
  )
);

-- Policy: Parents can view their children's media
CREATE POLICY "Parents view child media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whale-media'
  AND (
    -- Individual child media
    (storage.foldername(name))[2] IN (
      SELECT child_id::text FROM montree_parent_access
      WHERE parent_user_id = auth.uid()
      AND consent_status = 'granted'
    )
    OR
    -- Group photos (check media_children table via function)
    check_parent_group_photo_access(name, auth.uid())
  )
);
```

---

## 🌱 SEED DATA: Work Translations

This is critical - translate ALL 268 curriculum works to developmental context.

**Structure for each work:**

```json
{
  "work_id": "se_pink_tower",
  "display_name": "Pink Tower",
  "display_name_zh": "粉红塔",
  "developmental_context": "Building with graduated cubes develops visual discrimination of size, fine motor coordination, and concentration—foundational skills for geometry and volume concepts.",
  "developmental_context_zh": "通过搭建由大到小的立方体，发展视觉辨别能力、精细动作协调性和专注力——这些是几何和体积概念的基础技能。",
  "home_extension": "Try sorting household objects by size together!",
  "home_extension_zh": "试着一起按大小给家里的物品排序！",
  "photo_caption_template": "{name} carefully builds the Pink Tower, developing concentration and spatial awareness.",
  "photo_caption_template_zh": "{name}认真地搭建粉红塔，培养专注力和空间意识。",
  "area": "sensorial"
}
```

**Create translations for all works in each area:**
- Practical Life (~45 works)
- Sensorial (~40 works)
- Language (~60 works)
- Mathematics (~65 works)
- Cultural (~58 works)

---

## ✅ PHASE 1 DELIVERABLES CHECKLIST

```
□ 1.1 Create montree_media table
□ 1.2 Create montree_media_children table
□ 1.3 Create montree_weekly_reports table
□ 1.4 Create montree_report_media table
□ 1.5 Create montree_parent_access table
□ 1.6 Create montree_consent_log table (with immutability trigger)
□ 1.7 Create montree_work_translations table
□ 1.8 Create whale-media storage bucket
□ 1.9 Configure RLS policies for storage
□ 1.10 Seed work_translations for Practical Life works
□ 1.11 Seed work_translations for Sensorial works
□ 1.12 Seed work_translations for Language works
□ 1.13 Seed work_translations for Mathematics works
□ 1.14 Seed work_translations for Cultural works
□ 1.15 Deep audit: Verify all tables created correctly
□ 1.16 Deep audit: Test RLS policies
□ 1.17 Deep audit: Verify translations are high quality
□ 1.18 Update brain.json with completion status
□ 1.19 Write Phase 2 handoff
```

---

## 📁 FILES TO REFERENCE

```
READ FIRST:
~/Desktop/whale/docs/mission-control/brain.json

CURRICULUM DATA (for translations):
lib/curriculum/data/practical_life.json
lib/curriculum/data/sensorial.json
lib/curriculum/data/language.json
lib/curriculum/data/mathematics.json
lib/curriculum/data/cultural.json

EXISTING WORK:
lib/montree/fuzzy-matcher.ts (has work_id patterns)
migrations/montree_synonyms_and_import.sql (reference for style)
```

---

## 🧠 KEY REMINDERS

1. **Brain updates are MANDATORY** - Update after every chunk of work
2. **Perfection over speed** - Fix issues before moving on
3. **Integration matters** - Ensure this works with existing import system
4. **Chinese is not translation** - The zh content should sound native, warm
5. **Consent log is sacred** - Immutable for COPPA compliance
6. **Test RLS thoroughly** - Security is critical for child data

---

## 🎬 START HERE

```bash
# 1. Read brain.json first
cat ~/Desktop/whale/docs/mission-control/brain.json

# 2. Review existing curriculum files to understand work structure
ls lib/curriculum/data/

# 3. Begin with creating the migration file
# Start with tables, then storage, then translations
```

Good luck! Remember: **Seek perfection. Update brain after every step. Fresh chat after phase complete.**

---

*Handoff created: January 18, 2026*
*For: Phase 1 - Database Foundation + Storage Setup*
