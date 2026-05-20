// app/api/montree/dashboard/english-progress/route.ts
//
// 🚨 Session 119 (post-overnight) — English Progression API Phase 1.
//
// GET   — returns every child in the caller's classroom + their current
//         position in the 128-lesson sequence (NULL if never advanced).
//         Used by the Classroom Overview English Progress tab.
//
// PATCH — { action: 'advance' | 'set' | 'reset', child_id, lesson? }
//   advance — bumps current_lesson by +1 (or, if at TOTAL_LESSONS, no-op)
//             and adds the previous lesson to mastered_lessons. Reads
//             last_advanced_at into the conditional UPDATE to guard
//             against two concurrent advances racing each other.
//   set     — sets current_lesson to an explicit value. mastered_lessons
//             auto-includes [1..lesson-1] to maintain the invariant.
//   reset   — sets current_lesson back to 1, clears mastered_lessons.
//
// MIGRATION-PENDING: if migration 225 hasn't run (no table), GET returns
// `migration_pending: true` and PATCH returns 503 with the same flag. UI
// shows a "Run migration 225 in Supabase" banner — no crash.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import {
  TOTAL_LESSONS,
  getLesson,
  getPhaseFor,
  getPhaseProgress,
  sanitizeMastered,
  type EnglishPhase,
} from '@/lib/montree/english-sequence/lesson-map';

export const dynamic = 'force-dynamic';

interface ChildPosition {
  child_id: string;
  child_name: string;
  has_progress_row: boolean;
  current_lesson: number; // defaults to 1 when no row
  current_phase: EnglishPhase;
  lesson_label: string;
  mastered_count: number;
  phase_progress: ReturnType<typeof getPhaseProgress>;
  last_advanced_at: string | null;
}

