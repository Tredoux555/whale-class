// app/api/montree/weekly-admin-docs/monthly-auto-fill/route.ts
//
// GET: Auto-generate per-child Language Monthly Summary paragraphs from
//      confirmed photos + montree_child_progress, for the period
//      [month_start, today]. Returns JSON for the WeeklyAdminTab to render
//      into editable textareas.
//
// Pipeline matches Session 74's one-off Python generator end-to-end, plus
// the format polishing iterated in Session 135 (comma vs and, malformed
// work names, etc.). The PURE format logic lives in
// `lib/montree/weekly-admin/monthly-summary-builder.ts` so this route is
// concerned only with fetching the inputs.
//
// 🚨 Cost: ZERO AI calls. Deterministic format, sub-second response.
// 🚨 Auth: school-scoped via verifySchoolRequest.
// 🚨 Feature-gated: weekly_admin_docs.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import {
  buildChildSummaryParagraph,
  type ChildSummaryInput,
  type WorkRef,
} from '@/lib/montree/weekly-admin/monthly-summary-builder';

export const maxDuration = 60;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Parse YYYY-MM-DD as the 1st of a month (anchor for monthly summary).
 * Returns null if invalid OR not the 1st.
 */
function parseMonthStart(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== 1) return null;
  return d;
}

