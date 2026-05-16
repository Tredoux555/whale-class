// app/api/montree/agent/mira/route.ts
//
// Mira — the agent's frontline AI. SSE streaming over an Opus tool-use loop.
//
// Mirrors /api/montree/admin/principal-agent (Tracy). Differences:
//   - Auth requires role='agent' (not 'principal').
//   - Cross-pollination filter is auth.userId via founding_teacher_id, NOT
//     schoolId (schoolId on agent JWTs is INERT).
//   - No tier-gating against a school — agents are paid partners, Mira is a
//     platform tool. Cost discipline comes from per-day rate limit instead.
//   - Logs to montree_agent_mira_log (migration 192), not principal_agent_log.
//
// POST body: { question: string, conversation_id: string, history?: [...], locale?: string }
//
// Same SSE event shape as Tracy: tool_call / tool_result / thinking / text / done / error.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ContentBlockParam,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { anthropic, OPUS_MODEL } from '@/lib/ai/anthropic';
import {
  buildMiraSystemPrompt,
  MIRA_TOOLS,
  executeMiraTool,
} from '@/lib/montree/mira';

export const maxDuration = 120;

const MAX_TOOL_ROUNDS = 5;
const TOTAL_TIMEOUT_MS = 90_000;
const API_TIMEOUT_MS = 50_000;
const MAX_TOOL_RESULT_CHARS = 50_000;

// Soft per-agent rate limit (24h). Cap is generous — meant to catch loops,
// not throttle real use. ~$10/day at average length.
const DAILY_INTERACTION_CAP = 80;

// Opus 4.6 pricing — same constants Tracy uses.
const COST_MODEL = 'claude-opus-4-6';
const OPUS_INPUT_USD_PER_MTOK = 15;
const OPUS_OUTPUT_USD_PER_MTOK = 75;

function assertSupportedCostModel(model: string): void {
  if (model !== COST_MODEL) {
    console.error(
      `[mira] cost model drift: model="${model}" but cost constants are for "${COST_MODEL}".`
    );
  }
}

interface BodyShape {
  question?: string;
  conversation_id?: string;
  history?: MessageParam[];
  locale?: string;
}

const SUPPORTED_LOCALES = new Set([
  'en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru',
]);
function normalizeLocale(raw: unknown): string {
  if (typeof raw !== 'string') return 'en';
  const v = raw.trim().toLowerCase();
  return SUPPORTED_LOCALES.has(v) ? v : 'en';
}

