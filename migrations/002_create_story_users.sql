-- Create Story Users (T and Z)
-- Run this in Supabase SQL Editor

INSERT INTO story_users (username, password_hash)
VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
  ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Login credentials:
-- Username: T, Password: redoux
-- Username: Z, Password: oe


