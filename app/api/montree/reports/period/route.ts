// app/api/montree/reports/period/route.ts
// Weekly & Monthly Report — the aggregate behind /montree/dashboard/period-report.
// Plan: docs/handoffs/PLAN_ALL_AREAS_REPORTS_AUG22.md (visual report page).
//
//   GET  ?type=week|month&start=YYYY-MM-DD[&classroom_id=…][&refresh=1]
//        → { success, aggregate: PeriodAggregate, ai_lines: {child_id: line}, cached: boolean }
//        Default period = the one containing today in the school's timezone.
//        Result is cached in montree_period_reports (UNIQUE classroom × type ×
//        start); refresh=1 recomputes and overwrites. A missing cache table
//        (336 not pasted yet) is tolerated — the aggregate is still returned,
//        just never cached, and the aggregator's own warnings say why.
//
//   POST ?type=…&start=…&ai=1
//        → asks AI_MODEL for ONE ≤20-word English line per child from the
//        cached/recomputed aggregate via a forced tool, stores them in
//        ai_lines, returns { success, ai_lines }. Opt-in per click; nothing is
//        generated unless a teacher asks. Without ai=1 the POST is a no-op 400.
//
// Feature-gated on 'period_reports' (migration 336, default OFF).
// Scoping: verifySchoolRequest → schoolId; classroom must belong to that school.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { aggregatePeriod } from '@/lib/montree/reports/period-aggregator';
import type { PeriodAggregate, PeriodType } from '@/lib/montree/reports/period-types';
import { AREA_ORDER } from '@/lib/montree/reports/period-types';
import { isYMD, todayInOffset, snapPeriodStart, topWorks } from '@/lib/montree/reports/period-report-view';
import { schoolUtcOffsetHours } from '@/lib/montree/reports/school-timezone';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'period_reports';

const MISSING_RELATION_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

// A period that is still running (today ≤ period_end in the school's timezone)
// changes every time a sheet is committed, so its cache is only trusted for a
// few minutes; a closed period is served from cache until refresh=1.
const OPEN_PERIOD_CACHE_MS = 5 * 60_000;

type AiLines = Record<string, string>;

interface ResolvedRequest {
  schoolId: string;
  classroomId: string;
  periodType: PeriodType;
  periodStart: string;
  utcOffsetHours: number;
}

interface CacheRow {
  data: PeriodAggregate;
  ai_lines: AiLines | null;
  generated_at: string;
}

// ───────────────────────── helpers ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function classroomBelongsToSchool(supabase: any, classroomId: string, schoolId: string): Promise<boolean> {
  const { data } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('school_id', schoolId)
    .maybeSingle();
  return !!data;
}

async function resolveRequest(request: NextRequest): Promise<ResolvedRequest | NextResponse> {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  const supabase = getSupabase();

  if (!(await isFeatureEnabled(supabase, auth.schoolId, FEATURE_KEY))) {
    return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const classroomId = params.get('classroom_id') || auth.classroomId || null;
  if (!classroomId) {
    return NextResponse.json({ success: false, error: 'classroom_id required' }, { status: 400 });
  }
  if (classroomId !== auth.classroomId && !(await classroomBelongsToSchool(supabase, classroomId, auth.schoolId))) {
    return NextResponse.json({ success: false, error: 'classroom_not_found' }, { status: 404 });
  }

  const periodType: PeriodType = params.get('type') === 'month' ? 'month' : 'week';
  const utcOffsetHours = await schoolUtcOffsetHours(supabase, auth.schoolId);
  const rawStart = params.get('start');
  if (rawStart && !isYMD(rawStart)) {
    return NextResponse.json({ success: false, error: 'start must be YYYY-MM-DD' }, { status: 400 });
  }
  const periodStart = snapPeriodStart(periodType, rawStart || todayInOffset(utcOffsetHours));

  return { schoolId: auth.schoolId, classroomId, periodType, periodStart, utcOffsetHours };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readCache(supabase: any, r: ResolvedRequest): Promise<CacheRow | null> {
  try {
    const { data, error } = await supabase
      .from('montree_period_reports')
      .select('data, ai_lines, generated_at')
      .eq('classroom_id', r.classroomId)
      .eq('period_type', r.periodType)
      .eq('period_start', r.periodStart)
      .maybeSingle();
    if (error) {
      if (!MISSING_RELATION_CODES.has(error.code)) console.warn('[period-report] cache read:', error.message);
      return null;
    }
    return data && data.data ? (data as CacheRow) : null;
  } catch (err) {
    console.warn('[period-report] cache read threw:', err);
    return null;
  }
}

/** Is this cached row still usable for a GET without refresh=1? */
function cacheIsFresh(cached: CacheRow, r: ResolvedRequest, now: Date = new Date()): boolean {
  const periodEnd = cached.data?.period_end;
  const today = todayInOffset(r.utcOffsetHours, now);
  if (periodEnd && periodEnd < today) return true; // closed period: data cannot change
  const age = now.getTime() - Date.parse(cached.generated_at || '');
  return Number.isFinite(age) && age >= 0 && age < OPEN_PERIOD_CACHE_MS;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeCache(supabase: any, r: ResolvedRequest, agg: PeriodAggregate, aiLines?: AiLines): Promise<boolean> {
  try {
    const row: Record<string, unknown> = {
      school_id: r.schoolId,
      classroom_id: r.classroomId,
      period_type: r.periodType,
      period_start: agg.period_start,
      period_end: agg.period_end,
      data: agg,
      generated_at: agg.generated_at,
    };
    if (aiLines) row.ai_lines = aiLines;
    const { error } = await supabase
      .from('montree_period_reports')
      .upsert(row, { onConflict: 'classroom_id,period_type,period_start' });
    if (error) {
      if (!MISSING_RELATION_CODES.has(error.code)) console.warn('[period-report] cache write:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[period-report] cache write threw:', err);
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function compute(supabase: any, r: ResolvedRequest): Promise<PeriodAggregate> {
  return aggregatePeriod(supabase, {
    classroomId: r.classroomId,
    schoolId: r.schoolId,
    periodType: r.periodType,
    periodStart: r.periodStart,
    utcOffsetHours: r.utcOffsetHours,
  });
}

// ───────────────────────── GET ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequest(request);
    if (resolved instanceof NextResponse) return resolved;
    const supabase = getSupabase();
    const refresh = new URL(request.url).searchParams.get('refresh') === '1';

    const cached = await readCache(supabase, resolved);
    if (!refresh) {
      if (cached && cacheIsFresh(cached, resolved)) {
        return NextResponse.json({
          success: true,
          aggregate: cached.data,
          ai_lines: cached.ai_lines ?? {},
          cached: true,
          cached_at: cached.generated_at,
        });
      }
    }

    const aggregate = await compute(supabase, resolved);
    // A recompute (refresh=1, or a stale open-period cache) must not throw
    // away AI lines a teacher already paid for.
    const aiLines = cached?.ai_lines ?? {};
    const stored = await writeCache(supabase, resolved, aggregate, cached ? aiLines : undefined);

    return NextResponse.json({ success: true, aggregate, ai_lines: aiLines, cached: false, stored });
  } catch (err) {
    console.error('[period-report] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to build period report' }, { status: 500 });
  }
}

// ───────────────────────── POST ?ai=1 ─────────────────────────

const AI_LINES_TOOL = {
  name: 'write_child_lines',
  description: 'One short English line per child summarising where their work went this period.',
  input_schema: {
    type: 'object' as const,
    properties: {
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            child_id: { type: 'string' },
            line: { type: 'string', description: 'At most 20 words. Plain, warm, factual. No child name.' },
          },
          required: ['child_id', 'line'],
        },
      },
    },
    required: ['lines'],
  },
};

