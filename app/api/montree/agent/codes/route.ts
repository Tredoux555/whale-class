// /api/montree/agent/codes/route.ts
//
// Phase 7d — Agent's referral codes. Self-scoped to auth.userId via
// montree_referral_codes.agent_id = auth.userId.
//
// 🚨 CRITICAL FILTER: every query MUST .eq('agent_id', auth.userId).
// Without it an agent could read or revoke another agent's codes.
//
// GET    — list this agent's codes. Optional ?status=pending|redeemed|...
//          and ?limit=N for the dashboard's "recent codes" widget.
// POST   — self-generate a new code at the agent's locked default %.
//          Rate limited 20 codes / 24h. Requires pitch_label (per Section
//          3.5: forces commit, helps audit). Refuses if
//          agent_default_share_pct IS NULL (self-service disabled).
// DELETE — revoke the agent's OWN pending code. ?id=<uuid>. Refuses to
//          touch redeemed/revoked/expired codes or codes owned by another
//          agent.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { generateUniqueReferralCode } from '@/lib/montree/referral/code-gen';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

// Soft rate limit: 20 self-generated codes per rolling 24 hours.
// Counted from montree_referral_codes WHERE agent_id=X AND created_at >= now()-24h.
const SELF_SERVICE_LIMIT_PER_24H = 20;

const SELECT_FIELDS = 'id, code, agent_id, agent_display_name, agent_email, agent_pitch_label, revenue_share_pct, status, redeemed_by_school_id, redeemed_at, expires_at, created_at';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_default_share_pct: string | number | null;
  agent_suspended_at: string | null;
}

