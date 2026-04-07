-- Migration 166: Global works staging table
-- Passive collection of every accepted Sonnet draft / custom work creation across all schools.
-- Owner-only (Tredoux). Used to study work patterns, NOT injected into identification yet.
-- Phase 1: passive collection only. No dedup, no UI, no retrieval.

CREATE TABLE IF NOT EXISTS montree_global_works_staging (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source provenance
  source_school_id     UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
  source_classroom_id  UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  source_media_id      UUID,
  source_work_id       UUID,

  -- Work content (mirrors classroom curriculum work shape)
  name                 TEXT NOT NULL,
  area                 TEXT NOT NULL,
  description          TEXT,
  materials            TEXT[],
  why_it_matters       TEXT,

  -- Optional Sonnet draft fields (when this came from a Sonnet draft acceptance)
  visual_description   TEXT,
  proposed_name        TEXT,
  closest_existing_match TEXT,
  draft_confidence     NUMERIC(4,3),

  -- Acceptance signal — every row is implicitly a "vote" for this work
  origin               TEXT NOT NULL DEFAULT 'add_custom_work',
    -- 'add_custom_work' | 'sonnet_draft_accepted' | 'manual'

  -- Soft-dedup helper (not enforced; for later analysis)
  normalized_name      TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(name, '[^a-zA-Z0-9]+', ' ', 'g'))
  ) STORED,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analysis queries
CREATE INDEX IF NOT EXISTS idx_global_works_staging_normalized
  ON montree_global_works_staging (normalized_name);

CREATE INDEX IF NOT EXISTS idx_global_works_staging_area
  ON montree_global_works_staging (area);

CREATE INDEX IF NOT EXISTS idx_global_works_staging_school
  ON montree_global_works_staging (source_school_id);

CREATE INDEX IF NOT EXISTS idx_global_works_staging_created
  ON montree_global_works_staging (created_at DESC);

COMMENT ON TABLE montree_global_works_staging IS
  'Phase 1 passive collection of every custom work created across all schools. Owner-only data for studying global patterns. Not used in identification.';
