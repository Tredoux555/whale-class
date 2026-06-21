-- =============================================================================
-- 266  COACH FAMILY MODEL — the one-way "captain" → loved-one's-coach context channel
-- Run in the MONTREE project (dmfncjjtsoxrnvcdnvjq) Supabase SQL Editor.
-- ADDITIVE + IDEMPOTENT — safe to re-run, alters/drops nothing existing.
-- =============================================================================
--
-- WHAT THIS ENABLES (Lyf Coach Family — Phase 1 + family scaffolding)
--   A family CAPTAIN (a parent) can feed *real-world observations* and *skills
--   to gently build* into a loved one's coach — a CHILD's coach, or a PARTNER's
--   (adult spouse) coach. This is a WRITE-ONLY context channel.
--
-- 🔒 THE SEAL (the load-bearing safety property — do NOT break it, for ANYONE)
--   The context channel (story_coach_context_notes) is ARCHITECTURALLY SEPARATE
--   from each person's SEALED conversation (story_coach_log / story_diary_entries
--   / story_coach_memory). A link grants WRITE-TO-CONTEXT only — NEVER
--   read-to-conversation. There is no column, table, or join here that lets the
--   captain read a single word a child OR a partner said to their coach. This
--   holds for the adult partner exactly as hard as for the child.
--
-- 🤝 CHILD vs PARTNER — the one behavioural difference (enforced in the coach
--   prompt, not here): a CHILD's coach uses context as quiet background (the
--   child-therapist model); a PARTNER's (adult) coach is TRANSPARENT about it —
--   it works WITH a loved one's note openly, in service of the partner, and
--   NEVER as covert correction, never taking the captain's side, never
--   overriding the partner's autonomy. link_kind records which it is.
--
-- WHAT THIS ADDS
--   1. story_admin_users.role — 'adult' (default) | 'parent' | 'child'.
--        Drives the child coach persona + safeguarding. Existing rows default to
--        'adult', so nothing changes until seeded/used.
--   2. story_coach_context_links — the write-permission graph:
--        (author_space → target_space, link_kind 'to_child' | 'to_partner').
--   3. story_coach_context_notes — the captain-authored notes, encrypted at rest.
--
-- WHY THIS IS SAFE
--   • role defaults 'adult' → every existing sanctuary is unaffected.
--   • New tables are RLS-enabled + FORCEd with NO policies (default-deny for
--     anon/authenticated); the app reads them ONLY via the service-role key.
--   • Seeds touch ONLY the known family spaces and only if they exist; no-op
--     otherwise. ON CONFLICT DO NOTHING throughout. Re-running changes nothing.
-- =============================================================================

BEGIN;

-- 1. Family role on each sanctuary login --------------------------------------
ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'adult';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_admin_users_role_check'
  ) THEN
    ALTER TABLE story_admin_users
      ADD CONSTRAINT story_admin_users_role_check
      CHECK (role IN ('adult', 'parent', 'child'));
  END IF;
END $$;

-- 2. The captain → loved-one write-permission graph ---------------------------
CREATE TABLE IF NOT EXISTS story_coach_context_links (
  author_space text NOT NULL,                          -- the captain feeding context
  target_space text NOT NULL,                          -- whose coach receives it
  link_kind    text NOT NULL DEFAULT 'to_child'
               CHECK (link_kind IN ('to_child', 'to_partner')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (author_space, target_space)
);
CREATE INDEX IF NOT EXISTS idx_coach_context_links_author ON story_coach_context_links (author_space);
CREATE INDEX IF NOT EXISTS idx_coach_context_links_target ON story_coach_context_links (target_space);

ALTER TABLE story_coach_context_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_context_links FORCE  ROW LEVEL SECURITY;

-- 3. The one-way context notes ------------------------------------------------
CREATE TABLE IF NOT EXISTS story_coach_context_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_space    text NOT NULL,                       -- the CAPTAIN's space
  target_space    text NOT NULL,                       -- whose coach receives it
  observation_enc text NOT NULL,                        -- AES-256-GCM 'gcm:iv:tag:ct'
  skill_tag       text,                                 -- optional, non-sensitive label
  cipher_version  int  NOT NULL DEFAULT 1,
  archived_at     timestamptz,                          -- soft-delete (captain removed it)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- The target's coach loads ACTIVE notes for its own space (the hot path).
CREATE INDEX IF NOT EXISTS idx_coach_context_target_active
  ON story_coach_context_notes (target_space, archived_at, created_at DESC);
-- The captain reads back the notes THEY authored for a given person.
CREATE INDEX IF NOT EXISTS idx_coach_context_author_target
  ON story_coach_context_notes (author_space, target_space, created_at DESC);

ALTER TABLE story_coach_context_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_context_notes FORCE  ROW LEVEL SECURITY;

-- 4. Seed Tredoux's own family (idempotent, only if the spaces exist) ----------
--    Tredoux is the captain. Bayan is his partner (adult); Riddick is the child.
--    Tredoux can feed context to BOTH coaches. Bayan (also a parent) can feed
--    the child's coach too.
UPDATE story_admin_users SET role = 'parent'
  WHERE space IN ('tredoux', 'bayan') AND role <> 'parent';
UPDATE story_admin_users SET role = 'child'
  WHERE space = 'riddick' AND role <> 'child';

-- captain → child  (tredoux → riddick, bayan → riddick)
INSERT INTO story_coach_context_links (author_space, target_space, link_kind)
SELECT a.space, c.space, 'to_child'
  FROM story_admin_users a
  CROSS JOIN story_admin_users c
 WHERE a.space IN ('tredoux', 'bayan') AND a.role = 'parent'
   AND c.space = 'riddick' AND c.role = 'child'
ON CONFLICT (author_space, target_space) DO NOTHING;

-- captain → partner  (tredoux → bayan)
INSERT INTO story_coach_context_links (author_space, target_space, link_kind)
SELECT a.space, p.space, 'to_partner'
  FROM story_admin_users a
  CROSS JOIN story_admin_users p
 WHERE a.space = 'tredoux'
   AND p.space = 'bayan'
ON CONFLICT (author_space, target_space) DO NOTHING;

COMMIT;

-- =============================================================================
-- DONE. Verify (optional):
--   SELECT space, role FROM story_admin_users ORDER BY role, space;
--   SELECT * FROM story_coach_context_links ORDER BY author_space, target_space;
--   -- expect: tredoux→riddick (to_child), bayan→riddick (to_child),
--   --         tredoux→bayan (to_partner); riddick role='child'.
--
-- ROLLBACK NOTE: only ADDs a column + two tables + seeds. Safe to leave in place.
-- =============================================================================
