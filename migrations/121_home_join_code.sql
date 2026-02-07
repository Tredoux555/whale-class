-- Migration 121: Add join_code column to home_families
-- Session 155: Switch from email/password to code-based auth (matching Montree pattern)

ALTER TABLE home_families ADD COLUMN IF NOT EXISTS join_code TEXT;

-- UNIQUE constraint prevents duplicate codes (which would break .single() login lookup)
ALTER TABLE home_families ADD CONSTRAINT unique_home_join_code UNIQUE(join_code);

-- Index for fast code lookups during login
CREATE INDEX IF NOT EXISTS idx_home_families_join_code ON home_families(join_code);
