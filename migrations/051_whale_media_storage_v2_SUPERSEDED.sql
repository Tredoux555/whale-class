-- ============================================
-- PHASE 8: WHALE MEDIA STORAGE CONFIGURATION (FIXED)
-- RLS Policies for Supabase Storage
-- Session 52 - January 18, 2026
-- FIXED: Uses actual existing tables instead of non-existent ones
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
-- ============================================

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- --------------------------------------------
-- POLICY 1: Teachers can upload media to their school
-- Uses: simple_teachers (school_id links teacher to school)
-- --------------------------------------------

CREATE POLICY "Teachers can upload media to their school"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whale-media'
  AND (
    -- Teacher access via simple_teachers.school_id
    EXISTS (
      SELECT 1 FROM simple_teachers st
      WHERE st.name = auth.jwt()->>'user_name'
      AND st.is_active = true
      AND (storage.foldername(name))[1] = st.school_id::text
    )
    OR
    -- Admin/owner access via school_members
    EXISTS (
      SELECT 1 FROM montree_school_members msm
      WHERE msm.email = auth.email()
      AND msm.role IN ('owner', 'principal')
      AND (storage.foldername(name))[1] = msm.school_id::text
    )
  )
);

-- --------------------------------------------
-- POLICY 2: Teachers can view their school's media
-- --------------------------------------------

CREATE POLICY "Teachers can view their school media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whale-media'
  AND (
    -- Teacher access
    EXISTS (
      SELECT 1 FROM simple_teachers st
      WHERE st.name = auth.jwt()->>'user_name'
      AND st.is_active = true
      AND (storage.foldername(name))[1] = st.school_id::text
    )
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM montree_school_members msm
      WHERE msm.email = auth.email()
      AND msm.role IN ('owner', 'principal')
      AND (storage.foldername(name))[1] = msm.school_id::text
    )
  )
);

-- --------------------------------------------
-- POLICY 3: Teachers can update their school's media
-- --------------------------------------------

CREATE POLICY "Teachers can update their school media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whale-media'
  AND (
    EXISTS (
      SELECT 1 FROM simple_teachers st
      WHERE st.name = auth.jwt()->>'user_name'
      AND st.is_active = true
      AND (storage.foldername(name))[1] = st.school_id::text
    )
    OR
    EXISTS (
      SELECT 1 FROM montree_school_members msm
      WHERE msm.email = auth.email()
      AND msm.role IN ('owner', 'principal')
      AND (storage.foldername(name))[1] = msm.school_id::text
    )
  )
);

-- --------------------------------------------
-- POLICY 4: Teachers can delete their school's media
-- --------------------------------------------

CREATE POLICY "Teachers can delete their school media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'whale-media'
  AND (
    EXISTS (
      SELECT 1 FROM simple_teachers st
      WHERE st.name = auth.jwt()->>'user_name'
      AND st.is_active = true
      AND (storage.foldername(name))[1] = st.school_id::text
    )
    OR
    EXISTS (
      SELECT 1 FROM montree_school_members msm
      WHERE msm.email = auth.email()
      AND msm.role IN ('owner', 'principal')
      AND (storage.foldername(name))[1] = msm.school_id::text
    )
  )
);

-- --------------------------------------------
-- POLICY 5: Parents can view their children's media
-- --------------------------------------------

-- Helper function to check parent access to group photos
CREATE OR REPLACE FUNCTION check_parent_group_photo_access(file_path TEXT, user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  media_record montree_media%ROWTYPE;
BEGIN
  -- Find the media record by storage path
  SELECT * INTO media_record
  FROM montree_media
  WHERE storage_path = file_path
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if parent has access to any child tagged in this media
  RETURN EXISTS (
    SELECT 1
    FROM montree_media_children mc
    JOIN montree_parent_access pa ON pa.child_id = mc.child_id
    WHERE mc.media_id = media_record.id
    AND pa.email = user_email
    AND pa.consent_status = 'granted'
  );
END;
$$;

CREATE POLICY "Parents can view their children media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whale-media'
  AND (
    -- Individual child media (path: /school_id/child_id/...)
    EXISTS (
      SELECT 1 FROM montree_parent_access pa
      WHERE pa.email = auth.email()
      AND pa.consent_status = 'granted'
      AND (storage.foldername(name))[2] = pa.child_id::text
    )
    OR
    -- Group photos - check via helper function
    (
      (storage.foldername(name))[2] = 'group'
      AND check_parent_group_photo_access(name, auth.email())
    )
    OR
    -- Reports folder
    (
      (storage.foldername(name))[2] = 'reports'
      AND EXISTS (
        SELECT 1 FROM montree_parent_access pa
        WHERE pa.email = auth.email()
        AND pa.consent_status = 'granted'
        AND (storage.foldername(name))[3] = pa.child_id::text
      )
    )
    OR
    -- Slideshows folder
    (
      (storage.foldername(name))[2] = 'slideshows'
      AND EXISTS (
        SELECT 1 FROM montree_parent_access pa
        WHERE pa.email = auth.email()
        AND pa.consent_status = 'granted'
        AND (storage.foldername(name))[3] = pa.child_id::text
      )
    )
  )
);

-- ============================================
-- RLS POLICIES FOR DATABASE TABLES
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
-- Uses simple_teachers.school_id for teacher access
-- --------------------------------------------

