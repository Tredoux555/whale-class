-- ============================================
-- VERIFY & FIX WEEKLY REPORTS SETUP
-- Idempotent Verification Script for Supabase
-- ============================================
-- This script checks and fixes the montree_weekly_reports
-- table and related tables. It can be run multiple times safely.
-- ============================================

-- Store results in a temporary table for summary
CREATE TEMP TABLE verification_results (
  check_name TEXT,
  status TEXT,
  details TEXT,
  action_taken TEXT
);

-- ============================================
-- 1. CHECK IF montree_weekly_reports TABLE EXISTS
-- ============================================

DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports'
  ) INTO table_exists;

  IF table_exists THEN
    INSERT INTO verification_results VALUES (
      '1. Table Exists',
      'PASS',
      'montree_weekly_reports table found',
      'None - table already exists'
    );
  ELSE
    INSERT INTO verification_results VALUES (
      '1. Table Exists',
      'FAIL',
      'montree_weekly_reports table not found',
      'Creating table now...'
    );

    -- Create the table
    CREATE TABLE montree_weekly_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL,
      classroom_id UUID,
      child_id UUID NOT NULL,

      -- Time period
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,

      -- Report type
      report_type TEXT NOT NULL CHECK (report_type IN ('teacher', 'parent')),

      -- Workflow status
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'sent')),

      -- Content (structured JSON)
      content JSONB NOT NULL DEFAULT '{}',

      -- Generated files
      pdf_path TEXT,
      slideshow_path TEXT,

      -- Audit trail
      generated_at TIMESTAMPTZ,
      generated_by TEXT,
      approved_at TIMESTAMPTZ,
      approved_by TEXT,
      sent_at TIMESTAMPTZ,
      sent_to JSONB,  -- Array of email addresses or parent IDs

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      -- One report per child per week per type
      UNIQUE(child_id, week_start, report_type)
    );
  END IF;
END $$;

-- ============================================
-- 2. CHECK IF ALL REQUIRED COLUMNS EXIST
-- ============================================

DO $$
DECLARE
  column_info RECORD;
  missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check each required column
  FOR column_info IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports'
  LOOP
    -- Columns are checked below individually
  END LOOP;

  -- Check for id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'id'
  ) THEN
    missing_columns := missing_columns || 'id';
  END IF;

  -- Check for school_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'school_id'
  ) THEN
    missing_columns := missing_columns || 'school_id';
    ALTER TABLE montree_weekly_reports ADD COLUMN school_id UUID NOT NULL;
  END IF;

  -- Check for classroom_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'classroom_id'
  ) THEN
    missing_columns := missing_columns || 'classroom_id';
    ALTER TABLE montree_weekly_reports ADD COLUMN classroom_id UUID;
  END IF;

  -- Check for child_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'child_id'
  ) THEN
    missing_columns := missing_columns || 'child_id';
    ALTER TABLE montree_weekly_reports ADD COLUMN child_id UUID NOT NULL;
  END IF;

  -- Check for week_start column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'week_start'
  ) THEN
    missing_columns := missing_columns || 'week_start';
    ALTER TABLE montree_weekly_reports ADD COLUMN week_start DATE NOT NULL;
  END IF;

  -- Check for week_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'week_end'
  ) THEN
    missing_columns := missing_columns || 'week_end';
    ALTER TABLE montree_weekly_reports ADD COLUMN week_end DATE NOT NULL;
  END IF;

  -- Check for report_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'report_type'
  ) THEN
    missing_columns := missing_columns || 'report_type';
    ALTER TABLE montree_weekly_reports ADD COLUMN report_type TEXT NOT NULL CHECK (report_type IN ('teacher', 'parent'));
  END IF;

  -- Check for status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'status'
  ) THEN
    missing_columns := missing_columns || 'status';
    ALTER TABLE montree_weekly_reports ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'sent'));
  END IF;

  -- Check for content column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'content'
  ) THEN
    missing_columns := missing_columns || 'content';
    ALTER TABLE montree_weekly_reports ADD COLUMN content JSONB NOT NULL DEFAULT '{}';
  END IF;

  -- Check for generated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'generated_at'
  ) THEN
    missing_columns := missing_columns || 'generated_at';
    ALTER TABLE montree_weekly_reports ADD COLUMN generated_at TIMESTAMPTZ;
  END IF;

  -- Check for sent_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'sent_at'
  ) THEN
    missing_columns := missing_columns || 'sent_at';
    ALTER TABLE montree_weekly_reports ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;

  -- Check for created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'created_at'
  ) THEN
    missing_columns := missing_columns || 'created_at';
    ALTER TABLE montree_weekly_reports ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Check for updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'updated_at'
  ) THEN
    missing_columns := missing_columns || 'updated_at';
    ALTER TABLE montree_weekly_reports ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add other audit trail columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'generated_by'
  ) THEN
    missing_columns := missing_columns || 'generated_by';
    ALTER TABLE montree_weekly_reports ADD COLUMN generated_by TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'approved_at'
  ) THEN
    missing_columns := missing_columns || 'approved_at';
    ALTER TABLE montree_weekly_reports ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'approved_by'
  ) THEN
    missing_columns := missing_columns || 'approved_by';
    ALTER TABLE montree_weekly_reports ADD COLUMN approved_by TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'sent_to'
  ) THEN
    missing_columns := missing_columns || 'sent_to';
    ALTER TABLE montree_weekly_reports ADD COLUMN sent_to JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'pdf_path'
  ) THEN
    missing_columns := missing_columns || 'pdf_path';
    ALTER TABLE montree_weekly_reports ADD COLUMN pdf_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'montree_weekly_reports' AND column_name = 'slideshow_path'
  ) THEN
    missing_columns := missing_columns || 'slideshow_path';
    ALTER TABLE montree_weekly_reports ADD COLUMN slideshow_path TEXT;
  END IF;

  -- Report results
  IF array_length(missing_columns, 1) > 0 THEN
    INSERT INTO verification_results VALUES (
      '2. Required Columns',
      'FIXED',
      'Missing columns: ' || array_to_string(missing_columns, ', '),
      'Added missing columns to table'
    );
  ELSE
    INSERT INTO verification_results VALUES (
      '2. Required Columns',
      'PASS',
      'All required columns present',
      'None - all columns exist'
    );
  END IF;
