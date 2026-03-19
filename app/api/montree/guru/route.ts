// app/api/montree/guru/route.ts
// Montessori Guru AI - Teacher Assistant API
// Provides child-specific Montessori advice based on deep knowledge

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL, MAX_TOKENS, getModelForTier } from '@/lib/ai/anthropic';
import { buildChildContext, ChildContext } from '@/lib/montree/guru/context-builder';
import { buildClassroomContext, formatClassroomContextForPrompt, type ClassroomContext } from '@/lib/montree/guru/classroom-context-builder';
import { retrieveKnowledge, KnowledgeResult } from '@/lib/montree/guru/knowledge-retriever';
import { buildGuruPrompt, parseGuruResponse, ParsedGuruResponse } from '@/lib/montree/guru/prompt-builder';
import { buildConversationalPrompt, buildClassroomModePrompt, buildCelebrationContext, TOOL_ENABLED_MODES, type ProactiveContext, type GuruMode } from '@/lib/montree/guru/conversational-prompt';
import { GURU_TOOLS, getToolsForMode } from '@/lib/montree/guru/tool-definitions';
import { executeTool, ToolResult } from '@/lib/montree/guru/tool-executor';
import { learnFromConversation, getRelevantPatterns } from '@/lib/montree/guru/pattern-learner';
import { classifyQuestion, type QuestionCategory } from '@/lib/montree/guru/question-classifier';
import { getRelevantBrainWisdom, recordLearning } from '@/lib/montree/guru/brain';
import { processTeacherConversation } from '@/lib/montree/guru/post-conversation-processor';
import type { MessageParam, ToolResultBlockParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';

const MAX_TOOL_ROUNDS = 3; // 3 rounds sufficient with SPEED RULE in prompt (batch tool calls)
const API_TIMEOUT_MS = 45_000; // 45s per API call (was 30s — too aggressive for complex tool-use questions)
const TOTAL_REQUEST_TIMEOUT_MS = 55_000; // 55s hard wall — must be under Railway's 60s proxy timeout to avoid 504

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
  image_url?: string; // optional image for vision analysis
  stream?: boolean; // true = SSE streaming response (token by token)
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

// Helper: resolve student name to child_id in whole-class mode
function resolveStudentName(
  studentName: string,
  classroomContext: ClassroomContext
): { childId: string } | { error: string } {
  const lower = studentName.toLowerCase().trim();
  // Exact match first
  const exact = classroomContext.children.find(c => c.name.toLowerCase() === lower);
  if (exact) return { childId: exact.id };
  // Prefix match (e.g. "Joey" matches "Joey L." but not "Maria" matching "Mariana")
  const prefixMatches = classroomContext.children.filter(c =>
    c.name.toLowerCase().startsWith(lower) || lower.startsWith(c.name.toLowerCase())
  );
  if (prefixMatches.length === 1) return { childId: prefixMatches[0].id };
  if (prefixMatches.length > 1) {
    const names = prefixMatches.map(c => c.name).join(', ');
    return { error: `Multiple matches for "${studentName}": ${names}. Please be more specific.` };
  }
  return { error: `Student "${studentName}" not found in this classroom. Available: ${classroomContext.children.map(c => c.name).join(', ')}` };
}

// ============================================
// POST: Ask the Guru a question
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let masterTimeout: ReturnType<typeof setTimeout> | null = null;

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
    let { child_id, question, classroom_id, teacher_id, role, conversational, image_url, stream: streamRequested } = body;
    const isPrincipal = role === 'principal';

    if (!child_id || !question) {
      return NextResponse.json(
        { success: false, error: 'child_id and question are required' },
        { status: 400 }
      );
    }

    // Validate image_url if provided (must be HTTPS URL from trusted storage)
    if (image_url) {
      try {
        const parsedUrl = new URL(image_url);
        if (parsedUrl.protocol !== 'https:') {
          image_url = undefined; // Silently drop non-HTTPS URLs
        }
      } catch {
        image_url = undefined; // Silently drop malformed URLs
      }
    }

    // Whole-class mode: skip child access check, validate classroom instead
    const isWholeClassMode = child_id === 'whole_class';
    if (!isWholeClassMode) {
      const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Ensure classroom_id is provided for whole-class mode
      const effectiveClassroomId = classroom_id || auth.classroomId;
      if (!effectiveClassroomId) {
        return NextResponse.json({ success: false, error: 'classroom_id is required for whole-class mode' }, { status: 400 });
      }
      // Verify the classroom belongs to this teacher's school
      const { data: classroomCheck } = await getSupabase()
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', effectiveClassroomId)
        .single();
      if (!classroomCheck || classroomCheck.school_id !== auth.schoolId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
      classroom_id = effectiveClassroomId;
    }

    // Handle greeting trigger — Portal auto-greeting on app open
    const isGreetingTrigger = question === '__greeting__';
    // Proactive context is computed during greeting and passed through to prompt builders
    let greetingProactiveContext: ProactiveContext | undefined;

    if (isGreetingTrigger && !isWholeClassMode) {
      const supabaseForGreeting = getSupabase();

      // Fetch child settings + focus works count + last interaction in parallel
      const [childSettingsResult, focusWorksResult, lastInteractionResult] = await Promise.all([
        supabaseForGreeting.from('montree_children').select('settings').eq('id', child_id).single(),
        supabaseForGreeting.from('montree_child_focus_works').select('id', { count: 'exact', head: true }).eq('child_id', child_id),
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
    // Use auth.role from JWT as the primary source of truth for role detection
    // This is more reliable than the DB lookup which can silently fail
    let isParentRole = auth.role === 'homeschool_parent';
    let shouldIncrementPrompt = false;
    let guruTier: 'haiku' | 'sonnet' = 'sonnet'; // Default to sonnet
    if (isPrincipal) {
      // Principals get unlimited access, skip all freemium checks
    } else if (teacherId) {
      // PERF: Fire teacher data + today's message count in parallel
      // The count query doesn't depend on teacher data — both need only teacherId
      const now = new Date();
      const todayStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const [{ data: teacherData }, { count: todayCount, error: countError }] = await Promise.all([
        supabase
          .from('montree_teachers')
          .select('role, guru_plan, guru_subscription_status, guru_current_period_end, guru_tier, created_at')
          .eq('id', teacherId)
          .maybeSingle(),
        supabase
          .from('montree_guru_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', teacherId)
          .not('question', 'like', 'photo:%')
          .gte('asked_at', todayStartUTC.toISOString()),
      ]);

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

          // Count already fetched in parallel above
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

    // 1. Build child context (or classroom context for whole-class mode)
    let childContext: ChildContext | null = null;
    let classroomContext: ClassroomContext | null = null;
    let knowledge: KnowledgeResult;
    let childSettingsRecord: { settings: unknown } | null = null;

    // Classify question for selective knowledge injection + observability
    const questionCategory: QuestionCategory = classifyQuestion(question);

    if (isWholeClassMode) {
      console.log('[Guru] Whole-class mode — classroom_id:', classroom_id, 'auth.classroomId:', auth.classroomId);
      // Parallelize: classroom context + knowledge retrieval are independent
      const [classCtx, knowledgeResult] = await Promise.all([
        buildClassroomContext(supabase, classroom_id!),
        retrieveKnowledge(question, 4),
      ]);
      classroomContext = classCtx;
      knowledge = knowledgeResult;
      console.log('[Guru] Classroom context result:', classroomContext?.child_count, 'children, name:', classroomContext?.classroom_name, 'error:', classroomContext?.error);

      // Check for query errors first (different from empty classroom)
      if (classroomContext?.error) {
        console.error('[Guru] Classroom context query error:', classroomContext.error, '— classroom_id:', classroom_id);
        // Fallback: try auth.classroomId if different from body classroom_id
        if (auth.classroomId && auth.classroomId !== classroom_id) {
          console.log('[Guru] Trying fallback auth.classroomId:', auth.classroomId);
          classroomContext = await buildClassroomContext(supabase, auth.classroomId);
          console.log('[Guru] Fallback result:', classroomContext?.child_count, 'children, error:', classroomContext?.error);
        }
      }

      // Check for empty classroom (no error, just no children)
      if (!classroomContext || classroomContext.child_count === 0) {
        console.error('[Guru] No students found — classroom_id:', classroom_id, 'auth.classroomId:', auth.classroomId, 'error:', classroomContext?.error);
        // Fallback: try auth.classroomId if different and not already tried
        if (auth.classroomId && auth.classroomId !== classroom_id && !classroomContext?.error) {
          classroomContext = await buildClassroomContext(supabase, auth.classroomId);
          console.log('[Guru] Fallback classroom context:', classroomContext?.child_count, 'children');
        }
        if (!classroomContext || classroomContext.child_count === 0) {
          // Never expose raw DB errors to client — return friendly message
          const httpStatus = classroomContext?.error ? 500 : 404;
          const userMessage = classroomContext?.error
            ? 'Something went wrong loading your classroom data. Please try again.'
            : 'No students found in this classroom. Please add students and try again.';
          return NextResponse.json(
            { success: false, error: userMessage },
            { status: httpStatus }
          );
        }
        // Fallback succeeded — update classroom_id
        classroom_id = auth.classroomId;
      }
    } else {
      // Parallelize: childContext, knowledge, and childSettings are all independent DB/IO operations.
      // Saves ~200-400ms by running in parallel instead of sequential.
      const [childCtxResult, knowledgeResult, childSettingsResult] = await Promise.all([
        buildChildContext(supabase, child_id),
        retrieveKnowledge(question, 4),
        supabase.from('montree_children').select('settings').eq('id', child_id).maybeSingle(),
      ]);
      childContext = childCtxResult;
      knowledge = knowledgeResult;
      childSettingsRecord = childSettingsResult.data;
      if (!childContext) {
        return NextResponse.json(
          { success: false, error: 'Child not found' },
          { status: 404 }
        );
      }
    }

    // 3. Build prompt — conversational mode for both teachers and parents
    let systemPrompt: string;
    let userPrompt: string;
    let guruMode: GuruMode = 'NORMAL'; // Set by conversational prompt builder; unused in structured mode
    const isConversational = conversational === true;
    const isTeacher = !isParentRole;

    if (isWholeClassMode) {
      // Whole-class mode: build classroom-specific prompt
      const classroomPrompt = buildClassroomModePrompt(question, classroomContext!, knowledge);
      guruMode = 'NORMAL';
      systemPrompt = classroomPrompt.systemPrompt;
      userPrompt = classroomPrompt.userPrompt;
    } else if (isConversational) {
      // childSettingsRecord was pre-fetched in parallel above
      const childSettings = (childSettingsRecord?.settings as Record<string, unknown>) || {};
      const savedConcerns = (childSettings.guru_concerns as string[]) || [];

      // Check if this is the first message (no conversation history)
      const isFirstMessage = !childContext!.past_interactions || childContext!.past_interactions.length === 0;

      // Fetch self-learning intelligence (both brain wisdom + cross-family patterns)
      const childAgeMonths = (childContext!.age_years || 0) * 12 + (childContext!.age_months || 0);
      const activeAreas = childContext!.focus_works?.map(fw => fw.area) || [];
      const parentConf = (childSettings?.guru_parent_current_state as Record<string, unknown>)?.confidence_level as string | undefined;

      // Issue #25: Ensure savedConcerns is always a valid array
      const safeConcerns = Array.isArray(savedConcerns) ? savedConcerns : [];

      // Issue #21: Log errors instead of silently swallowing
      // Skip brain wisdom + patterns for curriculum questions (shelf updates, work recommendations)
      // — they add 1-3s latency and are irrelevant for tool-driven actions
      const skipBrainWisdom = questionCategory === 'curriculum';
      const [brainWisdom, crossFamilyPatterns] = skipBrainWisdom
        ? ['', '']
        : await Promise.all([
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
      if (proactiveForPrompt && childContext!.past_interactions) {
        const celebrationText = buildCelebrationContext(childContext!, childContext!.past_interactions as Array<{
          question: string;
          response_insight: string;
          asked_at: string;
          context_snapshot?: Record<string, unknown>;
        }>);
        if (celebrationText) {
          proactiveForPrompt = { ...proactiveForPrompt, celebrationContext: celebrationText };
        }
      }

      const convPrompt = buildConversationalPrompt(question, childContext!, knowledge, savedConcerns, isFirstMessage, childSettings, guruTier, proactiveForPrompt, isTeacher, childContext!.schoolGuruPersonality);
      guruMode = convPrompt.mode;
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
      const structured = buildGuruPrompt(question, childContext!, knowledge, {
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
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (!isWholeClassMode && childContext?.past_interactions && childContext.past_interactions.length > 0) {
      // Oldest first so conversation flows naturally. 3 entries = good context with ~1,000 fewer tokens vs 5.
      const recent = childContext.past_interactions.slice(0, 3);
      const chronological = [...recent].reverse();
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
      // CONVERSATIONAL MODE
      // Tools enabled for SETUP/INTAKE/CHECKIN/NORMAL.
      // REFLECTION = pure conversation, no tools.
      // =============================================
      // Build user content — with image if provided
      const userContent: MessageParam['content'] = image_url
        ? [
            { type: 'image' as const, source: { type: 'url' as const, url: image_url } },
            { type: 'text' as const, text: userPrompt },
          ]
        : userPrompt;

      let currentMessages: MessageParam[] = [
        ...conversationMessages.map(m => ({ ...m })),
        { role: 'user' as const, content: userContent },
      ];

      // Select model and token limit based on guru tier
      const guruModel = getModelForTier(guruTier) || AI_MODEL;
      const guruMaxTokens = guruTier === 'sonnet' ? 4096 : 3072;

      // Tools enabled for SETUP, INTAKE, CHECKIN, NORMAL modes
      // REFLECTION = pure conversation, no tools
      const toolsEnabled = TOOL_ENABLED_MODES.includes(guruMode);

      // Build mode-specific tool set (NORMAL drops 6 niche tools → saves ~1,200 tokens)
      const modeTools = toolsEnabled ? getToolsForMode(guruMode, isWholeClassMode) : [];

      // Detect explicit shelf/progress update requests — force tool_choice: "any" so the model
      // MUST call at least one tool instead of just verbally suggesting works.
      // Guard: only force when tools are actually available (modeTools.length > 0).
      const shelfUpdatePattern = /weekly admin|update\s+(\w+\s+)?shelf|set\s+(the\s+)?focus|change\s+(the\s+)?work|replace\s+(the\s+)?work|put\s+\w+\s+on\s+(\w+\s+)?shelf|update\s+(\w+\s+)?progress|mark\s+\w+\s+as\s+master|new works?\s+for|rotate\s+(the\s+)?shelf|recommend\s+(a\s+|some\s+)?works?|suggest\s+(a\s+|some\s+)?works?|what\s+should\s+\w+\s+work\s+on|fix\s+(\w+\s+)?shelf|match\s+(\w+\s+)?shelf|put\s+it\s+(on|in)\s/i;
      const forceToolUse = modeTools.length > 0 && shelfUpdatePattern.test(question);
      const baseApiParams = {
        model: guruModel,
        max_tokens: guruMaxTokens,
        system: systemPrompt,
        messages: currentMessages,
      };
      const apiParams = modeTools.length > 0
        ? { ...baseApiParams, tools: modeTools, tool_choice: forceToolUse ? { type: "any" as const } : { type: "auto" as const } }
        : baseApiParams;

      // Master AbortController: cancels ALL in-flight Anthropic API calls when total timeout fires.
      // Without this, withTimeout only rejects the promise — the actual HTTP request keeps running.
      const masterAbort = new AbortController();
      masterTimeout = setTimeout(() => masterAbort.abort(), TOTAL_REQUEST_TIMEOUT_MS);
      const requestStart = Date.now();

      // ===============================================================
      // STREAMING PATH: Stream the final text response token-by-token
      // Tool rounds still happen non-streaming (tools must complete).
      // Only the final text generation streams to the client via SSE.
      // ===============================================================
      if (streamRequested) {
        // Run tool rounds non-streaming first (if tools are enabled)
        const actionsTaken: Array<{ tool: string } & ToolResult> = [];
        let rounds = 0;

        // First call — non-streaming to check if tools are needed
        let toolResponse = await withTimeout(
          anthropic.messages.create(apiParams, { signal: masterAbort.signal }),
          API_TIMEOUT_MS,
          'Guru initial call'
        );

        // Multi-turn tool loop
        while (toolResponse.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS && (Date.now() - requestStart) < TOTAL_REQUEST_TIMEOUT_MS) {
          rounds++;
          const toolUseBlocks = toolResponse.content.filter(
            (b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use'
          );

          const CHILD_SCOPED_TOOLS = ['set_focus_work', 'clear_focus_work', 'update_progress', 'save_observation', 'save_child_profile', 'get_child_recent_activity'];

          const toolPromises = toolUseBlocks.map(async (toolCall) => {
            try {
              let effectiveChildId = child_id;
              const toolInput = toolCall.input as Record<string, unknown>;
              if (isWholeClassMode && classroomContext && CHILD_SCOPED_TOOLS.includes(toolCall.name)) {
                const studentName = toolInput.student_name as string | undefined;
                if (studentName) {
                  const resolved = resolveStudentName(studentName, classroomContext);
                  if ('error' in resolved) {
                    actionsTaken.push({ tool: toolCall.name, success: false, message: resolved.error });
                    return { type: 'tool_result' as const, tool_use_id: toolCall.id, is_error: true, content: JSON.stringify({ success: false, message: resolved.error }) };
                  }
                  effectiveChildId = resolved.childId;
                } else {
                  const msg = `In whole-class mode, provide student_name to identify which student. Available: ${classroomContext.children.map(c => c.name).join(', ')}`;
                  actionsTaken.push({ tool: toolCall.name, success: false, message: msg });
                  return { type: 'tool_result' as const, tool_use_id: toolCall.id, is_error: true, content: JSON.stringify({ success: false, message: msg }) };
                }
              }
              const result = await executeTool(toolCall.name, toolInput, effectiveChildId, isWholeClassMode ? classroom_id! : undefined);
              actionsTaken.push({ tool: toolCall.name, ...result });
              return { type: 'tool_result' as const, tool_use_id: toolCall.id, content: JSON.stringify(result) };
            } catch (err) {
              console.error(`[Guru Tool] ${toolCall.name} failed:`, err);
              return { type: 'tool_result' as const, tool_use_id: toolCall.id, is_error: true, content: JSON.stringify({ success: false, message: `Tool failed: ${err instanceof Error ? err.message : 'Unknown error'}` }) };
            }
          });

          const toolResults: ToolResultBlockParam[] = await Promise.all(toolPromises);

          // Fast path: when tool_choice was forced AND all tools succeeded,
          // skip the expensive second API call (~15-30s) and return tool results directly.
          // This makes shelf updates respond in ~5-10s instead of 30-60s.
          const allToolsSucceeded = actionsTaken.every(a => a.success);
          if (forceToolUse && allToolsSucceeded && actionsTaken.length > 0) {
            clearTimeout(masterTimeout);
            const summaryText = actionsTaken.map(a => a.message).filter(Boolean).join('\n\n');
            const finalText = summaryText || 'Done!';
            console.log(`[Guru Stream] Fast-path: forced tool use, ${actionsTaken.length} tools succeeded, skipping second API call. Elapsed: ${Date.now() - requestStart}ms`);

            const encoder = new TextEncoder();
            const responseStream = new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: finalText })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                controller.close();

                saveInteractionAndLearn(supabase, {
                  child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
                  question, guruMode, questionCategory, toolsEnabled, modeTools, rounds, actionsTaken,
                  guruTier, estCost: 0, responseText: finalText, knowledge, guruModel, startTime,
                  isTeacher, isGreetingTrigger, isParentRole,
                });
              }
            });

            return new Response(responseStream, {
              headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
            });
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: toolResponse.content as unknown as ContentBlockParam[] },
            { role: 'user' as const, content: toolResults },
          ];

          // If this is the last tool round OR we're approaching timeout, break and stream the final response
          // Otherwise do another non-streaming round to check for more tools
          const nextResponse = await withTimeout(
            anthropic.messages.create({
              ...baseApiParams,
              tools: modeTools,
              tool_choice: { type: "auto" },
              messages: currentMessages,
            }, { signal: masterAbort.signal }),
            API_TIMEOUT_MS,
            `Guru tool round ${rounds}`
          );

          if (nextResponse.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS && (Date.now() - requestStart) < TOTAL_REQUEST_TIMEOUT_MS) {
            toolResponse = nextResponse;
            continue;
          }

          // Not a tool_use response — we have final text. Extract and stream it.
          if (nextResponse.stop_reason !== 'tool_use') {
            const finalText = nextResponse.content
              .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
              .map(b => b.text)
              .join('\n');

            clearTimeout(masterTimeout);
            const { input_tokens = 0, output_tokens = 0 } = nextResponse.usage || {};
            const costMultiplier = guruTier === 'haiku' ? { input: 0.80, output: 4.00 } : { input: 3, output: 15 };
            const estCost = (input_tokens * costMultiplier.input + output_tokens * costMultiplier.output) / 1_000_000;
            console.log(`[Guru Stream] Mode: ${guruMode}, model: ${guruTier}, rounds: ${rounds}, tokens: ${input_tokens}+${output_tokens}, est: $${estCost.toFixed(4)}`);

            // Stream the final text as SSE
            const encoder = new TextEncoder();
            const responseStream = new ReadableStream({
              start(controller) {
                // Send the full text as a single SSE event (tool rounds already consumed the time)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: finalText })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                controller.close();

                // Fire-and-forget: save interaction + self-learning
                saveInteractionAndLearn(supabase, {
                  child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
                  question, guruMode, questionCategory, toolsEnabled, modeTools, rounds, actionsTaken,
                  guruTier, estCost, responseText: finalText, knowledge, guruModel, startTime,
                  isTeacher, isGreetingTrigger, isParentRole,
                });
              }
            });

            return new Response(responseStream, {
              headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
            });
          }

          // Tool round limit hit with tool_use still pending
          toolResponse = nextResponse;
          break;
        }

        // If we get here, either:
        // 1. No tools were used at all (toolResponse.stop_reason !== 'tool_use' from first call)
        // 2. Tool rounds finished/maxed out

        clearTimeout(masterTimeout);

        // Check if the initial response had text (no tools used)
        if (toolResponse.stop_reason !== 'tool_use') {
          // No tools were used — initial response already has the final text.
          // Send it as a single SSE chunk (no second API call needed).
          const finalText = toolResponse.content
            .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
            .map(b => b.text)
            .join('\n');

          const { input_tokens = 0, output_tokens = 0 } = toolResponse.usage || {};
          const costMultiplier = guruTier === 'haiku' ? { input: 0.80, output: 4.00 } : { input: 3, output: 15 };
          const estCost = (input_tokens * costMultiplier.input + output_tokens * costMultiplier.output) / 1_000_000;
          console.log(`[Guru Stream] Mode: ${guruMode}, model: ${guruTier}, rounds: 0, tokens: ${input_tokens}+${output_tokens}, est: $${estCost.toFixed(4)}`);

          const encoder = new TextEncoder();
          const responseStream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: finalText })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();

              saveInteractionAndLearn(supabase, {
                child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
                question, guruMode, questionCategory, toolsEnabled, modeTools, rounds: 0, actionsTaken: [],
                guruTier, estCost, responseText: finalText, knowledge, guruModel, startTime,
                isTeacher, isGreetingTrigger, isParentRole,
              });
            }
          });

          return new Response(responseStream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
          });
        }

        // Tool rounds maxed out — generate summary from tool results
        if (toolResponse.stop_reason === 'tool_use') {
          const reason = rounds >= MAX_TOOL_ROUNDS ? `max rounds (${MAX_TOOL_ROUNDS})` : `total timeout (${Date.now() - requestStart}ms)`;
          console.warn(`[Guru Stream] Tool loop stopped: ${reason}. Actions completed: ${actionsTaken.length}`);
        }

        let responseText = toolResponse.content
          .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
          .map(b => b.text)
          .join('\n');

        if (!responseText.trim() && actionsTaken.length > 0) {
          responseText = `Done! Here's what I did:\n\n${actionsTaken.filter(a => a.success).map(a => a.message).join('\n\n')}`;
        }

        const { input_tokens = 0, output_tokens = 0 } = toolResponse.usage || {};
        const costMultiplier = guruTier === 'haiku' ? { input: 0.80, output: 4.00 } : { input: 3, output: 15 };
        const estCost = (input_tokens * costMultiplier.input + output_tokens * costMultiplier.output) / 1_000_000;

        const encoder = new TextEncoder();
        const responseStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: responseText })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();

            saveInteractionAndLearn(supabase, {
              child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
              question, guruMode, questionCategory, toolsEnabled, modeTools, rounds, actionsTaken,
              guruTier, estCost, responseText, knowledge, guruModel, startTime,
              isTeacher, isGreetingTrigger, isParentRole,
            });
          }
        });

        return new Response(responseStream, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
      }

      // ===============================================================
      // NON-STREAMING PATH (original): Wait for full response
      // ===============================================================
      let response = await withTimeout(
        anthropic.messages.create(apiParams, { signal: masterAbort.signal }),
        API_TIMEOUT_MS,
        'Guru initial call'
      );

      const actionsTaken: Array<{ tool: string } & ToolResult> = [];
      let rounds = 0;

      // Multi-turn tool loop (only runs if tools were enabled and Claude chose to use them)
      // Also enforce total request timeout to prevent indefinite hanging.
      while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS && (Date.now() - requestStart) < TOTAL_REQUEST_TIMEOUT_MS) {
        rounds++;
        const toolUseBlocks = response.content.filter(
          (b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use'
        );

        // Pre-resolve whole-class student names (sync), then execute all tools in parallel
        const CHILD_SCOPED_TOOLS = ['set_focus_work', 'clear_focus_work', 'update_progress', 'save_observation', 'save_child_profile', 'get_child_recent_activity'];

        const toolPromises = toolUseBlocks.map(async (toolCall) => {
          try {
            let effectiveChildId = child_id;
            const toolInput = toolCall.input as Record<string, unknown>;
            if (isWholeClassMode && classroomContext && CHILD_SCOPED_TOOLS.includes(toolCall.name)) {
              const studentName = toolInput.student_name as string | undefined;
              if (studentName) {
                const resolved = resolveStudentName(studentName, classroomContext);
                if ('error' in resolved) {
                  actionsTaken.push({ tool: toolCall.name, success: false, message: resolved.error });
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: toolCall.id,
                    is_error: true,
                    content: JSON.stringify({ success: false, message: resolved.error }),
                  };
                }
                effectiveChildId = resolved.childId;
              } else {
                const msg = `In whole-class mode, provide student_name to identify which student. Available: ${classroomContext.children.map(c => c.name).join(', ')}`;
                actionsTaken.push({ tool: toolCall.name, success: false, message: msg });
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolCall.id,
                  is_error: true,
                  content: JSON.stringify({ success: false, message: msg }),
                };
              }
            }
            const result = await executeTool(
              toolCall.name,
              toolInput,
              effectiveChildId,
              isWholeClassMode ? classroom_id! : undefined
            );
            actionsTaken.push({ tool: toolCall.name, ...result });
            return {
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              content: JSON.stringify(result),
            };
          } catch (err) {
            console.error(`[Guru Tool] ${toolCall.name} failed:`, err);
            return {
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              is_error: true,
              content: JSON.stringify({
                success: false,
                message: `Tool failed: ${err instanceof Error ? err.message : 'Unknown error'}`
              }),
            };
          }
        });

        const toolResults: ToolResultBlockParam[] = await Promise.all(toolPromises);

        // Fast path (non-streaming): skip second API call when forced tool use succeeded
        const allToolsSucceeded = actionsTaken.every(a => a.success);
        if (forceToolUse && allToolsSucceeded && actionsTaken.length > 0) {
          clearTimeout(masterTimeout);
          const summaryText = actionsTaken.map(a => a.message).filter(Boolean).join('\n\n');
          const responseText = summaryText || 'Done!';
          console.log(`[Guru] Fast-path (non-stream): forced tool use, ${actionsTaken.length} tools succeeded. Elapsed: ${Date.now() - requestStart}ms`);

          saveInteractionAndLearn(supabase, {
            child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
            question, guruMode, questionCategory, toolsEnabled, modeTools, rounds, actionsTaken,
            guruTier, estCost: 0, responseText, knowledge, guruModel, startTime,
            isTeacher, isGreetingTrigger, isParentRole,
          });

          return NextResponse.json({ success: true, insight: responseText, conversational: true });
        }

        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content as unknown as ContentBlockParam[] },
          { role: 'user' as const, content: toolResults },
        ];

        response = await withTimeout(
          anthropic.messages.create({
            ...baseApiParams,
            tools: modeTools,
            tool_choice: { type: "auto" },
            messages: currentMessages,
          }, { signal: masterAbort.signal }),
          API_TIMEOUT_MS,
          `Guru tool round ${rounds}`
        );
      }

      if (response.stop_reason === 'tool_use') {
        const reason = rounds >= MAX_TOOL_ROUNDS ? `max rounds (${MAX_TOOL_ROUNDS})` : `total timeout (${Date.now() - requestStart}ms)`;
        console.warn(`[Guru] Tool loop stopped: ${reason}. Actions completed: ${actionsTaken.length}`);
      }

      // All API calls done — clear the master timeout so it doesn't fire during DB saves
      clearTimeout(masterTimeout);

      // Extract final text response
      let responseText = response.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      // SAFETY NET: If tools consumed the response (Claude used tools but produced no text),
      // generate a simple summary from tool results — NO extra API call (saves 15-30s).
      if (!responseText.trim() && actionsTaken.length > 0) {
        console.warn(`[Guru] No text after ${rounds} tool rounds. Generating summary from tool results.`);
        responseText = actionsTaken
          .filter(a => a.success)
          .map(a => a.message)
          .join('\n\n');
        // Wrap in a friendly prefix
        if (responseText) {
          responseText = `Done! Here's what I did:\n\n${responseText}`;
        }
      }

      // Monitor tool hallucination (log only — no retry to avoid doubling latency)
      // The prompt instructions + tool_choice:"any" for explicit requests handle reliability.
      // A retry would add another 15-30s API call, causing the Guru to hang/timeout.
      if (toolsEnabled && actionsTaken.length === 0 && responseText.trim()) {
        const claimsAction = /I've (updated|marked|set|changed|put|added|moved|cleared|removed)|Done —/i.test(responseText);
        if (claimsAction) {
          console.warn(`[Guru] Tool hallucination detected — model claims action but made 0 tool calls. Response: "${responseText.slice(0, 200)}..."`);
        }
      }

      // Log cost estimate (Haiku: $0.80/$4.00 per 1M, Sonnet: $3/$15 per 1M)
      const { input_tokens = 0, output_tokens = 0 } = response.usage || {};
      if (forceToolUse) {
        console.log(`[Guru] Forced tool_choice=any for shelf update request. Actions: ${actionsTaken.length}`);
      }
      const costMultiplier = guruTier === 'haiku' ? { input: 0.80, output: 4.00 } : { input: 3, output: 15 };
      const estCost = (input_tokens * costMultiplier.input + output_tokens * costMultiplier.output) / 1_000_000;
      console.log(`[Guru] Mode: ${guruMode}, model: ${guruTier}, rounds: ${rounds}, tokens: ${input_tokens}+${output_tokens}, est: $${estCost.toFixed(4)}`);

      const processingTime = Date.now() - startTime;

      // Save interaction + self-learning (non-streaming path)
      const { data: saved } = await saveInteractionAndLearnSync(supabase, {
        child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
        question, guruMode, questionCategory, toolsEnabled, modeTools, rounds, actionsTaken,
        guruTier, estCost, responseText, knowledge, guruModel, startTime, processingTime,
        isTeacher, isGreetingTrigger, isParentRole,
      });

      // Actions are internal (saved in context_snapshot) — never exposed to the parent
      return NextResponse.json({
        success: true,
        insight: responseText,
        interaction_id: saved?.id,
        conversational: true,
      });
    }

    // =============================================
    // STRUCTURED MODE (teachers) — no tool-use
    // =============================================
    // userPrompt already pushed to conversationMessages above (line 227)

    const message = await withTimeout(
      anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: conversationMessages,
      }),
      API_TIMEOUT_MS,
      'Guru structured call'
    );

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
        classroom_id: classroom_id || childContext!.classroom_id,
        question,
        question_type: detectQuestionType(question),
        context_snapshot: {
          child_name: childContext!.name,
          age: `${childContext!.age_years}y ${childContext!.age_months}m`,
          mastered_count: childContext!.mastered_count || 0,
          has_mental_profile: !!childContext!.mental_profile,
          observations_count: childContext!.recent_observations.length,
          notes_count: childContext!.teacher_notes.length,
          topics_used: knowledge.topics_used,
          question_category: questionCategory,
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
    if (!saveError && childContext) {
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

    // 8. Post-conversation processing for structured teacher mode
    if (!saveError && childContext) {
      processTeacherConversation({
        childId: child_id,
        childName: childContext.name || 'Unknown',
        question,
        response: parsed.insight || responseText,
        currentWorks: (childContext.focus_works || []).map(fw => ({
          area: fw.area,
          work_name: fw.work_name || '',
          status: 'assigned',
        })),
        interactionId: saved?.id,
      }).catch(err =>
        console.error('[Guru] Post-conversation processing error (structured):', err instanceof Error ? err.message : String(err))
      );
    }

    // 9. Return response
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
    // Always clear master timeout to prevent resource leak
    if (typeof masterTimeout !== 'undefined' && masterTimeout !== null) {
      clearTimeout(masterTimeout);
    }
    console.error('[Guru] Error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      // Timeout or abort — return 504 so client knows to retry
      if (error.message.includes('timed out') || error.name === 'AbortError') {
        console.warn(`[Guru] Request timed out after ${Date.now() - startTime}ms`);
        return NextResponse.json(
          { success: false, error: 'Response took too long. Please try again.' },
          { status: 504 }
        );
      }
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

    // Whole-class mode: return empty history (no per-child history to show)
    if (childId === 'whole_class') {
      return NextResponse.json({ success: true, history: [] });
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { data: history, error } = await supabase
      .from('montree_guru_interactions')
      .select('id, asked_at, question, question_type, response_insight, response_action_plan, outcome')
      .eq('child_id', childId)
      .not('question', 'like', 'photo:%')
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

// Helper: Save interaction + trigger self-learning (fire-and-forget for streaming)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveInteractionAndLearn(supabase: any, opts: {
  child_id: string; isWholeClassMode: boolean; teacherId: string | undefined;
  classroom_id: string | undefined; childContext: ChildContext | null | undefined;
  classroomContext: ClassroomContext | undefined;
  question: string; guruMode: GuruMode; questionCategory: QuestionCategory;
  toolsEnabled: boolean; modeTools: unknown[]; rounds: number;
  actionsTaken: Array<{ tool: string } & ToolResult>;
  guruTier: 'haiku' | 'sonnet'; estCost: number; responseText: string;
  knowledge: KnowledgeResult; guruModel: string; startTime: number;
  isTeacher: boolean; isGreetingTrigger: boolean; isParentRole: boolean;
}) {
  // This runs after the stream is closed — don't block anything
  saveInteractionAndLearnSync(supabase, { ...opts, processingTime: Date.now() - opts.startTime }).catch(err =>
    console.error('[Guru] Post-stream save failed:', err instanceof Error ? err.message : String(err))
  );
}

// Helper: Save interaction + trigger self-learning (sync, returns saved record)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveInteractionAndLearnSync(supabase: any, opts: {
  child_id: string; isWholeClassMode: boolean; teacherId: string | undefined;
  classroom_id: string | undefined; childContext: ChildContext | null | undefined;
  classroomContext: ClassroomContext | undefined;
  question: string; guruMode: GuruMode; questionCategory: QuestionCategory;
  toolsEnabled: boolean; modeTools: unknown[]; rounds: number;
  actionsTaken: Array<{ tool: string } & ToolResult>;
  guruTier: 'haiku' | 'sonnet'; estCost: number; responseText: string;
  knowledge: KnowledgeResult; guruModel: string; startTime: number; processingTime?: number;
  isTeacher: boolean; isGreetingTrigger: boolean; isParentRole: boolean;
}) {
  const {
    child_id, isWholeClassMode, teacherId, classroom_id, childContext, classroomContext,
    question, guruMode, questionCategory, toolsEnabled, modeTools, rounds, actionsTaken,
    guruTier, estCost, responseText, knowledge, guruModel, startTime,
    isTeacher, isGreetingTrigger,
  } = opts;
  const processingTime = opts.processingTime || (Date.now() - startTime);

  const { data: saved, error: saveError } = await supabase
    .from('montree_guru_interactions')
    .insert({
      child_id: isWholeClassMode ? null : child_id,
      teacher_id: teacherId || null,
      classroom_id: classroom_id || (childContext ? childContext.classroom_id : null),
      question,
      question_type: isWholeClassMode ? 'whole_class' : 'chat',
      context_snapshot: isWholeClassMode ? {
        whole_class: true,
        classroom_name: classroomContext?.classroom_name,
        child_count: classroomContext?.child_count,
        conversational: true,
        mode: guruMode,
        question_category: questionCategory,
        tools_enabled: toolsEnabled,
        tools_injected: modeTools.length,
        tool_rounds: rounds,
        actions_taken: actionsTaken.length,
        guru_tier: guruTier,
        est_cost: estCost,
      } : {
        child_name: childContext?.name,
        age: `${childContext?.age_years || 0}y ${childContext?.age_months || 0}m`,
        mastered_count: childContext?.mastered_count || 0,
        conversational: true,
        mode: guruMode,
        question_category: questionCategory,
        tools_enabled: toolsEnabled,
        tools_injected: modeTools.length,
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

  // Self-learning — fire-and-forget, skip for whole-class
  const childAgeMonthsForLearning = isWholeClassMode ? 0 : ((childContext?.age_years || 0) * 12 + (childContext?.age_months || 0));
  const activeAreasForLearning = isWholeClassMode ? [] : (childContext?.focus_works?.map(fw => fw.area) || []);

  if (!isWholeClassMode && childContext) {
    if (actionsTaken.length > 0) {
      learnFromConversation(child_id, childAgeMonthsForLearning).catch(err =>
        console.error('[Guru] Pattern learning error:', err instanceof Error ? err.message : String(err))
      );
    }

    if (!saveError) {
      recordLearning({
        conversation_id: saved?.id as string | undefined,
        child_age_months: childAgeMonthsForLearning,
        areas: activeAreasForLearning,
        learning_type: actionsTaken.length > 0 ? 'insight' : 'technique',
        description: `Q: ${question.slice(0, 150)}... → A: ${responseText.slice(0, 200)}...`,
        context: `Child ${childContext.name || 'unknown'}, ${childAgeMonthsForLearning}mo. ${actionsTaken.length} actions taken: ${actionsTaken.map(a => a.tool).join(', ')}`,
        tags: [
          ...activeAreasForLearning.map(a => a.replace('practical_life', 'practical')),
          `age_${Math.round(childAgeMonthsForLearning / 12)}`,
        ].filter(Boolean),
      }).catch(err =>
        console.error('[Guru] Brain learning error:', err instanceof Error ? err.message : String(err))
      );
    }

    if (isTeacher && !isGreetingTrigger && !saveError) {
      processTeacherConversation({
        childId: child_id,
        childName: childContext.name || 'Unknown',
        question,
        response: responseText,
        currentWorks: (childContext.focus_works || []).map(fw => ({
          area: fw.area,
          work_name: fw.work_name || '',
          status: 'assigned',
        })),
        interactionId: saved?.id,
      }).catch(err =>
        console.error('[Guru] Post-conversation processing error:', err instanceof Error ? err.message : String(err))
      );
    }
  }

  return { data: saved, error: saveError };
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
