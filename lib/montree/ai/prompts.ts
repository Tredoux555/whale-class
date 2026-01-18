// lib/montree/ai/prompts.ts
// AI prompt templates for Montree developmental analysis

import type { ChildContext, AssignmentWithWork } from '../types/ai';

// ============================================
// SYSTEM PROMPT - Montessori Expert
// ============================================

export const MONTREE_SYSTEM_PROMPT = `You are an expert Montessori developmental analyst. Your role is to interpret children's work patterns and progress to provide deep insights about their development.

KEY MONTESSORI PRINCIPLES TO APPLY:
1. Sensitive Periods: Children have optimal windows for learning specific skills
   - Order (0-3): Need for routine and consistency
   - Movement (0-4): Refinement of gross and fine motor skills
   - Language (0-6): Vocabulary explosion, early literacy
   - Sensory refinement (0-5): Discrimination of sensory input
   - Small objects (1-4): Attention to detail, fine motor
   - Social behavior (2.5-6): Learning to interact with others

2. Planes of Development: Children aged 2-6 are in the first plane
   - Absorbent mind: Unconscious learning through environment
   - Need for independence: "Help me do it myself"
   - Concrete to abstract: Physical manipulation before concepts

3. Work Progression: Montessori works follow intentional sequences
   - Practical Life → Sensorial → Math/Language
   - Each work prepares for future, more complex works
   - Indirect aims reveal long-term developmental goals

4. Curriculum Areas and Their Developmental Focus:
   - Practical Life: Independence, concentration, coordination, order
   - Sensorial: Refinement of senses, preparation for math
   - Math: Concrete understanding, logical thinking
   - Language: Communication, literacy, self-expression
   - Cultural: Knowledge of world, appreciation of diversity

When analyzing a child's progress:
- Look at PATTERNS, not just completion counts
- Consider developmental stage and sensitive periods
- Identify indirect aims being developed
- Note areas of strength AND areas needing attention
- Provide actionable, specific insights for teachers and parents

Always be:
- Warm and encouraging in tone
- Specific with observations (not generic)
- Focused on the whole child, not just academics
- Respectful of each child's unique pace`;

// ============================================
// ANALYZE ENDPOINT PROMPT
// ============================================

export function buildAnalyzePrompt(
  child: ChildContext,
  assignments: AssignmentWithWork[],
  areaStats: Map<string, { total: number; completed: number; in_progress: number; not_started: number }>
): string {
  const masteredWorks = assignments.filter(a => a.status === 'mastered');
  const practicingWorks = assignments.filter(a => a.status === 'practicing');
  const presentedWorks = assignments.filter(a => a.status === 'presented');

  const statsArray = Array.from(areaStats.entries()).map(([area, stats]) => ({
    area,
    ...stats,
    percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  }));

  return `Analyze the developmental progress of this child:

CHILD PROFILE:
- Name: ${child.name}${child.name_chinese ? ` (${child.name_chinese})` : ''}
- Age: ${child.age ? `${child.age} years old` : 'Unknown'}
- Classroom: ${child.classroom_name}

PROGRESS BY CURRICULUM AREA:
${statsArray.map(s => 
  `- ${s.area}: ${s.completed}/${s.total} mastered (${s.percentage}%), ${s.in_progress} in progress`
).join('\n')}

MASTERED WORKS (${masteredWorks.length}):
${masteredWorks.slice(0, 15).map(a => 
  `- ${a.work.name} (${a.work.area_name}): ${a.work.direct_aims.slice(0, 2).join(', ')}`
).join('\n') || '- None yet'}
${masteredWorks.length > 15 ? `... and ${masteredWorks.length - 15} more` : ''}

CURRENTLY PRACTICING (${practicingWorks.length}):
${practicingWorks.map(a => 
  `- ${a.work.name} (${a.work.area_name}) at level ${a.current_level}: ${a.work.indirect_aims.slice(0, 2).join(', ')}`
).join('\n') || '- None'}

RECENTLY PRESENTED (${presentedWorks.length}):
${presentedWorks.slice(0, 5).map(a => 
  `- ${a.work.name} (${a.work.area_name})`
).join('\n') || '- None'}

Based on this data, provide a comprehensive developmental analysis. Consider:
1. What patterns do you see in the works chosen and mastered?
2. What sensitive periods might this child be in?
3. What indirect aims are being developed through their current work?
4. What areas show strength? What areas might need more attention?
5. What developmental stage descriptors apply to this child?

Respond with a JSON object in this exact format:
{
  "summary": "A 2-3 sentence overall summary of the child's development",
  "strengths": ["strength1", "strength2", "strength3"],
  "growth_areas": ["area needing attention1", "area2"],
  "area_insights": [
    {
      "area": "practical_life",
      "insight": "Specific insight about progress in this area, mentioning specific works if relevant"
    },
    {
      "area": "sensorial",
      "insight": "Specific insight..."
    },
    {
      "area": "math",
      "insight": "Specific insight..."
    },
    {
      "area": "language", 
      "insight": "Specific insight..."
    },
    {
      "area": "cultural",
      "insight": "Specific insight..."
    }
  ],
  "developmental_stage": "Description of where this child is developmentally, mentioning relevant sensitive periods"
}`;
}

