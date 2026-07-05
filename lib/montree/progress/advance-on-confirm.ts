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

import type { getSupabase } from '@/lib/supabase-client';

type SupabaseClient = ReturnType<typeof getSupabase>;

export async function advanceProgressOnConfirm({
  supabase,
  childId,
  workName,
  area,
}: {
  supabase: SupabaseClient;
  childId: string;
  workName: string | null;
  area: string | null;
}): Promise<void> {
  if (!childId || !workName?.trim()) return;
  const name = workName.trim();
  const now = new Date().toISOString();

  try {
    // Matched by (child_id, work_name) — the table's UNIQUE key — same as every
    // other read/write in this flow. work_name is the string, never work_id.
    const { data: existing } = await supabase
      .from('montree_child_progress')
      .select('id, status')
      .eq('child_id', childId)
      .eq('work_name', name)
      .maybeSingle();

    // No row yet → first evidence lands on 'presented'.
    if (!existing) {
      await supabase.from('montree_child_progress').insert({
        child_id: childId,
        work_name: name,
        area: area || null,
        status: 'presented',
      });
      console.log(`[Progress] confirm advance: child=${childId} work="${name}" (new) → presented`);
      return;
    }

    const current = existing.status || 'not_started';

    // Mastered is teacher-owned + terminal here — leave it completely untouched.
    if (current === 'mastered') return;

    // One rung up the ladder; anything already 'practicing' (or an unexpected
    // active value) just keeps its status and refreshes the timestamp.
    const next =
      current === 'not_started' ? 'presented'
      : current === 'presented' ? 'practicing'
      : null;

    await supabase
      .from('montree_child_progress')
      .update(next ? { status: next, updated_at: now } : { updated_at: now })
      .eq('id', existing.id);

    console.log(`[Progress] confirm advance: child=${childId} work="${name}" ${current} → ${next || current}`);
  } catch (err) {
    // Never block the confirm on a progress-write hiccup.
    console.error('[Progress] advanceProgressOnConfirm failed (non-fatal):', err);
  }
}
