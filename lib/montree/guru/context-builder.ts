// lib/montree/guru/context-builder.ts
// Gathers all relevant child context for the Guru AI

import { SupabaseClient } from '@supabase/supabase-js';

export interface ChildContext {
  // Basic info
  id: string;
  name: string;
  age_years: number;
  age_months: number;
  classroom_id: string;
  time_at_school: string;

  // Mental profile
  mental_profile: MentalProfile | null;

  // Recent progress
  current_works: WorkProgress[];
  mastered_count: number;
  practicing_count: number;
  presented_count: number;

  // Observations
  recent_observations: Observation[];

  // Past guru interactions
  past_interactions: PastInteraction[];

  // Work session notes
  teacher_notes: TeacherNote[];

  // Focus works (current shelf)
  focus_works: Array<{ area: string; work_name: string; set_at: string; set_by: string }>;

  // Child profile from guru intake (if exists)
  guru_child_profile?: Record<string, unknown>;

  // Parent emotional state (from save_parent_state tool)
  parent_emotional_state?: {
    emotional_themes: string[];
    confidence_level: string;
    stress_indicators: string[];
    support_needed: string | null;
    updated_at: string;
  };

  // Developmental insights (from save_developmental_insight tool)
  developmental_insights: Array<{
    insight_type: string;
    description: string;
    confidence: string;
    recorded_at: string;
  }>;

  // Guidance outcomes (from track_guidance_outcome tool)
  guidance_outcomes: Array<{
    guidance_given: string;
    outcome: string;
    recorded_at: string;
  }>;
}

export interface MentalProfile {
  temperament: {
    activity_level?: number;
    regularity?: number;
    initial_reaction?: number;
    adaptability?: number;
    intensity?: number;
    mood_quality?: number;
    distractibility?: number;
    persistence?: number;
    sensory_threshold?: number;
  };
  learning_modality: {
    visual?: number;
    auditory?: number;
    kinesthetic?: number;
  };
  baseline_focus_minutes?: number;
  optimal_time_of_day?: string;
  sensitive_periods: {
    order?: string;
    language?: string;
    movement?: string;
    sensory?: string;
    small_objects?: string;
    grace_courtesy?: string;
  };
  family_notes?: string;
  sleep_status?: string;
  special_considerations?: string;
  successful_strategies?: string[];
  challenging_triggers?: string[];
}

export interface WorkProgress {
  work_name: string;
  area: string;
  status: string;
  last_worked: string;
  notes?: string;
}

export interface Observation {
  observed_at: string;
  behavior_description: string;
  antecedent?: string;
  behavior_function?: string;
  intervention_used?: string;
  effectiveness?: string;
}

export interface PastInteraction {
  asked_at: string;
  question: string;
  response_insight: string;
  outcome?: string;
  context_snapshot?: Record<string, unknown>;
}

export interface TeacherNote {
  work_name: string;
  notes: string;
  observed_at: string;
}

function calculateAge(dateOfBirth: string): { years: number; months: number } {
  const birth = new Date(dateOfBirth);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  return { years, months };
}

function calculateTimeAtSchool(enrollmentDate: string): string {
  const enrolled = new Date(enrollmentDate);
  const now = new Date();
  const diffMs = now.getTime() - enrolled.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
  }
}

