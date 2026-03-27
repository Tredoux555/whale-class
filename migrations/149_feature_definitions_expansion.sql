-- Migration 149: Expand Feature Definitions
-- Created: 2026-03-27
-- Purpose: Add ~20 new feature definitions for all school-gateable features
-- Safe: ON CONFLICT DO UPDATE SET updates name/description/icon for existing rows

INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  -- AI Tools (premium)
  ('smart_capture', 'Smart Capture', 'AI-powered photo identification of Montessori materials. Photos are automatically tagged with work names and areas.', '📷', 'ai_tools', true, false),
  ('classroom_setup_ai', 'Classroom Setup AI', 'Teach the AI to recognize your specific classroom materials. Per-classroom visual learning.', '🧠', 'ai_tools', true, false),
  ('guru_advisor', 'Guru AI Advisor', 'AI teaching assistant for curriculum guidance, child development questions, and classroom planning.', '🧙', 'ai_tools', true, false),
  ('tts_voice', 'Text-to-Speech Voice', 'AI voice that reads Guru responses aloud. Uses OpenAI TTS.', '🔊', 'ai_tools', true, false),

  -- Classroom Management
  ('weekly_admin_docs', 'Weekly Admin Documents', 'Auto-generate weekly summary and plan documents for school administration records.', '📄', 'management', false, false),
  ('teacher_notes', 'Teacher Notes', 'Classroom-level notes with voice recording and transcription support.', '📝', 'management', false, true),
  ('multi_teacher_mgmt', 'Multi-Teacher Management', 'Multiple teachers per classroom with individual login codes.', '👥', 'management', false, true),
  ('class_events', 'Class Events', 'Create custom events and tag children for attendance tracking.', '🎪', 'management', false, true),
  ('bulk_student_import', 'Bulk Student Import', 'Paste-based bulk import of student names and birthdays.', '📋', 'management', false, true),

  -- Photo & Media
  ('photo_audit', 'Photo Audit', 'Review and correct AI photo identifications. Multi-child tagging support.', '🔍', 'media', false, true),
  ('multi_child_tagging', 'Multi-Child Photo Tagging', 'Tag multiple children in a single group photo.', '👶', 'media', false, true),
  ('photo_crop', 'Photo Crop', 'Manual photo cropping from the gallery view.', '✂️', 'media', false, true),

  -- Reports & Communication
  ('parent_reports', 'Parent Reports', 'Generate and send weekly progress reports to parents.', '📊', 'reporting', false, true),
  ('batch_reports', 'Batch Reports', 'Generate reports for all children at once with one click.', '📦', 'reporting', false, true),

  -- Library & Tools
  ('phonics_tools', 'Phonics Tools', 'Phonics generators: bingo, three-part cards, stories, command cards, sentence cards, labels, dictionary.', '🔤', 'learning', false, true),
  ('curriculum_browser', 'Curriculum Browser', 'Browse the full Montessori curriculum with guides and videos.', '📚', 'learning', false, true),
  ('community_library', 'Community Library', 'Access the shared community works library.', '🌐', 'learning', false, true),
  ('picture_bank', 'Picture Bank', 'Browse and select from 355+ phonics images for bingo and activities.', '🖼️', 'learning', false, true),
  ('english_corner', 'English Corner', 'ESL and English language learning resources and activities.', '🇬🇧', 'learning', false, true),
  ('educational_games', 'Educational Games', 'Access to Montessori-aligned digital games.', '🎮', 'learning', false, true)

ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium;
  -- Note: default_enabled NOT updated on conflict (preserves manual overrides)
