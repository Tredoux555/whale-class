-- Migration: 060_parent_descriptions.sql
-- Date: 2026-01-23
-- Purpose: Add parent-facing description columns for Whale reports

-- ============================================
-- PART 1: ADD COLUMNS TO SCHOOL CURRICULUM WORKS
-- ============================================

ALTER TABLE montree_school_curriculum_works 
ADD COLUMN IF NOT EXISTS parent_description TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS home_connection TEXT;

-- ============================================
-- PART 2: ADD COLUMNS TO CLASSROOM CURRICULUM WORKS
-- ============================================

ALTER TABLE montree_classroom_curriculum_works 
ADD COLUMN IF NOT EXISTS parent_description TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS home_connection TEXT;

-- ============================================
-- DONE: Three new columns added to both tables
-- ============================================
-- parent_description: 30-word max friendly explanation
-- why_it_matters: 15-word max "why this matters"
-- home_connection: 15-word max home activity suggestion
