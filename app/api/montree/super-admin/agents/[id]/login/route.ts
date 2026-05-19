// /api/montree/super-admin/agents/[id]/login/route.ts
//
// Phase 7a — Tredoux issues, resets, and suspends agent logins from super
// admin. The agent gets a 6-char code (no I/O/0/1, same alphabet as principal
// codes) which they enter at montree.xyz to reach their dashboard.
//
// POST   — Issue or reset agent login. If is_agent was already true with a
//          password hash, this counts as a reset (logged with reset=true).
//          Body: { default_share_pct?: number }  // optional; locks the
//                                                  agent's default % at the
//                                                  same time. Null disables
//                                                  self-service code gen.
// PATCH  — Update agent flags. Body: { action: 'suspend'|'reactivate'|
//          'set_default_pct', default_pct?: number }
//
// Architectural rules locked in by Phase 7a (do NOT break):
// - The plaintext code is returned in the JSON response EXACTLY ONCE on POST.
//   Never logged to console, never persisted in plaintext, never returned by
//   GET. The DB only ever holds legacySha256(code) in agent_password_hash.
// - is_agent=true is the marker. Without it, tryAgentLogin() in Phase 7b
//   refuses to authenticate even if the hash matches.
// - agent_suspended_at is independent of montree_schools.revenue_share_active.
//   Suspended agents stop logging in but PENDING payouts still pay (Section
//   10 R5 of AGENT_DASHBOARD_PLAN.md — two-knob system).
// - Default % change only affects FUTURE codes the agent self-generates.
//   Existing per-school revenue_share_pct stays locked at redemption time.
// - Every state change writes to montree_agent_audit (Q3 decision).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { legacySha256 } from '@/lib/montree/password';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

// 6-char code, alphabet excludes I/O/0/1 (matches principal codes per Section 84
// architectural rules and AGENT_DASHBOARD_PLAN Section 3.3).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAgentLoginCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_password_hash: string | null;
  agent_default_share_pct: string | number | null;
  agent_suspended_at: string | null;
}

const AGENT_FIELDS = 'id, name, email, is_agent, agent_password_hash, agent_default_share_pct, agent_suspended_at';

// 🚨 Session 119 — default revenue share % for brand-new agents.
// Phase 7a originally left this NULL until Tredoux explicitly set it via
// PATCH, which caused every new agent to hit "Self-service code generation
// disabled" until he remembered. 20% is the canonical handshake share — same
// number the agent referral programme docs promise to multiplier partners.
// Operators can still override via body.default_share_pct on POST or PATCH
// the value later. We ONLY apply this default when the agent currently has
// NULL — never downgrades an already-set value.
const DEFAULT_AGENT_SHARE_PCT = 20;

