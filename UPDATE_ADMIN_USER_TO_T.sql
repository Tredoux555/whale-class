-- Update Story Admin User to match Story User credentials
-- This makes it easier - use same login for both systems
-- Run this in Supabase SQL Editor

-- Update existing admin user to use "T" as username
-- Password will be "redoux" (same as story viewer)
UPDATE story_admin_users 
SET 
  username = 'T',
  password_hash = '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'
WHERE username = 'Tredoux';

-- If the update didn't work (user doesn't exist), insert it
INSERT INTO story_admin_users (username, password_hash)
VALUES ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Verify the change
SELECT username, created_at, last_login FROM story_admin_users;

-- ✅ RESULT: You can now login to both systems with:
-- Username: T
-- Password: redoux

