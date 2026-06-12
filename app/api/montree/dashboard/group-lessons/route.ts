// /api/montree/dashboard/group-lessons/route.ts
//
// ✨ Group Lesson Suggester (Jun 10, 2026) — the first CROSS-CHILD
// intelligence surface. Montree has always known each child's position in
// every area; this route is the first thing that looks ACROSS the roster:
//
//   "Amy, Leo and Kayla are all ready for the Teen Board —
//    group presentation Tuesday?"
//
// Two suggestion types:
//   - 'present'  — ≥2 children whose NEXT un-presented work in an area's
//                  sequence is the SAME work → suggest a group presentation.
//   - 'practice' — ≥2 children currently presented/practicing the SAME
//                  work → suggest a joint practice / review circle.
//
// Readiness model (deliberately simple, deterministic — no AI call):
//   For each area where a child has at least one progress row, their
//   frontier = the highest-sequence curriculum work they've touched.
//   Their "ready next" = the first work AFTER the frontier they have no
//   progress row for. Children with zero progress in an area are skipped
//   for that area (avoids 20 un-onboarded kids "all ready" for work #1).
//
// Cross-pollination contract: classroom comes from the JWT; the classroom
// row is verified to belong to auth.schoolId before any child data reads.
// Cache: private, no-store (session-scoped — Session 117 rule).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

const MAX_SUGGESTIONS = 6;
const MIN_GROUP_SIZE = 2;
// Practice groups larger than this are "the whole class is on it" — that's a
// circle-time observation, not a group-lesson suggestion. (Whale Class dry
// run showed 18-child "Paper Work" groups — true but not actionable.)
const MAX_PRACTICE_GROUP = 6;

interface ChildLite {
  id: string;
  name: string;
}

interface Suggestion {
  type: 'present' | 'practice';
  work_id: string;
  work_key: string;
  work_name: string;
  area_key: string;
  area_name: string;
  children: ChildLite[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Allow ?classroom_id= override (principal viewing a classroom), but
    // ALWAYS verify the classroom belongs to the caller's school.
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id') || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'No classroom in session' },
        { status: 400 }
      );
    }

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found in your school' },
        { status: 403 }
      );
    }

    // Parallel: children + areas + works
    const [childrenRes, areasRes, worksRes] = await Promise.all([
      supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', classroomId)
        .eq('is_active', true),
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key, name')
        .eq('classroom_id', classroomId)
        .eq('is_active', true),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, area_id, work_key, name, sequence')
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('sequence', { ascending: true }),
    ]);

    const children = (childrenRes.data || []) as Array<{ id: string; name: string }>;
    const areas = (areasRes.data || []) as Array<{ id: string; area_key: string; name: string }>;
    const works = (worksRes.data || []) as Array<{
      id: string; area_id: string; work_key: string; name: string; sequence: number;
    }>;

    if (children.length < MIN_GROUP_SIZE || works.length === 0) {
      return NextResponse.json(
        { success: true, suggestions: [] },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const areaById = new Map(areas.map(a => [a.id, a]));

    // Ordered works per area + name → work lookup (progress is keyed by
    // work_name TEXT, matched case-insensitively — same convention as the
    // progress API's enrichment maps).
    const worksByArea = new Map<string, typeof works>();
    const workByNameLower = new Map<string, (typeof works)[number]>();
    for (const w of works) {
      const list = worksByArea.get(w.area_id) || [];
      list.push(w);
      worksByArea.set(w.area_id, list);
      workByNameLower.set(w.name.toLowerCase(), w);
    }

    // All progress for the roster — paged through in 1000-row batches.
    // 🐛 BUG FIX (PERF_PASS_JUN13.md Finding 6): this was a single un-limited
    // query, which Supabase silently caps at 1000 rows — a busy classroom got
    // group suggestions computed on a TRUNCATED progress set (wrong answers,
    // no error). Same paging pattern as the sibling curriculum-gaps route.
    const childIds = children.map(c => c.id);
    let progressRows: Array<{ child_id: string; work_name: string; status: string }> = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from('montree_child_progress')
        .select('child_id, work_name, status')
        .in('child_id', childIds)
        .range(from, from + 999);
      const batch = (data || []) as Array<{ child_id: string; work_name: string; status: string }>;
      progressRows = progressRows.concat(batch);
      if (batch.length < 1000) break;
    }

    // child_id → Map(workId → status) for curriculum-matched rows
    const touchedByChild = new Map<string, Map<string, string>>();
    for (const row of progressRows) {
      const work = workByNameLower.get((row.work_name || '').toLowerCase());
      if (!work) continue; // off-curriculum custom note — ignore for grouping
      let m = touchedByChild.get(row.child_id);
      if (!m) { m = new Map(); touchedByChild.set(row.child_id, m); }
      m.set(work.id, row.status);
    }

    // ---- Build groups ----
    const nextGroups = new Map<string, ChildLite[]>();      // workId → children ready for it next
    const practiceGroups = new Map<string, ChildLite[]>();  // workId → children actively on it

    for (const child of children) {
      const touched = touchedByChild.get(child.id);
      if (!touched || touched.size === 0) continue; // un-onboarded — skip

      // Practice groups: works this child is actively on
      for (const [workId, status] of touched) {
        if (status === 'presented' || status === 'practicing') {
          const g = practiceGroups.get(workId) || [];
          g.push({ id: child.id, name: child.name });
          practiceGroups.set(workId, g);
        }
      }

      // Ready-next per area (only areas the child has actually started)
      for (const areaWorks of worksByArea.values()) {
        let frontier = -1;
        for (let i = 0; i < areaWorks.length; i++) {
          if (touched.has(areaWorks[i].id)) frontier = i;
        }
        if (frontier === -1) continue; // no progress in this area
        for (let i = frontier + 1; i < areaWorks.length; i++) {
          if (!touched.has(areaWorks[i].id)) {
            const g = nextGroups.get(areaWorks[i].id) || [];
            g.push({ id: child.id, name: child.name });
            nextGroups.set(areaWorks[i].id, g);
            break;
          }
        }
      }
    }

    const workById = new Map(works.map(w => [w.id, w]));
    const toSuggestions = (
      groups: Map<string, ChildLite[]>,
      type: Suggestion['type']
    ): Suggestion[] => {
      const out: Suggestion[] = [];
      for (const [workId, kids] of groups) {
        if (kids.length < MIN_GROUP_SIZE) continue;
        const work = workById.get(workId);
        if (!work) continue;
        const area = areaById.get(work.area_id);
        out.push({
          type,
          work_id: work.id,
          work_key: work.work_key,
          work_name: work.name,
          area_key: area?.area_key || 'unknown',
          area_name: area?.name || '',
          children: kids,
        });
      }
      return out;
    };

    // Present-together suggestions lead (the "this thing thinks" moment),
    // then joint-practice. Bigger groups first within each type; oversized
    // practice groups (whole-class works) filtered out as non-actionable.
    const suggestions = [
      ...toSuggestions(nextGroups, 'present').sort((a, b) => b.children.length - a.children.length),
      ...toSuggestions(practiceGroups, 'practice')
        .filter(s => s.children.length <= MAX_PRACTICE_GROUP)
        .sort((a, b) => b.children.length - a.children.length),
    ].slice(0, MAX_SUGGESTIONS);

    return NextResponse.json(
      { success: true, suggestions },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[GroupLessons] error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
