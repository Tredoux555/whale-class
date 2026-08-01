-- 310_creator_dm.sql
-- "Message the creator" — sender metadata for the Teachers' Room direct line
-- to Tredoux (/montree/library/satpin → staff room → Message the creator).
-- =========================================================================
-- The MESSAGES themselves do NOT live here. They go into the existing
-- montree_dm pipe (conversation_id / sender_type / sender_name / message /
-- is_read), which is what the super-admin inbox and its unread badge already
-- read. Reusing that pipe is the whole design: a teacher who cannot get into
-- the app lands in the same place as every other conversation Tredoux has,
-- with no second notification path to forget to check.
--
-- What montree_dm cannot hold is WHO wrote — it has a free-text sender_name
-- and no email column, and anonymous senders are the entire point of this
-- feature (the people who most need to reach the creator are the ones locked
-- out of an account). This table is that one missing sidecar, keyed by the
-- same conversation_id:
--
--   community-<community_user_id>      signed-in Teachers'-Room account
--   community-anon-<32 hex chars>      anonymous sender, id minted SERVER-side
--
-- 🚨 The anon id is generated server-side (crypto.randomBytes) and echoed to
-- the browser, which keeps it in localStorage so the sender can come back and
-- read the reply. It is NOT authentication and grants nothing but that one
-- thread; the route refuses any client-supplied id that does not match the
-- anon shape AND already exist in this table, so nobody can mint an id that
-- collides with a signed-in conversation.
--
-- 🚨 DEPENDS ON MIGRATION 309 (montree_community_users). If 309 has not run,
-- this migration fails cleanly on the foreign key and changes nothing — the
-- migrations are applied in order, so that is the expected, harmless outcome
-- of running them out of sequence.
--
-- user_id is ON DELETE SET NULL, not CASCADE: if a Teachers'-Room account is
-- ever removed, the conversation must survive as an anonymous one. The
-- messages in montree_dm outlive the account either way, and a thread whose
-- sender card silently vanished would read as data loss in the inbox.
--
-- RLS: enabled with NO policies (deny-all), matching 309 and the rest of the
-- app — every read and write goes through the server on the service-role key.
-- Do NOT add permissive policies: this table holds email addresses and the
-- anon key ships in the browser bundle.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS montree_community_dm_meta;
--   The public route and the Creator inbox tab are both 42P01-safe, so
--   dropping this degrades the feature to a "being set up" line. The already
--   delivered messages stay readable in montree_dm.
--
-- Idempotent. Safe to re-run.
-- =========================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_community_dm_meta (
  -- Matches montree_dm.conversation_id exactly. TEXT, not UUID: it carries
  -- the 'community-' / 'community-anon-' prefix that tells the inbox which
  -- conversations belong to this feature.
  conversation_id TEXT PRIMARY KEY,
  -- NULL for anonymous senders (the common case).
  user_id         UUID REFERENCES montree_community_users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  -- Optional on purpose: someone locked out of their account should be able
  -- to shout without typing an address first. No address simply means the
  -- reply is only readable back in the modal.
  email           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Refreshed on every send so the inbox can sort by real activity without
  -- touching montree_dm.
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- The inbox's only ordering. Newest conversation first.
CREATE INDEX IF NOT EXISTS idx_community_dm_meta_activity
  ON montree_community_dm_meta (last_message_at DESC);

ALTER TABLE montree_community_dm_meta ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_community_dm_meta IS
  'Sender card for Teachers Room -> creator direct messages. The messages live in montree_dm; this holds the name/email/account link that montree_dm has no column for.';

COMMENT ON COLUMN montree_community_dm_meta.conversation_id IS
  'community-<community_user_id> for signed-in senders, community-anon-<32 hex> for anonymous ones. Same value as montree_dm.conversation_id.';

COMMENT ON COLUMN montree_community_dm_meta.email IS
  'Optional. Present only when the sender chose to leave one so Tredoux can reply outside the app.';

COMMIT;
