// app/api/whale/ai/daily-plan/[childId]/route.ts
// Generate AI-powered daily activity plan

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createSupabaseAdmin } from '@/lib/supabase-client';
import { anthropic, AI_MODEL, MAX_TOKENS, AI_ENABLED } from '@/lib/ai/anthropic';
import { SYSTEM_PROMPT, buildDailyPlanPrompt } from '@/lib/ai/prompts';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: 'AI features are not enabled. Set ANTHROPIC_API_KEY.' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const adminSupabase = createSupabaseAdmin();
  const { childId } = await params;

  try {
    // Get child info (use admin client to bypass RLS for authenticated users)
    const { data: child, error: childError } = await adminSupabase
      .from('children')
      .select('name, date_of_birth')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      console.error('Child lookup error:', childError);
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const childAge = child.date_of_birth
      ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 4; // Default age if not set

    // Get areas (use admin client for public curriculum data)
    const { data: areas } = await adminSupabase
      .from('curriculum_areas')
      .select('id, name');

    const areaMap: Record<string, string> = {};
    areas?.forEach(a => { areaMap[a.id] = a.name; });

    // Get completed works (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: completions } = await adminSupabase
      .from('child_work_completion')
      .select('work_id, status, completed_at')
      .eq('child_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysAgo.toISOString());

    const completedWorkIds = completions?.map(c => c.work_id) || [];

    // Get work details for completed works
    const { data: completedWorkDetails } = await adminSupabase
      .from('curriculum_roadmap')
      .select('id, name, area_id')
      .in('id', completedWorkIds);

    const completedWorks = completions?.map(c => {
      const work = completedWorkDetails?.find(w => w.id === c.work_id);
      return {
        name: work?.name || 'Unknown',
        area: areaMap[work?.area_id || ''] || 'Unknown',
        completedAt: c.completed_at || '',
      };
    }) || [];

    // Get in-progress works
    const { data: inProgress } = await adminSupabase
      .from('child_work_completion')
      .select('work_id, current_level, max_level')
      .eq('child_id', childId)
      .eq('status', 'in_progress');

    const inProgressWorkIds = inProgress?.map(p => p.work_id) || [];

    const { data: inProgressWorkDetails } = await adminSupabase
      .from('curriculum_roadmap')
      .select('id, name, area_id')
      .in('id', inProgressWorkIds);

    const inProgressWorks = inProgress?.map(p => {
      const work = inProgressWorkDetails?.find(w => w.id === p.work_id);
      return {
        name: work?.name || 'Unknown',
        area: areaMap[work?.area_id || ''] || 'Unknown',
        currentLevel: p.current_level,
        maxLevel: p.max_level,
      };
    }) || [];

    // Get recommended next works (via existing API logic)
    const allCompletedIds = await getAllCompletedWorkIds(adminSupabase, childId);
    
    const { data: allWorks } = await adminSupabase
      .from('curriculum_roadmap')
      .select('id, name, description, area_id, prerequisites, materials, age_range')
      .order('sequence');

    // Filter to age-appropriate works with met prerequisites
    const ageRanges = getAgeRanges(childAge);
    const recommendedWorks = allWorks
      ?.filter(w => {
        if (allCompletedIds.has(w.id)) return false;
        if (inProgressWorkIds.includes(w.id)) return false;
        if (!ageRanges.includes(w.age_range)) return false;
        const prereqs = w.prerequisites || [];
        return prereqs.every((p: string) => allCompletedIds.has(p));
      })
      .slice(0, 10)
      .map(w => ({
        name: w.name,
        area: areaMap[w.area_id] || 'Unknown',
        description: w.description || '',
        materials: w.materials || [],
      })) || [];

    // Calculate area progress
    const { data: areaProgress } = await adminSupabase
      .from('child_curriculum_progress')
      .select('area_name, completion_percentage')
      .eq('child_id', childId);

    const areaProgressFormatted = areaProgress?.map(a => ({
      area: a.area_name,
      percentage: a.completion_percentage,
    })) || [];

    // Build prompt
    const prompt = buildDailyPlanPrompt({
      childName: child.name,
      childAge,
      completedWorks,
      inProgressWorks,
      recommendedWorks,
      areaProgress: areaProgressFormatted,
    });

    // Call Claude API
    const message = await anthropic!.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract response
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Parse JSON from response
    let plan;
    try {
      // Find JSON in response (may be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({
        plan: null,
        rawResponse: responseText,
        error: 'Failed to parse AI response',
      });
    }

    return NextResponse.json({
      plan,
      childName: child.name,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating daily plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily plan' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getAllCompletedWorkIds(supabaseClient: any, childId: string): Promise<Set<string>> {
  const { data } = await supabaseClient
    .from('child_work_completion')
    .select('work_id')
    .eq('child_id', childId)
    .eq('status', 'completed');
  
  return new Set(data?.map((d: any) => d.work_id) || []);
}

function getAgeRanges(age: number): string[] {
  if (age < 3) return ['toddler'];
  if (age < 4) return ['toddler', 'primary_year1'];
  if (age < 5) return ['primary_year1', 'primary_year2'];
  if (age < 6) return ['primary_year1', 'primary_year2', 'primary_year3'];
  if (age < 9) return ['primary_year2', 'primary_year3', 'lower_elementary'];
  return ['lower_elementary', 'upper_elementary'];
}

