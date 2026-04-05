-- Migration 163: Fix montree_visitors table schema
-- The table was created before migration 156 with a different schema.
-- Add missing columns: ip, region, page_url

ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS page_url TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_montree_visitors_ip ON montree_visitors (ip);
CREATE INDEX IF NOT EXISTS idx_montree_visitors_page_url ON montree_visitors (page_url);
