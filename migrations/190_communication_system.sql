-- migrations/190_communication_system.sql
-- Session 97 — Principal Communication System
--
-- Replaces the flat montree_messages model (kept for backward compat) with a
-- proper thread + message + group schema that supports:
--   - Per-child parent/teacher threads
--   - Broadcast threads (all teachers, all parents in school, classroom-scoped)
--   - Custom group threads (principal-defined, mixable teacher/parent/principal)
--   - Principal observer mode (full transparency on every parent thread)
--   - AI-drafted indicator (Tracy drafts, principal sends)
--
-- ARCHITECTURAL RULES baked into this schema (do NOT break in future migrations):
--   1. Every thread is school_id-scoped. Cross-school leakage impossible by FK.
--   2. Participants table tracks read state PER-PERSON via last_read_at, plus
--      can_reply (false = read-only observer) and is_observer (principal on
--      parent threads).
--   3. ai_drafted=true with approved_by_id captures Tracy → principal → send.
--      Audit trail is permanent.
--   4. Idempotent via IF NOT EXISTS. Re-runnable.
--
-- The legacy montree_messages table stays. Parent portal pages may still use
-- it during the transition; new principal Communication tab + new parent
-- thread surfaces use these tables.

BEGIN;

-- ── montree_message_threads ────────────────────────────────────────────────
-- The container. One row per conversation (1:1 DM, broadcast, or group).
CREATE TABLE IF NOT EXISTS montree_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Optional scope hooks. NULL when not applicable.
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,

  -- Type drives routing rules and UI presentation.
  --   parent_teacher    — DM between a parent and teacher(s) about a child
  --   parent_principal  — DM between principal and parent (rare, escalations)
  --   internal          — Teacher-teacher or principal-teacher DM/group
  --   broadcast         — Fan-out: all teachers, all parents (school or class)
  --   group             — Custom-defined group thread (principal-created)
  thread_type TEXT NOT NULL CHECK (thread_type IN (
    'parent_teacher', 'parent_principal', 'internal', 'broadcast', 'group'
  )),

  subject TEXT,
  group_id UUID,  -- nullable; populated when thread_type='group'

  -- Who created the thread (denormalised for audit trail; participants table
  -- is the source of truth for current membership).
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('teacher','principal','parent','system')),
  created_by_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_id UUID
);

CREATE INDEX IF NOT EXISTS idx_threads_school_recent
  ON montree_message_threads(school_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_classroom_recent
  ON montree_message_threads(classroom_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_child_recent
  ON montree_message_threads(child_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_group
  ON montree_message_threads(group_id);
CREATE INDEX IF NOT EXISTS idx_threads_type
  ON montree_message_threads(school_id, thread_type, last_message_at DESC);

-- ── montree_message_thread_participants ─────────────────────────────────
-- Who's in the thread + their read state and capabilities.
-- The principal is auto-added as is_observer=true, can_reply=false on every
-- parent_teacher thread for transparency. They can flip can_reply=true to
-- "insert" themselves into the conversation.
CREATE TABLE IF NOT EXISTS montree_message_thread_participants (
  thread_id UUID NOT NULL REFERENCES montree_message_threads(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('teacher','principal','parent')),
  participant_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  can_reply BOOLEAN NOT NULL DEFAULT TRUE,
  is_observer BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  -- Soft-leave: keeps audit trail without breaking historical message access.
  left_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, participant_role, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_lookup
  ON montree_message_thread_participants(participant_role, participant_id, joined_at DESC);

-- ── montree_thread_messages ─────────────────────────────────────────────
-- The actual message content. Linked to a thread.
CREATE TABLE IF NOT EXISTS montree_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES montree_message_threads(id) ON DELETE CASCADE,

  -- Sender identity (denormalised name for audit trail in case the user is
  -- removed later — we don't lose the historical record of who said what).
  sender_role TEXT NOT NULL CHECK (sender_role IN ('teacher','principal','parent','system')),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,

  body TEXT NOT NULL,
  body_locale TEXT,  -- ISO 639-1, optional. NULL = unknown / mixed.

  -- Optional media attachment. Single attachment per message; multiple = multiple messages.
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image','video','document','audio')),
  media_filename TEXT,

  -- AI provenance: was this drafted by Tracy and approved by the principal?
  ai_drafted BOOLEAN NOT NULL DEFAULT FALSE,
  ai_draft_source TEXT,  -- e.g. 'tracy.draft_parent_response'
  approved_by_id UUID,   -- the principal who hit Send (when ai_drafted=true)

  -- Threading within the thread (rare — most threads are linear).
  in_reply_to UUID REFERENCES montree_thread_messages(id) ON DELETE SET NULL,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread
  ON montree_thread_messages(thread_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_thread_messages_sender
  ON montree_thread_messages(sender_role, sender_id, sent_at DESC);

-- ── montree_message_groups ──────────────────────────────────────────────
-- Principal-defined custom groups (e.g. "Lead Teachers", "Mandarin parents").
-- Mixable: a group can contain teachers, parents, principal — any combo.
CREATE TABLE IF NOT EXISTS montree_message_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('principal','teacher')),
  created_by_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_groups_school
  ON montree_message_groups(school_id, created_at DESC)
  WHERE archived_at IS NULL;

-- ── montree_message_group_members ───────────────────────────────────────
-- Composite-key membership. member_role lets us mix teachers/parents/principal.
CREATE TABLE IF NOT EXISTS montree_message_group_members (
  group_id UUID NOT NULL REFERENCES montree_message_groups(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('teacher','principal','parent')),
  member_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by_id UUID,
  PRIMARY KEY (group_id, member_role, member_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_lookup
  ON montree_message_group_members(member_role, member_id);

-- ── Trigger: keep last_message_at fresh ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_thread_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE montree_message_threads
  SET last_message_at = NEW.sent_at
  WHERE id = NEW.thread_id
    AND (last_message_at IS NULL OR last_message_at < NEW.sent_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_thread_messages_bump_last_message_at ON montree_thread_messages;
CREATE TRIGGER trg_thread_messages_bump_last_message_at
  AFTER INSERT ON montree_thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message_at();

COMMIT;

-- ── Verification queries (run separately) ───────────────────────────────
-- SELECT count(*) FROM montree_message_threads;
-- SELECT count(*) FROM montree_message_thread_participants;
-- SELECT count(*) FROM montree_thread_messages;
-- SELECT count(*) FROM montree_message_groups;
-- SELECT count(*) FROM montree_message_group_members;
