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
  childId: string,
  classroomIdOverride?: string
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
      // Get classroom_id — use override (whole-class mode) or look up from child
      let classroomIdForOverview = classroomIdOverride;
      if (!classroomIdForOverview) {
        const { data: childData } = await supabase
          .from('montree_children')
          .select('classroom_id')
          .eq('id', childId)
          .single();
        classroomIdForOverview = childData?.classroom_id;
      }

      if (!classroomIdForOverview) {
        return { success: false, message: 'Could not find classroom for this child' };
      }
      const classroomId = classroomIdForOverview;

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

      // Get classroom_id — use override (whole-class mode) or look up from child
      let classroomId2 = classroomIdOverride;
      if (!classroomId2) {
        const { data: childData2 } = await supabase
          .from('montree_children')
          .select('classroom_id')
          .eq('id', childId)
          .single();
        classroomId2 = childData2?.classroom_id;
      }

      if (!classroomId2) {
        return { success: false, message: 'Could not find classroom for this child' };
      }

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

    // --- Daily Activity Tools (read-only) ---

    case 'get_daily_activity': {
      // Validate date parameter
      const dateStr = input.date as string | undefined;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateStr && !dateRegex.test(dateStr)) {
        return { success: false, message: 'Invalid date format. Use YYYY-MM-DD.' };
      }
      const queryDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (queryDate < thirtyDaysAgo) {
        return { success: false, message: 'Date must be within the last 30 days.' };
      }

      // Get classroom_id — use override (whole-class mode) or look up from child
      let classroomIdDaily = classroomIdOverride;
      if (!classroomIdDaily) {
        const { data: childData } = await supabase
          .from('montree_children')
          .select('classroom_id')
          .eq('id', childId)
          .single();
        classroomIdDaily = childData?.classroom_id;
      }
      if (!classroomIdDaily) {
        return { success: false, message: 'Could not determine classroom.' };
      }

      // Get all children in classroom
      const { data: dailyChildren } = await supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', classroomIdDaily)
        .order('name');

      if (!dailyChildren || dailyChildren.length === 0) {
        return { success: true, message: 'No students in this classroom.' };
      }

      const dailyChildIds = dailyChildren.map(c => c.id);
      const dailyDateStr = queryDate.toISOString().split('T')[0];
      const dailyDateStart = dailyDateStr + 'T00:00:00';

      // 5 parallel queries — wrapped in try/catch for graceful failure
      let progressRes, voiceRes, obsRes, mediaRes, razRes;
      try {
        [progressRes, voiceRes, obsRes, mediaRes, razRes] = await Promise.all([
          supabase
            .from('montree_child_progress')
            .select('child_id, work_name, area, status, updated_at')
            .in('child_id', dailyChildIds)
            .gte('updated_at', dailyDateStart)
            .order('updated_at', { ascending: false })
            .limit(100),
          supabase
            .from('montree_voice_notes')
            .select('child_id, work_name, area, proposed_status, auto_applied')
            .eq('classroom_id', classroomIdDaily)
            .eq('voice_date', dailyDateStr)
            .limit(50),
          supabase
            .from('montree_behavioral_observations')
            .select('child_id, behavior_description, time_of_day')
            .eq('classroom_id', classroomIdDaily)
            .gte('observed_at', dailyDateStart)
            .order('observed_at', { ascending: false })
            .limit(50),
          supabase
            .from('montree_media')
            .select('child_id, caption')
            .eq('classroom_id', classroomIdDaily)
            .gte('captured_at', dailyDateStart)
            .limit(50),
          supabase
            .from('raz_reading_records')
            .select('child_id, status, book_title')
            .eq('classroom_id', classroomIdDaily)
            .eq('record_date', dailyDateStr)
            .limit(50),
        ]);
      } catch (err) {
        console.error('[Tool] get_daily_activity query error:', err);
        return { success: false, message: 'Failed to fetch daily activity data.' };
      }

      // Build per-child summaries
      const childNameMap = new Map(dailyChildren.map(c => [c.id, c.name]));
      const childSummaries = new Map<string, string[]>();

      for (const p of (progressRes?.data || [])) {
        const name = childNameMap.get(p.child_id) || 'Unknown';
        const items = childSummaries.get(name) || [];
        items.push(`${p.status === 'mastered' ? '⭐' : p.status === 'practicing' ? '🔄' : '📋'} ${p.work_name} (${AREA_LABELS[p.area] || p.area}) → ${p.status}`);
        childSummaries.set(name, items);
      }

      for (const v of (voiceRes?.data || [])) {
        const name = childNameMap.get(v.child_id) || 'Unknown';
        const items = childSummaries.get(name) || [];
        items.push(`🎙️ Voice note: ${v.work_name || 'general'}${v.auto_applied ? ' (auto-applied)' : ''}`);
        childSummaries.set(name, items);
      }

      for (const o of (obsRes?.data || [])) {
        const name = childNameMap.get(o.child_id) || 'Unknown';
        const items = childSummaries.get(name) || [];
        items.push(`👁️ ${(o.behavior_description || '').slice(0, 80)}${o.time_of_day ? ` (${o.time_of_day})` : ''}`);
        childSummaries.set(name, items);
      }

      for (const m of (mediaRes?.data || [])) {
        const name = childNameMap.get(m.child_id) || 'Unknown';
        const items = childSummaries.get(name) || [];
        const captionText = typeof m.caption === 'string' ? m.caption.slice(0, 60) : '';
        items.push(`📸 Photo${captionText ? ': ' + captionText : ''}`);
        childSummaries.set(name, items);
      }

      for (const r of (razRes?.data || [])) {
        const name = childNameMap.get(r.child_id) || 'Unknown';
        const items = childSummaries.get(name) || [];
        items.push(`📖 RAZ: ${r.status}${r.book_title ? ' — ' + r.book_title : ''}`);
        childSummaries.set(name, items);
      }

      if (childSummaries.size === 0) {
        return { success: true, message: `No activity recorded for ${dailyDateStr}. This could mean no data has been entered yet today.` };
      }

      // Format output — cap total items at 50
      let totalItems = 0;
      const lines: string[] = [];
      for (const [name, items] of childSummaries.entries()) {
        const remaining = 50 - totalItems;
        if (remaining <= 0) break;
        const capped = items.slice(0, Math.min(items.length, remaining));
        lines.push(`${name}:\n  ${capped.join('\n  ')}`);
        totalItems += capped.length;
      }

      return {
        success: true,
        message: `Daily activity for ${dailyDateStr} — ${childSummaries.size} active students:\n\n${lines.join('\n\n')}`
      };
    }

    case 'get_child_recent_activity': {
      // Validate days parameter
      const days = Math.min(Math.max(Math.round(Number(input.days) || 7), 1), 30);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const dateFromStr = dateFrom.toISOString().split('T')[0] + 'T00:00:00';

      // In individual mode, use childId directly. In whole-class mode, childId is resolved by route.ts
      const targetChildId = childId;
      if (!targetChildId || targetChildId === 'whole_class') {
        return { success: false, message: 'Could not determine which child to query. Please provide student_name.' };
      }

      // Get child name for output
      const { data: childInfo } = await supabase
        .from('montree_children')
        .select('name')
        .eq('id', targetChildId)
        .single();
      const childName = childInfo?.name || 'Unknown';

      // 5 parallel queries scoped to one child
      let progRes, vnRes, obRes, mdRes, rzRes;
      try {
        [progRes, vnRes, obRes, mdRes, rzRes] = await Promise.all([
          supabase
            .from('montree_child_progress')
            .select('work_name, area, status, updated_at')
            .eq('child_id', targetChildId)
            .gte('updated_at', dateFromStr)
            .order('updated_at', { ascending: false })
            .limit(30),
          supabase
            .from('montree_voice_notes')
            .select('work_name, area, proposed_status, auto_applied, voice_date, behavioral_notes')
            .eq('child_id', targetChildId)
            .gte('voice_date', dateFrom.toISOString().split('T')[0])
            .order('voice_date', { ascending: false })
            .limit(20),
          supabase
            .from('montree_behavioral_observations')
            .select('behavior_description, time_of_day, observed_at')
            .eq('child_id', targetChildId)
            .gte('observed_at', dateFromStr)
            .order('observed_at', { ascending: false })
            .limit(15),
          supabase
            .from('montree_media')
            .select('caption, captured_at')
            .eq('child_id', targetChildId)
            .gte('captured_at', dateFromStr)
            .order('captured_at', { ascending: false })
            .limit(15),
          supabase
            .from('raz_reading_records')
            .select('status, book_title, record_date')
            .eq('child_id', targetChildId)
            .gte('record_date', dateFrom.toISOString().split('T')[0])
            .order('record_date', { ascending: false })
            .limit(10),
        ]);
      } catch (err) {
        console.error('get_child_recent_activity DB error:', err);
        return { success: false, message: 'Database error fetching child activity. Please try again.' };
      }

      // Build chronological timeline
      type TimelineItem = { date: string; text: string };
      const timeline: TimelineItem[] = [];

      for (const p of (progRes?.data || [])) {
        timeline.push({
          date: typeof p.updated_at === 'string' ? p.updated_at.slice(0, 10) : '',
          text: `${p.status === 'mastered' ? '⭐' : p.status === 'practicing' ? '🔄' : '📋'} ${p.work_name} (${AREA_LABELS[p.area] || p.area}) → ${p.status}`
        });
      }
      for (const v of (vnRes?.data || [])) {
        timeline.push({
          date: typeof v.voice_date === 'string' ? v.voice_date.slice(0, 10) : '',
          text: `🎙️ Voice note: ${v.work_name || 'general'}${typeof v.behavioral_notes === 'string' ? ' — ' + v.behavioral_notes.slice(0, 60) : ''}`
        });
      }
      for (const o of (obRes?.data || [])) {
        timeline.push({
          date: typeof o.observed_at === 'string' ? o.observed_at.slice(0, 10) : '',
          text: `👁️ ${(o.behavior_description || '').slice(0, 80)}${o.time_of_day ? ` (${o.time_of_day})` : ''}`
        });
      }
      for (const m of (mdRes?.data || [])) {
        timeline.push({
          date: typeof m.captured_at === 'string' ? m.captured_at.slice(0, 10) : '',
          text: `📸 Photo${typeof m.caption === 'string' ? ': ' + m.caption.slice(0, 60) : ''}`
        });
      }
      for (const r of (rzRes?.data || [])) {
        timeline.push({
          date: typeof r.record_date === 'string' ? r.record_date : '',
          text: `📖 RAZ: ${r.status}${r.book_title ? ' — ' + r.book_title : ''}`
        });
      }

      if (timeline.length === 0) {
        return { success: true, message: `No activity recorded for ${childName} in the last ${days} days.` };
      }

      // Sort by date descending, cap at 30
      timeline.sort((a, b) => b.date.localeCompare(a.date));
      const capped = timeline.slice(0, 30);

      // Group by date
      const grouped = new Map<string, string[]>();
      for (const item of capped) {
        const list = grouped.get(item.date) || [];
        list.push(item.text);
        grouped.set(item.date, list);
      }

      const lines: string[] = [];
      for (const [date, items] of grouped.entries()) {
        lines.push(`${date}:\n  ${items.join('\n  ')}`);
      }

      return {
        success: true,
        message: `${childName}'s activity (last ${days} days, ${capped.length} items):\n\n${lines.join('\n\n')}`
      };
    }

    case 'get_classroom_media_summary': {
      // Validate date
      const mediaDateStr = input.date as string | undefined;
      const mediaDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (mediaDateStr && !mediaDateRegex.test(mediaDateStr)) {
        return { success: false, message: 'Invalid date format. Use YYYY-MM-DD.' };
      }
      const mediaDate = mediaDateStr ? new Date(mediaDateStr + 'T00:00:00') : new Date();
      const mediaThirtyDaysAgo = new Date();
      mediaThirtyDaysAgo.setDate(mediaThirtyDaysAgo.getDate() - 30);
      if (mediaDate < mediaThirtyDaysAgo) {
        return { success: false, message: 'Date must be within the last 30 days.' };
      }

      // Get classroom_id
      let classroomIdMedia = classroomIdOverride;
      if (!classroomIdMedia) {
        const { data: childData } = await supabase
          .from('montree_children')
          .select('classroom_id')
          .eq('id', childId)
          .single();
        classroomIdMedia = childData?.classroom_id;
      }
      if (!classroomIdMedia) {
        return { success: false, message: 'Could not determine classroom.' };
      }

      const mediaQueryDate = mediaDate.toISOString().split('T')[0];
      const mediaDateStart = mediaQueryDate + 'T00:00:00';
      const mediaDateEnd = mediaQueryDate + 'T23:59:59';

      // Get children for name mapping
      const { data: mediaChildren } = await supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', classroomIdMedia);

      const mediaChildNameMap = new Map((mediaChildren || []).map(c => [c.id, c.name]));

      // Build query for media
      let mediaQuery = supabase
        .from('montree_media')
        .select('id, child_id, caption, media_type, captured_at')
        .eq('classroom_id', classroomIdMedia)
        .gte('captured_at', mediaDateStart)
        .lte('captured_at', mediaDateEnd)
        .order('captured_at', { ascending: false })
        .limit(30);

      // Optional student_name filter — resolve to child_id
      const studentNameFilter = input.student_name as string | undefined;
      if (studentNameFilter) {
        let filterChildId: string | null = null;
        for (const [id, name] of mediaChildNameMap.entries()) {
          if (name.toLowerCase().startsWith(studentNameFilter.toLowerCase())) {
            filterChildId = id;
            break;
          }
        }
        if (!filterChildId) {
          return { success: false, message: `Student "${studentNameFilter}" not found in classroom.` };
        }
        mediaQuery = mediaQuery.eq('child_id', filterChildId);
      }

      let mediaItems;
      try {
        const { data } = await mediaQuery;
        mediaItems = data;
      } catch (err) {
        console.error('get_classroom_media_summary DB error:', err);
        return { success: false, message: 'Database error fetching media. Please try again.' };
      }

      if (!mediaItems || mediaItems.length === 0) {
        return { success: true, message: `No photos or videos captured on ${mediaQueryDate}${studentNameFilter ? ` for ${studentNameFilter}` : ''}.` };
      }

      // Also check group photos via montree_media_children junction
      const mediaIds = mediaItems.filter(m => !m.child_id).map(m => m.id);
      let groupPhotoChildren: { media_id: string; child_id: string }[] = [];
      if (mediaIds.length > 0) {
        try {
          const { data: junctionData } = await supabase
            .from('montree_media_children')
            .select('media_id, child_id')
            .in('media_id', mediaIds);
          groupPhotoChildren = junctionData || [];
        } catch (err) {
          console.error('get_classroom_media_summary junction query error:', err);
          // Continue without group photo data — individual photos still work
        }
      }

      // Build per-child media counts
      const perChild = new Map<string, { photos: number; videos: number; captions: string[] }>();

      for (const m of mediaItems) {
        // Determine which children this media belongs to
        const childIds: string[] = [];
        if (m.child_id) {
          childIds.push(m.child_id);
        } else {
          // Group photo — find tagged children
          const tagged = groupPhotoChildren.filter(g => g.media_id === m.id);
          childIds.push(...tagged.map(t => t.child_id));
        }

        for (const cid of childIds) {
          const name = mediaChildNameMap.get(cid) || 'Unknown';
          const entry = perChild.get(name) || { photos: 0, videos: 0, captions: [] };
          if (m.media_type === 'video') entry.videos++;
          else entry.photos++;
          if (typeof m.caption === 'string' && entry.captions.length < 3) {
            entry.captions.push(m.caption.slice(0, 60));
          }
          perChild.set(name, entry);
        }
      }

      // Format output
      const totalPhotos = mediaItems.filter(m => m.media_type !== 'video').length;
      const totalVideos = mediaItems.filter(m => m.media_type === 'video').length;

      const lines: string[] = [];
      for (const [name, data] of perChild.entries()) {
        let line = `${name}: ${data.photos} photo${data.photos !== 1 ? 's' : ''}`;
        if (data.videos > 0) line += `, ${data.videos} video${data.videos !== 1 ? 's' : ''}`;
        if (data.captions.length > 0) line += `\n  Captions: ${data.captions.join('; ')}`;
        lines.push(line);
      }

      return {
        success: true,
        message: `Media summary for ${mediaQueryDate} — ${totalPhotos} photos, ${totalVideos} videos across ${perChild.size} students:\n\n${lines.join('\n')}`
      };
    }

    default:
      console.warn(`[Tool Executor] Unknown tool requested: ${toolName}`, JSON.stringify(input).slice(0, 200));
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