function endOfPeriodExclusive(monthStart: Date): Date {
  // Cap the end at "today + 1d" so the period is inclusive of today, exclusive
  // of tomorrow. For a current month this gives "from 1st to today." For a
  // past month, we cap at the 1st of the NEXT month.
  const now = new Date();
  const todayPlus1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 1st of next month
  const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  return todayPlus1 < nextMonth ? todayPlus1 : nextMonth;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Feature gate
  if (!await isFeatureEnabled(getSupabase(), auth.schoolId, 'weekly_admin_docs')) {
    return NextResponse.json({ error: 'Weekly admin docs feature is not enabled' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id') || auth.classroomId;
    const monthStartStr = searchParams.get('month_start');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }
    const monthStart = parseMonthStart(monthStartStr);
    if (!monthStart) {
      return NextResponse.json(
        { error: 'month_start required (YYYY-MM-01)' },
        { status: 400 }
      );
    }

    // Sanity: not in the far future
    const now = new Date();
    if (monthStart.getTime() > now.getTime() + 60 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'month_start cannot be that far in the future' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify classroom belongs to teacher's school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id, name')
      .eq('id', classroomId)
      .maybeSingle();
    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const periodEnd = endOfPeriodExclusive(monthStart);
    const periodStartStr = ymd(monthStart);
    const periodEndStr = ymd(periodEnd);
    const monthName = MONTH_NAMES[monthStart.getUTCMonth()];
    const monthLabel = `${monthName} ${monthStart.getUTCFullYear()}`;

    // Step 1: children + Language area + Language works
    const [childrenRes, areaRes] = await Promise.all([
      supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroomId)
        .eq('area_key', 'language')
        .maybeSingle(),
    ]);

    if (childrenRes.error) {
      console.error('monthly-auto-fill children error:', childrenRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }
    if (areaRes.error) {
      console.error('monthly-auto-fill area error:', areaRes.error.message);
    }
    const langAreaId = areaRes.data?.id;
    const children = sortChildrenByCustomOrder(childrenRes.data || []);

    if (children.length === 0 || !langAreaId) {
      return NextResponse.json({
        month_label: monthLabel,
        month_name: monthName,
        period_start: periodStartStr,
        period_end: periodEndStr,
        classroom_name: classroom.name,
        children: [],
      });
    }

    const childIds = children.map(c => c.id);

    // Step 2: Language curriculum works, period photos, all-time photos, progress, junctions
    const [worksRes, periodPhotosRes, allPhotosRes, progressRes] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, sequence')
        .eq('classroom_id', classroomId)
        .eq('area_id', langAreaId)
        .order('sequence', { ascending: true }),
      supabase
        .from('montree_media')
        .select('id, child_id, work_id, captured_at')
        .eq('classroom_id', classroomId)
        .eq('teacher_confirmed', true)
        .gte('captured_at', periodStartStr)
        .lt('captured_at', periodEndStr),
      // All-time confirmed photos — used for "N Language works on record"
      // and for the touched-set in the recommendation algorithm.
      supabase
        .from('montree_media')
        .select('id, child_id, work_id')
        .eq('classroom_id', classroomId)
        .eq('teacher_confirmed', true),
      supabase
        .from('montree_child_progress')
        .select('child_id, work_name, status, updated_at')
        .eq('area', 'language')
        .in('child_id', childIds),
    ]);

    if (worksRes.error) {
      console.error('monthly-auto-fill works error:', worksRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
    }
    if (periodPhotosRes.error) {
      console.error('monthly-auto-fill periodPhotos error:', periodPhotosRes.error.message);
    }
    if (allPhotosRes.error) {
      console.error('monthly-auto-fill allPhotos error:', allPhotosRes.error.message);
    }
    if (progressRes.error) {
      console.error('monthly-auto-fill progress error:', progressRes.error.message);
    }

    const works = (worksRes.data || []) as Array<{ id: string; name: string; sequence: number | null }>;
    const langWorkIds = new Set(works.map(w => w.id));
    const workIdToName = new Map(works.map(w => [w.id, w.name]));
    const curriculum: WorkRef[] = works.map(w => ({
      id: w.id,
      name: w.name,
      sequence: w.sequence ?? 0,
    }));

    // Filter photos to Language work_id only
    const periodPhotos = (periodPhotosRes.data || []).filter(p => p.work_id && langWorkIds.has(p.work_id));
    const allPhotos = (allPhotosRes.data || []).filter(p => p.work_id && langWorkIds.has(p.work_id));

    // Step 3: junction rows for the photos we care about — group photos via
    // montree_media_children link work to multiple children
    const periodMediaIds = periodPhotos.map(p => p.id);
    const allMediaIds = allPhotos.map(p => p.id);

    const [periodJunctionRes, allJunctionRes] = await Promise.all([
      periodMediaIds.length > 0
        ? supabase
            .from('montree_media_children')
            .select('media_id, child_id')
            .in('media_id', periodMediaIds)
        : Promise.resolve({ data: [], error: null }),
      allMediaIds.length > 0
        ? supabase
            .from('montree_media_children')
            .select('media_id, child_id')
            .in('media_id', allMediaIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (periodJunctionRes.error) {
      console.error('monthly-auto-fill periodJunction error:', periodJunctionRes.error.message);
    }
    if (allJunctionRes.error) {
      console.error('monthly-auto-fill allJunction error:', allJunctionRes.error.message);
    }

    // Build per-child period sessions (workId, mediaId) set
    const periodPhotoById = new Map(periodPhotos.map(p => [p.id, p]));
    const childPeriodSessions = new Map<string, Map<string, Set<string>>>();
    const seedChild = (cid: string) => {
      if (!childPeriodSessions.has(cid)) {
        childPeriodSessions.set(cid, new Map());
      }
      return childPeriodSessions.get(cid)!;
    };
    const recordSession = (cid: string, workId: string, mediaId: string) => {
      const inner = seedChild(cid);
      if (!inner.has(workId)) inner.set(workId, new Set());
      inner.get(workId)!.add(mediaId);
    };
    for (const p of periodPhotos) {
      if (p.child_id && p.work_id) recordSession(p.child_id, p.work_id, p.id);
    }
    for (const j of (periodJunctionRes.data || []) as Array<{ media_id: string; child_id: string }>) {
      const photo = periodPhotoById.get(j.media_id);
      if (photo && photo.work_id) recordSession(j.child_id, photo.work_id, j.media_id);
    }

    // Build per-child all-time touched work IDs
    const allPhotoById = new Map(allPhotos.map(p => [p.id, p]));
    const childAlltimeWorks = new Map<string, Set<string>>();
    const recordTouch = (cid: string, workId: string) => {
      if (!childAlltimeWorks.has(cid)) childAlltimeWorks.set(cid, new Set());
      childAlltimeWorks.get(cid)!.add(workId);
    };
    for (const p of allPhotos) {
      if (p.child_id && p.work_id) recordTouch(p.child_id, p.work_id);
    }
    for (const j of (allJunctionRes.data || []) as Array<{ media_id: string; child_id: string }>) {
      const photo = allPhotoById.get(j.media_id);
      if (photo && photo.work_id) recordTouch(j.child_id, photo.work_id);
    }

    // Bucket progress rows per child
    const progressRows = (progressRes.data || []) as Array<{
      child_id: string;
      work_name: string;
      status: string;
      updated_at: string | null;
    }>;
    const childMastered = new Map<string, Array<{ workName: string; updatedAt: string }>>();
    const childPracticing = new Map<string, Array<{ workName: string; updatedAt: string }>>();
    const childTouchedNamesLower = new Map<string, Set<string>>();
    const seedTouchedNames = (cid: string) => {
      if (!childTouchedNamesLower.has(cid)) childTouchedNamesLower.set(cid, new Set());
      return childTouchedNamesLower.get(cid)!;
    };

    for (const r of progressRows) {
      const name = (r.work_name || '').trim();
      if (!name) continue;
      const updatedAt = r.updated_at || '';
      seedTouchedNames(r.child_id).add(name.toLowerCase());
      if (r.status === 'mastered') {
        if (!childMastered.has(r.child_id)) childMastered.set(r.child_id, []);
        childMastered.get(r.child_id)!.push({ workName: name, updatedAt });
      } else if (r.status === 'practicing') {
        if (!childPracticing.has(r.child_id)) childPracticing.set(r.child_id, []);
        childPracticing.get(r.child_id)!.push({ workName: name, updatedAt });
      }
    }
    // Photo-touched works also feed touched names (used for recommendation)
    for (const [cid, workIds] of childAlltimeWorks.entries()) {
      const set = seedTouchedNames(cid);
      for (const wid of workIds) {
        const name = workIdToName.get(wid);
        if (name) set.add(name.trim().toLowerCase());
      }
    }

    // Build per-child summaries
    const childResults = children.map(child => {
      const sessionsMap = childPeriodSessions.get(child.id) || new Map();
      const sessions: Array<{ workId: string; workName: string }> = [];
      for (const [workId, mediaIds] of sessionsMap.entries()) {
        const workName = workIdToName.get(workId) || 'Unknown';
        for (let i = 0; i < mediaIds.size; i++) {
          sessions.push({ workId, workName });
        }
      }
      const input: ChildSummaryInput = {
        childId: child.id,
        childName: child.name,
        sessions,
        mastered: childMastered.get(child.id) || [],
        practicing: childPracticing.get(child.id) || [],
        alltimeWorksCount: (childAlltimeWorks.get(child.id) || new Set()).size,
        touchedWorkNamesLower: childTouchedNamesLower.get(child.id) || new Set(),
      };
      const body = buildChildSummaryParagraph(input, {
        monthName,
        curriculum,
      });
      return {
        childId: child.id,
        childName: child.name,
        body,
      };
    });

    return NextResponse.json({
      month_label: monthLabel,
      month_name: monthName,
      period_start: periodStartStr,
      period_end: periodEndStr,
      classroom_name: classroom.name,
      children: childResults,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('monthly-auto-fill exception:', err);
    return NextResponse.json({ error: 'Failed to auto-fill' }, { status: 500 });
  }
}
