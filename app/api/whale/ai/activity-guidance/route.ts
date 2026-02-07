// app/api/whale/ai/activity-guidance/route.ts
// Get AI-powered guidance for presenting a specific work

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL, MAX_TOKENS, AI_ENABLED } from '@/lib/ai/anthropic';
import { SYSTEM_PROMPT, buildActivityGuidancePrompt } from '@/lib/ai/prompts';

export async function POST(request: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: 'AI features are not enabled' },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { workId, childId, currentLevel } = body;

  if (!workId) {
    return NextResponse.json({ error: 'workId required' }, { status: 400 });
  }

  try {
    // Get work details
    const { data: work } = await supabase
      .from('curriculum_roadmap')
      .select('*')
      .eq('id', workId)
      .single();

    if (!work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // Get child age if childId provided
    let childAge = 4; // Default
    if (childId) {
      const { data: child } = await supabase
        .from('children')
        .select('date_of_birth')
        .eq('id', childId)
        .single();

      if (child?.date_of_birth) {
        childAge = Math.floor(
          (Date.now() - new Date(child.date_of_birth).getTime()) / 
          (365.25 * 24 * 60 * 60 * 1000)
        );
      }
    }

    // Get current level if not provided
    let level = currentLevel || 1;
    if (childId && !currentLevel) {
      const { data: progress } = await supabase
        .from('child_work_completion')
        .select('current_level')
        .eq('child_id', childId)
        .eq('work_id', workId)
        .single();

      if (progress) {
        level = progress.current_level;
      }
    }

    // Build prompt
    const prompt = buildActivityGuidancePrompt({
      workName: work.name,
      workDescription: work.description || '',
      materials: work.materials || [],
      directAims: work.direct_aims || [],
      indirectAims: work.indirect_aims || [],
      controlOfError: work.control_of_error || 'Self-correcting',
      currentLevel: level,
      maxLevel: work.levels?.length || 1,
      childAge,
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
    let guidance;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guidance = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      return NextResponse.json({
        guidance: null,
        rawResponse: responseText,
        error: 'Failed to parse response',
      });
    }

    return NextResponse.json({
      guidance,
      work: {
        id: work.id,
        name: work.name,
        chineseName: work.chinese_name || null,
      },
      level,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating activity guidance:', error);
    return NextResponse.json(
      { error: 'Failed to generate guidance' },
      { status: 500 }
    );
  }
}


