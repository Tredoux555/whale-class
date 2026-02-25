// app/api/montree/guru/end-of-day/route.ts
// End-of-Day Nudge — Haiku generates a 3-sentence summary after progress logged today
// Cached per child per day in montree_guru_interactions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED } from '@/lib/ai/anthropic';

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

    // Check if child had any progress updates today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: todayProgress, error: progressError } = await supabase
      .from('montree_child_work_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId)
      .gte('updated_at', todayISO)
      .order('updated_at', { ascending: false });

    if (progressError) {
      return NextResponse.json({ success: false, error: 'Failed to check progress' }, { status: 500 });
    }

    // No progress today — no nudge needed
    if (!todayProgress || todayProgress.length === 0) {
      return NextResponse.json({ success: true, nudge: null, reason: 'no_progress_today' });
    }

    // Check for cached nudge today
    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('response_insight')
      .eq('child_id', childId)
      .eq('question_type', 'end_of_day')
      .gte('asked_at', todayISO)
      .limit(1)
      .single();

    if (cached?.response_insight) {
      return NextResponse.json({ success: true, nudge: cached.response_insight });
    }

    // Generate nudge with Haiku
    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: true, nudge: null, reason: 'ai_disabled' });
    }

    // Get child name
    const { data: child } = await supabase
      .from('montree_children')
      .select('name')
      .eq('id', childId)
      .single();

    const childName = child?.name?.split(' ')[0] || 'Your child';

    // Build progress summary for the prompt
    const progressSummary = todayProgress.map(p =>
      `${p.work_name} (${p.area}) — ${p.status}`
    ).join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a warm, encouraging Montessori guide for homeschool parents. Write a brief end-of-day summary in EXACTLY 3 sentences:
1. What went well today (reference specific works)
2. What to try tomorrow (one gentle suggestion)
3. One encouragement for the parent

Keep it warm, specific, and under 80 words total. Use the child's name. Do NOT use headers or bullet points — just 3 flowing sentences.`,
      messages: [{
        role: 'user',
        content: `Child: ${childName}\n\nToday's progress:\n${progressSummary}\n\nWrite 3 sentences.`,
      }],
    });

    const nudgeText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    // Cache in guru interactions
    await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id: childId,
        question: `End-of-day nudge for ${todayProgress.length} activities`,
        question_type: 'end_of_day',
        response_insight: nudgeText,
        model_used: 'claude-haiku-4-5-20251001',
        context_snapshot: {
          child_name: childName,
          progress_count: todayProgress.length,
          works: todayProgress.map(p => p.work_name),
        },
      });

    return NextResponse.json({ success: true, nudge: nudgeText });

  } catch (error) {
    console.error('[Guru EndOfDay] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate summary' }, { status: 500 });
  }
}
