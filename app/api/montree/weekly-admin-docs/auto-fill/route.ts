// app/api/montree/weekly-admin-docs/auto-fill/route.ts
// GET: Returns auto-generated suggestions for Weekly Summary + Plan
// from progress data + focus works. Teacher reviews and edits before saving.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

interface FocusWorkRow {
  child_id: string;
  area: string;
  work_name: string;
}

interface ChildSuggestion {
  childId: string;
  childName: string;
  summaryEnglish: string;
  planAreas: Record<string, string>;
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
    const weekStart = searchParams.get('week_start');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'week_start required' }, { status: 400 });
    }

    // Validate weekStart is a Monday
    const parsed = new Date(`${weekStart}T00:00:00Z`);
    if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
      return NextResponse.json({ error: 'week_start must be a valid Monday date' }, { status: 400 });
    }

    // Validate not too far in future (allow +1 week for plan preparation)
    const now = new Date();
    const todayBeijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentMonday = getBeijingMonday(todayBeijing);
    const nextMondayStr = getNextMonday(currentMonday);
    if (weekStart > nextMondayStr) {
      return NextResponse.json({ error: 'week_start cannot be more than 1 week in the future' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to teacher's school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate week boundaries
    const weekEnd = new Date(parsed.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Step 1: Fetch children first (need IDs for subsequent queries)
    const childrenRes = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (childrenRes.error) {
      console.error('auto-fill: children error:', childrenRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    const children = childrenRes.data || [];
    if (children.length === 0) {
      return NextResponse.json(
        { children: [] },
        { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
      );
    }

    const childIds = children.map((c: { id: string }) => c.id);
    const childIdSet = new Set(childIds);

    // Step 2: Fetch Weekly Wrap reports + focus works + photos in parallel
    // Weekly Wrap parent reports are the PRIMARY data source (rich AI-analyzed works by area)
    // Photos are the FALLBACK when Weekly Wrap hasn't been run yet
    const [reportsRes, focusWorksRes, mediaRes] = await Promise.all([
      // Weekly Wrap parent reports (have works array with name + area)
      supabase
        .from('montree_weekly_reports')
        .select('child_id, content')
        .eq('classroom_id', classroomId)
        .eq('report_type', 'parent')
        .eq('week_start', weekStart)
        .in('child_id', childIds),

      supabase
        .from('montree_child_focus_works')
        .select('child_id, area, work_name')
        .in('child_id', childIds),

      // Smart Capture photos with work_id this week (fallback data source)
      supabase
        .from('montree_media')
        .select('id, child_id, work_id, captured_at')
        .eq('classroom_id', classroomId)
        .eq('media_type', 'photo')
        .not('work_id', 'is', null)
        .gte('captured_at', weekStart)
        .lt('captured_at', weekEndStr),
    ]);

    if (reportsRes.error) {
      console.error('auto-fill: reports error:', reportsRes.error.message);
    }
    if (focusWorksRes.error) {
      console.error('auto-fill: focus works error:', focusWorksRes.error.message);
    }
    if (mediaRes.error) {
      console.error('auto-fill: media error:', mediaRes.error.message);
    }

    // Build Weekly Wrap works by child: childId -> area -> [work names]
    interface ReportWork { name: string; area: string; status?: string }
    const wrapWorksByChild = new Map<string, Map<string, string[]>>();
    const reports = (reportsRes.data || []) as Array<{ child_id: string; content: { works?: ReportWork[] } }>;
    for (const report of reports) {
      if (!report.content?.works) continue;
      const areaMap = new Map<string, string[]>();
      for (const work of report.content.works) {
        if (!work.name || !work.area) continue;
        if (!areaMap.has(work.area)) areaMap.set(work.area, []);
        const existing = areaMap.get(work.area)!;
        if (!existing.includes(work.name)) existing.push(work.name);
      }
      if (areaMap.size > 0) {
        wrapWorksByChild.set(report.child_id, areaMap);
      }
    }
    const hasWrapData = wrapWorksByChild.size > 0;

    // Build photo-based area works (fallback): childId -> area -> [work names]
    const focusWorks = focusWorksRes.data;
    const mediaRows = (mediaRes.data || []) as Array<{ id: string; child_id: string | null; work_id: string; captured_at: string }>;
    const mediaIds = mediaRows.map(m => m.id);

    // Fetch group photo children links
    let groupChildLinks: Array<{ media_id: string; child_id: string }> = [];
    if (mediaIds.length > 0) {
      const { data: links } = await supabase
        .from('montree_media_children')
        .select('media_id, child_id')
        .in('media_id', mediaIds);
      groupChildLinks = (links || []) as Array<{ media_id: string; child_id: string }>;
    }

    // Build media_id -> set of child_ids
    const mediaChildMap = new Map<string, Set<string>>();
    for (const photo of mediaRows) {
      if (!mediaChildMap.has(photo.id)) mediaChildMap.set(photo.id, new Set());
      if (photo.child_id && childIdSet.has(photo.child_id)) {
        mediaChildMap.get(photo.id)!.add(photo.child_id);
      }
    }
    for (const link of groupChildLinks) {
      if (!mediaChildMap.has(link.media_id)) mediaChildMap.set(link.media_id, new Set());
      if (childIdSet.has(link.child_id)) {
        mediaChildMap.get(link.media_id)!.add(link.child_id);
      }
    }

    // Resolve work_ids from photos
    const workIds = [...new Set(mediaRows.map(m => m.work_id).filter(Boolean))];
    const workIdToName = new Map<string, { name: string; area: string }>();
    if (workIds.length > 0) {
      const { data: worksData } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, area_key')
        .in('id', workIds);
      for (const w of (worksData || []) as Array<{ id: string; name: string; area_key: string }>) {
        workIdToName.set(w.id, { name: w.name, area: w.area_key });
      }
    }

    const photoWorksByChild = new Map<string, Map<string, string[]>>();
    for (const photo of mediaRows) {
      const work = workIdToName.get(photo.work_id);
      if (!work) continue;
      const childIdsForPhoto = mediaChildMap.get(photo.id) || new Set();
      for (const cid of childIdsForPhoto) {
        if (!photoWorksByChild.has(cid)) photoWorksByChild.set(cid, new Map());
        const areaMap = photoWorksByChild.get(cid)!;
        if (!areaMap.has(work.area)) areaMap.set(work.area, []);
        const existing = areaMap.get(work.area)!;
        if (!existing.includes(work.name)) existing.push(work.name);
      }
    }

    // Build focus works lookup
    const focusMap = new Map<string, Map<string, string>>();
    for (const fw of (focusWorks || []) as FocusWorkRow[]) {
      if (!focusMap.has(fw.child_id)) focusMap.set(fw.child_id, new Map());
      focusMap.get(fw.child_id)!.set(fw.area, fw.work_name);
    }

    // Build suggestions for each child
    const suggestions: ChildSuggestion[] = children.map((child: { id: string; name: string }) => {
      const childFocus = focusMap.get(child.id);
      // Prefer Weekly Wrap data, fall back to photos
      const childWorks = wrapWorksByChild.get(child.id) || photoWorksByChild.get(child.id);

      // --- Summary English (area-by-area) ---
      let summaryEnglish = '';
      if (childWorks && childWorks.size > 0) {
        const lines: string[] = [];
        for (const area of AREAS) {
          const works = childWorks.get(area);
          if (works && works.length > 0) {
            lines.push(`${AREA_LABELS[area]}: ${works.join(', ')}`);
          }
        }
        summaryEnglish = lines.length > 0
          ? lines.join('\n')
          : "No recorded activities this week.";
      } else {
        summaryEnglish = "No recorded activities this week.";
      }

      // --- Plan Areas ---
      const planAreas: Record<string, string> = {};
      for (const area of AREAS) {
        const focusWork = childFocus?.get(area);
        if (focusWork) {
          const areaWorks = childWorks?.get(area) || [];
          const isPracticing = areaWorks.includes(focusWork);
          planAreas[area] = isPracticing ? `${focusWork}-P` : focusWork;
        } else {
          planAreas[area] = '';
        }
      }

      return {
        childId: child.id,
        childName: child.name,
        summaryEnglish,
        planAreas,
      };
    });

    return NextResponse.json(
      { children: suggestions },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('auto-fill exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────

/** Get YYYY-MM-DD of the Monday of the week containing the given date (Beijing time). */
function getBeijingMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Get YYYY-MM-DD of the Monday after the given Monday string. */
function getNextMonday(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
