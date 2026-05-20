-- migrations/225_child_english_progress.sql
--
-- Session 119 (post-overnight) — English Progression Tracker Phase 1.
--
-- Tracks each child's position in the 128-lesson Pink / Blue / Green
-- progression that lives in `public/whale-reading-content.html` +
-- `lib/montree/english-sequence/lesson-map.ts`. ONE row per child.
--
-- ──────────────────────────────────────────────────────────────────
-- Schema posture:
--   current_lesson   — sole source of truth for "what lesson now". 1..128.
--   mastered_lessons — derived stats (count, phase breakdown). Sorted ASC.
--   App-code invariant: mastered_lessons ⊇ [1..current_lesson - 1].
--   current_phase    — denormalised for fast filter; recomputed when
--                      current_lesson changes. 'pink' | 'blue' | 'green'.
-- ──────────────────────────────────────────────────────────────────
--
-- Migration is idempotent — safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_child_english_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,

  current_phase TEXT NOT NULL DEFAULT 'pink'
    CHECK (current_phase IN ('pink', 'blue', 'green')),
  current_lesson INTEGER NOT NULL DEFAULT 1
    CHECK (current_lesson >= 1 AND current_lesson <= 128),

  -- Sorted ASC, no duplicates. Enforced in app code.
  mastered_lessons INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],

  -- Audit trail: who moved this child + when.
  last_advanced_at TIMESTAMPTZ DEFAULT NOW(),
  last_advanced_by_role TEXT
    CHECK (last_advanced_by_role IN ('teacher', 'principal', 'system')),
  last_advanced_by_id UUID,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per child max.
  UNIQUE(child_id)
);

-- Index for the classroom-overview English Progress tab: pull every
-- child's position for a given classroom in one shot via JOIN on
-- montree_children.classroom_id.
CREATE INDEX IF NOT EXISTS idx_child_english_progress_child
  ON montree_child_english_progress(child_id);

-- Index for "who's leading?" / "who's behind?" class-level queries.
-- Partial — only active progression rows; defaults (lesson 1) are noise.
CREATE INDEX IF NOT EXISTS idx_child_english_progress_lesson
  ON montree_child_english_progress(current_lesson DESC)
  WHERE current_lesson > 1;

-- updated_at trigger
CREATE OR REPLACE FUNCTION fn_child_english_progress_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_child_english_progress_updated_at
  ON montree_child_english_progress;
CREATE TRIGGER trg_child_english_progress_updated_at
  BEFORE UPDATE ON montree_child_english_progress
  FOR EACH ROW
  EXECUTE FUNCTION fn_child_english_progress_touch_updated_at();

COMMIT;
