-- ============================================
-- PHASE 8: WHALE MEDIA STORAGE CONFIGURATION (FINAL)
-- RLS Policies for Supabase Storage
-- Session 52 - January 18, 2026
-- 
-- DESIGN NOTE: Current teacher auth uses cookies (simple_teachers),
-- not Supabase JWT. API routes handle auth, RLS provides backup layer.
-- Future: Migrate to proper Supabase auth for full RLS support.
-- ============================================

-- IMPORTANT: The bucket must be created manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket named: whale-media
-- 3. Set Public: FALSE (private bucket)
-- 4. File Size Limit: 52428800 (50MB)
-- 5. Allowed MIME Types: image/*, video/*

-- ============================================
-- ACTUAL TABLE STRUCTURE (for reference):
-- - simple_teachers: id, name, password, is_active, school_id
-- - teacher_children: teacher_id, child_id
-- - montree_schools: id, name, slug, owner_email
-- - montree_school_members: school_id, email, name, role
-- - children: id, name, school_id, etc.
-- 
-- AUTH NOTE: Teachers currently use cookie-based auth (teacherName),
-- not Supabase JWT. API routes verify teacher identity.
-- ============================================

-- ============================================
-- STORAGE RLS POLICIES
-- For MVP: Service role access for API operations
-- Future: Add user-level policies when migrating to Supabase auth
-- ============================================

-- Allow authenticated users to upload (API handles teacher verification)
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whale-media'
);

-- Allow authenticated users to view (API handles access control)
CREATE POLICY "Authenticated users can view media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whale-media'
);

-- Allow authenticated users to update (API handles verification)
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whale-media'
);

-- Allow authenticated users to delete (API handles verification)
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'whale-media'
);

-- ============================================
-- RLS POLICIES FOR DATABASE TABLES
-- Service role handles teacher operations via API
-- These policies are for direct database access scenarios
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE montree_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_media_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_work_translations ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- MONTREE_MEDIA POLICIES
-- Open for authenticated (API handles school filtering)
-- --------------------------------------------

CREATE POLICY "Authenticated read media"
ON montree_media FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert media"
ON montree_media FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update media"
ON montree_media FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated delete media"
ON montree_media FOR DELETE
TO authenticated
USING (true);

-- Service role full access
CREATE POLICY "Service role full access media"
ON montree_media FOR ALL
TO service_role
USING (true);

-- --------------------------------------------
-- MONTREE_MEDIA_CHILDREN POLICIES
-- --------------------------------------------

CREATE POLICY "Authenticated manage media children"
ON montree_media_children FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access media children"
ON montree_media_children FOR ALL
TO service_role
USING (true);

-- --------------------------------------------
-- MONTREE_WEEKLY_REPORTS POLICIES
-- --------------------------------------------

CREATE POLICY "Authenticated read reports"
ON montree_weekly_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated manage reports"
ON montree_weekly_reports FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access reports"
ON montree_weekly_reports FOR ALL
TO service_role
USING (true);

-- --------------------------------------------
-- MONTREE_REPORT_MEDIA POLICIES
-- --------------------------------------------

CREATE POLICY "Authenticated manage report media"
ON montree_report_media FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access report media"
ON montree_report_media FOR ALL
TO service_role
USING (true);

-- --------------------------------------------
-- MONTREE_PARENT_ACCESS POLICIES
-- --------------------------------------------

CREATE POLICY "Authenticated read parent access"
ON montree_parent_access FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated manage parent access"
ON montree_parent_access FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access parent access"
ON montree_parent_access FOR ALL
TO service_role
USING (true);

-- --------------------------------------------
-- MONTREE_CONSENT_LOG POLICIES
-- IMMUTABLE: No UPDATE or DELETE allowed (enforced by trigger)
-- --------------------------------------------

CREATE POLICY "Authenticated read consent log"
ON montree_consent_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert consent log"
ON montree_consent_log FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role full access consent log"
ON montree_consent_log FOR ALL
TO service_role
USING (true);

-- NOTE: UPDATE/DELETE blocked by trigger from 050_weekly_reports_media_system.sql

-- --------------------------------------------
-- MONTREE_WORK_TRANSLATIONS POLICIES
-- Public data - anyone can read
-- --------------------------------------------

CREATE POLICY "Anyone can read translations"
ON montree_work_translations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated manage translations"
ON montree_work_translations FOR ALL
TO authenticated
USING (true);

CREATE POLICY "Service role full access translations"
ON montree_work_translations FOR ALL
TO service_role
USING (true);

-- ============================================
-- HELPER FUNCTION FOR PARENT ACCESS
-- Used by API to verify parent access to group photos
-- ============================================

CREATE OR REPLACE FUNCTION check_parent_media_access(
  p_media_id UUID,
  p_parent_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check individual media
  IF EXISTS (
    SELECT 1 FROM montree_media m
    JOIN montree_parent_access pa ON pa.child_id = m.child_id
    WHERE m.id = p_media_id
    AND pa.email = p_parent_email
    AND pa.consent_status = 'granted'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check group media
  IF EXISTS (
    SELECT 1 FROM montree_media_children mc
    JOIN montree_parent_access pa ON pa.child_id = mc.child_id
    WHERE mc.media_id = p_media_id
    AND pa.email = p_parent_email
    AND pa.consent_status = 'granted'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Storage and RLS policies created successfully!';
  RAISE NOTICE '📝 NOTE: Using permissive authenticated policies';
  RAISE NOTICE '   - API routes handle teacher/school filtering';
  RAISE NOTICE '   - RLS provides backup security layer';
  RAISE NOTICE '   - Service role has full access for API operations';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  FUTURE: Migrate to Supabase auth for proper RLS';
  RAISE NOTICE 'Remember to create whale-media bucket in Supabase Dashboard!';
END $$;
