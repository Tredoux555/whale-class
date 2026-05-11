// /api/montree/super-admin/finance/ledger/route.ts
// Phase 6.5 — read + manual-write surface for montree_finance_transactions.
//
// GET: list rows. Filterable by type, category, period (YYYY-MM), source.
//      Returns rows + per-type totals so the Money tab can render P&L summary.
//
// POST: manual entry (op_expense rows only via this route — income / direct_cost
//       come from Stripe webhook and aggregator respectively).
//
// DELETE: remove a manual-entry op_expense row. ONLY for type='op_expense' AND
//         source='manual_entry'. Webhook + aggregator rows are immutable.
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TYPES = ['income', 'direct_cost', 'commission', 'op_expense', 'fx_adjustment'] as const;
type LedgerType = (typeof VALID_TYPES)[number];

interface LedgerRow {
  id: string;
  occurred_at: string;
  type: LedgerType;
  category: string;
  description: string;
  school_id: string | null;
  agent_id: string | null;
  agent_payout_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  stripe_transfer_id: string | null;
  original_currency: string;
  original_amount: number;
  fx_rate: number;
  usd_amount: number;
  source: string;
  source_ref: string | null;
  created_at: string;
  notes: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function monthRangeStartEnd(periodMonth: string): { start: string; end: string } | null {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) return null;
  const [y, m] = periodMonth.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const categoryFilter = searchParams.get('category');
    const periodMonth = searchParams.get('period_month');
    const sourceFilter = searchParams.get('source');
    const schoolIdFilter = searchParams.get('school_id');
    const agentIdFilter = searchParams.get('agent_id');

    let q = supabase
      .from('montree_finance_transactions')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(1000);

    if (typeFilter && (VALID_TYPES as readonly string[]).includes(typeFilter)) {
      q = q.eq('type', typeFilter);
    }
    if (categoryFilter) {
      q = q.eq('category', categoryFilter);
    }
    if (periodMonth) {
      const range = monthRangeStartEnd(periodMonth);
      if (!range) {
        return NextResponse.json({ error: 'Invalid period_month' }, { status: 400 });
      }
      q = q.gte('occurred_at', range.start).lt('occurred_at', range.end);
    }
    if (sourceFilter) q = q.eq('source', sourceFilter);
    if (schoolIdFilter && UUID_RE.test(schoolIdFilter)) q = q.eq('school_id', schoolIdFilter);
    if (agentIdFilter && UUID_RE.test(agentIdFilter)) q = q.eq('agent_id', agentIdFilter);

    const { data, error } = await q;
    if (error) {
      console.error('[ledger GET]', error);
      return NextResponse.json({ error: 'Failed to load ledger' }, { status: 500 });
    }
    const rows = (data || []) as LedgerRow[];

    // Per-type totals for the filtered view. The Money tab uses these to
    // render the P&L: income - direct_cost - commission - op_expense = margin.
    const totalsByType: Record<string, { count: number; usd: number }> = {};
    for (const r of rows) {
      const t = r.type as string;
      const amt = Number(r.usd_amount) || 0;
      if (!totalsByType[t]) totalsByType[t] = { count: 0, usd: 0 };
      totalsByType[t].count += 1;
      totalsByType[t].usd += amt;
    }
    // Round totals to 4dp.
    Object.keys(totalsByType).forEach((t) => {
      totalsByType[t].usd = Math.round(totalsByType[t].usd * 10000) / 10000;
    });

    // P&L summary: income (sum) - all costs = margin.
    // Note that commissions are an OUTPUT — they're real cash leaving the bank
    // so they reduce margin even though they're already netted out of agent
    // share calculations.
    const income = totalsByType.income?.usd || 0;
    const directCost = totalsByType.direct_cost?.usd || 0;
    const commission = totalsByType.commission?.usd || 0;
    const opExpense = totalsByType.op_expense?.usd || 0;
    const fxAdj = totalsByType.fx_adjustment?.usd || 0;
    const margin = income - directCost - commission - opExpense + fxAdj;

    return NextResponse.json({
      rows,
      totals_by_type: totalsByType,
      pnl: {
        income: Math.round(income * 10000) / 10000,
        direct_cost: Math.round(directCost * 10000) / 10000,
        commission: Math.round(commission * 10000) / 10000,
        op_expense: Math.round(opExpense * 10000) / 10000,
        fx_adjustment: Math.round(fxAdj * 10000) / 10000,
        margin: Math.round(margin * 10000) / 10000,
      },
    });
  } catch (err) {
    console.error('[ledger GET] unexpected', err);
    return NextResponse.json({ error: 'Failed to load ledger' }, { status: 500 });
  }
}

