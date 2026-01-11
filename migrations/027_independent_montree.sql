-- =====================================================
-- MIGRATION 027: Independent Montree - FIXED
-- Creates simple_teachers + teacher_children + video_search_term
-- Run in Supabase SQL Editor
-- Date: January 11, 2026
-- =====================================================

-- =====================================================
-- STEP 1: Create simple_teachers table (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS simple_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(20) NOT NULL DEFAULT '123',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 7 teachers (matches the hardcoded list in teacher login)
INSERT INTO simple_teachers (name, password) VALUES 
  ('Jasmine', '123'),
  ('Ivan', '123'),
  ('John', '123'),
  ('Richard', '123'),
  ('Liza', '123'),
  ('Michael', '123'),
  ('Tredoux', '123')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE simple_teachers ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on simple_teachers" ON simple_teachers;
CREATE POLICY "Service role full access on simple_teachers" 
  ON simple_teachers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 2: Create teacher_children junction table
-- =====================================================

CREATE TABLE IF NOT EXISTS teacher_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES simple_teachers(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by VARCHAR(100) DEFAULT 'admin',
  notes TEXT,
  UNIQUE(teacher_id, child_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_teacher_children_teacher ON teacher_children(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_children_child ON teacher_children(child_id);

-- Enable RLS
ALTER TABLE teacher_children ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on teacher_children" ON teacher_children;
CREATE POLICY "Service role full access on teacher_children" 
  ON teacher_children FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 3: Assign existing children to Tredoux (admin)
-- =====================================================

DO $$
DECLARE
  v_tredoux_id UUID;
  v_count INTEGER;
BEGIN
  -- Get Tredoux's ID
  SELECT id INTO v_tredoux_id 
  FROM simple_teachers 
  WHERE LOWER(name) = 'tredoux'
  LIMIT 1;
  
  IF v_tredoux_id IS NULL THEN
    RAISE NOTICE '❌ Tredoux not found in simple_teachers';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found Tredoux with ID: %', v_tredoux_id;
  
  -- Assign ALL existing active children to Tredoux
  INSERT INTO teacher_children (teacher_id, child_id, assigned_by, notes)
  SELECT 
    v_tredoux_id,
    c.id,
    'migration_027',
    'Auto-assigned during Independent Montree migration'
  FROM children c
  WHERE c.active_status = true
  ON CONFLICT (teacher_id, child_id) DO NOTHING;
  
  -- Count how many were assigned
  SELECT COUNT(*) INTO v_count 
  FROM teacher_children 
  WHERE teacher_id = v_tredoux_id;
  
  RAISE NOTICE '✅ Assigned % children to Tredoux', v_count;
END $$;

-- =====================================================
-- STEP 4: Add video_search_term to curriculum
-- =====================================================

ALTER TABLE curriculum_roadmap 
ADD COLUMN IF NOT EXISTS video_search_term TEXT;

COMMENT ON COLUMN curriculum_roadmap.video_search_term IS 
  'YouTube search term to find demonstration video. Used instead of direct URLs which break over time.';

-- =====================================================
-- STEP 5: Populate video_search_term for key works
-- =====================================================

-- Practical Life
UPDATE curriculum_roadmap SET video_search_term = 'Montessori food preparation practical life' 
WHERE LOWER(name) LIKE '%food prep%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori cutting scissors practical life' 
WHERE (LOWER(name) LIKE '%cutting%' OR LOWER(name) LIKE '%scissors%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori dressing frame' 
WHERE LOWER(name) LIKE '%frame%' AND LOWER(area) = 'practical_life' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori pouring practical life' 
WHERE LOWER(name) LIKE '%pouring%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori spooning transfer' 
WHERE LOWER(name) LIKE '%spoon%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori polishing practical life' 
WHERE LOWER(name) LIKE '%polish%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori flower arranging' 
WHERE LOWER(name) LIKE '%flower%arrang%' AND video_search_term IS NULL;

-- Sensorial
UPDATE curriculum_roadmap SET video_search_term = 'Montessori pink tower sensorial' 
WHERE LOWER(name) LIKE '%pink tower%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori brown stair sensorial' 
WHERE LOWER(name) LIKE '%brown stair%' OR LOWER(name) LIKE '%broad stair%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori red rods sensorial' 
WHERE LOWER(name) LIKE '%red rod%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori cylinder blocks' 
WHERE LOWER(name) LIKE '%cylinder%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori color tablets sensorial' 
WHERE LOWER(name) LIKE '%color tablet%' OR LOWER(name) LIKE '%colour tablet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori geometric cabinet' 
WHERE LOWER(name) LIKE '%geometric cabinet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori binomial cube' 
WHERE LOWER(name) LIKE '%binomial%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori trinomial cube' 
WHERE LOWER(name) LIKE '%trinomial%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori constructive triangles' 
WHERE LOWER(name) LIKE '%constructive triangle%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori geometric solids' 
WHERE LOWER(name) LIKE '%geometric solid%' AND video_search_term IS NULL;

-- Mathematics  
UPDATE curriculum_roadmap SET video_search_term = 'Montessori number rods math' 
WHERE LOWER(name) LIKE '%number rod%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori sandpaper numbers' 
WHERE LOWER(name) LIKE '%sandpaper num%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori spindle boxes' 
WHERE LOWER(name) LIKE '%spindle%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori cards and counters' 
WHERE LOWER(name) LIKE '%cards%counter%' OR LOWER(name) LIKE '%counter%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori golden beads decimal system' 
WHERE LOWER(name) LIKE '%golden bead%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori teen boards' 
WHERE LOWER(name) LIKE '%teen board%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori ten boards' 
WHERE LOWER(name) LIKE '%ten board%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori addition snake game' 
WHERE LOWER(name) LIKE '%addition snake%' OR LOWER(name) LIKE '%snake game%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori stamp game' 
WHERE LOWER(name) LIKE '%stamp game%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori bead chains' 
WHERE LOWER(name) LIKE '%bead chain%' AND video_search_term IS NULL;

-- Language
UPDATE curriculum_roadmap SET video_search_term = 'Montessori I spy sound game' 
WHERE LOWER(name) LIKE '%i spy%' OR LOWER(name) LIKE '%sound game%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori sandpaper letters' 
WHERE LOWER(name) LIKE '%sandpaper letter%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori moveable alphabet' 
WHERE LOWER(name) LIKE '%moveable alphabet%' OR LOWER(name) LIKE '%movable alphabet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori pink series CVC reading' 
WHERE LOWER(name) LIKE '%pink series%' OR LOWER(name) LIKE '%cvc%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori blue series blends' 
WHERE LOWER(name) LIKE '%blue series%' OR LOWER(name) LIKE '%blend%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori green series phonograms' 
WHERE LOWER(name) LIKE '%green series%' OR LOWER(name) LIKE '%phonogram%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori metal insets' 
WHERE LOWER(name) LIKE '%metal inset%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori grammar symbols' 
WHERE LOWER(name) LIKE '%grammar%' AND video_search_term IS NULL;

-- Cultural/Science
UPDATE curriculum_roadmap SET video_search_term = 'Montessori sandpaper globe geography' 
WHERE LOWER(name) LIKE '%sandpaper globe%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori puzzle maps geography' 
WHERE LOWER(name) LIKE '%puzzle map%' OR LOWER(name) LIKE '%continent%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori land and water forms' 
WHERE LOWER(name) LIKE '%land%water%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori botany puzzle' 
WHERE LOWER(name) LIKE '%flower%' OR LOWER(name) LIKE '%leaf%' OR LOWER(name) LIKE '%tree%' AND LOWER(area) = 'cultural' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori zoology puzzle' 
WHERE LOWER(name) LIKE '%bird%' OR LOWER(name) LIKE '%fish%' OR LOWER(name) LIKE '%frog%' AND video_search_term IS NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check simple_teachers
SELECT '=== SIMPLE_TEACHERS ===' as section;
SELECT name, is_active FROM simple_teachers ORDER BY name;

-- Check teacher_children assignments
SELECT '=== TEACHER_CHILDREN ===' as section;
SELECT 
  st.name as teacher_name,
  COUNT(tc.child_id) as student_count
FROM simple_teachers st
LEFT JOIN teacher_children tc ON tc.teacher_id = st.id
GROUP BY st.name
ORDER BY st.name;

-- Check video_search_term coverage
SELECT '=== VIDEO_SEARCH_TERM COVERAGE ===' as section;
SELECT 
  area,
  COUNT(*) as total_works,
  COUNT(video_search_term) as with_search_term,
  ROUND(COUNT(video_search_term)::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 1) as coverage_pct
FROM curriculum_roadmap
GROUP BY area
ORDER BY area;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ Independent Montree Migration Complete!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  ✓ simple_teachers table (7 teachers)';
  RAISE NOTICE '  ✓ teacher_children junction table';
  RAISE NOTICE '  ✓ video_search_term column';
  RAISE NOTICE '  ✓ Assigned all children to Tredoux';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update /api/teacher/classroom to filter by teacher';
  RAISE NOTICE '  2. Test: Login as John → should see 0 students';
  RAISE NOTICE '  3. Assign students to John → should see those students';
END $$;
