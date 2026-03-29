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
  detail?: string; // Detailed data for Claude to reason about (never shown to user directly)
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
        message: `${AREA_LABELS[area] || area}: ${formatted.length} works found${works.length > 30 ? ` (showing first 30 of ${works.length})` : ''}${category ? ` in category "${category}"` : ''}.`,
        detail: JSON.stringify(formatted, null, 1),
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
        message: `${AREA_LABELS[area] || area} — ${counts.mastered} mastered, ${counts.practicing} practicing, ${counts.presented} presented, ${counts.not_started} not started.`,
        detail: JSON.stringify(statusList, null, 1),
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
        message: `Found ${matches.length} works matching "${query}"${matches.length > 20 ? ' (showing first 20)' : ''}.`,
        detail: JSON.stringify(formatted, null, 1),
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
      const photoUrl = ((input.photo_url as string) || '').slice(0, 500) || null;
      const parentDescription = ((input.parent_description as string) || '').slice(0, 1000) || null;
      const controlOfError = ((input.control_of_error as string) || '').slice(0, 500) || null;

      // Validate photo_url if provided (must be HTTPS)
      if (photoUrl && !photoUrl.startsWith('https://')) {
        return { success: false, message: 'photo_url must be an HTTPS URL' };
      }

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
          photo_url: photoUrl,
          parent_description: parentDescription,
          control_of_error: controlOfError,
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
        message: `Classroom overview — ${children.length} students.`,
        detail: JSON.stringify(summaries, null, 1),
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
          work_names_only: focusWorks.map(fw => fw.work_name), // List of actual work names for grouping constraint check
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
        message: `Grouping data for ${children2.length} students (criteria: ${criteria}, focus: ${focusArea}, groups: ${numGroups}).${customInstructions ? ` Instructions: ${customInstructions}` : ''}`,
        detail: `Student data:\n${JSON.stringify(studentData, null, 1)}\n\nIMPORTANT GROUPING CONSTRAINT: When forming groups, ensure children in the same group are working on DIFFERENT works. Even if two children are at the same level, avoid putting them on the same work in the same group. Varied works encourage peer teaching and cross-pollination. The "work_names_only" field shows which works each child is currently doing.\n\nPlease analyze this data and create ${numGroups} groups using the "${criteria}" strategy. For each group, list the students, show which works they're doing, and explain your reasoning with attention to work diversity within groups.`,
      };
    }

    // --- Area Analytics Tool (read-only) ---

    case 'get_weekly_area_summary': {
      // Validate days parameter
      const summaryDays = Math.min(Math.max((input.days as number) || 7, 1), 30);
      const summaryArea = (input.area as string) || 'all';
      const validSummaryAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'all'];
      if (!validSummaryAreas.includes(summaryArea)) {
        return { success: false, message: `Invalid area: "${summaryArea}". Must be one of: ${validSummaryAreas.join(', ')}` };
      }

      // Get classroom_id — use override (whole-class mode) or look up from child
      let classroomIdSummary = classroomIdOverride;
      if (!classroomIdSummary) {
        const { data: childData } = await supabase
          .from('montree_children')
          .select('classroom_id')
          .eq('id', childId)
          .single();
        classroomIdSummary = childData?.classroom_id;
      }
      if (!classroomIdSummary) {
        return { success: false, message: 'Could not determine classroom.' };
      }

      // Get all children in classroom
      const { data: summaryChildren } = await supabase
        .from('montree_children')
        .select('id, name')
        .eq('classroom_id', classroomIdSummary)
        .order('name');

      if (!summaryChildren || summaryChildren.length === 0) {
        return { success: true, message: 'No students in this classroom.' };
      }

      const summaryChildIds = summaryChildren.map(c => c.id);
      const summaryChildNameMap = new Map(summaryChildren.map(c => [c.id, c.name]));

      // Calculate date range
      const summaryEndDate = new Date();
      const summaryStartDate = new Date();
      summaryStartDate.setDate(summaryStartDate.getDate() - summaryDays);
      const startDateStr = summaryStartDate.toISOString().split('T')[0] + 'T00:00:00';

      // 3 parallel queries: progress changes, media (photos), sessions
      // Each wrapped independently so one failing table doesn't kill the whole tool
      const areaFilter = summaryArea !== 'all' ? summaryArea : undefined;

      // Query 1: Progress changes (primary data source)
      let progressData: Array<{ child_id: string; work_name: string; area: string; status: string; updated_at: string }> = [];
      try {
        const progressQuery = supabase
          .from('montree_child_progress')
          .select('child_id, work_name, area, status, updated_at')
          .in('child_id', summaryChildIds)
          .gte('updated_at', startDateStr)
          .limit(500);
        if (areaFilter) progressQuery.eq('area', areaFilter);
        const { data } = await progressQuery;
        progressData = data || [];
      } catch (err) {
        console.error('[Tool] get_weekly_area_summary progress query error:', err);
      }

      // Query 2: Media/photos (secondary — infer area from work_id or caption)
      let mediaData: Array<{ child_id: string; work_id: string | null; caption: string | null }> = [];
      try {
        const { data } = await supabase
          .from('montree_media')
          .select('child_id, work_id, caption')
          .eq('classroom_id', classroomIdSummary)
          .gte('captured_at', startDateStr)
          .limit(500);
        mediaData = data || [];
      } catch (err) {
        console.error('[Tool] get_weekly_area_summary media query error:', err);
      }

      // Query 3: Sessions (may not exist — table is optional)
      let sessionsData: Array<{ child_id: string; area: string | null; work_name: string | null }> = [];
      try {
        const sessionsQuery = supabase
          .from('montree_sessions')
          .select('child_id, area, work_name')
          .eq('classroom_id', classroomIdSummary)
          .gte('created_at', startDateStr)
          .limit(500);
        if (areaFilter) sessionsQuery.eq('area', areaFilter);
        const { data } = await sessionsQuery;
        sessionsData = data || [];
      } catch {
        // Table may not exist — silently continue with empty data
      }

      // Build area → Set<childId> mapping from all data sources
      const areasToAnalyze = summaryArea === 'all'
        ? ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']
        : [summaryArea];

      const areaVisitors = new Map<string, Set<string>>();
      const areaActivityCounts = new Map<string, Map<string, number>>(); // area → childId → count
      for (const a of areasToAnalyze) {
        areaVisitors.set(a, new Set());
        areaActivityCounts.set(a, new Map());
      }

      // Count from progress changes
      for (const p of progressData) {
        if (!areasToAnalyze.includes(p.area)) continue;
        areaVisitors.get(p.area)!.add(p.child_id);
        const counts = areaActivityCounts.get(p.area)!;
        counts.set(p.child_id, (counts.get(p.child_id) || 0) + 1);
      }

      // Count from sessions (if available)
      for (const s of (sessionsData || [])) {
        if (!s.area || !areasToAnalyze.includes(s.area)) continue;
        areaVisitors.get(s.area)!.add(s.child_id);
        const counts = areaActivityCounts.get(s.area)!;
        counts.set(s.child_id, (counts.get(s.child_id) || 0) + 1);
      }

      // Build work_id → area map from curriculum for media area inference
      const workIdAreaMap = new Map<string, string>();
      try {
        const { data: classroomWorks } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id, area_id')
          .eq('classroom_id', classroomIdSummary);
        if (classroomWorks) {
          const { data: areas } = await supabase
            .from('montree_classroom_curriculum_areas')
            .select('id, area_key')
            .eq('classroom_id', classroomIdSummary);
          const areaIdToKey = new Map((areas || []).map(a => [a.id, a.area_key]));
          for (const w of classroomWorks) {
            const areaKey = areaIdToKey.get(w.area_id);
            if (areaKey) workIdAreaMap.set(w.id, areaKey);
          }
        }
      } catch { /* curriculum lookup failed — fall back to keyword matching */ }

      // Count media — first try work_id lookup, then fall back to caption keywords
      const areaKeywords: Record<string, string[]> = {
        practical_life: ['practical', 'pouring', 'spooning', 'transfer', 'care', 'dressing', 'cleaning', 'washing', 'folding', 'polishing', 'buttoning', 'zipping'],
        sensorial: ['sensorial', 'pink tower', 'brown stair', 'knobbed', 'color', 'sound', 'texture', 'geometric', 'binomial', 'trinomial'],
        mathematics: ['math', 'number', 'counting', 'addition', 'bead', 'spindle', 'hundred', 'thousand', 'decimal', 'fraction'],
        language: ['language', 'sandpaper letter', 'moveable alphabet', 'reading', 'writing', 'phonetic', 'grammar', 'nomenclature'],
        cultural: ['cultural', 'geography', 'science', 'botany', 'zoology', 'history', 'art', 'music', 'globe', 'map', 'flag'],
      };
      for (const m of mediaData) {
        if (!m.child_id) continue;

        // Try work_id → area lookup first (most accurate)
        let mediaArea: string | null = null;
        if (m.work_id) {
          mediaArea = workIdAreaMap.get(m.work_id) || null;
        }

        // Fall back to caption keyword matching
        if (!mediaArea) {
          const captionLower = (m.caption || '').toLowerCase();
          for (const a of areasToAnalyze) {
            const keywords = areaKeywords[a] || [];
            if (keywords.some(kw => captionLower.includes(kw))) {
              mediaArea = a;
              break;
            }
          }
        }

        if (mediaArea && areasToAnalyze.includes(mediaArea)) {
          areaVisitors.get(mediaArea)!.add(m.child_id);
          const counts = areaActivityCounts.get(mediaArea)!;
          counts.set(m.child_id, (counts.get(m.child_id) || 0) + 1);
        }
      }

      // Build output
      const areaSummaries = areasToAnalyze.map(area => {
        const visitors = areaVisitors.get(area)!;
        const counts = areaActivityCounts.get(area)!;
        const visitorNames = Array.from(visitors)
          .map(id => ({ name: summaryChildNameMap.get(id) || 'Unknown', count: counts.get(id) || 0 }))
          .sort((a, b) => b.count - a.count);

        const missingIds = summaryChildIds.filter(id => !visitors.has(id));
        const missingNames = missingIds.map(id => summaryChildNameMap.get(id) || 'Unknown').sort();

        return {
          area: AREA_LABELS[area] || area,
          area_key: area,
          children_active: visitors.size,
          children_missing: missingIds.length,
          total_children: summaryChildren.length,
          coverage_pct: Math.round((visitors.size / summaryChildren.length) * 100),
          active_children: visitorNames.map(v => `${v.name} (${v.count} activities)`),
          missing_children: missingNames,
        };
      });

      const dateRange = `${summaryStartDate.toISOString().split('T')[0]} to ${summaryEndDate.toISOString().split('T')[0]}`;

      return {
        success: true,
        message: `Area coverage summary for the past ${summaryDays} days (${dateRange}). Total children: ${summaryChildren.length}.`,
        detail: `${JSON.stringify(areaSummaries, null, 1)}\n\nUse this data to identify which children need to be guided toward undervisited areas. Consider using group_students to create small groups for targeted area work.`,
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

    // ---- V3 Intelligence Tools (Sprint 3) ----

    case 'get_prioritized_recommendations': {
      try {
        const { generateShelfProposals, AREA_LABELS } = await import('./work-sequencer');
        // Fetch child data for V3 scoring
        const { data: child } = await supabase
          .from('montree_children')
          .select('name, date_of_birth')
          .eq('id', childId)
          .maybeSingle();

        if (!child) return { success: false, message: 'Child not found' };

        // Parallel data fetches
        const [progressRes, observationsRes, focusRes] = await Promise.all([
          supabase
            .from('montree_child_progress')
            .select('work_name, work_key, area, status, updated_at')
            .eq('child_id', childId),
          supabase
            .from('montree_behavioral_observations')
            .select('observation')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('montree_child_focus_works')
            .select('work_name, area')
            .eq('child_id', childId),
        ]);

        const progress = progressRes.data || [];
        const observations = (observationsRes.data || []).map(o => o.observation).filter(Boolean);
        const focusWorks = focusRes.data || [];

        // Calculate child age in years
        let childAgeYears: number | undefined;
        if (child.date_of_birth) {
          const dob = new Date(child.date_of_birth);
          const now = new Date();
          childAgeYears = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        }

        // Build V3 scoring data
        const strugglingWorkKeys = progress
          .filter(p => p.status === 'struggling' || p.status === 'presented')
          .map(p => p.work_key || p.work_name);

        // Last observation date by area
        const lastObsByArea: Record<string, string> = {};
        for (const p of progress) {
          if (p.updated_at && p.area) {
            if (!lastObsByArea[p.area] || p.updated_at > lastObsByArea[p.area]) {
              lastObsByArea[p.area] = p.updated_at;
            }
          }
        }

        // Call with positional parameters matching generateShelfProposals signature
        const result = generateShelfProposals(
          childId,
          child.name,
          progress.map(p => ({
            work_name: p.work_name,
            work_key: p.work_key || p.work_name,
            area: p.area,
            status: p.status,
          })),
          focusWorks,
          {
            childAgeYears,
            observations,
            strugglingWorkKeys,
            lastObservationByArea: lastObsByArea,
          }
        );

        const areaFilter = input.area_filter as string | undefined;
        const limit = Math.min((input.limit as number) || 10, 20);

        // Combine main proposals + bridge proposals
        let allProposals = [...result.proposals, ...(result.bridge_proposals || [])];
        if (areaFilter) {
          allProposals = allProposals.filter(p => p.area === areaFilter);
        }

        // Sort by v3_score (descending), fall back to legacy score
        allProposals.sort((a, b) => (b.v3_score ?? b.score) - (a.v3_score ?? a.score));
        allProposals = allProposals.slice(0, limit);

        if (allProposals.length === 0) {
          return {
            success: true,
            message: `No recommendations found${areaFilter ? ` for ${AREA_LABELS[areaFilter] || areaFilter}` : ''}. The child may have all areas well covered.`
          };
        }

        // Format output by tier
        const byTier: Record<string, typeof allProposals> = {};
        for (const p of allProposals) {
          const tier = p.tier || 'available';
          if (!byTier[tier]) byTier[tier] = [];
          byTier[tier].push(p);
        }

        const lines: string[] = [];
        lines.push(`V3 Prioritized Recommendations for ${child.name}${result.v3_active ? ' (V3 scoring active)' : ' (legacy scoring)'}:`);
        for (const tier of ['urgent', 'recommended', 'available', 'deferred']) {
          const items = byTier[tier];
          if (!items || items.length === 0) continue;
          lines.push(`\n${tier.toUpperCase()} (${items.length}):`);
          for (const p of items) {
            const score = p.v3_score ?? p.score;
            const area = AREA_LABELS[p.area] || p.area;
            const reasons = p.reasons?.join('; ') || p.reason;
            const bridge = p.bridge_from_area ? ` [BRIDGE from ${AREA_LABELS[p.bridge_from_area] || p.bridge_from_area}]` : '';
            lines.push(`  • ${p.proposed_work} (${area}, score ${score})${bridge}`);
            lines.push(`    Why: ${reasons}`);
          }
        }

        return {
          success: true,
          message: lines.join('\n'),
          detail: JSON.stringify({ v3_active: result.v3_active, proposals: allProposals.map(p => ({ work: p.proposed_work, area: p.area, score: p.v3_score ?? p.score, tier: p.tier, reasons: p.reasons, bridge: p.bridge_from_area })) })
        };
      } catch (err) {
        console.error(`[V3 Tool] get_prioritized_recommendations error for child ${childId}:`, err);
        return { success: false, message: 'Failed to generate prioritized recommendations' };
      }
    }

    case 'get_struggling_analysis': {
      try {
        const {
          getExerciseSkills,
          getSkillStrength,
          findBridgeExercises,
          analyzeNotes,
        } = await import('./skill-graph');
        const { AREA_LABELS } = await import('./work-sequencer');

        // Fetch child data
        const [childRes, progressRes, observationsRes] = await Promise.all([
          supabase.from('montree_children').select('name').eq('id', childId).maybeSingle(),
          supabase.from('montree_child_progress').select('work_name, work_key, area, status').eq('child_id', childId),
          supabase.from('montree_behavioral_observations').select('observation').eq('child_id', childId).order('created_at', { ascending: false }).limit(50),
        ]);

        const child = childRes.data;
        if (!child) return { success: false, message: 'Child not found' };

        const progress = progressRes.data || [];
        const observations = (observationsRes.data || []).map(o => o.observation).filter(Boolean);

        // Find struggling works
        const exerciseName = input.exercise_name as string | undefined;
        let strugglingWorks = progress.filter(p => p.status === 'struggling' || p.status === 'presented');
        if (exerciseName) {
          strugglingWorks = strugglingWorks.filter(p =>
            p.work_name.toLowerCase().includes(exerciseName.toLowerCase())
          );
        }

        if (strugglingWorks.length === 0) {
          return {
            success: true,
            message: exerciseName
              ? `${child.name} doesn't appear to be struggling with "${exerciseName}".`
              : `${child.name} doesn't have any struggling exercises recorded.`
          };
        }

        // Analyze notes for skill clues
        const skillClues = analyzeNotes(observations);

        const lines: string[] = [`Struggling Analysis for ${child.name}:`];

        for (const work of strugglingWorks) {
          const skills = getExerciseSkills(work.work_key || work.work_name);
          lines.push(`\n📍 ${work.work_name} (${AREA_LABELS[work.area] || work.area})`);

          if (skills) {
            // Check which required skills are weak
            const progressEntries = progress.map(p => ({ work_key: p.work_key || p.work_name, status: p.status as 'mastered' | 'practicing' | 'presented' | 'not_started' }));
            const weakReqs: string[] = [];
            for (const req of skills.skills_required) {
              const skillResult = getSkillStrength(progressEntries, req);
              if (skillResult.strength < 0.5) {
                weakReqs.push(req);
              }
            }

            if (weakReqs.length > 0) {
              lines.push(`  Weak prerequisites: ${weakReqs.join(', ')}`);

              // Find bridge exercises from other areas (pass progress so it skips mastered works)
              const bridges = findBridgeExercises(weakReqs, work.area, progressEntries);
              if (bridges.length > 0) {
                lines.push(`  Cross-area bridges (exercises from OTHER areas that develop these skills):`);
                for (const bridge of bridges.slice(0, 5)) {
                  lines.push(`    - ${bridge.work_key} (${AREA_LABELS[bridge.from_area] || bridge.from_area}) — ${bridge.reason}`);
                }
              }
            } else {
              lines.push(`  Prerequisites look strong — struggle may be developmental timing or confidence.`);
            }
          } else {
            lines.push(`  No V3 skill data for this exercise — recommend observing closely.`);
          }
        }

        // Add note-based clues
        if (skillClues.length > 0) {
          lines.push(`\nClues from teacher observations:`);
          for (const clue of skillClues.slice(0, 8)) {
            lines.push(`  "${clue.matchedPatterns.join('/')}" suggests weak ${clue.skill} (${clue.label})`);
          }
        }

        return {
          success: true,
          message: lines.join('\n'),
          detail: JSON.stringify({
            struggling_count: strugglingWorks.length,
            skill_clues: skillClues.slice(0, 10),
          })
        };
      } catch (err) {
        console.error(`[V3 Tool] get_struggling_analysis error for child ${childId}:`, err);
        return { success: false, message: 'Failed to analyze struggles' };
      }
    }

    case 'get_attention_flags': {
      try {
        const {
          analyzeNotes,
        } = await import('./skill-graph');
        const { AREA_LABELS } = await import('./work-sequencer');

        const [childRes, progressRes, observationsRes] = await Promise.all([
          supabase.from('montree_children').select('name').eq('id', childId).maybeSingle(),
          supabase.from('montree_child_progress').select('work_name, work_key, area, status, updated_at').eq('child_id', childId),
          supabase.from('montree_behavioral_observations').select('observation').eq('child_id', childId).order('created_at', { ascending: false }).limit(50),
        ]);

        const child = childRes.data;
        if (!child) return { success: false, message: 'Child not found' };

        const progress = progressRes.data || [];
        const observations = (observationsRes.data || []).map(o => o.observation).filter(Boolean);

        const flags: { level: 'urgent' | 'attention' | 'info'; message: string }[] = [];
        const now = Date.now();
        const STALE_MS = 21 * 24 * 60 * 60 * 1000; // 21 days

        // 1. Stale areas (>21 days without observation)
        const lastObsByArea: Record<string, number> = {};
        for (const p of progress) {
          if (p.updated_at && p.area) {
            const t = new Date(p.updated_at).getTime();
            if (!isNaN(t) && (!lastObsByArea[p.area] || t > lastObsByArea[p.area])) {
              lastObsByArea[p.area] = t;
            }
          }
        }
        const allAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
        for (const area of allAreas) {
          const last = lastObsByArea[area];
          if (!last) {
            if (progress.length > 0) {
              flags.push({ level: 'attention', message: `No activity recorded in ${AREA_LABELS[area] || area}` });
            }
          } else if (now - last > STALE_MS) {
            const days = Math.floor((now - last) / (24 * 60 * 60 * 1000));
            flags.push({ level: 'attention', message: `${AREA_LABELS[area] || area} stale — no observation in ${days} days` });
          }
        }

        // 2. Prolonged struggles
        const struggling = progress.filter(p => p.status === 'struggling');
        for (const s of struggling) {
          flags.push({ level: 'urgent', message: `Struggling with ${s.work_name} (${AREA_LABELS[s.area] || s.area})` });
        }

        // 3. Area imbalance (>60% in one area)
        const obsByArea: Record<string, number> = {};
        for (const p of progress) {
          obsByArea[p.area] = (obsByArea[p.area] || 0) + 1;
        }
        const totalObs = progress.length;
        if (totalObs >= 5) {
          for (const area of allAreas) {
            const count = obsByArea[area] || 0;
            if (count / totalObs > 0.60) {
              flags.push({ level: 'attention', message: `Area imbalance — ${Math.round(count / totalObs * 100)}% of work is in ${AREA_LABELS[area] || area}` });
            }
          }
        }

        // 4. Skill clues from observations
        const skillClues = analyzeNotes(observations);
        if (skillClues.length > 0) {
          const topClues = skillClues.slice(0, 3);
          for (const clue of topClues) {
            flags.push({ level: 'info', message: `Observation clue: "${clue.matchedPatterns.join('/')}" suggests weak ${clue.skill}` });
          }
        }

        // 5. No recent observations at all
        if (progress.length === 0) {
          flags.push({ level: 'urgent', message: 'No progress data recorded yet for this child' });
        }

        // Sort by level priority
        const levelOrder = { urgent: 0, attention: 1, info: 2 };
        flags.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

        if (flags.length === 0) {
          return { success: true, message: `No attention flags for ${child.name} — everything looks on track!` };
        }

        const lines: string[] = [`Attention Flags for ${child.name} (${flags.length} total):`];
        for (const f of flags) {
          const icon = f.level === 'urgent' ? '🔴' : f.level === 'attention' ? '🟡' : '🔵';
          lines.push(`  ${icon} [${f.level.toUpperCase()}] ${f.message}`);
        }

        return {
          success: true,
          message: lines.join('\n'),
          detail: JSON.stringify({ flags })
        };
      } catch (err) {
        console.error(`[V3 Tool] get_attention_flags error for child ${childId}:`, err);
        return { success: false, message: 'Failed to generate attention flags' };
      }
    }

    case 'get_skill_analysis': {
      try {
        const {
          SKILL_EXERCISE_MAP,
          getSkillStrength,
        } = await import('./skill-graph');

        const skillName = (input.skill_name as string || '').trim().toLowerCase();
        if (!skillName) return { success: false, message: 'Missing skill_name parameter' };

        const [childRes, progressRes] = await Promise.all([
          supabase.from('montree_children').select('name').eq('id', childId).maybeSingle(),
          supabase.from('montree_child_progress').select('work_name, work_key, area, status').eq('child_id', childId),
        ]);

        const child = childRes.data;
        if (!child) return { success: false, message: 'Child not found' };

        const progress = progressRes.data || [];

        // Find exercises that develop this skill
        const developers = SKILL_EXERCISE_MAP[skillName];
        if (!developers || developers.length === 0) {
          return { success: true, message: `Unknown skill: "${skillName}". No exercises in the curriculum develop this skill.` };
        }

        // Calculate skill strength using work_key
        const progressEntries = progress.map(p => ({
          work_key: p.work_key || p.work_name,
          status: p.status as 'mastered' | 'practicing' | 'presented' | 'not_started',
        }));
        const skillResult = getSkillStrength(progressEntries, skillName);

        // Categorize exercises — build map keyed by work_key for lookup against SKILL_EXERCISE_MAP keys
        const progressByKey = new Map(progress.map(p => [p.work_key || p.work_name, p]));
        const mastered: string[] = [];
        const practicing: string[] = [];
        const presented: string[] = [];
        const notStarted: string[] = [];

        for (const exKey of developers) {
          const p = progressByKey.get(exKey);
          if (!p) {
            notStarted.push(exKey);
          } else if (p.status === 'mastered') {
            mastered.push(p.work_name);
          } else if (p.status === 'practicing') {
            practicing.push(p.work_name);
          } else {
            presented.push(p.work_name);
          }
        }

        const lines: string[] = [];
        lines.push(`Skill Analysis: "${skillName}" for ${child.name}`);
        lines.push(`Overall strength: ${Math.round(skillResult.strength * 100)}%`);
        lines.push(`Exercises that develop this skill (${developers.length} total):`);

        if (mastered.length > 0) lines.push(`  Mastered (${mastered.length}): ${mastered.join(', ')}`);
        if (practicing.length > 0) lines.push(`  Practicing (${practicing.length}): ${practicing.join(', ')}`);
        if (presented.length > 0) lines.push(`  Presented (${presented.length}): ${presented.join(', ')}`);
        if (notStarted.length > 0) lines.push(`  Not started (${notStarted.length}): ${notStarted.join(', ')}`);

        if (skillResult.strength < 0.5 && notStarted.length > 0) {
          lines.push(`\nRecommendation: This skill needs strengthening. Consider presenting: ${notStarted.slice(0, 3).join(', ')}`);
        }

        return {
          success: true,
          message: lines.join('\n'),
          detail: JSON.stringify({ skill: skillName, strength: skillResult.strength, mastered: mastered.length, practicing: practicing.length, presented: presented.length, not_started: notStarted.length })
        };
      } catch (err) {
        console.error(`[V3 Tool] get_skill_analysis error for child ${childId}:`, err);
        return { success: false, message: 'Failed to analyze skill' };
      }
    }

    default:
      console.warn(`[Tool Executor] Unknown tool requested: ${toolName}`, JSON.stringify(input).slice(0, 200));
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
