// /api/montree/super-admin/payouts/route.ts
// Phase 5 — super-admin list + state management for agent payouts.
//
// GET: list payouts. Filterable by period_month, agent_id, school_id, status.
//      Enriches with agent + school names. Default order: period_month DESC,
//      then school_name.
//
// PATCH: state transitions. Supported actions:
//        - mark_paid   (sets status=paid + stripe_transfer_id + paid_at + method)
//        - mark_failed (sets status=failed + notes)
//        - cancel      (sets status=cancelled + notes)
//        - manual_override (sets payout_usd + is_manual_override=true; locks
//                           the row against future calculator runs)
//        - clear_override (clears is_manual_override; next calc will rewrite)
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

interface PayoutRow {
  id: string;
  agent_id: string;
  school_id: string;
  period_month: string;
  gross_revenue_usd: number;
  stripe_fee_usd: number;
  anthropic_cost_usd: number;
  openai_cost_usd: number;
  other_direct_cost_usd: number;
  net_usd: number;
  revenue_share_pct: number;
  payout_usd: number;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  stripe_transfer_id: string | null;
  paid_at: string | null;
  paid_by_method: string | null;
  payout_currency: string | null;
  fx_rate_used: number | null;
  source_tx_count: number;
  is_manual_override: boolean;
  notes: string | null;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const periodMonth = searchParams.get('period_month');
    const agentId = searchParams.get('agent_id');
    const schoolId = searchParams.get('school_id');
    const status = searchParams.get('status');

    let q = supabase
      .from('montree_agent_payouts')
      .select('*')
      .order('period_month', { ascending: false })
      .limit(500);

    if (periodMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
      q = q.eq('period_month', periodMonth);
    }
    if (agentId && UUID_RE.test(agentId)) q = q.eq('agent_id', agentId);
    if (schoolId && UUID_RE.test(schoolId)) q = q.eq('school_id', schoolId);
    if (status && ['pending', 'paid', 'cancelled', 'failed'].includes(status)) {
      q = q.eq('status', status);
    }

    const { data, error } = await q;
    if (error) {
      console.error('[payouts GET] query failed', error);
      return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 });
    }

    const rows = (data || []) as PayoutRow[];

    // Hydrate agent + school names in one round-trip each. Also pull each
    // agent's Stripe Connect status so the Money tab can gate the Wire button
    // and surface readiness at a glance.
    const agentIds = Array.from(new Set(rows.map((r) => r.agent_id)));
    const schoolIds = Array.from(new Set(rows.map((r) => r.school_id)));
    const [agentsRes, schoolsRes] = await Promise.all([
      agentIds.length
        ? supabase
            .from('montree_teachers')
            .select(
              'id, name, email, stripe_connect_account_id, stripe_connect_status, charges_enabled, payouts_enabled'
            )
            .in('id', agentIds)
        : Promise.resolve({ data: [] }),
      schoolIds.length
        ? supabase.from('montree_schools').select('id, name').in('id', schoolIds)
        : Promise.resolve({ data: [] }),
    ]);
    interface AgentLite {
      id: string;
      name: string | null;
      email: string | null;
      stripe_connect_account_id: string | null;
      stripe_connect_status: string | null;
      charges_enabled: boolean | null;
      payouts_enabled: boolean | null;
    }
    const agentById = new Map<string, AgentLite>();
    for (const a of (agentsRes.data || []) as AgentLite[]) {
      agentById.set(a.id, a);
    }
    const schoolNameById = new Map<string, string | null>();
    for (const s of (schoolsRes.data || []) as Array<{ id: string; name: string | null }>) {
      schoolNameById.set(s.id, s.name);
    }

    // Period totals — quick-glance summary per month.
    interface PeriodTotal {
      period_month: string;
      total_payout_usd: number;
      pending_usd: number;
      paid_usd: number;
      cancelled_usd: number;
      failed_usd: number;
      row_count: number;
    }
    const byMonth = new Map<string, PeriodTotal>();
    for (const r of rows) {
      const existing = byMonth.get(r.period_month) || {
        period_month: r.period_month,
        total_payout_usd: 0,
        pending_usd: 0,
        paid_usd: 0,
        cancelled_usd: 0,
        failed_usd: 0,
        row_count: 0,
      };
      const amt = Number(r.payout_usd) || 0;
      existing.total_payout_usd += amt;
      if (r.status === 'pending') existing.pending_usd += amt;
      else if (r.status === 'paid') existing.paid_usd += amt;
      else if (r.status === 'cancelled') existing.cancelled_usd += amt;
      else if (r.status === 'failed') existing.failed_usd += amt;
      existing.row_count += 1;
      byMonth.set(r.period_month, existing);
    }

    const enriched = rows.map((r) => {
      const ag = agentById.get(r.agent_id);
      return {
        ...r,
        agent_name: ag?.name || ag?.email || null,
        school_name: schoolNameById.get(r.school_id) || null,
        agent_stripe_connect_status: ag?.stripe_connect_status || null,
        agent_payouts_enabled: ag?.payouts_enabled === true,
        agent_charges_enabled: ag?.charges_enabled === true,
        agent_has_connect_account: !!ag?.stripe_connect_account_id,
      };
    });

    return NextResponse.json({
      payouts: enriched,
      period_totals: Array.from(byMonth.values()).sort((a, b) =>
        b.period_month.localeCompare(a.period_month)
      ),
    });
  } catch (err) {
    console.error('[payouts GET] unexpected', err);
    return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 });
  }
}

