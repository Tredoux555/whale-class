-- ============================================================
-- MIGRATION 006: Test Schools Setup
-- Run AFTER 005_classroom_curriculum.sql
-- ============================================================

-- Create Test Schools
INSERT INTO schools (id, name, slug, is_active, settings)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Test School 1', 'test-school-1', true, 
   '{"country": "South Africa", "timezone": "Africa/Johannesburg"}'::jsonb),
  ('a2222222-2222-2222-2222-222222222222', 'Test School 2', 'test-school-2', true, 
   '{"country": "South Africa", "timezone": "Africa/Johannesburg"}'::jsonb),
  ('a3333333-3333-3333-3333-333333333333', 'Test School 3', 'test-school-3', true, 
   '{"country": "South Africa", "timezone": "Africa/Johannesburg"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Create Test Classrooms (triggers auto-clone curriculum)
INSERT INTO classrooms (id, school_id, name, age_group)
VALUES 
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Sunrise Room', '3-6'),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Rainbow Room', '3-6'),
  ('b3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'Butterfly Room', '3-6')
ON CONFLICT DO NOTHING;

-- Clone to Beijing classroom if exists
DO $$
DECLARE
  v_classroom_id UUID;
  v_count INTEGER;
BEGIN
  SELECT c.id INTO v_classroom_id
  FROM classrooms c JOIN schools s ON c.school_id = s.id
  WHERE s.name ILIKE '%Beijing%' LIMIT 1;
  
  IF v_classroom_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM classroom_curriculum WHERE classroom_id = v_classroom_id;
    IF v_count = 0 THEN
      PERFORM clone_curriculum_for_classroom(v_classroom_id);
      RAISE NOTICE 'Cloned curriculum to Beijing classroom';
    END IF;
  END IF;
END $$;

-- Verify
SELECT 'Test School 1' as school, COUNT(*) as works FROM classroom_curriculum 
WHERE classroom_id = 'b1111111-1111-1111-1111-111111111111';


