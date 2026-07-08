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
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { issueAgentLogin } from '@/lib/montree/referral/issue-agent-login';

export const dynamic = 'force-dynamic';

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

// ─── POST ─────────────────────────────────────────────────────────────────
// Issue or reset the agent's login code. Optional default_share_pct in body
// locks the agent's default % at the same time so a single round-trip handles
// the common case of "Sarah signs on at 50%, here's her login."
//
// The heavy lifting lives in the shared issueAgentLogin() lib so the Partner
// Program mint action can reuse the exact same issuance path.

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

  const supabase = getSupabase();

  const result = await issueAgentLogin(supabase, agentId, {
    // Only pass defaultSharePct when the caller actually supplied the field —
    // omitting it lets issueAgentLogin seed 20% if NULL (never downgrade).
    ...(Object.prototype.hasOwnProperty.call(body, 'default_share_pct')
      ? { defaultSharePct: body.default_share_pct }
      : {}),
    ipAddress: getClientIP(req.headers),
    userAgent: getUserAgent(req.headers),
    auditSource: 'agent_login_route',
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail ?? undefined },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    reset: result.reset,
    code: result.code,      // shown ONCE
    agent: result.agent,
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