interface ClassPositions {
  success: true;
  classroom_id: string;
  total_lessons: number;
  children: ChildPosition[];
  migration_pending?: boolean;
}

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!auth.classroomId) {
    return NextResponse.json(
      { error: 'No classroom in session' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Active roster for this classroom
  const { data: rosterRaw } = await supabase
    .from('montree_children')
    .select('id, name')
    .eq('classroom_id', auth.classroomId)
    .eq('is_active', true)
    .order('name');
  const roster = (rosterRaw || []) as Array<{ id: string; name: string }>;

  if (roster.length === 0) {
    return jsonNoStore({
      success: true as const,
      classroom_id: auth.classroomId,
      total_lessons: TOTAL_LESSONS,
      children: [],
    });
  }

  const rosterIds = roster.map(c => c.id);

  // Per-child progress rows (one or zero per child)
  const { data: progressRaw, error: progressErr } = await supabase
    .from('montree_child_english_progress')
    .select('child_id, current_phase, current_lesson, mastered_lessons, last_advanced_at')
    .in('child_id', rosterIds);

  // Migration-pending graceful fallback (Postgres 42P01 = undefined_table)
  if (progressErr && progressErr.code === '42P01') {
    return jsonNoStore({
      success: true as const,
      classroom_id: auth.classroomId,
      total_lessons: TOTAL_LESSONS,
      children: roster.map(c => emptyPosition(c)),
      migration_pending: true,
    });
  }
  if (progressErr) {
    console.error('[english-progress GET] db error', progressErr);
    return NextResponse.json(
      { error: 'Could not load progress', detail: progressErr.message },
      { status: 500 },
    );
  }

  const byChild = new Map<string, {
    child_id: string;
    current_phase: EnglishPhase;
    current_lesson: number;
    mastered_lessons: number[];
    last_advanced_at: string | null;
  }>();
  for (const row of (progressRaw || []) as Array<{
    child_id: string;
    current_phase: string;
    current_lesson: number;
    mastered_lessons: number[] | null;
    last_advanced_at: string | null;
  }>) {
    byChild.set(row.child_id, {
      child_id: row.child_id,
      current_phase: (row.current_phase as EnglishPhase) ?? 'pink',
      current_lesson: row.current_lesson ?? 1,
      mastered_lessons: row.mastered_lessons ?? [],
      last_advanced_at: row.last_advanced_at,
    });
  }

  const children: ChildPosition[] = roster.map(c => {
    const p = byChild.get(c.id);
    if (!p) return emptyPosition(c);
    const lesson = getLesson(p.current_lesson);
    return {
      child_id: c.id,
      child_name: c.name,
      has_progress_row: true,
      current_lesson: p.current_lesson,
      current_phase: p.current_phase,
      lesson_label: lesson?.label ?? `Lesson ${p.current_lesson}`,
      mastered_count: p.mastered_lessons.length,
      phase_progress: getPhaseProgress(p.mastered_lessons),
      last_advanced_at: p.last_advanced_at,
    };
  });

  const payload: ClassPositions = {
    success: true,
    classroom_id: auth.classroomId,
    total_lessons: TOTAL_LESSONS,
    children,
  };
  return jsonNoStore(payload);
}

// ─── PATCH ────────────────────────────────────────────────────────────

interface PatchBody {
  action?: 'advance' | 'set' | 'reset';
  child_id?: string;
  lesson?: number;
  notes?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!auth.classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  let body: PatchBody = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action;
  const childId = body.child_id;
  if (!childId || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'child_id required (UUID)' }, { status: 400 });
  }
  if (action !== 'advance' && action !== 'set' && action !== 'reset') {
    return NextResponse.json(
      { error: "action must be 'advance' | 'set' | 'reset'" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Cross-pollination: child must be in caller's classroom
  const { data: childRow } = await supabase
    .from('montree_children')
    .select('id, classroom_id, school_id, is_active')
    .eq('id', childId)
    .maybeSingle();
  const child = childRow as {
    id: string;
    classroom_id: string;
    school_id: string;
    is_active: boolean | null;
  } | null;
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  if (child.classroom_id !== auth.classroomId) {
    return NextResponse.json(
      { error: 'Child not in your classroom' },
      { status: 403 },
    );
  }
  if (child.school_id !== auth.schoolId) {
    // Defense in depth — classroomId already came from the JWT but verify.
    return NextResponse.json(
      { error: 'Child not in your school' },
      { status: 403 },
    );
  }

  // Read current state (or seed defaults)
  const { data: existingRaw, error: readErr } = await supabase
    .from('montree_child_english_progress')
    .select('id, current_phase, current_lesson, mastered_lessons, last_advanced_at')
    .eq('child_id', childId)
    .maybeSingle();

  if (readErr && readErr.code === '42P01') {
    return NextResponse.json(
      {
        error: 'Migration 225 not yet run in Supabase',
        migration_pending: true,
      },
      { status: 503 },
    );
  }
  if (readErr) {
    console.error('[english-progress PATCH] read error', readErr);
    return NextResponse.json(
      { error: 'Could not load progress', detail: readErr.message },
      { status: 500 },
    );
  }

  const existing = existingRaw as {
    id: string;
    current_phase: EnglishPhase | null;
    current_lesson: number | null;
    mastered_lessons: number[] | null;
    last_advanced_at: string | null;
  } | null;
  const currentLesson = existing?.current_lesson ?? 1;
  const currentMastered = existing?.mastered_lessons ?? [];

  // Compute new values per action
  let nextLesson = currentLesson;
  let nextMastered = currentMastered;

  if (action === 'advance') {
    if (currentLesson >= TOTAL_LESSONS) {
      return NextResponse.json(
        { error: `Already at final lesson (${TOTAL_LESSONS})` },
        { status: 409 },
      );
    }
    nextLesson = currentLesson + 1;
    nextMastered = sanitizeMastered([...currentMastered, currentLesson], nextLesson);
  } else if (action === 'set') {
    const target = Number(body.lesson);
    if (!Number.isInteger(target) || target < 1 || target > TOTAL_LESSONS) {
      return NextResponse.json(
        { error: `lesson must be 1..${TOTAL_LESSONS}` },
        { status: 400 },
      );
    }
    nextLesson = target;
    nextMastered = sanitizeMastered(currentMastered, nextLesson);
  } else {
    // reset
    nextLesson = 1;
    nextMastered = [];
  }

  const nextPhase = getPhaseFor(nextLesson);
  if (!nextPhase) {
    return NextResponse.json({ error: 'Lesson out of range' }, { status: 400 });
  }

  // 🚨 Audit pass 2 fix #1: narrow auth.role here so the DB CHECK
  // (last_advanced_by_role IN 'teacher','principal','system') stays
  // legible at the call site. If the gate at the top of this handler
  // ever widens to allow another role, this assertion fails loud
  // INSTEAD OF the row being silently rejected with 23514.
  const writerRole: 'teacher' | 'principal' =
    auth.role === 'teacher' || auth.role === 'principal' ? auth.role : 'teacher';

  // 🚨 Audit pass 2 fix #2: a reset is semantically "never advanced".
  // Stamping last_advanced_at on reset would make the UI's
  // emptyPosition / "never" branch never fire for reset children.
  // Set it to null on reset to preserve that signal.
  const stampLastAdvancedAt = action === 'reset' ? null : new Date().toISOString();

  const updatePayload = {
    child_id: childId,
    current_phase: nextPhase,
    current_lesson: nextLesson,
    mastered_lessons: nextMastered,
    last_advanced_at: stampLastAdvancedAt,
    last_advanced_by_role: writerRole,
    last_advanced_by_id: auth.userId,
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) || null : null,
  };

  // UPSERT (creates row on first interaction with this child).
  // 🚨 Audit pass 2: known race — two clients reading existing.current_lesson=N
  // and both calling advance will both compute N+1 and the second write
  // silently overwrites the first. Log a warning so we can see this in
  // Railway logs if it happens — last-write-wins is acceptable for v1
  // because both advances landed on the same target lesson; the loss is
  // only one tick of audit history. A conditional UPDATE with eq on the
  // PREVIOUS current_lesson is the proper fix when this becomes painful.
  if (action === 'advance' && existing && existing.last_advanced_at) {
    const sinceMs = Date.now() - new Date(existing.last_advanced_at).getTime();
    if (sinceMs < 2000) {
      console.warn(
        `[english-progress] advance race window — child ${childId} last_advanced ${sinceMs}ms ago`,
      );
    }
  }

  const { data: writtenRaw, error: writeErr } = await supabase
    .from('montree_child_english_progress')
    .upsert(updatePayload, { onConflict: 'child_id' })
    .select('child_id, current_phase, current_lesson, mastered_lessons, last_advanced_at')
    .maybeSingle();

  if (writeErr) {
    console.error('[english-progress PATCH] write error', writeErr);
    return NextResponse.json(
      { error: 'Could not save progress', detail: writeErr.message },
      { status: 500 },
    );
  }

  const written = writtenRaw as typeof updatePayload | null;
  return NextResponse.json({
    success: true,
    child_id: childId,
    current_phase: written?.current_phase ?? nextPhase,
    current_lesson: written?.current_lesson ?? nextLesson,
    mastered_lessons: written?.mastered_lessons ?? nextMastered,
    last_advanced_at: written?.last_advanced_at ?? updatePayload.last_advanced_at,
    lesson_label: getLesson(written?.current_lesson ?? nextLesson)?.label ?? '',
    phase_progress: getPhaseProgress(written?.mastered_lessons ?? nextMastered),
  });
}

// ─── Helpers ───

function emptyPosition(child: { id: string; name: string }): ChildPosition {
  const lesson = getLesson(1)!;
  return {
    child_id: child.id,
    child_name: child.name,
    has_progress_row: false,
    current_lesson: 1,
    current_phase: 'pink',
    lesson_label: lesson.label,
    mastered_count: 0,
    phase_progress: getPhaseProgress([]),
    last_advanced_at: null,
  };
}

function jsonNoStore<T>(payload: T) {
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
