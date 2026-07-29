// /api/montree/parent/montages
//
// The parent-facing montage feed: every little film a teacher has explicitly
// RELEASED (montree_montage_jobs.sent_at, migration 307) that is visible to
// this parent's child.
//
//   GET ?child_id=<uuid>&limit=30
//       → { success, montages: [{ id, scope_type, label, created_at,
//                                 sent_at, video_url }] }
//
// 🚨 VISIBILITY IS THE WHOLE POINT OF THIS FILE. A montage reaches a parent
// only when ALL of these hold:
//   1. sent_at IS NOT NULL      — the teacher pressed "Send to parents".
//                                 Un-sent films are teacher-only, forever.
//   2. status = 'done' and output_path IS NOT NULL — there is a real file.
//   3. the scope covers this child:
//        scope_type='child'     → child_id = this child
//        scope_type='classroom' → classroom_id = this child's classroom
//        scope_type='event'     → the event's classroom = this child's classroom
//      Every branch is anchored on an id we resolved from the CHILD, never on
//      anything the caller sent, so there is no path by which another
//      classroom's — let alone another school's — film can appear. (A
//      classroom belongs to exactly one school, so classroom identity is
//      school identity here.)
//   Report-scope jobs are excluded by construction: they never match any of
//   the three scope branches, and they reach parents via the report page.
//
// Auth mirrors /api/montree/parent/photos exactly: resolveAuthorizedParent()
// (JWT cookie + live DB re-check) plus an authorizedChildIds membership test
// so a multi-child parent can't read a child they're no longer linked to.
//
// 42703-safe: before migration 307 there is no sent_at column, which means
// nothing has ever been sent — the honest answer is an empty feed, not a 500.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { getVideoProxyUrl } from '@/lib/montree/media/proxy-url';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Events per classroom is small; cap so the .or() filter can't grow unbounded. */
const MAX_CLASSROOM_EVENTS = 200;

function isMissingSchema(code?: string): boolean {
  return code === '42P01' || code === '42703';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // --- auth: cookie JWT + live parent↔child re-check ---------------------
    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedChildId = searchParams.get('child_id');
    const childId = requestedChildId || session.childId;
    if (!childId || !UUID_RE.test(childId)) {
      return NextResponse.json({ error: 'child_id must be a uuid' }, { status: 400 });
    }
    // Multi-child safe: the requested child must be in the parent's authorized
    // set, not merely the one stamped on the JWT.
    if (!session.authorizedChildIds.includes(childId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsedLimit = parseInt(searchParams.get('limit') || '30', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 30;

    // --- the child's classroom is the ONLY scope key we trust --------------
    const { data: childRow } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('id', childId)
      .maybeSingle();
    if (!childRow) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    const child = childRow as { id: string; name: string | null; classroom_id: string | null };
    const classroomId = child.classroom_id;

    // Events belonging to that classroom — the bridge for event-scoped films.
    const eventIds: string[] = [];
    const eventNames = new Map<string, string>();
    if (classroomId) {
      const { data: events } = await supabase
        .from('montree_events')
        .select('id, name')
        .eq('classroom_id', classroomId)
        .limit(MAX_CLASSROOM_EVENTS);
      for (const e of (events || []) as Array<{ id: string; name: string | null }>) {
        if (typeof e.id === 'string' && UUID_RE.test(e.id)) {
          eventIds.push(e.id);
          if (e.name) eventNames.set(e.id, e.name);
        }
      }
    }

    // --- the feed query ----------------------------------------------------
    const scopeClauses = [`and(scope_type.eq.child,child_id.eq.${childId})`];
    if (classroomId) {
      scopeClauses.push(`and(scope_type.eq.classroom,classroom_id.eq.${classroomId})`);
    }
    if (eventIds.length) {
      scopeClauses.push(`and(scope_type.eq.event,event_id.in.(${eventIds.join(',')}))`);
    }

    const { data: jobs, error } = await supabase
      .from('montree_montage_jobs')
      .select('id, scope_type, title, child_id, event_id, classroom_id, output_path, created_at, sent_at')
      .eq('status', 'done')
      .not('output_path', 'is', null)
      .not('sent_at', 'is', null)
      .or(scopeClauses.join(','))
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Pre-307 (or pre-304) school: no sent_at / no scope columns means
      // nothing can have been sent. An empty feed is the truthful answer.
      if (isMissingSchema(error.code)) {
        const empty = NextResponse.json({ success: true, montages: [] });
        empty.headers.set('Cache-Control', 'private, no-store');
        return empty;
      }
      console.error('[parent-montages] fetch failed:', error.message);
      return NextResponse.json({ error: 'Failed to load montages' }, { status: 500 });
    }

    const rows = ((jobs || []) as unknown) as Array<Record<string, unknown>>;

    // Classroom name for classroom-scoped rows — one cheap read, and it is
    // this child's OWN classroom, so nothing new is disclosed.
    let classroomName: string | null = null;
    if (classroomId && rows.some((r) => r.scope_type === 'classroom')) {
      const { data: room } = await supabase
        .from('montree_classrooms')
        .select('name')
        .eq('id', classroomId)
        .maybeSingle();
      classroomName = (room as { name?: string } | null)?.name ?? null;
    }

    const montages = rows.map((r) => {
      const scopeType = (r.scope_type as string | null) || 'classroom';
      const eventId = typeof r.event_id === 'string' ? r.event_id : null;
      // title is stamped at enqueue time with the scope's own display name
      // (child name / classroom name / event name), so it is already the
      // right label and already safe for this parent to read.
      const label =
        (r.title as string | null) ||
        (eventId ? eventNames.get(eventId) ?? null : null) ||
        (scopeType === 'classroom' ? classroomName : null) ||
        (scopeType === 'child' ? child.name : null) ||
        'Montage';
      return {
        id: r.id as string,
        scope_type: scopeType,
        label,
        created_at: (r.created_at as string | null) ?? null,
        sent_at: (r.sent_at as string | null) ?? null,
        // Same mechanism the parent report page uses for "This week in film":
        // the plain media proxy (Range-passthrough, Cloudflare-cached).
        video_url: getVideoProxyUrl(r.output_path as string),
      };
    });

    const response = NextResponse.json({ success: true, montages });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('[parent-montages] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
