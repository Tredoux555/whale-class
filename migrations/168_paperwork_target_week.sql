-- Migration 168: Add paperwork_target_week to classrooms
-- Allows teachers to override the auto-calculated target week
ALTER TABLE montree_classrooms ADD COLUMN IF NOT EXISTS paperwork_target_week INTEGER;
