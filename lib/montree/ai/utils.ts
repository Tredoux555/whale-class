// lib/montree/ai/utils.ts
// Shared utilities for AI endpoints - DRY principle

import type { AssignmentWithWork, ChildContext } from '../types/ai';

/**
 * Area display names - single source of truth
 */
export const AREA_DISPLAY_NAMES: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  math: 'Math',
  language: 'Language',
  cultural: 'Cultural'
};

/**
 * Get display name for an area key
 */
export function getAreaDisplayName(areaKey: string): string {
  return AREA_DISPLAY_NAMES[areaKey] || areaKey;
}

/**
 * Transform raw Supabase assignment data to AssignmentWithWork type
 * Shared across all AI endpoints to avoid code duplication
 */
export function transformAssignment(rawAssignment: {
  id: string;
  child_id: string;
  work_id: string;
  status: string;
  current_level: number;
  assigned_at: string;
  presented_at?: string | null;
  mastered_at?: string | null;
  notes?: string | null;
  work: {
    id: string;
    work_key: string;
    name: string;
    name_chinese?: string | null;
    description?: string | null;
    age_range: string;
    materials: string[] | null;
    direct_aims: string[] | null;
    indirect_aims: string[] | null;
    prerequisites: string[] | null;
    category_key?: string | null;
    category_name?: string | null;
    area_id: string;
    area: { area_key: string; name: string } | null;
  } | null;
}): AssignmentWithWork | null {
  if (!rawAssignment.work) return null;
  
  const work = rawAssignment.work;
  
  return {
    id: rawAssignment.id,
    child_id: rawAssignment.child_id,
    work_id: rawAssignment.work_id,
    status: rawAssignment.status as 'not_started' | 'presented' | 'practicing' | 'mastered',
    current_level: rawAssignment.current_level,
    assigned_at: rawAssignment.assigned_at,
    presented_at: rawAssignment.presented_at || undefined,
    mastered_at: rawAssignment.mastered_at || undefined,
    notes: rawAssignment.notes || undefined,
    work: {
      id: work.id,
      work_key: work.work_key,
      name: work.name,
      name_chinese: work.name_chinese || undefined,
      description: work.description || undefined,
      age_range: work.age_range,
      materials: work.materials || [],
      direct_aims: work.direct_aims || [],
      indirect_aims: work.indirect_aims || [],
      prerequisites: work.prerequisites || [],
      category_key: work.category_key || undefined,
      category_name: work.category_name || undefined,
      area_id: work.area_id,
      area_key: work.area?.area_key || 'unknown',
      area_name: work.area?.name || 'Unknown'
    }
  };
}

/**
 * Transform raw child data to ChildContext type
 */
export function transformChildContext(rawChild: {
  id: string;
  name: string;
  name_chinese?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  classroom_id: string | null;
  classroom: { id: string; name: string } | null;
}): ChildContext | null {
  if (!rawChild.classroom_id) return null;
  
  return {
    id: rawChild.id,
    name: rawChild.name,
    name_chinese: rawChild.name_chinese || undefined,
    age: rawChild.age || null,
    date_of_birth: rawChild.date_of_birth || undefined,
    classroom_id: rawChild.classroom_id,
    classroom_name: rawChild.classroom?.name || 'Unknown'
  };
}

/**
 * Generate fallback analysis when AI fails
 * Returns basic stats-based insights
 */
