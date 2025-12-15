-- =====================================================
-- WHALE PLATFORM - RBAC SYSTEM DATABASE MIGRATION
-- =====================================================
-- This migration creates a complete role-based access control system
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: USER_ROLES
-- Links users to their roles (admin, teacher, parent, etc.)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL CHECK (role_name IN ('admin', 'teacher', 'parent', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON public.user_roles(role_name);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TABLE 2: FEATURES
-- Defines all available features in the system
-- =====================================================

CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('tools', 'curriculum', 'assessment', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_features_key ON public.features(feature_key);
CREATE INDEX IF NOT EXISTS idx_features_category ON public.features(category);

-- Enable Row Level Security
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Features are readable by everyone (logged in)
CREATE POLICY "Anyone can view active features"
  ON public.features FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage features"
  ON public.features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- Insert default features
INSERT INTO public.features (feature_key, feature_name, description, category) VALUES
  ('three_part_card_generator', 'Three-Part Card Generator', 'Generate custom Montessori three-part cards', 'tools'),
  ('curriculum_viewer', 'Curriculum Viewer', 'View complete Montessori curriculum roadmap', 'curriculum'),
  ('progress_dashboard', 'Progress Dashboard', 'View student progress and activity tracking', 'assessment'),
  ('activity_management', 'Activity Management', 'Create and manage student activities', 'tools'),
  ('report_generation', 'Report Generation', 'Generate progress reports for parents', 'assessment'),
  ('resource_library', 'Resource Library', 'Access and upload educational resources', 'tools'),
  ('lesson_planner', 'Lesson Planner', 'Plan and schedule lessons', 'curriculum'),
  ('student_management', 'Student Management', 'Manage student profiles and data', 'admin')
ON CONFLICT (feature_key) DO NOTHING;

-- =====================================================
-- TABLE 3: ROLE_PERMISSIONS
-- Links roles to features with specific permission levels
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL CHECK (role_name IN ('admin', 'teacher', 'parent', 'super_admin')),
  feature_key TEXT NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit', 'create', 'delete')),
  can_share_with_others BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_name, feature_key, permission_level),
  FOREIGN KEY (feature_key) REFERENCES public.features(feature_key) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_feature ON public.role_permissions(feature_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON public.role_permissions(is_active);

-- Enable Row Level Security
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view permissions for their roles"
  ON public.role_permissions FOR SELECT
  USING (
    role_name IN (
      SELECT role_name FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all permissions"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- Insert default teacher permissions
INSERT INTO public.role_permissions (role_name, feature_key, permission_level, can_share_with_others, is_active) VALUES
  -- Three-Part Card Generator: Full access
  ('teacher', 'three_part_card_generator', 'view', true, true),
  ('teacher', 'three_part_card_generator', 'edit', true, true),
  ('teacher', 'three_part_card_generator', 'create', true, true),
  
  -- Curriculum Viewer: View only
  ('teacher', 'curriculum_viewer', 'view', false, true),
  
  -- Progress Dashboard: View only
  ('teacher', 'progress_dashboard', 'view', false, true),
  
  -- Activity Management: View and Edit
  ('teacher', 'activity_management', 'view', false, true),
  ('teacher', 'activity_management', 'edit', false, true),
  
  -- Lesson Planner: Full access
  ('teacher', 'lesson_planner', 'view', true, true),
  ('teacher', 'lesson_planner', 'edit', true, true),
  ('teacher', 'lesson_planner', 'create', true, true),
  
  -- Report Generation: View only (initially disabled)
  ('teacher', 'report_generation', 'view', false, false),
  
  -- Resource Library: View only (initially disabled)
  ('teacher', 'resource_library', 'view', false, false)
ON CONFLICT (role_name, feature_key, permission_level) DO NOTHING;

-- Insert admin permissions (all features, all levels)
INSERT INTO public.role_permissions (role_name, feature_key, permission_level, can_share_with_others, is_active)
SELECT 'admin', feature_key, permission, true, true
FROM public.features, unnest(ARRAY['view', 'edit', 'create', 'delete']) AS permission
ON CONFLICT (role_name, feature_key, permission_level) DO NOTHING;

-- Insert super_admin permissions (all features, all levels)
INSERT INTO public.role_permissions (role_name, feature_key, permission_level, can_share_with_others, is_active)
SELECT 'super_admin', feature_key, permission, true, true
FROM public.features, unnest(ARRAY['view', 'edit', 'create', 'delete']) AS permission
ON CONFLICT (role_name, feature_key, permission_level) DO NOTHING;

-- =====================================================
-- TABLE 4: TEACHER_STUDENTS
-- Links teachers to their assigned students
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teacher_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(teacher_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON public.teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON public.teacher_students(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_active ON public.teacher_students(is_active);

-- Enable Row Level Security
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view their own students"
  ON public.teacher_students FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage their own students"
  ON public.teacher_students FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Admins can view all teacher-student relationships"
  ON public.teacher_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage all teacher-student relationships"
  ON public.teacher_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TABLE 5: PERMISSION_AUDIT_LOG (Bonus - Track changes)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked', 'modified', 'accessed', 'denied')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('feature', 'role', 'permission', 'student')),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.permission_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.permission_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.permission_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_name IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_feature_key TEXT,
  p_permission_level TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_name = rp.role_name
    WHERE ur.user_id = p_user_id
      AND rp.feature_key = p_feature_key
      AND rp.permission_level = p_permission_level
      AND rp.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  feature_key TEXT,
  feature_name TEXT,
  permission_level TEXT,
  can_share BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    f.feature_key,
    f.feature_name,
    rp.permission_level,
    rp.can_share_with_others
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_name = rp.role_name
  JOIN public.features f ON rp.feature_key = f.feature_key
  WHERE ur.user_id = p_user_id
    AND rp.is_active = true
    AND f.is_active = true
  ORDER BY f.feature_name, rp.permission_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role_name
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log permission audit
CREATE OR REPLACE FUNCTION public.log_permission_audit(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.permission_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON public.features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT ON public.features TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_students TO authenticated;
GRANT SELECT ON public.permission_audit_log TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_permission_audit TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_roles', 'features', 'role_permissions', 'teacher_students', 'permission_audit_log')
ORDER BY tablename;

-- Show default features
SELECT feature_key, feature_name, category, is_active FROM public.features ORDER BY category, feature_name;

-- Show default teacher permissions
SELECT 
  rp.role_name,
  f.feature_name,
  rp.permission_level,
  rp.is_active
FROM public.role_permissions rp
JOIN public.features f ON rp.feature_key = f.feature_key
WHERE rp.role_name = 'teacher'
ORDER BY f.feature_name, rp.permission_level;
