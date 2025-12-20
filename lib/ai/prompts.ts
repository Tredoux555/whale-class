// lib/ai/prompts.ts
// AI prompt templates for lesson planning

export const SYSTEM_PROMPT = `You are an expert Montessori educator assistant. You help teachers and parents plan personalized learning activities for children aged 2-6 years.

Key Montessori principles to follow:
- Follow the child's interests and developmental stage
- Prepare the environment, not the child
- Allow for self-directed learning
- Present one concept at a time
- Progress from concrete to abstract
- Respect the child's pace and concentration
- Encourage independence and self-correction

When suggesting activities:
- Consider prerequisites and prior mastery
- Match activities to the child's age and developmental stage
- Balance across curriculum areas (Practical Life, Sensorial, Math, Language, Cultural)
- Include both new challenges and review of mastered concepts
- Suggest variations and extensions when appropriate

Always provide practical, actionable guidance that parents and teachers can implement.`;

export function buildDailyPlanPrompt(context: {
  childName: string;
  childAge: number;
  completedWorks: { name: string; area: string; completedAt: string }[];
  inProgressWorks: { name: string; area: string; currentLevel: number; maxLevel: number }[];
  recommendedWorks: { name: string; area: string; description: string; materials: string[] }[];
  areaProgress: { area: string; percentage: number }[];
}): string {
  return `Generate a personalized daily activity plan for ${context.childName} (${context.childAge} years old).

CHILD'S CURRENT PROGRESS:
${context.areaProgress.map(a => `- ${a.area}: ${a.percentage}% complete`).join('\n')}

RECENTLY COMPLETED WORKS:
${context.completedWorks.slice(0, 5).map(w => `- ${w.name} (${w.area})`).join('\n') || '- None yet'}

CURRENTLY IN PROGRESS:
${context.inProgressWorks.map(w => `- ${w.name} (${w.area}) - Level ${w.currentLevel}/${w.maxLevel}`).join('\n') || '- None'}

RECOMMENDED NEXT WORKS (prerequisites met):
${context.recommendedWorks.slice(0, 8).map(w => `- ${w.name} (${w.area}): ${w.description}`).join('\n')}

Please provide:
1. 3-4 recommended activities for today, with a mix of:
   - Continuing in-progress work
   - Introducing one new work
   - Review/practice of mastered concepts

2. For each activity, include:
   - Activity name and area
   - Brief description of what to do
   - Materials needed
   - Presentation tips
   - Signs of mastery to watch for

3. A suggested daily schedule/flow

Format your response as JSON with this structure:
{
  "greeting": "Personalized greeting for the day",
  "activities": [
    {
      "name": "Activity Name",
      "area": "Curriculum Area",
      "type": "new" | "continue" | "review",
      "description": "What to do",
      "materials": ["material1", "material2"],
      "presentationTips": ["tip1", "tip2"],
      "signsOfMastery": ["sign1", "sign2"],
      "duration": "10-15 minutes"
    }
  ],
  "schedule": [
    { "time": "9:00 AM", "activity": "Activity Name", "notes": "Optional notes" }
  ],
  "parentNote": "Brief note for parents about today's focus"
}`;
}

export function buildWeeklyPlanPrompt(context: {
  childName: string;
  childAge: number;
  completedWorks: { name: string; area: string }[];
  inProgressWorks: { name: string; area: string; currentLevel: number; maxLevel: number }[];
  recommendedWorks: { name: string; area: string; description: string; materials: string[] }[];
  areaProgress: { area: string; percentage: number }[];
  focusAreas?: string[];
}): string {
  const focusNote = context.focusAreas?.length 
    ? `\nFOCUS AREAS REQUESTED: ${context.focusAreas.join(', ')}`
    : '';

  return `Generate a weekly lesson plan for ${context.childName} (${context.childAge} years old).
${focusNote}

CURRENT PROGRESS:
${context.areaProgress.map(a => `- ${a.area}: ${a.percentage}% complete`).join('\n')}

WORKS IN PROGRESS:
${context.inProgressWorks.map(w => `- ${w.name} (${w.area}) - Level ${w.currentLevel}/${w.maxLevel}`).join('\n') || '- None'}

AVAILABLE NEXT WORKS:
${context.recommendedWorks.slice(0, 12).map(w => `- ${w.name} (${w.area}): ${w.description}`).join('\n')}

Create a balanced weekly plan that:
1. Continues in-progress works toward completion
2. Introduces 2-3 new works across different areas
3. Includes daily practical life activities
4. Balances challenge with consolidation
5. Follows Montessori three-period lesson structure

Format as JSON:
{
  "weeklyGoals": ["goal1", "goal2", "goal3"],
  "days": [
    {
      "day": "Monday",
      "theme": "Optional daily theme",
      "activities": [
        {
          "name": "Activity Name",
          "area": "Area",
          "type": "new" | "continue" | "review",
          "focusPoint": "What to focus on"
        }
      ]
    }
  ],
  "materialsToPrep": ["material1", "material2"],
  "teacherNotes": "Overall notes for the week",
  "parentCommunication": "Suggested message to parents about the week"
}`;
}

export function buildActivityGuidancePrompt(context: {
  workName: string;
  workDescription: string;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  currentLevel: number;
  maxLevel: number;
  childAge: number;
}): string {
  return `Provide detailed teaching guidance for presenting this Montessori work:

WORK: ${context.workName}
DESCRIPTION: ${context.workDescription}
CHILD'S AGE: ${context.childAge} years
CURRENT LEVEL: ${context.currentLevel} of ${context.maxLevel}

MATERIALS: ${context.materials.join(', ')}

DIRECT AIMS: ${context.directAims.join(', ')}
INDIRECT AIMS: ${context.indirectAims.join(', ')}
CONTROL OF ERROR: ${context.controlOfError}

Please provide:
1. Step-by-step presentation guide
2. Key points to emphasize at this level
3. Common mistakes to watch for
4. Extensions and variations
5. How to know when child is ready for next level
6. Parent-friendly explanation of the activity's purpose

Format as JSON:
{
  "presentationSteps": [
    { "step": 1, "action": "What to do", "keyPoint": "Why it matters" }
  ],
  "levelFocus": "What to focus on at this level",
  "commonMistakes": ["mistake1", "mistake2"],
  "extensions": ["extension1", "extension2"],
  "readinessIndicators": ["indicator1", "indicator2"],
  "parentExplanation": "Simple explanation for parents"
}`;
}


