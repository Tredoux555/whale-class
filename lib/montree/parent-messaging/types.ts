// lib/montree/parent-messaging/types.ts
// Session 98 — shared types for the parent-side threaded messaging surface.
//
// Architectural posture:
// - Parent messaging uses the SAME montree_message_threads / participants /
//   messages tables from migration 190 as the principal/teacher side. Threads
//   created by a parent show up in /montree/admin/communication for the
//   principal exactly as if a teacher had drafted them — same audit trail,
//   same observer rules, same schema.
// - The parent-side surface is gated behind the `parent_messaging` feature
//   flag (migration 193). When OFF, the URLs redirect to the dashboard and
//   the API endpoints return 404. The feature should not appear to exist.
// - Parents can ONLY initiate parent_teacher or parent_principal threads.
//   Internal / broadcast / group threads remain principal/teacher-only.
// - In v1, parents can NOT have AI draft for them. ai_drafted is always false
//   on parent-posted messages. Tracy's draft tools belong to the principal.
// - Invite-based parent sessions (sub=child_id only, no parentId) are
//   READ-ONLY in the messaging surface. They cannot post or initiate threads
//   because participants are people, not children. The dashboard remains
//   fully usable for them.

import type {
  ParticipantRole,
  ThreadType,
  ThreadListItem,
  MessageThread,
  ThreadMessage,
} from '../messaging/types';

export type { ParticipantRole, ThreadType, ThreadListItem, MessageThread, ThreadMessage };

/** Recipient option a parent can pick from when starting a new thread. */
export interface ParentRecipientOption {
  /** Always 'teacher' or 'principal' on the parent side. */
  role: 'teacher' | 'principal';
  /** participant_id — montree_teachers.id or montree_school_admins.id. */
  id: string;
  /** Display name for the picker. */
  name: string;
  /** When role === 'teacher', the classroom this teacher is in. Used to label. */
  classroom_name?: string | null;
  /** Helps the UI describe the relationship. e.g. "Kayla's lead teacher". */
  is_lead?: boolean;
}

/** Bundle returned to the parent UI when they ask "who can I message about <child>?" */
export interface ParentRecipientBundle {
  child_id: string;
  child_name: string;
  classroom_id: string | null;
  classroom_name: string | null;
  teachers: ParentRecipientOption[];
  principal: ParentRecipientOption | null;
}

/** Resolved parent identity for messaging. parentId is REQUIRED — invite-based
 * sessions (childId only) cannot participate in threads. */
export interface MessagingParent {
  parentId: string;
  schoolId: string;
  childIds: string[];
  /** Convenience: the parent's display name for sender_name on posted messages. */
  parentName: string;
}
