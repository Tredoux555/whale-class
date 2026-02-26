// app/api/montree/guru/suggestions/route.ts
// Proactive Suggestions — detect stale works and generate suggestion cards
// Cached per child per week in montree_guru_interactions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED } from '@/lib/ai/anthropic';
import { analyzeChildProgress } from '@/lib/montree/guru/progress-analyzer';

function getISOWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();
    const isoWeek = getISOWeek();

    // Check for cached suggestion this week
    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('response_insight, context_snapshot')
      .eq('child_id', childId)
      .eq('question_type', 'proactive_suggestion')
      .gte('asked_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
      .limit(1)
      .single();

    if (cached?.response_insight) {
      return NextResponse.json({
        success: true,
        suggestion: cached.response_insight,
        type: (cached.context_snapshot as Record<string, unknown>)?.suggestion_type || 'stale',
      });
    }

    // Analyze progress
    const analysis = await analyzeChildProgress(supabase, childId);

    // No issues found — no suggestion needed
    if (analysis.staleWorks.length === 0 && analysis.hasActivity) {
      return NextResponse.json({ success: true, suggestion: null, reason: 'all_good' });
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: true, suggestion: null, reason: 'ai_disabled' });
    }

    // Get child info
    const { data: child } = await supabase
      .from('montree_children')
      .select('name, age, classroom_id')
      .eq('id', childId)
      .single();

    const childName = child?.name?.split(' ')[0] || 'Your child';
    const childAge = child?.age || 4;

    let prompt: string;
    let suggestionType: string;

    if (analysis.staleWorks.length > 0) {
      // Stale works detected
      suggestionType = 'stale';
      const staleList = analysis.staleWorks.slice(0, 5).map(w =>
        `${w.work_name} (${w.area}) — ${w.status} for ${w.days_stale} days`
      ).join('\n');

      prompt = `Child: ${childName}, age ${childAge}

These works have been in the same status for 2+ weeks:
${staleList}

Write a warm, practical message to the parent. In 3-4 sentences:
1. Gently name the pattern (e.g., "${childName} has been on the same works for a while")
2. Suggest ONE specific thing to try (change of approach, break it down, try a related work)
3. Reassure that plateaus are normal

Do NOT use headers or bullet points. Keep it conversational and warm.`;
    } else {
      // Inactive — no progress in 7+ days
      suggestionType = 'inactive';
      prompt = `Child: ${childName}, age ${childAge}
No Montessori activities have been logged in ${analysis.daysInactive} days.

Write a warm, non-judgmental message to the parent in 3-4 sentences:
1. A gentle "we haven't seen ${childName} this week" acknowledgment (NOT guilt-tripping)
2. Suggest 2-3 quick 5-minute activities they could try today
3. End with encouragement — any activity counts, even small ones

Do NOT use headers or bullet points. Keep it conversational and warm.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are a warm Montessori guide for homeschool parents. Be encouraging, specific, and never guilt-tripping. Keep responses under 100 words.',
      messages: [{ role: 'user', content: prompt }],
    });

    const suggestionText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    // Cache for the week
    await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id: childId,
        classroom_id: child?.classroom_id,
        question: `Proactive suggestion (${suggestionType})`,
        question_type: 'proactive_suggestion',
        response_insight: suggestionText,
        model_used: 'claude-haiku-4-5-20251001',
        context_snapshot: {
          child_name: childName,
          suggestion_type: suggestionType,
          stale_count: analysis.staleWorks.length,
          days_inactive: analysis.daysInactive,
          iso_week: isoWeek,
        },
      });

    return NextResponse.json({ success: true, suggestion: suggestionText, type: suggestionType });

  } catch (error) {
    console.error('[Guru Suggestions] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate suggestion' }, { status: 500 });
  }
}
