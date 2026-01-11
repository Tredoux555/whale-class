-- =====================================================
-- MIGRATION 027: Independent Montree - Teacher Data Isolation
-- Run in Supabase SQL Editor
-- Date: January 11, 2026
-- =====================================================

-- =====================================================
-- PHASE 1A: Create teacher_children junction table
-- This links teachers to their own students
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
CREATE POLICY "Service role full access on teacher_children" 
  ON teacher_children FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- PHASE 1B: Add video_search_term to curriculum
-- This replaces brittle direct YouTube URLs
-- =====================================================

ALTER TABLE curriculum_roadmap 
ADD COLUMN IF NOT EXISTS video_search_term TEXT;

-- Comment explaining the field
COMMENT ON COLUMN curriculum_roadmap.video_search_term IS 
  'YouTube search term to find demonstration video. Used instead of direct URLs which break over time.';

-- =====================================================
-- PHASE 1C: Assign existing children to Tredoux (admin)
-- All current children belong to Tredoux as the principal
-- =====================================================

-- First, get Tredoux's teacher ID
DO $$
DECLARE
  v_tredoux_id UUID;
BEGIN
  -- Get Tredoux's ID from simple_teachers
  SELECT id INTO v_tredoux_id 
  FROM simple_teachers 
  WHERE LOWER(name) = 'tredoux'
  LIMIT 1;
  
  IF v_tredoux_id IS NULL THEN
    RAISE NOTICE 'Tredoux not found in simple_teachers - skipping child assignment';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found Tredoux with ID: %', v_tredoux_id;
  
  -- Assign ALL existing children to Tredoux
  INSERT INTO teacher_children (teacher_id, child_id, assigned_by, notes)
  SELECT 
    v_tredoux_id,
    c.id,
    'migration_027',
    'Auto-assigned during Independent Montree migration'
  FROM children c
  WHERE c.active_status = true
  ON CONFLICT (teacher_id, child_id) DO NOTHING;
  
  RAISE NOTICE 'Assigned existing children to Tredoux';
END $$;

-- =====================================================
-- PHASE 1D: Populate video_search_term from existing data
-- Convert video_url to search terms where possible
-- =====================================================

