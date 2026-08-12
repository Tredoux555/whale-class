// lib/montree/guru/context-builder.ts
// Gathers all relevant child context for the Guru AI

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
// 🏫 CMS phase 3. `lib/cms/engine/**` is pure TypeScript with no Next, React or
// Supabase in it — importing the adapter here is the convergence the CMS
// section of CLAUDE.md describes, in the only direction that is allowed: CMS
// never imports from lib/montree/**.
import { buildGuruFeed, mergeGuruFeed } from '@/lib/cms/engine/guru-feed';

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

  // Voice notes (from voice recording feature)
  voice_notes: VoiceNote[];

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

  // Teacher's onboarding notes about this child (free-text from student creation)
  teacher_onboarding_notes?: string;

  // 🧾 Parent intake (Child Onboarding, migration 326) — what the FAMILY told
  // the school at enrollment. Only the committed form is read; a draft or an
  // unreviewed submission never reaches the Guru. Undefined when the feature
  // is unused, the table is absent, or the query failed — Guru is unaffected.
  parent_intake?: ParentIntakeContext;

  // ESL context (school-level — detected from school location/name)
  isESL?: boolean;
  l1Language?: string;

  // Per-school Guru personality settings (from montree_schools.settings.guru_personality)
  schoolGuruPersonality?: Record<string, unknown> | null;
}

/** The handful of intake fields that actually change how a teacher meets a
 *  child on Monday morning. Everything else in the intake (addresses, phone
 *  numbers, document paths) is administrative and deliberately not sent. */
export interface ParentIntakeContext {
  strengths?: string;
  growthAreas?: string;
  fears?: string;
  comfortItems?: string;
  temperamentNotes?: string;
  separationHistory?: string;
  allergies: string[];
  otherNotes?: string;
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

export interface VoiceNote {
  work_name: string | null;
  transcript: string | null;
  behavioral_notes: string | null;
  next_steps: string | null;
  created_at: string;
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
  childId: string,
  locale?: string
): Promise<ChildContext | null> {
  // 1. Fetch basic child info
  // Note: montree_children has 'age' (integer years, not date_of_birth which is nullable)
  const { data: child, error: childError } = await supabase
    .from('montree_children')
    .select('id, name, age, classroom_id, created_at, notes')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    console.error('Failed to fetch child:', childError);
    return null;
  }

  // Age is stored as integer years, estimate months as 6
  const age = { years: child.age || 4, months: 6 };
  // Use created_at as enrollment reference (no enrolled_at column in base schema)
  const timeAtSchool = calculateTimeAtSchool(child.created_at);

