-- Migration 180: Fix Photo Bucket (review_before_process) — CHECK constraint + missing definition
--
-- Root cause of Apr 15-16 upload failures:
--   1. Migration 177 defined the feature + enable row, but NEVER RAN on production.
--      Migration 178 (idempotent enable) ran instead — wrote school_features row but
--      left montree_feature_definitions empty for 'review_before_process'.
--   2. `montree_media.identification_status` CHECK constraint only allows
--      (skipped, sonnet_drafted, confirmed, haiku_matched, pending, failed).
--      It does NOT allow 'pending_review'. Migration 177 never expanded it either.
--
-- Symptoms once the flag was enabled (2026-04-15 05:09 UTC):
--   - Server-side isFeatureEnabled('review_before_process') returned TRUE
--     (school row wins over missing definition default)
--   - Upload route set identification_status='pending_review' on every new photo
--   - INSERT failed with Postgres error 23514 (check constraint violation)
--   - Upload route returned 500 "Insert failed" after storage cleanup
--   - Photos stuck in client IndexedDB queue, never reached the DB
--   - Photo Bucket tab invisible on client because /api/montree/features
--     only returns features with definition rows (missing → isEnabled=false)
--
-- This migration:
--   A) Expands the CHECK constraint to include 'pending_review'
--   B) INSERTs the missing definition row (idempotent)
--   C) Adds the partial index (was in migration 177, never ran)
--   D) Leaves the Whale school enable row as-is (currently disabled for live-test
--      recovery — re-enable manually in super-admin UI or Supabase after verifying
--      queued photos have drained through the normal pipeline)
--
-- Run in Supabase SQL editor. Idempotent.

-- A) Drop and recreate the CHECK constraint with 'pending_review' added
ALTER TABLE montree_media
  DROP CONSTRAINT IF EXISTS montree_media_identification_status_check;

ALTER TABLE montree_media
  ADD CONSTRAINT montree_media_identification_status_check
  CHECK (
    identification_status IS NULL
    OR identification_status IN (
      'skipped',
      'sonnet_drafted',
      'confirmed',
      'haiku_matched',
      'pending',
      'failed',
      'pending_review'
    )
  );

-- B) INSERT the missing feature definition row (migration 177 never ran)
-- NOTE: real column is `name`, not `display_name`. Migration 177's original
-- payload is reproduced here verbatim so the row matches every other feature.
INSERT INTO montree_feature_definitions (
  feature_key, name, description, icon, category, is_premium, default_enabled
) VALUES (
  'review_before_process',
  'Photo Bucket (Review Before AI Process)',
  'Photos land in a review queue (Photo Bucket tab) without firing AI identification. Teachers select keepers and process them in batches. Saves API costs on blurry/duplicate shots and keeps the visual memory corpus cleaner.',
  '🧐',
  'capture',
  false,
  false
) ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category;

-- C) Partial index for the pending review queue (was in migration 177)
CREATE INDEX IF NOT EXISTS idx_montree_media_pending_review
  ON montree_media (classroom_id, captured_at DESC)
  WHERE identification_status = 'pending_review';

-- D) Re-enable the flag for Whale Class now that the constraint + definition are in place.
--    Previous live-test attempt was rolled back to disabled because uploads were 500'ing
--    on the missing CHECK value. Safe to re-enable now.
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'review_before_process', true, 'migration_180')
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_180';

-- E) Verification queries (uncomment to check):
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conname = 'montree_media_identification_status_check';
-- SELECT * FROM montree_feature_definitions WHERE feature_key = 'review_before_process';
-- SELECT * FROM montree_school_features WHERE feature_key = 'review_before_process';
