// app/api/montree/paper-scan/layouts/route.ts
//
// GET → the sheet layout profiles this classroom can read with (plan §3).
// Returns every stored profile for the classroom plus its school-wide ones,
// and the built-in Montree Standard v1 (which has no DB row — id is null).
//
// `active` is the profile the next scan will actually use, or null when the
// classroom has taught Montree nothing and the page is read generically.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { PAPER_SCAN_FEATURE_KEY } from '@/lib/montree/paper-scan/types';
import { layoutRowToSummary, summariseLayoutProfile } from '@/lib/montree/paper-scan/layout-learner';
import { pickActiveLayoutRow } from '@/lib/montree/paper-scan/layout-resolver';
import { MONTREE_STANDARD_V1, MONTREE_STANDARD_V1_NAME } from '@/lib/montree/paper-scan/layouts/montree-standard-v1';
import { SHEET_TEMPLATE_CODE } from '@/lib/montree/paper-scan/sheet-template';
import type { SheetLayoutRow, SheetLayoutSummary } from '@/lib/montree/paper-scan/layout-types';

export const dynamic = 'force-dynamic';

/**
 * The built-in profile, in the same shape the stored ones come back in.
 * NOT exported: a Next route module may only export route handlers and the
 * sanctioned config fields, and the build type-checks that.
 */
function builtinSummary(): SheetLayoutSummary {
  return {
    id: null,
    name: MONTREE_STANDARD_V1_NAME,
    source: 'builtin',
    status: 'draft',
    version: 1,
    template_code: SHEET_TEMPLATE_CODE,
    created_at: null,
    summary: summariseLayoutProfile(MONTREE_STANDARD_V1),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    if (!(await isFeatureEnabled(supabase, auth.schoolId, PAPER_SCAN_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const classroomId = request.nextUrl.searchParams.get('classroom_id') || auth.classroomId || '';
    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
    }

    // The classroom must belong to the caller's school — every row below is
    // filtered on school_id too, this stops a cross-school id being probed.
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (!classroom) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('montree_sheet_layouts')
      .select('*')
      .eq('school_id', auth.schoolId)
      .or(`classroom_id.eq.${classroomId},classroom_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      // 336 not applied here yet — the built-in profile is still available.
      console.warn('[PaperScan] Layout list unavailable:', error.message);
      return NextResponse.json({ success: true, layouts: [builtinSummary()], active: null });
    }

    const rows = (data || []) as SheetLayoutRow[];
    const usable = rows.filter((r) => r.profile && typeof r.profile === 'object');
    const active = pickActiveLayoutRow(usable, classroomId);

    return NextResponse.json({
      success: true,
      layouts: [...usable.map(layoutRowToSummary), builtinSummary()],
      active: active ? layoutRowToSummary(active) : null,
    });
  } catch (error) {
    console.error('[PaperScan] Layout list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load sheet layouts' }, { status: 500 });
  }
}
