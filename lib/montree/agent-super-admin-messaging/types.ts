// lib/montree/agent-super-admin-messaging/types.ts
//
// Phase 4 of agent system fix plan — types for the agent ↔ super-admin
// threaded messaging surface.

/**
 * Sentinel UUID used in participant_id and sender_id for super_admin rows
 * since there's no real user row for Tredoux-as-super-admin. The
 * participant_role / sender_role string is the canonical identity signal;
 * this UUID is just FK-shape filler.
 *
 * 🚨 If you change this value, every prior agent_super_admin thread will
 * be orphaned. Don't.
 */
export const SUPER_ADMIN_SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

export const SUPER_ADMIN_DISPLAY_NAME = 'Tredoux';

export interface MessagingAgent {
  agentId: string;
  agentName: string;
}

export interface MessagingSuperAdmin {
  // No real user id — uses the sentinel. Kept as a struct for parallel shape
  // with MessagingAgent and future flexibility (multi-super-admin?).
  id: typeof SUPER_ADMIN_SENTINEL_UUID;
  name: typeof SUPER_ADMIN_DISPLAY_NAME;
}
