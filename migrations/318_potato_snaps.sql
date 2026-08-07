-- =============================================================================
-- 318_potato_snaps.sql — Potato Snaps v1 schema
-- =============================================================================
-- Potato Snaps is a standalone product living on www.teacherpotato.xyz.
-- It shares this Supabase project but owns an entirely separate `tp_` namespace:
-- it NEVER reads or writes any montree_* table.
--
-- Product shape: a teacher photographs children through the week; when a child
-- reaches 8 photos in the current week the teacher taps "Make montage" and a
-- worker renders a little film for that child's parents.
--
-- SECURITY POSTURE
--   RLS is ENABLED on every table with NO policies at all. That is a deliberate
--   deny-all: anon and authenticated roles can do nothing, and the app reaches
--   these tables exclusively through the service-role key from server code.
--   Do NOT "fix" the missing policies by adding permissive ones.
--
-- IDEMPOTENT: safe to run more than once.
--
-- NOTE ON THE FILE NUMBER: the architecture contract said "verify 309 is the
-- next free number". It is not — 309_teachers_room.sql already exists and the
-- highest migration in the repo is 317_montree_org_director_logins.sql. This is
-- therefore 318.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------- tp_classes
-- One row per classroom using the product. `login_code` is the 6-char code the
-- teacher types to sign in; `tz` is the classroom's IANA timezone and is the
-- ONLY authority on where a "week" starts. Week boundaries are computed in this
-- timezone, never from the server's UTC clock (the UTC+8 Sunday trap).
CREATE TABLE IF NOT EXISTS tp_classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  login_code  TEXT UNIQUE NOT NULL,
  tz          TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Re-run safety for a database that got an earlier draft of this table.
ALTER TABLE tp_classes ADD COLUMN IF NOT EXISTS tz TEXT NOT NULL DEFAULT 'Asia/Shanghai';

-- --------------------------------------------------------------- tp_children
-- `photo_path` is a storage path inside the private `potato-snaps` bucket
-- (never a URL) — the app always serves it through /api/potato/media/proxy.
CREATE TABLE IF NOT EXISTS tp_children (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES tp_classes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  photo_path  TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tp_children_class ON tp_children (class_id, sort_order);

-- ----------------------------------------------------------------- tp_photos
-- `captured_at` is the instant the shot was taken. Every week query is a
-- half-open range over this column: [monday 00:00 in class tz, +7 days).
CREATE TABLE IF NOT EXISTS tp_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES tp_classes(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  captured_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tp_photos_class_captured ON tp_photos (class_id, captured_at);

-- --------------------------------------------------------- tp_photo_children
-- The tagging junction. A single photo counts for EVERY child tagged on it —
-- that is the WYSIWYG count rule the board and the montage share.
CREATE TABLE IF NOT EXISTS tp_photo_children (
  photo_id  UUID NOT NULL REFERENCES tp_photos(id) ON DELETE CASCADE,
  child_id  UUID NOT NULL REFERENCES tp_children(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_tp_photo_children_child ON tp_photo_children (child_id);

-- ----------------------------------------------------------- tp_parent_codes
-- One 6-char code per child. A parent types it once and stays signed in.
--
-- The UNIQUE on child_id is load-bearing: it makes "one code per child" a
-- database fact rather than an application hope, so two teachers tapping
-- "make a code" at the same moment can never hand out two live codes for the
-- same child (the loser gets 23505 and reads back the winner's row).
CREATE TABLE IF NOT EXISTS tp_parent_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES tp_classes(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL UNIQUE REFERENCES tp_children(id) ON DELETE CASCADE,
  code          TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tp_parent_codes_class ON tp_parent_codes (class_id);

-- ----------------------------------------------------------- tp_montage_jobs
-- The render queue AND the ledger. Every row is one deliberate teacher tap.
-- `media_ids` is derived SERVER-side from the child's photos for that week —
-- a client may never supply it.
CREATE TABLE IF NOT EXISTS tp_montage_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL,
  child_id      UUID NOT NULL REFERENCES tp_children(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  media_ids     UUID[] NOT NULL,
  storage_path  TEXT,
  error         TEXT,
  attempt       INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tp_montage_jobs_queue ON tp_montage_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_tp_montage_jobs_child_week ON tp_montage_jobs (child_id, week_start);

-- ------------------------------------------------------------------ lockdown
-- RLS on, zero policies = nobody but the service role gets in.
ALTER TABLE tp_classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_children       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_photo_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_parent_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_montage_jobs   ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------- bucket
-- Private. Children's faces and classroom photos never sit on a public URL;
-- everything is streamed through /api/potato/media/proxy, which checks the
-- caller's cookie against the class in the path before it fetches a byte.
INSERT INTO storage.buckets (id, name, public)
VALUES ('potato-snaps', 'potato-snaps', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- Verify (optional — paste separately after the migration):
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name LIKE 'tp\_%' ORDER BY table_name;
--   -- expect 6 rows: tp_children, tp_classes, tp_montage_jobs,
--   --               tp_parent_codes, tp_photo_children, tp_photos
--   SELECT id, public FROM storage.buckets WHERE id = 'potato-snaps';
--   -- expect: potato-snaps | false
-- =============================================================================
