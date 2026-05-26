// app/api/montree/calendar/summary/route.ts
// Calendar Plan §8 — narrative summary of a calendar window.
//
// GET /api/montree/calendar/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Reuses the shared scope resolver + registry to gather events, then asks
// Anthropic (Sonnet / Haiku per school AI tier) for a 1–4 paragraph
// narrative tailored to the caller's role. Free-tier schools get a
// deterministic fallback (no AI cost).

import { NextRequest, NextResponse } from 'next/server';
import { getSchoolTimezone, localDateInTzToUtcInstant } from '@/lib/montree/school-time';
import { getSupabase } from '@/lib/supabase-client';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { getAdaptersForRole } from '@/lib/montree/calendar/registry';
import { resolveCalendarScope } from '@/lib/montree/calendar/resolve-scope';
import { summariseCalendar } from '@/lib/montree/calendar/summary';
import type { CalendarEvent, CalendarWindow } from '@/lib/montree/calendar/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const resolvedScope = await resolveCalendarScope(request);
  if (resolvedScope instanceof NextResponse) return resolvedScope;
  const { scope } = resolvedScope;

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

  // Summary windows are tighter — refuse > 92 days to keep prompt cost sane.
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (days > 92) {
    return NextResponse.json({ error: 'Window too large (max 92 days).' }, { status: 400 });
  }

  const tz = await getSchoolTimezone(scope.schoolId);
  const fromInstant = localDateInTzToUtcInstant(from, tz);
  const toPlusOne = new Date(toDate.getTime() + 86_400_000).toISOString().slice(0, 10);
  const toInstant = localDateInTzToUtcInstant(toPlusOne, tz);

  const window: CalendarWindow = { from, to, fromInstant, toInstant, tz };

  // Pull events via the registry. Errors per adapter are isolated.
  const adapters = getAdaptersForRole(scope.role);
  const results = await Promise.allSettled(adapters.map((d) => d.adapter(window, scope)));
  const events: CalendarEvent[] = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') events.push(...r.value);
  });
  events.sort((a, b) => (a.start < b.start ? -1 : 1));

  // Resolve the AI tier (free / haiku / sonnet) and call the summariser.
  const supabase = getSupabase();
  const resolved = await resolveReportModel(supabase, scope.schoolId);
  const summary = await summariseCalendar({ events, window, scope, resolved });

  return NextResponse.json(
    {
      summary: summary.text,
      model: summary.model,
      tier: resolved.tier,
      window: { from, to, tz },
      role: scope.role,
      event_count: events.length,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
