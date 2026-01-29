-- Migration: 099_seed_demo_school.sql
-- Purpose: Create a fully-populated demo school for testing
-- Run this in Supabase SQL Editor

-- ============================================
-- CLEANUP: Remove old demo data first
-- ============================================

DELETE FROM montree_parent_invites WHERE child_id IN (
  SELECT id FROM montree_children WHERE classroom_id IN (
    SELECT id FROM montree_classrooms WHERE school_id IN (
      SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
    )
  )
);

DELETE FROM montree_parent_children WHERE child_id IN (
  SELECT id FROM montree_children WHERE classroom_id IN (
    SELECT id FROM montree_classrooms WHERE school_id IN (
      SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
    )
  )
);

DELETE FROM montree_parents WHERE school_id IN (
  SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
);

DELETE FROM montree_child_work_progress WHERE child_id IN (
  SELECT id FROM montree_children WHERE classroom_id IN (
    SELECT id FROM montree_classrooms WHERE school_id IN (
      SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
    )
  )
);

DELETE FROM montree_children WHERE classroom_id IN (
  SELECT id FROM montree_classrooms WHERE school_id IN (
    SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
  )
);

DELETE FROM montree_teachers WHERE school_id IN (
  SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
);

DELETE FROM montree_classrooms WHERE school_id IN (
  SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
);

DELETE FROM montree_school_admins WHERE school_id IN (
  SELECT id FROM montree_schools WHERE slug = 'sunshine-demo'
);

DELETE FROM montree_schools WHERE slug = 'sunshine-demo';


-- ============================================
-- PART 1: CREATE DEMO SCHOOL
-- ============================================

INSERT INTO montree_schools (
  id, name, slug, subscription_tier, subscription_status, 
  trial_ends_at, max_students, is_active
) VALUES (
  'demo0001-0001-0001-0001-000000000001',
  'Sunshine Montessori',
  'sunshine-demo',
  'premium',
  'active',
  NOW() + INTERVAL '30 days',
  100,
  true
);

-- ============================================
-- PART 2: CREATE PRINCIPAL
-- Password: demo123 (SHA256 hashed)
-- ============================================

INSERT INTO montree_school_admins (
  id, school_id, email, password_hash, name, role, is_active
) VALUES (
  'demo0002-0002-0002-0002-000000000002',
  'demo0001-0001-0001-0001-000000000001',
  'principal@sunshine.demo',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Sarah Johnson',
  'principal',
  true
);


-- ============================================
-- PART 3: CREATE CLASSROOMS
-- ============================================

INSERT INTO montree_classrooms (id, school_id, name, icon, color, age_group) VALUES
  ('demo0003-0003-0003-0003-000000000001', 'demo0001-0001-0001-0001-000000000001', 'Butterfly Class', '🦋', '#8B5CF6', '3-4'),
  ('demo0003-0003-0003-0003-000000000002', 'demo0001-0001-0001-0001-000000000001', 'Rainbow Class', '🌈', '#10B981', '4-6');

-- ============================================
-- PART 4: CREATE TEACHERS
-- Login codes: butter1, rainbo2
-- ============================================

INSERT INTO montree_teachers (
  id, school_id, classroom_id, name, email, login_code, is_active
) VALUES
  ('demo0004-0004-0004-0004-000000000001', 'demo0001-0001-0001-0001-000000000001', 
   'demo0003-0003-0003-0003-000000000001', 'Ms. Emily', 'emily@sunshine.demo', 'butter1', true),
  ('demo0004-0004-0004-0004-000000000002', 'demo0001-0001-0001-0001-000000000001', 
   'demo0003-0003-0003-0003-000000000002', 'Mr. David', 'david@sunshine.demo', 'rainbo2', true);


-- ============================================
-- PART 5: CREATE STUDENTS - Butterfly Class (ages 3-4)
-- ============================================