export async function buildChildContext(
  supabase: SupabaseClient,
  childId: string
): Promise<ChildContext | null> {
  // 1. Fetch basic child info
  // Note: montree_children has 'age' (integer years) not 'date_of_birth'
  // enrolled_at tracks when the child started at the school (may differ from created_at)
  const { data: child, error: childError } = await supabase
    .from('montree_children')
    .select('id, name, age, classroom_id, created_at, enrolled_at')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    console.error('Failed to fetch child:', childError);
    return null;
  }

  // Age is stored as integer years, estimate months as 6
  const age = { years: child.age || 4, months: 6 };
  // Use enrolled_at if available, otherwise fall back to created_at
  const timeAtSchool = calculateTimeAtSchool(child.enrolled_at || child.created_at);

  // 2. Fetch mental profile (if exists)
  const { data: profile } = await supabase
    .from('montree_child_mental_profiles')
    .select('*')
    .eq('child_id', childId)
    .single();

  const mentalProfile: MentalProfile | null = profile ? {
    temperament: {
      activity_level: profile.temperament_activity_level,
      regularity: profile.temperament_regularity,
      initial_reaction: profile.temperament_initial_reaction,
      adaptability: profile.temperament_adaptability,
      intensity: profile.temperament_intensity,
      mood_quality: profile.temperament_mood_quality,
      distractibility: profile.temperament_distractibility,
      persistence: profile.temperament_persistence,
      sensory_threshold: profile.temperament_sensory_threshold,
    },
    learning_modality: {
      visual: profile.learning_modality_visual,
      auditory: profile.learning_modality_auditory,
      kinesthetic: profile.learning_modality_kinesthetic,
    },
    baseline_focus_minutes: profile.baseline_focus_minutes,
    optimal_time_of_day: profile.optimal_time_of_day,
    sensitive_periods: {
      order: profile.sensitive_period_order,
      language: profile.sensitive_period_language,
      movement: profile.sensitive_period_movement,
      sensory: profile.sensitive_period_sensory,
      small_objects: profile.sensitive_period_small_objects,
      grace_courtesy: profile.sensitive_period_grace_courtesy,
    },
    family_notes: profile.family_notes,
    sleep_status: profile.sleep_status,
    special_considerations: profile.special_considerations,
    successful_strategies: profile.successful_strategies || [],
    challenging_triggers: profile.challenging_triggers || [],
  } : null;

  // 3. Fetch current progress
  const { data: progress } = await supabase
    .from('montree_child_progress')
    .select('work_name, area, status, created_at, notes')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  const currentWorks: WorkProgress[] = (progress || []).map(p => ({
    work_name: p.work_name,
    area: p.area,
    status: p.status,
    last_worked: p.created_at,
    notes: p.notes,
  }));

  // Count by status
  const statusCounts = currentWorks.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 4. Fetch recent behavioral observations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: observations } = await supabase
    .from('montree_behavioral_observations')
    .select('*')
    .eq('child_id', childId)
    .gte('observed_at', thirtyDaysAgo.toISOString())
    .order('observed_at', { ascending: false })
    .limit(10);

  const recentObservations: Observation[] = (observations || []).map(o => ({
    observed_at: o.observed_at,
    behavior_description: o.behavior_description,
    antecedent: o.antecedent,
    behavior_function: o.behavior_function,
    intervention_used: o.intervention_used,
    effectiveness: o.effectiveness,
  }));

  // 5. Fetch past guru interactions (last 5)
  const { data: pastGuru } = await supabase
    .from('montree_guru_interactions')
    .select('asked_at, question, response_insight, outcome, context_snapshot')
    .eq('child_id', childId)
    .order('asked_at', { ascending: false })
    .limit(5);

  const pastInteractions: PastInteraction[] = (pastGuru || []).map(g => ({
    asked_at: g.asked_at,
    question: g.question,
    response_insight: g.response_insight,
    outcome: g.outcome,
    context_snapshot: g.context_snapshot as Record<string, unknown> | undefined,
  }));

  // 6. Fetch teacher notes from work sessions (last 20)
  const { data: workSessions } = await supabase
    .from('montree_work_sessions')
    .select('work_name, notes, observed_at')
    .eq('child_id', childId)
    .not('notes', 'is', null)
    .order('observed_at', { ascending: false })
    .limit(20);

  const teacherNotes: TeacherNote[] = (workSessions || [])
    .filter(s => s.notes && s.notes.trim())
    .map(s => ({
      work_name: s.work_name,
      notes: s.notes,
      observed_at: s.observed_at,
    }));

  // 7. Fetch focus works (current shelf)
  const { data: focusWorks } = await supabase
    .from('montree_child_focus_works')
    .select('area, work_name, set_at, set_by')
    .eq('child_id', childId);

  // 8. Fetch child settings for guru profile
  const { data: childSettings } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .single();
  const settings = (childSettings?.settings as Record<string, unknown>) || {};

  return {
    id: child.id,
    name: child.name.split(' ')[0], // First name only for privacy
    age_years: age.years,
    age_months: age.months,
    classroom_id: child.classroom_id,
    time_at_school: timeAtSchool,
    mental_profile: mentalProfile,
    current_works: currentWorks.slice(0, 30), // Last 30 works
    mastered_count: statusCounts['mastered'] || 0,
    practicing_count: statusCounts['practicing'] || 0,
    presented_count: statusCounts['presented'] || 0,
    recent_observations: recentObservations,
    past_interactions: pastInteractions,
    teacher_notes: teacherNotes,
    focus_works: (focusWorks || []).map(fw => ({
      area: fw.area,
      work_name: fw.work_name,
      set_at: fw.set_at,
      set_by: fw.set_by,
    })),
    guru_child_profile: settings.guru_child_profile as Record<string, unknown> | undefined,
    parent_emotional_state: settings.guru_parent_current_state as ChildContext['parent_emotional_state'] | undefined,
    developmental_insights: (Array.isArray(settings.guru_developmental_insights) ? settings.guru_developmental_insights : []).map((i: Record<string, unknown>) => ({
      insight_type: i.insight_type as string,
      description: i.description as string,
      confidence: (i.confidence as string) || 'speculative',
      recorded_at: i.recorded_at as string,
    })),
    guidance_outcomes: (Array.isArray(settings.guru_guidance_outcomes) ? settings.guru_guidance_outcomes : []).map((o: Record<string, unknown>) => ({
      guidance_given: o.guidance_given as string,
      outcome: o.outcome as string,
      recorded_at: o.recorded_at as string,
    })),
  };
}

