-- Migration 197 — Agent → Principal messaging support.
--
-- Adds 'agent' as a valid sender / participant role and 'agent_principal' as
-- a valid thread type. Idempotent. The four CHECK constraints in migration 190
-- block the new values; we drop and re-add each constraint with the wider
-- allowed set.
--
-- 🚨 Architectural note: the agent referral system stores agents in
-- montree_teachers with is_agent=true. For messaging, we treat 'agent' as a
-- distinct participant role separate from 'teacher' so the cross-pollination
-- contract stays clean (agents don't appear in classroom_teachers broadcasts,
-- etc.) and the UI can distinguish "agent message" from "teacher message".
--
-- Schools the agent founded are looked up via
-- montree_schools.founding_teacher_id = agent.userId — same filter pattern as
-- every other agent endpoint.

-- 1. montree_message_threads.thread_type — add 'agent_principal'
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_thread_type_check;

ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_thread_type_check
  CHECK (thread_type IN (
    'parent_teacher', 'parent_principal', 'internal', 'broadcast', 'group',
    'agent_principal'
  ));

-- 2. montree_message_threads.created_by_role — add 'agent'
ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_created_by_role_check;

ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_created_by_role_check
  CHECK (created_by_role IN ('teacher','principal','parent','system','agent'));

-- 3. montree_message_thread_participants.participant_role — add 'agent'
ALTER TABLE montree_message_thread_participants
  DROP CONSTRAINT IF EXISTS montree_message_thread_participants_participant_role_check;

ALTER TABLE montree_message_thread_participants
  ADD CONSTRAINT montree_message_thread_participants_participant_role_check
  CHECK (participant_role IN ('teacher','principal','parent','agent'));

-- 4. montree_thread_messages.sender_role — add 'agent'
ALTER TABLE montree_thread_messages
  DROP CONSTRAINT IF EXISTS montree_thread_messages_sender_role_check;

ALTER TABLE montree_thread_messages
  ADD CONSTRAINT montree_thread_messages_sender_role_check
  CHECK (sender_role IN ('teacher','principal','parent','system','agent'));
