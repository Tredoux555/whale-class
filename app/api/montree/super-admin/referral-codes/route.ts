// /api/montree/super-admin/referral-codes/route.ts
//
// Phase 1 of the agent referral programme. Super-admin only.
//
// GET    — list every referral code (filterable by status)
// POST   — issue a new code for an agent. If agent_id is omitted, creates a
//          shell montree_teachers row for the agent (is_active=false, no
//          school/classroom — they exist purely as a payee record).
// DELETE — revoke a pending code. Cannot revoke a redeemed code; the
//          school↔agent link is permanent once redemption happens.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { createAgentReferralCode } from '@/lib/montree/referral/create-agent-code';

export const dynamic = 'force-dynamic';

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // optional filter

  let query = supabase
    .from('montree_referral_codes')
    .select('id, code, agent_id, agent_display_name, agent_email, agent_pitch_label, revenue_share_pct, status, redeemed_by_school_id, redeemed_at, expires_at, created_at, notes')
    .order('created_at', { ascending: false });

  if (status && ['pending', 'redeemed', 'revoked', 'expired'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[referral-codes GET]', error.message);
    return NextResponse.json({ error: 'Failed to load referral codes' }, { status: 500 });
  }

  // Enrich with school name where redeemed.
  const schoolIds = (data || [])
    .map(r => r.redeemed_by_school_id)
    .filter((v): v is string => Boolean(v));
  let schoolMap: Record<string, string> = {};
  if (schoolIds.length > 0) {
    const { data: schools } = await supabase
      .from('montree_schools')
      .select('id, name')
      .in('id', schoolIds);
    schoolMap = Object.fromEntries((schools || []).map(s => [s.id, s.name]));
  }

  // Enrich with each agent's Stripe Connect status (Phase 3) AND agent
  // dashboard flags (Phase 7a — is_agent, login set timestamp, suspend flag,
  // default share %). One row per agent in montree_teachers; many referral
  // codes may share the same agent. The select widens gracefully if some
  // columns don't exist yet (migration 187 / 188 not run); Postgres returns
  // an error on the whole select so we fall back to a narrow select.
  const agentIds = Array.from(new Set((data || [])
    .map(r => r.agent_id)
    .filter((v): v is string => Boolean(v))));
  let agentMap: Record<string, {
    stripe_connect_account_id: string | null;
    stripe_connect_status: string | null;
    is_agent: boolean;
    agent_login_set_at: string | null;
    agent_login_last_used_at: string | null;
    agent_default_share_pct: number | null;
    agent_suspended_at: string | null;
  }> = {};
  if (agentIds.length > 0) {
    // Try the wide select (post-migration-188). If a column is missing we
    // retry with the narrow select (pre-188) so the page stays usable while
    // Tredoux runs the migration in Supabase SQL Editor.
    const wideFields = 'id, stripe_connect_account_id, stripe_connect_status, is_agent, agent_login_set_at, agent_login_last_used_at, agent_default_share_pct, agent_suspended_at';
    const { data: wideAgents, error: wideErr } = await supabase
      .from('montree_teachers')
      .select(wideFields)
      .in('id', agentIds);
    if (wideErr) {
      // Fall back to narrow (pre-188) select.
      const { data: narrowAgents } = await supabase
        .from('montree_teachers')
        .select('id, stripe_connect_account_id, stripe_connect_status')
        .in('id', agentIds);
      agentMap = Object.fromEntries((narrowAgents || []).map(a => [a.id as string, {
        stripe_connect_account_id: (a.stripe_connect_account_id as string | null) || null,
        stripe_connect_status: (a.stripe_connect_status as string | null) || null,
        is_agent: false,
        agent_login_set_at: null,
        agent_login_last_used_at: null,
        agent_default_share_pct: null,
        agent_suspended_at: null,
      }]));
    } else {
      agentMap = Object.fromEntries((wideAgents || []).map(a => [a.id as string, {
        stripe_connect_account_id: (a.stripe_connect_account_id as string | null) || null,
        stripe_connect_status: (a.stripe_connect_status as string | null) || null,
        is_agent: Boolean(a.is_agent),
        agent_login_set_at: (a.agent_login_set_at as string | null) || null,
        agent_login_last_used_at: (a.agent_login_last_used_at as string | null) || null,
        agent_default_share_pct: a.agent_default_share_pct === null || a.agent_default_share_pct === undefined
          ? null
          : Number(a.agent_default_share_pct),
        agent_suspended_at: (a.agent_suspended_at as string | null) || null,
      }]));
    }
  }

  const enriched = (data || []).map(r => {
    const agentInfo = r.agent_id ? agentMap[r.agent_id] : null;
    return {
      ...r,
      redeemed_by_school_name: r.redeemed_by_school_id ? schoolMap[r.redeemed_by_school_id] || null : null,
      agent_stripe_connect_account_id: agentInfo?.stripe_connect_account_id || null,
      agent_stripe_connect_status: agentInfo?.stripe_connect_status || null,
      agent_is_agent: agentInfo?.is_agent || false,
      agent_login_set_at: agentInfo?.agent_login_set_at || null,
      agent_login_last_used_at: agentInfo?.agent_login_last_used_at || null,
      agent_default_share_pct: agentInfo?.agent_default_share_pct ?? null,
      agent_suspended_at: agentInfo?.agent_suspended_at || null,
    };
  });

  return NextResponse.json({ codes: enriched });
}

// ─── POST ─────────────────────────────────────────────────────────────────

interface CreateBody {
  agent_id?: string | null;          // existing montree_teachers.id, optional
  agent_display_name: string;
  agent_email: string;
  revenue_share_pct: number;         // 0–100
  agent_pitch_label?: string | null; // optional free-text
  expires_at?: string | null;        // ISO date, optional
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Shared core (create-agent-code.ts): resolves/creates the agent payee row,
  // mints a unique code, inserts the referral row. Identical logic is reused by
  // the Partner Program mint action so the two can never drift.
  const result = await createAgentReferralCode(supabase, {
    displayName: body.agent_display_name || '',
    email: body.agent_email || '',
    revenueSharePct: Number(body.revenue_share_pct),
    agentId: body.agent_id || null,
    pitchLabel: body.agent_pitch_label ?? null,
    expiresAt: body.expires_at ?? null,
    notes: body.notes ?? null,
    createdByLabel: 'super_admin',
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail ?? undefined, hint: result.hint ?? undefined },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    referral: result.referral,
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getSupabase();

  // Only allow revoking codes that are still pending. Once redeemed, the
  // school↔agent link is permanent — Tredoux can edit revenue_share_pct on
  // the school directly if a deal needs to change.
  const { data: existing, error: fetchErr } = await supabase
    .from('montree_referral_codes')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[referral-codes DELETE] fetch failed:', fetchErr.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'pending') {
    return NextResponse.json({
      error: `Cannot revoke a code with status='${existing.status}'. Only pending codes can be revoked.`,
    }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('montree_referral_codes')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (updateErr) {
    console.error('[referral-codes DELETE] update failed:', updateErr.message);
    return NextResponse.json({ error: 'Revoke failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
