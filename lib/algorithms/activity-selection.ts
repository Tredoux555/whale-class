// lib/algorithms/activity-selection.ts
import { createServerClient } from '../supabase';
import { getChildProgress } from '../db/progress';
import { getChildById, calculateDecimalAge } from '../db/children';
import type { Activity, ActivitySelectionCriteria, ScoredActivity, StatusLevel } from '@/types/database';

export async function selectDailyActivity(childId: string, options?: {
  preferredAreas?: any[];
  excludeAreas?: any[];
  forceNewArea?: boolean;
}): Promise<Activity> {
  const child = await getChildById(childId);
  if (!child) throw new Error('Child not found');

  const progress = await getChildProgress(childId);
  const recentActivities = await getRecentActivities(childId, 7);
  const childAge = calculateDecimalAge(child.date_of_birth);

  const criteria: ActivitySelectionCriteria = {
    childId,
    childAge,
    ageGroup: child.age_group,
    currentSkillLevels: buildSkillLevelMap(progress),
    previousActivities: recentActivities.map(a => a.activity_id || ''),
    preferredAreas: options?.preferredAreas,
    excludeAreas: options?.excludeAreas,
  };

  const candidates = await getCandidateActivities(criteria);
  if (candidates.length === 0) throw new Error('No suitable activities found');

  const scoredActivities = await scoreActivities(candidates, criteria, recentActivities);
  
  let finalCandidates = scoredActivities;
  if (options?.forceNewArea) {
    const recentAreas = new Set(recentActivities.slice(0, 3).map(a => a.activity?.area).filter(Boolean));
    const newAreaActivities = scoredActivities.filter(a => !recentAreas.has(a.area));
    if (newAreaActivities.length > 0) finalCandidates = newAreaActivities;
  }

  return finalCandidates[0];
}

async function getCandidateActivities(criteria: ActivitySelectionCriteria): Promise<Activity[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from('activities')
    .select('*')
    .lte('age_min', criteria.childAge)
    .gte('age_max', criteria.childAge);

  if (criteria.preferredAreas && criteria.preferredAreas.length > 0) {
    query = query.in('area', criteria.preferredAreas);
  }
  if (criteria.excludeAreas && criteria.excludeAreas.length > 0) {
    query = query.not('area', 'in', `(${criteria.excludeAreas.join(',')})`);
  }
  if (criteria.previousActivities.length > 0) {
    query = query.not('id', 'in', `(${criteria.previousActivities.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get candidate activities: ${error.message}`);
  return data || [];
}

async function scoreActivities(activities: Activity[], criteria: ActivitySelectionCriteria, recentActivities: any[]): Promise<ScoredActivity[]> {
  const scored: ScoredActivity[] = [];

  for (const activity of activities) {
    let score = 100;
    const reasons: string[] = [];

    const ageRange = activity.age_max - activity.age_min;
    const agePosition = (criteria.childAge - activity.age_min) / ageRange;
    if (agePosition >= 0.3 && agePosition <= 0.7) {
      score += 10;
      reasons.push('Perfect age match');
    }

    const childAverageLevel = calculateAverageSkillLevel(criteria.currentSkillLevels);
    const skillDiff = Math.abs(activity.skill_level - childAverageLevel);
    if (skillDiff === 0) {
      score += 15;
      reasons.push('Matches skill level perfectly');
    } else if (skillDiff === 1) {
      score += 10;
      reasons.push('Appropriate challenge level');
    } else if (skillDiff > 2) {
      score -= 10;
    }

    if (activity.prerequisites && activity.prerequisites.length > 0) {
      const metPrereqs = activity.prerequisites.filter(prereqId => {
        const level = criteria.currentSkillLevels[prereqId];
        return level !== undefined && level >= 3;
      }).length;
      const prereqRatio = metPrereqs / activity.prerequisites.length;
      if (prereqRatio === 1) {
        score += 20;
        reasons.push('All prerequisites met');
      } else if (prereqRatio >= 0.5) {
        score += 5;
      } else {
        score -= 20;
      }
    } else {
      score += 5;
      reasons.push('No prerequisites needed');
    }

    const recentAreas = recentActivities.slice(0, 5).map(a => a.activity?.area).filter(Boolean);
    if (!recentAreas.includes(activity.area)) {
      score += 15;
      reasons.push('New curriculum area');
    } else {
      const timesRecentlyDone = recentAreas.filter(a => a === activity.area).length;
      score -= (timesRecentlyDone * 5);
    }

    const daysSinceLastDone = getDaysSinceActivityDone(activity.id, recentActivities);
    if (daysSinceLastDone < 7) {
      score -= 30;
    } else if (daysSinceLastDone < 14) {
      score -= 10;
    }

    if (activity.duration_minutes && activity.duration_minutes <= 15) {
      score += 5;
      reasons.push('Short, focused activity');
    }

    if (activity.area === 'practical_life' && criteria.childAge < 3.5) {
      score += 5;
    }

    scored.push({ ...activity, score: Math.max(0, score), reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function buildSkillLevelMap(progress: any[]): Record<string, StatusLevel> {
  const map: Record<string, StatusLevel> = {};
  progress.forEach(p => { map[p.skill_id] = p.status_level; });
  return map;
}

function calculateAverageSkillLevel(skillLevels: Record<string, StatusLevel>): number {
  const levels = Object.values(skillLevels);
  if (levels.length === 0) return 1;
  const sum = levels.reduce((acc: number, level: StatusLevel) => acc + level, 0);
  return Math.round(sum / levels.length);
}

function getDaysSinceActivityDone(activityId: string, recentActivities: any[]): number {
  const done = recentActivities.find(a => a.activity_id === activityId);
  if (!done) return 999;
  const doneDate = new Date(done.activity_date);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - doneDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function getRecentActivities(childId: string, days: number): Promise<any[]> {
  const supabase = await createServerClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('activity_log')
    .select(`*, activity:activities (*)`)
    .eq('child_id', childId)
    .gte('activity_date', startDate.toISOString().split('T')[0])
    .order('activity_date', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function markActivityComplete(childId: string, activityId: string, completed: boolean, notes?: string, engagementLevel?: number): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('activity_log').insert({
    child_id: childId,
    activity_id: activityId,
    activity_date: new Date().toISOString().split('T')[0],
    completed,
    notes,
    engagement_level: engagementLevel,
  });
  if (error) throw new Error(`Failed to log activity: ${error.message}`);
}