function sse(encoder: TextEncoder, payload: Record<string, unknown>): Uint8Array {
  return encoder.encode('data: ' + JSON.stringify(payload) + '\n\n');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== 'agent') {
    return NextResponse.json(
      { error: 'Mira is only available to agents.' },
      { status: 403 }
    );
  }

  let body: BodyShape;
  try {
    body = (await request.json()) as BodyShape;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = (body.question || '').trim();
  const conversationId = (body.conversation_id || '').trim();
  const locale = normalizeLocale(body.locale);
  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }
  if (question.length > 1500) {
    return NextResponse.json(
      { error: 'Question is too long (max 1500 characters).' },
      { status: 400 }
    );
  }
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Anthropic gate
  if (!anthropic) {
    return NextResponse.json(
      { error: 'AI is not configured for this deployment.' },
      { status: 503 }
    );
  }

  // ── Soft rate limit: 80 interactions / 24h per agent. Soft fail-open if
  // the log table doesn't exist yet (migration 191 not run) so the build
  // doesn't refuse to serve before the table lands.
  try {
    const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
    const since = new Date(sinceMs).toISOString();
    const { count, error } = await supabase
      .from('montree_agent_mira_log')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', auth.userId)
      .gte('asked_at', since);
    if (!error && typeof count === 'number' && count >= DAILY_INTERACTION_CAP) {
      // 🚨 Tracy + Mira audit quick win (Session 113 V2): include
      // `remaining` and `resets_at` in the 429 body so the frontend can
      // show "you're at the daily cap, comes back at <time>" instead of
      // just a flat error. resets_at = oldest_in_window + 24h.
      let resetsAt = new Date(sinceMs + 24 * 60 * 60 * 1000).toISOString();
      try {
        const { data: oldest } = await supabase
          .from('montree_agent_mira_log')
          .select('asked_at')
          .eq('agent_id', auth.userId)
          .gte('asked_at', since)
          .order('asked_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (oldest?.asked_at) {
          resetsAt = new Date(new Date(oldest.asked_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
        }
      } catch {
        // fall through to the conservative bound
      }
      return NextResponse.json(
        {
          error: 'Daily interaction limit reached for Mira. Resets in 24 hours.',
          limit: DAILY_INTERACTION_CAP,
          remaining: 0,
          used: count,
          resets_at: resetsAt,
        },
        { status: 429 }
      );
    }
  } catch {
    // Migration not yet applied — proceed without rate limiting.
  }

  // Resolve agent name for the system prompt.
  let agentName = 'there';
  try {
    const { data: ag } = await supabase
      .from('montree_teachers')
      .select('name')
      .eq('id', auth.userId)
      .maybeSingle();
    if (ag?.name) agentName = ag.name.split(' ')[0] || ag.name;
  } catch {
    // keep default
  }

  const model = OPUS_MODEL;
  assertSupportedCostModel(model);

  const encoder = new TextEncoder();
  const client = anthropic as Anthropic;

  // Sanitize history (same defence as Tracy).
  const sanitizeHistory = (raw: unknown): MessageParam[] => {
    if (!Array.isArray(raw)) return [];
    const out: MessageParam[] = [];
    for (const item of raw.slice(-10)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const role = obj.role === 'assistant' ? 'assistant' : 'user';
      const content = obj.content;
      let text = '';
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block &&
            typeof block === 'object' &&
            (block as Record<string, unknown>).type === 'text' &&
            typeof (block as Record<string, unknown>).text === 'string'
          ) {
            text += (block as Record<string, string>).text;
          }
        }
      }
      text = text.trim();
      if (!text) continue;
      out.push({ role, content: text.slice(0, 4000) });
    }
    return out;
  };
  const historyMessages = sanitizeHistory(body.history);
  const initialMessages: MessageParam[] = [
    ...historyMessages,
    { role: 'user', content: question },
  ];

  const toolsCalled: Array<{
    name: string;
    input: unknown;
    success: boolean;
    duration_ms: number;
    result_summary?: string;
  }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalAnswerText = '';
  let logError: string | null = null;

  const todayLabel = (() => {
    try {
      return new Date().toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  })();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const systemPrompt = buildMiraSystemPrompt({ agentName, todayLabel, locale });

        const conversationMessages: MessageParam[] = [...initialMessages];
        let lastAssistantBlocks: ContentBlockParam[] = [];
        let pendingToolResults: ToolResultBlockParam[] = [];
        let toolRound = 0;

        while (toolRound < MAX_TOOL_ROUNDS) {
          if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
            logError = 'Total timeout (90s) exceeded';
            controller.enqueue(sse(encoder, { type: 'error', error: logError }));
            break;
          }

          const messagesForRound: MessageParam[] = [...conversationMessages];
          if (lastAssistantBlocks.length > 0 && pendingToolResults.length > 0) {
            messagesForRound.push({ role: 'assistant', content: lastAssistantBlocks });
            messagesForRound.push({ role: 'user', content: pendingToolResults });
          }

          let response;
          try {
            response = await client.messages.create(
              {
                model,
                max_tokens: 2048,
                system: systemPrompt,
                tools: MIRA_TOOLS,
                messages: messagesForRound,
              },
              { timeout: API_TIMEOUT_MS }
            );
          } catch (apiErr) {
            const errMsg = apiErr instanceof Error ? apiErr.message : 'API error';
            logError = `API call failed: ${errMsg}`;
            controller.enqueue(sse(encoder, { type: 'error', error: errMsg }));
            break;
          }

          if (response.usage) {
            totalInputTokens += response.usage.input_tokens ?? 0;
            totalOutputTokens += response.usage.output_tokens ?? 0;
          }

          lastAssistantBlocks = [];
          pendingToolResults = [];
          let hasToolUse = false;
          const roundTextParts: string[] = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              roundTextParts.push(block.text);
              lastAssistantBlocks.push({ type: 'text', text: block.text });
            } else if (block.type === 'tool_use') {
              hasToolUse = true;
              lastAssistantBlocks.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input,
              } as unknown as ContentBlockParam);

              const toolStart = Date.now();
              controller.enqueue(
                sse(encoder, { type: 'tool_call', tool: block.name, input: block.input })
              );

              const result = await executeMiraTool(
                block.name,
                block.input as Record<string, unknown>,
                {
                  supabase,
                  anthropic,
                  agentId: auth.userId,
                  locale,
                }
              );
              const toolDuration = Date.now() - toolStart;

              toolsCalled.push({
                name: block.name,
                input: block.input,
                success: result.success,
                duration_ms: toolDuration,
                result_summary: result.result_summary,
              });

              controller.enqueue(
                sse(encoder, {
                  type: 'tool_result',
                  tool: block.name,
                  success: result.success,
                  summary: result.result_summary,
                })
              );

              const resultText = result.success
                ? JSON.stringify(result.data)
                : `Error: ${result.error || 'unknown'}`;

              pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultText.substring(0, MAX_TOOL_RESULT_CHARS),
                is_error: !result.success,
              });
            }
          }

          const roundText = roundTextParts.join('').trim();
          if (roundText) {
            if (hasToolUse) {
              controller.enqueue(sse(encoder, { type: 'thinking', text: roundText }));
            } else {
              finalAnswerText += roundText;
              controller.enqueue(sse(encoder, { type: 'text', text: roundText }));
            }
          }

          if (!hasToolUse) break;
          toolRound++;
        }

        const costUsd =
          (totalInputTokens / 1_000_000) * OPUS_INPUT_USD_PER_MTOK +
          (totalOutputTokens / 1_000_000) * OPUS_OUTPUT_USD_PER_MTOK;

        const totalDuration = Date.now() - startTime;

        controller.enqueue(
          sse(encoder, {
            type: 'done',
            cost_usd: Number(costUsd.toFixed(6)),
            duration_ms: totalDuration,
            tools_used: toolsCalled.length,
          })
        );

        // Fire-and-forget log
        void supabase
          .from('montree_agent_mira_log')
          .insert({
            agent_id: auth.userId,
            conversation_id: conversationId,
            question,
            answer: finalAnswerText || null,
            tools_called: toolsCalled,
            model,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            cost_usd: Number(costUsd.toFixed(6)),
            duration_ms: totalDuration,
            error: logError,
          })
          .then(({ error }) => {
            if (error) console.error('[mira] log insert error:', error.message);
          });
      } catch (streamErr) {
        const msg = streamErr instanceof Error ? streamErr.message : 'Stream error';
        logError = msg;
        controller.enqueue(sse(encoder, { type: 'error', error: msg }));
        void supabase
          .from('montree_agent_mira_log')
          .insert({
            agent_id: auth.userId,
            conversation_id: conversationId,
            question,
            answer: finalAnswerText || null,
            tools_called: toolsCalled,
            model,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            cost_usd: Number(
              (
                (totalInputTokens / 1_000_000) * OPUS_INPUT_USD_PER_MTOK +
                (totalOutputTokens / 1_000_000) * OPUS_OUTPUT_USD_PER_MTOK
              ).toFixed(6)
            ),
            duration_ms: Date.now() - startTime,
            error: msg,
          })
          .then(({ error }) => {
            if (error) console.error('[mira] error-log insert error:', error.message);
          });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
