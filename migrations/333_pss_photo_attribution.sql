-- =============================================================================
-- 333_pss_photo_attribution.sql — who took the photo
-- =============================================================================
-- v1.4 replaces the shared 6-character class-code teacher login with a
-- zero-friction name picker for the fixed 4-person team (Dana, Jenny,
-- Vanessa, Tredoux). Once a login carries a name, the photo it uploads can
-- carry one too — this migration is the one storage change that needs.
--
-- `uploaded_by` is free text, not a foreign key: the roster of names lives in
-- application code (lib/potato/auth.ts STAFF_NAMES), not in a table, because
-- four people is not a table's worth of problem. NULL for every photo
-- uploaded before this shipped, and for any photo uploaded through the old
-- code-door fallback, which has no notion of "who" — the upload route
-- feature-detects this column (tp_photos capability probe in lib/potato/db.ts)
-- so a deploy that lands before this migration is pasted keeps uploading
-- photos exactly as before, just without a name attached.
--
-- Additive and idempotent: safe to paste twice. No RLS change — tp_photos
-- keeps the same deny-all posture as every other tp_ table (see 318); every
-- read/write already goes through an /api/potato route that has verified a
-- potato_teacher cookie.
--
-- Next free number verified against the Mac on Aug 14, 2026: the repo's
-- highest migration is 332_cms_phase7_handshake.sql, so this is 333.
-- =============================================================================

BEGIN;

ALTER TABLE tp_photos ADD COLUMN IF NOT EXISTS uploaded_by text;

COMMENT ON COLUMN tp_photos.uploaded_by IS
  'Canonical staff first name from the name-picker login (Dana / Jenny / '
  'Vanessa / Tredoux), stamped at upload time. NULL for photos uploaded '
  'before v1.4 or through the old class-code login fallback.';

COMMIT;

-- =============================================================================
-- Verify (paste separately after the migration):
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'tp_photos' AND column_name = 'uploaded_by';
--   -- expect: uploaded_by | text | YES
-- =============================================================================