export function generateFallbackAnalysis(
  childContext: ChildContext,
  assignments: AssignmentWithWork[],
  areaStats: Map<string, { total: number; completed: number; in_progress: number; not_started: number }>
): {
  summary: string;
  strengths: string[];
  growth_areas: string[];
  area_insights: Array<{ area: string; insight: string }>;
  developmental_stage: string;
} {
  const masteredCount = assignments.filter(a => a.status === 'mastered').length;
  const practicingCount = assignments.filter(a => a.status === 'practicing').length;
  const totalAssignments = assignments.length;

  // Find strongest area (highest completion %)
  let strongestArea = '';
  let highestPercentage = 0;
  let lowestArea = '';
  let lowestPercentage = 100;

  for (const [area, stats] of areaStats.entries()) {
    if (stats.total > 0) {
      const percentage = (stats.completed / stats.total) * 100;
      if (percentage > highestPercentage) {
        highestPercentage = percentage;
        strongestArea = area;
      }
      if (percentage < lowestPercentage) {
        lowestPercentage = percentage;
        lowestArea = area;
      }
    }
  }

  const strengths: string[] = [];
  const growthAreas: string[] = [];

  if (strongestArea) {
    strengths.push(`Strong progress in ${getAreaDisplayName(strongestArea)}`);
  }
  if (masteredCount > 0) {
    strengths.push(`${masteredCount} works mastered`);
  }
  if (practicingCount > 0) {
    strengths.push(`Actively practicing ${practicingCount} works`);
  }

  if (lowestArea && lowestArea !== strongestArea) {
    growthAreas.push(`${getAreaDisplayName(lowestArea)} could use more exploration`);
  }
  if (totalAssignments < 10) {
    growthAreas.push('Opportunity to explore more curriculum areas');
  }

  // Generate area insights
  const areaInsights = Array.from(areaStats.entries()).map(([area, stats]) => {
    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    let insight = '';

    if (stats.completed === 0 && stats.in_progress === 0) {
      insight = `${childContext.name} has not yet started exploring ${getAreaDisplayName(area)}. This area offers many opportunities for growth.`;
    } else if (percentage >= 50) {
      insight = `Excellent progress in ${getAreaDisplayName(area)} with ${stats.completed} works mastered. Continue building on this strong foundation.`;
    } else if (stats.in_progress > 0) {
      insight = `${childContext.name} is actively working in ${getAreaDisplayName(area)} with ${stats.in_progress} works in progress.`;
    } else {
      insight = `Early exploration in ${getAreaDisplayName(area)}. ${stats.completed} works completed so far.`;
    }

    return { area, insight };
  });

  return {
    summary: `${childContext.name} has engaged with ${totalAssignments} works across the Montessori curriculum, mastering ${masteredCount} and currently practicing ${practicingCount}. ${strongestArea ? `The strongest progress is in ${getAreaDisplayName(strongestArea)}.` : 'Progress is developing across all areas.'}`,
    strengths: strengths.length > 0 ? strengths : ['Actively engaging with the Montessori environment'],
    growth_areas: growthAreas.length > 0 ? growthAreas : ['Continue exploring all curriculum areas'],
    area_insights: areaInsights,
    developmental_stage: childContext.age 
      ? `At ${childContext.age} years old, ${childContext.name} is in the first plane of development, characterized by the absorbent mind and sensitive periods for order, movement, and language.`
      : `${childContext.name} is in the first plane of development, building foundational skills through hands-on exploration.`
  };
}

/**
 * Generate fallback suggestions when AI fails
 * Uses pure prerequisite-based ranking
 */
export function generateFallbackSuggestions(
  worksWithReadiness: Array<{
    id: string;
    work_key: string;
    name: string;
    direct_aims: string[];
    prerequisites: string[];
    prereqs_met: string[];
    prereqs_missing: string[];
    readiness_score: number;
  }>,
  limit: number
): Array<{
  work_id: string;
  work_key: string;
  readiness_score: number;
  reason: string;
  developmental_benefit: string;
}> {
  return worksWithReadiness.slice(0, limit).map(w => ({
    work_id: w.id,
    work_key: w.work_key,
    readiness_score: w.readiness_score,
    reason: w.prerequisites.length === 0 
      ? 'No prerequisites required - ready to begin this work'
      : w.readiness_score === 1 
        ? 'All prerequisites mastered - fully ready for this work'
        : `${w.prereqs_met.length} of ${w.prerequisites.length} prerequisites mastered`,
    developmental_benefit: w.direct_aims.length > 0 
      ? w.direct_aims.slice(0, 2).join(', ')
      : 'Builds foundational Montessori skills'
  }));
}
