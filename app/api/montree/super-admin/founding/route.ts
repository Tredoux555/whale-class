import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

// Super-admin control surface for the Founding 100.
// GET  → config (cap/wave/is_closed) + admitted/remaining counts + all rows.
// PATCH → set_status (admit/decline/reset a row) OR update_config (cap/wave/is_closed).

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();

    const { data: config } = await supabase
      .from('montree_founding_config')
      .select('cap, wave, is_closed')
      .eq('id', 1)
      .maybeSingle();

    const { data: rows } = await supabase
      .from('montree_founding_waitlist')
      .select('id, school_name, contact_name, email, country, student_count, status, admitted_at, created_at, source')
      .order('created_at', { ascending: false })
      .limit(2000);

    const cap = config?.cap ?? 100;
    const admitted = (rows || []).filter((r) => r.status === 'admitted').length;

    return NextResponse.json(
      {
        config: { cap, wave: config?.wave ?? 1, is_closed: config?.is_closed ?? false },
        admitted,
        remaining: Math.max(0, cap - admitted),
        total: (rows || []).length,
        rows: rows || [],
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[super-admin/founding GET] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'set_status') {
      const { id, status } = body;
      if (!id || !['waitlisted', 'admitted', 'declined'].includes(status)) {
        return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 });
      }
      const { error } = await supabase
        .from('montree_founding_waitlist')
        .update({
          status,
          admitted_at: status === 'admitted' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update_config') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (Number.isFinite(Number(body.cap))) patch.cap = Math.max(0, Math.round(Number(body.cap)));
      if (Number.isFinite(Number(body.wave))) patch.wave = Math.max(1, Math.round(Number(body.wave)));
      if (typeof body.is_closed === 'boolean') patch.is_closed = body.is_closed;
      const { error } = await supabase
        .from('montree_founding_config')
        .update(patch as never)
        .eq('id', 1);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[super-admin/founding PATCH] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
