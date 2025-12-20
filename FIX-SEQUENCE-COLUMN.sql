-- Fix sequence_order column issue
-- The migration added 'sequence' but 'sequence_order' still exists with NOT NULL constraint

-- Option 1: Make sequence_order nullable (safer, keeps old data)
ALTER TABLE curriculum_roadmap ALTER COLUMN sequence_order DROP NOT NULL;

-- Option 2: Copy sequence to sequence_order if sequence exists
UPDATE curriculum_roadmap SET sequence_order = sequence WHERE sequence IS NOT NULL AND sequence_order IS NULL;

-- Option 3: If you want to drop sequence_order entirely (only if no important data)
-- ALTER TABLE curriculum_roadmap DROP COLUMN IF EXISTS sequence_order;


