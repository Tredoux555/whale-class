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
import { generateUniqueReferralCode } from '@/lib/montree/referral/code-gen';

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

  // Enrich with each agent's Stripe Connect status (Phase 3). One row per
  // agent in montree_teachers; many referral codes may share the same agent.
  const agentIds = Array.from(new Set((data || [])
    .map(r => r.agent_id)
    .filter((v): v is string => Boolean(v))));
  let agentMap: Record<string, {
    stripe_connect_account_id: string | null;
    stripe_connect_status: string | null;
  }> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from('montree_teachers')
      .select('id, stripe_connect_account_id, stripe_connect_status')
      .in('id', agentIds);
    agentMap = Object.fromEntries((agents || []).map(a => [a.id as string, {
      stripe_connect_account_id: (a.stripe_connect_account_id as string | null) || null,
      stripe_connect_status: (a.stripe_connect_status as string | null) || null,
    }]));
  }

  const enriched = (data || []).map(r => ({
    ...r,
    redeemed_by_school_name: r.redeemed_by_school_id ? schoolMap[r.redeemed_by_school_id] || null : null,
    agent_stripe_connect_account_id: r.agent_id ? agentMap[r.agent_id]?.stripe_connect_account_id || null : null,
    agent_stripe_connect_status: r.agent_id ? agentMap[r.agent_id]?.stripe_connect_status || null : null,
  }));

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

  const displayName = (body.agent_display_name || '').trim();
  const email = (body.agent_email || '').trim().toLowerCase();
  const pct = Number(body.revenue_share_pct);

  if (!displayName) return NextResponse.json({ error: 'agent_display_name is required' }, { status: 400 });
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid agent_email is required' }, { status: 400 });
  if (Number.isNaN(pct) || pct < 0 || pct > 100) {
    return NextResponse.json({ error: 'revenue_share_pct must be between 0 and 100' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Resolve agent_id. If caller supplied one, use it as-is.
  // Otherwise look for an existing teacher row with this email; reuse if present.
  // Otherwise create a shell record.
  let agentId: string | null = body.agent_id || null;

  if (!agentId) {
    const { data: existing } = await supabase
      .from('montree_teachers')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing?.id) {
      agentId = existing.id;
    } else {
      // Shell agent record. is_active=false; no school_id; no login_code.
      // They become a "real" teacher only if they later sign up properly.
      const { data: shell, error: shellErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: displayName,
          email,
          is_active: false,
          // password_hash is required NOT NULL in some schemas — set to a
          // unusable placeholder. Real login codes are written separately.
          password_hash: 'SHELL_AGENT_NO_LOGIN',
        })
        .select()
        .single();
      if (shellErr || !shell) {
        console.error('[referral-codes POST] shell agent creation failed:', shellErr?.message, shellErr?.details);
        return NextResponse.json({ error: 'Could not create agent record' }, { status: 500 });
      }
      agentId = shell.id;
    }
  }

  // Generate a unique code derived from the display name.
  let code: string;
  try {
    code = await generateUniqueReferralCode(displayName);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[referral-codes POST] code generation failed:', msg);
    return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 });
  }

  // Insert the code row.
  const { data: row, error: insertErr } = await supabase
    .from('montree_referral_codes')
    .insert({
      code,
      agent_id: agentId,
      agent_display_name: displayName,
      agent_email: email,
      agent_pitch_label: body.agent_pitch_label?.trim() || null,
      revenue_share_pct: pct,
      status: 'pending',
      expires_at: body.expires_at || null,
      created_by_label: 'super_admin',
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (insertErr || !row) {
    console.error('[referral-codes POST] insert failed:', insertErr?.message, insertErr?.details);
    return NextResponse.json({ error: 'Could not create referral code' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    code: row.code,
    referral: {
      id: row.id,
      code: row.code,
      agent_id: row.agent_id,
      agent_display_name: row.agent_display_name,
      agent_email: row.agent_email,
      agent_pitch_label: row.agent_pitch_label,
      revenue_share_pct: Number(row.revenue_share_pct),
      status: row.status,
      created_at: row.created_at,
    },
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
