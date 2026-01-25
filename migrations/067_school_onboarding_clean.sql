-- =====================================================
-- MIGRATION 067: School Onboarding - Clean Setup
-- Creates proper multi-tenant structure for Montree SaaS
-- Date: January 25, 2026
-- =====================================================

-- =====================================================
-- STEP 1: Ensure montree_schools exists (may already exist from 028)
-- =====================================================

CREATE TABLE IF NOT EXISTS montree_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  owner_email TEXT,
  owner_name TEXT,
  settings JSONB DEFAULT '{}',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Create montree_classrooms (the missing piece!)
-- =====================================================

CREATE TABLE IF NOT EXISTS montree_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#10b981',
  age_group TEXT DEFAULT '3-6',
  teacher_id UUID,  -- Will link to simple_teachers
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_montree_classrooms_school ON montree_classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_classrooms_teacher ON montree_classrooms(teacher_id);

-- =====================================================
-- STEP 3: Add classroom_id to simple_teachers
-- =====================================================

ALTER TABLE simple_teachers 
ADD COLUMN IF NOT EXISTS classroom_id UUID;

ALTER TABLE simple_teachers 
ADD COLUMN IF NOT EXISTS school_id UUID;

-- =====================================================
-- STEP 4: Add classroom_id to children
-- =====================================================

ALTER TABLE children 
ADD COLUMN IF NOT EXISTS classroom_id UUID;

-- =====================================================
-- STEP 5: Create/ensure default school exists
-- =====================================================

INSERT INTO montree_schools (id, name, slug, owner_email, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Beijing International School',
  'beijing-international',
  'tredoux@teacherpotato.xyz',
  'active'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- =====================================================
-- STEP 6: Create Whale Class in montree_classrooms
-- =====================================================

INSERT INTO montree_classrooms (id, school_id, name, icon, color, age_group)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Whale Class',
  '🐋',
  '#3b82f6',
  '3-6'
) ON CONFLICT (school_id, name) DO UPDATE SET
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();

-- =====================================================
-- STEP 7: Link existing children to Whale Class
-- =====================================================

UPDATE children 
SET classroom_id = '00000000-0000-0000-0000-000000000002'
WHERE classroom_id IS NULL
  AND school_id = '00000000-0000-0000-0000-000000000001';

-- Also update any children without school_id
UPDATE children 
SET school_id = '00000000-0000-0000-0000-000000000001',
    classroom_id = '00000000-0000-0000-0000-000000000002'
WHERE school_id IS NULL;

-- =====================================================
-- STEP 8: Link Tredoux to Whale Class
-- =====================================================

UPDATE simple_teachers 
SET school_id = '00000000-0000-0000-0000-000000000001',
    classroom_id = '00000000-0000-0000-0000-000000000002'
WHERE LOWER(name) = 'tredoux';

-- Update Whale Class to have Tredoux as teacher
UPDATE montree_classrooms
SET teacher_id = (SELECT id FROM simple_teachers WHERE LOWER(name) = 'tredoux' LIMIT 1)
WHERE id = '00000000-0000-0000-0000-000000000002';

-- =====================================================
-- STEP 9: Create school_admins table (principals)
-- =====================================================

CREATE TABLE IF NOT EXISTS montree_school_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT,  -- For simple auth (like simple_teachers)
  name TEXT,
  role TEXT DEFAULT 'principal',  -- principal or admin
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, email)
);

-- Add you as principal of Beijing International
INSERT INTO montree_school_admins (school_id, email, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'tredoux@teacherpotato.xyz',
  'Tredoux',
  'principal'
) ON CONFLICT (school_id, email) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '=== MONTREE SCHOOLS ===' as section;
SELECT id, name, slug, subscription_status FROM montree_schools;

SELECT '=== MONTREE CLASSROOMS ===' as section;
SELECT c.id, c.name, c.icon, s.name as school_name, t.name as teacher_name
FROM montree_classrooms c
LEFT JOIN montree_schools s ON c.school_id = s.id
LEFT JOIN simple_teachers t ON c.teacher_id = t.id;

SELECT '=== CHILDREN PER CLASSROOM ===' as section;
SELECT c.name as classroom, COUNT(ch.id) as student_count
FROM montree_classrooms c
LEFT JOIN children ch ON ch.classroom_id = c.id
GROUP BY c.name;

SELECT '=== TEACHERS ===' as section;
SELECT t.name, t.school_id, t.classroom_id, c.name as classroom_name
FROM simple_teachers t
LEFT JOIN montree_classrooms c ON t.classroom_id = c.id;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅ School Onboarding Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables ready:';
  RAISE NOTICE '  ✓ montree_schools';
  RAISE NOTICE '  ✓ montree_classrooms (with teacher_id)';
  RAISE NOTICE '  ✓ montree_school_admins';
  RAISE NOTICE '  ✓ children.classroom_id added';
  RAISE NOTICE '  ✓ simple_teachers.classroom_id added';
  RAISE NOTICE '';
  RAISE NOTICE 'Data migrated:';
  RAISE NOTICE '  ✓ Beijing International School';
  RAISE NOTICE '  ✓ Whale Class linked to Tredoux';
  RAISE NOTICE '  ✓ All children linked to Whale Class';
END $$;
