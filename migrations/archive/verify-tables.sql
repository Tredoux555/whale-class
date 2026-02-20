-- Quick verification query to check if all tables exist
-- Run this in Supabase SQL Editor to verify

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('children', 'activities', 'daily_activity_assignments', 'child_progress', 
                       'skill_categories', 'skills', 'activity_log', 'activity_favorites', 
                       'activity_photos', 'activity_themes') 
    THEN '✅ Required'
    ELSE 'ℹ️ Other'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('children', 'activities', 'daily_activity_assignments', 'child_progress', 
                     'skill_categories', 'skills', 'activity_log', 'activity_favorites', 
                     'activity_photos', 'activity_themes')
ORDER BY table_name;
