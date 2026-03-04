-- Migration 137: Enhance RAZ Reading Tracker
-- Created: 2026-03-04
-- Purpose: Add 3rd photo (new book) and "absent" status to RAZ tracker

-- Add new_book_photo_url column
ALTER TABLE raz_reading_records
ADD COLUMN IF NOT EXISTS new_book_photo_url TEXT;

-- Update status CHECK constraint to include 'absent'
ALTER TABLE raz_reading_records
DROP CONSTRAINT IF EXISTS raz_reading_records_status_check;

ALTER TABLE raz_reading_records
ADD CONSTRAINT raz_reading_records_status_check
CHECK (status IN ('read', 'not_read', 'no_folder', 'absent'));

-- Create index for absent status queries
CREATE INDEX IF NOT EXISTS idx_raz_status_absent ON raz_reading_records(classroom_id, record_date) WHERE status = 'absent';
