-- MONTREE MULTI-USER SCHEMA
-- Run this in Supabase SQL Editor
-- Adds: schools, users, classrooms, role-based access

-- =====================================================
-- SCHOOLS TABLE (Multi-tenant support)
-- =====================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);

-- =====================================================
-- USERS TABLE (Teachers, Parents, Admins)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'parent')),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);

-- =====================================================
-- CLASSROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('0-3', '2-3', '3-4', '3-6', '4-5', '5-6', '6-9', '9-12')),
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);

-- =====================================================
-- CLASSROOM_CHILDREN (Link children to classrooms)
-- =====================================================
CREATE TABLE IF NOT EXISTS classroom_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  enrolled_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'withdrawn', 'transferred')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_children_classroom ON classroom_children(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_children_child ON classroom_children(child_id);
CREATE INDEX IF NOT EXISTS idx_classroom_children_status ON classroom_children(status);

-- =====================================================
-- PARENT_CHILDREN (Link parents to their children)
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent' CHECK (relationship IN ('parent', 'guardian', 'other')),
  can_view_progress BOOLEAN DEFAULT true,
  can_receive_reports BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);

-- =====================================================
-- ADD SCHOOL_ID TO CHILDREN TABLE
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE children ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    CREATE INDEX idx_children_school ON children(school_id);
  END IF;
END $$;

-- =====================================================
-- USER SESSIONS TABLE (for JWT refresh tokens)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for backend)
CREATE POLICY "Service role full access on schools" ON schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on classrooms" ON classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on classroom_children" ON classroom_children FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on parent_children" ON parent_children FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on user_sessions" ON user_sessions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classrooms_updated_at ON classrooms;
CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE DEFAULT SCHOOL FOR EXISTING DATA
-- =====================================================
INSERT INTO schools (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Beijing International School',
  'beijing-international',
  '{"default": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- CREATE SUPER ADMIN USER (Tredoux)
-- Password: Will be set via app, this is placeholder hash
-- =====================================================
-- Note: Run this after getting the bcrypt hash from the app
-- INSERT INTO users (email, password_hash, name, role)
-- VALUES ('admin@teacherpotato.xyz', '$2b$10$...', 'Tredoux', 'super_admin');

-- =====================================================
-- MIGRATE EXISTING CHILDREN TO DEFAULT SCHOOL
-- =====================================================
UPDATE children 
SET school_id = '00000000-0000-0000-0000-000000000001'
WHERE school_id IS NULL;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE 'Multi-user schema created successfully!';
  RAISE NOTICE 'Next: Create users via the app interface';
END $$;
