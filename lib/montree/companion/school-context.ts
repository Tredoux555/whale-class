// lib/montree/companion/school-context.ts
//
// The Guru bridge — gives Ivy an honest read of the child's SCHOOL side so home
// and school are ONE picture for the parent. It is a pure read of the same
// Montree DB (no cross-service call): per-area progress, the teacher's recent
// notes, and recent behavioural observations for this child.
//
// For a dual-tracked child (enrolled at a real school AND worked with at home)
// this surfaces what the teacher sees. For a pure homeschool child it simply
// reflects their own record. Either way, Ivy never invents the school view —
// she only speaks to what's recorded. Returns '' when there's nothing to say.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { AREA_LABELS_EN as AREA_LABELS } from '@/lib/montree/i18n/area-labels';

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export interface SchoolContextResult {
  /** Prompt-ready section ('' when no school-side signal). */
  section: string;
  hasSignal: boolean;
}

/**
 * Build the schoolContextSection for Ivy's system prompt.
 * Scoped strictly to childId — caller is responsible for having verified the
 * parent owns this child before calling.
 */
export async function buildSchoolContext(
  supabase: SupabaseClient,
  childId: string,
): Promise<SchoolContextResult> {
  const [progressRes, notesRes, obsRes] = await Promise.all([
    supabase
      .from('montree_child_progress')
      .select('area, status, work_name, updated_at')
      .eq('child_id', childId),
    supabase
      .from('montree_teacher_notes')
      .select('content, created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('montree_behavioral_observations')
      .select('behavior_description, created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const progress = (progressRes.data || []) as Array<{
    area: string; status: string; work_name: string; updated_at: string | null;
  }>;
  const notes = ((notesRes.data || []) as Array<{ content: string | null }>)
    .map((n) => (n.content || '').trim())
    .filter(Boolean);
  const observations = ((obsRes.data || []) as Array<{ behavior_description: string | null }>)
    .map((o) => (o.behavior_description || '').trim())
    .filter(Boolean);

  // Per-area progress counts (mastered / practicing / presented).
  const byArea = new Map<string, { mastered: number; practicing: number; presented: number }>();
  let recentWork: { work_name: string; status: string; at: string } | null = null;
  for (const p of progress) {
    const a = byArea.get(p.area) || { mastered: 0, practicing: 0, presented: 0 };
    if (p.status === 'mastered') a.mastered++;
    else if (p.status === 'practicing') a.practicing++;
    else if (p.status === 'presented') a.presented++;
    byArea.set(p.area, a);
    if (p.updated_at && (!recentWork || p.updated_at > recentWork.at)) {
      recentWork = { work_name: p.work_name, status: p.status, at: p.updated_at };
    }
  }

  const hasSignal = progress.length > 0 || notes.length > 0 || observations.length > 0;
  if (!hasSignal) return { section: '', hasSignal: false };

  const lines: string[] = [];

  if (byArea.size > 0) {
    const areaLines: string[] = [];
    for (const area of AREA_ORDER) {
      const c = byArea.get(area);
      if (!c) continue;
      const bits = [
        c.mastered ? `${c.mastered} mastered` : '',
        c.practicing ? `${c.practicing} practising` : '',
        c.presented ? `${c.presented} introduced` : '',
      ].filter(Boolean);
      if (bits.length) areaLines.push(`- ${AREA_LABELS[area] || area}: ${bits.join(', ')}`);
    }
    if (areaLines.length) {
      lines.push('Where they are by area:');
      lines.push(...areaLines);
    }
  }

  if (recentWork) {
    lines.push(`Most recent work on record: ${recentWork.work_name} (${recentWork.status}).`);
  }

  if (notes.length) {
    lines.push('');
    lines.push("The teacher's recent notes:");
    lines.push(...notes.slice(0, 3).map((n) => `- ${n.slice(0, 300)}`));
  }

  if (observations.length) {
    lines.push('');
    lines.push('Recent observations:');
    lines.push(...observations.slice(0, 3).map((o) => `- ${o.slice(0, 300)}`));
  }

  return { section: lines.join('\n'), hasSignal: true };
}
