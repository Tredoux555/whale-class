-- MONTREE PROGRESS TRACKING SCHEMA
-- Links children to curriculum works with progress status
-- Run this in Supabase SQL Editor AFTER 002_multi_user_schema.sql

-- =====================================================
-- CHILD WORK PROGRESS TABLE
-- The core table for tracking which works each child has done
-- =====================================================
CREATE TABLE IF NOT EXISTS child_work_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES curriculum_roadmap(id) ON DELETE CASCADE,
  
  -- Progress status: 0=not started, 1=presented, 2=practicing, 3=mastered
  status INTEGER NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 3),
  
  -- When each stage was reached
  presented_date DATE,
  practicing_date DATE,
  mastered_date DATE,
  
  -- Who recorded it
  recorded_by UUID REFERENCES users(id),
  
  -- Notes from teacher
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One record per child per work
  UNIQUE(child_id, work_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_child_work_progress_child ON child_work_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_child_work_progress_work ON child_work_progress(work_id);
CREATE INDEX IF NOT EXISTS idx_child_work_progress_status ON child_work_progress(status);
CREATE INDEX IF NOT EXISTS idx_child_work_progress_child_status ON child_work_progress(child_id, status);

-- =====================================================
-- PROGRESS HISTORY TABLE
-- Audit trail of all progress changes
-- =====================================================
CREATE TABLE IF NOT EXISTS progress_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES curriculum_roadmap(id) ON DELETE CASCADE,
  
  -- What changed
  old_status INTEGER,
  new_status INTEGER NOT NULL,
  
  -- Who and when
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional note
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_progress_history_child ON progress_history(child_id);
CREATE INDEX IF NOT EXISTS idx_progress_history_date ON progress_history(changed_at);

-- =====================================================
-- TEACHER CLASSROOM ASSIGNMENTS
-- Which teachers can access which classrooms (for shared classrooms)
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher_classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('lead', 'assistant', 'substitute')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, classroom_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_teacher ON teacher_classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_classroom ON teacher_classrooms(classroom_id);

-- =====================================================
-- QUICK ACCESS: View for getting child progress with work details
-- =====================================================
CREATE OR REPLACE VIEW child_progress_with_works AS
SELECT 
  cwp.id,
  cwp.child_id,
  c.name as child_name,
  cwp.work_id,
  cr.name as work_name,
  cr.area,
  cr.category,
  cr.subcategory,
  cr.sequence_order,
  cwp.status,
  CASE cwp.status
    WHEN 0 THEN 'not_started'
    WHEN 1 THEN 'presented'
    WHEN 2 THEN 'practicing'
    WHEN 3 THEN 'mastered'
  END as status_name,
  cwp.presented_date,
  cwp.practicing_date,
  cwp.mastered_date,
  cwp.notes,
  cwp.updated_at
FROM child_work_progress cwp
JOIN children c ON c.id = cwp.child_id
JOIN curriculum_roadmap cr ON cr.id = cwp.work_id;

-- =====================================================
-- QUICK ACCESS: View for classroom children with progress counts
-- =====================================================
CREATE OR REPLACE VIEW classroom_children_progress AS
SELECT 
  cc.classroom_id,
  cc.child_id,
  c.name as child_name,
  c.date_of_birth,
  c.photo_url,
  COUNT(cwp.id) FILTER (WHERE cwp.status = 1) as presented_count,
  COUNT(cwp.id) FILTER (WHERE cwp.status = 2) as practicing_count,
  COUNT(cwp.id) FILTER (WHERE cwp.status = 3) as mastered_count,
  COUNT(cwp.id) FILTER (WHERE cwp.status > 0) as total_started
FROM classroom_children cc
JOIN children c ON c.id = cc.child_id
LEFT JOIN child_work_progress cwp ON cwp.child_id = cc.child_id
WHERE cc.status = 'active'
GROUP BY cc.classroom_id, cc.child_id, c.name, c.date_of_birth, c.photo_url;

-- =====================================================
-- FUNCTION: Update progress with history tracking
-- =====================================================
CREATE OR REPLACE FUNCTION update_child_work_progress(
  p_child_id UUID,
  p_work_id UUID,
  p_new_status INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS child_work_progress AS $$
DECLARE
  v_old_status INTEGER;
  v_result child_work_progress;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM child_work_progress
  WHERE child_id = p_child_id AND work_id = p_work_id;
  
  -- Insert or update progress
  INSERT INTO child_work_progress (child_id, work_id, status, recorded_by, notes,
    presented_date, practicing_date, mastered_date)
  VALUES (
    p_child_id, 
    p_work_id, 
    p_new_status, 
    p_user_id, 
    p_note,
    CASE WHEN p_new_status >= 1 THEN CURRENT_DATE END,
    CASE WHEN p_new_status >= 2 THEN CURRENT_DATE END,
    CASE WHEN p_new_status >= 3 THEN CURRENT_DATE END
  )
  ON CONFLICT (child_id, work_id) DO UPDATE SET
    status = p_new_status,
    recorded_by = COALESCE(p_user_id, child_work_progress.recorded_by),
    notes = COALESCE(p_note, child_work_progress.notes),
    presented_date = CASE 
      WHEN p_new_status >= 1 AND child_work_progress.presented_date IS NULL 
      THEN CURRENT_DATE 
      ELSE child_work_progress.presented_date 
    END,
    practicing_date = CASE 
      WHEN p_new_status >= 2 AND child_work_progress.practicing_date IS NULL 
      THEN CURRENT_DATE 
      ELSE child_work_progress.practicing_date 
    END,
    mastered_date = CASE 
      WHEN p_new_status >= 3 AND child_work_progress.mastered_date IS NULL 
      THEN CURRENT_DATE 
      ELSE child_work_progress.mastered_date 
    END,
    updated_at = NOW()
  RETURNING * INTO v_result;
  
  -- Log history if status changed
  IF v_old_status IS DISTINCT FROM p_new_status THEN
    INSERT INTO progress_history (child_id, work_id, old_status, new_status, changed_by, note)
    VALUES (p_child_id, p_work_id, v_old_status, p_new_status, p_user_id, p_note);
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get child's progress for a specific area
-- =====================================================
CREATE OR REPLACE FUNCTION get_child_area_progress(
  p_child_id UUID,
  p_area TEXT
) RETURNS TABLE (
  work_id UUID,
  work_name TEXT,
  category TEXT,
  subcategory TEXT,
  sequence_order INTEGER,
  status INTEGER,
  status_name TEXT,
  presented_date DATE,
  practicing_date DATE,
  mastered_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as work_id,
    cr.name as work_name,
    cr.category,
    cr.subcategory,
    cr.sequence_order,
    COALESCE(cwp.status, 0) as status,
    CASE COALESCE(cwp.status, 0)
      WHEN 0 THEN 'not_started'
      WHEN 1 THEN 'presented'
      WHEN 2 THEN 'practicing'
      WHEN 3 THEN 'mastered'
    END as status_name,
    cwp.presented_date,
    cwp.practicing_date,
    cwp.mastered_date
  FROM curriculum_roadmap cr
  LEFT JOIN child_work_progress cwp ON cwp.work_id = cr.id AND cwp.child_id = p_child_id
  WHERE cr.area = p_area
  ORDER BY cr.sequence_order, cr.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE child_work_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classrooms ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access on child_work_progress" 
  ON child_work_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on progress_history" 
  ON progress_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on teacher_classrooms" 
  ON teacher_classrooms FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_child_work_progress_updated_at ON child_work_progress;
CREATE TRIGGER update_child_work_progress_updated_at
  BEFORE UPDATE ON child_work_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE: Assign existing children to default classroom
-- =====================================================
-- First create a default classroom if none exists
INSERT INTO classrooms (id, school_id, name, age_group)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Primary Classroom',
  '3-6'
WHERE NOT EXISTS (SELECT 1 FROM classrooms WHERE id = '00000000-0000-0000-0000-000000000001');

-- Link existing children to this classroom
INSERT INTO classroom_children (classroom_id, child_id)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  c.id
FROM children c
WHERE NOT EXISTS (
  SELECT 1 FROM classroom_children cc 
  WHERE cc.child_id = c.id
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Montree Progress Tracking Schema Created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - child_work_progress (main progress tracking)';
  RAISE NOTICE '  - progress_history (audit trail)';
  RAISE NOTICE '  - teacher_classrooms (teacher assignments)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - child_progress_with_works';
  RAISE NOTICE '  - classroom_children_progress';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - update_child_work_progress()';
  RAISE NOTICE '  - get_child_area_progress()';
END $$;