-- Practical Life
UPDATE curriculum_roadmap SET video_search_term = 'Montessori food preparation practical life' 
WHERE LOWER(name) LIKE '%food prep%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori cutting scissors practical life' 
WHERE (LOWER(name) LIKE '%cutting%' OR LOWER(name) LIKE '%scissors%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori braiding frame dressing' 
WHERE LOWER(name) LIKE '%braid%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori table washing practical life' 
WHERE (LOWER(name) LIKE '%table wash%' OR LOWER(name) LIKE '%washing table%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori zipper frame dressing' 
WHERE LOWER(name) LIKE '%zipper%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori button frame dressing' 
WHERE LOWER(name) LIKE '%button%' AND LOWER(name) LIKE '%frame%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori flower arranging practical life' 
WHERE LOWER(name) LIKE '%flower arrang%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori pouring practical life' 
WHERE LOWER(name) LIKE '%pouring%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori spooning transfer practical life' 
WHERE (LOWER(name) LIKE '%spoon%' OR LOWER(name) LIKE '%transfer%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori folding cloths practical life' 
WHERE LOWER(name) LIKE '%fold%' AND LOWER(name) LIKE '%cloth%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori polishing practical life' 
WHERE LOWER(name) LIKE '%polish%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori hand washing grace courtesy' 
WHERE LOWER(name) LIKE '%hand wash%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori sweeping practical life' 
WHERE LOWER(name) LIKE '%sweep%' AND video_search_term IS NULL;

-- Sensorial
UPDATE curriculum_roadmap SET video_search_term = 'Montessori pink tower sensorial' 
WHERE LOWER(name) LIKE '%pink tower%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori brown stair broad stair sensorial' 
WHERE (LOWER(name) LIKE '%brown stair%' OR LOWER(name) LIKE '%broad stair%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori red rods long rods sensorial' 
WHERE (LOWER(name) LIKE '%red rod%' OR LOWER(name) LIKE '%long rod%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori cylinder blocks knobbed cylinders' 
WHERE (LOWER(name) LIKE '%cylinder block%' OR LOWER(name) LIKE '%knobbed cylinder%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori knobless cylinders sensorial' 
WHERE LOWER(name) LIKE '%knobless%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori color tablets box sensorial' 
WHERE LOWER(name) LIKE '%color tablet%' OR LOWER(name) LIKE '%colour tablet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori geometric cabinet sensorial' 
WHERE LOWER(name) LIKE '%geometric cabinet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori constructive triangles sensorial' 
WHERE LOWER(name) LIKE '%constructive triangle%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori binomial cube sensorial' 
WHERE LOWER(name) LIKE '%binomial%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori trinomial cube sensorial' 
WHERE LOWER(name) LIKE '%trinomial%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori geometric solids sensorial' 
WHERE LOWER(name) LIKE '%geometric solid%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori sound cylinders sensorial' 
WHERE LOWER(name) LIKE '%sound cylinder%' OR LOWER(name) LIKE '%sound box%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori thermic tablets sensorial' 
WHERE LOWER(name) LIKE '%thermic%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori baric tablets sensorial' 
WHERE LOWER(name) LIKE '%baric%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori fabric box tactile sensorial' 
WHERE LOWER(name) LIKE '%fabric%' OR LOWER(name) LIKE '%tactile%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori smelling bottles sensorial' 
WHERE LOWER(name) LIKE '%smell%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori tasting bottles sensorial' 
WHERE LOWER(name) LIKE '%taste%' OR LOWER(name) LIKE '%tasting%' AND video_search_term IS NULL;

-- Mathematics  
UPDATE curriculum_roadmap SET video_search_term = 'Montessori number rods math' 
WHERE LOWER(name) LIKE '%number rod%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori sandpaper numbers math' 
WHERE LOWER(name) LIKE '%sandpaper number%' OR LOWER(name) LIKE '%sandpaper numeral%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori spindle boxes math' 
WHERE LOWER(name) LIKE '%spindle%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori cards and counters math' 
WHERE LOWER(name) LIKE '%cards and counter%' OR LOWER(name) LIKE '%card%counter%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori golden beads decimal system' 
WHERE LOWER(name) LIKE '%golden bead%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori teen boards seguin' 
WHERE LOWER(name) LIKE '%teen board%' OR LOWER(name) LIKE '%seguin%teen%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori ten boards seguin' 
WHERE LOWER(name) LIKE '%ten board%' OR LOWER(name) LIKE '%seguin%ten%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori hundred board math' 
WHERE LOWER(name) LIKE '%hundred board%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori addition strip board math' 
WHERE LOWER(name) LIKE '%addition%strip%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori subtraction strip board math' 
WHERE LOWER(name) LIKE '%subtraction%strip%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori addition snake game math' 
WHERE LOWER(name) LIKE '%addition snake%' OR LOWER(name) LIKE '%positive snake%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori subtraction snake game math' 
WHERE LOWER(name) LIKE '%subtraction snake%' OR LOWER(name) LIKE '%negative snake%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori stamp game math' 
WHERE LOWER(name) LIKE '%stamp game%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori bead chains skip counting' 
WHERE LOWER(name) LIKE '%bead chain%' OR LOWER(name) LIKE '%skip counting%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori multiplication board math' 
WHERE LOWER(name) LIKE '%multiplication board%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori division board math' 
WHERE LOWER(name) LIKE '%division board%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori fraction circles math' 
WHERE LOWER(name) LIKE '%fraction%' AND video_search_term IS NULL;

-- Language
UPDATE curriculum_roadmap SET video_search_term = 'Montessori I spy sound game language' 
WHERE (LOWER(name) LIKE '%i spy%' OR LOWER(name) LIKE '%sound game%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori sandpaper letters language' 
WHERE LOWER(name) LIKE '%sandpaper letter%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori moveable alphabet language' 
WHERE LOWER(name) LIKE '%moveable alphabet%' OR LOWER(name) LIKE '%movable alphabet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori pink series CVC reading' 
WHERE LOWER(name) LIKE '%pink series%' OR LOWER(name) LIKE '%cvc%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori blue series blends reading' 
WHERE LOWER(name) LIKE '%blue series%' OR LOWER(name) LIKE '%blend%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori green series phonograms reading' 
WHERE LOWER(name) LIKE '%green series%' OR LOWER(name) LIKE '%phonogram%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori object box language' 
WHERE LOWER(name) LIKE '%object box%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori metal insets writing' 
WHERE LOWER(name) LIKE '%metal inset%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori grammar symbols language' 
WHERE LOWER(name) LIKE '%grammar symbol%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori noun language grammar' 
WHERE LOWER(name) LIKE '%noun%' AND LOWER(area) = 'language' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori verb language grammar' 
WHERE LOWER(name) LIKE '%verb%' AND LOWER(area) = 'language' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori adjective language grammar' 
WHERE LOWER(name) LIKE '%adjective%' AND video_search_term IS NULL;

-- Cultural/Science
UPDATE curriculum_roadmap SET video_search_term = 'Montessori sandpaper globe geography' 
WHERE LOWER(name) LIKE '%sandpaper globe%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori painted globe geography' 
WHERE LOWER(name) LIKE '%painted globe%' OR LOWER(name) LIKE '%color%globe%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori continent puzzle map geography' 
WHERE LOWER(name) LIKE '%continent%' OR LOWER(name) LIKE '%world map%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori land and water forms geography' 
WHERE LOWER(name) LIKE '%land%water%' OR LOWER(name) LIKE '%land form%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori parts of bird puzzle zoology' 
WHERE LOWER(name) LIKE '%bird%' AND (LOWER(name) LIKE '%part%' OR LOWER(name) LIKE '%puzzle%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori parts of fish puzzle zoology' 
WHERE LOWER(name) LIKE '%fish%' AND (LOWER(name) LIKE '%part%' OR LOWER(name) LIKE '%puzzle%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori frog life cycle zoology' 
WHERE LOWER(name) LIKE '%frog%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori butterfly life cycle zoology' 
WHERE LOWER(name) LIKE '%butterfly%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori parts of flower botany' 
WHERE LOWER(name) LIKE '%flower%' AND (LOWER(name) LIKE '%part%' OR LOWER(name) LIKE '%puzzle%' OR LOWER(name) LIKE '%botany%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori parts of tree botany' 
WHERE LOWER(name) LIKE '%tree%' AND (LOWER(name) LIKE '%part%' OR LOWER(name) LIKE '%puzzle%') AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori leaf cabinet botany' 
WHERE LOWER(name) LIKE '%leaf%cabinet%' OR LOWER(name) LIKE '%leaf%shape%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori botany cabinet' 
WHERE LOWER(name) LIKE '%botany cabinet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori parts of leaf botany' 
WHERE LOWER(name) LIKE '%leaf%' AND LOWER(name) LIKE '%part%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori parts of root botany' 
WHERE LOWER(name) LIKE '%root%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori solar system science' 
WHERE LOWER(name) LIKE '%solar system%' OR LOWER(name) LIKE '%planet%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori history timeline' 
WHERE LOWER(name) LIKE '%timeline%' AND video_search_term IS NULL;

UPDATE curriculum_roadmap SET video_search_term = 'Montessori flags of the world geography' 
WHERE LOWER(name) LIKE '%flag%' AND video_search_term IS NULL;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check teacher_children table
SELECT 
  st.name as teacher_name,
  COUNT(tc.child_id) as student_count
FROM simple_teachers st
LEFT JOIN teacher_children tc ON tc.teacher_id = st.id
GROUP BY st.name
ORDER BY st.name;

-- Check video_search_term coverage
SELECT 
  area,
  COUNT(*) as total_works,
  COUNT(video_search_term) as with_search_term,
  ROUND(COUNT(video_search_term)::numeric / COUNT(*)::numeric * 100, 1) as coverage_pct
FROM curriculum_roadmap
GROUP BY area
ORDER BY area;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Independent Montree Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - teacher_children junction table';
  RAISE NOTICE '  - video_search_term column on curriculum_roadmap';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update /api/teacher/classroom to filter by teacher_id';
  RAISE NOTICE '  2. Add "Add Student" functionality for teachers';
  RAISE NOTICE '  3. Review video_search_term coverage and fill gaps';
END $$;
