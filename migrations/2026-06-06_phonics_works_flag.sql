-- ============================================================================
-- 2026-06-06  Dark Phonics Works — feature definition (default OFF)
-- ============================================================================
-- Registers the `phonics_works` flag so it appears in the super-admin / features
-- toggle. When a school turns it ON, /api/montree/works virtually appends the 49
-- Pink phonics lessons as Language-area works (no rows are written to the
-- classroom curriculum — clean on/off). See lib/montree/phonics/phonics-works.ts.
--
-- Apply in the Supabase SQL editor (same as other feature-flag migrations).
-- ============================================================================

INSERT INTO montree_feature_definitions
  (feature_key, name, description, category, is_premium, default_enabled)
VALUES (
  'phonics_works',
  'Dark Phonics Works',
  'Adds the 49 Pink-phase phonics lessons as Language-area works. Teachers tag and track them like any other work; each work links its song, book and reader. Default OFF; schools opt in.',
  'curriculum',
  false,
  false
)
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    default_enabled = EXCLUDED.default_enabled;

-- ── Pilot: turn it ON for Whale Class. ─────────────────────────────────────
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by, enabled_at)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'phonics_works', true, 'phonics_works_pilot', NOW())
ON CONFLICT (school_id, feature_key)
DO UPDATE SET enabled = true, enabled_by = 'phonics_works_pilot', enabled_at = NOW();
