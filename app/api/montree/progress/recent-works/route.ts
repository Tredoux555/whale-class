// app/api/montree/progress/recent-works/route.ts
//
// GET /api/montree/progress/recent-works?childId=<uuid>
//
// The "Suggested" chip row in the "This is…" sheet
// (components/montree/photo-audit/ThisIsSheet.tsx) — the wrap-up screen where
// a teacher tags the photos they took today. AI photo recognition was retired
// on 2026-09-17; this row is what replaced it.
//
// WHAT IT ANSWERS: "which works is THIS child actually doing?" — ranked by how
// many times the tracker journal says the child was tagged with each work over
// the last 8 weeks, most recent first on a tie. Not the last 3 works, not what
// the AI guessed: their real history.
//
// READ PATH (Tracking Constitution rule 8 — everything a human reads is
// derived): montree_progress_events, the append-only journal from migration
// 314, the same one the ribbon, weekly summary and parent report read. Never
// identification_status, never montree_media's AI columns.
//
// ONE CALL, EVERY BUCKET: the response carries `byArea` — the 'all' row plus
// one row per curriculum area, in the curriculum's own shelf order. The sheet
// renders area pills from `areas` and switches between them with zero network,
// which is the difference between instant and laggy on an iPhone in a
// classroom. The ranking itself is pure and lives in
// lib/montree/progress/rank-suggestions.ts (tested without a database).
//
// SCOPE: teacher auth via verifySchoolRequest, then the child is proved to
// belong to the caller's school (verifyChildBelongsToSchool) exactly like
// /api/montree/progress/bars does. The classroom is derived server-side from
// the child (falling back to the caller's own classroom) — never taken from
// the client. Every query is column-listed and row-capped; this is on the
// wrap-up critical path and must never become another 34 MB curriculum
// download (see the 🚨 note in /api/montree/curriculum).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import {
  ALL_AREA_KEY,
  SUGGESTION_LIMIT,
  SUGGESTION_WINDOW_WEEKS,
  buildAreaBuckets,
  indexWorks,
  tallyEvents,
  type RankedSuggestion,
  type SuggestionEvent,
  type SuggestionWork,
} from '@/lib/montree/progress/rank-suggestions';

export const dynamic = 'force-dynamic';

/** Row caps. Bounded reads, always — a classroom term of journal, not a table scan. */
const CHILD_EVENT_LIMIT = 400;
const CLASSROOM_EVENT_LIMIT = 1500;
const WORKS_LIMIT = 2000;
const AREAS_LIMIT = 50;

export type RecentWorkSuggestion = RankedSuggestion;

export interface SuggestionAreaPill {
  /** 'all' or a canonical area key, e.g. 'practical_life'. */
  key: string;
  /** What this school calls the area. */
  label: string;
}

function windowStartIso(): string {
  return new Date(Date.now() - SUGGESTION_WINDOW_WEEKS * 7 * 86400_000).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const childId = request.nextUrl.searchParams.get('childId');
    const supabase = getSupabase();
    const since = windowStartIso();

    let classroomId: string | null = auth.classroomId || null;

    // ── Prove the child, and take the classroom from the child, not the client ─
    if (childId) {
      const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
      const { data: child } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .maybeSingle();
      if (child?.classroom_id) classroomId = child.classroom_id as string;
    }

    const empty = {
      success: true,
      suggestions: [] as RecentWorkSuggestion[],
      areas: [{ key: ALL_AREA_KEY, label: 'All' }] as SuggestionAreaPill[],
      byArea: { [ALL_AREA_KEY]: [] as RecentWorkSuggestion[] },
    };
    if (!classroomId) return noStore(NextResponse.json(empty));

    // ── The classroom's live curriculum + its areas, in shelf order ──────────
    const [{ data: areaRows }, { data: workRows }] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key, name, sequence')
        .eq('classroom_id', classroomId)
        .order('sequence', { ascending: true })
        .limit(AREAS_LIMIT),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, work_key, name, area_id, sequence')
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .limit(WORKS_LIMIT),
    ]);

    const areaById = new Map<string, { key: string; label: string; sequence: number }>();
    const areaKeys: string[] = [];
    const seenAreaKey = new Set<string>();
    for (const a of areaRows || []) {
      const key = (a.area_key as string) || '';
      if (!key) continue;
      areaById.set(a.id as string, {
        key,
        label: (a.name as string) || key,
        sequence: (a.sequence as number) ?? 0,
      });
      if (!seenAreaKey.has(key)) {
        seenAreaKey.add(key);
        areaKeys.push(key);
      }
    }

    const works: SuggestionWork[] = [];
    for (const w of workRows || []) {
      const area = areaById.get((w.area_id as string) || '');
      if (!area) continue; // a work with no live area cannot be filtered by a pill
      works.push({
        id: w.id as string,
        work_key: (w.work_key as string) || null,
        name: (w.name as string) || '',
        area_key: area.key,
        area_label: area.label,
        sequence: (w.sequence as number) ?? Number.MAX_SAFE_INTEGER,
      });
    }

    if (works.length === 0) return noStore(NextResponse.json(empty));

    // ── The journal: this child's rows, and the classroom's, in the window ───
    // Scope: the child is already proved to be in the caller's school above;
    // the classroom query is pinned to the school AND the server-derived
    // classroom, so neither list can reach across a school boundary.
    const eventColumns = 'work_key, work_name, created_at';

    const childEventsPromise = childId
      ? supabase
          .from('montree_progress_events')
          .select(eventColumns)
          .eq('child_id', childId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(CHILD_EVENT_LIMIT)
      : Promise.resolve({ data: [] as SuggestionEvent[] });

    const [{ data: childEvents }, { data: classroomEvents }] = await Promise.all([
      childEventsPromise,
      supabase
        .from('montree_progress_events')
        .select(eventColumns)
        .eq('school_id', auth.schoolId)
        .eq('classroom_id', classroomId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(CLASSROOM_EVENT_LIMIT),
    ]);

    const index = indexWorks(works);
    const childTally = tallyEvents((childEvents || []) as SuggestionEvent[], works, index);
    const classroomTally = tallyEvents((classroomEvents || []) as SuggestionEvent[], works, index);

    const byArea = buildAreaBuckets({
      works,
      childTally,
      classroomTally,
      areaKeys,
      limit: SUGGESTION_LIMIT,
    });

    const areas: SuggestionAreaPill[] = [
      { key: ALL_AREA_KEY, label: 'All' },
      ...areaKeys.map((key) => ({
        key,
        label: works.find((w) => w.area_key === key)?.area_label || key,
      })),
    ];

    return noStore(
      NextResponse.json({
        success: true,
        // Back-compat: the 'all' bucket under the name the first version used.
        suggestions: byArea[ALL_AREA_KEY] || [],
        areas,
        byArea,
      })
    );
  } catch (err) {
    console.error('[recent-works] failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to load suggestions' }, { status: 500 });
  }
}

/**
 * A teacher's last tag must show up on the very next photo they open, so this
 * may never be served from a cache — same posture as the picker projection.
 */
function noStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return res;
}
