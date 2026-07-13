// /api/montree/dashboard/english-program/route.ts
//
// Powers the teacher-dashboard "English Program" card. Reads the classroom's
// English Program works (source='english_program', seeded by
// scripts/curriculum/seed-english-program.mjs) and their classroom-wide mastery,
// and reports the current week + how many of the 58 weeks are mastered.
//
// Read-only. Never touches the shelf/replan ladder. If the classroom has no
// english works (flag on but not seeded yet), returns { seeded: false }.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const SOURCE = 'english_program';

/** A montree_child_progress row is "mastered" when teacher-confirmed. */
function isMasteredStatus(status: unknown): boolean {
  return status === 'mastered' || status === 'completed' || status === 3 || status === '3';
}

/** Extract the week number from an english work_key ('english_week_07' → 7). */
function weekFromKey(workKey: string | null | undefined): number | null {
  const m = (workKey || '').match(/^english_week_(\d{2})$/);
  return m ? parseInt(m[1], 10) : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const classroomId = auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ success: true, seeded: false, total: 0, mastered: 0, current_week: 1 });
    }

    const supabase = getSupabase();

    // English Program works for this classroom.
    const { data: works, error: worksErr } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, work_key, sequence')
      .eq('classroom_id', classroomId)
      .eq('source', SOURCE)
      .eq('is_active', true)
      .order('sequence');

    if (worksErr) {
      console.error('[english-program] works query error:', worksErr);
      return NextResponse.json({ success: false, error: 'Failed to load English Program' }, { status: 500 });
    }

    if (!works || works.length === 0) {
      return NextResponse.json(
        { success: true, seeded: false, total: 0, mastered: 0, current_week: 1 },
        { headers: { 'Cache-Control': 'private, no-cache' } },
      );
    }

    // Map week → work_name (only weeks that actually have a seeded work).
    const weekToName = new Map<number, string>();
    for (const w of works) {
      const wk = weekFromKey(w.work_key as string);
      if (wk !== null) weekToName.set(wk, (w.name as string) || '');
    }
    const weeks = Array.from(weekToName.keys()).sort((a, b) => a - b);

    // Classroom roster.
    const { data: children } = await supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('is_active', true);
    const childIds = (children || []).map((c) => (c as { id: string }).id);

    // Mastered work_names across the classroom (any child mastered = week mastered).
    const masteredNames = new Set<string>();
    if (childIds.length > 0) {
      const workNames = works.map((w) => (w.name as string)).filter(Boolean);
      // Chunk the IN() list to stay well under Postgres parameter limits.
      const chunk = <T,>(arr: T[], n: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };
      for (const namesChunk of chunk(workNames, 60)) {
        const { data: prog } = await supabase
          .from('montree_child_progress')
          .select('work_name, status')
          .in('child_id', childIds)
          .in('work_name', namesChunk);
        for (const p of prog || []) {
          const row = p as { work_name: string; status: unknown };
          if (isMasteredStatus(row.status)) masteredNames.add(row.work_name);
        }
      }
    }

    // A week is mastered when its work_name is mastered by anyone in the class.
    const masteredWeeks = weeks.filter((wk) => masteredNames.has(weekToName.get(wk) || ''));
    const masteredSet = new Set(masteredWeeks);

    // Current week = lowest present week not yet mastered (default: first week).
    const currentWeek = weeks.find((wk) => !masteredSet.has(wk)) ?? weeks[0] ?? 1;

    return NextResponse.json(
      {
        success: true,
        seeded: true,
        total: works.length,       // authored weeks present (normally 58)
        mastered: masteredWeeks.length,
        current_week: currentWeek,
      },
      { headers: { 'Cache-Control': 'private, no-cache' } },
    );
  } catch (error) {
    console.error('[english-program] error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
