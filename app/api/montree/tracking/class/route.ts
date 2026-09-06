// app/api/montree/tracking/class/route.ts
//
// GET /api/montree/tracking/class?classroom_id=&week_start=YYYY-MM-DD
//
// The tracker screen's one read. Everything in the response is DERIVED (rule 8):
// nothing here is stored, and nothing here reads the retired 1-128 English
// pointer. The route's whole job is auth + loadLedger() + calling the engine.
//
// Response shape is the binding contract in docs/tracking/ENGINE_V2_PLAN.md.
// Agents D/E/F are building against it right now — do not change a key name.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadLedger, mondayOf } from '@/lib/montree/tracking/persistence';
import {
  childCurrent,
  currentLetter,
  flags,
  nextLetter,
  planLanguageCell,
  ribbon,
  weekTicks,
  type RibbonState,
} from '@/lib/montree/tracking/derive';
import { englishSummary } from '@/lib/montree/tracking/summary';
import { dayOf, rebuildCurrent, tzOf } from '@/lib/montree/tracking/ledger';
import type { Status } from '@/lib/montree/tracking/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ChildBlock {
  id: string;
  name: string;
  pronoun: 'he' | 'she' | 'they';
  /** False when nobody has stated one and 'they' is only the fallback. */
  pronoun_set: boolean;
  ribbon: Record<string, RibbonState>;
  current_letter: string | null;
  next_letter: string | null;
  week: Record<string, Status>;
  current: Record<string, Status>;
  flags: Array<{ code: string; message: string }>;
  summary: { text: string; words: number };
  plan_cell: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();

  // The classroom must belong to the caller. A teacher token carries its own
  // classroom; a principal may name one, but only inside their own school.
  const requested = request.nextUrl.searchParams.get('classroom_id');
  const classroomId = requested || auth.classroomId || null;
  if (!classroomId || !UUID_RE.test(classroomId)) {
    return NextResponse.json({ error: 'classroom_id required (UUID)' }, { status: 400 });
  }
  const owned = await classroomBelongsToCaller(supabase, classroomId, auth.schoolId, auth.classroomId);
  if (!owned) {
    return NextResponse.json({ error: 'Classroom not in your school' }, { status: 403 });
  }

  const weekParam = request.nextUrl.searchParams.get('week_start');
  if (weekParam && !DATE_RE.test(weekParam)) {
    return NextResponse.json({ error: 'week_start must be YYYY-MM-DD' }, { status: 400 });
  }
  // The ledger is loaded FIRST because it carries the school's timezone, and
  // "today" / "this week" are school-calendar facts (audit §5).
  const ledger = await loadLedger(supabase, { classroomId });
  const tz = tzOf(ledger);
  const today = dayOf(new Date().toISOString(), tz);
  // Any day in the week is accepted and snapped to its Monday — a caller passing
  // "today" must not silently get an empty grid.
  const weekStart = mondayOf(weekParam || today, tz);

  const state = rebuildCurrent(ledger.events, tz);
  const allFlags = flags(ledger, today);

  const children: ChildBlock[] = ledger.children.map((child) => {
    const current = childCurrent(state, child.id);
    const letter = currentLetter(current, ledger.works);
    const ticks = weekTicks(ledger.events, child.id, weekStart, tz);

    // The week grid: the furthest rung SEEN this week per work. A repeat
    // observation keeps the rung it repeated, so a cell is never blank when
    // something happened in it.
    const week: Record<string, Status> = {};
    for (const tick of ticks) {
      const held = tick.advanced ? tick.status : (current.get(tick.work_key) ?? tick.status);
      week[tick.work_key] = held;
    }

    return {
      id: child.id,
      name: child.name,
      pronoun: child.pronoun,
      // The roster's silence, said out loud: the tracker highlights these rows
      // so a teacher can fix them, and the summary avoids "They" until they do.
      pronoun_set: child.pronounSet !== false,
      ribbon: ribbon(current, ledger.works),
      current_letter: letter,
      next_letter: nextLetter(current, ledger.works, letter),
      week,
      current: Object.fromEntries(current),
      flags: allFlags
        .filter((f) => f.childId === child.id)
        .map((f) => ({ code: f.code, message: f.message })),
      summary: englishSummary(ledger, child.id, weekStart),
      plan_cell: planLanguageCell(ledger, child.id, weekStart),
    };
  });

  const queue = await openQueue(supabase, classroomId);

  return NextResponse.json(
    {
      week_letter: ledger.classWeekLetter,
      week_start: weekStart,
      children,
      queue,
      works: ledger.works.map((w) => ({
        work_key: w.work_key,
        name: w.name,
        description: w.description ?? null,
        sequence: w.sequence,
        group: w.group ?? 'other',
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** Shared by every route in this folder: never trust a classroom_id from the query string. */
async function classroomBelongsToCaller(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  schoolId: string,
  ownClassroomId?: string,
): Promise<boolean> {
  if (ownClassroomId && ownClassroomId === classroomId) return true;
  const { data } = await supabase
    .from('montree_classrooms')
    .select('id, school_id')
    .eq('id', classroomId)
    .maybeSingle();
  const row = data as { id: string; school_id: string } | null;
  return !!row && row.school_id === schoolId;
}

async function openQueue(supabase: ReturnType<typeof getSupabase>, classroomId: string) {
  try {
    const { data, error } = await supabase
      .from('montree_progress_review_queue')
      .select('id, child_id, raw_work_name, requested_status, source, created_at')
      .eq('classroom_id', classroomId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      // Migration 345 not pasted yet — an empty queue is the honest answer.
      if (error.code !== '42P01') {
        console.error('[tracking/class] queue load failed:', error.message || error);
      }
      return [];
    }
    return (data || []) as Array<Record<string, unknown>>;
  } catch (err) {
    console.error('[tracking/class] queue load threw:', err);
    return [];
  }
}
