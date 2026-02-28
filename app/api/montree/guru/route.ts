// app/api/montree/guru/route.ts
// Montessori Guru AI - Teacher Assistant API
// Provides child-specific Montessori advice based on deep knowledge

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS, getModelForTier } from '@/lib/ai/anthropic';
import { buildChildContext, ChildContext } from '@/lib/montree/guru/context-builder';
import { retrieveKnowledge, KnowledgeResult } from '@/lib/montree/guru/knowledge-retriever';
import { buildGuruPrompt, parseGuruResponse, ParsedGuruResponse } from '@/lib/montree/guru/prompt-builder';
import { buildConversationalPrompt, buildCelebrationContext, type ProactiveContext } from '@/lib/montree/guru/conversational-prompt';
import { GURU_TOOLS } from '@/lib/montree/guru/tool-definitions';
import { executeTool, ToolResult } from '@/lib/montree/guru/tool-executor';
import { learnFromConversation, getRelevantPatterns } from '@/lib/montree/guru/pattern-learner';
import { getRelevantBrainWisdom, recordLearning } from '@/lib/montree/guru/brain';
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
    let { child_id, question, classroom_id, teacher_id, role, conversational } = body;
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

    // Handle greeting trigger — Portal auto-greeting on app open
    const isGreetingTrigger = question === '__greeting__';
    // Proactive context is computed during greeting and passed through to prompt builders
    let greetingProactiveContext: ProactiveContext | undefined;

    if (isGreetingTrigger) {
      const supabaseForGreeting = getSupabase();

      // Fetch child settings + focus works count + last interaction in parallel
      const [childSettingsResult, focusWorksResult, lastInteractionResult] = await Promise.all([
        supabaseForGreeting.from('montree_children').select('settings').eq('id', child_id).single(),
        supabaseForGreeting.from('montree_child_work_progress').select('id', { count: 'exact', head: true }).eq('child_id', child_id).eq('is_focus', true),
        supabaseForGreeting.from('montree_guru_interactions').select('asked_at').eq('child_id', child_id).order('asked_at', { ascending: false }).limit(1).single(),
      ]);

      const greetingSettings = (childSettingsResult.data?.settings as Record<string, unknown>) || {};
      const focusWorksCount = focusWorksResult.count || 0;
      const shelfEmpty = focusWorksCount === 0;

      // Calculate days since last interaction
      let daysSinceLastInteraction = 0;
      if (lastInteractionResult.data?.asked_at) {
        const lastDate = new Date(lastInteractionResult.data.asked_at as string);
        daysSinceLastInteraction = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday

      // Issue #20: Strict boolean check (don't rely on as-cast + ??)
      const intakeComplete = greetingSettings.guru_intake_complete === true;
      const nextCheckin = greetingSettings.guru_next_checkin as string | null;
      const isCheckinDue = nextCheckin ? new Date(nextCheckin) <= new Date() : false;

      // Build proactive context for prompt builders
      greetingProactiveContext = {
        shelfEmpty,
        daysSinceLastInteraction,
        dayOfWeek,
        // celebrationContext will be computed after childContext is built (needs progress data)
      };

      // Priority: SETUP (empty shelf) > INTAKE > CHECKIN > REFLECTION > NORMAL
      // Note: childContext isn't built yet at this point, so we use generic text.
      // The prompt builder will inject the child's name from childContext later.
      if (shelfEmpty && intakeComplete) {
        question = 'I just opened the app and my shelf is empty. Help me build my child\'s first shelf!';
      } else if (!intakeComplete) {
        question = 'This is our first conversation. Please greet me warmly and introduce yourself, then ask about my child — their name, personality, interests, and what I\'d like to work on.';
      } else if (isCheckinDue) {
        question = 'I just opened the app and it\'s time for our weekly check-in. Please greet me warmly and start the check-in process.';
      } else if (daysSinceLastInteraction >= 5 || dayOfWeek === 0) {
        question = `I just opened the app after ${daysSinceLastInteraction} days. Give me a warm greeting and invite me to reflect on how things have been going.`;
      } else {
        question = 'I just opened the app. Give me a warm, brief greeting and ask how things are going.';
      }
      // Force conversational mode for greetings
      conversational = true;
    }

    if (!isGreetingTrigger && question.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Question is too short. Please provide more detail.' },
        { status: 400 }
      );
    }

    // Parents can send long emotional messages — no limit for conversational mode
    // Teachers still have a reasonable cap
    const maxQuestionLength = conversational ? 20000 : 5000;
    if (question.length > maxQuestionLength) {
      return NextResponse.json(
        { success: false, error: 'Message is too long. Please try breaking it into smaller messages.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // --- Freemium gate for homeschool parents (principals skip this) ---
    // FEATURE FLAG: Set GURU_FREEMIUM_ENABLED=true on Railway to activate paywall.
    // When false (default), all homeschool parents get unlimited Guru for free.
    // Principals always get unlimited access. Teachers always get unlimited access.
    //
    // DAILY LIMITS (not monthly — feels unlimited to normal users, caps power users):
    //   Free trial: 3 messages/day for 7 days from signup, then paywall
    //   Haiku ($5/mo): 10 messages/day  → max 300/mo, cost ~$3.60/mo = healthy margin
    //   Sonnet ($20/mo): 5 messages/day → max 150/mo, cost ~$6.75/mo = great margin
    const freemiumEnabled = process.env.GURU_FREEMIUM_ENABLED === 'true';
    const teacherId = teacher_id || auth.userId;
    let isParentRole = false;
    let shouldIncrementPrompt = false;
    let guruTier: 'haiku' | 'sonnet' = 'sonnet'; // Default to sonnet
    if (isPrincipal) {
      // Principals get unlimited access, skip all freemium checks
    } else if (teacherId) {
      const { data: teacherData } = await supabase
        .from('montree_teachers')
        .select('role, guru_plan, guru_subscription_status, guru_current_period_end, guru_tier, created_at')
        .eq('id', teacherId)
        .single();

      const t = teacherData as Record<string, unknown> | null;
      // Extract guru tier (haiku or sonnet)
      const tierFromDb = t?.guru_tier as string;
      if (tierFromDb === 'haiku' || tierFromDb === 'sonnet') {
        guruTier = tierFromDb;
      }

      if (t?.role === 'homeschool_parent') {
        isParentRole = true;

        if (freemiumEnabled) {
          const plan = t.guru_plan as string || 'free';
          const subStatus = t.guru_subscription_status as string || 'none';
          const periodEnd = t.guru_current_period_end as string | null;

          const isPaid = plan !== 'free' && subStatus === 'active' &&
            (!periodEnd || new Date(periodEnd) > new Date());

          // Check if free trial has expired (7 days from signup)
          if (!isPaid) {
            const createdAt = t.created_at as string | null;
            if (createdAt) {
              const signupDate = new Date(createdAt);
              const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceSignup > 7) {
                return NextResponse.json({
                  success: false,
                  error: 'guru_trial_expired',
                  message: 'Your 7-day free trial has ended. Subscribe to keep chatting with your Guru — plans start at $5/month.',
                }, { status: 403 });
              }
            }
          }

          // Daily limit based on tier
          const dailyLimit = !isPaid ? 3 : guruTier === 'haiku' ? 10 : 5;

          // Count today's messages from interactions table (no counter drift)
          // Issue HC#1: Use UTC midnight for consistent daily boundary regardless of server timezone
          const now = new Date();
          const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          // Issue HC#2: Race condition between count and AI call — accepted risk.
          // Window is ~2-5s (AI response time). Worst case: 1 extra message per day.
          // Cost impact: $0.01-$0.05. Not worth advisory locks for this use case.
          const { count: todayCount, error: countError } = await supabase
            .from('montree_guru_interactions')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', teacherId)
            .gte('asked_at', todayStartUTC.toISOString());

          const messagesUsedToday = countError ? 0 : (todayCount || 0);

          if (messagesUsedToday >= dailyLimit) {
            const tierName = !isPaid ? 'free trial' : guruTier === 'haiku' ? 'Haiku' : 'Sonnet';
            return NextResponse.json({
              success: false,
              error: 'guru_daily_limit_reached',
              messages_used_today: messagesUsedToday,
              daily_limit: dailyLimit,
              message: !isPaid
                ? `You've used your ${dailyLimit} free messages for today. Come back tomorrow, or subscribe for up to 10 messages per day starting at $5/month.`
                : `You've used your ${dailyLimit} ${tierName} messages for today. Come back tomorrow — your limit resets at midnight UTC.`,
            }, { status: 429 });
          }

          // Flag to increment counter AFTER successful AI response (for backward compat)
          shouldIncrementPrompt = true;
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

      // Fetch self-learning intelligence (both brain wisdom + cross-family patterns)
      const childAgeMonths = (childContext.age_years || 0) * 12 + (childContext.age_months || 0);
      const activeAreas = childContext.focus_works?.map(fw => fw.area) || [];
      const parentConf = (childSettings?.guru_parent_current_state as Record<string, unknown>)?.confidence_level as string | undefined;

      // Issue #25: Ensure savedConcerns is always a valid array
      const safeConcerns = Array.isArray(savedConcerns) ? savedConcerns : [];

      // Issue #21: Log errors instead of silently swallowing
      const [brainWisdom, crossFamilyPatterns] = await Promise.all([
        getRelevantBrainWisdom({
          childAgeMonths,
          areas: activeAreas,
          concerns: safeConcerns,
          parentConfidence: parentConf,
        }).catch(err => {
          console.warn('[Guru] Brain wisdom fetch failed:', err instanceof Error ? err.message : String(err));
          return '';
        }),
        getRelevantPatterns({
          age_months: childAgeMonths,
          areas_active: activeAreas,
          recent_concerns: safeConcerns,
        }).catch(err => {
          console.warn('[Guru] Pattern fetch failed:', err instanceof Error ? err.message : String(err));
          return '';
        }),
      ]);

      // Compute celebration context if we have proactive data (greeting trigger)
      let proactiveForPrompt: ProactiveContext | undefined = greetingProactiveContext;
      if (proactiveForPrompt && childContext.past_interactions) {
        const celebrationText = buildCelebrationContext(childContext, childContext.past_interactions as Array<{
          question: string;
          response_insight: string;
          asked_at: string;
          context_snapshot?: Record<string, unknown>;
        }>);
        if (celebrationText) {
          proactiveForPrompt = { ...proactiveForPrompt, celebrationContext: celebrationText };
        }
      }

      const convPrompt = buildConversationalPrompt(question, childContext, knowledge, savedConcerns, isFirstMessage, childSettings, guruTier, proactiveForPrompt);
      systemPrompt = convPrompt.systemPrompt;
      // Inject self-learning intelligence into system prompt
      if (brainWisdom) {
        systemPrompt += '\n\n' + brainWisdom;
      }
      if (crossFamilyPatterns) {
        systemPrompt += '\n\n' + crossFamilyPatterns;
      }
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

      // Select model and token limit based on guru tier
      // Issue #33: getModelForTier already has a default case, but guard at call site too
      const guruModel = getModelForTier(guruTier) || AI_MODEL;
      // Conversational mode needs higher token limits for tool-use + emotional responses
      const guruMaxTokens = guruTier === 'sonnet' ? 4096 : 3072;

      // First Claude call — may return tool_use blocks
      let response = await withTimeout(
        anthropic.messages.create({
          model: guruModel,
          max_tokens: guruMaxTokens,
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
            model: guruModel,
            max_tokens: guruMaxTokens,
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

      // Log cost estimate (Haiku: $0.80/$4.00 per 1M, Sonnet: $3/$15 per 1M)
      const { input_tokens = 0, output_tokens = 0 } = response.usage || {};
      const costMultiplier = guruTier === 'haiku' ? { input: 0.80, output: 4.00 } : { input: 3, output: 15 };
      const estCost = (input_tokens * costMultiplier.input + output_tokens * costMultiplier.output) / 1_000_000;
      console.log(`[Guru] Model: ${guruTier}, rounds: ${rounds}, tokens: ${input_tokens}+${output_tokens}, est: $${estCost.toFixed(4)}`);

      const processingTime = Date.now() - startTime;

      // Save interaction
      // Issue DA#1: Use resolved teacherId (not raw body teacher_id) so daily count query matches
      const { data: saved, error: saveError } = await supabase
        .from('montree_guru_interactions')
        .insert({
          child_id,
          teacher_id: teacherId || null,
          classroom_id: classroom_id || childContext.classroom_id,
          question,
          question_type: 'chat',
          context_snapshot: {
            child_name: childContext.name,
            age: `${childContext.age_years}y ${childContext.age_months}m`,
            mastered_count: childContext.mastered_count || 0,
            conversational: true,
            tool_rounds: rounds,
            actions_taken: actionsTaken.length,
            guru_tier: guruTier,
            est_cost: estCost,
          },
          response_insight: responseText,
          sources_used: knowledge.sources_used,
          processing_time_ms: processingTime,
          model_used: guruModel,
        })
        .select('id')
        .single();

      if (saveError) {
        console.error('[Guru] Failed to save chat interaction:', saveError);
      }

      // Self-learning: feed this conversation into both pattern database AND brain
      // Fire-and-forget — never blocks the response
      if (actionsTaken.length > 0) {
        learnFromConversation(child_id, childAgeMonths).catch(err =>
          console.error('[Guru] Pattern learning error:', err instanceof Error ? err.message : String(err))
        );
      }

      // Record learning for the brain (every conversation, not just tool-use ones)
      // Only record if save succeeded — need a valid conversation_id
      if (!saveError) {
        recordLearning({
          conversation_id: saved?.id as string | undefined,
          child_age_months: childAgeMonths,
          areas: activeAreas,
          learning_type: actionsTaken.length > 0 ? 'insight' : 'technique',
          description: `Q: ${question.slice(0, 150)}... → A: ${responseText.slice(0, 200)}...`,
          context: `Child ${childContext.name || 'unknown'}, ${childAgeMonths}mo. ${actionsTaken.length} actions taken: ${actionsTaken.map(a => a.tool).join(', ')}`,
          tags: [
            ...activeAreas.map(a => a.replace('practical_life', 'practical')),
            `age_${Math.round(childAgeMonths / 12)}`,
            ...safeConcerns.map(c => typeof c === 'string' ? c.replace(/[^a-z]/gi, '_').toLowerCase() : ''),
          ].filter(Boolean),
        }).catch(err =>
          console.error('[Guru] Brain learning error:', err instanceof Error ? err.message : String(err))
        );
      }

      // Issue DA#4: Removed increment_guru_prompts RPC — daily rate limiter counts from
      // montree_guru_interactions table directly, so guru_prompts_used column is dead overhead.

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
        teacher_id: teacherId || null, // Issue DA#1: Use resolved teacherId so daily count query matches
        classroom_id: classroom_id || childContext.classroom_id,
        question,
        question_type: detectQuestionType(question),
        context_snapshot: {
          child_name: childContext.name,
          age: `${childContext.age_years}y ${childContext.age_months}m`,
          mastered_count: childContext.mastered_count || 0,
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

    // Self-learning: feed teacher conversations into the brain too
    if (!saveError) {
      const childAgeMonths = (childContext.age_years || 0) * 12 + (childContext.age_months || 0);
      const activeAreas = childContext.focus_works?.map(fw => fw.area) || [];
      recordLearning({
        conversation_id: saved?.id as string | undefined,
        child_age_months: childAgeMonths,
        areas: activeAreas,
        learning_type: 'insight',
        description: `Q: ${question.slice(0, 150)}... → A: ${(parsed.insight || '').slice(0, 200)}...`,
        context: `Teacher mode. Child ${childContext.name || 'unknown'}, ${childAgeMonths}mo. Type: ${detectQuestionType(question)}`,
        tags: [
          ...activeAreas.map(a => a.replace('practical_life', 'practical')),
          `age_${Math.round(childAgeMonths / 12)}`,
          'teacher_mode',
        ].filter(Boolean),
      }).catch(err =>
        console.error('[Guru] Brain learning error (structured):', err instanceof Error ? err.message : String(err))
      );
    }

    // 7. Issue DA#4: Removed increment_guru_prompts RPC — daily rate limiter counts from
    // montree_guru_interactions table directly, so guru_prompts_used column is dead overhead.

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
