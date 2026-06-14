// app/api/story/coach/route.ts
//
// The Coach — Tredoux's life-coach + chief-of-staff. Story-admin only.
// SSE Sonnet tool-use loop, modeled on app/api/montree/admin/principal-agent
// (keepalive, full-transcript accumulation, empty-response recovery, forced
// summary, per-call + total timeouts). Single user → no tier gate, no scoping.
//
// SSE events: :keepalive · {type:'thinking'} · {type:'tool_call',tool} ·
//   {type:'tool_result',tool,success} · {type:'text',text} · {type:'done'} ·
//   {type:'error',error}

import { NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { readDiaryField } from '@/lib/story/diary-crypto';
import {
  buildCoachSystemPrompt,
  COACH_TOOLS,
  executeCoachTool,
  loadCoachMemories,
  formatCoachMemoriesForPrompt,
  getCoachWisdomSummary,
  getCoachProfile,
  computeLoad,
  formatLoadSnapshot,
} from '@/lib/story/coach';

export const maxDuration = 180;
export const dynamic = 'force-dynamic';

const MAX_TOOL_ROUNDS = 6;
const TOTAL_TIMEOUT_MS = 120_000;
const API_TIMEOUT_MS = 60_000;
const MAX_TOOL_RESULT_CHARS = 50_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sse(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(payload) + '\n\n');
}

interface BodyShape {
  question?: string;
  history?: MessageParam[];
  reflect_entry_id?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const admin = await verifyAdminToken(request.headers.get('authorization'));
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  if (!anthropic) {
    return new Response(JSON.stringify({ error: 'AI is not configured.' }), { status: 503 });
  }

  let body: BodyShape;
  try {
    body = (await request.json()) as BodyShape;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  let question = (body.question || '').trim();
  const reflectId = typeof body.reflect_entry_id === 'string' && UUID_RE.test(body.reflect_entry_id)
    ? body.reflect_entry_id
    : null;
  if (!question && !reflectId) {
    return new Response(JSON.stringify({ error: 'question required' }), { status: 400 });
  }
  if (question.length > 4000) {
    return new Response(JSON.stringify({ error: 'Message too long.' }), { status: 400 });
  }

  const supabase = getSupabase();

  // Sanitize client history → text-only { role, content } (same posture as
  // principal-agent: never trust client-supplied tool_use/tool_result blocks).
  const sanitizeHistory = (raw: unknown): MessageParam[] => {
    if (!Array.isArray(raw)) return [];
    const out: MessageParam[] = [];
    for (const item of raw.slice(-12)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const role = obj.role === 'assistant' ? 'assistant' : 'user';
      let text = '';
      if (typeof obj.content === 'string') text = obj.content;
      text = text.trim();
      if (!text) continue;
      out.push({ role, content: text.slice(0, 4000) });
    }
    return out;
  };
  const history = sanitizeHistory(body.history);

  // Reflect-on-entry: fetch the entry server-side and build a grounded prompt.
  if (reflectId) {
    const { data } = await supabase
      .from('story_diary_entries')
      .select('entry_date, mood, title_enc, body_enc, cipher_version')
      .eq('id', reflectId)
      .maybeSingle();
    if (data) {
      const title = readDiaryField(data.title_enc, data.cipher_version);
      const text = readDiaryField(data.body_enc, data.cipher_version);
      const head = `Please reflect on my diary entry from ${data.entry_date}${data.mood ? ` (mood: ${data.mood})` : ''}:\n\n` +
        `${title ? title + '\n\n' : ''}${text}\n\n` +
        `What patterns or themes do you notice? Reflect like a thoughtful friend who knows me.`;
      question = question ? `${question}\n\n${head}` : head;
    }
  }

  const todayLabel = (() => {
    try {
      return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const encoder = new TextEncoder();
  const client = anthropic as Anthropic;

  const initialMessages: MessageParam[] = [...history, { role: 'user', content: question }];

  let totalInput = 0;
  let totalOutput = 0;
  let finalText = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(':keepalive\n\n'));
        controller.enqueue(sse(encoder, { type: 'thinking', text: '' }));

        // Resolve context (memory + wisdom + profile + live load), graceful fallback.
        const [memories, wisdomSummary, profileSection, load] = await Promise.all([
          loadCoachMemories(supabase, 40).catch(() => []),
          getCoachWisdomSummary().catch(() => ''),
          getCoachProfile().catch(() => ''),
          computeLoad(supabase).catch(() => null),
        ]);
        const systemPrompt = buildCoachSystemPrompt({
          todayLabel,
          memorySection: formatCoachMemoriesForPrompt(memories),
          wisdomSummary,
          profileSection,
          isFirstSession: memories.length === 0,
          loadSnapshot: load ? formatLoadSnapshot(load) : 'No load data available right now.',
        });
        const minimalSystemPrompt =
          `You are Tredoux's warm, direct life-coach. Today is ${todayLabel}. Answer his message ` +
          `thoughtfully and concisely, protect him from overcommitment and burnout, and end with one ` +
          `clear next step.`;

        const conversation: MessageParam[] = [...initialMessages];
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
                model: AI_MODEL,
                max_tokens: 4096,
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools: COACH_TOOLS,
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
              lastAssistantBlocks.push({
                type: 'tool_use', id: block.id, name: block.name, input: block.input,
              } as unknown as ContentBlockParam);

              controller.enqueue(sse(encoder, { type: 'tool_call', tool: block.name }));
              const result = await executeCoachTool(block.name, block.input as Record<string, unknown>, { supabase });
              controller.enqueue(sse(encoder, { type: 'tool_result', tool: block.name, success: result.success }));

              const resultText = result.success ? JSON.stringify(result.data) : `Error: ${result.error || 'unknown'}`;
              pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultText.substring(0, MAX_TOOL_RESULT_CHARS),
                is_error: !result.success,
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

          // Empty-response recovery (one shot): re-ask with a minimal prompt.
          if (!hasToolUse && !roundText) {
            if (!emptyRecoveryDone) {
              emptyRecoveryDone = true;
              try {
                const recovery = await client.messages.create(
                  { model: AI_MODEL, max_tokens: 1024, system: minimalSystemPrompt, messages: [{ role: 'user', content: question }] },
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
                console.error('[coach] recovery failed:', e instanceof Error ? e.message : 'unknown');
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
                model: AI_MODEL,
                max_tokens: 1024,
                system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
                tools: COACH_TOOLS,
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
            console.error('[coach] forced summary failed:', e instanceof Error ? e.message : 'unknown');
            controller.enqueue(sse(encoder, { type: 'error', error: "I couldn't put a reply together just now — try again." }));
          }
        }

        controller.enqueue(sse(encoder, { type: 'done', duration_ms: Date.now() - startTime, in: totalInput, out: totalOutput }));
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
