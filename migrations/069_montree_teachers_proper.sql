-- =====================================================
-- MIGRATION 069: Montree Teachers - Proper Table
-- Creates montree_teachers with login_code for teacher auth
-- Date: January 28, 2026
-- =====================================================

-- =====================================================
-- STEP 1: Create montree_teachers table
-- =====================================================

CREATE TABLE IF NOT EXISTS montree_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  
  -- Teacher info
  name TEXT NOT NULL,
  email TEXT,
  
  -- Authentication
  login_code TEXT UNIQUE,  -- The 6-char code (stored plain for lookup)
  password_hash TEXT,       -- For email+password login (bcrypt)
  password_set_at TIMESTAMPTZ,  -- When they set their own password
  
  -- Status
  role TEXT DEFAULT 'teacher',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_montree_teachers_school ON montree_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_teachers_classroom ON montree_teachers(classroom_id);
CREATE INDEX IF NOT EXISTS idx_montree_teachers_login_code ON montree_teachers(login_code);
CREATE INDEX IF NOT EXISTS idx_montree_teachers_email ON montree_teachers(email);

-- Enable RLS
ALTER TABLE montree_teachers ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on montree_teachers" ON montree_teachers;
CREATE POLICY "Service role full access on montree_teachers" 
  ON montree_teachers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 2: Migrate data from simple_teachers (if any have school_id)
-- =====================================================

INSERT INTO montree_teachers (
  school_id, 
  classroom_id, 
  name, 
  login_code, 
  is_active,
  created_at
)
SELECT 
  school_id,
  classroom_id,
  name,
  login_code,
  is_active,
  created_at
FROM simple_teachers
WHERE school_id IS NOT NULL
  AND login_code IS NOT NULL
ON CONFLICT (login_code) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '=== MONTREE_TEACHERS TABLE ===' as section;
SELECT 
  t.name,
  t.login_code,
  t.is_active,
  c.name as classroom_name,
  s.name as school_name
FROM montree_teachers t
LEFT JOIN montree_classrooms c ON t.classroom_id = c.id
LEFT JOIN montree_schools s ON t.school_id = s.id;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅ Montree Teachers Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Table montree_teachers created with:';
  RAISE NOTICE '  ✓ login_code (plain text for lookup)';
  RAISE NOTICE '  ✓ password_hash (for email+password auth)';
  RAISE NOTICE '  ✓ password_set_at (tracks when set)';
  RAISE NOTICE '  ✓ school_id + classroom_id links';
  RAISE NOTICE '';
  RAISE NOTICE 'Teacher Auth Flow:';
  RAISE NOTICE '  1. Principal creates teacher → generates 6-char login_code';
  RAISE NOTICE '  2. Teacher uses login_code to login first time';
  RAISE NOTICE '  3. Teacher sets email+password for future logins';
  RAISE NOTICE '  4. Login by code OR email+password both work';
END $$;