const MAX_LINE_WORDS = 20;

function clampLine(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return null;
  return words.slice(0, MAX_LINE_WORDS).join(' ');
}

function childDigest(agg: PeriodAggregate): string {
  return agg.children
    .map((c) => {
      const areas = AREA_ORDER
        .map((a) => `${a}:${c.by_area[a]?.sessions ?? 0}s/${Math.round(c.by_area[a]?.minutes_est ?? 0)}m`)
        .join(' ');
      const works = topWorks(c, 3).map((w) => `${w.work_name}(${w.sessions})`).join(', ') || '-';
      const moves = c.transitions.map((t) => `${t.work_name}→${t.to}`).join(', ') || '-';
      return `child_id=${c.child_id}\n  areas: ${areas}\n  top works: ${works}\n  movement: ${moves}\n  notes: ${c.notes.count}`;
    })
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveRequest(request);
    if (resolved instanceof NextResponse) return resolved;
    const params = new URL(request.url).searchParams;
    if (params.get('ai') !== '1') {
      return NextResponse.json({ success: false, error: 'ai=1 required' }, { status: 400 });
    }
    if (!anthropic) {
      return NextResponse.json({ success: false, error: 'ai_unavailable' }, { status: 503 });
    }
    const supabase = getSupabase();

    const cached = await readCache(supabase, resolved);
    const aggregate = cached?.data ?? (await compute(supabase, resolved));
    if (aggregate.children.length === 0) {
      return NextResponse.json({ success: true, ai_lines: {} });
    }

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      temperature: 0,
      system:
        'You write one-line summaries for a Montessori teacher\'s weekly/monthly class report. ' +
        'For each child you receive per-area session counts (s) and estimated minutes (m), their most-used works, ' +
        'status movement (presented/practicing/mastered) and a note count. Write ONE English line per child, ' +
        'at most 20 words, factual and warm, naming the area or work that mattered most. Never invent detail; ' +
        'if a child has no sessions say so plainly. Do not include the child\'s name.',
      tools: [AI_LINES_TOOL],
      tool_choice: { type: 'tool', name: 'write_child_lines' },
      messages: [{ role: 'user', content: `Period: ${aggregate.period_type} ${aggregate.period_start} to ${aggregate.period_end}\n\n${childDigest(aggregate)}` }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ success: false, error: 'no_tool_use' }, { status: 502 });
    }
    const known = new Set(aggregate.children.map((c) => c.child_id));
    const input = toolUse.input as { lines?: Array<{ child_id?: unknown; line?: unknown }> };
    const aiLines: AiLines = { ...(cached?.ai_lines ?? {}) };
    for (const item of input.lines ?? []) {
      if (typeof item?.child_id !== 'string' || !known.has(item.child_id)) continue;
      const line = clampLine(item.line);
      if (line) aiLines[item.child_id] = line;
    }

    const stored = await writeCache(supabase, resolved, aggregate, aiLines);
    return NextResponse.json({ success: true, ai_lines: aiLines, stored });
  } catch (err) {
    console.error('[period-report] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to generate lines' }, { status: 500 });
  }
}
