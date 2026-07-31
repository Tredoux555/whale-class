// app/api/montree/work-rhythm/route.ts
// Work Rhythm — per-child, per-area time distribution for one classroom over a
// selectable window. This answers the school's headline question directly:
// "where is each child spending most of their time?"
//
// READ-ONLY. This route never writes.
//
// ─── WHY THESE TWO SOURCES, AND ONLY THESE TWO ──────────────────────────────
// There are exactly two honest per-child-per-area *event* signals in the DB:
//
//  1. montree_paper_scan_extractions — a teacher-approved row off a handwritten
//     record sheet. It carries `area` and (often) `time_minutes`, i.e. real
//     recorded time. Only 'approved' | 'edited' rows count; 'pending' has not
//     been checked by a human and 'rejected' was explicitly thrown away.
//
//  2. montree_media confirmed photos — a teacher-confirmed photo of a child at
//     a work. There is NO area column on montree_media, so the area is derived
//     work_id → montree_classroom_curriculum_works.area_id →
//     montree_classroom_curriculum_areas.area_key. A photo has no duration, so
//     it contributes a NOMINAL engagement weight (PHOTO_EVENT_MINUTES). That is
//     a proxy for "this child was engaged in this area", NOT a measurement.
//
// DELIBERATELY NOT USED (do not "fix" this later):
//  • montree_child_progress — one row per (child, work) holding the CURRENT
//    status. No event history, no timestamps per touch, so it cannot say how
//    much time went anywhere. Counting it would double-count works the child
//    already has a scan/photo for.
//  • montree_behavioral_observations — has no area column at all, so there is
//    nothing to attribute to one of the five areas without guessing.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const dynamic = 'force-dynamic';

const WORK_RHYTHM_FEATURE_KEY = 'work_rhythm';

// Same order + meaning as app/api/montree/progress/bars/route.ts.
export const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
export type AreaKey = (typeof AREA_ORDER)[number];

const AREA_SET = new Set<string>(AREA_ORDER);

// Older classroom curricula (and a few hand-typed sheets) use short names for
// two areas. Map those onto the canonical key; anything else is DROPPED rather
// than bucketed into a wrong area — a silently mis-attributed minute is worse
// than a missing one, and 'special_events' / 'miscellaneous' / 'uncategorised'
// are genuinely not one of the five Montessori areas.
const AREA_ALIASES: Record<string, AreaKey> = {
  math: 'mathematics',
  culture: 'cultural',
};

function normaliseArea(raw: string | null | undefined): AreaKey | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (AREA_SET.has(key)) return key as AreaKey;
  return AREA_ALIASES[key] ?? null;
}

// A sheet row a teacher approved but left un-timed still represents real work.
// 15 minutes is the school's own rule of thumb for one un-timed sheet entry.
const UNTIMED_ENTRY_MINUTES = 15;

// A confirmed photo has no duration. 12 minutes is a NOMINAL engagement weight
// so photo-only classrooms still get a readable rhythm — it is an estimate and
// the UI says so out loud.
const PHOTO_EVENT_MINUTES = 12;

const PERIOD_DAYS: Record<'week' | 'month', number> = { week: 7, month: 30 };

// House convention: Supabase caps a range at 1000 rows, so every media read
// loops until a short batch comes back, and every .in() list is chunked.
const PAGE_SIZE = 1000;
const ID_CHUNK = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface AreaBucket {
  minutes: number;
  events: number;
}

interface ChildAccumulator {
  child_id: string;
  name: string;
  photo_url: string | null;
  areas: Partial<Record<AreaKey, AreaBucket>>;
  paper_minutes: number;
  photo_events: number;
}

interface RosterRow {
  id: string;
  name: string | null;
  photo_url: string | null;
}

interface PaperRow {
  child_id: string | null;
  area: string | null;
  time_minutes: number | null;
}

interface MediaRow {
  id: string;
  child_id: string | null;
  work_id: string | null;
}

interface MediaChildRow {
  media_id: string;
  child_id: string | null;
}

// The joined area comes back as an object on a to-one relation, but PostgREST
// hands back an array shape in some client versions — accept both.
interface WorkRow {
  id: string;
  area: { area_key: string | null } | Array<{ area_key: string | null }> | null;
}

