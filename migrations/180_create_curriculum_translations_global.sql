-- Migration 180: Global curriculum translations table
-- Single source of truth for all standard Montessori work translations.
-- Populated once from Whale Class (the reference classroom) and then
-- copied into every new classroom via apply_global_translations().
--
-- Keyed by (work_key, locale). One row per work per language.
-- ~329 standard works × 12 locales ≈ 4,000 rows total.
--
-- This table grows ONLY when:
--   1. A new language is added to SUPPORTED_LOCALES (and Whale Class is translated into it)
--   2. A custom work is "promoted to global" by super-admin
-- Day-to-day school activity does NOT touch this table.

CREATE TABLE IF NOT EXISTS montree_curriculum_translations (
  work_key            TEXT NOT NULL,
  locale              TEXT NOT NULL,
  name                TEXT NOT NULL,
  parent_description  TEXT,
  why_it_matters      TEXT,
  guide_content       JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (work_key, locale)
);

-- Lookups by (work_key, locale) hit the PK index. Add a locale-only index
-- for queries like "how many rows do we have per language?"
CREATE INDEX IF NOT EXISTS idx_ctt_locale ON montree_curriculum_translations(locale);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION montree_ctt_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ctt_updated_at ON montree_curriculum_translations;
CREATE TRIGGER trg_ctt_updated_at
  BEFORE UPDATE ON montree_curriculum_translations
  FOR EACH ROW
  EXECUTE FUNCTION montree_ctt_set_updated_at();

COMMENT ON TABLE montree_curriculum_translations IS
  'Global translation library for standard Montessori curriculum works. Keyed by (work_key, locale). Read-only for new classroom seeding.';
