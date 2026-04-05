-- Migration 162: Fix unique constraint to support both teacher+parent reports per child per week
-- The existing "unique_child_week_year" constraint is on (child_id, week_number, report_year)
-- WITHOUT report_type, so teacher and parent reports clash. We need report_type in the constraint.

-- Step 1: Drop the old constraint that doesn't include report_type
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_child_week_year'
  ) THEN
    ALTER TABLE montree_weekly_reports DROP CONSTRAINT unique_child_week_year;
    RAISE NOTICE 'Dropped old unique_child_week_year constraint';
  END IF;
END $$;

-- Also drop the auto-named variant if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_weekly_reports_child_id_week_number_report_year_key'
  ) THEN
    ALTER TABLE montree_weekly_reports DROP CONSTRAINT montree_weekly_reports_child_id_week_number_report_year_key;
    RAISE NOTICE 'Dropped auto-named constraint';
  END IF;
END $$;

-- Step 2: Clean up any duplicates that would violate the new constraint
DELETE FROM montree_weekly_reports a
USING montree_weekly_reports b
WHERE a.id < b.id
  AND a.child_id = b.child_id
  AND a.week_start = b.week_start
  AND a.report_type = b.report_type;

-- Step 3: Add the correct constraint that includes report_type
-- Uses (child_id, week_start, report_type) so both teacher+parent reports coexist
ALTER TABLE montree_weekly_reports
ADD CONSTRAINT unique_child_week_report_type
UNIQUE (child_id, week_start, report_type);

-- Step 4: Index for quick weekly-wrap review queries
CREATE INDEX IF NOT EXISTS idx_weekly_reports_classroom_week
ON montree_weekly_reports (classroom_id, week_start, report_type);
