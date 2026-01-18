-- ============================================
-- PHASE 8: WEEKLY REPORTS & MEDIA SYSTEM
-- Database Foundation + Storage Setup
-- Session 52 - January 18, 2026
-- PURE ENGLISH - i18n will be added later via separate system
-- ============================================

-- This migration creates the complete data layer for:
-- 1. Photo/video capture and storage
-- 2. Weekly report generation (teacher + parent versions)
-- 3. Parent access management with COPPA compliance
-- 4. Curriculum work translations (developmental context)

-- ============================================
-- TABLE 1: montree_media
-- Stores all photos and videos captured by teachers
-- ============================================

CREATE TABLE IF NOT EXISTS montree_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  classroom_id UUID,
  child_id UUID,  -- NULL for group photos
  
  -- Media info
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size_bytes INT,
  duration_seconds INT,  -- For videos only
  width INT,
  height INT,
  
  -- Metadata
  captured_by TEXT NOT NULL,  -- Teacher user_id
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Content
  tags JSONB DEFAULT '[]',  -- ["practical_life", "concentration"]
  work_id TEXT,  -- Link to specific curriculum work if applicable
  caption TEXT,
  
  -- Processing
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  processing_status TEXT DEFAULT 'complete' CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for montree_media
CREATE INDEX IF NOT EXISTS idx_montree_media_school ON montree_media(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_child ON montree_media(child_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_classroom ON montree_media(classroom_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_captured_at ON montree_media(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_montree_media_work ON montree_media(work_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_sync_status ON montree_media(sync_status);

-- ============================================
-- TABLE 2: montree_media_children
-- Links group photos to multiple children (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_media_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES montree_media(id) ON DELETE CASCADE,
  child_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(media_id, child_id)
);

-- Indexes for montree_media_children
CREATE INDEX IF NOT EXISTS idx_montree_media_children_media ON montree_media_children(media_id);
CREATE INDEX IF NOT EXISTS idx_montree_media_children_child ON montree_media_children(child_id);

-- ============================================
-- TABLE 3: montree_weekly_reports
-- Stores generated weekly reports for teachers and parents
-- ============================================

CREATE TABLE IF NOT EXISTS montree_weekly_reports (
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
  
  -- Generated files
  pdf_path TEXT,
  slideshow_path TEXT,
  
  -- Audit trail
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  sent_at TIMESTAMPTZ,
  sent_to JSONB,  -- Array of email addresses or parent IDs
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One report per child per week per type
  UNIQUE(child_id, week_start, report_type)
);

-- Indexes for montree_weekly_reports
CREATE INDEX IF NOT EXISTS idx_montree_reports_school ON montree_weekly_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_reports_child ON montree_weekly_reports(child_id);
CREATE INDEX IF NOT EXISTS idx_montree_reports_week ON montree_weekly_reports(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_montree_reports_status ON montree_weekly_reports(status);
CREATE INDEX IF NOT EXISTS idx_montree_reports_type ON montree_weekly_reports(report_type);

-- ============================================
-- TABLE 4: montree_report_media
-- Links reports to photos/videos included in them
-- ============================================

CREATE TABLE IF NOT EXISTS montree_report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES montree_media(id) ON DELETE CASCADE,
  
  display_order INT DEFAULT 0,
  caption TEXT,  -- Override caption for this report context
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_id, media_id)
);

-- Indexes for montree_report_media
CREATE INDEX IF NOT EXISTS idx_montree_report_media_report ON montree_report_media(report_id);
CREATE INDEX IF NOT EXISTS idx_montree_report_media_media ON montree_report_media(media_id);

-- ============================================
-- TABLE 5: montree_parent_access
-- Parent-child relationships and permissions
-- ============================================

CREATE TABLE IF NOT EXISTS montree_parent_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id TEXT NOT NULL,  -- From auth (can be NULL until invite accepted)
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
  
  -- Contact preferences
  primary_contact BOOLEAN DEFAULT FALSE,
  email TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en',  -- For future i18n: 'en', 'zh', 'es', etc.
  
  -- Invite tracking
  invite_code TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  invite_expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_user_id, child_id)
);

-- Indexes for montree_parent_access
CREATE INDEX IF NOT EXISTS idx_montree_parent_access_parent ON montree_parent_access(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_montree_parent_access_child ON montree_parent_access(child_id);
CREATE INDEX IF NOT EXISTS idx_montree_parent_access_school ON montree_parent_access(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_parent_access_invite ON montree_parent_access(invite_code);
CREATE INDEX IF NOT EXISTS idx_montree_parent_access_consent ON montree_parent_access(consent_status);

-- ============================================
-- TABLE 6: montree_consent_log
-- Immutable audit trail for COPPA/GDPR-K compliance
-- ============================================

CREATE TABLE IF NOT EXISTS montree_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_access_id UUID REFERENCES montree_parent_access(id),
  parent_user_id TEXT NOT NULL,
  child_id UUID NOT NULL,
  school_id UUID NOT NULL,
  
  -- Consent details
  consent_type TEXT NOT NULL,  -- 'photo_capture', 'report_sharing', 'data_storage', 'marketing'
  consent_given BOOLEAN NOT NULL,
  
  -- Audit info
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  policy_version TEXT NOT NULL,
  
  -- Context
  notes TEXT,
  
  -- This table is APPEND-ONLY - no updates allowed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for montree_consent_log
CREATE INDEX IF NOT EXISTS idx_montree_consent_log_parent ON montree_consent_log(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_montree_consent_log_child ON montree_consent_log(child_id);
CREATE INDEX IF NOT EXISTS idx_montree_consent_log_timestamp ON montree_consent_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_montree_consent_log_type ON montree_consent_log(consent_type);

-- Immutability trigger - prevent updates and deletes
CREATE OR REPLACE FUNCTION prevent_consent_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Consent log is immutable - no updates or deletes allowed for COPPA compliance';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consent_log_immutable ON montree_consent_log;
CREATE TRIGGER consent_log_immutable
BEFORE UPDATE OR DELETE ON montree_consent_log
FOR EACH ROW EXECUTE FUNCTION prevent_consent_log_modification();

-- ============================================
-- TABLE 7: montree_work_translations
-- Translates curriculum to developmental meaning for parents
-- ENGLISH ONLY - i18n via separate system later
-- ============================================

CREATE TABLE IF NOT EXISTS montree_work_translations (
  work_id TEXT PRIMARY KEY,
  
  -- Display name
  display_name TEXT NOT NULL,
  
  -- Developmental context (explains the "why" for parents)
  developmental_context TEXT NOT NULL,
  
  -- Home extension suggestions
  home_extension TEXT,
  
  -- Photo caption template (use {name} placeholder)
  photo_caption_template TEXT,
  
  -- Metadata
  area TEXT NOT NULL,  -- 'practical_life', 'sensorial', 'language', 'mathematics', 'cultural'
  category TEXT,  -- Sub-category within area
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for montree_work_translations
CREATE INDEX IF NOT EXISTS idx_montree_translations_area ON montree_work_translations(area);
CREATE INDEX IF NOT EXISTS idx_montree_translations_category ON montree_work_translations(category);

-- ============================================
-- Updated timestamps trigger for all tables
-- ============================================

CREATE OR REPLACE FUNCTION update_montree_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
DROP TRIGGER IF EXISTS montree_media_updated_at ON montree_media;
CREATE TRIGGER montree_media_updated_at
BEFORE UPDATE ON montree_media
FOR EACH ROW EXECUTE FUNCTION update_montree_updated_at();

DROP TRIGGER IF EXISTS montree_reports_updated_at ON montree_weekly_reports;
CREATE TRIGGER montree_reports_updated_at
BEFORE UPDATE ON montree_weekly_reports
FOR EACH ROW EXECUTE FUNCTION update_montree_updated_at();

DROP TRIGGER IF EXISTS montree_parent_access_updated_at ON montree_parent_access;
CREATE TRIGGER montree_parent_access_updated_at
BEFORE UPDATE ON montree_parent_access
FOR EACH ROW EXECUTE FUNCTION update_montree_updated_at();

DROP TRIGGER IF EXISTS montree_translations_updated_at ON montree_work_translations;
CREATE TRIGGER montree_translations_updated_at
BEFORE UPDATE ON montree_work_translations
FOR EACH ROW EXECUTE FUNCTION update_montree_updated_at();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Weekly Reports & Media System tables created successfully!';
  RAISE NOTICE 'Tables: montree_media, montree_media_children, montree_weekly_reports, montree_report_media, montree_parent_access, montree_consent_log, montree_work_translations';
  RAISE NOTICE '📝 Note: Pure English schema. i18n support will be added via separate translation system.';
END $$;
