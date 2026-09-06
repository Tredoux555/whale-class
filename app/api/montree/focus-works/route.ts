// app/api/montree/focus-works/route.ts
// API for managing focus works (one work per area per child)
//
// 🚨 montree_child_focus_works is a DERIVED CACHE (2026-09-06, Engine v2).
// The truth about what a child does next is computed by
// lib/montree/tracking/guidance.ts from curriculum sequence + journalled
// status. GET therefore returns the stored row AND the engine's answer for
// that area: `engine` (next work, reason, because, gaps) plus `engine_stale`
// when the stored row no longer matches what the engine would choose. UI can
// keep rendering the stored name; a stale flag is the signal to replan.
//
// GET: Get current focus works for a child (+ engine guidance)
// POST: Set focus work for an area
// DELETE: Remove focus work for an area
// Session 126: Fixed to read env vars at runtime

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { nextWorkByArea, type AreaGuidance } from '@/lib/montree/tracking/guidance';
import { loadGuidanceLedger } from '@/lib/montree/tracking/guidance-ledger';
import { normaliseArea as normaliseAreaKey } from '@/lib/montree/tracking/guidance';

// ============================================
// GET: Get focus works for a child
// ============================================
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    // Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Get all focus works for this child
    const { data: focusWorks, error } = await supabase
      .from('montree_child_focus_works')
      .select('*')
      .eq('child_id', childId);

    if (error) {
      console.error('Error fetching focus works:', error.message, error.code);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    // The engine's answer per area, for the same child. Never fatal: a
    // classroom without curriculum rows yet still gets its stored shelf back.
    let guidance: Record<string, AreaGuidance> = {};
    let classroomId: string | null = null;
    try {
      const { data: childRow } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .maybeSingle();
      classroomId = (childRow?.classroom_id as string) || null;
      if (classroomId) {
        const ledger = await loadGuidanceLedger(supabase, {
          classroomId,
          childIds: [childId],
        });
        guidance = nextWorkByArea(ledger, childId);
      }
    } catch (e) {
      console.error('Focus works: guidance read failed (non-fatal):', e);
    }

    // Build a DB name→chinese map for custom works / works not in static JSON
    // Mirrors the pattern in /api/montree/progress/route.ts so custom works
    // (e.g., "Tri Box 3", "Puzzle of the Horse" added via Photo Audit) show
    // their Chinese names on the shelf when locale is zh.
    const dbChineseMap = new Map<string, string>();
    try {
      if (classroomId) {
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
      }
    } catch {
      // Non-fatal — static enrichment will still work
    }

    // Convert to area -> work mapping, enriched with Chinese names (single pass)
    // Priority: static JSON (getChineseNameForWork) → DB fallback (dbChineseMap)
    const focusByArea: Record<string, any> = {};
    const enrichedRaw = (focusWorks || []).map(fw => {
      let chineseName: string | null = null;
      if (fw.work_name) {
        chineseName = getChineseNameForWork(fw.work_name)
          || dbChineseMap.get(fw.work_name.toLowerCase().trim())
          || null;
      }
      const g = guidance[normaliseAreaKey(fw.area)];
      const engine = g
        ? {
            next_work: g.next?.name ?? null,
            next_work_key: g.next?.work_key ?? null,
            reason: g.reason,
            because: g.because,
            gaps: g.gaps,
          }
        : null;
      const engineStale = !!(
        g?.next && fw.work_name && g.next.name.toLowerCase().trim() !== fw.work_name.toLowerCase().trim()
      );
      focusByArea[fw.area] = {
        id: fw.work_id,
        name: fw.work_name,
        chineseName,
        set_at: fw.set_at,
        set_by: fw.set_by,
        engine,
        engine_stale: engineStale,
      };
      return { ...fw, chineseName, engine, engine_stale: engineStale };
    });

    // Areas the engine can guide but that have no shelf row yet.
    const missing = Object.entries(guidance)
      .filter(([area, g]) => !!g.next && !Object.keys(focusByArea).some((a) => normaliseAreaKey(a) === area))
      .map(([area, g]) => ({
        area,
        next_work: g.next!.name,
        next_work_key: g.next!.work_key,
        reason: g.reason,
        because: g.because,
      }));

    const response = NextResponse.json({
      success: true,
      focus_works: focusByArea,
      raw: enrichedRaw,
      engine_suggestions: missing,
    });
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
    return response;

  } catch (error) {
    console.error('Focus works GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Set focus work for an area
// ============================================
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, area, work_name, set_by } = body;

    if (!child_id || !area || !work_name) {
      return NextResponse.json(
        { success: false, error: 'child_id, area, and work_name are required' },
        { status: 400 }
      );
    }

    // Validate work_name length
    if (typeof work_name !== 'string' || work_name.length > 200) {
      return NextResponse.json(
        { success: false, error: 'work_name must be a string with maximum 200 characters' },
        { status: 400 }
      );
    }

    // Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Validate area
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    if (!validAreas.includes(area)) {
      return NextResponse.json(
        { success: false, error: `Invalid area. Must be one of: ${validAreas.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Upsert focus work (insert or update if exists)
    const { data, error } = await supabase
      .from('montree_child_focus_works')
      .upsert({
        child_id,
        area,
        work_name,
        set_at: new Date().toISOString(),
        set_by: set_by || 'teacher',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'child_id,area',
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting focus work:', error.message, error.code);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      focus_work: data,
    });

  } catch (error) {
    console.error('Focus works POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Remove focus work for an area
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const area = searchParams.get('area');

    if (!childId || !area) {
      return NextResponse.json(
        { success: false, error: 'child_id and area are required' },
        { status: 400 }
      );
    }

    // Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_child_focus_works')
      .delete()
      .eq('child_id', childId)
      .eq('area', area);

    if (error) {
      console.error('Error deleting focus work:', error.message, error.code);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Focus work for ${area} removed`,
    });

  } catch (error) {
    console.error('Focus works DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
