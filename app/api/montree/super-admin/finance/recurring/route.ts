// /api/montree/super-admin/finance/recurring/route.ts
// CRUD for recurring op-expense templates.
//
// GET    — list all templates (active + inactive)
// POST   — create a new template
// PATCH  — update one field (is_active toggle, amount, description, etc.)
// DELETE — remove a template (history rows in finance_tx remain)
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

interface RecurringRow {
  id: string;
  category: string;
  description: string;
  usd_amount: number;
  day_of_month: number;
  last_fired_period_month: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_recurring_op_expenses')
      .select('*')
      .order('is_active', { ascending: false })
      .order('day_of_month', { ascending: true });

    if (error) {
      console.error('[recurring GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: (data || []) as RecurringRow[] });
  } catch (err) {
    console.error('[recurring GET] unexpected', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

interface PostBody {
  category: string;
  description: string;
  usd_amount: number;
  day_of_month?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as PostBody | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    if (!body.category || !OP_EXPENSE_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${OP_EXPENSE_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!body.description || !body.description.trim()) {
      return NextResponse.json({ error: 'description required' }, { status: 400 });
    }
    if (typeof body.usd_amount !== 'number' || body.usd_amount <= 0) {
      return NextResponse.json({ error: 'usd_amount must be positive' }, { status: 400 });
    }
    const day = body.day_of_month ?? 1;
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      return NextResponse.json({ error: 'day_of_month must be 1-28' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_recurring_op_expenses')
      .insert({
        category: body.category,
        description: body.description.trim().slice(0, 500),
        usd_amount: Math.round(body.usd_amount * 10000) / 10000,
        day_of_month: day,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[recurring POST]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, row: data }, { status: 201 });
  } catch (err) {
    console.error('[recurring POST] unexpected', err);
    return NextResponse.json({ error: 'Failed to insert' }, { status: 500 });
  }
}

interface PatchBody {
  id: string;
  category?: string;
  description?: string;
  usd_amount?: number;
  day_of_month?: number;
  is_active?: boolean;
  notes?: string | null;
}

export async function PATCH(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    if (!body || !body.id || !UUID_RE.test(body.id)) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.category !== undefined) {
      if (!OP_EXPENSE_CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updates.category = body.category;
    }
    if (body.description !== undefined) {
      if (!body.description.trim()) {
        return NextResponse.json({ error: 'description cannot be empty' }, { status: 400 });
      }
      updates.description = body.description.trim().slice(0, 500);
    }
    if (body.usd_amount !== undefined) {
      if (body.usd_amount <= 0) {
        return NextResponse.json({ error: 'usd_amount must be positive' }, { status: 400 });
      }
      updates.usd_amount = Math.round(body.usd_amount * 10000) / 10000;
    }
    if (body.day_of_month !== undefined) {
      const d = body.day_of_month;
      if (!Number.isInteger(d) || d < 1 || d > 28) {
        return NextResponse.json({ error: 'day_of_month must be 1-28' }, { status: 400 });
      }
      updates.day_of_month = d;
    }
    if (body.is_active !== undefined) updates.is_active = !!body.is_active;
    if (body.notes !== undefined) updates.notes = body.notes ? body.notes.trim() : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_recurring_op_expenses')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('[recurring PATCH]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, row: data });
  } catch (err) {
    console.error('[recurring PATCH] unexpected', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400 });
    }
    const supabase = getSupabase();
    const { error } = await supabase
      .from('montree_recurring_op_expenses')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[recurring DELETE]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[recurring DELETE] unexpected', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
