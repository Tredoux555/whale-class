// app/api/montree/children/[childId]/game-plan/refresh/route.ts
// Refresh a child's game plan incorporating their latest progress data.
// Reads existing game plan + current progress + teacher notes, then generates an updated plan.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ childId: string }>;
}

const GAME_PLAN_TOOL = {
  name: 'create_game_plan' as const,
  description: 'Create a brief, warm game plan nudge for a tired teacher. One sentence they read in 2 seconds and know what to do next.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nudge: {
        type: 'string' as const,
        description: 'One warm sentence telling the teacher what to focus on next. Max 25 words. Acknowledges progress if any.',
      },
      works: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '3-5 specific works to present next. Use EXACT names from the classroom curriculum.',
      },
      direction: {
        type: 'string' as const,
        description: 'The area progression in arrow format. E.g. "Practical Life → Sensorial → Language"',
      },
    },
    required: ['nudge', 'works', 'direction'],
  },
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!anthropic) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 500 });
    }

    const supabase = getSupabase();

    // Fetch child + existing game plan + profile + progress
    const [childResult, profileResult, progressResult, notesResult] = await Promise.all([
      supabase.from('montree_children').select('name, date_of_birth, settings').eq('id', childId).maybeSingle(),
      supabase.from('montree_child_mental_profiles').select('*').eq('child_id', childId).maybeSingle(),
      supabase.from('montree_child_work_progress').select('work_name, area, status').eq('child_id', childId),
      supabase.from('montree_teacher_notes').select('content, created_at').eq('child_id', childId).order('created_at', { ascending: false }).limit(5),
    ]);

    const child = childResult.data as { name: string; date_of_birth: string | null; settings: Record<string, unknown> } | null;
    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    const existingPlan = child.settings?.game_plan as Record<string, unknown> | undefined;
    const profile = profileResult.data as {
      family_notes?: string | null;
      special_considerations?: string | null;
      successful_strategies?: string[];
      challenging_triggers?: string[];
    } | null;
    const progress = (progressResult.data || []) as Array<{ work_name: string; area: string; status: string }>;
    const notes = (notesResult.data || []) as Array<{ content: string; created_at: string }>;

    // Build progress summary
    const progressByArea: Record<string, { mastered: string[]; practicing: string[]; presented: string[] }> = {};
    for (const p of progress) {
      if (!progressByArea[p.area]) progressByArea[p.area] = { mastered: [], practicing: [], presented: [] };
      const bucket = p.status === 'mastered' ? 'mastered' : p.status === 'practicing' ? 'practicing' : 'presented';
      progressByArea[p.area][bucket].push(p.work_name);
    }

    const progressSummary = Object.entries(progressByArea)
      .map(([area, data]) => {
        const parts = [];
        if (data.mastered.length) parts.push(`mastered: ${data.mastered.join(', ')}`);
        if (data.practicing.length) parts.push(`practicing: ${data.practicing.join(', ')}`);
        if (data.presented.length) parts.push(`presented: ${data.presented.join(', ')}`);
        return `${area}: ${parts.join(' | ')}`;
      })
      .join('\n');

    const recentNotes = notes
      .map(n => `[${new Date(n.created_at).toLocaleDateString()}] ${n.content}`)
      .join('\n');

    const previousNudge = (existingPlan as Record<string, unknown>)?.nudge || (existingPlan as Record<string, unknown>)?.headline || '';
    const previousWorks = (existingPlan as Record<string, unknown>)?.works || [];

    const prompt = `Update a child's game plan based on their progress. Keep it brief — one sentence a tired teacher reads in 2 seconds.

CHILD: ${child.name}
PREVIOUS NUDGE: "${previousNudge}"
PREVIOUS WORKS: ${JSON.stringify(previousWorks)}

${progressSummary ? `PROGRESS:\n${progressSummary}` : 'No progress data yet.'}
${recentNotes ? `RECENT NOTES:\n${recentNotes}` : ''}
${profile?.family_notes ? `FAMILY: ${profile.family_notes}` : ''}

What should the teacher focus on NEXT? Acknowledge progress if any. Pick 3-5 new works that build on what's been done.`;

    console.log(`[GamePlan] Refreshing plan for ${child.name} (Haiku)`);

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      tools: [GAME_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'create_game_plan' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json({ success: false, error: 'AI generation failed' }, { status: 500 });
    }

    const plan = toolBlock.input as Record<string, unknown>;
    const updatedPlan = {
      ...plan,
      generated_at: existingPlan?.generated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      child_name: child.name,
      source: 'refresh',
    };

    await updateChildSettings(childId, { game_plan: updatedPlan });
    console.log(`[GamePlan] Refreshed plan saved for ${child.name}`);

    return NextResponse.json({ success: true, game_plan: updatedPlan });
  } catch (error) {
    console.error('[GamePlan] Refresh error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
