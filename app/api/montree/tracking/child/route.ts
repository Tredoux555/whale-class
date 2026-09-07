// app/api/montree/tracking/child/route.ts
//
// GET /api/montree/tracking/child?child_id=
//   → { child, ribbon, current, current_letter, next_letter, events:[…last 200],
//       flags, shelf:{[ws key]:status}, summary, works }
//
// One child's whole tracking picture, derived (rule 8). `events` is the journal
// itself, newest first — the audit trail a teacher opens when they want to know
// WHY the ribbon says what it says, including the evidence rows
// (old_status === new_status) that recorded a repeat observation without moving a
// rung. Nothing here is a stored summary.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { loadLedger, mondayOf } from '@/lib/montree/tracking/persistence';
import { dayOf, rebuildCurrent, tzOf } from '@/lib/montree/tracking/ledger';
import {
  childCurrent,
  currentLetter,
  flags,
  impliedDarkPhonics,
  nextLetter,
  ribbon,
  withImpliedDarkPhonics,
} from '@/lib/montree/tracking/derive';
import { englishSummary } from '@/lib/montree/tracking/summary';
import type { Child, ImpliedCell } from '@/lib/montree/tracking/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_PAGE = 200;

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const childId = request.nextUrl.searchParams.get('child_id') || '';
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'child_id required (UUID)' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from('montree_children')
    .select('id, classroom_id, school_id')
    .eq('id', childId)
    .maybeSingle();
  const child = data as { id: string; classroom_id: string | null; school_id: string | null } | null;
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  if (child.school_id && child.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Child not in your school' }, { status: 403 });
  }
  if (auth.role === 'teacher' && auth.classroomId && child.classroom_id !== auth.classroomId) {
    return NextResponse.json({ error: 'Child not in your classroom' }, { status: 403 });
  }
  if (!child.classroom_id) {
    return NextResponse.json({ error: 'Child has no classroom' }, { status: 400 });
  }

  // The classroom's curriculum and class letter are part of the answer, so the
  // ledger is loaded classroom-scoped and narrowed to this child's events. It is
  // loaded first because it carries the school's timezone, and "today" is a
  // school-calendar fact (audit §5).
  const ledger = await loadLedger(supabase, {
    classroomId: child.classroom_id,
    childIds: [childId],
  });
  const tz = tzOf(ledger);
  const asOf = dayOf(new Date().toISOString(), tz);

  // Rule 7's Dark Phonics amendment: an observed work implies the earlier works
  // of that book are mastered. `observed` is the journal, `current` is what a
  // human reads, and `implied` says which cells the difference is.
  const observed = childCurrent(rebuildCurrent(ledger.events, tz), childId);
  const implied = impliedDarkPhonics(observed, ledger.works);
  const current = withImpliedDarkPhonics(observed, ledger.works);
  const letter = currentLetter(current, ledger.works);

  const shelf: Record<string, string> = {};
  for (const work of ledger.works) {
    if (!work.work_key.startsWith('ws:')) continue;
    shelf[work.work_key] = current.get(work.work_key) ?? 'not_started';
  }

  // Newest first, capped. The journal is append-only, so this is a page, not a summary.
  const events = [...ledger.events]
    .reverse()
    .slice(0, EVENT_PAGE)
    .map((e) => ({
      work_key: e.work_key,
      work_name: e.work_name,
      old_status: e.old_status,
      new_status: e.new_status,
      source: e.source,
      actor: e.actor ?? null,
      reason: e.reason ?? null,
      evidence_id: e.evidence_id ?? null,
      created_at: e.created_at,
      // The one thing a reader cannot see from the row alone.
      advanced: e.old_status !== e.new_status,
    }));

  return NextResponse.json(
    {
      // Built key by key rather than spread: `pronounSet` is the engine's
      // internal spelling and the wire contract says `pronoun_set`.
      child: childBlock(ledger.children.find((c) => c.id === childId), childId),
      classroom_id: child.classroom_id,
      week_letter: ledger.classWeekLetter,
      ribbon: ribbon(current, ledger.works),
      current: Object.fromEntries(current),
      implied: Object.fromEntries(
        [...implied.values()].map((i) => [
          i.work_key,
          { implied: true, by_work_key: i.by_work_key, by_n: i.by_n } as ImpliedCell,
        ]),
      ),
      current_letter: letter,
      next_letter: nextLetter(current, ledger.works, letter),
      shelf,
      events,
      flags: flags(ledger, asOf)
        .filter((f) => f.childId === childId)
        .map((f) => ({ code: f.code, message: f.message })),
      summary: englishSummary(ledger, childId, mondayOf(asOf, tz)),
      works: ledger.works.map((w) => ({
        work_key: w.work_key,
        name: w.name,
        sequence: w.sequence,
        group: w.group ?? 'other',
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** The one child, in the wire's spelling. A missing roster row is still answered. */
function childBlock(child: Child | undefined, childId: string) {
  return {
    id: child?.id ?? childId,
    name: child?.name ?? '',
    pronoun: child?.pronoun ?? 'they',
    pronoun_set: child ? child.pronounSet !== false : false,
  };
}
