// /api/montree/super-admin/finance/period-locks
//
// Phase B3 — Period locking management.
//
// GET   — list all locks (for the Money tab UI)
// POST  — close a period.  Body: { period_month: 'YYYY-MM', notes? }
// PATCH — reopen a period. Body: { period_month: 'YYYY-MM', notes: required }
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { listPeriodLocks } from '@/lib/montree/finance/period-lock';

export const dynamic = 'force-dynamic';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const locks = await listPeriodLocks(supabase);
  return NextResponse.json({ locks });
}

export async function POST(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { period_month?: string; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const periodMonth = (body.period_month || '').trim();
  if (!PERIOD_RE.test(periodMonth)) {
    return NextResponse.json(
      { error: 'period_month must be YYYY-MM' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // UPSERT: if row exists with closed_at=NULL (re-closing after reopen), set
  // closed_at = NOW(). If row exists with closed_at set already, fail with 409.
  // If row doesn't exist, insert it.
  const { data: existing } = await supabase
    .from('montree_period_locks')
    .select('period_month, closed_at')
    .eq('period_month', periodMonth)
    .maybeSingle();

  if (existing && (existing as { closed_at: string | null }).closed_at) {
    return NextResponse.json(
      { error: `Period ${periodMonth} is already closed.` },
      { status: 409 }
    );
  }

  const payload = {
    period_month: periodMonth,
    closed_at: now,
    closed_by: 'super_admin',
    notes: body.notes ? String(body.notes).slice(0, 1000) : null,
  };

  const { error } = await supabase
    .from('montree_period_locks')
    .upsert(payload, { onConflict: 'period_month' });

  if (error) {
    if ((error as { code?: string }).code === '42P01') {
      return NextResponse.json(
        { error: 'Migration 206 not yet run — montree_period_locks table missing.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, period_month: periodMonth, closed_at: now });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { period_month?: string; notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const periodMonth = (body.period_month || '').trim();
  if (!PERIOD_RE.test(periodMonth)) {
    return NextResponse.json({ error: 'period_month must be YYYY-MM' }, { status: 400 });
  }

  const notes = (body.notes || '').trim();
  if (!notes) {
    return NextResponse.json(
      {
        error:
          'Notes are required when reopening a closed period (audit trail). Explain why.',
      },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('montree_period_locks')
    .select('period_month, closed_at')
    .eq('period_month', periodMonth)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: `Period ${periodMonth} has no lock record — nothing to reopen.` },
      { status: 404 }
    );
  }
  if (!(existing as { closed_at: string | null }).closed_at) {
    return NextResponse.json(
      { error: `Period ${periodMonth} is already open.` },
      { status: 409 }
    );
  }

  // Preserve the close audit trail in notes by appending the reopen note.
  const { error } = await supabase
    .from('montree_period_locks')
    .update({
      closed_at: null,
      closed_by: null,
      notes: `[REOPENED ${new Date().toISOString()}] ${notes.slice(0, 1000)}`,
    })
    .eq('period_month', periodMonth);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, period_month: periodMonth, reopened: true });
}