  // PERFORMANCE: Fetch ALL child data in parallel (queries 2-9 don't depend on each other)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: profile },
    { data: progress },
    { data: observations },
    { data: pastGuru },
    { data: workSessions },
    { data: voiceNotesData },
    { data: focusWorks },
    { data: childSettings },
    eslResult,
    intakeResult,
    cmsProfileResult,
  ] = await Promise.all([
    // 2. Mental profile
    supabase
      .from('montree_child_mental_profiles')
      .select('temperament_activity_level, temperament_regularity, temperament_initial_reaction, temperament_adaptability, temperament_intensity, temperament_mood_quality, temperament_distractibility, temperament_persistence, temperament_sensory_threshold, learning_modality_visual, learning_modality_auditory, learning_modality_kinesthetic, baseline_focus_minutes, optimal_time_of_day, sensitive_period_order, sensitive_period_language, sensitive_period_movement, sensitive_period_sensory, sensitive_period_small_objects, sensitive_period_grace_courtesy, family_notes, sleep_status, special_considerations, successful_strategies, challenging_triggers')
      .eq('child_id', childId)
      .single(),
    // 3. Progress (limit 30 — only top 30 used in prompt formatting)
    supabase
      .from('montree_child_progress')
      .select('work_name, area, status, created_at, notes')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(30),
    // 4. Observations (last 30 days)
    supabase
      .from('montree_behavioral_observations')
      .select('observed_at, behavior_description, antecedent, behavior_function, intervention_used, effectiveness')
      .eq('child_id', childId)
      .gte('observed_at', thirtyDaysAgo.toISOString())
      .order('observed_at', { ascending: false })
      .limit(10),
    // 5. Past guru interactions (exclude photo insight cache entries)
    // Note: No locale filter — conversation memory should persist across language switches.
    // The Guru needs to remember ALL past interactions regardless of which language they were in.
    supabase
      .from('montree_guru_interactions')
      .select('asked_at, question, response_insight, outcome, context_snapshot')
      .eq('child_id', childId)
      .not('question', 'like', 'photo:%')
      .order('asked_at', { ascending: false })
      .limit(5),
    // 6. Teacher notes from work sessions (only 10 used in prompt)
    supabase
      .from('montree_work_sessions')
      .select('work_id, notes, observed_at')
      .eq('child_id', childId)
      .not('notes', 'is', null)
      .order('observed_at', { ascending: false })
      .limit(10),
    // 7. Voice notes (last 30 days, limit 10 for prompt)
    supabase
      .from('montree_voice_notes')
      .select('work_name, transcript, behavioral_notes, next_steps, created_at')
      .eq('child_id', childId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    // 8. Focus works (current shelf)
    supabase
      .from('montree_child_focus_works')
      .select('area, work_name, set_at, set_by')
      .eq('child_id', childId)
      .limit(20),
    // 9. Child settings for guru profile
    supabase
      .from('montree_children')
      .select('settings')
      .eq('id', childId)
      .single(),
    // 10. ESL detection — classroom → school join
    supabase
      .from('montree_classrooms')
      .select('school:montree_schools!school_id(name, settings)')
      .eq('id', child.classroom_id)
      .single()
      .then(r => r.data)
      .catch(() => null),
    // 11. 🧾 Parent intake (Child Onboarding). COMMITTED only — a draft the
    // family is still typing, or a submission the teacher hasn't reviewed,
    // must never reach the Guru. Fails soft to null (table may not exist yet).
    (async () => {
      try {
        const { data } = await supabase
          .from('montree_child_intake')
          .select('data')
          .eq('child_id', childId)
          .eq('status', 'committed')
          .maybeSingle();
        return data as { data?: unknown } | null;
      } catch {
        return null;
      }
    })(),
    // 12. 🏫 CMS child profile (CMS phase 3, migration 330). What the FAMILY
    // wrote about who their child is in the CMS intake wizard's "About your
    // child" step. Reached through the convergence seam
    // `cms_children.montree_child_id` — NULL for every row today, so this
    // resolves to null and the Guru behaves exactly as it did before. It
    // becomes live the day Montree's own onboarding adopts the shared engine
    // and starts setting that column.
    //
    // 🚨 `guru_sync` is the family's own answer to "may this help the teacher's
    // planning assistant". Filtered here AND honoured again inside
    // buildGuruFeed — both, deliberately.
    // Fails soft to null (the CMS tables may not exist in this project at all).
    (async () => {
      try {
        const { data: link } = await supabase
          .from('cms_children')
          .select('id')
          .eq('montree_child_id', childId)
          .is('deleted_at', null)
          .maybeSingle();
        if (!link?.id) return null;
        const { data } = await supabase
          .from('cms_child_profiles')
          .select('likes, dislikes, interests, temperament, parent_notes, guru_sync')
          .eq('child_id', link.id)
          .eq('guru_sync', true)
          .is('deleted_at', null)
          .maybeSingle();
        return data as Record<string, unknown> | null;
      } catch {
        return null;
      }
    })(),
  ]);

  // Process mental profile
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

  // Process progress
  const currentWorks: WorkProgress[] = (progress || []).map(p => ({
    work_name: p.work_name,
    area: p.area,
    status: p.status,
    last_worked: p.created_at,
    notes: p.notes,
  }));

  const statusCounts = currentWorks.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Process observations
  const recentObservations: Observation[] = (observations || []).map(o => ({
    observed_at: o.observed_at,
    behavior_description: o.behavior_description,
    antecedent: o.antecedent,
    behavior_function: o.behavior_function,
    intervention_used: o.intervention_used,
    effectiveness: o.effectiveness,
  }));

  // Process past interactions
  const pastInteractions: PastInteraction[] = (pastGuru || []).map(g => ({
    asked_at: g.asked_at,
    question: g.question,
    response_insight: g.response_insight,
    outcome: g.outcome,
    context_snapshot: g.context_snapshot as Record<string, unknown> | undefined,
  }));

  // Process teacher notes
  const teacherNotes: TeacherNote[] = (workSessions || [])
    .filter(s => s.notes && s.notes.trim())
    .map(s => ({
      work_name: s.work_id || 'Unknown',
      notes: s.notes,
      observed_at: s.observed_at,
    }));

  // Process voice notes
  const voiceNotes: VoiceNote[] = (voiceNotesData || []).map(v => ({
    work_name: v.work_name,
    transcript: v.transcript,
    behavioral_notes: v.behavioral_notes,
    next_steps: v.next_steps,
    created_at: v.created_at,
  }));

  // Process settings
  const settings = (childSettings?.settings as Record<string, unknown>) || {};

  // Process ESL detection
  let isESL = false;
  let l1Language: string | undefined;
  try {
    const school = (eslResult as Record<string, unknown>)?.school as Record<string, unknown> | null;
    if (school) {
      const schoolName = ((school.name as string) || '').toLowerCase();
      const schoolSettings = (school.settings as Record<string, unknown>) || {};
      const location = ((schoolSettings.location as string) || '').toLowerCase();
      if (
        schoolName.includes('beijing') || schoolName.includes('shanghai') ||
        schoolName.includes('china') || schoolName.includes('qingdao') ||
        location.includes('china') || location.includes('beijing') ||
        location.includes('shanghai') || location.includes('中国')
      ) {
        isESL = true;
        l1Language = 'Mandarin Chinese';
      }
    }
  } catch {
    // ESL detection is non-critical
  }

  // Extract per-school Guru personality settings (same school data already fetched for ESL)
  let schoolGuruPersonality: Record<string, unknown> | null = null;
  try {
    const school = (eslResult as Record<string, unknown>)?.school as Record<string, unknown> | null;
    if (school) {
      const schoolSettings = (school.settings as Record<string, unknown>) || {};
      schoolGuruPersonality = (schoolSettings.guru_personality as Record<string, unknown>) || null;
    }
  } catch {
    // Non-critical — Guru works fine without personality settings
  }

  // 🧾 Distil the committed parent intake down to the fields that change how a
  // teacher meets this child. Any shape surprise → undefined, never a throw.
  let parentIntake: ParentIntakeContext | undefined;
  try {
    const raw = (intakeResult as { data?: unknown } | null)?.data as Record<string, unknown> | undefined;
    if (raw && typeof raw === 'object') {
      const dev = (raw.development as Record<string, unknown>) || {};
      const health = (raw.health as Record<string, unknown>) || {};
      const allergyRows = Array.isArray(health.allergies)
        ? (health.allergies as Array<Record<string, unknown>>)
        : [];
      const allergies = allergyRows
        .filter((a) => a && typeof a.allergen === 'string' && a.allergen.trim())
        .map((a) => {
          const sev = typeof a.severity === 'string' ? a.severity : '';
          return sev ? `${String(a.allergen).trim()} (${sev})` : String(a.allergen).trim();
        });

      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
      const candidate: ParentIntakeContext = {
        strengths: str(dev.strengths),
        growthAreas: str(dev.growthAreas),
        fears: str(dev.fears),
        comfortItems: str(dev.comfortItems),
        temperamentNotes: str(dev.temperamentNotes),
        separationHistory: str(dev.separationHistory),
        otherNotes: str(dev.otherNotes),
        allergies,
      };
      const hasSomething =
        allergies.length > 0
        || Object.entries(candidate).some(([k, v]) => k !== 'allergies' && !!v);
      if (hasSomething) parentIntake = candidate;
    }
  } catch {
    // Non-critical — the Guru has always worked without this.
  }

  // 🏫 CMS profile → the same parent-intake slot. The adapter is a pure
  // function in the CMS engine (lib/cms/engine/guru-feed.ts) so the mapping has
  // one definition and CMS's teacher insight card renders from it too.
  //
  // MERGE ORDER IS DELIBERATE: a Montree intake that a teacher COMMITTED wins
  // over a CMS profile nobody has reviewed; CMS only fills the holes, and
  // allergy lists are unioned. See mergeGuruFeed.
  //
  // No CMS profile (the case today, always) ⇒ mergeGuruFeed returns the
  // existing value untouched, so this block is a no-op and the Guru's behaviour
  // is bit-for-bit what it was.
  try {
    const row = cmsProfileResult as Record<string, unknown> | null;
    if (row) {
      const feed = buildGuruFeed({
        profile: {
          likes: Array.isArray(row.likes) ? (row.likes as string[]) : [],
          dislikes: Array.isArray(row.dislikes) ? (row.dislikes as string[]) : [],
          interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
          temperament:
            row.temperament && typeof row.temperament === 'object'
              ? (row.temperament as Record<string, number>)
              : {},
          parentNotes: typeof row.parent_notes === 'string' ? row.parent_notes : null,
          guruSync: row.guru_sync !== false,
        },
        allergies: parentIntake?.allergies ?? [],
      });
      const merged = mergeGuruFeed(parentIntake, feed);
      if (merged) parentIntake = merged as ParentIntakeContext;
    }
  } catch {
    // Non-critical — a shape surprise in a CMS row must never break the Guru.
  }

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
    voice_notes: voiceNotes,
    focus_works: (focusWorks || []).map(fw => ({
      area: fw.area,
      work_name: fw.work_name,
      set_at: fw.set_at,
      set_by: fw.set_by,
    })),
    teacher_onboarding_notes: child.notes || undefined,
    parent_intake: parentIntake,
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
    isESL,
    l1Language,
    schoolGuruPersonality,
  };
}

