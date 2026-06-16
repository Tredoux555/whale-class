// app/api/montree/companion/route.ts
//
// IVY — the family's one companion, and the central controller of the home
// system. Per-child SSE chat for a homeschool parent: life-coach for the parent,
// Montessori educator for the child, family manager, transparently wired to the
// school side (Guru bridge). Modeled on the Coach SSE route (keepalive, tool
// loop with full transcript accumulation, empty-response recovery, forced
// summary, timeouts).
//
// Each turn: verify child access → pick THE one next step → build school context
// + memory → resume the running thread (montree_companion_log) → stream. Photos
// drive the Smart-Capture loop (vision). Tools cover the educator loop
// (present_step / set_focus_work / update_progress / save_observation), per-family
// memory (remember / recall), the family calendar + routines + the parent's own
// plans (add_to_calendar / set_routine / list_schedule / cancel_calendar_item),
// and the growth reflection (growth_snapshot). Every turn is archived for memory
// consolidation; the day's turns are folded into long-term memory on wake.
//
// SSE events: :keepalive · {type:'thinking'} · {type:'tool_call',tool} ·
//   {type:'tool_result',tool,success} · {type:'step_card',card} ·
//   {type:'state_changed',what} · {type:'text',text} · {type:'done'} · {type:'error',error}

import { NextRequest, NextResponse, after } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlockParam, ToolResultBlockParam, Tool } from '@anthropic-ai/sdk/resources/messages';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic } from '@/lib/ai/anthropic';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { pickNextStep } from '@/lib/montree/companion/next-step';
import { generateStepCard } from '@/lib/montree/companion/present';
import { buildSchoolContext } from '@/lib/montree/companion/school-context';
import {
  loadCompanionMemories,
  formatCompanionMemoriesForPrompt,
  writeCompanionMemory,
  recallCompanionMemories,
  type CompanionMemoryType,
} from '@/lib/montree/companion/memory';
import {
  addHomeEvent,
  setRoutine,
  cancelHomeEvent,
  listSchedule,
  summariseSchedule,
  type HomeEventKind,
  type HomeEventAudience,
} from '@/lib/montree/companion/schedule';
import { gatherGrowthData } from '@/lib/montree/companion/growth';
import { getWeeklyWork, generateExtraWork } from '@/lib/montree/companion/weekly-work';
import { listActiveProducts, summariseProducts } from '@/lib/montree/companion/marketplace';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { isCompanionConsolidationDue, consolidateCompanionDay } from '@/lib/montree/companion/consolidation';
import { buildCompanionSystemPrompt, COMPANION_NAME } from '@/lib/montree/companion/system-prompt';
import { executeTool } from '@/lib/montree/guru/tool-executor';
import { logApiUsage } from '@/lib/montree/api-usage';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const MAX_TOOL_ROUNDS = 6;
const TOTAL_TIMEOUT_MS = 100_000;
const API_TIMEOUT_MS = 55_000;
const MAX_TOOL_RESULT_CHARS = 40_000;
const MISSING_TABLE = '42P01';

function sse(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(payload) + '\n\n');
}

interface BodyShape {
  child_id?: string;
  question?: string;
  image_url?: string;
  history?: MessageParam[];
  conversation_id?: string;
  locale?: string;
}

