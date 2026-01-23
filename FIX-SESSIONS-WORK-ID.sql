-- FIX: Change work_id column from UUID to TEXT in montree_work_sessions
-- The work_id references montree_classroom_curriculum_works.id which is TEXT (like 'pl-dressing-frames')

-- Step 1: Check current column type
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'montree_work_sessions' AND column_name = 'work_id';

-- Step 2: Alter the column to TEXT (if it's currently UUID)
ALTER TABLE montree_work_sessions 
ALTER COLUMN work_id TYPE TEXT;

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'montree_work_sessions' AND column_name = 'work_id';
