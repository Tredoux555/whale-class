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

// Helper: resolve target_child_id with same-classroom security check
async function resolveTargetChild(
  input: Record<string, unknown>,
  currentChildId: string
): Promise<{ childId: string; error?: string }> {
  const targetId = input.target_child_id as string | undefined;
  if (!targetId || targetId === currentChildId) {
    return { childId: currentChildId };
  }

  // Verify both children are in the same classroom
  const supabase = getSupabase();
  const { data: children } = await supabase
    .from('montree_children')
    .select('id, classroom_id')
    .in('id', [currentChildId, targetId]);

  if (!children || children.length < 2) {
    return { childId: currentChildId, error: `Target child "${targetId}" not found` };
  }

  const current = children.find(c => c.id === currentChildId);
  const target = children.find(c => c.id === targetId);

  if (!current || !target || current.classroom_id !== target.classroom_id) {
    return { childId: currentChildId, error: 'Target child is not in the same classroom' };
  }

  return { childId: targetId };
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

      // Resolve target child (supports cross-child batch updates)
      const resolved = await resolveTargetChild(input, childId);
      if (resolved.error) return { success: false, message: resolved.error };
      const effectiveChildId = resolved.childId;

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
          child_id: effectiveChildId,
          area,
          work_name,
          set_at: new Date().toISOString(),
          set_by: 'guru',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id,area' });

      if (error) return { success: false, message: 'Failed to set focus work' };

      // CRITICAL: Also ensure work exists in progress table (so week view can see it)
      // Without this, set_focus_work only writes to montree_child_focus_works which
      // the week view doesn't read as a source of works — only for the is_focus flag.
      const { data: existingProgress } = await supabase
        .from('montree_child_progress')
        .select('id')
        .eq('child_id', effectiveChildId)
        .eq('work_name', work_name)
        .maybeSingle();

      if (!existingProgress) {
        await supabase
          .from('montree_child_progress')
          .insert({
            child_id: effectiveChildId,
            work_name,
            area,
            status: 'presented',
            presented_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      // Store Guru's reasoning per area in child settings (for ShelfView display)
      const reason = input.reason as string | undefined;
      if (reason) {
        try {
          const currentSettings = await getChildSettingsForUpdate(effectiveChildId);
          const guruReasons = (currentSettings.guru_area_reasons as Record<string, string>) || {};
          guruReasons[area] = reason.slice(0, 500);
          await updateChildSettings(effectiveChildId, { guru_area_reasons: guruReasons });
        } catch {
          // Non-critical — don't fail the whole operation if reason storage fails
        }
      }

      return { success: true, message: `✅ ${AREA_LABELS[area] || area}: ${work_name}` };
    }

    case 'clear_focus_work': {
      const area = input.area as string;
      if (!area) return { success: false, message: 'Missing area' };

      // Resolve target child (supports cross-child batch updates)
      const resolvedClear = await resolveTargetChild(input, childId);
      if (resolvedClear.error) return { success: false, message: resolvedClear.error };
      const effectiveClearId = resolvedClear.childId;

      const { error } = await supabase
        .from('montree_child_focus_works')
        .delete()
        .eq('child_id', effectiveClearId)
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

      // Resolve target child (supports cross-child batch updates)
      const resolvedProgress = await resolveTargetChild(input, childId);
      if (resolvedProgress.error) return { success: false, message: resolvedProgress.error };
      const effectiveProgressId = resolvedProgress.childId;

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
        child_id: effectiveProgressId,
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
          .eq('child_id', effectiveProgressId)
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
          .eq('child_id', effectiveProgressId)
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
      const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      if (!validAreas.includes(area)) {
        return { success: false, message: `Invalid area: "${area}". Must be one of: ${validAreas.join(', ')}` };
      }

      let allWorks;
      try {
        allWorks = loadAllCurriculumWorks();
      } catch {
        return { success: false, message: 'Curriculum data unavailable' };
      }
      let works = allWorks.filter(w => w.area_key === area);

      const category = input.category as string | undefined;
      if (category) {
        const catLower = category.toLowerCase();
        works = works.filter(w =>
          w.category_name?.toLowerCase().includes(catLower)
        );
      }

      // Cap at 30 to avoid token explosion
      const capped = works.slice(0, 30);
      const formatted = capped.map(w => ({
        name: w.name,
        category: w.category_name || 'Uncategorized',
        age_range: w.age_range || 'N/A',
        description: w.description ? w.description.slice(0, 80) : '',
      }));

      return {
        success: true,
        message: `${AREA_LABELS[area] || area}: ${formatted.length} works found${works.length > 30 ? ` (showing first 30 of ${works.length})` : ''}${category ? ` in category "${category}"` : ''}.\n${JSON.stringify(formatted, null, 1)}`
      };
    }

    case 'get_child_curriculum_status': {
      const area = input.area as string;
      if (!area) return { success: false, message: 'Missing area' };
      const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      if (!validAreas.includes(area)) {
        return { success: false, message: `Invalid area: "${area}". Must be one of: ${validAreas.join(', ')}` };
      }

      // Get all curriculum works for this area
      let allWorks;
      try {
        allWorks = loadAllCurriculumWorks();
      } catch {
        return { success: false, message: 'Curriculum data unavailable' };
      }
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
      let allWorks;
      try {
        allWorks = loadAllCurriculumWorks();
      } catch {
        return { success: false, message: 'Curriculum data unavailable' };
      }

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

    case 'add_curriculum_work': {
      const work_name = input.work_name as string;
      const area = input.area as string;
      const description = input.description as string;

      if (!work_name || !area || !description) {
        return { success: false, message: 'Missing work_name, area, or description' };
      }
      if (work_name.length > 200) return { success: false, message: 'Work name too long (max 200)' };
      if (description.length > 1000) return { success: false, message: 'Description too long (max 1000)' };

      const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      if (!validAreas.includes(area)) {
        return { success: false, message: `Invalid area: "${area}"` };
      }

      // Get classroom_id from child
      const { data: childData } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .single();

      if (!childData?.classroom_id) {
        return { success: false, message: 'Could not find classroom for this child' };
      }
      const classroomId = childData.classroom_id;

      // Get or create area_id
      let { data: areaRow } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('area_key', area)
        .maybeSingle();

      if (!areaRow) {
        // Auto-seed all 5 areas for this classroom
        const areaSeeds = validAreas.map((aKey, idx) => ({
          classroom_id: classroomId,
          area_key: aKey,
          name: AREA_LABELS[aKey] || aKey,
          sequence: idx + 1,
        }));
        await supabase.from('montree_classroom_curriculum_areas').insert(areaSeeds);
        const { data: newArea } = await supabase
          .from('montree_classroom_curriculum_areas')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('area_key', area)
          .maybeSingle();
        areaRow = newArea;
      }

      if (!areaRow) return { success: false, message: 'Failed to get or create area' };

      // Check for duplicate work name in this classroom
      const { data: existing } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id')
        .eq('classroom_id', classroomId)
        .ilike('name', work_name)
        .maybeSingle();

      if (existing) {
        return { success: false, message: `Work "${work_name}" already exists in this classroom curriculum` };
      }

      // Calculate next sequence number
      const { data: maxSeqRow } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('sequence')
        .eq('area_id', areaRow.id)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSequence = (maxSeqRow?.sequence || 0) + 1;

      // Build work_key
      const slug = work_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const workKey = `custom_${slug}_${Date.now()}`;

      // Prepare fields
      const directAims = (input.direct_aims as string[])?.slice(0, 10) || [];
      const indirectAims = (input.indirect_aims as string[])?.slice(0, 10) || [];
      const materials = (input.materials as string[])?.slice(0, 15) || [];
      const presentationSteps = (input.presentation_steps as string[])?.slice(0, 15) || [];
      const quickGuide = ((input.quick_guide as string) || '').slice(0, 500);
      const whyItMatters = ((input.why_it_matters as string) || '').slice(0, 500);
      const ageRange = ((input.age_range as string) || '3-6').slice(0, 20);

      const { error: insertError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert({
          classroom_id: classroomId,
          area_id: areaRow.id,
          work_key: workKey,
          name: work_name,
          description,
          why_it_matters: whyItMatters || null,
          direct_aims: directAims,
          indirect_aims: indirectAims,
          materials,
          quick_guide: quickGuide || null,
          presentation_steps: presentationSteps,
          age_range: ageRange,
          is_custom: true,
          is_active: true,
          sequence: nextSequence,
        });

      if (insertError) {
        console.error('[Tool] add_curriculum_work insert failed:', insertError.message);
        return { success: false, message: 'Failed to create custom work' };
      }

      return { success: true, message: `Created custom work "${work_name}" in ${AREA_LABELS[area] || area}` };
    }

    // --- Classroom-Wide Tools (teacher only) ---

    case 'get_classroom_overview': {
      // Get classroom_id from the child
      const { data: childData } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .single();

      if (!childData?.classroom_id) {
        return { success: false, message: 'Could not find classroom for this child' };
      }
      const classroomId = childData.classroom_id;

      // Fetch all children in this classroom
      const { data: children, error: childrenError } = await supabase
        .from('montree_children')
        .select('id, name, date_of_birth')
        .eq('classroom_id', classroomId)
        .order('name');

      if (childrenError || !children) {
        return { success: false, message: 'Failed to fetch classroom students' };
      }

      if (children.length === 0) {
        return { success: true, message: 'No students in this classroom.' };
      }

      // Fetch all progress records for these children in one query
      const childIds = children.map(c => c.id);
      const { data: allProgress } = await supabase
        .from('montree_child_progress')
        .select('child_id, work_name, area, status')
        .in('child_id', childIds);

      // Fetch all focus works for these children
      const { data: allFocusWorks } = await supabase
        .from('montree_child_focus_works')
        .select('child_id, area, work_name')
        .in('child_id', childIds);

      // Optionally fetch recent observations
      const includeNotes = input.include_notes === true;
      let observationMap: Map<string, string[]> = new Map();
      if (includeNotes) {
        const { data: recentObs } = await supabase
          .from('montree_behavioral_observations')
          .select('child_id, behavior_description')
          .in('child_id', childIds)
          .order('created_at', { ascending: false })
          .limit(Math.min(children.length * 3, 200)); // ~3 per child, capped at 200
        if (recentObs) {
          for (const obs of recentObs) {
            const existing = observationMap.get(obs.child_id) || [];
            if (existing.length < 2) { // max 2 per child to save tokens
              existing.push(obs.behavior_description.slice(0, 80));
              observationMap.set(obs.child_id, existing);
            }
          }
        }
      }

      // Build progress map per child
      const progressByChild = new Map<string, { mastered: number; practicing: number; presented: number; not_started: number }>();
      for (const p of (allProgress || [])) {
        const counts = progressByChild.get(p.child_id) || { mastered: 0, practicing: 0, presented: 0, not_started: 0 };
        if (p.status === 'mastered') counts.mastered++;
        else if (p.status === 'practicing') counts.practicing++;
        else if (p.status === 'presented') counts.presented++;
        else counts.not_started++;
        progressByChild.set(p.child_id, counts);
      }

      // Build focus works map per child
      const focusByChild = new Map<string, string[]>();
      for (const fw of (allFocusWorks || [])) {
        const works = focusByChild.get(fw.child_id) || [];
        works.push(`${fw.work_name} (${AREA_LABELS[fw.area] || fw.area})`);
        focusByChild.set(fw.child_id, works);
      }

      // Build compact summaries
      const now = new Date();
      const summaries = children.map(c => {
        let ageStr = '';
        if (c.date_of_birth) {
          try {
            const dob = new Date(c.date_of_birth);
            if (!isNaN(dob.getTime())) {
              const ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
              const y = Math.floor(ageMonths / 12);
              const m = ageMonths % 12;
              ageStr = `${y}y${m}m`;
            }
          } catch { /* malformed date — skip */ }
        }

        const counts = progressByChild.get(c.id) || { mastered: 0, practicing: 0, presented: 0, not_started: 0 };
        const focus = focusByChild.get(c.id) || [];
        const notes = observationMap.get(c.id) || [];

        const line: Record<string, unknown> = {
          id: c.id,
          name: c.name,
          age: ageStr || 'N/A',
          mastered: counts.mastered,
          practicing: counts.practicing,
          presented: counts.presented,
          shelf: focus.length > 0 ? focus : 'empty',
        };
        if (includeNotes && notes.length > 0) {
          line.recent_notes = notes;
        }
        return line;
      });

      return {
        success: true,
        message: `Classroom overview — ${children.length} students:\n${JSON.stringify(summaries, null, 1)}`
      };
    }

    case 'group_students': {
      const numGroups = input.num_groups as number;
      const criteria = input.criteria as string;

      if (!numGroups || numGroups < 2 || numGroups > 10) {
        return { success: false, message: 'num_groups must be between 2 and 10' };
      }
      const validCriteria = ['level', 'area', 'mixed', 'interest', 'custom'];
      if (!criteria || !validCriteria.includes(criteria)) {
        return { success: false, message: `Invalid criteria: "${criteria}". Must be one of: ${validCriteria.join(', ')}` };
      }

      // Get classroom_id from child
      const { data: childData2 } = await supabase
        .from('montree_children')
        .select('classroom_id')
        .eq('id', childId)
        .single();

      if (!childData2?.classroom_id) {
        return { success: false, message: 'Could not find classroom for this child' };
      }
      const classroomId2 = childData2.classroom_id;

      // Fetch all children
      const { data: children2 } = await supabase
        .from('montree_children')
        .select('id, name, date_of_birth')
        .eq('classroom_id', classroomId2)
        .order('name');

      if (!children2 || children2.length === 0) {
        return { success: true, message: 'No students in this classroom to group.' };
      }

      const childIds2 = children2.map(c => c.id);

      // Fetch all progress
      const { data: allProgress2 } = await supabase
        .from('montree_child_progress')
        .select('child_id, work_name, area, status')
        .in('child_id', childIds2);

      // Fetch all focus works
      const { data: allFocusWorks2 } = await supabase
        .from('montree_child_focus_works')
        .select('child_id, area, work_name')
        .in('child_id', childIds2);

      // Build per-child data for Claude to reason about
      const focusArea = (input.focus_area as string) || 'all';
      const customInstructions = (input.custom_instructions as string) || '';

      const studentData = children2.map(c => {
        const progress = (allProgress2 || []).filter(p => p.child_id === c.id);
        const focusWorks = (allFocusWorks2 || []).filter(fw => fw.child_id === c.id);

        // Count by area
        const areaCounts: Record<string, { mastered: number; practicing: number; presented: number }> = {};
        for (const p of progress) {
          const a = p.area;
          if (!areaCounts[a]) areaCounts[a] = { mastered: 0, practicing: 0, presented: 0 };
          if (p.status === 'mastered') areaCounts[a].mastered++;
          else if (p.status === 'practicing') areaCounts[a].practicing++;
          else if (p.status === 'presented') areaCounts[a].presented++;
        }

        const totalMastered = progress.filter(p => p.status === 'mastered').length;
        const currentFocus = focusWorks.map(fw => `${fw.work_name} (${fw.area})`);

        let ageStr = '';
        if (c.date_of_birth) {
          try {
            const dob = new Date(c.date_of_birth);
            if (!isNaN(dob.getTime())) {
              const now2 = new Date();
              const ageMonths = (now2.getFullYear() - dob.getFullYear()) * 12 + (now2.getMonth() - dob.getMonth());
              ageStr = `${Math.floor(ageMonths / 12)}y${ageMonths % 12}m`;
            }
          } catch { /* malformed date — skip */ }
        }

        const data: Record<string, unknown> = {
          id: c.id,
          name: c.name,
          age: ageStr || 'N/A',
          total_mastered: totalMastered,
          current_works: currentFocus.length > 0 ? currentFocus : 'none',
        };

        // Include area-specific data when focusing on a specific area
        if (focusArea !== 'all') {
          data.area_progress = areaCounts[focusArea] || { mastered: 0, practicing: 0, presented: 0 };
        } else {
          data.area_progress = areaCounts;
        }

        return data;
      });

      return {
        success: true,
        message: `Grouping data for ${children2.length} students (criteria: ${criteria}, focus: ${focusArea}, groups: ${numGroups})${customInstructions ? `\nInstructions: ${customInstructions}` : ''}\n\nStudent data:\n${JSON.stringify(studentData, null, 1)}\n\nPlease analyze this data and create ${numGroups} groups using the "${criteria}" strategy. For each group, list the students and explain your reasoning.`
      };
    }

    default:
      console.warn(`[Tool Executor] Unknown tool requested: ${toolName}`, JSON.stringify(input).slice(0, 200));
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