const COMPANION_TOOLS: Tool[] = [
  {
    name: 'present_step',
    description: "Show the parent the full, hand-held Step Card for the child's chosen next work. Call this when you're ready to guide them through doing the next step. Takes no input — it presents the step already chosen for this child.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'set_focus_work',
    description: "Save a work onto the child's shelf as their current focus in an area. Use when you commit to a next work so it's recorded.",
    input_schema: {
      type: 'object',
      properties: {
        area: { type: 'string', enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] },
        work_name: { type: 'string', description: 'Exact curriculum work name.' },
        reason: { type: 'string', description: 'One short line on why, in plain parent language.' },
      },
      required: ['area', 'work_name'],
    },
  },
  {
    name: 'update_progress',
    description: "Record how a work is going after the parent reports back (or after a photo): presented (just shown), practicing (repeating it), or mastered (got it). Never downgrade what's already further along.",
    input_schema: {
      type: 'object',
      properties: {
        work_name: { type: 'string' },
        area: { type: 'string', enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] },
        status: { type: 'string', enum: ['not_started', 'presented', 'practicing', 'mastered'] },
        notes: { type: 'string', description: 'Optional short note on what you observed.' },
      },
      required: ['work_name', 'area', 'status'],
    },
  },
  {
    name: 'save_observation',
    description: 'Record a meaningful observation of the child (a win, a struggle, a moment of concentration). Quiet, factual.',
    input_schema: {
      type: 'object',
      properties: {
        behavior_description: { type: 'string', description: 'What you observed, factually.' },
        emotional_state: { type: 'string', description: 'Optional: how the child seemed.' },
        related_works: { type: 'array', items: { type: 'string' }, description: 'Optional: works this relates to.' },
      },
      required: ['behavior_description'],
    },
  },
  {
    name: 'remember',
    description: "Save something durable and meaningful you've learned — about the child (interest, temperament, milestone, struggle) or the parent (preference, value, a thing they said they'd let go of, a worry pattern) or the family (routine, fact). Semantic facts only. If something changes, set supersedes_id to the old memory id.",
    input_schema: {
      type: 'object',
      properties: {
        memory_type: { type: 'string', enum: ['interest', 'temperament', 'milestone', 'struggle', 'parent_preference', 'parent_value', 'parent_dropped', 'parent_pattern', 'routine', 'fact'] },
        content: { type: 'string', description: 'The durable fact, in one clear sentence.' },
        supersedes_id: { type: 'string', description: 'Optional: id of a memory this replaces.' },
      },
      required: ['memory_type', 'content'],
    },
  },
  {
    name: 'recall',
    description: 'Look back through what you remember about this family, filtered by type and/or a search term. Use when you need detail beyond what you already hold.',
    input_schema: {
      type: 'object',
      properties: {
        memory_type: { type: 'string', enum: ['interest', 'temperament', 'milestone', 'struggle', 'parent_preference', 'parent_value', 'parent_dropped', 'parent_pattern', 'routine', 'fact'] },
        query: { type: 'string', description: 'Optional free-text search.' },
      },
    },
  },
  {
    name: 'add_to_calendar',
    description: "Add a dated thing to the family calendar — the child's activity/appointment, or the parent's own reminder/plan (audience 'parent'). Use a full date-and-time. For something with no clock time, set all_day true.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start: { type: 'string', description: 'Date and time as ISO 8601, e.g. 2026-06-18T15:00. Compute the real date from today.' },
        all_day: { type: 'boolean', description: 'True for a whole-day item with no clock time.' },
        end: { type: 'string', description: 'Optional ISO end time.' },
        detail: { type: 'string', description: 'Optional note.' },
        kind: { type: 'string', enum: ['appointment', 'activity', 'reminder', 'wellbeing'], description: 'Defaults to activity.' },
        audience: { type: 'string', enum: ['child', 'parent', 'family'], description: "Who it's for. Use 'parent' for the parent's own plans." },
      },
      required: ['title', 'start'],
    },
  },
  {
    name: 'set_routine',
    description: 'Set a gentle recurring routine for the child (e.g. tidy-up at 5pm, story before bed). Keep it light.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        time_of_day: { type: 'string', description: 'Optional "HH:MM" 24-hour time.' },
        days_of_week: { type: 'array', items: { type: 'number' }, description: 'Optional 0=Sun..6=Sat. Omit/empty = every day.' },
        audience: { type: 'string', enum: ['child', 'parent', 'family'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_schedule',
    description: "See what's coming up on the family calendar and the routines. Use before suggesting times, or when the parent asks what's on.",
    input_schema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'How many days ahead to look (default 14).' } },
    },
  },
  {
    name: 'cancel_calendar_item',
    description: 'Cancel a calendar item by its id (from list_schedule).',
    input_schema: { type: 'object', properties: { event_id: { type: 'string' } }, required: ['event_id'] },
  },
  {
    name: 'growth_snapshot',
    description: "Gather where the child is across all areas + recent observations + what you know about their interests, milestones and struggles — so you can give the parent a warm, honest 'how they're growing' reflection. Takes no input.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'weekly_work',
    description: "Get a make-it-at-home DIY Montessori work for the child. Default returns THIS WEEK's free work. Set another:true when the parent wants an EXTRA one beyond the weekly free work — that needs the $1 DIY plan; if they don't have it you'll get a locked result and should warmly offer the plan (never naggy).",
    input_schema: {
      type: 'object',
      properties: { another: { type: 'boolean', description: 'true = an extra DIY work beyond this week\'s free one (requires the $1 DIY plan).' } },
    },
  },
  {
    name: 'find_materials',
    description: "Search the home shop for Montessori materials a family can buy at a discount (e.g. when a step needs a material they don't have, or they ask where to get something). Only suggest these when genuinely helpful — never pushy. Share the discount and the link.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to look for, e.g. "pink tower" or "pouring jugs".' } },
    },
  },
];

