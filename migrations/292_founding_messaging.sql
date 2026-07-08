-- Migration 292 — Founding school ↔ Super-admin threaded messaging
--
-- Founding-member school principals get a "Message Tredoux" channel inside
-- their admin cockpit. Tredoux sees/replies from the super-admin Founding 100
-- tab. This REUSES the existing messaging tables (montree_message_threads /
-- montree_message_thread_participants / montree_thread_messages) exactly like
-- the agent ↔ super-admin surface (migration 204) — no parallel DM rail.
--
-- WHY ONLY ONE CHECK CHANGES:
--   Migration 204 already widened created_by_role, participant_role and
--   sender_role to include 'principal' AND 'super_admin' (they're in the base
--   190 set for 'principal', and 204 added 'super_admin'). The ONLY constraint
--   that still rejects a principal↔super-admin thread is the thread_type CHECK.
--   We drop-and-recreate it, PRESERVING every existing value (incl.
--   agent_super_admin from 204) and adding 'principal_super_admin'.
--
-- SCHOOL_ID STAYS POPULATED:
--   Unlike agent_super_admin threads (which may have NULL school_id — an agent
--   without referred schools can still ping Tredoux), a founding thread is
--   ALWAYS the principal's own school. school_id is populated, so the gated
--   NULL-school CHECK from migration 204
--     (school_id IS NOT NULL OR thread_type = 'agent_super_admin')
--   is satisfied and left UNTOUCHED here.
--
-- SUPER-ADMIN PARTICIPANT IDENTITY:
--   Same sentinel as 204 — participant_id / sender_id =
--     '00000000-0000-0000-0000-000000000000'
--   with participant_role / sender_role = 'super_admin' as the canonical
--   identity discriminator.
--
-- IDEMPOTENT — DROP IF EXISTS / IF NOT EXISTS. Re-runnable.

BEGIN;

-- ── thread_type CHECK — add 'principal_super_admin' (preserve 204's values) ──
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_thread_type_check;

ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_thread_type_check
  CHECK (thread_type IN (
    'parent_teacher', 'parent_principal', 'internal', 'broadcast', 'group',
    'agent_principal', 'agent_super_admin', 'principal_super_admin'
  ));

-- ── Index for fast super-admin founding inbox queries ──────────────────────
-- Tredoux's founding inbox: every principal_super_admin thread across all
-- founding schools, newest last_message_at first. Partial index for size,
-- mirroring migration 204's idx_threads_agent_super_admin_inbox style.
CREATE INDEX IF NOT EXISTS idx_threads_principal_super_admin_inbox
  ON montree_message_threads(thread_type, last_message_at DESC)
  WHERE thread_type = 'principal_super_admin';

COMMIT;

-- ── Verification queries (run manually) ────────────────────────────────────
-- SELECT thread_type, count(*) FROM montree_message_threads GROUP BY thread_type;
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'montree_message_threads_thread_type_check';
