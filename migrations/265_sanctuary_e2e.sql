-- =============================================================================
-- 265  SANCTUARY E2E — native, device-encrypted spaces (ADDITIVE + IDEMPOTENT)
-- Run in the MONTREE project (dmfncjjtsoxrnvcdnvjq) Supabase SQL Editor.
-- =============================================================================
--
-- Adds the storage needed for the native Sanctuary's end-to-end encryption,
-- WITHOUT touching the existing (non-e2e) web sanctuaries (Tredoux/Bayan/
-- Riddick) or any existing row.
--
-- Spec: docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md §3 + §4.
--
-- WHAT THIS ADDS
--   1. story_admin_users: per-person e2e auth material.
--        e2e           — FALSE for every existing user (they keep bcrypt login).
--        kdf_salt      — base64(16 bytes). NOT secret. Sent to the client so it
--                        can re-derive the Argon2id master key. NULL for non-e2e.
--        auth_verifier — base64(crypto_generichash(authSecret)). The ONLY auth
--                        material stored for an e2e user. The server never sees
--                        the password or the content key. NULL for non-e2e.
--   2. A nullable `ciphertext` column on each e2e content table. An e2e row
--        stores its ENTIRE semantic payload (title, body, mood, the dates she
--        writes, coach text, …) inside one opaque `sb1.<b64nonce>.<b64ct>` blob
--        — see lib/sanctuary-e2e/crypto.ts. The server stores/returns it
--        verbatim and NEVER decrypts it.
--   3. Relaxes NOT NULL on the *semantic* columns that have no usable default,
--        so an e2e row can be inserted as just { space, ciphertext } with those
--        columns left NULL. The only plaintext metadata on an e2e row is the
--        honest minimum: id, space, created_at (+ harmless constant defaults
--        like cipher_version / status).
--
-- WHY THIS IS SAFE (DATA-SAFETY INVARIANTS §4)
--   • `e2e` defaults FALSE → every existing user stays on the bcrypt path; the
--     web sanctuaries are byte-for-byte unaffected.
--   • Every change is ADD COLUMN IF NOT EXISTS or ALTER COLUMN ... DROP NOT NULL.
--     No row is read, rewritten, or deleted. Relaxing NOT NULL never breaks a
--     row that already has a value.
--   • Idempotent: re-running is a no-op (IF NOT EXISTS; DROP NOT NULL on an
--     already-nullable column does nothing).
--   • RLS is unchanged. These tables are already RLS-enabled with no policies
--     (default-deny for anon/authenticated; the app reads them ONLY via the
--     service-role key, which bypasses RLS). New columns inherit that posture.
--   • The media vault is NOT touched here — it keeps its space='tredoux' gate.
-- =============================================================================

BEGIN;

-- 1. story_admin_users — e2e auth material ------------------------------------
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS e2e           boolean NOT NULL DEFAULT false;
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS kdf_salt      text;
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS auth_verifier text;

-- 2. ciphertext column on each e2e content table ------------------------------
--    Nullable. Holds the opaque sb1.<b64nonce>.<b64ct> blob for e2e rows;
--    stays NULL on legacy (gcm:) rows. Self-describing: a non-NULL ciphertext
--    marks a row as e2e, so a space that later converts can hold both kinds.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'story_diary_entries',
    'story_projects',
    'story_coach_memory',
    'story_plan_events',
    'story_plan_days',
    'story_coach_log'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS ciphertext text;', t);
  END LOOP;
END $$;

-- 3. Relax NOT NULL on the semantic, default-less columns ----------------------
--    So an e2e row can be inserted as { space, ciphertext } with these NULL.
--    Existing rows are unaffected (they already hold values). Columns that have
--    a usable default (cipher_version, status, is_active) are intentionally NOT
--    relaxed — an omitted-on-insert default leaks nothing and keeps the schema
--    tight for the legacy path.
ALTER TABLE story_diary_entries  ALTER COLUMN entry_date   DROP NOT NULL;
ALTER TABLE story_diary_entries  ALTER COLUMN body_enc     DROP NOT NULL;
ALTER TABLE story_projects       ALTER COLUMN title_enc    DROP NOT NULL;
ALTER TABLE story_coach_memory   ALTER COLUMN memory_type  DROP NOT NULL;
ALTER TABLE story_coach_memory   ALTER COLUMN content_enc  DROP NOT NULL;
ALTER TABLE story_plan_events    ALTER COLUMN event_date   DROP NOT NULL;
ALTER TABLE story_plan_events    ALTER COLUMN title_enc    DROP NOT NULL;
ALTER TABLE story_plan_days      ALTER COLUMN plan_date    DROP NOT NULL;
ALTER TABLE story_plan_days      ALTER COLUMN plan_enc     DROP NOT NULL;
ALTER TABLE story_coach_log      ALTER COLUMN question_enc DROP NOT NULL;

COMMIT;

-- =============================================================================
-- DONE. Verify (optional):
--   SELECT column_name, is_nullable, data_type
--     FROM information_schema.columns
--    WHERE table_name = 'story_admin_users'
--      AND column_name IN ('e2e','kdf_salt','auth_verifier');
--   -- expect: e2e boolean NO; kdf_salt text YES; auth_verifier text YES
--
-- ROLLBACK NOTE: this migration only ADDS columns + relaxes NOT NULL. It is safe
-- to leave in place even if the native app is never shipped. To fully reverse
-- (not required): the columns can be dropped and the NOT NULLs re-added ONLY if
-- no e2e rows exist.
-- =============================================================================