CREATE POLICY "Teachers view school media"
ON montree_media FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simple_teachers st
    WHERE st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
    AND st.school_id = montree_media.school_id
  )
  OR
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = montree_media.school_id
  )
);

CREATE POLICY "Teachers insert school media"
ON montree_media FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM simple_teachers st
    WHERE st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
    AND st.school_id = school_id
  )
  OR
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = school_id
  )
);

CREATE POLICY "Teachers update school media"
ON montree_media FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simple_teachers st
    WHERE st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
    AND st.school_id = montree_media.school_id
  )
  OR
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = montree_media.school_id
  )
);

CREATE POLICY "Teachers delete school media"
ON montree_media FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simple_teachers st
    WHERE st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
    AND st.school_id = montree_media.school_id
  )
  OR
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = montree_media.school_id
  )
);

-- Parents can view their children's media
CREATE POLICY "Parents view children media"
ON montree_media FOR SELECT
TO authenticated
USING (
  -- Individual photos
  EXISTS (
    SELECT 1 FROM montree_parent_access pa
    WHERE pa.email = auth.email()
    AND pa.consent_status = 'granted'
    AND pa.child_id = montree_media.child_id
  )
  OR
  -- Group photos (via media_children)
  EXISTS (
    SELECT 1 FROM montree_media_children mc
    JOIN montree_parent_access pa ON pa.child_id = mc.child_id
    WHERE mc.media_id = montree_media.id
    AND pa.email = auth.email()
    AND pa.consent_status = 'granted'
  )
);

-- --------------------------------------------
-- MONTREE_MEDIA_CHILDREN POLICIES
-- --------------------------------------------

CREATE POLICY "Teachers manage media children links"
ON montree_media_children FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM montree_media m
    JOIN simple_teachers st ON st.school_id = m.school_id
    WHERE m.id = montree_media_children.media_id
    AND st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
  )
);

-- --------------------------------------------
-- MONTREE_WEEKLY_REPORTS POLICIES
-- --------------------------------------------

CREATE POLICY "Teachers manage school reports"
ON montree_weekly_reports FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simple_teachers st
    WHERE st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
    AND st.school_id = montree_weekly_reports.school_id
  )
  OR
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = montree_weekly_reports.school_id
  )
);

CREATE POLICY "Parents view their children reports"
ON montree_weekly_reports FOR SELECT
TO authenticated
USING (
  report_type = 'parent'
  AND status = 'sent'
  AND EXISTS (
    SELECT 1 FROM montree_parent_access pa
    WHERE pa.email = auth.email()
    AND pa.child_id = montree_weekly_reports.child_id
    AND pa.consent_status = 'granted'
  )
);

-- --------------------------------------------
-- MONTREE_REPORT_MEDIA POLICIES
-- --------------------------------------------

CREATE POLICY "Teachers manage report media links"
ON montree_report_media FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM montree_weekly_reports r
    JOIN simple_teachers st ON st.school_id = r.school_id
    WHERE r.id = montree_report_media.report_id
    AND st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
  )
);

-- --------------------------------------------
-- MONTREE_PARENT_ACCESS POLICIES
-- --------------------------------------------

CREATE POLICY "School staff manage parent access"
ON montree_parent_access FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = montree_parent_access.school_id
    AND msm.role IN ('owner', 'principal', 'teacher')
  )
  OR
  EXISTS (
    SELECT 1 FROM simple_teachers st
    WHERE st.name = auth.jwt()->>'user_name'
    AND st.is_active = true
    AND st.school_id = montree_parent_access.school_id
  )
);

CREATE POLICY "Parents view own access record"
ON montree_parent_access FOR SELECT
TO authenticated
USING (
  email = auth.email()
);

CREATE POLICY "Parents update own consent"
ON montree_parent_access FOR UPDATE
TO authenticated
USING (
  email = auth.email()
)
WITH CHECK (
  email = auth.email()
);

-- --------------------------------------------
-- MONTREE_CONSENT_LOG POLICIES
-- --------------------------------------------

CREATE POLICY "School staff view consent logs"
ON montree_consent_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = montree_consent_log.school_id
    AND msm.role IN ('owner', 'principal')
  )
);

CREATE POLICY "Insert consent log"
ON montree_consent_log FOR INSERT
TO authenticated
WITH CHECK (
  -- Parents can insert their own consent
  EXISTS (
    SELECT 1 FROM montree_parent_access pa
    WHERE pa.email = auth.email()
    AND pa.child_id = child_id
  )
  OR
  -- School admin can insert on behalf
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.school_id = school_id
    AND msm.role IN ('owner', 'principal')
  )
);

-- NOTE: No UPDATE or DELETE policies - consent log is immutable!

-- --------------------------------------------
-- MONTREE_WORK_TRANSLATIONS POLICIES
-- --------------------------------------------

-- Everyone can read translations (public data)
CREATE POLICY "Anyone can read work translations"
ON montree_work_translations FOR SELECT
TO authenticated
USING (true);

-- Only owners can modify translations
CREATE POLICY "Owners manage work translations"
ON montree_work_translations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM montree_school_members msm
    WHERE msm.email = auth.email()
    AND msm.role = 'owner'
  )
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Storage and RLS policies created successfully!';
  RAISE NOTICE '📝 FIXED: Now uses actual tables (simple_teachers, montree_school_members)';
  RAISE NOTICE 'Remember to create whale-media bucket in Supabase Dashboard first!';
END $$;
