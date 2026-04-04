-- Migration 162: Support both teacher and parent report types per child per week
-- The Weekly Wrap feature generates two reports per child: teacher (internal) and parent (external)
-- We need a unique constraint that includes report_type so both can coexist

-- Drop the old constraint if it exists (only allows one report per child per week)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'montree_weekly_reports_child_id_week_number_report_year_key'
  ) THEN
    ALTER TABLE montree_weekly_reports
    DROP CONSTRAINT montree_weekly_reports_child_id_week_number_report_year_key;
    RAISE NOTICE 'Dropped old unique constraint (child_id, week_number, report_year)';
  END IF;
END $$;

-- Add the correct constraint that includes report_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'montree_weekly_reports_unique_child_week_type'
  ) THEN
    -- Clean up any duplicates first
    DELETE FROM montree_weekly_reports a
    USING montree_weekly_reports b
    WHERE a.id < b.id
      AND a.child_id = b.child_id
      AND a.week_start = b.week_start
      AND a.report_type = b.report_type;

    ALTER TABLE montree_weekly_reports
    ADD CONSTRAINT montree_weekly_reports_unique_child_week_type
    UNIQUE (child_id, week_start, report_type);

    RAISE NOTICE 'Added unique constraint (child_id, week_start, report_type)';
  END IF;
END $$;

-- Ensure report_type column exists and has a default
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'montree_weekly_reports' AND column_name = 'report_type'
  ) THEN
    ALTER TABLE montree_weekly_reports ADD COLUMN report_type TEXT DEFAULT 'parent';
    RAISE NOTICE 'Added report_type column';
  END IF;
END $$;

-- Index for quick weekly-wrap queries
CREATE INDEX IF NOT EXISTS idx_weekly_reports_classroom_week
ON montree_weekly_reports (classroom_id, week_number, report_year, report_type);
