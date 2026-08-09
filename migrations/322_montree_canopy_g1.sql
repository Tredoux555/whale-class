-- =============================================================================
-- 322_montree_canopy_g1.sql — Montree Canopy (Grade 1 tier of Montree Milestones)
-- =============================================================================
-- Montree Milestones (migration 314) covers the kindergarten bands A3, A4 and A5.
-- "Montree Canopy" adds a SECOND TIER, band code 'G1', for Grade 1 children (ages 6–7)
-- who have outgrown the kindergarten check-in. Same instrument, same milestone/coverage/
-- band rules, same suppression posture, same report — one band further up.
--
-- This migration does TWO things and nothing else:
--
--   1. Widens the two age_band CHECK constraints written by 314 to accept 'G1'.
--   2. Inserts the `child_evaluation_g1` feature definition, default OFF.
--
-- It creates no table, drops nothing, and rewrites no row. Every existing A3/A4/A5
-- check-in satisfies the widened constraint exactly as it satisfied the old one.
--
-- TWO FLAGS, NOT ONE. `child_evaluation` opens the instrument; `child_evaluation_g1`
-- opens the Grade 1 tier of it. A school with Milestones on and Canopy off runs
-- kindergarten only and never sees a G1 band chip.
--
-- CONTENT IS NOT IN HERE. This migration wires the band; the G1 item bank (items,
-- milestones, stimuli, crosswalks) is authored separately. Until that content ships, a G1
-- sitting would find an empty bank slice — which is why the flag ships OFF.
--
-- ORDER: the code deploys FIRST and is safe against this SQL not having been run. Until it
-- is, a G1 session insert comes back 23514 and the routes turn that into a clean
-- "migration pending" 503 (see isCheckConstraintViolation in
-- lib/montree/evaluation/route-helpers.ts). Kindergarten check-ins are unaffected either way.
--
-- IDEMPOTENT: safe to paste twice. The constraints are dropped by name and recreated; the
-- feature row is an upsert.
--
-- Next free number verified against the repo on Aug 9, 2026: the highest migration on disk
-- is 321_potato_snaps_v13_send.sql, so this is 322.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────── 1. widen the band CHECKs ──
-- 314 wrote these inline, so Postgres named them automatically:
--   montree_evaluation_sessions_age_band_check
--   montree_evaluation_milestone_results_age_band_check
-- Dropping IF EXISTS by that generated name and re-adding an explicitly named constraint
-- makes this re-runnable and leaves a name a future migration can rely on.

ALTER TABLE montree_evaluation_sessions
  DROP CONSTRAINT IF EXISTS montree_evaluation_sessions_age_band_check;
ALTER TABLE montree_evaluation_sessions
  DROP CONSTRAINT IF EXISTS montree_evaluation_sessions_age_band_allowed;
ALTER TABLE montree_evaluation_sessions
  ADD CONSTRAINT montree_evaluation_sessions_age_band_allowed
  CHECK (age_band IN ('A3','A4','A5','G1'));

ALTER TABLE montree_evaluation_milestone_results
  DROP CONSTRAINT IF EXISTS montree_evaluation_milestone_results_age_band_check;
ALTER TABLE montree_evaluation_milestone_results
  DROP CONSTRAINT IF EXISTS montree_evaluation_milestone_results_age_band_allowed;
ALTER TABLE montree_evaluation_milestone_results
  ADD CONSTRAINT montree_evaluation_milestone_results_age_band_allowed
  CHECK (age_band IN ('A3','A4','A5','G1'));

-- montree_evaluation_item_responses.age_band is deliberately untouched: 314 declared it
-- TEXT NOT NULL with no CHECK, so it already accepts 'G1'.

-- ──────────────────────────────────────────────────── 2. the feature flag ──
-- Default OFF. Enable per school in super-admin → Schools → ⚙️ Features → Montree Canopy.
-- `name` is NOT NULL on this table — omitting it is how migration 224 failed the first time.
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('child_evaluation_g1',
   'Montree Canopy (Grade 1)',
   'The Grade 1 tier of Montree Milestones, for children of 6–7 who have outgrown the kindergarten check-in. Requires Montree Milestones to be switched on as well.',
   -- The modal renders this string as-is (<span>{f.icon}</span>), so it must be an emoji.
   -- 314 shipped the lucide name 'ClipboardCheck' for child_evaluation, which renders as
   -- the literal word — not repeating that here.
   '🌿',
   'assessment',
   true,
   false)
ON CONFLICT (feature_key) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      icon        = EXCLUDED.icon,
      category    = EXCLUDED.category,
      is_premium  = EXCLUDED.is_premium;

-- ────────────────────────────────────────────────────────────── comments ──
COMMENT ON CONSTRAINT montree_evaluation_sessions_age_band_allowed ON montree_evaluation_sessions IS
  'A3/A4/A5 are the kindergarten bands from migration 314; G1 is Montree Canopy, the Grade 1 tier added in 322. Gated by the child_evaluation_g1 feature flag, not by this constraint.';
COMMENT ON CONSTRAINT montree_evaluation_milestone_results_age_band_allowed ON montree_evaluation_milestone_results IS
  'Mirrors montree_evaluation_sessions_age_band_allowed. A result row carries the band of its MILESTONE, which for a Montree Canopy sitting is G1.';

COMMIT;

-- ─────────────────────────────────────────────────────────────── verify ──
-- Paste this after the migration to confirm both constraints now accept G1:
--
--   SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
--   FROM pg_constraint
--   WHERE conname IN ('montree_evaluation_sessions_age_band_allowed',
--                     'montree_evaluation_milestone_results_age_band_allowed');
--
-- Expect two rows, each ending: CHECK ((age_band = ANY (ARRAY['A3'::text, 'A4'::text, 'A5'::text, 'G1'::text])))
--
--   SELECT feature_key, name, is_premium, default_enabled
--   FROM montree_feature_definitions WHERE feature_key = 'child_evaluation_g1';
--
-- Expect one row: child_evaluation_g1 | Montree Canopy (Grade 1) | true | false
