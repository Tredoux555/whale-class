-- Migration 149: Add Chinese translation columns to classroom curriculum works
-- Supports Chinese parent descriptions and Montessori terminology in Chinese

ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_zh TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_description_zh TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS why_it_matters_zh TEXT DEFAULT NULL;

-- Add indexes for faster lookups when filtering by Chinese names
CREATE INDEX IF NOT EXISTS idx_classroom_curriculum_works_name_zh
  ON montree_classroom_curriculum_works(classroom_id, name_zh);

-- Trigger to update updated_at timestamp when Chinese columns change
CREATE OR REPLACE FUNCTION montree_classroom_curriculum_works_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS montree_classroom_curriculum_works_updated_at_trigger
  ON montree_classroom_curriculum_works;

CREATE TRIGGER montree_classroom_curriculum_works_updated_at_trigger
  BEFORE UPDATE ON montree_classroom_curriculum_works
  FOR EACH ROW
  EXECUTE FUNCTION montree_classroom_curriculum_works_updated_at();

-- Comment for documentation
COMMENT ON COLUMN montree_classroom_curriculum_works.name_zh IS 'Chinese translation of work name';
COMMENT ON COLUMN montree_classroom_curriculum_works.parent_description_zh IS 'Chinese translation of parent-facing description';
COMMENT ON COLUMN montree_classroom_curriculum_works.why_it_matters_zh IS 'Chinese translation of educational significance';
