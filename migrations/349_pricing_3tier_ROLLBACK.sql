-- migrations/349_pricing_3tier_ROLLBACK.sql
-- Undo migrations/349_pricing_3tier.sql.
--
-- 🚨 READ FIRST. Rolling this back drops the plan columns, so every
-- lib/montree/plans read hits 42703 and falls back to the LEGACY ai_tier_*
-- derivation — which the 349 backfill kept in sync (it never cleared a flag).
-- So the product keeps working at Jul-6 behaviour. Deploy the old code too if
-- you intend to stay rolled back.
--
-- montree_media.archived_at is dropped LAST and un-archives everything first,
-- so no photo is left invisible by a half-rollback. Storage objects were never
-- touched by the cap in the first place.

BEGIN;

-- Un-archive before dropping the column — otherwise a re-run of 349 would
-- re-add archived_at as NULL anyway, but any interim code reading a stale
-- cached value must not hide a photo.
UPDATE montree_media SET archived_at = NULL WHERE archived_at IS NOT NULL;

DROP INDEX IF EXISTS idx_media_school_archived;
ALTER TABLE montree_media DROP COLUMN IF EXISTS archived_at;

ALTER TABLE montree_schools DROP CONSTRAINT IF EXISTS montree_schools_plan_chk;
ALTER TABLE montree_schools DROP CONSTRAINT IF EXISTS montree_schools_plan_override_chk;
ALTER TABLE montree_schools DROP CONSTRAINT IF EXISTS montree_schools_plan_source_chk;

DROP INDEX IF EXISTS idx_schools_plan;

ALTER TABLE montree_schools
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS plan_source,
  DROP COLUMN IF EXISTS plan_override,
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS photo_cap_reached_at,
  DROP COLUMN IF EXISTS plan_changed_at;

COMMIT;