// ─── POST ─────────────────────────────────────────────────────────────────
// Issue or reset the agent's login code. Optional default_share_pct in body
// locks the agent's default % at the same time so a single round-trip handles
// the common case of "Sarah signs on at 50%, here's her login."

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agent id required' }, { status: 400 });
  }

  // Optional body — default_share_pct can be set at issue time. Tolerate empty
  // body (Content-Length: 0) without throwing.
  let body: { default_share_pct?: number | null } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let nextDefaultPct: number | null | undefined = undefined; // undefined = don't change
  if (Object.prototype.hasOwnProperty.call(body, 'default_share_pct')) {
    if (body.default_share_pct === null) {
      nextDefaultPct = null;
    } else {
      const n = Number(body.default_share_pct);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return NextResponse.json(
          { error: 'default_share_pct must be null or a number between 0 and 100' },
          { status: 400 }
        );
      }
      nextDefaultPct = n;
    }
  }

  const supabase = getSupabase();

  // Fetch the agent row. We need to know if it's already an agent (this is
  // a reset) and to enrich the audit row with display name + email.
  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select(AGENT_FIELDS)
    .eq('id', agentId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[agents/[id]/login POST] lookup failed:', lookupErr.message);
    return NextResponse.json({ error: 'Database lookup failed', detail: lookupErr.message }, { status: 500 });
  }
  if (!agentRaw) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = agentRaw as AgentRow;

  const isReset = Boolean(agent.is_agent && agent.agent_password_hash);

  // Generate fresh code with collision check. Six attempts is plenty —
  // 32^6 = ~1.07B values, near-impossible collision.
  let plaintext = '';
  let codeHash = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    plaintext = generateAgentLoginCode();
    codeHash = legacySha256(plaintext);
    const { data: existing } = await supabase
      .from('montree_teachers')
      .select('id')
      .eq('agent_password_hash', codeHash)
      .neq('id', agentId)  // self-collision (if they had this hash before) is fine
      .maybeSingle();
    if (!existing) break;
    if (attempt === 5) {
      console.error('[agents/[id]/login POST] could not find unique code after 6 attempts');
      return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 });
    }
  }

  const updatePayload: Record<string, unknown> = {
    is_agent: true,
    agent_password_hash: codeHash,
    agent_login_set_at: new Date().toISOString(),
    // Issuing a fresh code clears any prior suspension — Tredoux is explicitly
    // re-activating by giving them a new code. To suspend instead, use PATCH.
    agent_suspended_at: null,
  };
  if (nextDefaultPct !== undefined) {
    // Operator explicitly set (or cleared) the % — that wins.
    updatePayload.agent_default_share_pct = nextDefaultPct;
  } else if (agent.agent_default_share_pct === null || agent.agent_default_share_pct === undefined) {
    // Session 119 unblock: agent has no % set yet. Seed with canonical 20%
    // so self-service code generation works on first login. If the operator
    // wants a different %, they can pass default_share_pct in the body or
    // PATCH it later. We never downgrade an already-set value here.
    updatePayload.agent_default_share_pct = DEFAULT_AGENT_SHARE_PCT;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('montree_teachers')
    .update(updatePayload)
    .eq('id', agentId)
    .select(AGENT_FIELDS)
    .maybeSingle();

  if (updateErr || !updated) {
    console.error('[agents/[id]/login POST] update failed:', updateErr?.message);
    return NextResponse.json({
      error: 'Could not issue agent login',
      detail: updateErr?.message || 'no rows updated',
    }, { status: 500 });
  }

  // Audit. Fire-and-forget — we never want to fail issuance because logging
  // failed. The plaintext code is NEVER logged.
  void logAgentAudit(supabase, {
    agent_id: agentId,
    agent_display_name: agent.name,
    agent_email: agent.email,
    event_type: 'agent_login_issued',
    actor_role: 'super_admin',
    details: {
      reset: isReset,
      default_share_pct_set: nextDefaultPct !== undefined,
      default_share_pct: nextDefaultPct === undefined
        ? (agent.agent_default_share_pct === null ? null : Number(agent.agent_default_share_pct))
        : nextDefaultPct,
    },
    ip_address: getClientIP(req.headers),
    user_agent: getUserAgent(req.headers),
  });

  return NextResponse.json({
    ok: true,
    reset: isReset,
    code: plaintext,                    // shown ONCE
    agent: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      is_agent: true,
      agent_default_share_pct: updated.agent_default_share_pct === null
        ? null
        : Number(updated.agent_default_share_pct),
      agent_suspended_at: null,
    },
  });
}

// ─── PATCH ────────────────────────────────────────────────────────────────
// Suspend / reactivate / change default %. No plaintext returned.

interface PatchBody {
  action: 'suspend' | 'reactivate' | 'set_default_pct';
  default_pct?: number | null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agent id required' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || !body.action || !['suspend', 'reactivate', 'set_default_pct'].includes(body.action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch current state — needed for audit "from" values and to confirm the
  // agent exists.
  const { data: beforeRaw, error: fetchErr } = await supabase
    .from('montree_teachers')
    .select(AGENT_FIELDS)
    .eq('id', agentId)
    .maybeSingle();

