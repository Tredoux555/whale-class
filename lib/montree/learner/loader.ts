// lib/montree/learner/loader.ts
//
// Loader for a child's durable learning state (migration 244). Mirrors the
// parent-profile loader posture: school-scoped, migration-aware, never throws.
// Feeds the home-learning tutor's micro-intervention loop and Astra's
// progress narratives.
//
// SCHOOL-SCOPING
//   Every query filters by schoolId.
//
// MIGRATION-AWARE
//   Returns { degraded: true, state: null } when migration 244 has not been
//   run, so callers degrade to the child's current_lesson alone.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ChildLearningState {
  child_id: string;
  school_id: string;
  mastered_sounds: string[];
  struggling_sounds: string[];
  miscue_history: unknown[];
  reading_confidence: 'emerging' | 'building' | 'fluent';
  preferences: Record<string, unknown>;
  last_lesson_practiced: number | null;
  sessions_count: number;
  last_session_at: string | null;
  notes: string;
  updated_at: string | null;
}

interface LearningStateRow {
  child_id: string;
  school_id: string;
  mastered_sounds: string[] | null;
  struggling_sounds: string[] | null;
  miscue_history: unknown[] | null;
  reading_confidence: string | null;
  preferences: Record<string, unknown> | null;
  last_lesson_practiced: number | null;
  sessions_count: number | null;
  last_session_at: string | null;
  notes: string | null;
  updated_at: string | null;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

function normaliseConfidence(
  val: string | null
): 'emerging' | 'building' | 'fluent' {
  return val === 'emerging' || val === 'fluent' ? val : 'building';
}

export interface LoadLearningStateResult {
  degraded: boolean;
  state: ChildLearningState | null;
}

/**
 * Load a child's learning state. Returns { degraded: true, state: null } when
 * the table is missing (migration 244 not yet run) or on any error, and
 * { degraded: false, state: null } when the table exists but the child has no
 * row yet. Never throws.
 */
export async function loadChildLearningState(
  supabase: SupabaseClient,
  childId: string,
  schoolId: string
): Promise<LoadLearningStateResult> {
  try {
    const { data, error } = await supabase
      .from('montree_child_learning_state')
      .select(
        'child_id, school_id, mastered_sounds, struggling_sounds, miscue_history, reading_confidence, preferences, last_lesson_practiced, sessions_count, last_session_at, notes, updated_at'
      )
      .eq('child_id', childId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) {
      if (isMigrationMissing(error)) return { degraded: true, state: null };
      return { degraded: false, state: null };
    }
    if (!data) return { degraded: false, state: null };

    const r = data as LearningStateRow;
    return {
      degraded: false,
      state: {
        child_id: r.child_id,
        school_id: r.school_id,
        mastered_sounds: r.mastered_sounds ?? [],
        struggling_sounds: r.struggling_sounds ?? [],
        miscue_history: r.miscue_history ?? [],
        reading_confidence: normaliseConfidence(r.reading_confidence),
        preferences: r.preferences ?? {},
        last_lesson_practiced: r.last_lesson_practiced ?? null,
        sessions_count: r.sessions_count ?? 0,
        last_session_at: r.last_session_at ?? null,
        notes: r.notes ?? '',
        updated_at: r.updated_at ?? null,
      },
    };
  } catch (err) {
    if (isMigrationMissing(err)) return { degraded: true, state: null };
    return { degraded: false, state: null };
  }
}

/** One-line summary of a child's learning state for an LLM prompt. */
export function renderLearningStateForPrompt(
  state: ChildLearningState | null
): string {
  if (!state) return 'No learning history yet for this child.';
  return [
    `reading_confidence=${state.reading_confidence}`,
    `mastered_sounds=${state.mastered_sounds.join(',') || 'none'}`,
    `struggling_sounds=${state.struggling_sounds.join(',') || 'none'}`,
    `last_lesson_practiced=${state.last_lesson_practiced ?? 'none'}`,
    `sessions=${state.sessions_count}`,
  ].join('\n');
}
