-- 309_teachers_room.sql
-- Teachers' Room — public community board + shared-materials drop box on the
-- SATPIN library page (/montree/library/satpin).
-- =========================================================================
-- This is the FIRST surface in Montree with its own self-serve account
-- system. It is deliberately SEPARATE from montree_teachers / montree_parents:
--
--   * A Teachers'-Room account belongs to NO school, NO classroom and NO
--     tenant. It can read nothing of any school's data. It exists only to
--     sign a message on a public board and to attach a file to a public
--     bucket. That isolation is the whole point — the library page is a
--     public resource, and letting a stranger create a montree_teachers row
--     would put an unvetted account inside the multi-tenant perimeter.
--   * Its JWT is signed with the same secret as the teacher/principal token
--     but carries aud='montree-community' and lives in its OWN cookie
--     (montree_community), so the two token families can never be swapped.
--
-- READING the board and DOWNLOADING materials is anonymous. POSTING and
-- UPLOADING require a CONFIRMED email — that is the only spam gate besides
-- the per-IP rate limits on every route.
--
-- RLS: enabled with NO policies on all three tables (deny-all). Every read
-- and write goes through the server on the service-role key, exactly as the
-- rest of the app does. Do NOT add permissive policies here — the anon key
-- ships in the browser bundle, and these tables hold email addresses and
-- password hashes.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS montree_community_material_download(uuid);
--   DROP TABLE IF EXISTS montree_community_materials;
--   DROP TABLE IF EXISTS montree_community_posts;
--   DROP TABLE IF EXISTS montree_community_users;
--   -- and, if you also want the files gone:
--   -- DELETE FROM storage.buckets WHERE id = 'community-materials';
--   Every API route is 42P01-safe, so dropping these tables degrades the
--   Teachers' Room to a single "being set up" line and breaks nothing else
--   on the page.
--
-- Idempotent. Safe to re-run.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- Accounts
-- -------------------------------------------------------------------------
-- email is ALWAYS stored lowercase (the routes lowercase before every write
-- and every lookup) so the UNIQUE constraint is a real case-insensitive
-- identity and not a way to register the same mailbox twice.
CREATE TABLE IF NOT EXISTS montree_community_users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  display_name       TEXT NOT NULL,
  -- NULL until the emailed confirmation link is followed. Unconfirmed
  -- accounts can log in nowhere and post nothing.
  email_confirmed_at TIMESTAMPTZ,
  confirm_token      TEXT,
  confirm_sent_at    TIMESTAMPTZ,
  reset_token        TEXT,
  reset_expires_at   TIMESTAMPTZ,
  is_banned          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at      TIMESTAMPTZ
);

-- Token lookups are the hot path on confirm/reset; both are partial so the
-- index only carries live tokens.
CREATE INDEX IF NOT EXISTS idx_community_users_confirm_token
  ON montree_community_users (confirm_token)
  WHERE confirm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_users_reset_token
  ON montree_community_users (reset_token)
  WHERE reset_token IS NOT NULL;

COMMENT ON TABLE montree_community_users IS
  'Teachers Room accounts (public SATPIN library board). Tenant-less by design: no school_id, no classroom_id, no access to any school data.';

-- -------------------------------------------------------------------------
-- Discussion board
-- -------------------------------------------------------------------------
-- Soft delete only: deleted_at is set, the row stays. Keeps thread history
-- coherent and leaves an audit trail if a post has to be looked at later.
CREATE TABLE IF NOT EXISTS montree_community_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES montree_community_users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_posts_live
  ON montree_community_posts (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_user
  ON montree_community_posts (user_id);

COMMENT ON TABLE montree_community_posts IS
  'Teachers Room messages. Public read, confirmed-account write, author-only soft delete.';

-- -------------------------------------------------------------------------
-- Shared materials (drop box)
-- -------------------------------------------------------------------------
-- storage_path is UNIQUE so a retry can never register the same object twice.
-- public_url is stored rather than derived so the row still resolves if the
-- bucket's public URL shape ever changes underneath us.
CREATE TABLE IF NOT EXISTS montree_community_materials (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES montree_community_users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description    TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  filename       TEXT NOT NULL,
  storage_path   TEXT NOT NULL UNIQUE,
  public_url     TEXT NOT NULL,
  file_size      BIGINT,
  mime_type      TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_materials_live
  ON montree_community_materials (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_materials_user
  ON montree_community_materials (user_id);

COMMENT ON TABLE montree_community_materials IS
  'Teachers Room shared files. Public read/download, confirmed-account upload, author-only soft delete.';

-- -------------------------------------------------------------------------
-- RLS: deny-all (house posture — server uses the service role)
-- -------------------------------------------------------------------------
ALTER TABLE montree_community_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_community_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_community_materials ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Storage bucket for the drop box (public read — that's the product)
-- -------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-materials', 'community-materials', true)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- Atomic download counter
-- -------------------------------------------------------------------------
-- A read-modify-write from the route would lose counts under concurrency and
-- would need a second round trip. SECURITY DEFINER with a pinned search_path,
-- execute revoked from anon/authenticated per migration 276's posture — only
-- the service role (i.e. our own server) may call it.
CREATE OR REPLACE FUNCTION montree_community_material_download(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE montree_community_materials
     SET download_count = download_count + 1
   WHERE id = p_id
     AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION montree_community_material_download(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION montree_community_material_download(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION montree_community_material_download(UUID) TO service_role;

COMMENT ON FUNCTION montree_community_material_download(UUID) IS
  'Atomically increments a Teachers Room material download_count. Service-role only.';

COMMIT;
