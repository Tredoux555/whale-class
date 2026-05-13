-- Migration 204 — Agent ↔ Super-admin threaded messaging
--
-- Phase 4 of agent system fix plan. Extends montree_message_threads + sibling
-- tables to allow a new thread type 'agent_super_admin' where the participants
-- are an agent + Tredoux (super-admin). Builds on migration 197 which already
-- added 'agent' as a participant_role / sender_role / created_by_role.
--
-- WHY EXTEND, NOT FORK:
--   Agents already use montree_message_threads via the agent_principal type
--   (Session 104). Reusing the same tables means Mira can natively scan/draft
--   across both surfaces with the same tool surface, and Tracy on super-admin
--   side can do the same. No parallel legacy DM rail.
--
-- NULLABLE school_id FOR agent_super_admin THREADS:
--   Existing threads (parent_teacher, parent_principal, internal, broadcast,
--   group, agent_principal) are ALL school-scoped — school_id is the cross-
--   pollination boundary. agent_super_admin threads break that mental model:
--   an agent without any referred schools should still be able to ping Tredoux
--   ("I'm having trouble with X"). We drop NOT NULL on school_id and re-add it
--   as a CHECK constraint that ONLY agent_super_admin threads may have a NULL
--   school_id. Every other type stays mandatory-school-scoped.
--
-- SUPER-ADMIN PARTICIPANT IDENTITY:
--   There's no user row for Tredoux-as-super-admin. We use a sentinel UUID:
--     SUPER_ADMIN_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000'
--   This appears in participant_id and sender_id for super-admin rows. The
--   participant_role / sender_role discriminator ('super_admin') is the canonical
--   source of identity; the UUID is just an FK-shape filler.
--
-- IDEMPOTENT — IF NOT EXISTS / DROP IF EXISTS. Re-runnable.

BEGIN;

-- ── 1. Drop NOT NULL on montree_message_threads.school_id ──────────────────
ALTER TABLE montree_message_threads
  ALTER COLUMN school_id DROP NOT NULL;

-- Gated CHECK: school_id can be NULL ONLY for agent_super_admin threads.
-- Every other thread type continues to require a school.
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_school_id_gated_check;
ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_school_id_gated_check
  CHECK (
    school_id IS NOT NULL
    OR thread_type = 'agent_super_admin'
  );

-- ── 2. thread_type CHECK — add 'agent_super_admin' (preserve 197's values) ──
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_thread_type_check;

ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_thread_type_check
  CHECK (thread_type IN (
    'parent_teacher', 'parent_principal', 'internal', 'broadcast', 'group',
    'agent_principal', 'agent_super_admin'
  ));

-- ── 3. created_by_role CHECK — add 'super_admin' ──────────────────────────
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_created_by_role_check;

ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_created_by_role_check
  CHECK (created_by_role IN (
    'teacher', 'principal', 'parent', 'system', 'agent', 'super_admin'
  ));

-- ── 4. participant_role CHECK — add 'super_admin' ─────────────────────────
ALTER TABLE montree_message_thread_participants
  DROP CONSTRAINT IF EXISTS montree_message_thread_participants_participant_role_check;

ALTER TABLE montree_message_thread_participants
  ADD CONSTRAINT montree_message_thread_participants_participant_role_check
  CHECK (participant_role IN (
    'teacher', 'principal', 'parent', 'agent', 'super_admin'
  ));

-- ── 5. sender_role CHECK — add 'super_admin' ──────────────────────────────
ALTER TABLE montree_thread_messages
  DROP CONSTRAINT IF EXISTS montree_thread_messages_sender_role_check;

ALTER TABLE montree_thread_messages
  ADD CONSTRAINT montree_thread_messages_sender_role_check
  CHECK (sender_role IN (
    'teacher', 'principal', 'parent', 'system', 'agent', 'super_admin'
  ));

-- ── 6. Index for fast super-admin inbox queries ────────────────────────────
-- Tredoux's inbox: every agent_super_admin thread across all agents, newest
-- last_message_at first. Partial index for size.
CREATE INDEX IF NOT EXISTS idx_threads_agent_super_admin_inbox
  ON montree_message_threads(last_message_at DESC)
  WHERE thread_type = 'agent_super_admin' AND archived_at IS NULL;

COMMIT;

-- ── Verification queries (run manually) ────────────────────────────────────
-- SELECT thread_type, count(*) FROM montree_message_threads GROUP BY thread_type;
-- SELECT participant_role, count(*) FROM montree_message_thread_participants GROUP BY participant_role;
