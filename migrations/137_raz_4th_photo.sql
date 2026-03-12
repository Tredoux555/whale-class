-- Migration 137: Add 4th photo slot to RAZ reading records
-- Flow: book → signature → new_book → new_book_signature
-- The new_book_signature captures proof that the parent signed for the new book

ALTER TABLE raz_reading_records
ADD COLUMN IF NOT EXISTS new_book_signature_photo_url TEXT;