const GURU_REUSE_TOOLS = new Set(['set_focus_work', 'update_progress', 'save_observation']);

/** Resume the running thread from the durable archive (cross-device). */
async function loadRecentThread(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  opts: { maxTurns: number; withinHours: number },
): Promise<MessageParam[]> {
  try {
    const since = new Date(Date.now() - opts.withinHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('montree_companion_log')
      .select('question, answer, created_at')
      .eq('child_id', childId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(opts.maxTurns);
    if (error || !data) return [];
    const turns = [...data].reverse() as Array<{ question: string | null; answer: string | null }>;
    const out: MessageParam[] = [];
    for (const t of turns) {
      if (t.question?.trim()) out.push({ role: 'user', content: t.question.trim().slice(0, 16000) });
      if (t.answer?.trim()) out.push({ role: 'assistant', content: t.answer.trim().slice(0, 16000) });
    }
    return out;
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!anthropic) return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 });

  let body: BodyShape;
  try {
    body = (await request.json()) as BodyShape;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const childId = (body.child_id || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const isGreeting = body.question === '__greeting__';
  let question = isGreeting ? '' : (body.question || '').trim();

  // Validate optional image (HTTPS only).
  let imageUrl: string | undefined;
  if (body.image_url) {
    try {
      const u = new URL(body.image_url);
      if (u.protocol === 'https:') imageUrl = body.image_url;
    } catch { /* drop malformed */ }
  }

  if (!question && !imageUrl && !isGreeting) {
    return NextResponse.json({ error: 'question or image required' }, { status: 400 });
  }
  if (question.length > 16000) {
    return NextResponse.json({ error: 'That message is very long — break it into two and send again.' }, { status: 400 });
  }
  const locale = body.locale && /^[a-z]{2}$/.test(body.locale) ? body.locale : 'en';

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();

  // Tier gate — free schools get a friendly upgrade prompt (no AI spend).
  const { model } = await resolveReportModel(supabase, auth.schoolId);
  if (!model) {
    return NextResponse.json({
      requires_upgrade: true,
      upgrade_url: '/montree/admin/billing',
      feature: 'companion',
      error: `${COMPANION_NAME} is part of the home plan. Start your trial or subscribe to chat with your family companion.`,
    }, { status: 402 });
  }

  const client = anthropic as Anthropic;

  // Child + parent context.
  const { data: child } = await supabase
    .from('montree_children')
    .select('name, date_of_birth, classroom_id')
    .eq('id', childId)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  const childName = (child.name as string) || 'your child';
  const classroomId = (child.classroom_id as string) || null;

  let childAgeYears: number | null = null;
  if (child.date_of_birth) {
    const dob = new Date(child.date_of_birth as string);
    if (!Number.isNaN(dob.getTime())) childAgeYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  let parentName: string | undefined;
  try {
    const { data: me } = await supabase.from('montree_teachers').select('name').eq('id', auth.userId).maybeSingle();
    const n = (me?.name as string | undefined)?.trim();
    if (n) parentName = n.split(' ')[0];
  } catch { /* optional */ }

  const todayLabel = (() => {
    try {
      return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  // Greeting trigger → a gentle internal opener (not logged).
  if (isGreeting) {
    question = `(${parentName || 'The parent'} just opened the app.) Greet them warmly and briefly — surface the ONE next thing for ${childName}, or if you don't yet know what ${childName} loves, invite a photo of what they're drawn to right now. One step, then stop.`;
  }

  // Sanitize client history → text-only (fallback only).
  const sanitizeHistory = (raw: unknown): MessageParam[] => {
    if (!Array.isArray(raw)) return [];
    const out: MessageParam[] = [];
    for (const item of raw.slice(-12)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const role = obj.role === 'assistant' ? 'assistant' : 'user';
      const text = typeof obj.content === 'string' ? obj.content.trim() : '';
      if (!text) continue;
      out.push({ role, content: text.slice(0, 16000) });
    }
    return out;
  };

  // Working memory: resume the running thread server-side (cross-device); client
  // history is a fallback for the very first turn.
  const serverThread = await loadRecentThread(supabase, childId, { maxTurns: 12, withinHours: 72 });
  const history = serverThread.length ? serverThread : sanitizeHistory(body.history);

  // On wake (after the reply): fold any prior day's turns into long-term memory.
  after(async () => {
    try {
      const due = await isCompanionConsolidationDue(supabase, childId);
      if (!due.due) return;
      const res = await consolidateCompanionDay(supabase, client, childId, { childName, parentName });
      if (res.ok && res.memories > 0) console.info(`[companion] consolidated ${res.turns} turns → ${res.memories} memories`);
    } catch (e) {
      console.warn('[companion] consolidation skipped:', e instanceof Error ? e.message : 'unknown');
    }
  });

  const encoder = new TextEncoder();
  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id.slice(0, 64) : null;
  const toolsUsed: string[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let finalText = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(':keepalive\n\n'));
        controller.enqueue(sse(encoder, { type: 'thinking', text: '' }));

        const [stepResult, schoolCtx, memories] = await Promise.all([
          pickNextStep(supabase, childId).catch(() => null),
          buildSchoolContext(supabase, childId).catch(() => ({ section: '', hasSignal: false })),
          loadCompanionMemories(supabase, childId, 60).catch(() => []),
        ]);

        const step = stepResult && stepResult.ok ? stepResult.step : null;
        const currentStepSection = step
          ? [
              `The single next work to present is "${step.work_name}" (${step.area_label}).`,
              step.is_bridge && step.bridge_from_area ? `This gently bridges from ${step.bridge_from_area}.` : '',
              step.current_work ? `They are currently on "${step.current_work}" (${step.current_work_status || 'in progress'}) in this area.` : '',
              `Why: ${step.reasons?.length ? step.reasons.join('; ') : step.reason}.`,
              'When the parent is ready, call present_step for the full hand-held card. Save it with set_focus_work when you commit.',
            ].filter(Boolean).join('\n')
          : '';

        const systemPrompt = buildCompanionSystemPrompt({
          parentName,
          childName,
          childAgeYears,
          todayLabel,
          memorySection: formatCompanionMemoriesForPrompt(memories, { childName, parentName }),
          currentStepSection,
          schoolContextSection: schoolCtx.hasSignal ? schoolCtx.section : '',
          isFirstSession: memories.length === 0 && history.length === 0,
        });
        const minimalSystemPrompt =
          `You are ${COMPANION_NAME}, a warm Montessori companion for ${parentName || 'a parent'} raising ${childName} at home. ` +
          `Today is ${todayLabel}. Reply warmly and plainly, one step at a time, and end with the single next thing.`;

        // First user message — with image if provided (vision: the Smart-Capture loop).
        const firstContent: MessageParam['content'] = imageUrl
          ? [
              { type: 'image' as const, source: { type: 'url' as const, url: imageUrl } },
              { type: 'text' as const, text: question || 'Here is a photo.' },
            ]
          : question;
        const conversation: MessageParam[] = [...history, { role: 'user', content: firstContent }];

        let toolRound = 0;
        let emptyRecoveryDone = false;
        let logError: string | null = null;

        while (toolRound < MAX_TOOL_ROUNDS) {
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            controller.enqueue(sse(encoder, { type: 'error', error: 'This took too long — please ask again.' }));
            break;
          }

          let response;
          try {
            response = await client.messages.create(
              {
                model,
                max_tokens: 4096,
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools: COMPANION_TOOLS,
                messages: conversation,
              },
              { timeout: API_TIMEOUT_MS },
            );
          } catch (apiErr) {
            controller.enqueue(sse(encoder, { type: 'error', error: apiErr instanceof Error ? apiErr.message : 'API error' }));
            break;
          }

          if (response.usage) {
            totalInput += response.usage.input_tokens ?? 0;
            totalOutput += response.usage.output_tokens ?? 0;
          }

          const lastAssistantBlocks: ContentBlockParam[] = [];
          const pendingToolResults: ToolResultBlockParam[] = [];
          let hasToolUse = false;
          const roundTextParts: string[] = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              roundTextParts.push(block.text);
              lastAssistantBlocks.push({ type: 'text', text: block.text });
            } else if (block.type === 'tool_use') {
              hasToolUse = true;
              lastAssistantBlocks.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input } as unknown as ContentBlockParam);
              toolsUsed.push(block.name);
              controller.enqueue(sse(encoder, { type: 'tool_call', tool: block.name }));

              const input = (block.input || {}) as Record<string, unknown>;
              let resultPayload: { success: boolean; data?: unknown; error?: string };
              let stateChanged: string | null = null;

              try {
                if (block.name === 'present_step') {
                  if (!step) {
                    resultPayload = { success: false, error: 'No next step is available yet — ask what the child is drawn to, or invite a photo.' };
                  } else {
                    const card = await generateStepCard(supabase, { childId, classroomId, schoolId: auth.schoolId, step, childName, childAgeYears, locale });
                    controller.enqueue(sse(encoder, { type: 'step_card', card }));
                    resultPayload = { success: true, data: card };
                  }
                } else if (block.name === 'remember') {
                  const r = await writeCompanionMemory(supabase, childId, {
                    memory_type: input.memory_type as CompanionMemoryType,
                    content: String(input.content || ''),
                    supersedes_id: typeof input.supersedes_id === 'string' ? input.supersedes_id : null,
                  });
                  resultPayload = r.ok ? { success: true, data: { id: r.id } } : { success: false, error: r.error };
                } else if (block.name === 'recall') {
                  const rows = await recallCompanionMemories(supabase, childId, {
                    memory_type: input.memory_type as CompanionMemoryType | undefined,
                    query: typeof input.query === 'string' ? input.query : undefined,
                  });
                  resultPayload = { success: true, data: rows };
                } else if (block.name === 'add_to_calendar') {
                  const audience = (input.audience as HomeEventAudience) || 'family';
                  const r = await addHomeEvent(supabase, {
                    schoolId: auth.schoolId,
                    parentId: auth.userId,
                    childId: audience === 'child' ? childId : null,
                    title: String(input.title || ''),
                    detail: typeof input.detail === 'string' ? input.detail : null,
                    start: typeof input.start === 'string' ? input.start : undefined,
                    end: typeof input.end === 'string' ? input.end : null,
                    all_day: input.all_day === true,
                    kind: input.kind as HomeEventKind | undefined,
                    audience,
                    created_by: 'ivy',
                  });
                  resultPayload = r.ok ? { success: true, data: { id: r.id, when: r.when } } : { success: false, error: r.error };
                  if (r.ok) stateChanged = 'schedule';
                } else if (block.name === 'set_routine') {
                  const r = await setRoutine(supabase, {
                    childId,
                    title: String(input.title || ''),
                    time_of_day: typeof input.time_of_day === 'string' ? input.time_of_day : null,
                    days_of_week: Array.isArray(input.days_of_week) ? (input.days_of_week as unknown[]).map(Number) : [],
                    audience: input.audience as HomeEventAudience | undefined,
                  });
                  resultPayload = r.ok ? { success: true, data: { id: r.id } } : { success: false, error: r.error };
                  if (r.ok) stateChanged = 'schedule';
                } else if (block.name === 'list_schedule') {
                  const days = Math.min(Math.max(Number(input.days) || 14, 1), 90);
                  const now = new Date();
                  const sched = await listSchedule(supabase, {
                    schoolId: auth.schoolId,
                    parentId: auth.userId,
                    childId,
                    fromIso: now.toISOString(),
                    toIso: new Date(now.getTime() + days * 86400000).toISOString(),
                  });
                  resultPayload = { success: true, data: summariseSchedule(sched) };
                } else if (block.name === 'cancel_calendar_item') {
                  const r = await cancelHomeEvent(supabase, { eventId: String(input.event_id || ''), parentId: auth.userId });
                  resultPayload = r.ok ? { success: true, data: { cancelled: true } } : { success: false, error: r.error };
                  if (r.ok) stateChanged = 'schedule';
                } else if (block.name === 'growth_snapshot') {
                  const data = await gatherGrowthData(supabase, childId);
                  resultPayload = data ? { success: true, data } : { success: false, error: 'No data yet.' };
                } else if (block.name === 'weekly_work') {
                  if (input.another === true) {
                    const entitled = await isFeatureEnabled(supabase, auth.schoolId, 'diy_plan').catch(() => false);
                    if (entitled) {
                      const work = await generateExtraWork(supabase, { childId, childName, childAgeYears, model });
                      resultPayload = { success: true, data: work };
                    } else {
                      resultPayload = { success: true, data: { locked: true, plan: 'DIY plan', price: '$1', note: 'One make-it work is free each week; extra ones unlock with the $1 DIY plan.' } };
                    }
                  } else {
                    const work = await getWeeklyWork(supabase, { childId, childName, childAgeYears, model });
                    resultPayload = { success: true, data: work };
                  }
                } else if (block.name === 'find_materials') {
                  const products = await listActiveProducts(supabase, { ageYears: childAgeYears, query: typeof input.query === 'string' ? input.query : null, limit: 8 });
                  resultPayload = { success: true, data: summariseProducts(products) };
                } else if (GURU_REUSE_TOOLS.has(block.name)) {
                  const r = await executeTool(block.name, input, childId);
                  resultPayload = { success: r.success, data: r.message, error: r.success ? undefined : r.message };
                  if (r.success) stateChanged = 'shelf';
                } else {
                  resultPayload = { success: false, error: `Unknown tool: ${block.name}` };
                }
              } catch (toolErr) {
                resultPayload = { success: false, error: toolErr instanceof Error ? toolErr.message : 'tool failed' };
              }

              controller.enqueue(sse(encoder, { type: 'tool_result', tool: block.name, success: resultPayload.success }));
              if (stateChanged) controller.enqueue(sse(encoder, { type: 'state_changed', what: stateChanged }));
              const resultText = resultPayload.success ? JSON.stringify(resultPayload.data ?? { ok: true }) : `Error: ${resultPayload.error || 'unknown'}`;
              pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultText.substring(0, MAX_TOOL_RESULT_CHARS),
                is_error: !resultPayload.success,
              });
            }
          }

          if (lastAssistantBlocks.length) conversation.push({ role: 'assistant', content: lastAssistantBlocks });
          if (pendingToolResults.length) conversation.push({ role: 'user', content: pendingToolResults });

          const roundText = roundTextParts.join('').trim();
          if (roundText) {
            if (hasToolUse) controller.enqueue(sse(encoder, { type: 'thinking', text: roundText }));
            else { finalText += roundText; controller.enqueue(sse(encoder, { type: 'text', text: roundText })); }
          }

          if (!hasToolUse && !roundText) {
            if (!emptyRecoveryDone) {
              emptyRecoveryDone = true;
              try {
                const recovery = await client.messages.create(
                  { model, max_tokens: 1024, system: minimalSystemPrompt, messages: [{ role: 'user', content: question || 'Say hello warmly.' }] },
                  { timeout: API_TIMEOUT_MS },
                );
                if (recovery.usage) { totalInput += recovery.usage.input_tokens ?? 0; totalOutput += recovery.usage.output_tokens ?? 0; }
                const recText = recovery.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
                if (recText) { finalText += recText; controller.enqueue(sse(encoder, { type: 'text', text: recText })); break; }
              } catch (e) {
                console.error('[companion] recovery failed:', e instanceof Error ? e.message : 'unknown');
              }
            }
            logError = 'empty response';
            controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
            break;
          }

          if (!hasToolUse) break;
          toolRound++;
        }

        // Round-cap safety net — force a tool-free summary if no final text yet.
        if (!finalText && !logError) {
          try {
            const forced = await client.messages.create(
              {
                model,
                max_tokens: 1024,
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools: COMPANION_TOOLS,
                tool_choice: { type: 'none' },
                messages: conversation,
              },
              { timeout: API_TIMEOUT_MS },
            );
            if (forced.usage) { totalInput += forced.usage.input_tokens ?? 0; totalOutput += forced.usage.output_tokens ?? 0; }
            const forcedText = forced.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
            if (forcedText) { finalText += forcedText; controller.enqueue(sse(encoder, { type: 'text', text: forcedText })); }
            else controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
          } catch (e) {
            console.error('[companion] forced summary failed:', e instanceof Error ? e.message : 'unknown');
            controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
          }
        }

        controller.enqueue(sse(encoder, { type: 'done', duration_ms: Date.now() - startTime, in: totalInput, out: totalOutput }));

        // Archive the exchange (fire-and-forget) — the durable record for thread
        // resume + consolidation. Skip synthetic greetings. Degrades silently if
        // migration 264 isn't run.
        if (!isGreeting && (question || imageUrl) && finalText) {
          void supabase
            .from('montree_companion_log')
            .insert({
              school_id: auth.schoolId,
              parent_id: auth.userId,
              child_id: childId,
              conversation_id: conversationId,
              question: (question || '(sent a photo)').slice(0, 8000),
              answer: finalText.slice(0, 12000),
              tools_used: toolsUsed,
              model,
            })
            .then(({ error }) => {
              if (error && error.code !== MISSING_TABLE) console.warn('[companion] log insert skipped:', error.message);
            });
        }

        if (totalInput || totalOutput) {
          logApiUsage({ schoolId: auth.schoolId, classroomId: classroomId || undefined, endpoint: '/api/montree/companion', model, inputTokens: totalInput, outputTokens: totalOutput });
        }
      } catch (streamErr) {
        controller.enqueue(sse(encoder, { type: 'error', error: streamErr instanceof Error ? streamErr.message : 'Stream error' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
