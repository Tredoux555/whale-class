// /api/montree/dark-phonics/recent-words/route.ts
//
// WHAT HAS THIS ROOM ACTUALLY READ LATELY — and therefore which words may go
// on a bingo board this week.
//
// Reads the append-only journal (montree_progress_events, migration 314), NOT
// the current-state table: "which books were worked in the last four weeks" is
// a question about CHANGES, and montree_child_progress cannot answer it. Rows
// are scoped to one classroom, filtered to Dark Phonics works (work_key
// `dp:<letter>:<n>`, migration 344) and to a status that means the work was
// genuinely taught — 'presented', 'practicing', 'mastered'; 'not_started' is
// noise. Statuses verified against tracker-works.ts's STATUS_RANK.
//
// 🚨 work_key CAN BE NULL on an older row. writeProgress resolves it from the
// classroom curriculum and the master spine, and a name it cannot resolve
// writes a null key with the typed name intact — so the query ALSO reaches for
// `work_name ILIKE '%Dark Phonics%'` and parseWorkName() reads the letter back
// out. Dropping those rows would quietly under-report a room whose tracker was
// filled in before the seed ran.
//
// Words come from lib/montree/dark-phonics/book-word-pool.ts, and photos from
// the owner's own Dark Phonics photo bank or not at all. See that file.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { parseWorkName } from '@/lib/montree/dark-phonics/tracker-works';
import {
  bookForLetter,
  poolWordsForLetters,
  type PoolBook,
} from '@/lib/montree/dark-phonics/book-word-pool';

/** The statuses that mean a work was actually taught. */
const TAUGHT_STATUSES = ['presented', 'practicing', 'mastered'];

/** A room of 20 doing 5 works a letter cannot plausibly exceed this in a term,
 *  and an unbounded select on a journal is how a dashboard falls over. */
const MAX_ROWS = 5000;

const DEFAULT_WEEKS = 4;
const MIN_WEEKS = 1;
const MAX_WEEKS = 52;

interface EventRow {
  work_key: string | null;
  work_name: string | null;
  created_at: string;
}

/** `dp:<letter>:<n>` → letter. Null for anything else. */
function letterFromKey(key: string | null): string | null {
  if (!key) return null;
  const parts = key.split(':');
  if (parts.length !== 3 || parts[0] !== 'dp') return null;
  return parts[1] || null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    const weeksRaw = Number(searchParams.get('weeks'));
    const weeks = Number.isFinite(weeksRaw)
      ? Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.round(weeksRaw)))
      : DEFAULT_WEEKS;

    // SECURITY: the classroom must belong to the authenticated school — the
    // same guard classroom-summary applies before it reads anyone's progress.
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString();

    // TWO QUERIES, NOT ONE `.or()`. PostgREST's or-filter takes its values as
    // raw, comma-split text, and '%Dark Phonics%' carries a space — quoting it
    // by hand is exactly the kind of string surgery that breaks silently. The
    // builder methods escape properly, so the keyed rows and the older
    // key-less rows are fetched separately and merged here.
    const base = () =>
      supabase
        .from('montree_progress_events')
        .select('work_key, work_name, created_at')
        .eq('classroom_id', classroomId)
        .in('new_status', TAUGHT_STATUSES)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);

    const [keyed, unkeyed] = await Promise.all([
      base().like('work_key', 'dp:%'),
      base().is('work_key', null).ilike('work_name', '%Dark Phonics%'),
    ]);

    const error = keyed.error || unkeyed.error;
    if (error) {
      console.error('[recent-words]', { message: error.message, code: error.code });
      return NextResponse.json({ error: 'Failed to read progress events' }, { status: 500 });
    }

    const rows = ([...(keyed.data || []), ...(unkeyed.data || [])] as EventRow[]).sort(
      (a, b) => (b.created_at || '').localeCompare(a.created_at || '')
    );

    // Letter → the most recent moment it was touched. Rows are newest-first, so
    // the FIRST sighting of a letter is its lastAt.
    const lastByLetter = new Map<string, string>();
    for (const row of rows) {
      const letter = letterFromKey(row.work_key) ?? (row.work_name ? parseWorkName(row.work_name)?.letter ?? null : null);
      if (!letter) continue;
      if (!lastByLetter.has(letter)) lastByLetter.set(letter, row.created_at);
    }

    const books: PoolBook[] = [];
    for (const [letter, lastAt] of lastByLetter) {
      const book = bookForLetter(letter);
      if (book) books.push({ ...book, lastAt });
    }
    // Most recently worked book first — that ordering carries straight through
    // to the word pool, so this week's book leads the board.
    books.sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));

    const words = poolWordsForLetters(books.map((b) => b.letter));

    const response = NextResponse.json({ weeks, books, words });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;
  } catch (err) {
    console.error('[recent-words] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
