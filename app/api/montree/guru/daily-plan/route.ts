// app/api/montree/guru/daily-plan/route.ts
// Daily coaching plan for homeschool parents
// Generates a personalized "Today's Plan" with specific works, materials, and guidance
// Uses Haiku for speed + cost efficiency, cached per child per day

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';

// Load all 5 curriculum areas for work recommendations
import languageData from '@/lib/curriculum/data/language.json';
import mathData from '@/lib/curriculum/data/math.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

interface CurriculumWork {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  prerequisites: string[];
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  levels: Array<{
    level: number;
    name: string;
    description: string;
    videoSearchTerms?: string[];
  }>;
  sequence: number;
  categoryName?: string;
  areaName?: string;
  areaId?: string;
}

// Flatten all works from all areas with metadata
function getAllCurriculumWorks(): CurriculumWork[] {
  const areas = [
    { data: practicalLifeData, areaId: 'practical_life', areaName: 'Practical Life' },
    { data: sensorialData, areaId: 'sensorial', areaName: 'Sensorial' },
    { data: mathData, areaId: 'mathematics', areaName: 'Mathematics' },
    { data: languageData, areaId: 'language', areaName: 'Language' },
    { data: culturalData, areaId: 'cultural', areaName: 'Cultural Studies' },
  ];

  const works: CurriculumWork[] = [];
  for (const area of areas) {
    const categories = (area.data as any).categories || [];
    for (const cat of categories) {
      for (const work of cat.works || []) {
        works.push({
          ...work,
          categoryName: cat.name,
          areaName: area.areaName,
          areaId: area.areaId,
        });
      }
    }
  }
  return works;
}