// ── POST (manual op_expense entry) ──────────────────────────────────────────

interface PostBody {
  // Defaults to 'op_expense' for backward compat. Explicit 'fx_adjustment'
  // allowed for currency drift entries (Stripe USD → Airwallex HKD wire delta).
  type?: 'op_expense' | 'fx_adjustment';
  category: string;
  description: string;
  // For op_expense: positive cost magnitude.
  // For fx_adjustment: can be NEGATIVE if the wire landed LESS than spot
  // estimate (FX loss) or POSITIVE if better than spot (FX gain).
  usd_amount: number;
  occurred_at?: string; // ISO; defaults to now
  notes?: string;
}

const OP_EXPENSE_CATEGORIES = [
  'hosting',
  'domain',
  'email_service',
  'supabase',
  'design_tools',
  'ai_tooling',
  'corporate_sec',
  'marketing',
  'professional_fees',
  'other_op_expense',
];

const FX_ADJUSTMENT_CATEGORIES = [
  'wire_fx_delta', // Stripe USD wire → Airwallex HKD diff from spot estimate
  'rate_revaluation', // month-end USD-held-balance revaluation to local books
  'other_fx_adjustment',
];

export async function POST(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as PostBody | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const txType = body.type === 'fx_adjustment' ? 'fx_adjustment' : 'op_expense';

    if (!body.category || !body.description || typeof body.usd_amount !== 'number') {
      return NextResponse.json(
        { error: 'category, description, usd_amount required' },
        { status: 400 }
      );
    }
    if (txType === 'op_expense' && body.usd_amount <= 0) {
      return NextResponse.json(
        { error: 'op_expense usd_amount must be positive (cost magnitude)' },
        { status: 400 }
      );
    }
    if (txType === 'fx_adjustment' && body.usd_amount === 0) {
      return NextResponse.json(
        { error: 'fx_adjustment usd_amount must be non-zero (positive for gain, negative for loss)' },
        { status: 400 }
      );
    }

    const validCategories = txType === 'op_expense' ? OP_EXPENSE_CATEGORIES : FX_ADJUSTMENT_CATEGORIES;
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Unknown ${txType} category. Valid: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const occurredAt = body.occurred_at || new Date().toISOString();
    if (Number.isNaN(Date.parse(occurredAt))) {
      return NextResponse.json({ error: 'occurred_at invalid' }, { status: 400 });
    }

    const supabase = getSupabase();
    const usd = Math.round(body.usd_amount * 10000) / 10000;

    const { data, error } = await supabase
      .from('montree_finance_transactions')
      .insert({
        occurred_at: occurredAt,
        type: txType,
        category: body.category,
        description: body.description.slice(0, 500),
        original_currency: 'USD',
        original_amount: usd,
        fx_rate: 1.0,
        usd_amount: usd,
        source: 'manual_entry',
        source_ref: null, // manual entries don't need source_ref
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[ledger POST]', error);
      return NextResponse.json({ error: 'Failed to insert' }, { status: 500 });
    }

    return NextResponse.json({ success: true, row: data }, { status: 201 });
  } catch (err) {
    console.error('[ledger POST] unexpected', err);
    return NextResponse.json({ error: 'Failed to insert' }, { status: 500 });
  }
}

// ── DELETE (manual op_expense removal) ──────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rowId = searchParams.get('id');
    if (!rowId || !UUID_RE.test(rowId)) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Look up row to confirm it's a manual op_expense — refuse to delete
    // webhook / aggregator / commission rows (immutable audit trail).
    const { data: existing } = await supabase
      .from('montree_finance_transactions')
      .select('id, type, source')
      .eq('id', rowId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }
    const row = existing as { type: string; source: string };
    // Only op_expense + fx_adjustment manual rows are deletable. Income +
    // direct_cost + commission are immutable history.
    if (row.type !== 'op_expense' && row.type !== 'fx_adjustment') {
      return NextResponse.json(
        { error: 'Only op_expense and fx_adjustment rows can be deleted. Income/direct_cost/commission are immutable.' },
        { status: 403 }
      );
    }
    if (row.source !== 'manual_entry') {
      return NextResponse.json(
        { error: 'Only manual_entry rows can be deleted via this route.' },
        { status: 403 }
      );
    }

    const { error: delErr } = await supabase
      .from('montree_finance_transactions')
      .delete()
      .eq('id', rowId);

    if (delErr) {
      console.error('[ledger DELETE]', delErr);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ledger DELETE] unexpected', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