async function loadAgent(supabase: ReturnType<typeof getSupabase>, userId: string): Promise<AgentRow | null> {
  const { data } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, agent_default_share_pct, agent_suspended_at')
    .eq('id', userId)
    .maybeSingle();
  return (data as AgentRow | null) || null;
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const limitParam = Number(searchParams.get('limit') || '100');
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 500);

  let query = supabase
    .from('montree_referral_codes')
    .select(SELECT_FIELDS)
    .eq('agent_id', auth.userId) // ← cross-pollination filter
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statusFilter && ['pending', 'redeemed', 'revoked', 'expired'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[agent/codes GET]', error.message);
    return NextResponse.json({ error: 'Failed to load codes', detail: error.message }, { status: 500 });
  }

  // Enrich with redeemed school name (single batch query).
  const schoolIds = (data || [])
    .map(r => r.redeemed_by_school_id)
    .filter((v): v is string => Boolean(v));
  let schoolMap: Record<string, string> = {};
  if (schoolIds.length > 0) {
    const { data: schools } = await supabase
      .from('montree_schools')
      .select('id, name')
      .in('id', schoolIds);
    schoolMap = Object.fromEntries((schools || []).map(s => [s.id as string, s.name as string]));
  }

  return NextResponse.json({
    codes: (data || []).map(r => ({
      ...r,
      revenue_share_pct: Number(r.revenue_share_pct),
      redeemed_by_school_name: r.redeemed_by_school_id ? schoolMap[r.redeemed_by_school_id] || null : null,
    })),
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────
// Self-service code generation. Locked at agent's default %, requires pitch
// label, rate limited 20/24h.

interface PostBody {
  agent_pitch_label?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  let body: PostBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const pitchLabel = (body.agent_pitch_label || '').trim();
  if (!pitchLabel || pitchLabel.length < 3) {
    return NextResponse.json({
      error: 'Pitch label required',
      detail: 'Add a short note about which school or context this code is for.',
    }, { status: 400 });
  }
  if (pitchLabel.length > 200) {
    return NextResponse.json({ error: 'Pitch label too long (max 200 chars)' }, { status: 400 });
  }
  const notes = (body.notes || '').trim().slice(0, 1000) || null;

  const supabase = getSupabase();

  // Load + verify agent state.
  const agent = await loadAgent(supabase, auth.userId);
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  if (!agent.is_agent) {
    return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  }
  if (agent.agent_suspended_at) {
    return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });
  }
  if (agent.agent_default_share_pct === null || agent.agent_default_share_pct === undefined) {
    return NextResponse.json({
      error: 'Self-service code generation is disabled',
      detail: 'Tredoux can enable it by setting your default revenue share % in super admin.',
    }, { status: 403 });
  }
  const defaultPct = Number(agent.agent_default_share_pct);
  if (Number.isNaN(defaultPct) || defaultPct < 0 || defaultPct > 100) {
    console.error('[agent/codes POST] invalid agent_default_share_pct:', agent.agent_default_share_pct);
    return NextResponse.json({ error: 'Default % is not configured correctly' }, { status: 500 });
  }

  // Rate limit — 20 codes per rolling 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countErr } = await supabase
    .from('montree_referral_codes')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', auth.userId)
    .gte('created_at', since);
  if (countErr) {
    console.error('[agent/codes POST] rate-limit count failed:', countErr.message);
    // Fail-open — proceed with creation. Worse to block legitimate codes than
    // miss enforcement.
  } else if ((recentCount || 0) >= SELF_SERVICE_LIMIT_PER_24H) {
    return NextResponse.json({
      error: 'Daily code limit reached',
      detail: `You've generated ${recentCount} codes in the last 24 hours. Reach out to Tredoux if you need more.`,
    }, { status: 429 });
  }

  // Generate unique code from agent display name prefix.
  let code: string;
  try {
    code = await generateUniqueReferralCode(agent.name || agent.email || 'agent');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[agent/codes POST] code generation failed:', msg);
    return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 });
  }

  const { data: row, error: insertErr } = await supabase
    .from('montree_referral_codes')
    .insert({
      code,
      agent_id: auth.userId,
      agent_display_name: agent.name || agent.email || 'Agent',
      agent_email: agent.email || '',
      agent_pitch_label: pitchLabel,
      revenue_share_pct: defaultPct,
      status: 'pending',
      created_by_label: 'agent_self_service',
      notes,
    })
    .select(SELECT_FIELDS)
    .single();

  if (insertErr || !row) {
    console.error('[agent/codes POST] insert failed:', insertErr?.message);
    return NextResponse.json({
      error: 'Could not create code',
      detail: insertErr?.message || 'unknown error',
    }, { status: 500 });
  }

  void logAgentAudit(supabase, {
    agent_id: auth.userId,
    agent_display_name: agent.name,
    agent_email: agent.email,
    event_type: 'agent_code_generated',
    actor_role: 'agent',
    details: {
      code: row.code,
      pitch_label: pitchLabel,
      revenue_share_pct: defaultPct,
    },
    ip_address: getClientIP(req.headers),
    user_agent: getUserAgent(req.headers),
  });

  return NextResponse.json({
    ok: true,
    code: row.code,
    referral: {
      ...row,
      revenue_share_pct: Number(row.revenue_share_pct),
    },
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────
// Revoke the agent's own pending code. ?id=<uuid>.

export async function DELETE(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getSupabase();

  // Load the row + cross-pollination check + status check in one query.
  const { data: existing, error: fetchErr } = await supabase
    .from('montree_referral_codes')
    .select('id, code, status, agent_id, agent_pitch_label')
    .eq('id', id)
    .eq('agent_id', auth.userId) // ← cross-pollination filter
    .maybeSingle();

  if (fetchErr) {
    console.error('[agent/codes DELETE] fetch failed:', fetchErr.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!existing) {
    // Either not found or owned by another agent — same response either way
    // to prevent enumeration of other agents' code IDs.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.status !== 'pending') {
    return NextResponse.json({
      error: `Cannot revoke — code is ${existing.status}.`,
    }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('montree_referral_codes')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('agent_id', auth.userId); // ← cross-pollination filter (belt-and-braces)

  if (updateErr) {
    console.error('[agent/codes DELETE] update failed:', updateErr.message);
    return NextResponse.json({ error: 'Revoke failed' }, { status: 500 });
  }

  // Audit. Plaintext code is OK in details — agent already saw it.
  const agent = await loadAgent(supabase, auth.userId);
  void logAgentAudit(supabase, {
    agent_id: auth.userId,
    agent_display_name: agent?.name || null,
    agent_email: agent?.email || null,
    event_type: 'agent_code_revoked',
    actor_role: 'agent',
    details: { code: existing.code, pitch_label: existing.agent_pitch_label },
    ip_address: getClientIP(req.headers),
    user_agent: getUserAgent(req.headers),
  });

  return NextResponse.json({ ok: true });
}
