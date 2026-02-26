// app/api/montree/guru/route.ts
// Montessori Guru AI - Teacher Assistant API
// Provides child-specific Montessori advice based on deep knowledge

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS } from '@/lib/ai/anthropic';
import { buildChildContext, ChildContext } from '@/lib/montree/guru/context-builder';
import { retrieveKnowledge, KnowledgeResult } from '@/lib/montree/guru/knowledge-retriever';
import { buildGuruPrompt, parseGuruResponse, ParsedGuruResponse } from '@/lib/montree/guru/prompt-builder';
import { buildConversationalPrompt } from '@/lib/montree/guru/conversational-prompt';
import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { executeTool, ToolResult } from '@/lib/montree/guru/tool-executor';
import type { MessageParam, ToolResultBlockParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';

const MAX_TOOL_ROUNDS = 3;
const API_TIMEOUT_MS = 25_000; // 25s timeout per API call (under Vercel/Railway 30s limit)

// Helper: race API call against timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export interface GuruRequest {
  child_id: string;
  question: string;
  classroom_id?: string;
  teacher_id?: string;
  role?: string; // 'principal' skips freemium checks and uses principal prompt
  conversational?: boolean; // true = WhatsApp-style chat for homeschool parents
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
  conversational?: boolean;
  error?: string;
}

