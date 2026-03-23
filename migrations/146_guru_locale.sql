-- Migration 146: Add locale column to guru interactions
-- Supports Chinese language experience for Guru chat
-- DEFAULT NULL so existing rows are treated as "universal" (accessible to all locales)
-- New interactions will explicitly set 'en' or 'zh'

ALTER TABLE montree_guru_interactions ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT NULL;

-- Index for locale-filtered history queries (includes NULL rows for backward-compat .or() filter)
CREATE INDEX IF NOT EXISTS idx_guru_interactions_locale
  ON montree_guru_interactions (child_id, locale, asked_at DESC);
