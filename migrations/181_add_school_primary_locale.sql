-- Migration 181: Add primary_locale and secondary_locales to montree_schools
-- Captured at signup. Tells downstream pipelines which language(s) a school operates in.
--
-- A monolingual Russian school: primary_locale='ru', secondary_locales='{}'.
-- Whale Class (bilingual): primary_locale='en', secondary_locales='{zh}'.
--
-- NOT used for custom-work translation routing (translateAllLocales fans out to
-- all enabled locales — at Haiku pricing the routing optimization isn't worth
-- the complexity). USED for:
--   - UI default locale at signup
--   - Future report-generation language preference
--   - Any future per-school AI content language routing

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS primary_locale TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS secondary_locales TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: every existing school defaults to 'en'. Safe — UI continues to
-- behave as it did before for monolingual English schools.
-- For schools with known primary languages, update them explicitly below.

-- Whale Class: bilingual English + Chinese (Tredoux House)
UPDATE montree_schools
   SET primary_locale = 'en',
       secondary_locales = ARRAY['zh']
 WHERE id = 'c6280fae-567c-45ed-ad4d-934eae79aabc';

-- Add a CHECK constraint to ensure primary_locale is one of the supported locales.
-- Keeps invalid values out of the DB. Locale list mirrors SUPPORTED_LOCALES in
-- lib/montree/i18n/locales.ts — when a new language is added there, add it here too.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_schools_primary_locale_check'
  ) THEN
    ALTER TABLE montree_schools
      ADD CONSTRAINT montree_schools_primary_locale_check
      CHECK (primary_locale IN ('en','zh','es','de','fr','pt','nl','it','ja','ko','uk','ru'));
  END IF;
END $$;

COMMENT ON COLUMN montree_schools.primary_locale IS
  'School''s primary operating language. Default UI locale at login. One of SUPPORTED_LOCALES.';
COMMENT ON COLUMN montree_schools.secondary_locales IS
  'Additional languages this school operates in. Empty array for monolingual schools.';
