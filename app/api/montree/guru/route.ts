// app/api/montree/guru/route.ts
// Montessori Guru AI - Teacher Assistant API
// Provides child-specific Montessori advice based on deep knowledge

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';
import { buildChildContext, ChildContext } from '@/lib/montree/guru/context-builder';
import { retrieveKnowledge, KnowledgeResult } from '@/lib/montree/guru/knowledge-retriever';
import { buildGuruPrompt, parseGuruResponse, ParsedGuruResponse } from '@/lib/montree/guru/prompt-builder';

// Get supabase at runtime
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface GuruRequest {
  child_id: string;
  question: string;
  classroom_id?: string;
  teacher_id?: string;
}

export interface GuruResponse {
  success: boolean;
  insight?: string;
  root_cause?: string;
  action_plan?: Array<{
    priority: number;
    action: string;
    details: string;
  }>;
  timeline?: string;
  parent_talking_point?: string;
  sources_used?: string[];
  interaction_id?: string;
  error?: string;
}

// ============================================
// POST: Ask the Guru a question
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check AI is enabled
    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json(
        { success: false, error: 'AI features are not enabled. Check ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    // Parse request
    const body: GuruRequest = await request.json();
    const { child_id, question, classroom_id, teacher_id } = body;

    if (!child_id || !question) {
      return NextResponse.json(
        { success: false, error: 'child_id and question are required' },
        { status: 400 }
      );
    }

    if (question.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Question is too short. Please provide more detail.' },
        { status: 400 }
      );
    }

    if (question.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Question is too long. Please be more concise.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Build child context
    console.log('[Guru] Building child context for:', child_id);
    const childContext = await buildChildContext(supabase, child_id);

    if (!childContext) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // 2. Retrieve relevant knowledge
    console.log('[Guru] Retrieving knowledge for question:', question.slice(0, 50));
    const knowledge = await retrieveKnowledge(question, 4);

    // 3. Build prompt
    console.log('[Guru] Building prompt...');
    const { systemPrompt, userPrompt } = buildGuruPrompt(question, childContext, knowledge);

    // 4. Call Claude API
    console.log('[Guru] Calling Claude API...');
    
    // Ensure anthropic is not null (already checked above, but TypeScript needs this)
    if (!anthropic) {
      return NextResponse.json(
        { success: false, error: 'AI service not available' },
        { status: 503 }
      );
    }
    
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    // Extract response text
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // 5. Parse response
    const parsed = parseGuruResponse(responseText);

    // 6. Save to database
    const processingTime = Date.now() - startTime;
    console.log('[Guru] Saving interaction, processing time:', processingTime, 'ms');

    const { data: saved, error: saveError } = await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id,
        teacher_id: teacher_id || null,
        classroom_id: classroom_id || childContext.classroom_id,
        question,
        question_type: detectQuestionType(question),
        context_snapshot: {
          child_name: childContext.name,
          age: `${childContext.age_years}y ${childContext.age_months}m`,
          has_mental_profile: !!childContext.mental_profile,
          observations_count: childContext.recent_observations.length,
          notes_count: childContext.teacher_notes.length,
          topics_used: knowledge.topics_used,
        },
        response_insight: parsed.insight,
        response_root_cause: parsed.root_cause,
        response_action_plan: parsed.action_plan,
        response_timeline: parsed.timeline,
        response_parent_talking_point: parsed.parent_talking_point,
        sources_used: knowledge.sources_used,
        processing_time_ms: processingTime,
        model_used: AI_MODEL,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[Guru] Failed to save interaction:', saveError);
      // Don't fail the request, just log it
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      insight: parsed.insight,
      root_cause: parsed.root_cause,
      action_plan: parsed.action_plan,
      timeline: parsed.timeline,
      parent_talking_point: parsed.parent_talking_point,
      sources_used: knowledge.sources_used,
      interaction_id: saved?.id,
    });

  } catch (error) {
    console.error('[Guru] Error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { success: false, error: 'AI service configuration error.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get response. Please try again.' },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get conversation history for a child
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: history, error } = await supabase
      .from('montree_guru_interactions')
      .select('id, asked_at, question, response_insight, response_action_plan, outcome')
      .eq('child_id', childId)
      .order('asked_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Guru] Failed to fetch history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      history: history || [],
    });

  } catch (error) {
    console.error('[Guru] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to detect question type
function detectQuestionType(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('focus') || q.includes('concentrate') || q.includes('attention') || q.includes('distract')) {
    return 'focus';
  }
  if (q.includes('behav') || q.includes('discipline') || q.includes('hitting') || q.includes('biting')) {
    return 'behavior';
  }
  if (q.includes('friend') || q.includes('social') || q.includes('sharing') || q.includes('play')) {
    return 'social';
  }
  if (q.includes('parent') || q.includes('home') || q.includes('family') || q.includes('sibling')) {
    return 'family';
  }
  if (q.includes('read') || q.includes('write') || q.includes('math') || q.includes('letter') || q.includes('number')) {
    return 'academic';
  }
  if (q.includes('emotion') || q.includes('cry') || q.includes('angry') || q.includes('upset') || q.includes('anxious')) {
    return 'emotional';
  }

  return 'general';
}
