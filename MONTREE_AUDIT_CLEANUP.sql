-- ============================================
-- MONTREE DATA INTEGRITY CLEANUP
-- Leo (310743a4-51cf-4f8f-9920-9a087adb084f)
-- Generated: 2026-02-01
-- ============================================

-- STEP 1: Verify the duplicates before cleanup
SELECT 
  id,
  child_id,
  work_name,
  area,
  status,
  created_at,
  updated_at
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
  AND work_name = 'Small Buttons Frame'
ORDER BY created_at;

-- Expected output:
-- Record 1: d7f4c133-be31-4247-a2cf-d6a684195bb7 | presented | 2026-02-01T11:41:40
-- Record 2: 1bb7e090-ce13-4b6c-ae9f-ba9c8677f924 | mastered | 2026-02-01T11:41:41
-- Record 3: 15e22fe6-808e-405a-9c59-0711be945664 | practicing | 2026-02-01T11:41:41
-- Record 4: 1424203d-1385-48eb-bbbc-858fc29398e6 | not_started | 2026-02-01T11:41:43 (KEEP THIS ONE)

-- ============================================
-- STEP 2: IMMEDIATE FIX - Add UNIQUE constraint
-- Prevents future duplicates at the database level
-- ============================================

-- Add unique constraint to prevent child-work duplicates
ALTER TABLE montree_child_progress
ADD CONSTRAINT unique_child_work_progress 
UNIQUE(child_id, work_name);

-- If constraint already exists or conflicts occur, use:
-- DO $$
-- BEGIN
--   ALTER TABLE montree_child_progress
--   ADD CONSTRAINT unique_child_work_progress UNIQUE(child_id, work_name);
-- EXCEPTION WHEN OTHERS THEN
--   RAISE NOTICE 'Constraint may already exist or there are violations: %', SQLERRM;
-- END $$;

-- ============================================
-- STEP 3: Delete duplicate records for Small Buttons Frame
-- Keep the LATEST record (newest created_at)
-- ============================================

DELETE FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
  AND work_name = 'Small Buttons Frame'
  AND id IN (
    'd7f4c133-be31-4247-a2cf-d6a684195bb7',  -- presented - DELETE
    '1bb7e090-ce13-4b6c-ae9f-ba9c8677f924',  -- mastered - DELETE
    '15e22fe6-808e-405a-9c59-0711be945664'   -- practicing - DELETE
  );

-- Record to keep: 1424203d-1385-48eb-bbbc-858fc29398e6 (not_started - most recent)

-- ============================================
-- STEP 4: Verify cleanup successful
-- ============================================

-- Should now show only 1 record for Small Buttons Frame
SELECT COUNT(*) as remaining_records
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
  AND work_name = 'Small Buttons Frame';

-- Expected: 1

-- ============================================
-- STEP 5: Check for duplicates in other works
-- ============================================

-- Find ALL children with duplicate works
SELECT 
  child_id,
  work_name,
  COUNT(*) as duplicate_count,
  array_agg(id) as record_ids,
  array_agg(created_at) as creation_times
FROM montree_child_progress
GROUP BY child_id, work_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If other duplicates exist, repeat STEP 3 for each

-- ============================================
-- STEP 6: Verify Leo's final state
-- ============================================

SELECT 
  work_name,
  area,
  status,
  COUNT(*) as record_count
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
GROUP BY work_name, area, status
ORDER BY work_name;

-- Expected: Each work should have exactly 1 record

-- ============================================
-- STEP 7: Update Leo's remaining Small Buttons Frame record to desired status
-- ============================================

-- After deletion, Leo has "Small Buttons Frame" with status "not_started"
-- If the intended status is different, update it:

-- UPDATE montree_child_progress
-- SET status = 'presented'  -- or 'practicing' or 'mastered'
-- WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
--   AND work_name = 'Small Buttons Frame'
--   AND id = '1424203d-1385-48eb-bbbc-858fc29398e6';

-- ============================================
-- CLEANUP VERIFICATION
-- ============================================

-- Final statistics for Leo
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT work_name) as unique_works,
  COUNT(CASE WHEN status = 'presented' THEN 1 END) as presented_count,
  COUNT(CASE WHEN status = 'practicing' THEN 1 END) as practicing_count,
  COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered_count,
  COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started_count
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f';

-- Expected: 10 total records, 10 unique works

-- ============================================
-- BONUS: Check for orphaned media records
-- ============================================

SELECT 
  cwm.id,
  cwm.work_name,
  cwm.child_id,
  cwm.created_at
FROM child_work_media cwm
WHERE cwm.child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
  AND NOT EXISTS (
    SELECT 1 FROM montree_child_progress mcp
    WHERE mcp.child_id = cwm.child_id
      AND mcp.work_name = cwm.work_name
  );

-- This should return 0 rows (no orphaned media)
-- If there are orphans, either delete them or recreate the progress record

-- ============================================
-- NOTES
-- ============================================
-- 1. The UNIQUE constraint prevents future duplicates
-- 2. If the API tries to INSERT a duplicate, it will fail
-- 3. The API needs to be updated to use UPSERT instead of INSERT
-- 4. Location: /app/api/montree/children/route.ts (lines 100-115)
-- 5. Change .insert() to .upsert() with onConflict clause