// ============================================
// POST: Ask the Guru a question
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Check AI is enabled
    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json(
        { success: false, error: 'AI features are not enabled. Check ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    // Parse request
    const body: GuruRequest = await request.json();
    const { child_id, question, classroom_id, teacher_id, role, conversational } = body;
    const isPrincipal = role === 'principal';

    if (!child_id || !question) {
      return NextResponse.json(
        { success: false, error: 'child_id and question are required' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (question.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Question is too short. Please provide more detail.' },
        { status: 400 }
      );
    }

    // Phase 6: Widened from 1000 to 2000 to support detailed questions
    if (question.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Question is too long. Please be more concise.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // --- Freemium gate for homeschool parents (principals skip this) ---
    // FEATURE FLAG: Set GURU_FREEMIUM_ENABLED=true on Railway to activate paywall.
    // When false (default), all homeschool parents get unlimited Guru for free.
    // Principals always get unlimited access.
    const freemiumEnabled = process.env.GURU_FREEMIUM_ENABLED === 'true';
    const teacherId = teacher_id || auth.userId;
    let isParentRole = false;
    let shouldIncrementPrompt = false;
    if (isPrincipal) {
      // Principals get unlimited access, skip all freemium checks
    } else if (teacherId) {
      const { data: teacherData } = await supabase
        .from('montree_teachers')
        .select('role, guru_plan, guru_prompts_used, guru_subscription_status, guru_current_period_end')
        .eq('id', teacherId)
        .single();

      const t = teacherData as Record<string, unknown> | null;
      if (t?.role === 'homeschool_parent') {
        isParentRole = true;

        if (freemiumEnabled) {
          const plan = t.guru_plan as string || 'free';
          const promptsUsed = t.guru_prompts_used as number || 0;
          const subStatus = t.guru_subscription_status as string || 'none';
          const periodEnd = t.guru_current_period_end as string | null;

          const isPaid = plan !== 'free' && subStatus === 'active' &&
            (!periodEnd || new Date(periodEnd) > new Date());

          if (!isPaid && promptsUsed >= 3) {
            return NextResponse.json({
              success: false,
              error: 'guru_limit_reached',
              prompts_used: promptsUsed,
              prompts_limit: 3,
              message: 'You\'ve used your 3 free Guru sessions. Upgrade to Guru for unlimited advice.',
            }, { status: 403 });
          }

          // Flag to increment counter AFTER successful AI response
          if (!isPaid) {
            shouldIncrementPrompt = true;
          }
        }
        // When freemiumEnabled=false, skip gate entirely — unlimited access
      }
    }

    // 1. Build child context
    const childContext = await buildChildContext(supabase, child_id);

    if (!childContext) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // 2. Retrieve relevant knowledge
    const knowledge = await retrieveKnowledge(question, 4);

    // 3. Build prompt — conversational mode for parent chat, structured for teachers
    let systemPrompt: string;
    let userPrompt: string;
    const isConversational = conversational && isParentRole;

    if (isConversational) {
      // Fetch saved concerns + settings for conversational context
      const { data: childSettingsRecord } = await supabase
        .from('montree_children')
        .select('settings')
        .eq('id', child_id)
        .single();
      const childSettings = (childSettingsRecord?.settings as Record<string, unknown>) || {};
      const savedConcerns = (childSettings.guru_concerns as string[]) || [];

      // Check if this is the first message (no conversation history)
      const isFirstMessage = !childContext.past_interactions || childContext.past_interactions.length === 0;

      const convPrompt = buildConversationalPrompt(question, childContext, knowledge, savedConcerns, isFirstMessage, childSettings);
      systemPrompt = convPrompt.systemPrompt;
      userPrompt = convPrompt.userPrompt;
    } else {
      const structured = buildGuruPrompt(question, childContext, knowledge, {
        isHomeschoolParent: isParentRole,
        isPrincipal,
      });
      systemPrompt = structured.systemPrompt;
      userPrompt = structured.userPrompt;
    }

    // 4. Call Claude API with conversation memory
    // Ensure anthropic is not null (already checked above, but TypeScript needs this)
    if (!anthropic) {
      return NextResponse.json(
        { success: false, error: 'AI service not available' },
        { status: 503 }
      );
    }

    // Phase 1: Build multi-turn messages from past interactions for conversation memory
    // The Guru remembers the last 5 conversations about this child
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (childContext.past_interactions && childContext.past_interactions.length > 0) {
      // Oldest first so conversation flows naturally
      const chronological = [...childContext.past_interactions].reverse();
      for (const interaction of chronological) {
        if (interaction.question && interaction.response_insight) {
          conversationMessages.push({ role: 'user', content: interaction.question });
          conversationMessages.push({ role: 'assistant', content: interaction.response_insight });
        }
      }
    }

    // Current question always goes last (only for non-conversational; conversational builds its own)
    if (!isConversational) {
      conversationMessages.push({ role: 'user', content: userPrompt });
    }

    if (isConversational) {
      // =============================================
      // CONVERSATIONAL MODE — with tool-use support
      // =============================================
      let currentMessages: MessageParam[] = [
        ...conversationMessages.map(m => ({ ...m })),
        { role: 'user' as const, content: userPrompt },
      ];

      // First Claude call — may return tool_use blocks
      let response = await withTimeout(
        anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          tools: GURU_TOOLS,
          tool_choice: { type: "auto" },
          messages: currentMessages,
        }),
        API_TIMEOUT_MS,
        'Guru initial call'
      );

      const actionsTaken: Array<{ tool: string } & ToolResult> = [];
      let rounds = 0;

      // Multi-turn tool loop
      while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        const toolUseBlocks = response.content.filter(
          (b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use'
        );

        const toolResults: ToolResultBlockParam[] = [];
        // Execute tools sequentially to avoid settings JSONB race conditions
        for (const toolCall of toolUseBlocks) {
          try {
            const result = await executeTool(
              toolCall.name,
              toolCall.input as Record<string, unknown>,
              child_id
            );
            actionsTaken.push({ tool: toolCall.name, ...result });
            toolResults.push({
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            console.error(`[Guru Tool] ${toolCall.name} failed:`, err);
            toolResults.push({
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              is_error: true,
              content: JSON.stringify({
                success: false,
                message: `Tool failed: ${err instanceof Error ? err.message : 'Unknown error'}`
              }),
            });
          }
        }

        // Accumulate messages for next round (includes all previous turns)
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content as unknown as ContentBlockParam[] },
          { role: 'user' as const, content: toolResults },
        ];

        response = await withTimeout(
          anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            tools: GURU_TOOLS,
            tool_choice: { type: "auto" },
            messages: currentMessages,
          }),
          API_TIMEOUT_MS,
          `Guru tool round ${rounds}`
        );
      }

      // Guard: if loop exited due to MAX_TOOL_ROUNDS, log it
      if (rounds >= MAX_TOOL_ROUNDS && response.stop_reason === 'tool_use') {
        console.warn(`[Guru] Max tool rounds (${MAX_TOOL_ROUNDS}) reached. Some actions may be incomplete.`);
      }

      // Extract final text (with fallback for empty responses after tool loop)
      let responseText = response.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      if (!responseText.trim() && actionsTaken.length > 0) {
        // Claude used tools but didn't produce a text response — generate a summary
        const successes = actionsTaken.filter(a => a.success);
        responseText = successes.length > 0
          ? `I've made ${successes.length} update${successes.length > 1 ? 's' : ''}: ${successes.map(a => a.message).join(', ')}.`
          : "I tried to make some changes but ran into issues. Could you try again?";
      }

      // Log cost estimate
      const { input_tokens, output_tokens } = response.usage;
      const estCost = (input_tokens * 3 + output_tokens * 15) / 1_000_000;
      console.log(`[Guru] Tool rounds: ${rounds}, tokens: ${input_tokens}+${output_tokens}, est: $${estCost.toFixed(4)}`);

      const processingTime = Date.now() - startTime;

      // Save interaction
      const { data: saved, error: saveError } = await supabase
        .from('montree_guru_interactions')
        .insert({
          child_id,
          teacher_id: teacher_id || null,
          classroom_id: classroom_id || childContext.classroom_id,
          question,
          question_type: 'chat',
          context_snapshot: {
            child_name: childContext.name,
            age: `${childContext.age_years}y ${childContext.age_months}m`,
            conversational: true,
            tool_rounds: rounds,
            actions_taken: actionsTaken.length,
          },
          response_insight: responseText,
          sources_used: knowledge.sources_used,
          processing_time_ms: processingTime,
          model_used: AI_MODEL,
        })
        .select('id')
        .single();

      if (saveError) {
        console.error('[Guru] Failed to save chat interaction:', saveError);
      }

      // Increment free trial if needed
      if (shouldIncrementPrompt && teacherId) {
        const { data: fresh } = await supabase
          .from('montree_teachers')
          .select('guru_prompts_used')
          .eq('id', teacherId)
          .single();
        const currentCount = (fresh as Record<string, unknown> | null)?.guru_prompts_used as number || 0;
        await (supabase.from('montree_teachers') as ReturnType<typeof supabase.from>)
          .update({ guru_prompts_used: currentCount + 1 })
          .eq('id', teacherId);
      }

      return NextResponse.json({
        success: true,
        insight: responseText,
        actions: actionsTaken.length > 0 ? actionsTaken : undefined,
        interaction_id: saved?.id,
        conversational: true,
      });
    }

    // =============================================
    // STRUCTURED MODE (teachers) — no tool-use
    // =============================================
    // userPrompt already pushed to conversationMessages above (line 227)

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: conversationMessages,
    });

    // Extract response text
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // 5. Parse response
    const processingTime = Date.now() - startTime;

    const parsed = parseGuruResponse(responseText);

    // 6. Save to database
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
    }

    // 7. Increment free-trial counter AFTER successful AI response
    // (Not before — if AI call fails, user shouldn't lose a free prompt)
    if (shouldIncrementPrompt && teacherId) {
      // Re-read current count to avoid race conditions, then increment
      const { data: fresh } = await supabase
        .from('montree_teachers')
        .select('guru_prompts_used')
        .eq('id', teacherId)
        .single();
      const currentCount = (fresh as Record<string, unknown> | null)?.guru_prompts_used as number || 0;
      await (supabase.from('montree_teachers') as ReturnType<typeof supabase.from>)
        .update({ guru_prompts_used: currentCount + 1 })
        .eq('id', teacherId);
    }

    // 8. Return response
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
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { data: history, error } = await supabase
      .from('montree_guru_interactions')
      .select('id, asked_at, question, question_type, response_insight, response_action_plan, outcome')
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
