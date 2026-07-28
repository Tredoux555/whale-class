// /api/montree/montage-tracker/media
//
// Montage Manager — the photo list behind the picker grid, and the per-child
// all-time totals behind the child-grid badges.
//
//   GET ?scope=child&child_id=…[&start=YYYY-MM-DD&end=YYYY-MM-DD]
//   GET ?scope=classroom&classroom_id=…[&start=…&end=…]
//   GET ?scope=event&event_id=…                    (no range — event IS the range)
//       → { ok:true, photos: [{ id, storage_path, captured_at, child_id }],
//           total, truncated }
//
//   GET ?mode=totals[&classroom_id=…]
//       → { ok:true, totals: { [child_id]: number } }   (all-time)
//
// 🚨 parent_visible=true ONLY, everywhere in this route — the picker, the
// badge and the rendered film must agree (see lib/.../media.ts). The COVERAGE
// boards deliberately do NOT filter on it; don't align them.
//
// 🚨 ZERO AI, no teacher_confirmed filter — same contract as the coverage route.
//
// 🚨 TIMEZONE: start/end are the CLIENT's browser-local calendar dates (schools
// store no timezone). This route only validates the YYYY-MM-DD shape.
//
// Read-only. Degrades to a clean 503 pre-migration (42P01 / 42703).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import {
  listScopePhotos,
  childPhotoTotals,
  type MediaScope,
} from '@/lib/montree/montage-tracker/media';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SCOPES: MediaScope[] = ['child', 'classroom', 'event'];

function isMissingSchema(code?: string): boolean {
  return code === '42P01' || code === '42703';
}

function errorCode(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Classroom tool — teachers and principals only (same gate as coverage).
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const supabase = getSupabase();

  // ---------------------------------------------------------------- totals
  if (searchParams.get('mode') === 'totals') {
    // School-wide by default — the child grid these badges decorate lists
    // every child in the school, exactly like the coverage boards and the
    // create route's child scope. `classroom_id` is an OPTIONAL narrowing,
    // validated against the caller's own school (the tenant boundary is
    // school_id, which is taken from the token and never from the client).
    const totalsRoomId = searchParams.get('classroom_id');
    if (totalsRoomId) {
      const { data: room } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', totalsRoomId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (!room) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    try {
      const totals = await childPhotoTotals(supabase, {
        schoolId: auth.schoolId,
        classroomId: totalsRoomId,
      });
      return NextResponse.json({ ok: true, totals });
    } catch (error) {
      if (isMissingSchema(errorCode(error))) {
        return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
      }
      console.error('[montage-tracker/media] totals error:', error);
      return NextResponse.json({ error: 'Failed to load photo totals' }, { status: 500 });
    }
  }

  // ----------------------------------------------------------- photo list
  const scope = searchParams.get('scope') as MediaScope;
  if (!SCOPES.includes(scope)) {
    return NextResponse.json({ error: 'scope must be child, classroom or event' }, { status: 400 });
  }

  const rawStart = searchParams.get('start');
  const rawEnd = searchParams.get('end');
  if ((rawStart && !DATE_RE.test(rawStart)) || (rawEnd && !DATE_RE.test(rawEnd))) {
    return NextResponse.json({ error: 'start / end must be YYYY-MM-DD' }, { status: 400 });
  }
  if (rawStart && rawEnd && rawStart > rawEnd) {
    return NextResponse.json({ error: 'start must be on or before end' }, { status: 400 });
  }

  const childId = searchParams.get('child_id');
  const eventId = searchParams.get('event_id');
  let classroomId = searchParams.get('classroom_id');

  try {
    if (scope === 'child') {
      if (!childId) {
        return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
      }
      // Same tenant gate — and the same SCHOOL-level scope — the create route
      // uses for a child montage (POST /api/montree/montage). The tracker is a
      // team view: any teacher may build a film for any child in her school,
      // exactly as the old creator's child dropdown allowed. Existence is
      // never ownership, so the check is mandatory; it is just not per-room.
      const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (scope === 'classroom') {
      // A teacher's token pins her to her own classroom (mirrors the create route).
      if (auth.classroomId) {
        if (classroomId && classroomId !== auth.classroomId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        classroomId = auth.classroomId;
      }
      if (!classroomId) {
        return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
      }
      const { data: room } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', classroomId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (!room) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    } else {
      if (!eventId) {
        return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
      }
      const { data: event } = await supabase
        .from('montree_events')
        .select('id')
        .eq('id', eventId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const result = await listScopePhotos(supabase, {
      schoolId: auth.schoolId,
      scope,
      childId,
      classroomId,
      eventId,
      dateStart: rawStart,
      dateEnd: rawEnd,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (isMissingSchema(errorCode(error))) {
      return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
    }
    console.error('[montage-tracker/media] GET error:', error);
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 });
  }
}
