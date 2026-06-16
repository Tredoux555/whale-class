// app/api/montree/companion/route.ts
//
// IVY — the family's one companion. Per-child SSE chat for a homeschool parent:
// life-coach for the parent, Montessori educator for the child, family manager,
// transparently wired to the school side (Guru bridge). Modeled on the Coach
// SSE route (app/api/story/coach/route.ts): keepalive, tool loop with full
// transcript accumulation, empty-response recovery, forced summary, timeouts.
//
// Each turn: verify child access → pick THE one next step → build school context
// + memory → stream Ivy's reply. Tools: present_step (Step Card), advance loop
// via Guru's set_focus_work / update_progress / save_observation, plus
// remember / recall for per-family memory.
//
// SSE events: :keepalive · {type:'thinking'} · {type:'tool_call',tool} ·
//   {type:'tool_result',tool,success} · {type:'step_card',card} ·
//   {type:'text',text} · {type:'done'} · {type:'error',error}

import { NextRequest, NextResponse } from 'next/server';
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
import { buildCompanionSystemPrompt, COMPANION_NAME } from '@/lib/montree/companion/system-prompt';
import { executeTool } from '@/lib/montree/guru/tool-executor';
import { logApiUsage } from '@/lib/montree/api-usage';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const MAX_TOOL_ROUNDS = 6;
const TOTAL_TIMEOUT_MS = 100_000;
const API_TIMEOUT_MS = 55_000;
const MAX_TOOL_RESULT_CHARS = 40_000;

function sse(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(payload) + '\n\n');
}

interface BodyShape {
  child_id?: string;
  question?: string;
  history?: MessageParam[];
  conversation_id?: string;
  locale?: string;
}

// Ivy's tools. The first three reuse Guru's executeTool (same input shape).
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
    description: "Record how a work is going after the parent reports back: presented (just shown), practicing (repeating it), or mastered (got it). Never downgrade what's already further along.",
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
    description: "Save something durable and meaningful you've learned — about the child (an interest, temperament, milestone, struggle) or the parent (a preference, value, a thing they said they'd let go of, a worry pattern) or the family (a routine, a fact). Semantic facts only, never just-said-once conversation. If something changes, set supersedes_id to the old memory id.",
    input_schema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: ['interest', 'temperament', 'milestone', 'struggle', 'parent_preference', 'parent_value', 'parent_dropped', 'parent_pattern', 'routine', 'fact'],
        },
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
        memory_type: {
          type: 'string',
          enum: ['interest', 'temperament', 'milestone', 'struggle', 'parent_preference', 'parent_value', 'parent_dropped', 'parent_pattern', 'routine', 'fact'],
        },
        query: { type: 'string', description: 'Optional free-text search.' },
      },
    },
  },
];

