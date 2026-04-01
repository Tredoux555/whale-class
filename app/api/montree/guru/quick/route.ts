// app/api/montree/guru/quick/route.ts
// Quick-Fire Guru — instant 2-sentence answers to parent questions
// POST with { child_id, question }
// Uses Haiku with tight prompt, 5s timeout, no caching

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, question } = body;

    if (!child_id || !question) {
      return NextResponse.json(
        { success: false, error: 'child_id and question are required' },
        { status: 400 }
      );
    }

    // Validate question length
    if (question.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Question too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Security check
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Fetch child basics
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, age, classroom_id')
      .eq('id', child_id)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    const childName = child.name.split(' ')[0];
    const childAge = child.age || 4;

    const system = `You are the Montree Montessori Guru giving a QUICK answer to a homeschool parent.

RULES:
- Maximum 2 sentences, under 50 words total
- Warm and encouraging tone
- No Montessori jargon — plain language only
- Be specific and actionable
- If the question needs a longer answer, end with "Tap a concern card above for a full guide on this!"
- Reference the child by name (${childName}, age ${childAge})
- Never diagnose or give medical advice`;

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI not configured' }, { status: 503 });
    }

    // 5-second timeout using AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const message = await anthropic.messages.create(
        {
          model: HAIKU_MODEL,
          max_tokens: 150,
          system,
          messages: [{ role: 'user', content: `Parent asks about ${childName} (age ${childAge}): "${question}"` }],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const answer = message.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('\n');

      // Log interaction (fire and forget — don't await)
      supabase
        .from('montree_guru_interactions')
        .insert({
          child_id,
          classroom_id: child.classroom_id,
          question,
          question_type: 'quick_fire',
          response_insight: answer,
          response_root_cause: 'quick_answer',
          response_action_plan: [],
          response_timeline: 'instant',
          sources_used: [],
          model_used: HAIKU_MODEL,
          processing_time_ms: 0,
        })
        .then(() => {});

      return NextResponse.json({
        success: true,
        answer,
        child_name: childName,
      });

    } catch (abortError: unknown) {
      clearTimeout(timeout);
      if (abortError instanceof Error && abortError.name === 'AbortError') {
        return NextResponse.json({
          success: true,
          answer: `Great question! For a detailed answer about ${childName}, try tapping one of the concern cards above — they have personalized guides just for your family.`,
          child_name: childName,
          timed_out: true,
        });
      }
      throw abortError;
    }

  } catch (error) {
    console.error('[Guru Quick Fire] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get quick answer' },
      { status: 500 }
    );
  }
}
