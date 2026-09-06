// app/api/montree/dashboard/english-progress/route.ts
//
// 🛑 RETIRED 2026-09-06 — the 128-lesson English pointer is gone.
//
// Constitution rule 8: EVERYTHING A HUMAN READS IS DERIVED.
// montree_child_english_progress (1-128) and english-sequence/lesson-map.ts
// were a SECOND English sequence living beside Dark Phonics. A child could
// sit at "lesson 54 — Magic e" in this table while their actual work was
// 't Dark Phonics work 3'. Two sequences, two answers, one confused parent.
//
// What this route is now:
//
//   GET   — the ENGINE RIBBON for the caller's classroom, derived from
//           montree_progress_events at read time. No stored pointer, no
//           lesson numbers, nothing to advance.
//   PATCH — 410 Gone. Mastery is not typed; it is derived from which Dark
//           Phonics works a child has done (rule 1 + rule 7).
//
// The write door is lib/montree/progress/write-progress.ts, reached from the
// tracker. Nothing writes an English position ever again.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { loadReaderLedger } from '@/lib/montree/tracking/readers-ledger';
import { replay } from '@/lib/montree/tracking/ledger';
import {
  childCurrent,
  currentLetter,
  nextLetter,
  ribbon,
  type RibbonState,
} from '@/lib/montree/tracking/derive';
import { readingPosition } from '@/lib/montree/reports/reading-position';

export const dynamic = 'force-dynamic';

/** The message every retired write gets. One string, asserted by a test. */
export const RETIRED_MESSAGE =
  'Retired: mastery is derived from Dark Phonics works (see tracker)';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ChildRibbon {
  child_id: string;
  child_name: string;
  /** The book the child is on now, or null when they have opened none. */
  current_letter: string | null;
  /** The next unfinished book after the current one. */
  next_letter: string | null;
  /** letter → 'mastered' | 'in-progress' | 'not-started' | 'coming'. */
  ribbon: Record<string, RibbonState>;
  /** The parent-facing fragment, or null when there is nothing to say. */
  position: string | null;
  mastered_count: number;
}

export interface RibbonResponse {
  success: true;
  retired: true;
  retired_message: string;
  classroom_id: string;
  /** The Dark Phonics letter the class as a whole is on. */
  week_letter: string;
  letters: Array<{ letter: string; bookTitle: string; status: 'live' | 'coming' }>;
  children: ChildRibbon[];
}

// ─── GET — the derived ribbon ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!auth.classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const supabase = getSupabase();
  const childIdParam = request.nextUrl.searchParams.get('child_id');

  const ledger = await loadReaderLedger(supabase, {
    classroomId: auth.classroomId,
    childIds: childIdParam && UUID_RE.test(childIdParam) ? [childIdParam] : undefined,
  });

  const { state } = replay(ledger.events);

  const children: ChildRibbon[] = ledger.children.map((child) => {
    const current = childCurrent(state.current, child.id);
    const letters = ribbon(current, ledger.works);
    const letter = currentLetter(current, ledger.works);
    const pos = readingPosition(ledger, child.id);
    return {
      child_id: child.id,
      child_name: child.name,
      current_letter: letter,
      next_letter: nextLetter(current, ledger.works, letter),
      ribbon: letters,
      position: pos ? pos.phrase : null,
      mastered_count: Object.values(letters).filter((s) => s === 'mastered').length,
    };
  });

  const payload: RibbonResponse = {
    success: true,
    retired: true,
    retired_message: RETIRED_MESSAGE,
    classroom_id: auth.classroomId,
    week_letter: ledger.classWeekLetter,
    letters: TRACKER_LETTERS.map((l) => ({
      letter: l.letter,
      bookTitle: l.bookTitle,
      status: l.status,
    })),
    children,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

// ─── PATCH — 410 Gone ─────────────────────────────────────────────────
//
// advance / set / reset all die here. There is no pointer to move: a letter
// is mastered when its five works are mastered, and works are ticked through
// the one door.

export async function PATCH() {
  return NextResponse.json(
    { error: RETIRED_MESSAGE, retired: true },
    { status: 410 },
  );
}