INSERT INTO montree_children (id, classroom_id, name, nickname, date_of_birth, notes) VALUES
  ('demo0005-0005-0005-0001-000000000001', 'demo0003-0003-0003-0003-000000000001', 
   'Mia Chen', 'Mia', '2022-03-15', 'Loves practical life activities'),
  ('demo0005-0005-0005-0001-000000000002', 'demo0003-0003-0003-0003-000000000001', 
   'Lucas Wang', 'Luke', '2022-06-22', 'Very interested in sensorial materials'),
  ('demo0005-0005-0005-0001-000000000003', 'demo0003-0003-0003-0003-000000000001', 
   'Emma Li', 'Emma', '2022-01-10', 'Early reader, loves pink tower'),
  ('demo0005-0005-0005-0001-000000000004', 'demo0003-0003-0003-0003-000000000001', 
   'Noah Zhang', 'Noah', '2022-09-05', 'Enjoys outdoor time');

-- ============================================
-- PART 6: CREATE STUDENTS - Rainbow Class (ages 4-6)
-- ============================================

INSERT INTO montree_children (id, classroom_id, name, nickname, date_of_birth, notes) VALUES
  ('demo0005-0005-0005-0002-000000000001', 'demo0003-0003-0003-0003-000000000002', 
   'Sophia Liu', 'Sophie', '2020-11-20', 'Excellent at math materials'),
  ('demo0005-0005-0005-0002-000000000002', 'demo0003-0003-0003-0003-000000000002', 
   'Oliver Wu', 'Ollie', '2021-02-14', 'Creative writer'),
  ('demo0005-0005-0005-0002-000000000003', 'demo0003-0003-0003-0003-000000000002', 
   'Ava Huang', 'Ava', '2020-07-30', 'Loves cultural studies'),
  ('demo0005-0005-0005-0002-000000000004', 'demo0003-0003-0003-0003-000000000002', 
   'Ethan Lin', 'Ethan', '2021-04-18', 'Strong in language arts'),
  ('demo0005-0005-0005-0002-000000000005', 'demo0003-0003-0003-0003-000000000002', 
   'Isabella Zhou', 'Bella', '2020-12-03', 'Natural leader');


-- ============================================
-- PART 7: CREATE PARENT INVITES
-- ============================================

INSERT INTO montree_parent_invites (id, child_id, invite_code, is_active) VALUES
  ('demo0006-0006-0001-0001-000000000001', 'demo0005-0005-0005-0001-000000000001', 'MIA001', true),
  ('demo0006-0006-0001-0001-000000000002', 'demo0005-0005-0005-0001-000000000002', 'LUK002', true),
  ('demo0006-0006-0001-0001-000000000003', 'demo0005-0005-0005-0001-000000000003', 'EMM003', true),
  ('demo0006-0006-0001-0001-000000000004', 'demo0005-0005-0005-0001-000000000004', 'NOA004', true),
  ('demo0006-0006-0001-0002-000000000001', 'demo0005-0005-0005-0002-000000000001', 'SOP005', true),
  ('demo0006-0006-0001-0002-000000000002', 'demo0005-0005-0005-0002-000000000002', 'OLI006', true),
  ('demo0006-0006-0001-0002-000000000003', 'demo0005-0005-0005-0002-000000000003', 'AVA007', true),
  ('demo0006-0006-0001-0002-000000000004', 'demo0005-0005-0005-0002-000000000004', 'ETH008', true),
  ('demo0006-0006-0001-0002-000000000005', 'demo0005-0005-0005-0002-000000000005', 'BEL009', true);


-- ============================================
-- PART 8: CREATE PROGRESS DATA
-- ============================================

