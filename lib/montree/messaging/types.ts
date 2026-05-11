// lib/montree/messaging/types.ts
// Session 97 — shared types for the Communication system.
// Mirrors the schema in migrations/190_communication_system.sql.

export type ParticipantRole = 'teacher' | 'principal' | 'parent';
export type SenderRole = ParticipantRole | 'system';

export type ThreadType =
  | 'parent_teacher'
  | 'parent_principal'
  | 'internal'
  | 'broadcast'
  | 'group';

export interface MessageThread {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  thread_type: ThreadType;
  subject: string | null;
  group_id: string | null;
  created_by_role: SenderRole;
  created_by_id: string;
  created_at: string;
  last_message_at: string;
  archived_at: string | null;
  archived_by_id: string | null;
}

export interface MessageThreadParticipant {
  thread_id: string;
  participant_role: ParticipantRole;
  participant_id: string;
  joined_at: string;
  last_read_at: string | null;
  can_reply: boolean;
  is_observer: boolean;
  is_primary: boolean;
  left_at: string | null;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_role: SenderRole;
  sender_id: string;
  sender_name: string;
  body: string;
  body_locale: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | 'document' | 'audio' | null;
  media_filename: string | null;
  ai_drafted: boolean;
  ai_draft_source: string | null;
  approved_by_id: string | null;
  in_reply_to: string | null;
  sent_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface MessageGroup {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  created_by_role: 'principal' | 'teacher';
  created_by_id: string;
  created_at: string;
  archived_at: string | null;
}

export interface MessageGroupMember {
  group_id: string;
  member_role: ParticipantRole;
  member_id: string;
  added_at: string;
  added_by_id: string | null;
}

/** Augmented thread row used by the API: thread + participant view + last-message snippet + unread count. */
export interface ThreadListItem extends MessageThread {
  participants: Array<{
    role: ParticipantRole;
    id: string;
    name: string | null;
    is_observer: boolean;
    is_primary: boolean;
  }>;
  last_snippet: string | null;
  last_sender_name: string | null;
  last_sender_role: SenderRole | null;
  // Session 103: id of the last message's sender + per-caller convenience flag.
  // The client can render "You" when last_sender_is_me is true, independently
  // of role — important for multi-participant threads where two callers share
  // a role (e.g. multiple teachers in a broadcast thread).
  last_sender_id: string | null;
  last_sender_is_me: boolean;
  unread_for_me: number;
}

/** A scope description used by the broadcast API and group resolver. */
export type BroadcastScope =
  | { kind: 'all_teachers' }
  | { kind: 'all_parents' }
  | { kind: 'classroom_teachers'; classroom_id: string }
  | { kind: 'classroom_parents'; classroom_id: string }
  | { kind: 'group'; group_id: string };
