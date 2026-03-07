// lib/montree/guru/tool-executor.ts
// Executes Guru tools against Supabase
// Handles: curriculum validation, enum checks, first-mastery/first-presentation protection

import { getSupabase } from '@/lib/supabase-client';
import { updateChildSettings } from './settings-helper';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';

// Build a set of valid work names at module load for fast lookup
const VALID_WORK_NAMES: Set<string> = new Set();
try {
  const allWorks = loadAllCurriculumWorks();
  for (const work of allWorks) {
    VALID_WORK_NAMES.add(work.name.toLowerCase());
  }
} catch {
  console.warn('[Tool Executor] Could not load curriculum for validation');
}

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export interface ToolResult {
  success: boolean;
  message: string;
}

// Helper: fetch current settings for read-merge-write pattern
async function getChildSettingsForUpdate(childId: string): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  const { data: child } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', childId)
    .single();
  return (child?.settings as Record<string, unknown>) || {};
}

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  childId: string
): Promise<ToolResult> {
  const supabase = getSupabase();

  switch (toolName) {
    case 'set_focus_work': {
      const area = input.area as string;
      const work_name = input.work_name as string;
      if (!area || !work_name) return { success: false, message: 'Missing area or work_name' };
      if (work_name.length > 200) return { success: false, message: 'Work name too long' };

      // Validate work_name exists in curriculum (prevents Claude hallucinating work names)
      if (VALID_WORK_NAMES.size > 0 && !VALID_WORK_NAMES.has(work_name.toLowerCase())) {
        // Also check DB for custom works before rejecting
        const { data: customWork } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id')
          .ilike('name', work_name)
          .limit(1)
          .maybeSingle();
        if (!customWork) {
          return { success: false, message: `Unknown work: "${work_name}". Use an exact name from the curriculum.` };
        }
      }

      const { error } = await supabase
        .from('montree_child_focus_works')
        .upsert({
          child_id: childId,
          area,
          work_name,
          set_at: new Date().toISOString(),
          set_by: 'guru',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id,area' });

      if (error) return { success: false, message: 'Failed to set focus work' };
      return { success: true, message: `✅ ${AREA_LABELS[area] || area}: ${work_name}` };
    }

    case 'clear_focus_work': {
      const area = input.area as string;
      if (!area) return { success: false, message: 'Missing area' };
      const { error } = await supabase
        .from('montree_child_focus_works')
        .delete()
        .eq('child_id', childId)
        .eq('area', area);

      if (error) return { success: false, message: 'Failed to clear focus work' };
      return { success: true, message: `Cleared ${AREA_LABELS[area] || area} from shelf` };
    }

    case 'update_progress': {
      const work_name = input.work_name as string;
      const area = input.area as string;
      const status = input.status as string;
      const notes = (input.notes as string) || null;

      if (!work_name || !area || !status) return { success: false, message: 'Missing work_name, area, or status' };

      // Validate area enum
      const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      if (!validAreas.includes(area)) {
        return { success: false, message: `Invalid area: ${area}` };
      }

      // Validate status enum
      const validStatuses = ['not_started', 'presented', 'practicing', 'mastered'];
      if (!validStatuses.includes(status)) {
        return { success: false, message: `Invalid status: ${status}` };
      }

      const record: Record<string, unknown> = {
        child_id: childId,
        work_name,
        area,
        status,
        notes,
        updated_at: new Date().toISOString(),
      };

      // First mastery protection: only set mastered_at if not already set
      if (status === 'mastered') {
        const { data: existing } = await supabase
          .from('montree_child_progress')
          .select('mastered_at')
          .eq('child_id', childId)
          .eq('work_name', work_name)
          .maybeSingle();

        if (!existing?.mastered_at) {
          record.mastered_at = new Date().toISOString();
        }
      }

      // First presentation protection: only set presented_at if not already set
      if (status === 'presented') {
        const { data: existing } = await supabase
          .from('montree_child_progress')
          .select('presented_at')
          .eq('child_id', childId)
          .eq('work_name', work_name)
          .maybeSingle();

        if (!existing?.presented_at) {
          record.presented_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('montree_child_progress')
        .upsert(record, { onConflict: 'child_id,work_name' });

      if (error) return { success: false, message: 'Failed to update progress' };
      return { success: true, message: `${work_name} → ${status}` };
    }

    case 'save_observation': {
      if (!input.behavior_description || typeof input.behavior_description !== 'string') {
        return { success: false, message: 'Missing behavior_description' };
      }
      if ((input.behavior_description as string).length > 2000) {
        return { success: false, message: 'behavior_description too long (max 2000 chars)' };
      }
      // Validate behavior_function enum
      const validFunctions = ['attention', 'escape', 'sensory', 'tangible', 'unknown'];
      const behaviorFunc = (input.behavior_function as string) || 'unknown';
      if (!validFunctions.includes(behaviorFunc)) {
        return { success: false, message: `Invalid behavior_function: ${behaviorFunc}` };
      }

      // Build enhanced observation with emotional/temporal context
      const enhancedDescription = [
        input.behavior_description as string,
        input.emotional_state ? `[Emotional state: ${input.emotional_state}]` : '',
        input.preceding_activity ? `[Preceding: ${input.preceding_activity}]` : '',
        input.time_of_day ? `[Time: ${input.time_of_day}]` : '',
        input.possible_triggers ? `[Possible triggers: ${(input.possible_triggers as string[]).join(', ')}]` : '',
        input.related_works ? `[Related works: ${(input.related_works as string[]).join(', ')}]` : '',
        input.developmental_note ? `[Dev note: ${input.developmental_note}]` : '',
      ].filter(Boolean).join(' ');

      const { error } = await supabase
        .from('montree_behavioral_observations')
        .insert({
          child_id: childId,
          classroom_id: null,    // Explicit null — home observations have no classroom
          observed_by: null,     // UUID column — null for guru-created observations
          behavior_description: enhancedDescription.slice(0, 4000), // Extended limit for enhanced data
          behavior_function: behaviorFunc,
          activity_during: (input.activity_during as string) || null,
        });

      if (error) {
        console.error('[Tool] save_observation failed:', error.message);
        return { success: false, message: 'Failed to save observation' };
      }
      return { success: true, message: 'Observation saved' };
    }

    case 'save_checkin': {
      const summary = input.summary as string;
      const days = input.next_checkin_days as number;
      if (!summary) return { success: false, message: 'Missing summary' };
      if (typeof days !== 'number' || days < 1 || days > 90) return { success: false, message: 'next_checkin_days must be 1-90' };
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (days || 7));

      // Read existing settings to get checkin_count
      const { data: child } = await supabase
        .from('montree_children')
        .select('settings')
        .eq('id', childId)
        .single();
      const existing = (child?.settings as Record<string, unknown>) || {};
      const count = (existing.guru_checkin_count as number) || 0;

      await updateChildSettings(childId, {
        guru_last_checkin: new Date().toISOString(),
        guru_last_checkin_summary: summary,
        guru_next_checkin: nextDate.toISOString(),
        guru_checkin_count: count + 1,
      });

      return { success: true, message: `📅 Next check-in: ${nextDate.toLocaleDateString()}` };
    }

    case 'save_child_profile': {
      if (!input.personality || !input.interests) {
        return { success: false, message: 'Missing personality or interests' };
      }
      // Prevent overly large profile data from being stored
      const profileJson = JSON.stringify(input);
      if (profileJson.length > 5000) {
        return { success: false, message: 'Profile data too large' };
      }
      await updateChildSettings(childId, {
        guru_intake_complete: true,
        guru_intake_date: new Date().toISOString(),
        guru_child_profile: input,
      });

      return { success: true, message: 'Child profile saved' };
    }

    case 'save_parent_state': {
      const themes = input.emotional_themes as string[];
      const confidence = input.confidence_level as string;
      if (!themes || !confidence) return { success: false, message: 'Missing emotional_themes or confidence_level' };

      // Validate confidence enum
      const validConfidence = ['very_low', 'low', 'moderate', 'high', 'very_high'];
      if (!validConfidence.includes(confidence)) {
        return { success: false, message: `Invalid confidence_level: ${confidence}` };
      }

      const newState: Record<string, unknown> = {
        emotional_themes: themes.slice(0, 10), // Cap at 10 themes
        confidence_level: confidence,
        stress_indicators: (input.stress_indicators as string[])?.slice(0, 10) || [],
        support_needed: (input.support_needed as string) || null,
        notes: (input.notes as string)?.slice(0, 500) || null,
        updated_at: new Date().toISOString(),
      };

      // Save as current state
      const currentSettings = await getChildSettingsForUpdate(childId);
      const parentStates = (currentSettings.guru_parent_states as Array<Record<string, unknown>>) || [];
      parentStates.push(newState);
      // Keep last 20 states (FIFO)
      const trimmedStates = parentStates.slice(-20);

      await updateChildSettings(childId, {
        guru_parent_current_state: newState,
        guru_parent_states: trimmedStates,
      });

      return { success: true, message: 'Parent state recorded' };
    }

    case 'save_developmental_insight': {
      const insightType = input.insight_type as string;
      const description = input.description as string;
      if (!insightType || !description) return { success: false, message: 'Missing insight_type or description' };

      const validTypes = ['correlation', 'milestone', 'prediction', 'concern'];
      if (!validTypes.includes(insightType)) {
        return { success: false, message: `Invalid insight_type: ${insightType}` };
      }

      const insight: Record<string, unknown> = {
        insight_type: insightType,
        description: description.slice(0, 1000),
        related_works: (input.related_works as string[])?.slice(0, 10) || [],
        related_behaviors: (input.related_behaviors as string[])?.slice(0, 10) || [],
        confidence: (input.confidence as string) || 'speculative',
        recommendation: (input.recommendation as string)?.slice(0, 500) || null,
        recorded_at: new Date().toISOString(),
      };

      const currentSettings = await getChildSettingsForUpdate(childId);
      const insights = (currentSettings.guru_developmental_insights as Array<Record<string, unknown>>) || [];
      insights.push(insight);
      // Keep last 30 insights
      const trimmedInsights = insights.slice(-30);

      await updateChildSettings(childId, {
        guru_developmental_insights: trimmedInsights,
      });

      return { success: true, message: `Pattern recorded: ${insightType}` };
    }

    case 'track_guidance_outcome': {
      const guidance = input.guidance_given as string;
      const outcome = input.outcome as string;
      if (!guidance || !outcome) return { success: false, message: 'Missing guidance_given or outcome' };

      const validOutcomes = ['worked_well', 'partially_worked', 'didnt_work', 'not_tried'];
      if (!validOutcomes.includes(outcome)) {
        return { success: false, message: `Invalid outcome: ${outcome}` };
      }

      const entry: Record<string, unknown> = {
        guidance_given: guidance.slice(0, 500),
        outcome,
        parent_confidence_after: (input.parent_confidence_after as string) || 'unchanged',
        notes: (input.notes as string)?.slice(0, 500) || null,
        recorded_at: new Date().toISOString(),
      };

      const currentSettings = await getChildSettingsForUpdate(childId);
      const outcomes = (currentSettings.guru_guidance_outcomes as Array<Record<string, unknown>>) || [];
      outcomes.push(entry);
      // Keep last 50 outcomes
      const trimmedOutcomes = outcomes.slice(-50);

      await updateChildSettings(childId, {
        guru_guidance_outcomes: trimmedOutcomes,
      });

      const emoji = outcome === 'worked_well' ? '✅' : outcome === 'didnt_work' ? '❌' : '📝';
      return { success: true, message: `${emoji} Outcome recorded` };
    }

    // --- Curriculum Read-Only Tools ---

    case 'browse_curriculum': {
      const area = input.area as string;
      if (!area) return { success: false, message: 'Missing area' };

      const allWorks = loadAllCurriculumWorks();
      let works = allWorks.filter(w => w.area_key === area);

      const category = input.category as string | undefined;
      if (category) {
        const catLower = category.toLowerCase();
        works = works.filter(w =>
          w.category_name?.toLowerCase().includes(catLower)
        );
      }

      // Cap at 50 to avoid token explosion
      const capped = works.slice(0, 50);
      const formatted = capped.map(w => ({
        name: w.name,
        category: w.category_name || 'Uncategorized',
        age_range: w.age_range || 'N/A',
        description: w.description ? w.description.slice(0, 100) : '',
        sequence: w.sequence,
      }));

      return {
        success: true,
        message: `${AREA_LABELS[area] || area}: ${formatted.length} works found${category ? ` in category "${category}"` : ''}.\n${JSON.stringify(formatted, null, 1)}`
      };
    }

    case 'get_child_curriculum_status': {
      const area = input.area as string;
      if (!area) return { success: false, message: 'Missing area' };

      // Get all curriculum works for this area
      const allWorks = loadAllCurriculumWorks();
      const areaWorks = allWorks.filter(w => w.area_key === area);

      // Fetch child's progress records for this area
      const { data: progressRecords } = await supabase
        .from('montree_child_progress')
        .select('work_name, status, mastered_at, presented_at')
        .eq('child_id', childId)
        .eq('area', area);

      // Fetch child's current focus work for this area
      const { data: focusWork } = await supabase
        .from('montree_child_focus_works')
        .select('work_name')
        .eq('child_id', childId)
        .eq('area', area)
        .maybeSingle();

      // Build progress map
      const progressMap = new Map<string, { status: string; mastered_at?: string }>();
      for (const p of (progressRecords || [])) {
        progressMap.set(p.work_name.toLowerCase(), {
          status: p.status,
          mastered_at: p.mastered_at || undefined,
        });
      }

      const focusWorkName = focusWork?.work_name?.toLowerCase() || '';

      const statusList = areaWorks.map(w => {
        const progress = progressMap.get(w.name.toLowerCase());
        return {
          name: w.name,
          sequence: w.sequence,
          status: progress?.status || 'not_started',
          is_focus: w.name.toLowerCase() === focusWorkName,
        };
      });

      // Summary counts
      const counts = { mastered: 0, practicing: 0, presented: 0, not_started: 0 };
      for (const s of statusList) {
        if (s.status in counts) counts[s.status as keyof typeof counts]++;
      }

      return {
        success: true,
        message: `${AREA_LABELS[area] || area} — ${counts.mastered} mastered, ${counts.practicing} practicing, ${counts.presented} presented, ${counts.not_started} not started.\n${JSON.stringify(statusList, null, 1)}`
      };
    }

    case 'search_curriculum': {
      const query = input.query as string;
      if (!query || query.length < 2) return { success: false, message: 'Query must be at least 2 characters' };

      const queryLower = query.toLowerCase();
      const allWorks = loadAllCurriculumWorks();

      const matches = allWorks.filter(w => {
        const searchable = [
          w.name,
          w.description || '',
          w.category_name || '',
          (w.materials || []).join(' '),
        ].join(' ').toLowerCase();
        return searchable.includes(queryLower);
      });

      // Cap at 20
      const capped = matches.slice(0, 20);
      const formatted = capped.map(w => ({
        name: w.name,
        area: AREA_LABELS[w.area_key] || w.area_key,
        category: w.category_name || 'Uncategorized',
        age_range: w.age_range || 'N/A',
        description: w.description ? w.description.slice(0, 80) : '',
      }));

      return {
        success: true,
        message: `Found ${matches.length} works matching "${query}"${matches.length > 20 ? ' (showing first 20)' : ''}.\n${JSON.stringify(formatted, null, 1)}`
      };
    }

    default:
      console.warn(`[Tool Executor] Unknown tool requested: ${toolName}`, JSON.stringify(input).slice(0, 200));
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
