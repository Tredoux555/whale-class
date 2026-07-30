-- 308_paper_scan.sql
-- Paper Scan (Cellphoneless Classrooms, Phase 1)
--
-- Teachers handwrite classroom observations on paper, photograph the sheet
-- after class in the PWA, Claude vision reads it, the system matches children
-- to the classroom roster + works to the curriculum, the teacher reviews, and
-- on approval it lands in each child's profile.
--
-- Architecturally this is voice-observation with an image instead of audio:
--   montree_paper_scans            ~ voice_observation_sessions
--   montree_paper_scan_extractions ~ voice_observation_extractions
--
-- House style: service-role only. RLS is ENABLED with NO policies, so anon /
-- authenticated keys can read nothing; every access goes through an API route
-- that has already run verifySchoolRequest.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Scans (one scan = one photographed sheet)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_paper_scans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          uuid NOT NULL,
  classroom_id       uuid NOT NULL,
  teacher_id         uuid NOT NULL,
  -- Storage path inside the montree-media bucket. Set to NULL at commit time:
  -- raw sheet photos are NOT retained after the teacher approves (privacy).
  storage_path       text,
  sheet_date         date,
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'extracting', 'review', 'committed', 'failed')),
  error_message      text,
  extraction_model   text,
  overall_confidence text,
  sheet_summary      text,
  format_description text,
  children_found     int NOT NULL DEFAULT 0,
  entries_found      int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  extracted_at       timestamptz,
  committed_at       timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Extractions (one row per child x entry read off the sheet)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_paper_scan_extractions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               uuid NOT NULL REFERENCES montree_paper_scans(id) ON DELETE CASCADE,
  school_id             uuid NOT NULL,
  classroom_id          uuid NOT NULL,
  -- What the model read off the page, verbatim (misspellings included).
  child_name_raw        text,
  name_legibility       text,
  -- Filled by deterministic Jaro-Winkler matching against the classroom
  -- roster. NULL when nothing matched — the teacher assigns in review.
  child_id              uuid,
  match_confidence      numeric,
  work_name_raw         text,
  work_key              text,
  work_name             text,
  work_match_confidence numeric,
  area                  text,
  proposed_status       text,
  status_confidence     text,
  time_minutes          int,
  note                  text,
  general_note          text,
  review_status         text NOT NULL DEFAULT 'pending'
                          CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited')),
  teacher_final_status  text,
  teacher_final_note    text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Indexes — the history list, the classroom feed, and the two hot joins
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_paper_scans_school_created
  ON montree_paper_scans (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_scans_classroom_created
  ON montree_paper_scans (classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_scan_extractions_scan
  ON montree_paper_scan_extractions (scan_id);
CREATE INDEX IF NOT EXISTS idx_paper_scan_extractions_child
  ON montree_paper_scan_extractions (child_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. RLS — enabled, zero policies (service-role only, house style)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE montree_paper_scans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_paper_scan_extractions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Feature flag
-- Column list mirrors lib/montree/features/types.ts (MontreeFeature) +
-- lib/montree/features/server.ts (reads default_enabled off feature_key).
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('paper_scan',
   'Paper Scan',
   'Photograph a handwritten classroom record sheet after class; Claude reads it, matches children and works, and files the approved entries to each child.',
   '📄',
   'teacher_tools',
   false,
   false)
ON CONFLICT (feature_key) DO NOTHING;
