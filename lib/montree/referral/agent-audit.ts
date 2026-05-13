// lib/montree/referral/agent-audit.ts
//
// Append-only audit logger for agent-affecting events. Surfaced in the super
// admin Referrals tab as a "Recent agent activity" panel — the substitute for
// per-event pings (Q3 decision: log don't ping; revisit if too noisy).
//
// Fire-and-forget: never throws, never blocks the caller. Auth and business
// logic must never fail because audit logging failed.
//
// Event types written so far:
//   agent_login_issued        — Tredoux generated a fresh agent login code
//                                details: { reset: boolean }
//   agent_suspended           — Tredoux suspended an agent's login
//   agent_reactivated         — Tredoux cleared an agent's suspend flag
//   agent_default_pct_changed — Tredoux changed agent's default revenue share
//                                details: { from: number|null, to: number|null }
//
// Future phases (7b login, 7d self-service code gen) will add:
//   agent_login_succeeded, agent_login_failed
//   agent_code_generated      details: { code, pitch_label }
//   agent_code_revoked        details: { code }
//   agent_stripe_link_generated
//   agent_profile_changed

import { SupabaseClient } from '@supabase/supabase-js';

export type AgentAuditEventType =
  | 'agent_login_issued'
  | 'agent_suspended'
  | 'agent_reactivated'
  | 'agent_default_pct_changed'
  // Reserved for future phases — listed here so writers don't drift.
  | 'agent_login_succeeded'
  | 'agent_login_failed'
  | 'agent_code_generated'
  | 'agent_code_revoked'
  | 'agent_stripe_link_generated'
  | 'agent_profile_changed'
  // Session 103: super-admin "Log in as agent" impersonation.
  | 'agent_impersonated_by_super_admin'
  // Session 109: manual payout architecture.
  | 'agent_payout_method_changed'
  | 'agent_payout_details_updated';

export type AgentAuditActorRole = 'super_admin' | 'agent' | 'system';

interface AgentAuditEntry {
  agent_id: string | null;
  agent_display_name?: string | null;
  agent_email?: string | null;
  event_type: AgentAuditEventType;
  actor_role: AgentAuditActorRole;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function logAgentAudit(
  supabase: SupabaseClient,
  entry: AgentAuditEntry
): Promise<void> {
  try {
    await supabase.from('montree_agent_audit').insert({
      agent_id: entry.agent_id,
      agent_display_name: entry.agent_display_name ?? null,
      agent_email: entry.agent_email ?? null,
      event_type: entry.event_type,
      actor_role: entry.actor_role,
      details: entry.details ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
    });
  } catch (e) {
    // Fire-and-forget: log but never throw. The caller's primary action
    // (issuing a code, suspending an agent) must not fail because the audit
    // row couldn't be written.
    console.error('[agent-audit] Failed to write audit row:', e);
  }
}