// ============================================
// WEEKLY REPORT ENDPOINT PROMPT  
// ============================================

export function buildWeeklyReportPrompt(
  child: ChildContext,
  weekStart: string,
  weekEnd: string,
  assignmentsThisWeek: AssignmentWithWork[],
  allAssignments: AssignmentWithWork[]
): string {
  const worksUpdatedThisWeek = assignmentsThisWeek.filter(a => {
    const updatedAt = new Date(a.presented_at || a.assigned_at);
    return updatedAt >= new Date(weekStart) && updatedAt <= new Date(weekEnd);
  });

  const newlyMastered = worksUpdatedThisWeek.filter(a => a.status === 'mastered');
  const newlyPresented = worksUpdatedThisWeek.filter(a => a.status === 'presented');
  const activePracticing = allAssignments.filter(a => a.status === 'practicing');

  // Group by area
  const areaGroups = new Map<string, typeof worksUpdatedThisWeek>();
  for (const a of worksUpdatedThisWeek) {
    const area = a.work.area_name;
    if (!areaGroups.has(area)) areaGroups.set(area, []);
    areaGroups.get(area)!.push(a);
  }

  return `Generate a weekly progress report for parents:

CHILD: ${child.name}${child.name_chinese ? ` (${child.name_chinese})` : ''}
AGE: ${child.age ? `${child.age} years old` : 'Unknown'}
REPORT PERIOD: ${weekStart} to ${weekEnd}

THIS WEEK'S ACTIVITY:
${worksUpdatedThisWeek.length > 0 
  ? Array.from(areaGroups.entries()).map(([area, works]) =>
      `${area}:\n${works.map(w => `  - ${w.work.name} (${w.status})`).join('\n')}`
    ).join('\n\n')
  : '- No recorded activities this week'}

NEWLY MASTERED (${newlyMastered.length}):
${newlyMastered.map(a => 
  `- ${a.work.name}: ${a.work.direct_aims.join(', ')}`
).join('\n') || '- None this week'}

NEW WORKS PRESENTED (${newlyPresented.length}):
${newlyPresented.map(a => 
  `- ${a.work.name}: ${a.work.description || a.work.direct_aims.join(', ')}`
).join('\n') || '- None this week'}

CONTINUING TO PRACTICE (${activePracticing.length}):
${activePracticing.slice(0, 5).map(a => 
  `- ${a.work.name} at level ${a.current_level}`
).join('\n') || '- None'}

Generate a warm, encouraging report for parents that:
1. Celebrates specific accomplishments
2. Explains the developmental significance (in parent-friendly language)
3. Suggests 2-3 specific ways to support learning at home

Respond with JSON in this exact format:
{
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "narrative": "A 3-4 paragraph narrative about the week. Write warmly and specifically about THIS child. Avoid generic statements. Explain WHY activities matter developmentally. Make parents feel informed and connected to their child's growth.",
  "next_steps": ["specific home activity suggestion1", "suggestion2", "suggestion3"]
}`;
}

