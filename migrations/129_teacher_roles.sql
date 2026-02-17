-- Migration 129: Teacher roles (lead_teacher vs assistant_teacher)
-- Supports principal dashboard drill-down showing teacher hierarchy

-- Default NULL roles to 'teacher'
UPDATE montree_teachers SET role = 'teacher' WHERE role IS NULL;

-- Make first teacher per classroom the lead_teacher
UPDATE montree_teachers t
SET role = 'lead_teacher'
WHERE role = 'teacher'
  AND id IN (
    SELECT DISTINCT ON (classroom_id) id
    FROM montree_teachers
    WHERE role = 'teacher' AND classroom_id IS NOT NULL AND is_active = true
    ORDER BY classroom_id, created_at ASC
  );

-- Index for efficient classroom+school lookups
CREATE INDEX IF NOT EXISTS idx_montree_teachers_school_classroom_active
  ON montree_teachers(school_id, classroom_id)
  WHERE is_active = true;
