-- Quick fix: Change curriculum_roadmap.id from UUID to TEXT
-- Run this AFTER the main migration if you got UUID errors

-- Step 1: Drop all foreign key constraints that depend on curriculum_roadmap.id
ALTER TABLE video_search_cache 
DROP CONSTRAINT IF EXISTS video_search_cache_work_id_fkey;

ALTER TABLE video_search_logs 
DROP CONSTRAINT IF EXISTS video_search_logs_work_id_fkey;

ALTER TABLE child_video_watches 
DROP CONSTRAINT IF EXISTS child_video_watches_curriculum_work_id_fkey;

-- Also drop any other potential foreign keys (from the main migration)
ALTER TABLE child_curriculum_position 
DROP CONSTRAINT IF EXISTS child_curriculum_position_current_work_id_fkey;

ALTER TABLE child_curriculum_position 
DROP CONSTRAINT IF EXISTS child_curriculum_position_current_curriculum_work_id_fkey;

ALTER TABLE child_work_completion 
DROP CONSTRAINT IF EXISTS child_work_completion_work_id_fkey;

ALTER TABLE child_work_completion 
DROP CONSTRAINT IF EXISTS child_work_completion_curriculum_work_id_fkey;

ALTER TABLE curriculum_videos 
DROP CONSTRAINT IF EXISTS curriculum_videos_work_id_fkey;

ALTER TABLE activity_to_curriculum_mapping 
DROP CONSTRAINT IF EXISTS activity_to_curriculum_mapping_curriculum_work_id_fkey;

-- Step 2: Add temporary TEXT id column
ALTER TABLE curriculum_roadmap ADD COLUMN id_text TEXT;

-- Step 3: Copy existing UUID values as text (if any exist)
UPDATE curriculum_roadmap SET id_text = id::TEXT WHERE id_text IS NULL;

-- Step 4: Drop the view that depends on the id column
DROP VIEW IF EXISTS child_curriculum_progress;

-- Step 5: Drop primary key constraint (now safe since foreign keys are dropped)
ALTER TABLE curriculum_roadmap DROP CONSTRAINT IF EXISTS curriculum_roadmap_pkey;

-- Step 6: Drop old UUID id column
ALTER TABLE curriculum_roadmap DROP COLUMN id;

-- Step 7: Rename id_text to id
ALTER TABLE curriculum_roadmap RENAME COLUMN id_text TO id;

-- Step 8: Make it primary key
ALTER TABLE curriculum_roadmap ADD PRIMARY KEY (id);

-- Step 9: Recreate the view (it will be populated after seeding)
-- View that uses work_id (new TEXT column)
CREATE VIEW child_curriculum_progress AS
SELECT 
  c.id AS child_id,
  c.name AS child_name,
  ca.id AS area_id,
  ca.name AS area_name,
  ca.color AS area_color,
  ca.icon AS area_icon,
  COUNT(DISTINCT cr.id) AS total_works,
  COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = 'completed') AS completed_works,
  COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = 'in_progress') AS in_progress_works,
  ROUND(
    COUNT(DISTINCT cwc.work_id) FILTER (WHERE cwc.status = 'completed')::NUMERIC / 
    NULLIF(COUNT(DISTINCT cr.id), 0) * 100, 
    1
  ) AS completion_percentage
FROM children c
CROSS JOIN curriculum_areas ca
LEFT JOIN curriculum_roadmap cr ON cr.area_id = ca.id
LEFT JOIN child_work_completion cwc ON 
  cwc.child_id = c.id
  AND cwc.work_id = cr.id
GROUP BY c.id, c.name, ca.id, ca.name, ca.color, ca.icon
ORDER BY c.name, ca.sequence;

-- Step 8: Re-add foreign key constraints with TEXT type
-- Note: These will need to be updated to reference TEXT instead of UUID
-- You may need to update the referenced columns in other tables too

-- For video_search_cache (if work_id exists and is UUID, you'll need to convert it)
-- ALTER TABLE video_search_cache ALTER COLUMN work_id TYPE TEXT USING work_id::TEXT;
-- ALTER TABLE video_search_cache 
-- ADD CONSTRAINT video_search_cache_work_id_fkey 
-- FOREIGN KEY (work_id) REFERENCES curriculum_roadmap(id);

-- For video_search_logs (if work_id exists and is UUID, you'll need to convert it)
-- ALTER TABLE video_search_logs ALTER COLUMN work_id TYPE TEXT USING work_id::TEXT;
-- ALTER TABLE video_search_logs 
-- ADD CONSTRAINT video_search_logs_work_id_fkey 
-- FOREIGN KEY (work_id) REFERENCES curriculum_roadmap(id);

-- For child_video_watches (if curriculum_work_id exists and is UUID, you'll need to convert it)
-- ALTER TABLE child_video_watches ALTER COLUMN curriculum_work_id TYPE TEXT USING curriculum_work_id::TEXT;
-- ALTER TABLE child_video_watches 
-- ADD CONSTRAINT child_video_watches_curriculum_work_id_fkey 
-- FOREIGN KEY (curriculum_work_id) REFERENCES curriculum_roadmap(id);

