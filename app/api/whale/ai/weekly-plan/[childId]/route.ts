// app/api/whale/ai/weekly-plan/[childId]/route.ts
// Generate AI-powered weekly lesson plan

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, AI_MODEL, MAX_TOKENS, AI_ENABLED } from '@/lib/ai/anthropic';
import { SYSTEM_PROMPT, buildWeeklyPlanPrompt } from '@/lib/ai/prompts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: 'AI features are not enabled' },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { childId } = await params;
  const body = await request.json();
  const { focusAreas } = body; // Optional: areas to focus on this week

  try {
    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name, date_of_birth')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const childAge = child.date_of_birth
      ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 4;

    // Get areas
    const { data: areas } = await supabase
      .from('curriculum_areas')
      .select('id, name');

    const areaMap: Record<string, string> = {};
    areas?.forEach(a => { areaMap[a.id] = a.name; });

    // Get all completed works
    const { data: completions } = await supabase
      .from('child_work_completion')
      .select('work_id')
      .eq('child_id', childId)
      .eq('status', 'completed');

    const completedWorkIds = completions?.map(c => c.work_id) || [];

    const { data: completedWorkDetails } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area_id')
      .in('id', completedWorkIds);

    const completedWorks = completedWorkDetails?.map(w => ({
      name: w.name,
      area: areaMap[w.area_id] || 'Unknown',
    })) || [];

    // Get in-progress works
    const { data: inProgress } = await supabase
      .from('child_work_completion')
      .select('work_id, current_level, max_level')
      .eq('child_id', childId)
      .eq('status', 'in_progress');

    const inProgressWorkIds = inProgress?.map(p => p.work_id) || [];

    const { data: inProgressDetails } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area_id')
      .in('id', inProgressWorkIds);

    const inProgressWorks = inProgress?.map(p => {
      const work = inProgressDetails?.find(w => w.id === p.work_id);
      return {
        name: work?.name || 'Unknown',
        area: areaMap[work?.area_id || ''] || 'Unknown',
        currentLevel: p.current_level,
        maxLevel: p.max_level,
      };
    }) || [];

    // Get recommended works
    const allCompletedSet = new Set(completedWorkIds);
    const ageRanges = getAgeRanges(childAge);

    const { data: allWorks } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, description, area_id, prerequisites, materials, age_range')
      .order('sequence');

    const recommendedWorks = allWorks
      ?.filter(w => {
        if (allCompletedSet.has(w.id)) return false;
        if (inProgressWorkIds.includes(w.id)) return false;
        if (!ageRanges.includes(w.age_range)) return false;
        const prereqs = w.prerequisites || [];
        return prereqs.every((p: string) => allCompletedSet.has(p));
      })
      .slice(0, 15)
      .map(w => ({
        name: w.name,
        area: areaMap[w.area_id] || 'Unknown',
        description: w.description || '',
        materials: w.materials || [],
      })) || [];

    // Get area progress
    const { data: areaProgress } = await supabase
      .from('child_curriculum_progress')
      .select('area_name, completion_percentage')
      .eq('child_id', childId);

    const areaProgressFormatted = areaProgress?.map(a => ({
      area: a.area_name,
      percentage: a.completion_percentage,
    })) || [];

    // Build prompt
    const prompt = buildWeeklyPlanPrompt({
      childName: child.name,
      childAge,
      completedWorks,
      inProgressWorks,
      recommendedWorks,
      areaProgress: areaProgressFormatted,
      focusAreas,
    });

    // Call Claude
    const message = await anthropic!.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse JSON
    let plan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      return NextResponse.json({
        plan: null,
        rawResponse: responseText,
        error: 'Failed to parse response',
      });
    }

    return NextResponse.json({
      plan,
      childName: child.name,
      weekStarting: getNextMonday().toISOString(),
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating weekly plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly plan' },
      { status: 500 }
    );
  }
}

function getAgeRanges(age: number): string[] {
  if (age < 3) return ['toddler'];
  if (age < 4) return ['toddler', 'primary_year1'];
  if (age < 5) return ['primary_year1', 'primary_year2'];
  if (age < 6) return ['primary_year1', 'primary_year2', 'primary_year3'];
  if (age < 9) return ['primary_year2', 'primary_year3', 'lower_elementary'];
  return ['lower_elementary', 'upper_elementary'];
}

function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + diff);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}


