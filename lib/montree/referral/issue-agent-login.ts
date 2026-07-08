// lib/montree/referral/issue-agent-login.ts
//
// Shared core for issuing (or resetting) an agent's dashboard login code.
// Extracted from POST /api/montree/super-admin/agents/[id]/login so BOTH that
// route AND the Partner Program mint action (create_partner) share ONE
// implementation and can never drift.
//
// 🚨 Architectural rules (do NOT break — from Phase 7a):
// - The plaintext code is RETURNED exactly once. Never logged, never persisted
//   in plaintext, never returned by GET. The DB only holds legacySha256(code).
// - is_agent=true is the marker Phase-7b auth requires.
// - Issuing a fresh code clears any prior suspension (explicit re-activation).
// - default_share_pct is seeded to 20 only when currently NULL (never
//   downgrades an already-set value); pass a number to override.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { legacySha256 } from '@/lib/montree/password';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';

// 6-char code, alphabet excludes I/O/0/1 (matches principal codes).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAgentLoginCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Canonical default revenue share for a brand-new agent (Session 119). Only
// applied when the agent has no % set yet — never downgrades.
const DEFAULT_AGENT_SHARE_PCT = 20;

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_password_hash: string | null;
  agent_default_share_pct: string | number | null;
  agent_suspended_at: string | null;
}

const AGENT_FIELDS =
  'id, name, email, is_agent, agent_password_hash, agent_default_share_pct, agent_suspended_at';

export interface IssueAgentLoginOptions {
  // undefined = leave the agent's default % unchanged (seed 20 only if NULL);
  // null = explicitly clear it; number = set it (must be 0–100).
  defaultSharePct?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  auditSource?: string;
}

export interface IssueAgentLoginSuccess {
  ok: true;
  reset: boolean;
  code: string; // plaintext — shown ONCE
  agent: {
    id: string;
    name: string | null;
    email: string | null;
    is_agent: true;
    agent_default_share_pct: number | null;
    agent_suspended_at: null;
  };
}

export interface IssueAgentLoginFailure {
  ok: false;
  error: string;
  detail?: string | null;
  status: number;
}

export async function issueAgentLogin(
  supabase: SupabaseClient,
  agentId: string,
  opts: IssueAgentLoginOptions = {}
): Promise<IssueAgentLoginSuccess | IssueAgentLoginFailure> {
  if (!agentId || typeof agentId !== 'string') {
    return { ok: false, error: 'agent id required', status: 400 };
  }

  // Resolve the requested % change. undefined stays undefined (don't change).
  let nextDefaultPct: number | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(opts, 'defaultSharePct')) {
    if (opts.defaultSharePct === null) {
      nextDefaultPct = null;
    } else if (opts.defaultSharePct !== undefined) {
      const n = Number(opts.defaultSharePct);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return { ok: false, error: 'default_share_pct must be null or a number between 0 and 100', status: 400 };
      }
      nextDefaultPct = n;
    }
  }

  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select(AGENT_FIELDS)
    .eq('id', agentId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[issueAgentLogin] lookup failed:', lookupErr.message);
    return { ok: false, error: 'Database lookup failed', detail: lookupErr.message, status: 500 };
  }
  if (!agentRaw) {
    return { ok: false, error: 'Agent not found', status: 404 };
  }
  const agent = agentRaw as AgentRow;

  const isReset = Boolean(agent.is_agent && agent.agent_password_hash);

  // Unique code with collision check. 32^6 ≈ 1.07B values — near-impossible.
  let plaintext = '';
  let codeHash = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    plaintext = generateAgentLoginCode();
    codeHash = legacySha256(plaintext);
    const { data: existing } = await supabase
      .from('montree_teachers')
      .select('id')
      .eq('agent_password_hash', codeHash)
      .neq('id', agentId)
      .maybeSingle();
    if (!existing) break;
    if (attempt === 5) {
      console.error('[issueAgentLogin] could not find unique code after 6 attempts');
      return { ok: false, error: 'Could not generate unique code', status: 500 };
    }
  }

  const updatePayload: Record<string, unknown> = {
    is_agent: true,
    agent_password_hash: codeHash,
    agent_login_set_at: new Date().toISOString(),
    agent_suspended_at: null,
  };
  if (nextDefaultPct !== undefined) {
    updatePayload.agent_default_share_pct = nextDefaultPct;
  } else if (agent.agent_default_share_pct === null || agent.agent_default_share_pct === undefined) {
    updatePayload.agent_default_share_pct = DEFAULT_AGENT_SHARE_PCT;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('montree_teachers')
    .update(updatePayload)
    .eq('id', agentId)
    .select(AGENT_FIELDS)
    .maybeSingle();

  if (updateErr || !updated) {
    console.error('[issueAgentLogin] update failed:', updateErr?.message);
    return { ok: false, error: 'Could not issue agent login', detail: updateErr?.message || 'no rows updated', status: 500 };
  }

  // Audit — fire-and-forget, plaintext NEVER logged.
  void logAgentAudit(supabase, {
    agent_id: agentId,
    agent_display_name: agent.name,
    agent_email: agent.email,
    event_type: 'agent_login_issued',
    actor_role: 'super_admin',
    details: {
      reset: isReset,
      source: opts.auditSource || 'agent_login_route',
      default_share_pct_set: nextDefaultPct !== undefined,
      default_share_pct: nextDefaultPct === undefined
        ? (agent.agent_default_share_pct === null ? null : Number(agent.agent_default_share_pct))
        : nextDefaultPct,
    },
    ip_address: opts.ipAddress ?? null,
    user_agent: opts.userAgent ?? null,
  });

  const updatedRow = updated as AgentRow;
  return {
    ok: true,
    reset: isReset,
    code: plaintext,
    agent: {
      id: updatedRow.id,
      name: updatedRow.name,
      email: updatedRow.email,
      is_agent: true,
      agent_default_share_pct: updatedRow.agent_default_share_pct === null
        ? null
        : Number(updatedRow.agent_default_share_pct),
      agent_suspended_at: null,
    },
  };
}