export function formatContextForPrompt(context: ChildContext): string {
  const lines: string[] = [];

  // Basic info
  lines.push(`CHILD: ${context.name}`);
  lines.push(`AGE: ${context.age_years} years, ${context.age_months} months`);
  lines.push(`TIME AT SCHOOL: ${context.time_at_school}`);
  if (context.isESL && context.l1Language) {
    lines.push(`LANGUAGE: L1 ${context.l1Language} — learning English as a second language`);
  }
  lines.push('');

  // Teacher's onboarding notes (goals, personality, context entered during student creation)
  if (context.teacher_onboarding_notes) {
    lines.push('TEACHER\'S NOTES ABOUT THIS CHILD:');
    lines.push(context.teacher_onboarding_notes);
    lines.push('');
  }

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

  // 🧾 Parent intake — what the family told the school at enrollment. Only a
  // teacher-COMMITTED form reaches this point (see buildChildContext).
  if (context.parent_intake) {
    const pi = context.parent_intake;
    lines.push('PARENT INTAKE (provided by family at enrollment):');
    if (pi.strengths) lines.push(`- Strengths: ${pi.strengths}`);
    if (pi.growthAreas) lines.push(`- Finds hard: ${pi.growthAreas}`);
    if (pi.temperamentNotes) lines.push(`- Temperament (family's words): ${pi.temperamentNotes}`);
    if (pi.fears) lines.push(`- Fears / upsets: ${pi.fears}`);
    if (pi.comfortItems) lines.push(`- Comforted by: ${pi.comfortItems}`);
    if (pi.separationHistory) lines.push(`- Separation: ${pi.separationHistory}`);
    if (pi.allergies.length > 0) lines.push(`- Allergies: ${pi.allergies.join(', ')}`);
    if (pi.otherNotes) lines.push(`- Family also says: ${pi.otherNotes}`);
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

  // Teacher notes (from work sessions)
  if (context.teacher_notes.length > 0) {
    lines.push('TEACHER NOTES:');
    context.teacher_notes.slice(0, 10).forEach(note => {
      const date = new Date(note.observed_at).toLocaleDateString();
      lines.push(`[${date}] ${note.work_name}: ${note.notes}`);
    });
    lines.push('');
  }

  // Progress notes (from work tracking updates)
  const worksWithNotes = context.current_works.filter(w => w.notes && w.notes.trim());
  if (worksWithNotes.length > 0) {
    lines.push('PROGRESS NOTES:');
    worksWithNotes.slice(0, 15).forEach(work => {
      const date = new Date(work.last_worked).toLocaleDateString();
      lines.push(`[${date}] ${work.work_name} (${work.status}): ${work.notes}`);
    });
    lines.push('');
  }

  // Voice notes (from voice recording observations)
  if (context.voice_notes && context.voice_notes.length > 0) {
    lines.push('VOICE OBSERVATION NOTES:');
    context.voice_notes.slice(0, 10).forEach(vn => {
      const date = new Date(vn.created_at).toLocaleDateString();
      const workLabel = vn.work_name || 'General';
      const parts: string[] = [];
      if (vn.transcript) parts.push(`Transcript: ${vn.transcript}`);
      if (vn.behavioral_notes) parts.push(`Behavior: ${vn.behavioral_notes}`);
      if (vn.next_steps) parts.push(`Next steps: ${vn.next_steps}`);
      if (parts.length > 0) {
        lines.push(`[${date}] ${workLabel}:`);
        parts.forEach(p => lines.push(`  ${p}`));
      }
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