// Build the daily plan system prompt
function buildDailyPlanPrompt(
  childName: string,
  childAge: number,
  currentWorks: Array<{ work_name: string; area: string; status: string; notes?: string }>,
  masteredWorks: string[],
  allWorks: CurriculumWork[],
): { system: string; user: string } {
  // Find works the child hasn't started yet, appropriate for their age
  const ageRange = childAge <= 3 ? 'primary_year1' : childAge <= 4 ? 'primary_year2' : 'primary_year3';
  const allWorkNames = new Set([...currentWorks.map(w => w.work_name), ...masteredWorks]);

  // Get current focus works (not mastered)
  const focusWorks = currentWorks.filter(w => w.status !== 'mastered');
  const recentlyMastered = currentWorks.filter(w => w.status === 'mastered').slice(0, 5);

  // Find next recommended works (not yet started, age-appropriate)
  const availableWorks = allWorks
    .filter(w => !allWorkNames.has(w.name))
    .filter(w => w.ageRange === ageRange || w.ageRange === 'primary_year1')
    .slice(0, 20); // Limit context size

  // Build work details for current focus
  const focusDetails = focusWorks.map(fw => {
    const currWork = allWorks.find(w => w.name === fw.work_name);
    return {
      name: fw.work_name,
      area: fw.area,
      status: fw.status,
      notes: fw.notes,
      materials: currWork?.materials || [],
      directAims: currWork?.directAims || [],
      controlOfError: currWork?.controlOfError || '',
      levels: currWork?.levels || [],
      videoTerms: currWork?.levels?.[0]?.videoSearchTerms || [],
    };
  });

  const system = `You are a warm, experienced Montessori guide helping a homeschool parent plan their child's day. You speak directly to the parent as "you" and refer to the child by name.

YOUR ROLE:
- You are the parent's daily Montessori coach
- The parent has NO teaching experience — explain EVERYTHING clearly
- Tell them exactly what to do, step by step, like you're standing beside them
- Be encouraging but practical
- Reference specific materials they need to prepare
- Suggest YouTube search terms for any work they're unsure about
- Keep the plan to 3-4 works maximum per day (quality over quantity)

RESPONSE FORMAT (use these exact headers):
## Good Morning, [Parent]! 🌿

### Today's Focus
[1-2 sentence overview of what today is about and why]

### 📋 Prepare These Materials
[Bullet list of SPECIFIC materials needed for today's works]

### 🌱 Today's Works

#### 1. [Work Name] — [Area]
**Status:** [Presented/Practicing/New]
**Time:** [estimated minutes]
**What to do:**
[Step-by-step instructions in plain language]
**Why this matters:**
[1 sentence on developmental benefit]
**Watch this first:** Search YouTube for "[search terms]"
**Look for:** [What success looks like / control of error]

[Repeat for 2-3 more works]

### 🌟 Celebrate Yesterday
[Acknowledge recent mastery or progress]

### 💡 Parent Tip of the Day
[One practical tip about the home Montessori environment]`;

  const user = `CHILD: ${childName}, Age ${childAge}

CURRENT FOCUS WORKS (what ${childName} is working on now):
${focusDetails.map(w => `- ${w.name} (${w.area}) — Status: ${w.status}${w.notes ? ` — Notes: ${w.notes}` : ''}
  Materials: ${w.materials.join(', ') || 'none listed'}
  Aims: ${w.directAims.join(', ') || 'not specified'}
  Control of error: ${w.controlOfError || 'not specified'}
  Video search: ${w.videoTerms.join(', ') || w.name + ' montessori presentation'}`).join('\n')}

RECENTLY MASTERED:
${recentlyMastered.length > 0 ? recentlyMastered.map(w => `- ${w.work_name} (${w.area})`).join('\n') : 'None yet — this is the beginning of the journey!'}

TOTAL MASTERED: ${masteredWorks.length} works

AVAILABLE NEXT WORKS (age-appropriate, not yet started):
${availableWorks.slice(0, 10).map(w => `- ${w.name} (${w.areaName}) — ${w.description}
  Materials: ${w.materials.join(', ')}
  Prereqs: ${w.prerequisites.length > 0 ? w.prerequisites.join(', ') : 'none'}`).join('\n')}

Generate today's plan for ${childName}. Pick 3-4 works that make sense together. Prioritize works already in progress (practicing) over new presentations. Include 1 new work if appropriate.`;

  return { system, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const locale = searchParams.get('locale') || 'en';

    if (!childId) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Check if we have a cached plan for today
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily_plan_${childId}_${today}`;

    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('id, response_insight, asked_at')
      .eq('child_id', childId)
      .eq('question_type', 'daily_plan')
      .gte('asked_at', `${today}T00:00:00Z`)
      .order('asked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.response_insight) {
      return NextResponse.json({
        success: true,
        plan: cached.response_insight,
        cached: true,
        interaction_id: cached.id,
      });
    }

    // Fetch child data
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, age, classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (childError || !child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Fetch current progress
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, notes, created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    const currentWorks = progress || [];
    const masteredWorks = currentWorks.filter(w => w.status === 'mastered').map(w => w.work_name);

    // Build prompt
    const allCurriculumWorks = getAllCurriculumWorks();
    const { system, user } = buildDailyPlanPrompt(
      child.name.split(' ')[0],
      child.age || 4,
      currentWorks,
      masteredWorks,
      allCurriculumWorks,
    );

    // Call Haiku
    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const systemWithLocale = locale === 'zh'
      ? system + '\n\nLANGUAGE REQUIREMENT: You MUST write the ENTIRE plan in Simplified Chinese (中文). Use warm, natural Chinese. All headers, instructions, and content must be in Chinese.'
      : system;

    const message = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: systemWithLocale,
      messages: [{ role: 'user', content: user }],
    });

    const planText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Cache as a guru interaction
    const { data: saved, error: saveError } = await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id: childId,
        classroom_id: child.classroom_id,
        question: `Daily plan for ${today}`,
        question_type: 'daily_plan',
        response_insight: planText,
        response_root_cause: 'daily_coaching',
        response_action_plan: [],
        response_timeline: today,
        sources_used: ['curriculum_json'],
        model_used: HAIKU_MODEL,
        processing_time_ms: 0,
      })
      .select('id')
      .maybeSingle();

    if (saveError) {
      console.error('[Guru Daily Plan] Save error:', saveError);
    }

    return NextResponse.json({
      success: true,
      plan: planText,
      cached: false,
      interaction_id: saved?.id,
    });

  } catch (error) {
    console.error('[Guru Daily Plan] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate daily plan' },
      { status: 500 }
    );
  }
}
