// app/api/montree/paper-scan/layouts/[id]/route.ts
//
// One learned sheet layout: read it in full, activate it, retire it, or save
// the teacher's corrections to it (plan §3).
//
//   PATCH { action: 'activate' }  → this profile reads every future scan of
//                                   its classroom; any other active profile
//                                   for that classroom is retired first (the
//                                   partial unique index is the backstop).
//   PATCH { action: 'retire' }    → back to the generic reader.
//   PATCH { action: 'edit', profile, name? } → source becomes 'edited',
//                                   version + 1. A teacher fixing a legend
//                                   line is the cheapest accuracy win here.
//
// Nothing is deleted: a retired profile stays as history, exactly like a
// committed scan.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { layoutRowToSummary, normaliseLayoutProfile } from '@/lib/montree/paper-scan/layout-learner';
import { PAPER_SCAN_FEATURE_KEY } from '@/lib/montree/paper-scan/types';
import type { SheetLayoutRow } from '@/lib/montree/paper-scan/layout-types';

const NAME_MAX = 120;

async function loadRow(supabase: ReturnType<typeof getSupabase>, id: string, schoolId: string) {
  const { data } = await supabase
    .from('montree_sheet_layouts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data) return { row: null, denied: false };
  if ((data as SheetLayoutRow).school_id !== schoolId) return { row: null, denied: true };
  return { row: data as SheetLayoutRow, denied: false };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { row, denied } = await loadRow(supabase, id, auth.schoolId);
    if (denied) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    if (!row) return NextResponse.json({ success: false, error: 'Layout not found' }, { status: 404 });

    return NextResponse.json({ success: true, layout: layoutRowToSummary(row), profile: row.profile });
  } catch (error) {
    console.error('[PaperScan] Layout read error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load the sheet layout' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    if (!(await isFeatureEnabled(supabase, auth.schoolId, PAPER_SCAN_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;
    if (!action || !['activate', 'retire', 'edit'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be activate, retire or edit' },
        { status: 400 }
      );
    }

    const { row, denied } = await loadRow(supabase, id, auth.schoolId);
    if (denied) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    if (!row) return NextResponse.json({ success: false, error: 'Layout not found' }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === 'activate') {
      // One active profile per classroom. Retire the incumbent first — the
      // unique partial index would otherwise reject this update.
      const retire = supabase
        .from('montree_sheet_layouts')
        .update({ status: 'retired', updated_at: new Date().toISOString() })
        .eq('school_id', auth.schoolId)
        .eq('status', 'active')
        .neq('id', row.id);
      const { error: retireError } = row.classroom_id
        ? await retire.eq('classroom_id', row.classroom_id)
        : await retire.is('classroom_id', null);
      if (retireError) {
        console.error('[PaperScan] Layout retire-incumbent error:', retireError.message);
        return NextResponse.json({ success: false, error: 'Could not activate the sheet layout' }, { status: 500 });
      }
      update.status = 'active';
    } else if (action === 'retire') {
      update.status = 'retired';
    } else {
      const profile = normaliseLayoutProfile((body as { profile?: unknown }).profile, row.name);
      if (!profile) {
        return NextResponse.json({ success: false, error: 'profile is required for an edit' }, { status: 400 });
      }
      update.profile = profile;
      update.source = 'edited';
      update.version = (row.version || 1) + 1;
      update.template_code = profile.machine_marks?.template_code || null;
      const name = (body as { name?: string }).name;
      if (typeof name === 'string' && name.trim()) update.name = name.trim().slice(0, NAME_MAX);
    }

    const { data: updated, error } = await supabase
      .from('montree_sheet_layouts')
      .update(update)
      .eq('id', row.id)
      .eq('school_id', auth.schoolId)
      .select('*')
      .maybeSingle();

    if (error || !updated) {
      console.error('[PaperScan] Layout update error:', error?.message);
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, layout: layoutRowToSummary(updated as SheetLayoutRow) });
  } catch (error) {
    console.error('[PaperScan] Layout PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update the sheet layout' }, { status: 500 });
  }
}
