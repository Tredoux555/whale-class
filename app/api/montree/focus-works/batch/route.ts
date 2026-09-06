// app/api/montree/focus-works/batch/route.ts
// Batch endpoint: fetch ALL children + their focus works for a classroom
// Used by classroom-overview print page
//
// 🚨 The shelf rows are a DERIVED CACHE (2026-09-06, Engine v2): each child's
// per-area entry now carries the engine's answer alongside the stored name —
// `engine` ({next_work, reason, because}) and `engine_stale` when the stored
// row is not what lib/montree/tracking/guidance.ts would choose today. ONE
// ledger is loaded for the whole classroom, so this stays a single pass.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { nextWorkByArea, normaliseArea, type AreaGuidance } from '@/lib/montree/tracking/guidance';
import { loadGuidanceLedger } from '@/lib/montree/tracking/guidance-ledger';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'classroom_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify the classroom belongs to the authenticated user's school
    // auth.classroomId is optional in JWT (principals may not have one)
    // so verify via DB: classroom must belong to the same school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 1. Fetch all children in this classroom (sorted by name)
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('classroom_id', classroomId)
      // Archived children are off the roster — no focus-works row for them.
      // .neq(false) not .eq(true): legacy rows can hold NULL.
      .neq('is_active', false)
      .order('name', { ascending: true });

    if (childErr) {
      console.error('Batch focus-works: children query error:', childErr.message);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        success: true,
        children: [],
      });
    }

    const childIds = children.map(c => c.id);

    // 2. Fetch ALL focus works for all children in a single query
    const { data: allFocusWorks, error: fwErr } = await supabase
      .from('montree_child_focus_works')
      .select('child_id, area, work_name, set_at')
      .in('child_id', childIds);

    if (fwErr) {
      console.error('Batch focus-works: focus works query error:', fwErr.message);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    // 2b. The engine's answer for every child in this classroom — one ledger,
    // one pass. Never fatal: the print page must render without it.
    const guidanceByChild = new Map<string, Record<string, AreaGuidance>>();
    try {
      const ledger = await loadGuidanceLedger(supabase, { classroomId, childIds });
      for (const id of childIds) {
        guidanceByChild.set(id, nextWorkByArea(ledger, id));
      }
    } catch (e) {
      console.error('Batch focus-works: guidance read failed (non-fatal):', e);
    }

    // 3a. Build a DB name→chinese map for custom works / works not in static JSON
    // Mirrors focus-works/route.ts and progress/route.ts so custom works
    // (e.g., "Tri Box 3", "Puzzle of the Horse") show Chinese names on the
    // classroom-overview print page when locale is zh.
    const dbChineseMap = new Map<string, string>();
    try {
      const { data: currWorks } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name, name_chinese')
        .eq('classroom_id', classroomId)
        .not('name_chinese', 'is', null);

      for (const w of (currWorks || []) as Array<{ name: string; name_chinese: string | null }>) {
        if (w.name_chinese && w.name) {
          dbChineseMap.set(w.name.toLowerCase().trim(), w.name_chinese);
        }
      }
    } catch {
      // Non-fatal — static enrichment will still work
    }

    // 3b. Group focus works by child_id, enriched with Chinese names
    // Priority: static JSON (getChineseNameForWork) → DB fallback (dbChineseMap)
    type FocusCell = {
      name: string;
      chineseName: string | null;
      engine: { next_work: string | null; reason: string; because: string } | null;
      engine_stale: boolean;
    };
    const focusByChild: Record<string, Record<string, FocusCell>> = {};
    for (const fw of allFocusWorks || []) {
      if (!focusByChild[fw.child_id]) focusByChild[fw.child_id] = {};
      let chineseName: string | null = null;
      if (fw.work_name) {
        chineseName = getChineseNameForWork(fw.work_name)
          || dbChineseMap.get(fw.work_name.toLowerCase().trim())
          || null;
      }
      const g = guidanceByChild.get(fw.child_id)?.[normaliseArea(fw.area)];
      focusByChild[fw.child_id][fw.area] = {
        name: fw.work_name,
        chineseName,
        engine: g
          ? { next_work: g.next?.name ?? null, reason: g.reason, because: g.because }
          : null,
        engine_stale: !!(
          g?.next && fw.work_name &&
          g.next.name.toLowerCase().trim() !== fw.work_name.toLowerCase().trim()
        ),
      };
    }

    // 5. Build response — each child with their focus works by area
    const result = children.map(child => ({
      id: child.id,
      name: child.name,
      photo_url: child.photo_url,
      focus_works: focusByChild[child.id] || {},
    }));

    const response = NextResponse.json({
      success: true,
      children: result,
    });
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
    return response;

  } catch (error) {
    console.error('Batch focus-works error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
