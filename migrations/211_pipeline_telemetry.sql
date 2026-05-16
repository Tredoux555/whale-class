-- Migration 211: montree_pipeline_telemetry
--
-- Session 113 photo pipeline audit recommendation #5.
--
-- Without this table, every threshold tuning decision (HAIKU_TRUST_CONFIDENCE,
-- AUTO_SONNET_CONFIDENCE_THRESHOLD, PASS2B_CONFIDENCE_THRESHOLD,
-- PASS2B_NO_VM_THRESHOLD, the +0.05 override margin) is made from grep
-- output on Railway logs. The Apr 9 Sandpaper Letters → Metal Insets
-- incident took 2 weeks to fully diagnose because nobody had per-photo
-- decision data to query.
--
-- This table captures one row per Gate A decision (haiku_matched OR
-- haiku_drafted fallback). Volume estimate: ~50 photos/day × 7 schools
-- × 1 row each = ~350/day. Linear-scan friendly; partitioning not needed.
--
-- Architectural rule (mirrors migration 196): no FK on school_id /
-- classroom_id / media_id. Telemetry is append-only — a media delete must
-- not wipe the historical decision data that informs threshold tuning.
-- The cost is the occasional orphan row, which is fine.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS montree_pipeline_telemetry (
  id BIGSERIAL PRIMARY KEY,

  -- Identity (no FKs — preserve through delete)
  media_id UUID,
  school_id UUID,
  classroom_id UUID,

  -- Outcome — what status the photo ended up in
  outcome TEXT,                                  -- 'haiku_matched' | 'haiku_drafted' | 'sonnet_drafted' | 'failed' | 'pass1_failed'
  decision TEXT,                                 -- 'trusted' | 'sonnet_fallback' | 'pass1_failed' | 'no_match'

  -- Pass 1 (vision)
  pass1_failed BOOLEAN,
  pass1_description_len INT,

  -- Pass 2 (match)
  pass2_success BOOLEAN,
  pass2_confidence DOUBLE PRECISION,
  pass2_work_name TEXT,                          -- canonical name after fuzzy match
  pass2_haiku_raw_work_name TEXT,                -- raw before fuzzy match
  pass2_match_score DOUBLE PRECISION,            -- matchToCurriculumV2 score
  pass2_area TEXT,                               -- practical_life / sensorial / mathematics / language / cultural

  -- Visual memory state at decision time
  has_visual_memory_for_match BOOLEAN,
  visual_memory_set_size INT,
  visual_memory_injected_count INT,

  -- Pass 2b (Sonnet-discriminator) state
  pass2b_fired BOOLEAN,
  pass2b_improved BOOLEAN,

  -- Threshold snapshot — so future tuning can re-derive decisions against
  -- historical telemetry under hypothetical thresholds.
  haiku_trust_confidence_threshold DOUBLE PRECISION,

  -- Auto-Sonnet bookkeeping
  auto_sonnet_queued BOOLEAN,

  -- Non-fatal errors collected during the run
  errors TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-outcome time series (the canonical "how often is Gate A failing?" query)
CREATE INDEX IF NOT EXISTS idx_pipeline_telemetry_outcome_created
  ON montree_pipeline_telemetry (outcome, created_at DESC);

-- Per-school slice
CREATE INDEX IF NOT EXISTS idx_pipeline_telemetry_school_created
  ON montree_pipeline_telemetry (school_id, created_at DESC)
  WHERE school_id IS NOT NULL;

-- Per-classroom slice (for per-classroom visual memory tuning)
CREATE INDEX IF NOT EXISTS idx_pipeline_telemetry_classroom_created
  ON montree_pipeline_telemetry (classroom_id, created_at DESC)
  WHERE classroom_id IS NOT NULL;

-- Per-media lookup (for the photo-debug super-admin view from
-- audit recommendation #4 — not yet shipped but the index lands now
-- so the future page is a single-scan lookup)
CREATE INDEX IF NOT EXISTS idx_pipeline_telemetry_media
  ON montree_pipeline_telemetry (media_id, created_at DESC)
  WHERE media_id IS NOT NULL;

-- Recent-decisions firehose
CREATE INDEX IF NOT EXISTS idx_pipeline_telemetry_recent
  ON montree_pipeline_telemetry (created_at DESC);
