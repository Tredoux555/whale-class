-- Migration 281: Global visual memory ("master brain" v1) — Jul 3, 2026
--
-- A READ-ONLY, CURATED baseline moat for STANDARD curriculum works, keyed by
-- the cross-school-stable work_key. Kills the cold-start problem: a brand-new
-- classroom inherits baseline visual descriptions for the standard materials
-- so day-one photo identification approaches mature-classroom accuracy
-- (see docs/handoffs/SESSION_PHOTO_ID_COLDSTART_AUDIT_JUL3.md — the
-- Bright Stars Cylinder-Block-tagged-as-Spindle-Boxes incident).
--
-- 🚨 ARCHITECTURAL RULES (v1 — do not relax without a new design review):
--   1. NO automatic cross-school writes. Rows come ONLY from the seed script
--      (scripts/seed-global-visual-memory.mjs — curated Whale Class entries +
--      hand-authored canonical entries). This eliminates the poison/abuse
--      vector entirely: nothing user-generated flows in at runtime.
--   2. STANDARD works only (work_key never LIKE 'custom_%'). Custom works are
--      school-private and stay in the per-classroom montree_visual_memory.
--   3. Global entries NEVER satisfy Gate A Path 1 (auto-file trust). They are
--      injected as Pass 2 prompt context + Pass 2b candidates only. Auto-file
--      still requires classroom-local teacher-verified memory OR the exact-
--      match ≥0.90 first-sight path.
--   4. No FK on source_classroom_id — provenance annotation only; must
--      survive classroom deletion.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_global_visual_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical cross-school work identifier (e.g. 'se_cylinder_block_1').
  -- One row per standard work.
  work_key TEXT NOT NULL UNIQUE,
  -- Canonical work name from the static curriculum (e.g. 'Cylinder Block 1').
  work_name TEXT NOT NULL,
  area TEXT,
  -- Same semantics as montree_visual_memory.visual_description:
  -- LOOKS LIKE prose, possibly multi-fingerprint ('||'-separated).
  visual_description TEXT NOT NULL,
  key_materials TEXT[],
  -- Discriminators: 'NOT <confusable work>: <why>' entries. These are the
  -- highest-value field for confusion pairs (Cylinder Block ↔ Spindle Boxes).
  negative_descriptions TEXT[],
  -- 'whale_seed' (extracted from Whale Class teacher-validated entries) or
  -- 'curated' (hand-authored canonical entry). Future consensus sources would
  -- be a v2 design decision — not permitted by this schema's contract yet.
  source TEXT NOT NULL DEFAULT 'whale_seed',
  source_classroom_id UUID, -- provenance only, deliberately NO FK
  description_confidence NUMERIC NOT NULL DEFAULT 0.85,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_vm_active_work_key
  ON montree_global_visual_memory (work_key)
  WHERE is_active;

-- RLS house style (migrations 275-278 posture): enable with NO policies →
-- deny-all for anon/authenticated. The app reads via the service-role key,
-- which bypasses RLS.
ALTER TABLE montree_global_visual_memory ENABLE ROW LEVEL SECURITY;

-- Telemetry extension: track global-moat participation per Gate A decision so
-- trust-gate tuning (e.g. a future 'global VM + conf >= 0.90' Path 1.5) is a
-- DB query, not a guess. NULL on rows written before this migration.
ALTER TABLE montree_pipeline_telemetry
  ADD COLUMN IF NOT EXISTS global_vm_injected_count INTEGER;
ALTER TABLE montree_pipeline_telemetry
  ADD COLUMN IF NOT EXISTS has_global_vm_for_match BOOLEAN;

COMMIT;
