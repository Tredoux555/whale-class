// lib/montree/guru/classroom-context-builder.ts
// Builds compact context for ALL children in a classroom
// Used by Guru "Whole Class" mode for teaching group suggestions

import { SupabaseClient } from '@supabase/supabase-js';

export interface ClassroomChildSummary {
  id: string;
  name: string;
  age_years: number;
  focus_works: Array<{ area: string; work_name: string }>;
  mastered_count: number;
  practicing_count: number;
  presented_count: number;
  recent_observation: string | null;
}

export interface ClassroomContext {
  classroom_name: string;
  child_count: number;
  age_range: { min: number; max: number };
  children: ClassroomChildSummary[];
  error?: string; // Set when query fails (distinguishes from empty classroom)
}

export async function buildClassroomContext(
  supabase: SupabaseClient,
  classroomId: string
): Promise<ClassroomContext> {
  const emptyResult = (error?: string): ClassroomContext => ({
    classroom_name: '',
    child_count: 0,
    age_range: { min: 0, max: 0 },
    children: [],
    error,
  });

  if (!classroomId) {
    console.error('[ClassroomContext] No classroomId provided');
    return emptyResult('No classroom ID provided');
  }

  // 1. Fetch all children in classroom (use 'age' column, not date_of_birth)
  let children: Array<{ id: string; name: string; age: number | null }> | null = null;
  try {
    const { data, error } = await supabase
      .from('montree_children')
      .select('id, name, age')
      .eq('classroom_id', classroomId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[ClassroomContext] Children query error for classroom:', classroomId, error);
      return emptyResult('Failed to load classroom data');
    }
    children = data;
  } catch (err) {
    console.error('[ClassroomContext] Children query exception for classroom:', classroomId, err);
    return emptyResult('Exception fetching children from database');
  }

  if (!children || children.length === 0) {
    console.log('[ClassroomContext] No children found for classroom:', classroomId);
    return emptyResult(); // No error — classroom is genuinely empty
  }

  const childIds = children.map(c => c.id);

  // 2. Parallel queries: focus works, progress, recent observations
  // Each query is wrapped to prevent one failure from crashing all
  const [focusResult, progressResult, obsResult, classroomResult] = await Promise.all([
    supabase
      .from('montree_child_focus_works')
      .select('child_id, area, work_name')
      .in('child_id', childIds)
      .then(r => { if (r.error) console.error('[ClassroomContext] Focus works query error:', r.error); return r; }),
    supabase
      .from('montree_child_progress')
      .select('child_id, status')
      .in('child_id', childIds)
      .then(r => { if (r.error) console.error('[ClassroomContext] Progress query error:', r.error); return r; }),
    supabase
      .from('montree_behavioral_observations')
      .select('child_id, observation, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(Math.min(30, children.length * 2)) // ~2 per child, cap at 30 for token budget
      .then(r => { if (r.error) console.error('[ClassroomContext] Observations query error:', r.error); return r; }),
    supabase
      .from('montree_classrooms')
      .select('name')
      .eq('id', classroomId)
      .single()
      .then(r => { if (r.error) console.error('[ClassroomContext] Classroom name query error:', r.error); return r; }),
  ]);

  // Group focus works by child
  const focusByChild: Record<string, Array<{ area: string; work_name: string }>> = {};
  for (const fw of focusResult.data || []) {
    if (!focusByChild[fw.child_id]) focusByChild[fw.child_id] = [];
    focusByChild[fw.child_id].push({ area: fw.area, work_name: fw.work_name });
  }

  // Count progress statuses by child
  const progressByChild: Record<string, { mastered: number; practicing: number; presented: number }> = {};
  for (const p of progressResult.data || []) {
    if (!progressByChild[p.child_id]) progressByChild[p.child_id] = { mastered: 0, practicing: 0, presented: 0 };
    if (p.status === 'mastered' || p.status === 'completed') progressByChild[p.child_id].mastered++;
    else if (p.status === 'practicing') progressByChild[p.child_id].practicing++;
    else if (p.status === 'presented') progressByChild[p.child_id].presented++;
  }

  // Get most recent observation per child
  const obsByChild: Record<string, string> = {};
  for (const obs of obsResult.data || []) {
    if (!obsByChild[obs.child_id]) {
      obsByChild[obs.child_id] = obs.observation?.replace(/\n/g, ' ').slice(0, 100) || '';
    }
  }

  // Build child summaries
  const ages: number[] = [];
  const childSummaries: ClassroomChildSummary[] = children.map(child => {
    // Use age directly from DB (integer years), default to 0 if null
    const age = child.age ?? 0;
    if (age > 0) ages.push(age);
    const progress = progressByChild[child.id] || { mastered: 0, practicing: 0, presented: 0 };
    return {
      id: child.id,
      name: child.name,
      age_years: age,
      focus_works: focusByChild[child.id] || [],
      mastered_count: progress.mastered,
      practicing_count: progress.practicing,
      presented_count: progress.presented,
      recent_observation: obsByChild[child.id] || null,
    };
  });

  return {
    classroom_name: classroomResult.data?.name || '',
    child_count: children.length,
    age_range: {
      min: ages.length > 0 ? Math.min(...ages) : 0,
      max: ages.length > 0 ? Math.max(...ages) : 0,
    },
    children: childSummaries,
  };
}

// Format context for system prompt (token-efficient)
export function formatClassroomContextForPrompt(ctx: ClassroomContext): string {
  const areaAbbrev: Record<string, string> = {
    practical_life: 'PL',
    sensorial: 'S',
    mathematics: 'M',
    language: 'L',
    cultural: 'C',
  };

  const lines = ctx.children.map(c => {
    const works = c.focus_works
      .map(fw => `${areaAbbrev[fw.area] || fw.area}=${fw.work_name}`)
      .join(', ');
    const obs = c.recent_observation ? ` | Note: "${c.recent_observation}"` : '';
    return `- ${c.name} (${c.age_years}y): ${works || 'No works set'} | M:${c.mastered_count} Pr:${c.practicing_count} P:${c.presented_count}${obs}`;
  });

  return `CLASSROOM: ${ctx.classroom_name} (${ctx.child_count} students, ages ${ctx.age_range.min}-${ctx.age_range.max})

STUDENT OVERVIEW:
${lines.join('\n')}

Legend: PL=Practical Life, S=Sensorial, M=Mathematics, L=Language, C=Cultural | M=Mastered, Pr=Practicing, P=Presented`;
}
