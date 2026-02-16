-- Add location tracking columns to montree_schools
-- Captures geographic information at signup time for analytics

ALTER TABLE montree_schools
ADD COLUMN IF NOT EXISTS signup_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS signup_country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS signup_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS signup_region VARCHAR(100),
ADD COLUMN IF NOT EXISTS signup_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS signup_timezone VARCHAR(50);

-- Add index for country-based queries
CREATE INDEX IF NOT EXISTS idx_schools_signup_country ON montree_schools(signup_country);

-- Add comment for documentation
COMMENT ON COLUMN montree_schools.signup_country IS 'Full country name captured at signup (e.g., "United States")';
COMMENT ON COLUMN montree_schools.signup_country_code IS 'ISO 3166-1 alpha-2 country code (e.g., "US")';
COMMENT ON COLUMN montree_schools.signup_city IS 'City name captured at signup';
COMMENT ON COLUMN montree_schools.signup_region IS 'State/province/region captured at signup';
COMMENT ON COLUMN montree_schools.signup_ip IS 'IP address used during signup (for analytics only)';
COMMENT ON COLUMN montree_schools.signup_timezone IS 'Timezone captured at signup (e.g., "America/New_York")';
