-- Migration 022: Per-Classroom Curriculum System
-- Each classroom gets its own copy of the curriculum that teachers can customize

-- ============================================
-- STEP 1: Create classroom_curriculum table
-- ============================================

CREATE TABLE IF NOT EXISTS classroom_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  master_work_id TEXT,  -- Links back to curriculum_roadmap.id (can be null for custom works)
  
  -- Core curriculum fields (copied from master, editable by teacher)
  area_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  chinese_name TEXT,
  description TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  
  -- Rich metadata
  materials JSONB DEFAULT '[]',
  direct_aims JSONB DEFAULT '[]',
  indirect_aims JSONB DEFAULT '[]',
  control_of_error TEXT,
  levels JSONB DEFAULT '[]',
  age_range TEXT,
  
  -- Teacher customization fields
  is_active BOOLEAN DEFAULT true,              -- Soft delete (teacher hides this work)
  materials_on_shelf BOOLEAN DEFAULT true,     -- "I have this material in my classroom"
  custom_notes TEXT,                           -- Teacher's personal notes
  is_custom BOOLEAN DEFAULT false,             -- True if teacher added this work
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one copy of each master work per classroom
  UNIQUE(classroom_id, master_work_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_classroom ON classroom_curriculum(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_area ON classroom_curriculum(area_id);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_master ON classroom_curriculum(master_work_id);
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_active ON classroom_curriculum(classroom_id, is_active);

-- ============================================
-- STEP 2: Create function to clone curriculum to classroom
-- ============================================

CREATE OR REPLACE FUNCTION clone_curriculum_to_classroom(p_classroom_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Insert all works from curriculum_roadmap into classroom_curriculum
  INSERT INTO classroom_curriculum (
    classroom_id,
    master_work_id,
    area_id,
    category_id,
    name,
    chinese_name,
    description,
    sequence,
    materials,
    direct_aims,
    indirect_aims,
    control_of_error,
    levels,
    age_range,
    is_active,
    materials_on_shelf,
    is_custom
  )
  SELECT 
    p_classroom_id,
    cr.id::TEXT,
    COALESCE(cr.area_id, cr.area, 'practical_life'),
    cr.category_id,
    COALESCE(cr.name, cr.work_name, 'Unnamed Work'),
    cr.chinese_name,
    cr.description,
    COALESCE(cr.sequence, cr.sequence_order, 0),
    COALESCE(cr.materials, '[]'::JSONB),
    COALESCE(cr.direct_aims, '[]'::JSONB),
    COALESCE(cr.indirect_aims, '[]'::JSONB),
    cr.control_of_error,
    COALESCE(cr.levels, '[]'::JSONB),
    cr.age_range,
    true,   -- is_active
    true,   -- materials_on_shelf (assume teacher has everything initially)
    false   -- is_custom
  FROM curriculum_roadmap cr
  ON CONFLICT (classroom_id, master_work_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Create trigger to auto-clone on classroom creation
-- ============================================

CREATE OR REPLACE FUNCTION trigger_clone_curriculum_to_classroom()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM clone_curriculum_to_classroom(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_clone_curriculum ON classrooms;

-- Create trigger
CREATE TRIGGER auto_clone_curriculum
  AFTER INSERT ON classrooms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_clone_curriculum_to_classroom();

-- ============================================
-- STEP 4: Update child_work_progress to support classroom curriculum
-- ============================================

-- Add column to link to classroom curriculum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'child_work_progress' AND column_name = 'classroom_work_id') THEN
    ALTER TABLE child_work_progress ADD COLUMN classroom_work_id UUID REFERENCES classroom_curriculum(id);
  END IF;
END $$;

-- Index for classroom work lookups
CREATE INDEX IF NOT EXISTS idx_child_work_progress_classroom_work 
  ON child_work_progress(classroom_work_id);

-- ============================================
-- STEP 5: Quick Placement Function
-- ============================================

CREATE OR REPLACE FUNCTION quick_place_student(
  p_child_id UUID,
  p_placements JSONB  -- Array of {area_id, work_id}
)
RETURNS JSONB AS $$
DECLARE
  v_placement JSONB;
  v_area_id TEXT;
  v_work_id UUID;
  v_sequence INTEGER;
  v_classroom_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get classroom_id from child
  SELECT classroom_id INTO v_classroom_id 
  FROM children 
  WHERE id = p_child_id;
  
  IF v_classroom_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Child not found or no classroom');
  END IF;

  -- Process each placement
  FOR v_placement IN SELECT * FROM jsonb_array_elements(p_placements)
  LOOP
    v_area_id := v_placement->>'area_id';
    v_work_id := (v_placement->>'work_id')::UUID;
    
    -- Get the sequence of the selected work
    SELECT sequence INTO v_sequence
    FROM classroom_curriculum
    WHERE id = v_work_id AND classroom_id = v_classroom_id;
    
    IF v_sequence IS NOT NULL THEN
      -- Mark all PREVIOUS works in this area as mastered (status = 3)
      INSERT INTO child_work_progress (child_id, classroom_work_id, status, mastered_date)
      SELECT 
        p_child_id,
        cc.id,
        3,  -- mastered
        NOW()
      FROM classroom_curriculum cc
      WHERE cc.classroom_id = v_classroom_id
        AND cc.area_id = v_area_id
        AND cc.sequence < v_sequence
        AND cc.is_active = true
      ON CONFLICT (child_id, classroom_work_id) 
      DO UPDATE SET status = 3, mastered_date = NOW(), updated_at = NOW();
      
      -- Mark the selected work as practicing (status = 2)
      INSERT INTO child_work_progress (child_id, classroom_work_id, status, practicing_date)
      VALUES (p_child_id, v_work_id, 2, NOW())
      ON CONFLICT (child_id, classroom_work_id) 
      DO UPDATE SET status = 2, practicing_date = NOW(), updated_at = NOW();
      
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true, 
    'updated_areas', v_updated_count,
    'child_id', p_child_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Add unique constraint for progress tracking
-- ============================================

-- First, clean up any duplicates
DELETE FROM child_work_progress a
USING child_work_progress b
WHERE a.id < b.id 
  AND a.child_id = b.child_id 
  AND a.classroom_work_id = b.classroom_work_id
  AND a.classroom_work_id IS NOT NULL;

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'child_work_progress_child_classroom_work_unique'
  ) THEN
    ALTER TABLE child_work_progress 
    ADD CONSTRAINT child_work_progress_child_classroom_work_unique 
    UNIQUE (child_id, classroom_work_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist or duplicates prevent it
  NULL;
END $$;

-- ============================================
-- STEP 7: RLS Policies
-- ============================================

ALTER TABLE classroom_curriculum ENABLE ROW LEVEL SECURITY;

-- Anyone can read curriculum (needed for progress pages)
DROP POLICY IF EXISTS "Anyone can read classroom curriculum" ON classroom_curriculum;
CREATE POLICY "Anyone can read classroom curriculum" ON classroom_curriculum
  FOR SELECT USING (true);

-- Teachers can update their classroom's curriculum
DROP POLICY IF EXISTS "Teachers can update their classroom curriculum" ON classroom_curriculum;
CREATE POLICY "Teachers can update their classroom curriculum" ON classroom_curriculum
  FOR UPDATE USING (true);  -- We'll add proper teacher checks via API

-- Teachers can insert custom works
DROP POLICY IF EXISTS "Teachers can insert custom works" ON classroom_curriculum;
CREATE POLICY "Teachers can insert custom works" ON classroom_curriculum
  FOR INSERT WITH CHECK (true);  -- We'll add proper teacher checks via API

-- ============================================
-- STEP 8: Clone curriculum for existing classrooms
-- ============================================

-- This will clone curriculum to any classrooms that don't have it yet
DO $$
DECLARE
  v_classroom RECORD;
  v_count INTEGER;
BEGIN
  FOR v_classroom IN 
    SELECT id FROM classrooms 
    WHERE id NOT IN (SELECT DISTINCT classroom_id FROM classroom_curriculum)
  LOOP
    SELECT clone_curriculum_to_classroom(v_classroom.id) INTO v_count;
    RAISE NOTICE 'Cloned % works to classroom %', v_count, v_classroom.id;
  END LOOP;
END $$;

-- ============================================
-- DONE! Verify with:
-- SELECT COUNT(*) FROM classroom_curriculum;
-- SELECT classroom_id, COUNT(*) FROM classroom_curriculum GROUP BY classroom_id;
-- ============================================
