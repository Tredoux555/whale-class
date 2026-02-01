// app/api/montree/guru/stream/route.ts
// Streaming version of Montessori Guru API

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { buildChildContext } from '@/lib/montree/guru/context-builder';
import { retrieveKnowledge } from '@/lib/montree/guru/knowledge-retriever';
import { buildGuruPrompt } from '@/lib/montree/guru/prompt-builder';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Check AI is enabled
  if (!AI_ENABLED || !anthropic) {
    return new Response(
      JSON.stringify({ error: 'AI features are not enabled' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TypeScript now knows anthropic is non-null after the guard above
  const ai = anthropic;

  try {
    const body = await request.json();
    const { child_id, question, classroom_id } = body;

    if (!child_id || !question) {
      return new Response(
        JSON.stringify({ error: 'child_id and question are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabase();

    // Build context
    const childContext = await buildChildContext(supabase, child_id);
    if (!childContext) {
      return new Response(
        JSON.stringify({ error: 'Child not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve knowledge
    const knowledge = await retrieveKnowledge(question, 4);

    // Build prompt
    const { systemPrompt, userPrompt } = buildGuruPrompt(question, childContext, knowledge);

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create streaming message
          const messageStream = ai.messages.stream({
            model: AI_MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });

          // Handle streaming events
          messageStream.on('text', (text) => {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`));
          });

          messageStream.on('error', (error) => {
            console.error('[Guru Stream] Error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`));
            controller.close();
          });

          // Wait for completion
          await messageStream.finalMessage();

          // Save to database
          const processingTime = Date.now() - startTime;

          await supabase.from('montree_guru_interactions').insert({
            child_id,
            classroom_id: classroom_id || childContext.classroom_id,
            question,
            question_type: detectQuestionType(question),
            context_snapshot: {
              child_name: childContext.name,
              age: `${childContext.age_years}y ${childContext.age_months}m`,
              has_mental_profile: !!childContext.mental_profile,
              topics_used: knowledge.topics_used,
            },
            response_insight: fullResponse.slice(0, 5000),
            sources_used: knowledge.sources_used,
            processing_time_ms: processingTime,
            model_used: AI_MODEL,
          });

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            sources_used: knowledge.sources_used,
            processing_time_ms: processingTime
          })}\n\n`));

          controller.close();

        } catch (error) {
          console.error('[Guru Stream] Fatal error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Guru Stream] Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function detectQuestionType(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('focus') || q.includes('concentrate') || q.includes('attention')) return 'focus';
  if (q.includes('behav') || q.includes('hitting') || q.includes('biting')) return 'behavior';
  if (q.includes('friend') || q.includes('social') || q.includes('sharing')) return 'social';
  if (q.includes('parent') || q.includes('home') || q.includes('family')) return 'family';
  if (q.includes('read') || q.includes('write') || q.includes('math')) return 'academic';
  if (q.includes('emotion') || q.includes('cry') || q.includes('angry')) return 'emotional';
  return 'general';
}
