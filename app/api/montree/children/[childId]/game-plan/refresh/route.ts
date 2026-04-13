// app/api/montree/children/[childId]/game-plan/refresh/route.ts
// Refresh a child's game plan incorporating their latest progress data.
// Reads existing game plan + current progress + teacher notes, then generates an updated plan.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ childId: string }>;
}

const GAME_PLAN_TOOL = {
  name: 'create_game_plan' as const,
  description: 'Create an updated game plan incorporating the child\'s recent progress.',
  input_schema: {
    type: 'object' as const,
    properties: {
      headline: {
        type: 'string' as const,
        description: 'One warm sentence summarizing the updated plan direction.',
      },
      priority_areas: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Top 2-3 curriculum areas to prioritize',
      },
      parent_goals: {
        type: ['string', 'null'] as unknown as 'string',
        description: 'Parent goals (carry forward from previous plan if still relevant)',
      },
      phases: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const },
            goal: { type: 'string' as const },
            works: { type: 'array' as const, items: { type: 'string' as const } },
            strategies: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: ['title', 'goal', 'works', 'strategies'],
        },
      },
      weekly_check_questions: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      language_note: {
        type: ['string', 'null'] as unknown as 'string',
      },
      progress_note: {
        type: ['string', 'null'] as unknown as 'string',
        description: 'A brief note on what progress has been made since the last plan, and what has been adjusted.',
      },
    },
    required: ['headline', 'priority_areas', 'phases', 'weekly_check_questions'],
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

    const prompt = `You are a master Montessori guide. A child's game plan needs refreshing based on their actual progress.

CHILD: ${child.name}
${child.date_of_birth ? `DOB: ${child.date_of_birth}` : ''}

PREVIOUS GAME PLAN:
${existingPlan ? JSON.stringify(existingPlan, null, 2) : 'No previous plan exists.'}

${profile ? `PROFILE:
- Family notes: ${profile.family_notes || 'none'}
- Special considerations: ${profile.special_considerations || 'none'}
- Strategies that work: ${(profile.successful_strategies || []).join(', ') || 'none noted'}
- Challenges: ${(profile.challenging_triggers || []).join(', ') || 'none noted'}` : ''}

CURRENT PROGRESS:
${progressSummary || 'No progress data yet.'}

RECENT TEACHER NOTES:
${recentNotes || 'No recent notes.'}

Create an UPDATED game plan that:
1. Acknowledges what has been achieved
2. Adjusts phases based on actual progress (advance phases if child is ahead, slow down if struggling)
3. Keeps parent goals in mind
4. Introduces new works that build on what the child has mastered
5. Keeps the same warm, practical tone
6. Has 3-4 phases for the remaining weeks of the semester`;

    console.log(`[GamePlan] Refreshing plan for ${child.name} (${childId})`);

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
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