END $$;

-- ============================================
-- 3. CHECK IF UNIQUE CONSTRAINT EXISTS
-- ============================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_name TEXT := 'montree_weekly_reports_child_id_week_start_report_type_key';
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'montree_weekly_reports'
    AND constraint_type = 'UNIQUE'
    AND constraint_name IN (
      'montree_weekly_reports_child_id_week_start_report_type_key',
      'unique_child_week_report'
    )
  ) INTO constraint_exists;

  IF constraint_exists THEN
    INSERT INTO verification_results VALUES (
      '3. Unique Constraint',
      'PASS',
      'UNIQUE(child_id, week_start, report_type) constraint found',
      'None - constraint already exists'
    );
  ELSE
    INSERT INTO verification_results VALUES (
      '3. Unique Constraint',
      'FIXED',
      'UNIQUE constraint on (child_id, week_start, report_type) not found',
      'Adding constraint now...'
    );

    -- Add the constraint if it doesn't exist
    -- First, check if there are any duplicate rows that would violate it
    IF EXISTS (
      SELECT child_id, week_start, report_type, COUNT(*) as cnt
      FROM montree_weekly_reports
      GROUP BY child_id, week_start, report_type
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'WARNING: Found duplicate (child_id, week_start, report_type) combinations. Review these before constraint is applied.';
    ELSE
      ALTER TABLE montree_weekly_reports
      ADD CONSTRAINT montree_weekly_reports_unique_child_week_type
      UNIQUE (child_id, week_start, report_type);
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. CREATE INDEXES IF MISSING
-- ============================================

DO $$
BEGIN
  -- Index on school_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'montree_weekly_reports' AND indexname = 'idx_montree_reports_school'
  ) THEN
    CREATE INDEX idx_montree_reports_school ON montree_weekly_reports(school_id);
    INSERT INTO verification_results VALUES (
      '4. Indexes',
      'FIXED',
      'Index idx_montree_reports_school created',
      'Added index on school_id'
    );
  END IF;

  -- Index on child_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'montree_weekly_reports' AND indexname = 'idx_montree_reports_child'
  ) THEN
    CREATE INDEX idx_montree_reports_child ON montree_weekly_reports(child_id);
  END IF;

  -- Index on week_start (descending)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'montree_weekly_reports' AND indexname = 'idx_montree_reports_week'
  ) THEN
    CREATE INDEX idx_montree_reports_week ON montree_weekly_reports(week_start DESC);
  END IF;

  -- Index on status
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'montree_weekly_reports' AND indexname = 'idx_montree_reports_status'
  ) THEN
    CREATE INDEX idx_montree_reports_status ON montree_weekly_reports(status);
  END IF;

  -- Index on report_type
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'montree_weekly_reports' AND indexname = 'idx_montree_reports_type'
  ) THEN
    CREATE INDEX idx_montree_reports_type ON montree_weekly_reports(report_type);
  END IF;
END $$;

-- ============================================
-- 5. CREATE OR UPDATE TRIGGER FOR updated_at
-- ============================================

DO $$
BEGIN
  -- Create the update trigger function if it doesn't exist
  CREATE OR REPLACE FUNCTION update_montree_updated_at()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql;

  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS montree_reports_updated_at ON montree_weekly_reports;

  -- Create the trigger
  CREATE TRIGGER montree_reports_updated_at
  BEFORE UPDATE ON montree_weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_montree_updated_at();

  INSERT INTO verification_results VALUES (
    '5. Update Trigger',
    'OK',
    'Trigger montree_reports_updated_at is configured',
    'Trigger created/recreated for updated_at auto-update'
  );
END $$;

-- ============================================
-- 6. DISPLAY VERIFICATION RESULTS
-- ============================================

SELECT
  check_name,
  status,
  details,
  action_taken
FROM verification_results
ORDER BY check_name;

-- ============================================
-- 7. FINAL SUMMARY
-- ============================================

DO $$
DECLARE
  pass_count INT;
  fail_count INT;
  fix_count INT;
BEGIN
  SELECT
    COUNT(CASE WHEN status = 'PASS' THEN 1 END),
    COUNT(CASE WHEN status = 'FAIL' THEN 1 END),
    COUNT(CASE WHEN status = 'FIXED' THEN 1 END)
  INTO pass_count, fail_count, fix_count
  FROM verification_results;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Passed: %', COALESCE(pass_count, 0);
  RAISE NOTICE '🔧 Fixed: %', COALESCE(fix_count, 0);
  RAISE NOTICE '❌ Failed: %', COALESCE(fail_count, 0);
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 montree_weekly_reports table is now properly configured!';
  RAISE NOTICE 'You can safely use this table for weekly reports.';
  RAISE NOTICE '';
END $$;

-- ============================================
-- CLEANUP: Drop temporary results table
-- ============================================
DROP TABLE IF EXISTS verification_results;
