-- SESSION 91: End-to-End Test Verification
-- Run these queries to verify the system is set up correctly

-- 1. Check schools
SELECT '=== SCHOOLS ===' as section;
SELECT id, name, slug, subscription_status FROM montree_schools;

-- 2. Check classrooms
SELECT '=== CLASSROOMS ===' as section;
SELECT c.id, c.name, c.icon, s.name as school_name, c.teacher_id
FROM montree_classrooms c
LEFT JOIN montree_schools s ON c.school_id = s.id;

-- 3. Check teachers with login codes
SELECT '=== TEACHERS ===' as section;
SELECT 
  t.name, 
  t.login_code, 
  t.password_set,
  c.name as classroom_name
FROM simple_teachers t
LEFT JOIN montree_classrooms c ON t.classroom_id = c.id
WHERE t.is_active = true;

-- 4. Check children count per classroom
SELECT '=== CHILDREN PER CLASSROOM ===' as section;
SELECT 
  c.name as classroom_name,
  c.icon,
  COUNT(ch.id) as student_count
FROM montree_classrooms c
LEFT JOIN children ch ON ch.classroom_id = c.id
GROUP BY c.id, c.name, c.icon;

-- 5. Check curriculum works exist
SELECT '=== CURRICULUM WORKS ===' as section;
SELECT area, COUNT(*) as work_count 
FROM curriculum_roadmap 
GROUP BY area;

-- 6. Check progress records exist
SELECT '=== PROGRESS RECORDS ===' as section;
SELECT COUNT(*) as total_progress_records FROM child_work_progress;
