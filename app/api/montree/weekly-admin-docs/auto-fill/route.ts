// app/api/montree/weekly-admin-docs/auto-fill/route.ts
// GET: Returns auto-generated suggestions for Weekly Summary + Plan
// from progress data + focus works. Teacher reviews and edits before saving.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

interface ProgressRow {
  child_id: string;
  work_name: string;
  area: string;
  status: string;
  updated_at: string;
}

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

    // Step 2: Fetch focus works + progress in parallel (using actual childIds)
    const [focusWorksRes, progressRes] = await Promise.all([
      supabase
        .from('montree_child_focus_works')
        .select('child_id, area, work_name')
        .in('child_id', childIds),

      supabase
        .from('montree_child_progress')
        .select('child_id, work_name, area, status, updated_at')
        .eq('classroom_id', classroomId)
        .gte('updated_at', weekStart)
        .lt('updated_at', weekEndStr),
    ]);

    if (focusWorksRes.error) {
      console.error('auto-fill: focus works error:', focusWorksRes.error.message);
      // Non-fatal — continue without focus works
    }

    const focusWorks = focusWorksRes.data;

    if (progressRes.error) {
      console.error('auto-fill: progress error:', progressRes.error.message);
      // Non-fatal — continue without progress data
    }

    // Build focus works lookup: childId -> area -> work_name
    const focusMap = new Map<string, Map<string, string>>();
    for (const fw of (focusWorks || []) as FocusWorkRow[]) {
      if (!focusMap.has(fw.child_id)) {
        focusMap.set(fw.child_id, new Map());
      }
      focusMap.get(fw.child_id)!.set(fw.area, fw.work_name);
    }

    // Build progress lookup: childId -> area -> [work names]
    const progressByChild = new Map<string, Map<string, string[]>>();
    const progressItems = (progressRes.error ? [] : (progressRes.data || [])) as ProgressRow[];
    for (const row of progressItems) {
      if (!progressByChild.has(row.child_id)) {
        progressByChild.set(row.child_id, new Map());
      }
      const areaMap = progressByChild.get(row.child_id)!;
      if (!areaMap.has(row.area)) {
        areaMap.set(row.area, []);
      }
      // Avoid duplicate work names
      const existing = areaMap.get(row.area)!;
      if (!existing.includes(row.work_name)) {
        existing.push(row.work_name);
      }
    }

    // Also build a flat list of works done this week per child (for Summary English)
    const weekWorksByChild = new Map<string, string[]>();
    for (const row of progressItems) {
      if (!weekWorksByChild.has(row.child_id)) {
        weekWorksByChild.set(row.child_id, []);
      }
      const list = weekWorksByChild.get(row.child_id)!;
      if (!list.includes(row.work_name)) {
        list.push(row.work_name);
      }
    }

    // Build suggestions for each child
    const suggestions: ChildSuggestion[] = children.map((child: { id: string; name: string }) => {
      const childFocus = focusMap.get(child.id);
      const childWeekWorks = weekWorksByChild.get(child.id) || [];

      // --- Summary English ---
      let summaryEnglish = '';
      if (childWeekWorks.length > 0) {
        const workList = childWeekWorks.slice(0, 5);
        const worksStr = workList.length === 1
          ? workList[0]
          : workList.length === 2
            ? `${workList[0]} and ${workList[1]}`
            : `${workList.slice(0, -1).join(', ')}, and ${workList[workList.length - 1]}`;

        summaryEnglish = `did ${worksStr} this week.`;

        // Add "Next week" from focus works (pick Language area focus, or first available)
        if (childFocus) {
          const nextWork = childFocus.get('language')
            || childFocus.get('mathematics')
            || childFocus.get('sensorial')
            || childFocus.get('practical_life')
            || childFocus.get('cultural');
          if (nextWork) {
            summaryEnglish += ` Next week: ${nextWork}.`;
          }
        }
      } else {
        summaryEnglish = "didn't complete any recorded activities this week.";
      }

      // --- Plan Areas ---
      const planAreas: Record<string, string> = {};
      for (const area of AREAS) {
        const focusWork = childFocus?.get(area);
        if (focusWork) {
          // Check if child is currently practicing this work (add -P suffix)
          const childProgress = progressByChild.get(child.id);
          const areaWorks = childProgress?.get(area) || [];
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
