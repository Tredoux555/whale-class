-- Migration 138: Work Ingestion — Smart Capture teaches the system new works
-- Adds reference photo + source tracking to classroom curriculum works

-- Add columns for Smart Capture ingestion
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS reference_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS prompt_used TEXT;

-- source values: 'standard' (from JSON seed), 'teacher_manual' (added via curriculum page),
--                'smart_capture' (ingested via Smart Capture flow)
-- reference_photo_url: Supabase storage URL of teacher's reference photo
-- prompt_used: teacher's original prompt for AI content generation
