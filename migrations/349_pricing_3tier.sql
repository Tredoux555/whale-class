-- migrations/349_pricing_3tier.sql
-- 3-TIER PRICING RESTRUCTURE (Basic / Lite / Full) — Sep 7 2026
-- Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §1 (+ director decision:
-- plan_changed_at, so the Basic photo cap is GRANDFATHERED — only photos
-- captured AFTER a school became Basic count toward the 500).
--
-- Additive, idempotent, ONE transaction. Zero DROP/ALTER of existing columns.
-- SAFE TO RUN AFTER THE CODE DEPLOY: every read in lib/montree/plans/* catches
-- Postgres 42703 (undefined_column) and falls back to the legacy ai_tier_*
-- derivation, so a lagging migration degrades to Jul-6 behaviour, never to
-- "no product".
--
-- Rollback: migrations/349_pricing_3tier_ROLLBACK.sql

BEGIN;

-- ── montree_schools: the plan columns ────────────────────────────────────
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS plan_source TEXT,
  ADD COLUMN IF NOT EXISTS plan_override TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS photo_cap_reached_at TIMESTAMPTZ,
  -- Director decision (Sep 7 2026): the photo cap is GRANDFATHERED. Every
  -- writer of plan / plan_override stamps this; the cap counter only counts
  -- montree_media rows with created_at >= plan_changed_at, so a school that
  -- drops to Basic keeps its existing library and only its NEW photos count.
  ADD COLUMN IF NOT EXISTS plan_changed_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE montree_schools ADD CONSTRAINT montree_schools_plan_chk
    CHECK (plan IN ('basic','lite','full'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE montree_schools ADD CONSTRAINT montree_schools_plan_override_chk
    CHECK (plan_override IS NULL OR plan_override IN ('basic','lite','full'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE montree_schools ADD CONSTRAINT montree_schools_plan_source_chk
    CHECK (plan_source IS NULL OR plan_source IN ('stripe','override','founding','partner','legacy'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_schools_plan ON montree_schools(plan);

-- ── Photo cap: reversible SOFT archive. Storage objects are NEVER deleted. ──
ALTER TABLE montree_media
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_media_school_archived
  ON montree_media(school_id, archived_at, captured_at DESC);

-- ── Backfill: nobody loses AI on deploy day. ─────────────────────────────
-- Order matters — each pass only touches rows no earlier pass claimed.
UPDATE montree_schools s SET plan = 'full', plan_source = 'founding'
  WHERE s.founding_member = TRUE AND s.plan_override IS NULL;

UPDATE montree_schools s SET plan = 'full', plan_source = 'partner'
  WHERE s.billing_override_usd = 0 AND s.founding_member IS DISTINCT FROM TRUE
    AND s.plan_override IS NULL;

UPDATE montree_schools s SET plan = 'full', plan_source = 'legacy'
  WHERE s.plan_source IS NULL AND s.plan_override IS NULL
    AND EXISTS (SELECT 1 FROM montree_school_features f
                WHERE f.school_id = s.id AND f.feature_key = 'ai_tier_sonnet' AND f.enabled);

UPDATE montree_schools s SET plan = 'lite', plan_source = 'legacy'
  WHERE s.plan_source IS NULL AND s.plan_override IS NULL
    AND EXISTS (SELECT 1 FROM montree_school_features f
                WHERE f.school_id = s.id AND f.feature_key = 'ai_tier_haiku' AND f.enabled);

UPDATE montree_schools SET plan_source = 'legacy' WHERE plan_source IS NULL;

-- Every existing school's plan is "as of now". A Basic school's 500-photo
-- window therefore starts empty and only counts what it uploads from here on.
UPDATE montree_schools SET plan_changed_at = NOW() WHERE plan_changed_at IS NULL;

COMMIT;
