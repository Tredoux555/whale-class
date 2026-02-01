-- Cleanup script for Leo's duplicate progress records
-- Child ID: 310743a4-51cf-4f8f-9920-9a087adb084f

-- First, view the duplicates
SELECT
  work_name,
  COUNT(*) as count,
  array_agg(status) as statuses,
  array_agg(id) as ids
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
GROUP BY work_name
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping the newest one
WITH ranked AS (
  SELECT
    id,
    work_name,
    ROW_NUMBER() OVER (
      PARTITION BY child_id, work_name
      ORDER BY COALESCE(updated_at, presented_at, created_at) DESC
    ) as rn
  FROM montree_child_progress
  WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
)
DELETE FROM montree_child_progress
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Verify cleanup
SELECT work_name, status, updated_at
FROM montree_child_progress
WHERE child_id = '310743a4-51cf-4f8f-9920-9a087adb084f'
ORDER BY work_name;
