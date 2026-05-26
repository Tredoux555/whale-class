// app/api/montree/calendar/route.ts
// Calendar Plan §4 + §10 — the one endpoint every calendar surface calls.
//
// GET /api/montree/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&sources=appointment,school_event]
//
// Runs every adapter the caller's role is permitted to see in parallel,
// sorts by start, returns CalendarEvent[]. School-tz-aware bounds.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { getSchoolTimezone, localDateInTzToUtcInstant } from '@/lib/montree/school-time';
import { getSupabase } from '@/lib/supabase-client';
import { getAdaptersForRole } from '@/lib/montree/calendar/registry';
import type {
  CalendarEvent,
  CalendarRole,
  CalendarScope,
  CalendarSource,
  CalendarWindow,
} from '@/lib/montree/calendar/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

interface ResolvedScope {
  scope: CalendarScope;
}

async function resolveScope(request: NextRequest): Promise<ResolvedScope | NextResponse> {
  // Try staff auth first (teacher / principal / super_admin).
  const staffAttempt = await verifySchoolRequest(request);
  if (!(staffAttempt instanceof NextResponse)) {
    const supabase = getSupabase();
    // Teachers + principals: childIds = the classroom's roster, lazily.
    let childIds: string[] = [];
    if (staffAttempt.role === 'teacher' && staffAttempt.classroomId) {
      const { data } = await supabase
        .from('montree_children')
        .select('id')
        .eq('classroom_id', staffAttempt.classroomId)
        .eq('is_active', true);
      childIds = (data || []).map((r: { id: string }) => r.id);
    }
    return {
      scope: {
        role: (staffAttempt.role as CalendarRole) || 'teacher',
        schoolId: staffAttempt.schoolId,
        classroomId: staffAttempt.classroomId || null,
        childIds,
      },
    };
  }

  // Parent path. verifyParentSession reads the cookie via next/headers().
  const parent = await verifyParentSession();
  if (parent) {
    const supabase = getSupabase();
    // Resolve all children the parent has access to. Full-account parents
    // link via montree_parent_children; invite-based sessions are scoped to
    // session.childId (single child).
    let childIds: string[] = [];
    if (parent.parentId) {
      const { data: links } = await supabase
        .from('montree_parent_children')
        .select('child_id')
        .eq('parent_id', parent.parentId);
      childIds = (links || []).map((r: { child_id: string }) => r.child_id);
      // Always include the session childId as a defensive fallback.
      if (parent.childId && !childIds.includes(parent.childId)) {
        childIds.push(parent.childId);
      }
    } else if (parent.childId) {
      childIds = [parent.childId];
    }
    if (childIds.length === 0) {
      return NextResponse.json({ error: 'No children linked to this parent.' }, { status: 403 });
    }
    const { data: kid } = await supabase
      .from('montree_children')
      .select('school_id, classroom_id')
      .eq('id', childIds[0])
      .maybeSingle();
    if (!kid) {
      return NextResponse.json({ error: 'Linked child not found.' }, { status: 404 });
    }
    return {
      scope: {
        role: 'parent',
        schoolId: kid.school_id,
        classroomId: kid.classroom_id || null,
        childIds,
      },
    };
  }

  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const resolved = await resolveScope(request);
  if (resolved instanceof NextResponse) return resolved;
  const { scope } = resolved;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !YYYY_MM_DD.test(from) || !to || !YYYY_MM_DD.test(to)) {
    return NextResponse.json(
      { error: '`from` and `to` are required YYYY-MM-DD strings.' },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json({ error: '`from` must be <= `to`.' }, { status: 400 });
  }

  // Bound the window — refuse > 366 days to keep adapter cost in check.
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (days > 366) {
    return NextResponse.json({ error: 'Window too large (max 366 days).' }, { status: 400 });
  }

  const tz = await getSchoolTimezone(scope.schoolId);
  const fromInstant = localDateInTzToUtcInstant(from, tz);
  // Exclusive upper bound = next-day 00:00 in school tz.
  const toPlusOne = new Date(toDate.getTime() + 86_400_000).toISOString().slice(0, 10);
  const toInstant = localDateInTzToUtcInstant(toPlusOne, tz);

  const window: CalendarWindow = { from, to, fromInstant, toInstant, tz };

  // Optional source filter — clients can ask for a subset.
  const sourcesParam = searchParams.get('sources');
  const requested = new Set<CalendarSource>(
    sourcesParam
      ? (sourcesParam.split(',').map((s) => s.trim()).filter(Boolean) as CalendarSource[])
      : [],
  );

  const adapters = getAdaptersForRole(scope.role).filter(
    (d) => requested.size === 0 || requested.has(d.name),
  );

  // Adapters run in parallel; individual failures are isolated.
  const results = await Promise.allSettled(adapters.map((d) => d.adapter(window, scope)));
  const events: CalendarEvent[] = [];
  const errors: Array<{ source: string; message: string }> = [];
  results.forEach((r, i) => {
    const def = adapters[i];
    if (r.status === 'fulfilled') {
      events.push(...r.value);
    } else {
      console.error(`[calendar] adapter ${def.name} failed`, r.reason);
      errors.push({ source: def.name, message: String(r.reason?.message || r.reason) });
    }
  });

  // Sort: start ascending. All-day before timed on the same day so headers
  // surface first in the UI.
  events.sort((a, b) => {
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  return NextResponse.json(
    {
      events,
      window: { from, to, tz },
      sources: adapters.map((d) => d.name),
      errors: errors.length ? errors : undefined,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