function workAreaKey(row: WorkRow): string | null {
  const rel = row.area;
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.area_key ?? null;
  return rel.area_key ?? null;
}

function addSignal(child: ChildAccumulator, area: AreaKey, minutes: number): void {
  const bucket = child.areas[area] ?? { minutes: 0, events: 0 };
  bucket.minutes += minutes;
  bucket.events += 1;
  child.areas[area] = bucket;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, WORK_RHYTHM_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const params = new URL(request.url).searchParams;

    // classroom_id narrows it the same way the paper-scan list route allows;
    // without one we fall back to the teacher's own classroom.
    const classroomId = params.get('classroom_id') || auth.classroomId || null;
    if (!classroomId) {
      return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
    }

    const period: 'week' | 'month' = params.get('period') === 'month' ? 'month' : 'week';
    const to = new Date();
    const from = new Date(to.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);
    const fromISO = from.toISOString();

    // ── Roster ────────────────────────────────────────────────────────────
    // Same shape as the extract route's roster read: every child of the
    // classroom, in name order. Children with no signal at all still appear —
    // "this child has been nowhere this week" is exactly the thing a teacher
    // needs to see.
    const { data: rosterData, error: rosterError } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('classroom_id', classroomId)
      .order('name', { ascending: true });

    if (rosterError) {
      console.error('[WorkRhythm] Roster error:', rosterError.message);
      return NextResponse.json({ success: false, error: 'Failed to load work rhythm' }, { status: 500 });
    }

    const roster = (rosterData || []) as RosterRow[];
    const byChild = new Map<string, ChildAccumulator>();
    for (const row of roster) {
      byChild.set(row.id, {
        child_id: row.id,
        name: row.name || '',
        photo_url: row.photo_url ?? null,
        areas: {},
        paper_minutes: 0,
        photo_events: 0,
      });
    }

    // ── Source 1: approved paper-sheet rows ───────────────────────────────
    const { data: paperData, error: paperError } = await supabase
      .from('montree_paper_scan_extractions')
      .select('child_id, area, time_minutes')
      .eq('classroom_id', classroomId)
      .in('review_status', ['approved', 'edited'])
      .not('child_id', 'is', null)
      .gte('created_at', fromISO);

    if (paperError) {
      console.error('[WorkRhythm] Paper extraction error:', paperError.message);
      return NextResponse.json({ success: false, error: 'Failed to load work rhythm' }, { status: 500 });
    }

    for (const row of (paperData || []) as PaperRow[]) {
      if (!row.child_id) continue;
      const child = byChild.get(row.child_id);
      if (!child) continue; // child left the classroom since the sheet was scanned
      const area = normaliseArea(row.area);
      if (!area) continue;
      const minutes =
        typeof row.time_minutes === 'number' && row.time_minutes > 0
          ? row.time_minutes
          : UNTIMED_ENTRY_MINUTES;
      addSignal(child, area, minutes);
      child.paper_minutes += minutes;
    }

    // ── Source 2: confirmed photos ────────────────────────────────────────
    // Paginated: this is the one query that can genuinely exceed 1000 rows for
    // a busy classroom over a month.
    const media: MediaRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data: batch, error: mediaError } = await supabase
        .from('montree_media')
        .select('id, child_id, work_id')
        .eq('classroom_id', classroomId)
        .gte('captured_at', fromISO)
        .not('work_id', 'is', null)
        .eq('teacher_confirmed', true)
        .or('identification_status.is.null,identification_status.neq.pending_review')
        .range(offset, offset + PAGE_SIZE - 1);

      if (mediaError) {
        console.error('[WorkRhythm] Media error:', mediaError.message);
        return NextResponse.json({ success: false, error: 'Failed to load work rhythm' }, { status: 500 });
      }

      const rows = (batch || []) as MediaRow[];
      media.push(...rows);
      if (rows.length < PAGE_SIZE) break;
    }

    if (media.length > 0) {
      // work_id → area_key. montree_media has no area column, so this hop is
      // the only way a photo can be attributed to one of the five areas.
      const workIds = [...new Set(media.map((m) => m.work_id).filter(Boolean))] as string[];
      const workArea = new Map<string, AreaKey>();

      for (const ids of chunk(workIds, ID_CHUNK)) {
        const { data: works, error: worksError } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id, area:montree_classroom_curriculum_areas!area_id(area_key)')
          .in('id', ids);

        if (worksError) {
          console.error('[WorkRhythm] Curriculum works error:', worksError.message);
          return NextResponse.json({ success: false, error: 'Failed to load work rhythm' }, { status: 500 });
        }

        for (const row of (works || []) as WorkRow[]) {
          const area = normaliseArea(workAreaKey(row));
          if (area) workArea.set(row.id, area);
        }
      }

      // Child linkage: the direct column, PLUS the junction table so a group
      // photo counts for every child in it. Deduped per (media, child) so a
      // photo that is both direct-linked and junction-linked counts once.
      const links = new Set<string>();
      const pairs: Array<{ mediaId: string; childId: string }> = [];

      const addPair = (mediaId: string, childId: string | null) => {
        if (!childId) return;
        const key = `${mediaId}:${childId}`;
        if (links.has(key)) return;
        links.add(key);
        pairs.push({ mediaId, childId });
      };

      for (const m of media) addPair(m.id, m.child_id);

      const mediaIds = media.map((m) => m.id);
      for (const ids of chunk(mediaIds, ID_CHUNK)) {
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const { data: batch, error: junctionError } = await supabase
            .from('montree_media_children')
            .select('media_id, child_id')
            .in('media_id', ids)
            .range(offset, offset + PAGE_SIZE - 1);

          if (junctionError) {
            console.error('[WorkRhythm] Media-children error:', junctionError.message);
            return NextResponse.json({ success: false, error: 'Failed to load work rhythm' }, { status: 500 });
          }

          const rows = (batch || []) as MediaChildRow[];
          for (const row of rows) addPair(row.media_id, row.child_id);
          if (rows.length < PAGE_SIZE) break;
        }
      }

      const areaOfMedia = new Map<string, AreaKey>();
      for (const m of media) {
        const area = m.work_id ? workArea.get(m.work_id) : undefined;
        if (area) areaOfMedia.set(m.id, area);
      }

      for (const pair of pairs) {
        const child = byChild.get(pair.childId);
        if (!child) continue; // tagged child is not on this classroom's roster
        const area = areaOfMedia.get(pair.mediaId);
        if (!area) continue; // work has no resolvable area → not guessed at
        addSignal(child, area, PHOTO_EVENT_MINUTES);
        child.photo_events += 1;
      }
    }

    // ── Shape the response ────────────────────────────────────────────────
    const classroomAreas: Record<string, number> = {};
    for (const area of AREA_ORDER) classroomAreas[area] = 0;
    let classroomMinutes = 0;

    const children = roster.map((row) => {
      const acc = byChild.get(row.id)!;

      let totalMinutes = 0;
      let totalEvents = 0;
      let topArea: AreaKey | null = null;
      let topMinutes = 0;

      const areas: Record<string, AreaBucket> = {};
      // AREA_ORDER iteration doubles as the tie-break rule for top_area:
      // on an exact tie the earlier area in the canonical order wins.
      for (const area of AREA_ORDER) {
        const bucket = acc.areas[area];
        if (!bucket || bucket.minutes <= 0) continue;
        areas[area] = { minutes: bucket.minutes, events: bucket.events };
        totalMinutes += bucket.minutes;
        totalEvents += bucket.events;
        classroomAreas[area] += bucket.minutes;
        classroomMinutes += bucket.minutes;
        if (bucket.minutes > topMinutes) {
          topMinutes = bucket.minutes;
          topArea = area;
        }
      }

      return {
        child_id: acc.child_id,
        name: acc.name,
        photo_url: acc.photo_url,
        total_minutes: totalMinutes,
        total_events: totalEvents,
        top_area: topArea,
        areas,
        sources: {
          paper_minutes: acc.paper_minutes,
          photo_events: acc.photo_events,
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        period,
        from: fromISO,
        to: to.toISOString(),
        areas: AREA_ORDER,
        children,
        classroom: {
          total_minutes: classroomMinutes,
          areas: classroomAreas,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[WorkRhythm] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load work rhythm' }, { status: 500 });
  }
}
