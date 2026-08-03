// lib/montree/progress/advance-on-confirm.ts
//
// THE single source of truth for "a confirmed photo advances the shelf status."
// EVERY confirm path — Wrap-Up ✓ Correct, gallery one-tap, "This is…" tag, and
// the custom-work resolve — routes through this, so every work (curriculum or
// newly added) advances IDENTICALLY. New works added to the shelf inherit this
// flow for free; there is nothing per-work to wire up.
//
// Before this, confirming a photo only refreshed updated_at on a 'presented'
// row and NEVER advanced it. So a work that already had a 'presented' row (the
// seed/replan default) appeared to "do nothing" on confirm, while a work with
// no row jumped to 'practicing' via a separate load-time default — the exact
// Cylinder-Block-vs-Number-Rods inconsistency the teacher hit.
//
// The ladder — a confirmed photo advances the work ONE rung:
//   (no row)     → presented    first evidence: the work has been presented/done
//   not_started  → presented
//   presented    → practicing   repeated evidence: the child is practicing it
//   practicing   → practicing   stays (refresh updated_at) — never auto-master
//   mastered     → mastered     left completely alone
//
// It NEVER downgrades. 'mastered' is teacher-decision-only (set via the explicit
// Presented/Practicing/Mastered picker or the evidence route) — never here.
//
// WP1 (Aug 2026): this is now a THIN WRAPPER. It owns the LADDER — which rung a
// confirmed photo lands on — and nothing else. The write itself (stamps, rank
// gate, first-mastery date, the montree_progress_events journal) belongs to
// lib/montree/progress/write-progress.ts, the one sanctioned writer.

import type { getSupabase } from '@/lib/supabase-client';
import { writeProgress } from './write-progress';

type SupabaseClient = ReturnType<typeof getSupabase>;

export async function advanceProgressOnConfirm({
  supabase,
  childId,
  workName,
  area,
  source = 'photo_confirm',
  classroomId = null,
  schoolId = null,
  actor = null,
}: {
  supabase: SupabaseClient;
  childId: string;
  workName: string | null;
  area: string | null;
  /** What confirmed it — recorded on the progress event. */
  source?: string;
  classroomId?: string | null;
  schoolId?: string | null;
  actor?: string | null;
}): Promise<void> {
  if (!childId || !workName?.trim()) return;
  const name = workName.trim();

  try {
    // Matched by (child_id, work_name) — the table's UNIQUE key — same as every
    // other read/write in this flow. work_name is the string, never work_id.
    const { data: existing } = await supabase
      .from('montree_child_progress')
      .select('status')
      .eq('child_id', childId)
      .eq('work_name', name)
      .maybeSingle();

    const current: string = existing ? (existing.status || 'not_started') : '';

    // Mastered is teacher-owned + terminal here — leave it completely untouched.
    if (current === 'mastered') return;

    // No row yet → first evidence lands on 'presented'. Otherwise one rung up;
    // anything already 'practicing' (or an unexpected active value) keeps its
    // status and just gets its timestamp refreshed.
    const next =
      !existing ? 'presented'
      : current === 'not_started' ? 'presented'
      : current === 'presented' ? 'practicing'
      : current;

    const result = await writeProgress(supabase, {
      childId,
      workName: name,
      area,
      status: next,
      source,
      classroomId,
      schoolId,
      // Only ever true when next === current, i.e. a pure updated_at refresh on an
      // already-'practicing' work (the behaviour this function has always had). The
      // ladder above can never produce a LOWER rung, so this is not a downgrade channel.
      allowDowngrade: !!existing && next === current,
    }, { actor });

    if (result.outcome === 'failed') {
      console.error(`[Progress] confirm advance failed: child=${childId} work="${name}" ${result.error || ''}`);
      return;
    }
    console.log(`[Progress] confirm advance: child=${childId} work="${name}" ${existing ? current : '(new)'} → ${result.status}`);
  } catch (err) {
    // Never block the confirm on a progress-write hiccup.
    console.error('[Progress] advanceProgressOnConfirm failed (non-fatal):', err);
  }
}
