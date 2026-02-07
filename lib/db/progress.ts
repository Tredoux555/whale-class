// lib/db/progress.ts
import { createServerClient } from '@/lib/supabase-client';
import type { ChildProgress, ChildProgressWithSkill, CreateProgressInput, StatusLevel, CurriculumArea, ProgressSummaryByArea } from '@/types/database';

export async function upsertProgress(input: CreateProgressInput): Promise<ChildProgress> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('child_progress')
    .upsert({
      child_id: input.child_id,
      skill_id: input.skill_id,
      status_level: input.status_level,
      notes: input.notes,
      teacher_initials: input.teacher_initials,
      date_updated: new Date().toISOString().split('T')[0],
    }, { onConflict: 'child_id,skill_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to update progress: ${error.message}`);
  return data;
}

export async function getChildProgress(childId: string, area?: CurriculumArea): Promise<ChildProgressWithSkill[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from('child_progress')
    .select(`*, skill:skills (*, category:skill_categories (*))`)
    .eq('child_id', childId)
    .order('date_updated', { ascending: false });

  if (area) query = query.eq('skill.category.area', area);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get child progress: ${error.message}`);
  return (data || []) as ChildProgressWithSkill[];
}

export async function getProgressSummaryByArea(childId: string): Promise<ProgressSummaryByArea[]> {
  const supabase = await createServerClient();
  const { data: progressData, error } = await supabase
    .from('child_progress')
    .select(`status_level, skill:skills (category:skill_categories (area))`)
    .eq('child_id', childId);

  if (error) throw new Error(`Failed to calculate progress summary: ${error.message}`);

  const summaryMap = new Map<CurriculumArea, ProgressSummaryByArea>();
  progressData?.forEach((progress: Record<string, unknown>) => {
    const area = (progress.skill as unknown as { category: { area: CurriculumArea } }).category.area;
    if (!summaryMap.has(area)) {
      summaryMap.set(area, {
        area, total_skills: 0, not_introduced: 0, observed: 0,
        guided_practice: 0, independent: 0, mastery: 0, transcended: 0, average_status: 0,
      });
    }
    const summary = summaryMap.get(area)!;
    summary.total_skills++;
    switch (progress.status_level) {
      case 0: summary.not_introduced++; break;
      case 1: summary.observed++; break;
      case 2: summary.guided_practice++; break;
      case 3: summary.independent++; break;
      case 4: summary.mastery++; break;
      case 5: summary.transcended++; break;
    }
  });

  summaryMap.forEach((summary) => {
    if (summary.total_skills > 0) {
      const totalStatus = 
        (summary.not_introduced * 0) + (summary.observed * 1) + (summary.guided_practice * 2) +
        (summary.independent * 3) + (summary.mastery * 4) + (summary.transcended * 5);
      summary.average_status = Math.round((totalStatus / summary.total_skills) * 10) / 10;
    }
  });

  return Array.from(summaryMap.values());
}
