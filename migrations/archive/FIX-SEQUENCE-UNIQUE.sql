-- Fix sequence_order unique constraint
-- Multiple works can have the same sequence_order (they're unique within categories, not globally)

-- Drop the unique constraint on sequence_order
ALTER TABLE curriculum_roadmap DROP CONSTRAINT IF EXISTS curriculum_roadmap_sequence_order_key;


