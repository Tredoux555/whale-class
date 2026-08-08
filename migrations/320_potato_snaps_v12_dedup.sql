-- =============================================================================
-- 320_potato_snaps_v12_dedup.sql — close the offline-queue duplicate-row race
-- =============================================================================
-- AUDIT FINDING (v1.2 pre-ship, HIGH): the offline upload route
-- (app/api/potato/photos/upload/route.ts) makes a retry idempotent by
-- deriving the storage object name from the client's clientId, then doing a
-- SELECT-for-existing-row before INSERT. That check-then-insert has no atomic
-- guard in the database: two concurrent requests for the same clientId (the
-- client-side race this migration's sibling fix narrows, but does not by
-- itself eliminate — e.g. two tabs/devices sharing one class login, or a
-- retry storm on flaky classroom wifi) can both pass the SELECT before either
-- has inserted, producing TWO tp_photos rows pointing at the same physical
-- photo. Because a photo counts toward a child's weekly total for every row
-- tagging them (see tp_photo_children), this silently double-counts a photo
-- toward the 8-photo threshold and can duplicate it in the rendered film —
-- exactly the WYSIWYG corruption v1.2's capturedAt work was written to avoid.
--
-- FIX: a real uniqueness constraint, enforced by Postgres rather than
-- application code. storage_path already embeds class_id
-- (class/<classId>/photos/...), so a global unique index is sufficient and
-- keeps the index single-column. The upload route now inserts optimistically
-- and, on a 23505 unique-violation, reads back the row that won the race and
-- returns it as a duplicate — the exact pattern already used for
-- tp_parent_codes' child_id UNIQUE constraint (migration 318) and
-- app/api/potato/parent-codes/route.ts's own 23505 handling.
--
-- IDEMPOTENT: safe to run more than once.
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_photos_storage_path ON tp_photos (storage_path);

COMMIT;