  if (fetchErr) {
    console.error('[agents/[id]/login PATCH] lookup failed:', fetchErr.message);
    return NextResponse.json({ error: 'Database lookup failed', detail: fetchErr.message }, { status: 500 });
  }
  if (!beforeRaw) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  const before = beforeRaw as AgentRow;

  if (!before.is_agent) {
    return NextResponse.json({
      error: 'Cannot modify agent flags on a non-agent. Issue an agent login first.',
    }, { status: 400 });
  }

  const ip = getClientIP(req.headers);
  const ua = getUserAgent(req.headers);

  if (body.action === 'suspend') {
    if (before.agent_suspended_at) {
      return NextResponse.json({
        ok: true,
        already_suspended: true,
        agent_suspended_at: before.agent_suspended_at,
      });
    }
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('montree_teachers')
      .update({ agent_suspended_at: now })
      .eq('id', agentId);
    if (updateErr) {
      console.error('[agents/[id]/login PATCH suspend] update failed:', updateErr.message);
      return NextResponse.json({ error: 'Could not suspend agent', detail: updateErr.message }, { status: 500 });
    }
    void logAgentAudit(supabase, {
      agent_id: agentId,
      agent_display_name: before.name,
      agent_email: before.email,
      event_type: 'agent_suspended',
      actor_role: 'super_admin',
      details: null,
      ip_address: ip,
      user_agent: ua,
    });
    return NextResponse.json({ ok: true, agent_suspended_at: now });
  }

  if (body.action === 'reactivate') {
    if (!before.agent_suspended_at) {
      return NextResponse.json({ ok: true, already_active: true });
    }
    const { error: updateErr } = await supabase
      .from('montree_teachers')
      .update({ agent_suspended_at: null })
      .eq('id', agentId);
    if (updateErr) {
      console.error('[agents/[id]/login PATCH reactivate] update failed:', updateErr.message);
      return NextResponse.json({ error: 'Could not reactivate agent', detail: updateErr.message }, { status: 500 });
    }
    void logAgentAudit(supabase, {
      agent_id: agentId,
      agent_display_name: before.name,
      agent_email: before.email,
      event_type: 'agent_reactivated',
      actor_role: 'super_admin',
      details: { suspended_since: before.agent_suspended_at },
      ip_address: ip,
      user_agent: ua,
    });
    return NextResponse.json({ ok: true, agent_suspended_at: null });
  }

  // set_default_pct
  if (body.action === 'set_default_pct') {
    let next: number | null;
    if (body.default_pct === null || body.default_pct === undefined) {
      next = null;
    } else {
      const n = Number(body.default_pct);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return NextResponse.json(
          { error: 'default_pct must be null or a number between 0 and 100' },
          { status: 400 }
        );
      }
      next = n;
    }
    const fromValue = before.agent_default_share_pct === null
      ? null
      : Number(before.agent_default_share_pct);
    if (fromValue === next) {
      return NextResponse.json({ ok: true, no_change: true, agent_default_share_pct: next });
    }
    const { error: updateErr } = await supabase
      .from('montree_teachers')
      .update({ agent_default_share_pct: next })
      .eq('id', agentId);
    if (updateErr) {
      console.error('[agents/[id]/login PATCH set_default_pct] update failed:', updateErr.message);
      return NextResponse.json({ error: 'Could not change default share %', detail: updateErr.message }, { status: 500 });
    }
    void logAgentAudit(supabase, {
      agent_id: agentId,
      agent_display_name: before.name,
      agent_email: before.email,
      event_type: 'agent_default_pct_changed',
      actor_role: 'super_admin',
      details: { from: fromValue, to: next },
      ip_address: ip,
      user_agent: ua,
    });
    return NextResponse.json({ ok: true, agent_default_share_pct: next });
  }

  // Should be unreachable due to the action whitelist above.
  return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
}
