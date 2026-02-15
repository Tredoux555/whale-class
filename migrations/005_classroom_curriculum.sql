-- ============================================================
-- MIGRATION 005: Per-Classroom Curriculum System
-- ============================================================
-- This enables each classroom to have its own editable curriculum
-- Teachers can customize what works appear on their shelves
-- ============================================================

-- ============================================================
-- STEP 1: Create classroom_curriculum table
-- ============================================================
CREATE TABLE IF NOT EXISTS classroom_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  master_work_id UUID REFERENCES curriculum_roadmap(id) ON DELETE SET NULL,
  
  -- Work details (copied from master, editable by teacher)
  area TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  age_range TEXT,
  
  -- Ordering and visibility
  sequence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  materials_on_shelf BOOLEAN NOT NULL DEFAULT true,
  
  -- Teacher customization
  custom_notes TEXT,
  custom_materials TEXT,
  
  -- Metadata
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_classroom 
  ON classroom_curriculum(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_area 
  ON classroom_curriculum(classroom_id, area);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_active 
  ON classroom_curriculum(classroom_id, is_active);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_master 
  ON classroom_curriculum(master_work_id);

-- ============================================================
-- STEP 2: Update child_work_progress
-- ============================================================
ALTER TABLE child_work_progress 
ADD COLUMN IF NOT EXISTS classroom_work_id UUID REFERENCES classroom_curriculum(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_child_work_progress_classroom_work 
  ON child_work_progress(classroom_work_id);

-- ============================================================
-- STEP 3: Clone function
-- ============================================================
CREATE OR REPLACE FUNCTION clone_curriculum_for_classroom(p_classroom_id UUID)
RETURNS INTEGER AS $$
DECLARE
  work_count INTEGER;
BEGIN
  INSERT INTO classroom_curriculum (
    classroom_id, master_work_id, area, category, name, description,
    age_range, sequence, is_active, materials_on_shelf, is_custom
  )
  SELECT 
    p_classroom_id, cr.id, cr.area, cr.category, cr.name, cr.description,
    cr.age_range, cr.sequence, true, true, false
  FROM curriculum_roadmap cr
  WHERE NOT EXISTS (
    SELECT 1 FROM classroom_curriculum cc 
    WHERE cc.classroom_id = p_classroom_id AND cc.master_work_id = cr.id
  );
  
  GET DIAGNOSTICS work_count = ROW_COUNT;
  RETURN work_count;
END;
$$ LANGUAGE plpgsql;

-- Alias for compatibility
CREATE OR REPLACE FUNCTION clone_curriculum_to_classroom(p_classroom_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN clone_curriculum_for_classroom(p_classroom_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 4: Quick place student function
-- ============================================================
CREATE OR REPLACE FUNCTION quick_place_student(
  p_child_id UUID,
  p_classroom_work_id UUID,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_classroom_id UUID;
  v_area TEXT;
  v_sequence INTEGER;
  works_set INTEGER := 0;
BEGIN
  -- Get classroom and work info
  SELECT cc.classroom_id, cc.area, cc.sequence
  INTO v_classroom_id, v_area, v_sequence
  FROM classroom_curriculum cc
  WHERE cc.id = p_classroom_work_id;
  
  IF v_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Work not found';
  END IF;
  
  -- Mark all previous works in this area as mastered (status=3)
  UPDATE child_work_progress cwp
  SET status = 3, updated_at = NOW()
  FROM classroom_curriculum cc
  WHERE cwp.child_id = p_child_id
    AND cwp.classroom_work_id = cc.id
    AND cc.classroom_id = v_classroom_id
    AND cc.area = v_area
    AND cc.sequence < v_sequence
    AND cwp.status != 3;
  
  GET DIAGNOSTICS works_set = ROW_COUNT;
  
  -- Set current work to practicing (status=2)
  INSERT INTO child_work_progress (
    child_id, classroom_work_id, status, recorded_by, created_at, updated_at
  )
  VALUES (p_child_id, p_classroom_work_id, 2, p_recorded_by, NOW(), NOW())
  ON CONFLICT (child_id, classroom_work_id) 
  DO UPDATE SET 
    status = 2,
    updated_at = NOW(),
    recorded_by = COALESCE(p_recorded_by, child_work_progress.recorded_by);
  
  RETURN works_set;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 5: Auto-clone trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_clone_curriculum_on_classroom_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM clone_curriculum_for_classroom(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_clone_curriculum ON classrooms;
CREATE TRIGGER auto_clone_curriculum
  AFTER INSERT ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clone_curriculum_on_classroom_create();

-- ============================================================
-- STEP 6: Clone for existing classrooms
-- ============================================================
DO $$
DECLARE
  classroom_record RECORD;
  cloned_count INTEGER;
BEGIN
  FOR classroom_record IN SELECT id, name FROM classrooms LOOP
    SELECT clone_curriculum_for_classroom(classroom_record.id) INTO cloned_count;
    RAISE NOTICE 'Cloned % works for classroom: %', cloned_count, classroom_record.name;
  END LOOP;
END $$;

-- ============================================================
-- STEP 7: RLS Policies
-- ============================================================
ALTER TABLE classroom_curriculum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their classroom curriculum"
  ON classroom_curriculum FOR SELECT
  USING (
    classroom_id IN (
      SELECT tc.classroom_id FROM teacher_classrooms tc 
      WHERE tc.teacher_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('super_admin', 'school_admin'))
  );

CREATE POLICY "Teachers can update their classroom curriculum"
  ON classroom_curriculum FOR UPDATE
  USING (
    classroom_id IN (
      SELECT tc.classroom_id FROM teacher_classrooms tc 
      WHERE tc.teacher_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin')
  );

CREATE POLICY "Teachers can add custom works"
  ON classroom_curriculum FOR INSERT
  WITH CHECK (
    classroom_id IN (
      SELECT tc.classroom_id FROM teacher_classrooms tc 
      WHERE tc.teacher_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin')
  );

GRANT SELECT, INSERT, UPDATE ON classroom_curriculum TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;


