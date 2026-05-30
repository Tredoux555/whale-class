// lib/montree/learner/recorder.ts
//
// Write-path for the per-child learning state (migration 244). The home tutor
// (and any oral-reading session) calls recordReadingSession() to persist what
// happened: which miscues occurred, which sounds were mastered, the lesson
// practised, and a session bump. Mirrors the loader's school-scoped,
// migration-aware posture; never throws.
//
// PRIVACY: only abstracted miscue events are stored (target/read_as/type/sound).
// No audio, no transcript.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MiscueEvent {
  target: string; // the word/sound the child was meant to read
  read_as: string; // what they actually said
  type: string; // 'substitution' | 'omission' | 'insertion' | 'self_correction' | ...
  sound?: string; // the grapheme/phoneme implicated, e.g. 'sh'
  lesson?: number;
}

export interface RecordSessionInput {
  childId: string;
  schoolId: string;
  lessonNum?: number;
  miscues?: MiscueEvent[];
  masteredSounds?: string[];
  strugglingSounds?: string[];
  readingConfidence?: 'emerging' | 'building' | 'fluent';
  preferences?: Record<string, unknown>;
}

export interface RecordResult {
  ok: boolean;
  degraded?: boolean; // migration 244 not run
  error?: string;
}

const MAX_MISCUE_HISTORY = 200;

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

interface ExistingRow {
  miscue_history: unknown[] | null;
  mastered_sounds: string[] | null;
  struggling_sounds: string[] | null;
  sessions_count: number | null;
}

/**
 * Record one reading session for a child. Upserts the (child, school) row:
 * appends miscues (capped), merges sound lists (mastered wins over struggling),
 * bumps sessions_count, stamps last_session_at + last_lesson_practiced.
 */
export async function recordReadingSession(
  supabase: SupabaseClient,
  input: RecordSessionInput
): Promise<RecordResult> {
  try {
    const { data: existing, error } = await supabase
      .from('montree_child_learning_state')
      .select('miscue_history, mastered_sounds, struggling_sounds, sessions_count')
      .eq('child_id', input.childId)
      .eq('school_id', input.schoolId)
      .maybeSingle();
    if (error) {
      if (isMigrationMissing(error)) return { ok: false, degraded: true };
      return { ok: false, error: error.message };
    }

    const prev = (existing as ExistingRow | null) ?? null;
    const now = new Date().toISOString();

    const prevMiscues = Array.isArray(prev?.miscue_history)
      ? (prev!.miscue_history as unknown[])
      : [];
    const newMiscues = (input.miscues ?? []).map((m) => ({ ...m, at: now }));
    const miscueHistory = [...prevMiscues, ...newMiscues].slice(-MAX_MISCUE_HISTORY);

    const mastered = Array.from(
      new Set([...(prev?.mastered_sounds ?? []), ...(input.masteredSounds ?? [])])
    );
    const struggling = Array.from(
      new Set([...(prev?.struggling_sounds ?? []), ...(input.strugglingSounds ?? [])])
    ).filter((s) => !mastered.includes(s));

    const sessions = (prev?.sessions_count ?? 0) + 1;

    const row: Record<string, unknown> = {
      child_id: input.childId,
      school_id: input.schoolId,
      miscue_history: miscueHistory,
      mastered_sounds: mastered,
      struggling_sounds: struggling,
      sessions_count: sessions,
      last_session_at: now,
    };
    if (typeof input.lessonNum === 'number') row.last_lesson_practiced = input.lessonNum;
    if (input.readingConfidence) row.reading_confidence = input.readingConfidence;
    if (input.preferences) row.preferences = input.preferences;

    const { error: upErr } = await supabase
      .from('montree_child_learning_state')
      .upsert(row as never, { onConflict: 'child_id,school_id' });
    if (upErr) {
      if (isMigrationMissing(upErr)) return { ok: false, degraded: true };
      return { ok: false, error: upErr.message };
    }
    return { ok: true };
  } catch (err) {
    if (isMigrationMissing(err)) return { ok: false, degraded: true };
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
