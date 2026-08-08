-- =============================================================================
-- 319_potato_snaps_v11.sql — Potato Snaps v1.1
-- =============================================================================
-- Adds two features to the schema created by 318_potato_snaps.sql:
--
--   1. CLASS FILMS — one weekly film for the whole class, curated by the
--      teacher. tp_montage_jobs grows a `kind` discriminator; a class job has
--      child_id NULL and may carry a list of children the teacher excused.
--
--   2. WHITE-LABEL BRANDING — the app advertises the school, not itself.
--      tp_classes carries the school name, the school logo (set by HQ) and the
--      class emblem (set by the teacher).
--
-- 🚨 NO storage.buckets STATEMENTS IN HERE. Learned on Aug 7: a write to the
--    storage schema inside this transaction rolls the WHOLE migration back on
--    this project's permissions. The `potato-snaps` bucket already exists
--    (created via the dashboard) and needs nothing further.
--
-- IDEMPOTENT: safe to run more than once, including on a database that already
-- has some of these columns.
--
-- Next free number verified against the Mac on Aug 8, 2026: the repo's highest
-- migration is 318_potato_snaps.sql, so this is 319.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------- tp_montage_jobs ----

-- 'child' keeps every existing v1.0 row correct without a backfill.
ALTER TABLE tp_montage_jobs
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'child';

-- A class film belongs to the class, not to one child.
ALTER TABLE tp_montage_jobs
  ALTER COLUMN child_id DROP NOT NULL;

-- Children the teacher consciously excused from this class film. NULL for
-- child films; may be an empty array for a class film where nobody was
-- excused. Kept on the job so the board can show the receipt
-- ("21 children in it · Zara excused") long after the fact.
ALTER TABLE tp_montage_jobs
  ADD COLUMN IF NOT EXISTS excused_child_ids UUID[];

-- The CHECK has to be added conditionally: ADD CONSTRAINT has no IF NOT EXISTS
-- in PostgreSQL, so a second run would abort the whole transaction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'tp_montage_jobs'::regclass
       AND conname  = 'tp_montage_jobs_kind_check'
  ) THEN
    ALTER TABLE tp_montage_jobs
      ADD CONSTRAINT tp_montage_jobs_kind_check CHECK (kind IN ('child', 'class'));
  END IF;
END $$;

-- A child film must name a child; a class film must not. Belt and braces
-- against a bad insert from either side of the app/worker split.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'tp_montage_jobs'::regclass
       AND conname  = 'tp_montage_jobs_kind_child_check'
  ) THEN
    ALTER TABLE tp_montage_jobs
      ADD CONSTRAINT tp_montage_jobs_kind_child_check CHECK (
        (kind = 'child' AND child_id IS NOT NULL)
        OR
        (kind = 'class' AND child_id IS NULL)
      );
  END IF;
END $$;

-- The board asks "is there a class film for this class, this week?" on every
-- load; the worker asks "what is queued?" on every poll.
CREATE INDEX IF NOT EXISTS idx_tp_montage_jobs_class_week_kind
  ON tp_montage_jobs (class_id, week_start, kind);

-- ------------------------------------------------------------- tp_classes ---

-- Set by HQ (Tredoux). A teacher can never change these two.
ALTER TABLE tp_classes ADD COLUMN IF NOT EXISTS school_name      TEXT;
ALTER TABLE tp_classes ADD COLUMN IF NOT EXISTS school_logo_path TEXT;

-- Set by the teacher: the class's own emblem, a circle beside the children's
-- faces.
ALTER TABLE tp_classes ADD COLUMN IF NOT EXISTS emblem_path      TEXT;

COMMIT;

-- =============================================================================
-- Verify (optional — paste separately after the migration):
--
--   SELECT column_name, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_name = 'tp_montage_jobs'
--      AND column_name IN ('kind', 'child_id', 'excused_child_ids')
--    ORDER BY column_name;
--   -- expect: child_id YES | excused_child_ids YES | kind NO 'child'::text
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'tp_classes'
--      AND column_name IN ('school_name','school_logo_path','emblem_path');
--   -- expect 3 rows
--
--   SELECT conname FROM pg_constraint
--    WHERE conrelid = 'tp_montage_jobs'::regclass AND contype = 'c';
--   -- expect the status check plus tp_montage_jobs_kind_check
--   --        and tp_montage_jobs_kind_child_check
-- =============================================================================
