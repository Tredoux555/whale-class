-- DEMO PARENT ACCOUNTS FOR WHALE CLASS
-- Creates parent access codes for each child
-- Run this in Supabase SQL Editor

-- First, let's see all children in the database
-- SELECT id, name FROM children ORDER BY name;

-- Generate access codes for ALL children (one-time setup)
INSERT INTO parent_access_codes (code, child_id, expires_at, used)
SELECT 
  -- Generate unique 8-char code: first 4 letters of name + 4 random chars
  UPPER(
    SUBSTRING(REGEXP_REPLACE(c.name, '[^a-zA-Z]', '', 'g'), 1, 4) || 
    SUBSTRING(MD5(RANDOM()::TEXT), 1, 4)
  ),
  c.id,
  NOW() + INTERVAL '365 days',  -- Valid for 1 year
  false
FROM children c
WHERE NOT EXISTS (
  -- Don't create if child already has an unused code
  SELECT 1 FROM parent_access_codes pac 
  WHERE pac.child_id = c.id AND pac.used = false
);

-- Show all generated codes with child names
SELECT 
  c.name as child_name,
  pac.code as access_code,
  'teacherpotato.xyz/montree/parent?code=' || pac.code as parent_url,
  pac.expires_at
FROM parent_access_codes pac
JOIN children c ON c.id = pac.child_id
WHERE pac.used = false
ORDER BY c.name;
