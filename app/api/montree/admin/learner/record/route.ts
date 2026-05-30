// app/api/montree/admin/learner/record/route.ts
//
// Persist one reading session into a child's learning state (migration 244).
// Called by the home tutor / oral-reading loop. School-scoped: the child must
// belong to the caller's school. Degrades gracefully (200 {degraded:true})
// until migration 244 is run.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { recordReadingSession, type MiscueEvent } from '@/lib/montree/learner/recorder';

export const maxDuration = 20;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanStringArray(val: unknown, cap = 40): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((s) => String(s).trim().slice(0, 60))
    .filter((s) => s.length > 0)
    .slice(0, cap);
}

function cleanMiscues(val: unknown, cap = 60): MiscueEvent[] {
  if (!Array.isArray(val)) return [];
  return val
    .slice(0, cap)
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return {
        target: String(o.target ?? '').trim().slice(0, 80),
        read_as: String(o.read_as ?? '').trim().slice(0, 80),
        type: String(o.type ?? 'substitution').trim().slice(0, 40),
        sound:
          o.sound != null ? String(o.sound).trim().slice(0, 40) : undefined,
        lesson: typeof o.lesson === 'number' ? o.lesson : undefined,
      };
    })
    .filter((m) => m.target.length > 0);
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can record learning sessions.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const childId = String(body.childId ?? '').trim();
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'valid childId required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // School-scope: the child must belong to the caller's school.
  const { data: child, error: childErr } = await supabase
    .from('montree_children')
    .select('id, school_id')
    .eq('id', childId)
    .maybeSingle();
  if (childErr) {
    return NextResponse.json({ error: childErr.message }, { status: 500 });
  }
  if (!child || (child as { school_id: string }).school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'child not in this school' }, { status: 403 });
  }

  const confidenceRaw = String(body.readingConfidence ?? '');
  const readingConfidence =
    confidenceRaw === 'emerging' ||
    confidenceRaw === 'building' ||
    confidenceRaw === 'fluent'
      ? confidenceRaw
      : undefined;

  const result = await recordReadingSession(supabase, {
    childId,
    schoolId: auth.schoolId,
    lessonNum: typeof body.lessonNum === 'number' ? body.lessonNum : undefined,
    miscues: cleanMiscues(body.miscues),
    masteredSounds: cleanStringArray(body.masteredSounds),
    strugglingSounds: cleanStringArray(body.strugglingSounds),
    readingConfidence,
    preferences:
      body.preferences && typeof body.preferences === 'object'
        ? (body.preferences as Record<string, unknown>)
        : undefined,
  });

  if (!result.ok && result.degraded) {
    return NextResponse.json({ degraded: true });
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'record failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