export function formatContextForPrompt(context: ChildContext): string {
  const lines: string[] = [];

  // Basic info
  lines.push(`CHILD: ${context.name}`);
  lines.push(`AGE: ${context.age_years} years, ${context.age_months} months`);
  lines.push(`TIME AT SCHOOL: ${context.time_at_school}`);
  lines.push('');

  // Progress summary
  lines.push('PROGRESS SUMMARY:');
  lines.push(`- Mastered: ${context.mastered_count} works`);
  lines.push(`- Practicing: ${context.practicing_count} works`);
  lines.push(`- Presented: ${context.presented_count} works`);
  lines.push('');

  // Mental profile (if available)
  if (context.mental_profile) {
    const mp = context.mental_profile;

    // Temperament
    const tempTraits: string[] = [];
    if (mp.temperament.activity_level) {
      tempTraits.push(`Activity: ${mp.temperament.activity_level}/5`);
    }
    if (mp.temperament.persistence) {
      tempTraits.push(`Persistence: ${mp.temperament.persistence}/5`);
    }
    if (mp.temperament.distractibility) {
      tempTraits.push(`Distractibility: ${mp.temperament.distractibility}/5`);
    }
    if (mp.temperament.adaptability) {
      tempTraits.push(`Adaptability: ${mp.temperament.adaptability}/5`);
    }

    if (tempTraits.length > 0) {
      lines.push('TEMPERAMENT:');
      lines.push(`- ${tempTraits.join(', ')}`);
    }

    // Sensitive periods
    const activePeriods = Object.entries(mp.sensitive_periods)
      .filter(([_, status]) => status === 'active')
      .map(([period]) => period.replace('_', ' '));

    if (activePeriods.length > 0) {
      lines.push('');
      lines.push('ACTIVE SENSITIVE PERIODS:');
      lines.push(`- ${activePeriods.join(', ')}`);
    }

    // Focus baseline
    if (mp.baseline_focus_minutes) {
      lines.push(`BASELINE FOCUS: ${mp.baseline_focus_minutes} minutes`);
    }

    // Optimal time
    if (mp.optimal_time_of_day) {
      lines.push(`OPTIMAL WORK TIME: ${mp.optimal_time_of_day}`);
    }

    // Family notes
    if (mp.family_notes) {
      lines.push('');
      lines.push('FAMILY CONTEXT:');
      lines.push(mp.family_notes);
    }

    // Sleep
    if (mp.sleep_status && mp.sleep_status !== 'normal') {
      lines.push(`SLEEP STATUS: ${mp.sleep_status}`);
    }

    // What works
    if (mp.successful_strategies && mp.successful_strategies.length > 0) {
      lines.push('');
      lines.push('STRATEGIES THAT WORK:');
      mp.successful_strategies.forEach(s => lines.push(`- ${s}`));
    }

    // Triggers
    if (mp.challenging_triggers && mp.challenging_triggers.length > 0) {
      lines.push('');
      lines.push('KNOWN TRIGGERS:');
      mp.challenging_triggers.forEach(t => lines.push(`- ${t}`));
    }

    lines.push('');
  }

  // Focus works (current shelf)
  if (context.focus_works && context.focus_works.length > 0) {
    lines.push('CURRENT SHELF (Focus Works):');
    context.focus_works.forEach(fw => {
      lines.push(`- ${fw.area}: ${fw.work_name} (since ${new Date(fw.set_at).toLocaleDateString()})`);
    });
    lines.push('');
  } else {
    lines.push('CURRENT SHELF: Empty — no focus works set yet.');
    lines.push('');
  }

  // Recent observations
  if (context.recent_observations.length > 0) {
    lines.push('RECENT OBSERVATIONS:');
    context.recent_observations.slice(0, 5).forEach(obs => {
      const date = new Date(obs.observed_at).toLocaleDateString();
      lines.push(`[${date}] ${obs.behavior_description}`);
      if (obs.antecedent) lines.push(`  Trigger: ${obs.antecedent}`);
      if (obs.behavior_function) lines.push(`  Function: ${obs.behavior_function}`);
      if (obs.intervention_used) {
        lines.push(`  Tried: ${obs.intervention_used} (${obs.effectiveness || 'unknown'})`);
      }
    });
    lines.push('');
  }

  // Teacher notes
  if (context.teacher_notes.length > 0) {
    lines.push('TEACHER NOTES:');
    context.teacher_notes.slice(0, 10).forEach(note => {
      const date = new Date(note.observed_at).toLocaleDateString();
      lines.push(`[${date}] ${note.work_name}: ${note.notes}`);
    });
    lines.push('');
  }

  // Past guru interactions
  if (context.past_interactions.length > 0) {
    lines.push('PREVIOUS GURU ADVICE:');
    context.past_interactions.forEach(int => {
      const date = new Date(int.asked_at).toLocaleDateString();
      lines.push(`[${date}] Q: ${int.question}`);
      lines.push(`  Outcome: ${int.outcome || 'not tracked'}`);
    });
    lines.push('');
  }

  // Parent emotional state
  if (context.parent_emotional_state) {
    const ps = context.parent_emotional_state;
    lines.push('PARENT EMOTIONAL STATE:');
    lines.push(`- Themes: ${ps.emotional_themes.join(', ')}`);
    lines.push(`- Confidence: ${ps.confidence_level}`);
    if (ps.stress_indicators.length > 0) {
      lines.push(`- Stressors: ${ps.stress_indicators.join(', ')}`);
    }
    if (ps.support_needed) {
      lines.push(`- Needs: ${ps.support_needed}`);
    }
    lines.push('');
  }

  // Developmental insights
  if (context.developmental_insights.length > 0) {
    lines.push('DEVELOPMENTAL PATTERNS DETECTED:');
    context.developmental_insights.slice(-5).forEach(insight => {
      const date = new Date(insight.recorded_at).toLocaleDateString();
      lines.push(`[${date}] (${insight.insight_type}, ${insight.confidence}) ${insight.description}`);
    });
    lines.push('');
  }

  // Guidance outcomes
  if (context.guidance_outcomes.length > 0) {
    lines.push('ADVICE OUTCOMES:');
    context.guidance_outcomes.slice(-5).forEach(outcome => {
      const emoji = outcome.outcome === 'worked_well' ? '✅' : outcome.outcome === 'didnt_work' ? '❌' : '📝';
      lines.push(`${emoji} ${outcome.guidance_given} → ${outcome.outcome}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
