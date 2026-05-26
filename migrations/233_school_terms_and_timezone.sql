-- 233_school_terms_and_timezone.sql
-- Calendar Plan §7 — Phase 0 foundations.
--
-- TWO small, foundational additions that several existing features have been
-- quietly missing. Together they unblock the unified Calendar (Phase 1+),
-- correct end-of-week / end-of-month maths everywhere, and let "this term"
-- become a real concept.
--
-- 1. montree_schools.timezone — explicit IANA timezone per school.
--    The Railway server is UTC; schools are not. Today the english-schedule
--    route hardcodes 'Asia/Shanghai'; this column promotes that to a real
--    school-level setting. Defaults from signup_timezone where present.
--
-- 2. montree_school_terms — academic term boundaries.
--    The app already talks about "term reports" / "this term" with no
--    anchor. One small table fixes it.
--
-- Idempotent. Safe to re-run. Run in the Supabase SQL Editor.

-- 1. Per-school IANA timezone (e.g. 'Asia/Shanghai', 'America/New_York').
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Seed from signup_timezone where present, leaving NULLs for schools that
-- predate that column. lib/montree/school-time falls back to UTC then.
UPDATE montree_schools
   SET timezone = signup_timezone
 WHERE timezone IS NULL
   AND signup_timezone IS NOT NULL;

-- 2. School academic terms.
CREATE TABLE IF NOT EXISTS montree_school_terms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                  -- 'Term 1', 'Spring 2026', etc.
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_school_terms_school
  ON montree_school_terms (school_id);

CREATE INDEX IF NOT EXISTS idx_school_terms_window
  ON montree_school_terms (school_id, start_date, end_date);

-- Touch updated_at on any row UPDATE.
CREATE OR REPLACE FUNCTION montree_school_terms_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS school_terms_touch_updated_at ON montree_school_terms;
CREATE TRIGGER school_terms_touch_updated_at
  BEFORE UPDATE ON montree_school_terms
  FOR EACH ROW EXECUTE FUNCTION montree_school_terms_touch_updated_at();
