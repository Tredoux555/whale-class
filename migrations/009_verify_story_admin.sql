-- Verification Script - Check if story admin tables exist
-- Run this in Supabase SQL Editor to verify the migration worked

-- Check if tables exist
SELECT 
  'story_admin_users' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'story_admin_users'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT 
  'story_login_logs' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'story_login_logs'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT 
  'story_message_history' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'story_message_history'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Check if admin user exists
SELECT 
  username,
  created_at,
  last_login,
  CASE 
    WHEN password_hash IS NOT NULL THEN '✅ Password set'
    ELSE '❌ No password'
  END as password_status
FROM story_admin_users
WHERE username = 'Tredoux';

-- If admin user doesn't exist, create it:
-- INSERT INTO story_admin_users (username, password_hash) 
-- VALUES ('Tredoux', '$2b$10$0ZM4XYREQBobM6GcBdq4f.0FRMG.8vLexHng8flJzHiDrcUL.iblm')
-- ON CONFLICT (username) DO NOTHING;