interface PatchBody {
  payout_id: string;
  action: 'mark_paid' | 'mark_failed' | 'cancel' | 'manual_override' | 'clear_override';
  // mark_paid
  stripe_transfer_id?: string;
  paid_by_method?: 'stripe_connect' | 'manual_wire' | 'other';
  payout_currency?: string;
  fx_rate_used?: number;
  // manual_override
  payout_usd?: number;
  // any action — optional note
  notes?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    if (!body || !body.payout_id || !body.action) {
      return NextResponse.json({ error: 'payout_id and action required' }, { status: 400 });
    }
    if (!UUID_RE.test(body.payout_id)) {
      return NextResponse.json({ error: 'payout_id is not a valid UUID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Load current state.
    const { data: existing } = await supabase
      .from('montree_agent_payouts')
      .select('id, status, is_manual_override, payout_usd')
      .eq('id', body.payout_id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Action dispatch.
    if (body.action === 'mark_paid') {
      if (existing.status === 'paid') {
        return NextResponse.json({ error: 'Already paid' }, { status: 409 });
      }
      const update: Record<string, unknown> = {
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by_method: body.paid_by_method || 'stripe_connect',
      };
      if (body.stripe_transfer_id) update.stripe_transfer_id = body.stripe_transfer_id;
      if (body.payout_currency) update.payout_currency = body.payout_currency;
      if (typeof body.fx_rate_used === 'number') update.fx_rate_used = body.fx_rate_used;
      if (body.notes) update.notes = body.notes;

      const { error } = await supabase
        .from('montree_agent_payouts')
        .update(update)
        .eq('id', body.payout_id);
      if (error) {
        console.error('[payouts PATCH mark_paid]', error);
        return NextResponse.json({ error: 'Failed to mark paid' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'mark_paid' });
    }

    if (body.action === 'mark_failed') {
      // Server-side immutability: don't let a paid row be flipped back. If
      // the Stripe wire actually failed, the wire never went out, so the row
      // shouldn't have been marked paid in the first place. If the wire DID
      // go out but bounced later, that's a different flow — handle manually.
      if (existing.status === 'paid') {
        return NextResponse.json(
          { error: 'Cannot mark a paid payout as failed. Paid history is immutable.' },
          { status: 409 }
        );
      }
      const { error } = await supabase
        .from('montree_agent_payouts')
        .update({ status: 'failed', notes: body.notes || null })
        .eq('id', body.payout_id);
      if (error) {
        console.error('[payouts PATCH mark_failed]', error);
        return NextResponse.json({ error: 'Failed to mark failed' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'mark_failed' });
    }

    if (body.action === 'cancel') {
      if (existing.status === 'paid') {
        return NextResponse.json(
          { error: 'Cannot cancel a paid payout. Paid history is immutable. Issue a refund row instead.' },
          { status: 409 }
        );
      }
      const { error } = await supabase
        .from('montree_agent_payouts')
        .update({ status: 'cancelled', notes: body.notes || null })
        .eq('id', body.payout_id);
      if (error) {
        console.error('[payouts PATCH cancel]', error);
        return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'cancel' });
    }

    if (body.action === 'manual_override') {
      if (typeof body.payout_usd !== 'number' || body.payout_usd < 0) {
        return NextResponse.json({ error: 'payout_usd must be a non-negative number' }, { status: 400 });
      }
      if (existing.status === 'paid') {
        return NextResponse.json(
          { error: 'Cannot override a paid payout. Paid history is immutable.' },
          { status: 409 }
        );
      }
      const { error } = await supabase
        .from('montree_agent_payouts')
        .update({
          payout_usd: body.payout_usd,
          is_manual_override: true,
          notes: body.notes || null,
        })
        .eq('id', body.payout_id);
      if (error) {
        console.error('[payouts PATCH manual_override]', error);
        return NextResponse.json({ error: 'Failed to override' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'manual_override' });
    }

    if (body.action === 'clear_override') {
      if (existing.status === 'paid') {
        return NextResponse.json(
          { error: 'Cannot modify a paid payout.' },
          { status: 409 }
        );
      }
      const { error } = await supabase
        .from('montree_agent_payouts')
        .update({ is_manual_override: false, notes: body.notes || null })
        .eq('id', body.payout_id);
      if (error) {
        console.error('[payouts PATCH clear_override]', error);
        return NextResponse.json({ error: 'Failed to clear override' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'clear_override' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[payouts PATCH] unexpected', err);
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
  }
}