-- Mia's progress (Butterfly Class)
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at, mastered_at) VALUES
  ('demo0005-0005-0005-0001-000000000001', 'Pouring Water', 'practical_life', 'mastered', NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days'),
  ('demo0005-0005-0005-0001-000000000001', 'Spooning Beans', 'practical_life', 'mastered', NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days'),
  ('demo0005-0005-0005-0001-000000000001', 'Pink Tower', 'sensorial', 'practicing', NOW() - INTERVAL '14 days', NULL),
  ('demo0005-0005-0005-0001-000000000001', 'Cylinder Blocks', 'sensorial', 'presented', NOW() - INTERVAL '7 days', NULL);

-- Sophia's progress (Rainbow Class - more advanced)
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at, mastered_at) VALUES
  ('demo0005-0005-0005-0002-000000000001', 'Number Rods', 'mathematics', 'mastered', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
  ('demo0005-0005-0005-0002-000000000001', 'Spindle Boxes', 'mathematics', 'mastered', NOW() - INTERVAL '45 days', NOW() - INTERVAL '20 days'),
  ('demo0005-0005-0005-0002-000000000001', 'Golden Beads', 'mathematics', 'practicing', NOW() - INTERVAL '14 days', NULL),
  ('demo0005-0005-0005-0002-000000000001', 'Sandpaper Letters', 'language', 'mastered', NOW() - INTERVAL '90 days', NOW() - INTERVAL '45 days'),
  ('demo0005-0005-0005-0002-000000000001', 'Moveable Alphabet', 'language', 'practicing', NOW() - INTERVAL '21 days', NULL);

-- Oliver's progress
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at, mastered_at) VALUES
  ('demo0005-0005-0005-0002-000000000002', 'Sandpaper Letters', 'language', 'mastered', NOW() - INTERVAL '60 days', NOW() - INTERVAL '25 days'),
  ('demo0005-0005-0005-0002-000000000002', 'Moveable Alphabet', 'language', 'mastered', NOW() - INTERVAL '30 days', NOW() - INTERVAL '7 days'),
  ('demo0005-0005-0005-0002-000000000002', 'Pink Series', 'language', 'practicing', NOW() - INTERVAL '14 days', NULL);


-- ============================================
-- VERIFICATION: Summary of created data
-- ============================================

SELECT '🏫 Demo School Created' as step, 
  (SELECT COUNT(*) FROM montree_schools WHERE slug = 'sunshine-demo') as count;

SELECT '👩‍💼 Principal Created' as step,
  (SELECT COUNT(*) FROM montree_school_admins WHERE school_id = 'demo0001-0001-0001-0001-000000000001') as count;

SELECT '🏠 Classrooms Created' as step,
  (SELECT COUNT(*) FROM montree_classrooms WHERE school_id = 'demo0001-0001-0001-0001-000000000001') as count;

SELECT '👩‍🏫 Teachers Created' as step,
  (SELECT COUNT(*) FROM montree_teachers WHERE school_id = 'demo0001-0001-0001-0001-000000000001') as count;

SELECT '👶 Students Created' as step,
  (SELECT COUNT(*) FROM montree_children WHERE classroom_id IN (
    SELECT id FROM montree_classrooms WHERE school_id = 'demo0001-0001-0001-0001-000000000001'
  )) as count;

SELECT '📧 Parent Invites Created' as step,
  (SELECT COUNT(*) FROM montree_parent_invites WHERE child_id IN (
    SELECT id FROM montree_children WHERE classroom_id IN (
      SELECT id FROM montree_classrooms WHERE school_id = 'demo0001-0001-0001-0001-000000000001'
    )
  )) as count;

SELECT '📊 Progress Records Created' as step,
  (SELECT COUNT(*) FROM montree_child_progress WHERE child_id IN (
    SELECT id FROM montree_children WHERE classroom_id IN (
      SELECT id FROM montree_classrooms WHERE school_id = 'demo0001-0001-0001-0001-000000000001'
    )
  )) as count;

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
-- Principal: principal@sunshine.demo / demo123
-- Teacher 1: butter1 (Butterfly Class)
-- Teacher 2: rainbo2 (Rainbow Class)
-- Parent Invites: MIA001, LUK002, EMM003, NOA004, SOP005, OLI006, AVA007, ETH008, BEL009