const GURU_REUSE_TOOLS = new Set(['set_focus_work', 'update_progress', 'save_observation']);

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!anthropic) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 });
  }

  let body: BodyShape;
  try {
    body = (await request.json()) as BodyShape;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const childId = (body.child_id || '').trim();
  const question = (body.question || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  if (question.length > 16000) {
    return NextResponse.json({ error: 'That message is very long — break it into two and send again.' }, { status: 400 });
  }
  const locale = body.locale && /^[a-z]{2}$/.test(body.locale) ? body.locale : 'en';

  // Cross-pollination guard — the child must belong to the caller's school.
  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Tier gate — free schools get a friendly upgrade prompt (no AI spend).
  const { tier, model } = await resolveReportModel(getSupabase(), auth.schoolId);
  if (!model) {
    return NextResponse.json({
      requires_upgrade: true,
      upgrade_url: '/montree/admin/billing',
      feature: 'companion',
      error: `${COMPANION_NAME} is part of a paid plan. Start a trial or upgrade to chat with your family companion.`,
    }, { status: 402 });
  }

  const supabase = getSupabase();
  const client = anthropic as Anthropic;

  // Load child + parent context.
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
    if (!Number.isNaN(dob.getTime())) {
      childAgeYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }
  }

  // Parent name (the homeschool parent is a montree_teachers row).
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

  // Sanitize client history → text-only (never trust client tool blocks).
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
  const history = sanitizeHistory(body.history);

  const encoder = new TextEncoder();
  const toolsUsed: string[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let finalText = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(':keepalive\n\n'));
        controller.enqueue(sse(encoder, { type: 'thinking', text: '' }));

        // Resolve context in parallel — all graceful.
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
              'When the parent is ready, call present_step to give them the full hand-held card. Save it with set_focus_work when you commit to it.',
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

        const conversation: MessageParam[] = [...history, { role: 'user', content: question }];
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
            const msg = apiErr instanceof Error ? apiErr.message : 'API error';
            controller.enqueue(sse(encoder, { type: 'error', error: msg }));
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

              try {
                if (block.name === 'present_step') {
                  if (!step) {
                    resultPayload = { success: false, error: 'No next step is available yet — ask the parent what the child is drawn to.' };
                  } else {
                    const card = await generateStepCard(supabase, {
                      childId, classroomId, schoolId: auth.schoolId, step, childName, childAgeYears, locale,
                    });
                    // Surface the structured card to the client on its own SSE event.
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
                } else if (GURU_REUSE_TOOLS.has(block.name)) {
                  const r = await executeTool(block.name, input, childId);
                  resultPayload = { success: r.success, data: r.message, error: r.success ? undefined : r.message };
                } else {
                  resultPayload = { success: false, error: `Unknown tool: ${block.name}` };
                }
              } catch (toolErr) {
                resultPayload = { success: false, error: toolErr instanceof Error ? toolErr.message : 'tool failed' };
              }

              controller.enqueue(sse(encoder, { type: 'tool_result', tool: block.name, success: resultPayload.success }));
              const resultText = resultPayload.success
                ? JSON.stringify(resultPayload.data ?? { ok: true })
                : `Error: ${resultPayload.error || 'unknown'}`;
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
            if (hasToolUse) {
              controller.enqueue(sse(encoder, { type: 'thinking', text: roundText }));
            } else {
              finalText += roundText;
              controller.enqueue(sse(encoder, { type: 'text', text: roundText }));
            }
          }

          // Empty-response recovery (one shot).
          if (!hasToolUse && !roundText) {
            if (!emptyRecoveryDone) {
              emptyRecoveryDone = true;
              try {
                const recovery = await client.messages.create(
                  { model, max_tokens: 1024, system: minimalSystemPrompt, messages: [{ role: 'user', content: question }] },
                  { timeout: API_TIMEOUT_MS },
                );
                if (recovery.usage) { totalInput += recovery.usage.input_tokens ?? 0; totalOutput += recovery.usage.output_tokens ?? 0; }
                const recText = recovery.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
                if (recText) {
                  finalText += recText;
                  controller.enqueue(sse(encoder, { type: 'text', text: recText }));
                  break;
                }
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
            if (forcedText) {
              finalText += forcedText;
              controller.enqueue(sse(encoder, { type: 'text', text: forcedText }));
            } else {
              controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
            }
          } catch (e) {
            console.error('[companion] forced summary failed:', e instanceof Error ? e.message : 'unknown');
            controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
          }
        }

        controller.enqueue(sse(encoder, { type: 'done', duration_ms: Date.now() - startTime, in: totalInput, out: totalOutput }));

        // Cost/usage logging (fire-and-forget).
        if (totalInput || totalOutput) {
          logApiUsage({
            schoolId: auth.schoolId,
            classroomId: classroomId || undefined,
            endpoint: '/api/montree/companion',
            model,
            inputTokens: totalInput,
            outputTokens: totalOutput,
          });
        }
        void tier;
      } catch (streamErr) {
        const msg = streamErr instanceof Error ? streamErr.message : 'Stream error';
        controller.enqueue(sse(encoder, { type: 'error', error: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