// ============================================
// SUGGEST NEXT ENDPOINT PROMPT
// ============================================

export function buildSuggestNextPrompt(
  child: ChildContext,
  currentAssignments: AssignmentWithWork[],
  availableWorks: Array<{
    id: string;
    work_key: string;
    name: string;
    name_chinese?: string;
    description?: string;
    age_range: string;
    materials: string[];
    direct_aims: string[];
    indirect_aims: string[];
    prerequisites: string[];
    category_key?: string;
    category_name?: string;
    area_key: string;
    area_name: string;
  }>,
  areaFilter?: string,
  limit: number = 5
): string {
  const masteredWorkKeys = new Set(
    currentAssignments
      .filter(a => a.status === 'mastered')
      .map(a => a.work.work_key)
  );

  const inProgressWorkIds = new Set(
    currentAssignments
      .filter(a => a.status !== 'mastered')
      .map(a => a.work_id)
  );

  // Filter available works to exclude already assigned
  const candidateWorks = availableWorks.filter(w => 
    !inProgressWorkIds.has(w.id) && 
    !masteredWorkKeys.has(w.work_key) &&
    (!areaFilter || w.area_key === areaFilter)
  );

  // Analyze prerequisites
  const worksWithPrereqStatus = candidateWorks.map(w => {
    const prereqsMet = w.prerequisites.filter(p => masteredWorkKeys.has(p));
    const prereqsMissing = w.prerequisites.filter(p => !masteredWorkKeys.has(p));
    return {
      ...w,
      prereqs_met: prereqsMet,
      prereqs_missing: prereqsMissing,
      prereqs_score: w.prerequisites.length === 0 
        ? 1 
        : prereqsMet.length / w.prerequisites.length
    };
  });

  // Sort by readiness (prerequisites met)
  worksWithPrereqStatus.sort((a, b) => b.prereqs_score - a.prereqs_score);

  const topCandidates = worksWithPrereqStatus.slice(0, 20);

  return `Recommend the next best works for this child:

CHILD: ${child.name}
AGE: ${child.age ? `${child.age} years old` : 'Unknown'}
${areaFilter ? `FILTER: Only ${areaFilter} works` : ''}

CURRENTLY MASTERED (${masteredWorkKeys.size} works):
${Array.from(masteredWorkKeys).slice(0, 10).join(', ')}${masteredWorkKeys.size > 10 ? `... and ${masteredWorkKeys.size - 10} more` : ''}

AVAILABLE WORKS TO CONSIDER (${topCandidates.length}):
${topCandidates.map(w => 
  `- ${w.name} (${w.area_name}/${w.category_name || 'General'})
   Age: ${w.age_range} | Prerequisites: ${w.prereqs_met.length}/${w.prerequisites.length} met
   Direct aims: ${w.direct_aims.slice(0, 2).join(', ')}
   Indirect aims: ${w.indirect_aims.slice(0, 2).join(', ')}`
).join('\n\n')}

Select the ${limit} best works for this child. Consider:
1. Prerequisite readiness (most prerequisites met = more ready)
2. Age appropriateness
3. Balance across areas if no filter specified
4. Building on current strengths while addressing gaps
5. Following natural Montessori progressions

Respond with JSON in this exact format:
{
  "suggestions": [
    {
      "work_id": "the work's id",
      "work_key": "the work's work_key",
      "readiness_score": 0.95,
      "reason": "Why this work is recommended now",
      "developmental_benefit": "What skills/concepts this develops"
    }
  ]
}

Provide exactly ${limit} suggestions, ordered by recommendation strength.`;
}
