-- 325_photo_onboarding.sql
-- Photo Onboarding — roster import from a photo / PDF / DOCX / XLSX class list.
--
-- A teacher uploads whatever the school already has (a photographed class list,
-- an admin PDF, a Word doc of parent-interview notes, a spreadsheet). Claude
-- reads it, we reconcile the extracted names against the classroom's CURRENT
-- active roster, and the teacher reviews a full diff — create / update /
-- archive / skip, every row editable — before ANYTHING is written.
--
-- Nothing in these two tables touches montree_children. The commit route reads
-- the teacher's reviewed decisions and applies them; these rows are the staging
-- area and the audit trail of what the model read.
--
-- Architecturally this is the Paper Scan shape (migration 308):
--   montree_roster_imports         ~ montree_paper_scans
--   montree_roster_import_entries  ~ montree_paper_scan_extractions
--
-- House style: service-role only. RLS is ENABLED with NO policies, so anon /
-- authenticated keys can read nothing; every access goes through an API route
-- that has already run verifySchoolRequest.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Imports (one row = one uploaded class list)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_roster_imports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL,
  classroom_id uuid NOT NULL,
  -- Teacher (or principal) who uploaded. Nullable so a future system-driven
  -- import doesn't need a fake user id.
  created_by   uuid,
  source_type  text NOT NULL
                 CHECK (source_type IN ('photo', 'pdf', 'docx', 'xlsx')),
  -- Path inside the montree-media bucket. The original file is retained so a
  -- failed extraction can be retried without re-uploading.
  storage_path text,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'extracting', 'review', 'committed', 'failed')),
  error        text,
  committed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Entries (one row per proposed change the teacher will review)
--
--    kind = 'extracted' → a student read off the uploaded list
--    kind = 'departed'  → an ACTIVE child already on the roster who did NOT
--                         appear on the list (proposed for archive)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_roster_import_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id        uuid NOT NULL REFERENCES montree_roster_imports(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('extracted', 'departed')),
  -- The name exactly as read off the page (misspellings included), or the
  -- existing child's name for a 'departed' row.
  name_raw         text,
  date_of_birth    date,
  age              int,
  gender           text,
  -- Parent-interview notes and anything else worth keeping. Appended to
  -- montree_children.notes at commit time — never overwritten.
  notes            text,
  -- Filled by deterministic Jaro-Winkler matching against the classroom's
  -- active roster. NULL when nothing matched — the row becomes a 'create'.
  matched_child_id uuid,
  match_confidence real,
  match_type       text,
  suggested_action text NOT NULL
                     CHECK (suggested_action IN ('create', 'update', 'archive', 'skip')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_roster_imports_school_created
  ON montree_roster_imports (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roster_imports_classroom_created
  ON montree_roster_imports (classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roster_import_entries_import
  ON montree_roster_import_entries (import_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. updated_at trigger (house convention, cf. migration 315)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_montree_roster_imports_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_montree_roster_imports_touch ON montree_roster_imports;
CREATE TRIGGER trg_montree_roster_imports_touch
  BEFORE UPDATE ON montree_roster_imports
  FOR EACH ROW EXECUTE FUNCTION fn_montree_roster_imports_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. RLS — enabled, zero policies (service-role only, house style)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE montree_roster_imports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_roster_import_entries ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Feature flag
-- Column list mirrors lib/montree/features/types.ts (MontreeFeature) +
-- lib/montree/features/server.ts (reads default_enabled off feature_key).
-- Default ON: this is a first-run onboarding aid, not a risky automation —
-- nothing is written until the teacher reviews and taps Apply.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('photo_onboarding',
   'Photo Onboarding',
   'Upload a class list — a photo, PDF, Word document or spreadsheet — and Montree reads the students, birthdays and notes, reconciles them against the current roster, and shows you every proposed change before anything is saved.',
   '📷',
   'teacher_tools',
   false,
   true)
ON CONFLICT (feature_key) DO NOTHING;
